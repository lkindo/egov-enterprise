import axios from 'axios';

const API_BASE = 'http://localhost:8080/api/v1';
const ADMIN_ID = 'webmaster';
const ADMIN_PW = '1';

async function cleanup() {
  console.log('\n>>> [DB Cleanup] Starting cleanup of E2E test data...');
  
  try {
    // 1. Authenticate to get token
    console.log('>>> Authenticating as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, { userId: ADMIN_ID, password: ADMIN_PW });
    const token = loginRes.data.data.accessToken;
    const authHeader = { Authorization: `Bearer ${token}` };
    console.log('>>> Authentication successful.');

    // 2. Cleanup Users (Prefix: user_)
    console.log('>>> Cleaning up test users...');
    const usersRes = await axios.get(`${API_BASE}/admin/system/users`, { 
      headers: authHeader,
      params: { searchCondition: '0', searchKeyword: 'user_', pageIndex: 1, pageUnit: 100 } 
    });
    
    // PageResponse structure might vary (list or content)
    const users = usersRes.data.data?.list || usersRes.data.data?.content || [];
    const testUsers = users.filter((u: any) => u.userId.startsWith('user_'));
    
    for (const user of testUsers) {
      process.stdout.write(`  - Deleting User: ${user.userId}... `);
      await axios.delete(`${API_BASE}/admin/system/users/${user.userId}`, { headers: authHeader });
      console.log('DONE');
    }

    // 3. Cleanup Boards (Prefix: E2E Test Board)
    console.log('>>> Cleaning up test boards...');
    const boardsRes = await axios.get(`${API_BASE}/admin/system/board-masters`, { 
      headers: authHeader,
      params: { searchWrd: 'E2E Test Board', size: 100 } 
    });
    
    const boards = boardsRes.data.data?.list || boardsRes.data.data?.content || [];
    const testBoards = boards.filter((b: any) => b.bbsNm.startsWith('E2E Test Board'));
    
    for (const board of testBoards) {
      process.stdout.write(`  - Deleting Board: ${board.bbsNm} (${board.bbsId})... `);
      // Board master delete requires userId query param
      await axios.delete(`${API_BASE}/admin/system/board-masters/${board.bbsId}`, { 
        headers: authHeader,
        params: { userId: ADMIN_ID }
      });
      console.log('DONE');
    }

    // 4. Cleanup Menus (Prefix: Root_ or Menu E2E)
    console.log('>>> Cleaning up test menus...');
    const menusRes = await axios.get(`${API_BASE}/admin/system/menus/all`, { headers: authHeader });
    const menus = menusRes.data.data || [];
    const testMenus = menus.filter((m: any) => m.menuNm.startsWith('Root_') || m.menuNm.startsWith('Menu E2E'));
    
    // Reverse sort by menuNo to delete children before parents if hierarchy exists (simple approach)
    testMenus.sort((a: any, b: any) => b.menuNo - a.menuNo);

    for (const menu of testMenus) {
      process.stdout.write(`  - Deleting Menu: ${menu.menuNm} (${menu.menuNo})... `);
      await axios.delete(`${API_BASE}/admin/system/menus/${menu.menuNo}`, { headers: authHeader });
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
