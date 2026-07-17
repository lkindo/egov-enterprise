const axios = require('axios');

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
const ADMIN_ID = 'webmaster';
const ADMIN_PW = '1';

async function cleanup() {
  console.log('\n>>> [DB Cleanup] Starting cleanup of E2E test data...');
  
  try {
    // 1. Authenticate to get token and CSRF
    console.log('>>> Authenticating as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, { userId: ADMIN_ID, password: ADMIN_PW });
    const token = loginRes.data.data.accessToken;
    
    // Fetch endpoint to trigger CSRF token generation
    const meRes = await axios.get(`${API_BASE}/users/me`, { 
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Extract XSRF-TOKEN from set-cookie header (from /users/me response instead of login, since login is CSRF bypassed)
    const rawCookies = meRes.headers['set-cookie'] || loginRes.headers['set-cookie'] || [];
    let xsrfToken = '';
    const cookieList = [];

    for (const cookie of rawCookies) {
      const parts = cookie.split(';')[0];
      cookieList.push(parts);
      if (parts.startsWith('XSRF-TOKEN=')) {
        xsrfToken = parts.split('=')[1];
      }
    }

    const headers: Record<string, string> = { 
        'Authorization': `Bearer ${token}`,
        'Cookie': cookieList.join('; '),
        'X-Requested-With': 'XMLHttpRequest'
    };
    
    if (xsrfToken) {
        headers['X-XSRF-TOKEN'] = xsrfToken;
        console.log(`>>> CSRF Token obtained: ${xsrfToken.substring(0, 5)}...`);
    } else {
        console.log('>>> WARNING: XSRF-TOKEN not found in GET response cookies.');
    }
    
    console.log('>>> Authentication successful.');

    // 2. Cleanup Users (Prefix: user_)
    console.log('>>> Cleaning up test users...');
    const usersRes = await axios.get(`${API_BASE}/admin/system/users`, { 
      headers,
      params: { searchCondition: '0', searchKeyword: 'user_', page: 0, size: 100 } 
    });
    
    const users = usersRes.data.data?.list || usersRes.data.data?.content || [];
    const testUsers = users.filter((u: any) => 
      u.userId.startsWith('user_') || 
      u.userId.startsWith('e2e_')
    );
    
    for (const user of testUsers) {
      process.stdout.write(`  - Deleting User: ${user.userId}... `);
      await axios.delete(`${API_BASE}/admin/system/users/${user.userId}`, { headers });
      console.log('DONE');
    }

    // 3. Cleanup Boards (Prefix: E2E Test Board)
    console.log('>>> Cleaning up test boards...');
    const boardsRes = await axios.get(`${API_BASE}/admin/system/board-masters`, { 
      headers,
      params: { searchWrd: 'E2E Test Board', size: 100 } 
    });
    
    const boards = boardsRes.data.data?.list || boardsRes.data.data?.content || [];
    const testBoards = boards.filter((b: any) => 
      (b.bbsTtl || b.bbsNm || "").startsWith('E2E Test Board') || 
      (b.bbsTtl || b.bbsNm || "").startsWith('E2E_Wizard_') ||
      (b.bbsTtl || b.bbsNm || "").startsWith('E2E ')
    );
    
    for (const board of testBoards) {
      process.stdout.write(`  - Deleting Board: ${(board.bbsTtl || board.bbsNm)} (${board.bbsId})... `);
      await axios.delete(`${API_BASE}/admin/system/board-masters/${board.bbsId}`, { 
        headers,
        params: { userId: ADMIN_ID }
      });
      console.log('DONE');
    }

    // 4. Cleanup Polls (Prefix: E2E Poll, E2E Duplicate Test)
    console.log('>>> Cleaning up test polls (surveys)...');
    try {
      const pollsRes = await axios.get(`${API_BASE}/polls`, { 
        headers,
        params: { keyword: 'E2E', size: 100 } 
      });
      const polls = pollsRes.data.data?.list || pollsRes.data.data?.content || [];
      const testPolls = polls.filter((p: any) => 
        p.pollNm?.startsWith('E2E Poll') || 
        p.pollNm?.startsWith('E2E Duplicate Test') ||
        p.pollNm?.startsWith('Debug')
      );
      for (const poll of testPolls) {
        process.stdout.write(`  - Deleting Poll: ${poll.pollNm} (${poll.pollId})... `);
        await axios.delete(`${API_BASE}/polls/${poll.pollId}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testPolls.length} poll(s) cleaned.`);
    } catch (e: any) {
      console.warn(`  => Poll cleanup skipped: ${e.response?.data?.message || e.message}`);
    }
    
    // 5. Cleanup Popups (Prefix: E2E Popup)
    console.log('>>> Cleaning up test popups...');
    try {
      const popupsRes = await axios.get(`${API_BASE}/admin/system/popups`, { 
        headers,
        params: { searchWrd: 'E2E', size: 100 } 
      });
      const popups = popupsRes.data.data?.list || popupsRes.data.data?.content || [];
      const testPopups = popups.filter((p: any) => p.popupTtlNm?.startsWith('E2E Popup') || p.popupTtlNm?.startsWith('Debug'));
      for (const popup of testPopups) {
        process.stdout.write(`  - Deleting Popup: ${popup.popupTtlNm} (${popup.popupId})... `);
        await axios.delete(`${API_BASE}/admin/system/popups/${popup.popupId}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testPopups.length} popup(s) cleaned.`);
    } catch (e: any) {
      console.warn(`  => Popup cleanup skipped: ${e.response?.data?.message || e.message}`);
    }

    // 6. Cleanup Banners (Prefix: E2E Banner)
    console.log('>>> Cleaning up test banners...');
    try {
      const bannersRes = await axios.get(`${API_BASE}/admin/system/banners`, { 
        headers,
        params: { keyword: 'E2E', size: 100 } 
      });
      const banners = bannersRes.data.data?.list || bannersRes.data.data?.content || [];
      const testBanners = banners.filter((b: any) => b.bannerNm?.startsWith('E2E Banner') || b.bannerNm?.startsWith('Debug'));
      for (const banner of testBanners) {
        process.stdout.write(`  - Deleting Banner: ${banner.bannerNm} (${banner.bannerId})... `);
        await axios.delete(`${API_BASE}/admin/system/banners/${banner.bannerId}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testBanners.length} banner(s) cleaned.`);
    } catch (e: any) {
      console.warn(`  => Banner cleanup skipped: ${e.response?.data?.message || e.message}`);
    }

    // 7. Cleanup Board Posts (Prefix: E2E Security FAQ, E2E ...)
    console.log('>>> Cleaning up E2E board posts...');
    const targetBbsIds = ['BBSMSTR_AAAAAAAAAAAA', 'BBSMSTR_DDDDDDDDDDDD', 'BBSMSTR_EEEEEEEEEEEE'];
    for (const bbsId of targetBbsIds) {
      try {
        const postsRes = await axios.get(`${API_BASE}/boards/${bbsId}`, { 
          headers,
          params: { searchCnd: '0', searchWrd: 'E2E', size: 100 }
        });
        const posts = postsRes.data.data?.list || postsRes.data.data?.content || [];
        const testPosts = posts.filter((p: any) => 
          p.pstTtl?.startsWith('E2E') || p.title?.startsWith('E2E')
        );
        for (const post of testPosts) {
          const postId = post.pstId || post.id;
          process.stdout.write(`  - Deleting Post: ${post.pstTtl || post.title} (${postId})... `);
          await axios.delete(`${API_BASE}/boards/${bbsId}/posts/${postId}`, { headers });
          console.log('DONE');
        }
        if (testPosts.length > 0) console.log(`  => ${testPosts.length} post(s) cleaned from ${bbsId}.`);
      } catch (e: any) {
        console.warn(`  => Board ${bbsId} cleanup skipped: ${e.response?.data?.message || e.message}`);
      }
    }

    // 8. Cleanup Menus (Prefix: Root_ or Menu E2E)
    console.log('>>> Cleaning up test menus...');
    try {
      const menusRes = await axios.get(`${API_BASE}/admin/system/menus/all`, { headers });
      const menus = menusRes.data.data || [];
      const testMenus = menus.filter((m: any) => 
        m.menuNm.startsWith('Root_') || 
        m.menuNm.startsWith('Menu E2E') ||
        m.menuNm.startsWith('Menu_E2E')
      );
      
      testMenus.sort((a: any, b: any) => b.menuNo - a.menuNo);

      for (const menu of testMenus) {
        process.stdout.write(`  - Deleting Menu: ${menu.menuNm} (${menu.menuNo})... `);
        await axios.delete(`${API_BASE}/admin/system/menus/${menu.menuNo}`, { headers });
        console.log('DONE');
      }
    } catch (e: any) {
      console.warn(`  => Menu cleanup skipped: ${e.response?.data?.message || e.message}`);
    }

    // 9. Cleanup Address Books (Prefix: Identity_)
    console.log('>>> Cleaning up test address books...');
    try {
      const addressRes = await axios.get(`${API_BASE}/address-books`, { 
        headers,
        params: { searchWrd: 'Identity_', size: 100 } 
      });
      const addresses = addressRes.data.data?.list || addressRes.data.data?.content || [];
      const testAddresses = addresses.filter((a: any) => a.adbkNm?.startsWith('Identity_'));
      for (const address of testAddresses) {
        process.stdout.write(`  - Deleting Address Book Entry: ${address.adbkNm} (${address.adbkId})... `);
        await axios.delete(`${API_BASE}/address-books/${address.adbkId}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testAddresses.length} address book entry(ies) cleaned.`);
    } catch (e: any) {
      console.warn(`  => Address book cleanup skipped: ${e.response?.data?.message || e.message}`);
    }

    // 10. Cleanup Online Manuals (Prefix: E2E Manual)
    console.log('>>> Cleaning up test online manuals...');
    try {
      const manualRes = await axios.get(`${API_BASE}/help/manuals`, { 
        headers,
        params: { keyword: 'E2E Manual', size: 100 } 
      });
      const manuals = manualRes.data.data?.list || manualRes.data.data?.content || [];
      const testManuals = manuals.filter((m: any) => m.onlineMnlNm?.startsWith('E2E Manual'));
      for (const manual of testManuals) {
        process.stdout.write(`  - Deleting Manual: ${manual.onlineMnlNm} (${manual.onlineMnlId})... `);
        await axios.delete(`${API_BASE}/help/manuals/${manual.onlineMnlId}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testManuals.length} manual(s) cleaned.`);
    } catch (e: any) {
      console.warn(`  => Manual cleanup skipped: ${e.response?.data?.message || e.message}`);
    }

    // 11. Cleanup Security Artifacts (Authorities: ROLE_E2E_, Groups: GROUP_E2E_, Roles: URL_E2E_)
    // 02-admin-system.spec.ts 가 생성하는 권한/그룹/롤이 정리 대상에 없어 라이브 DB 에
    // 가비지가 축적됐음(2026-07-17 실측 411+155행 수동 정리). 재축적 방지.
    console.log('>>> Cleaning up test security artifacts (roles/groups/authorities)...');
    try {
      const rolesRes = await axios.get(`${API_BASE}/admin/system/roles`, {
        headers,
        params: { size: 100 }
      });
      const roles = rolesRes.data.data?.list || rolesRes.data.data?.content || [];
      const testRoles = roles.filter((r: any) =>
        r.roleId?.startsWith('URL_E2E_') || r.roleNm?.startsWith('E2E Role')
      );
      for (const role of testRoles) {
        process.stdout.write(`  - Deleting Role: ${role.roleNm} (${role.roleId})... `);
        await axios.delete(`${API_BASE}/admin/system/roles/${role.roleId}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testRoles.length} role(s) cleaned.`);
    } catch (e: any) {
      console.warn(`  => Role cleanup skipped: ${e.response?.data?.message || e.message}`);
    }
    try {
      const groupsRes = await axios.get(`${API_BASE}/admin/system/groups`, {
        headers,
        params: { searchKeyword: 'E2E' }
      });
      const groups = groupsRes.data.data?.list || groupsRes.data.data?.content || [];
      const testGroups = groups.filter((g: any) =>
        g.groupId?.startsWith('GROUP_E2E_') || g.groupNm?.startsWith('E2E Group')
      );
      for (const group of testGroups) {
        process.stdout.write(`  - Deleting Group: ${group.groupNm} (${group.groupId})... `);
        await axios.delete(`${API_BASE}/admin/system/groups/${group.groupId}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testGroups.length} group(s) cleaned.`);
    } catch (e: any) {
      console.warn(`  => Group cleanup skipped: ${e.response?.data?.message || e.message}`);
    }
    try {
      const authRes = await axios.get(`${API_BASE}/admin/system/authorities`, {
        headers,
        params: { size: 100 }
      });
      const authorities = authRes.data.data?.list || authRes.data.data?.content || [];
      const testAuths = authorities.filter((a: any) => a.authrtCd?.startsWith('ROLE_E2E_'));
      for (const auth of testAuths) {
        process.stdout.write(`  - Deleting Authority: ${auth.authrtNm} (${auth.authrtCd})... `);
        await axios.delete(`${API_BASE}/admin/system/authorities/${auth.authrtCd}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testAuths.length} authority(ies) cleaned.`);
    } catch (e: any) {
      console.warn(`  => Authority cleanup skipped: ${e.response?.data?.message || e.message}`);
    }

    console.log('>>> [DB Cleanup] All test data removed successfully!\n');
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error('>>> [DB Cleanup] ERROR occurred during cleanup:', errorMsg);
    if (error.response?.data) {
        console.error('>>> [DEBUG] Response data:', JSON.stringify(error.response.data));
    }
    console.error(error.stack);
  }
}

module.exports = async function globalTeardown() {
  await cleanup();
};

// Allow running directly
if (require.main === module) {
  cleanup();
}
