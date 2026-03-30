import axios from 'axios';

const API_BASE = 'http://localhost:8080/api/v1';
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
    const cookieList: string[] = [];

    for (const cookie of rawCookies) {
      const parts = cookie.split(';')[0];
      cookieList.push(parts);
      if (parts.startsWith('XSRF-TOKEN=')) {
        xsrfToken = parts.split('=')[1];
      }
    }

    const headers: any = { 
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
    const testUsers = users.filter((u: any) => u.userId.startsWith('user_'));
    
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
    const testBoards = boards.filter((b: any) => b.bbsNm.startsWith('E2E Test Board'));
    
    for (const board of testBoards) {
      process.stdout.write(`  - Deleting Board: ${board.bbsNm} (${board.bbsId})... `);
      await axios.delete(`${API_BASE}/admin/system/board-masters/${board.bbsId}`, { 
        headers,
        params: { userId: ADMIN_ID }
      });
      console.log('DONE');
    }

    // 4. Cleanup Menus (Prefix: Root_ or Menu E2E)
    console.log('>>> Cleaning up test menus...');
    const menusRes = await axios.get(`${API_BASE}/admin/system/menus/all`, { headers });
    const menus = menusRes.data.data || [];
    const testMenus = menus.filter((m: any) => m.menuNm.startsWith('Root_') || m.menuNm.startsWith('Menu E2E'));
    
    testMenus.sort((a: any, b: any) => b.menuNo - a.menuNo);

    for (const menu of testMenus) {
      process.stdout.write(`  - Deleting Menu: ${menu.menuNm} (${menu.menuNo})... `);
      await axios.delete(`${API_BASE}/admin/system/menus/${menu.menuNo}`, { headers });
      console.log('DONE');
    }

    console.log('>>> [DB Cleanup] All test data removed successfully!\n');
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error('>>> [DB Cleanup] ERROR occurred during cleanup:', errorMsg);
    if (error.response?.data) {
        console.error('>>> [DEBUG] Response data:', JSON.stringify(error.response.data));
    }
  }
}

export default cleanup;
cleanup();
