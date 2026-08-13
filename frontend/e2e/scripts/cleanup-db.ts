import axios from 'axios';
import type { AxiosResponse } from 'axios';

interface ApiEnvelope<T> {
  data: T;
}

interface PagePayload<T> {
  list?: T[];
  content?: T[];
}

interface CleanupUser { userId: string }
interface CleanupBoard { bbsId: string; bbsTtl?: string; bbsNm?: string }
interface CleanupPoll { pollId: string; pollNm?: string }
interface CleanupPopup { popupSn: number; popupTtlNm?: string }
interface CleanupBanner { bnrSn: number; bnrNm?: string }
interface CleanupPost { pstId?: string | number; id?: string | number; pstTtl?: string; title?: string }
interface CleanupMenu { menuNo: number; menuNm: string }
interface CleanupAddress { adbkId: string; adbkNm?: string }
interface CleanupManual { onlnMnlSn: number; onlnMnlNm?: string }
interface CleanupRole { roleId: string; roleNm?: string }
interface CleanupGroup { groupId: string; groupNm?: string }
interface CleanupAuthority { authrtCd: string; authrtNm?: string }

function extractPage<T>(response: AxiosResponse<ApiEnvelope<PagePayload<T>>>): T[] {
  return response.data.data?.list ?? response.data.data?.content ?? [];
}

function describeError(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
const ADMIN_ID = 'webmaster';
const ADMIN_PW = '1';

async function cleanup() {
  console.log('\n>>> [DB Cleanup] Starting cleanup of E2E test data...');
  
  try {
    // 1. Authenticate to get token and CSRF
    console.log('>>> Authenticating as admin...');
    const loginRes = await axios.post<ApiEnvelope<{ accessToken: string }>>(
      `${API_BASE}/auth/login`,
      { userId: ADMIN_ID, password: ADMIN_PW },
    );
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
    const usersRes = await axios.get<ApiEnvelope<PagePayload<CleanupUser>>>(`${API_BASE}/admin/system/users`, {
      headers,
      params: { searchCondition: '0', searchKeyword: 'user_', page: 0, size: 100 } 
    });
    
    const users = extractPage(usersRes);
    const testUsers = users.filter((u) =>
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
    const boardsRes = await axios.get<ApiEnvelope<PagePayload<CleanupBoard>>>(`${API_BASE}/admin/system/board-masters`, {
      headers,
      params: { searchWrd: 'E2E Test Board', size: 100 } 
    });
    
    const boards = extractPage(boardsRes);
    const testBoards = boards.filter((b) =>
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
      const pollsRes = await axios.get<ApiEnvelope<PagePayload<CleanupPoll>>>(`${API_BASE}/polls`, {
        headers,
        params: { keyword: 'E2E', size: 100 } 
      });
      const polls = extractPage(pollsRes);
      const testPolls = polls.filter((p) =>
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
    } catch (error: unknown) {
      console.warn(`  => Poll cleanup skipped: ${describeError(error)}`);
    }
    
    // 5. Cleanup Popups (Prefix: E2E Popup)
    console.log('>>> Cleaning up test popups...');
    try {
      const popupsRes = await axios.get<ApiEnvelope<PagePayload<CleanupPopup>>>(`${API_BASE}/admin/system/popups`, {
        headers,
        params: { searchWrd: 'E2E', size: 100 } 
      });
      const popups = extractPage(popupsRes);
      const testPopups = popups.filter((p) => p.popupTtlNm?.startsWith('E2E Popup') || p.popupTtlNm?.startsWith('Debug'));
      for (const popup of testPopups) {
        process.stdout.write(`  - Deleting Popup: ${popup.popupTtlNm} (${popup.popupSn})... `);
        await axios.delete(`${API_BASE}/admin/system/popups/${popup.popupSn}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testPopups.length} popup(s) cleaned.`);
    } catch (error: unknown) {
      console.warn(`  => Popup cleanup skipped: ${describeError(error)}`);
    }

    // 6. Cleanup Banners (Prefix: E2E Banner)
    console.log('>>> Cleaning up test banners...');
    try {
      const bannersRes = await axios.get<ApiEnvelope<PagePayload<CleanupBanner>>>(`${API_BASE}/admin/system/banners`, {
        headers,
        params: { keyword: 'E2E', size: 100 } 
      });
      const banners = extractPage(bannersRes);
      // [2026-07-27 정정] 필드명이 틀려 **한 건도 지워지지 않고 있었다**. BannerDto 의 실제 필드는
      //   `bnrNm`·`bnrSn` 인데 `bannerNm`·`bannerId` 로 필터해 testBanners 가 항상 빈 배열이었고,
      //   그래서 로그는 늘 "0 banner(s) cleaned" 를 찍으며 **청소된 것처럼 보였다**(false-green).
      //   그 결과 E2E 배너가 무한 누적됐고, 메인 배너는 한 번에 1개만 보여주는 캐러셀이라
      //   새로 만든 배너가 뒤로 밀려 05 Portal Promotion Flow 가 결정적으로 실패하게 됐다.
      const testBanners = banners.filter((b) => b.bnrNm?.startsWith('E2E Banner') || b.bnrNm?.startsWith('Debug'));
      for (const banner of testBanners) {
        process.stdout.write(`  - Deleting Banner: ${banner.bnrNm} (${banner.bnrSn})... `);
        await axios.delete(`${API_BASE}/admin/system/banners/${banner.bnrSn}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testBanners.length} banner(s) cleaned.`);
    } catch (error: unknown) {
      console.warn(`  => Banner cleanup skipped: ${describeError(error)}`);
    }

    // 7. Cleanup Board Posts (Prefix: E2E Security FAQ, E2E ...)
    console.log('>>> Cleaning up E2E board posts...');
    const targetBbsIds = ['BBSMSTR_AAAAAAAAAAAA', 'BBSMSTR_DDDDDDDDDDDD', 'BBSMSTR_EEEEEEEEEEEE'];
    for (const bbsId of targetBbsIds) {
      try {
        const postsRes = await axios.get<ApiEnvelope<PagePayload<CleanupPost>>>(`${API_BASE}/boards/${bbsId}`, {
          headers,
          params: { searchCnd: '0', searchWrd: 'E2E', size: 100 }
        });
        const posts = extractPage(postsRes);
        const testPosts = posts.filter((p) =>
          p.pstTtl?.startsWith('E2E') || p.title?.startsWith('E2E')
        );
        for (const post of testPosts) {
          const postId = post.pstId || post.id;
          if (postId === undefined) {
            console.warn(`  => Post cleanup skipped missing ID: ${post.pstTtl || post.title || '(untitled)'}`);
            continue;
          }
          process.stdout.write(`  - Deleting Post: ${post.pstTtl || post.title} (${postId})... `);
          await axios.delete(`${API_BASE}/boards/${bbsId}/posts/${postId}`, { headers });
          console.log('DONE');
        }
        if (testPosts.length > 0) console.log(`  => ${testPosts.length} post(s) cleaned from ${bbsId}.`);
      } catch (error: unknown) {
        console.warn(`  => Board ${bbsId} cleanup skipped: ${describeError(error)}`);
      }
    }

    // 8. Cleanup Menus (Prefix: Root_ or Menu E2E)
    console.log('>>> Cleaning up test menus...');
    try {
      const menusRes = await axios.get<ApiEnvelope<CleanupMenu[]>>(`${API_BASE}/admin/system/menus/all`, { headers });
      const menus = menusRes.data.data || [];
      const testMenus = menus.filter((m) =>
        m.menuNm.startsWith('Root_') || 
        m.menuNm.startsWith('Menu E2E') ||
        m.menuNm.startsWith('Menu_E2E')
      );
      
      testMenus.sort((a, b) => b.menuNo - a.menuNo);

      for (const menu of testMenus) {
        process.stdout.write(`  - Deleting Menu: ${menu.menuNm} (${menu.menuNo})... `);
        await axios.delete(`${API_BASE}/admin/system/menus/${menu.menuNo}`, { headers });
        console.log('DONE');
      }
    } catch (error: unknown) {
      console.warn(`  => Menu cleanup skipped: ${describeError(error)}`);
    }

    // 9. Cleanup Address Books (Prefix: Identity_)
    console.log('>>> Cleaning up test address books...');
    try {
      const addressRes = await axios.get<ApiEnvelope<PagePayload<CleanupAddress>>>(`${API_BASE}/address-books`, {
        headers,
        params: { searchWrd: 'Identity_', size: 100 } 
      });
      const addresses = extractPage(addressRes);
      const testAddresses = addresses.filter((a) => a.adbkNm?.startsWith('Identity_'));
      for (const address of testAddresses) {
        process.stdout.write(`  - Deleting Address Book Entry: ${address.adbkNm} (${address.adbkId})... `);
        await axios.delete(`${API_BASE}/address-books/${address.adbkId}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testAddresses.length} address book entry(ies) cleaned.`);
    } catch (error: unknown) {
      console.warn(`  => Address book cleanup skipped: ${describeError(error)}`);
    }

    // 10. Cleanup Online Manuals (Prefix: E2E Manual)
    console.log('>>> Cleaning up test online manuals...');
    try {
      const manualRes = await axios.get<ApiEnvelope<PagePayload<CleanupManual>>>(`${API_BASE}/help/manuals`, {
        headers,
        params: { keyword: 'E2E Manual', size: 100 } 
      });
      const manuals = extractPage(manualRes);
      const testManuals = manuals.filter((m) => m.onlnMnlNm?.startsWith('E2E Manual'));
      for (const manual of testManuals) {
        process.stdout.write(`  - Deleting Manual: ${manual.onlnMnlNm} (${manual.onlnMnlSn})... `);
        await axios.delete(`${API_BASE}/help/manuals/${manual.onlnMnlSn}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testManuals.length} manual(s) cleaned.`);
    } catch (error: unknown) {
      console.warn(`  => Manual cleanup skipped: ${describeError(error)}`);
    }

    // 11. Cleanup Security Artifacts (Authorities: ROLE_E2E_, Groups: GROUP_E2E_, Roles: URL_E2E_)
    // 02-admin-system.spec.ts 가 생성하는 권한/그룹/롤이 정리 대상에 없어 라이브 DB 에
    // 가비지가 축적됐음(2026-07-17 실측 411+155행 수동 정리). 재축적 방지.
    console.log('>>> Cleaning up test security artifacts (roles/groups/authorities)...');
    try {
      const rolesRes = await axios.get<ApiEnvelope<PagePayload<CleanupRole>>>(`${API_BASE}/admin/system/roles`, {
        headers,
        params: { size: 100 }
      });
      const roles = extractPage(rolesRes);
      const testRoles = roles.filter((r) =>
        r.roleId?.startsWith('URL_E2E_') || r.roleNm?.startsWith('E2E Role')
      );
      for (const role of testRoles) {
        process.stdout.write(`  - Deleting Role: ${role.roleNm} (${role.roleId})... `);
        await axios.delete(`${API_BASE}/admin/system/roles/${role.roleId}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testRoles.length} role(s) cleaned.`);
    } catch (error: unknown) {
      console.warn(`  => Role cleanup skipped: ${describeError(error)}`);
    }
    try {
      const groupsRes = await axios.get<ApiEnvelope<PagePayload<CleanupGroup>>>(`${API_BASE}/admin/system/groups`, {
        headers,
        params: { searchKeyword: 'E2E' }
      });
      const groups = extractPage(groupsRes);
      const testGroups = groups.filter((g) =>
        g.groupId?.startsWith('GROUP_E2E_') || g.groupNm?.startsWith('E2E Group')
      );
      for (const group of testGroups) {
        process.stdout.write(`  - Deleting Group: ${group.groupNm} (${group.groupId})... `);
        await axios.delete(`${API_BASE}/admin/system/groups/${group.groupId}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testGroups.length} group(s) cleaned.`);
    } catch (error: unknown) {
      console.warn(`  => Group cleanup skipped: ${describeError(error)}`);
    }
    try {
      const authRes = await axios.get<ApiEnvelope<PagePayload<CleanupAuthority>>>(`${API_BASE}/admin/system/authorities`, {
        headers,
        params: { size: 100 }
      });
      const authorities = extractPage(authRes);
      const testAuths = authorities.filter((a) => a.authrtCd?.startsWith('ROLE_E2E_'));
      for (const auth of testAuths) {
        process.stdout.write(`  - Deleting Authority: ${auth.authrtNm} (${auth.authrtCd})... `);
        await axios.delete(`${API_BASE}/admin/system/authorities/${auth.authrtCd}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testAuths.length} authority(ies) cleaned.`);
    } catch (error: unknown) {
      console.warn(`  => Authority cleanup skipped: ${describeError(error)}`);
    }

    console.log('>>> [DB Cleanup] All test data removed successfully!\n');
  } catch (error: unknown) {
    console.error('>>> [DB Cleanup] ERROR occurred during cleanup:', describeError(error));
    if (axios.isAxiosError(error) && error.response?.data) {
        console.error('>>> [DEBUG] Response data:', JSON.stringify(error.response.data));
    }
    if (error instanceof Error) {
      console.error(error.stack);
    }
  }
}

export default async function globalTeardown() {
  await cleanup();
}

// Allow running directly
// Playwright 는 이 TypeScript 파일을 CommonJS 로 변환해 globalTeardown 으로 읽는다.
// package.json 이 CommonJS 인 상태에서 import.meta 를 쓰면 Node 22/24 모두 파싱 단계에서
// 죽는다. CommonJS 의 표준 직접 실행 판정은 Playwright import(false)와 tsx 직접 실행(true)을
// 모두 구분하면서 파일 경로/운영체제에도 의존하지 않는다.
if (require.main === module) {
  void cleanup();
}
