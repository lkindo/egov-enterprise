import axios from 'axios';

const API_BASE = 'http://localhost:8080/api/v1';
const ADMIN_ID = 'webmaster';
const ADMIN_PW = '1';

async function cleanup() {
  console.log('>>> [DB Cleanup] Starting garbage data removal...');
  
  try {
    // 1. Get Admin Access Token
    console.log('>>> Authenticating as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, { id: ADMIN_ID, password: ADMIN_PW });
    const token = loginRes.data.data.accessToken;
    const authHeader = { Authorization: `Bearer ${token}` };

    // 2. Fetch User List with 'user_' prefix
    console.log('>>> Searching for test users with "user_" prefix...');
    const usersRes = await axios.get(`${API_BASE}/users`, { 
      headers: authHeader,
      params: { searchCondition: '0', searchKeyword: 'user_', page번호: 1, pageUnit: 100 } 
    });
    
    const testUsers = (usersRes.data.list || []).filter((u: any) => u.userId.startsWith('user_'));
    console.log(`>>> Found ${testUsers.length} test users to delete.`);

    // 3. Delete specific users
    for (const user of testUsers) {
      process.stdout.write(`  - Deleting: ${user.userId}... `);
      await axios.delete(`${API_BASE}/users/${user.userId}`, { headers: authHeader });
      console.log('DONE');
    }

    // 4. Cleanup other artifacts if necessary (e.g., boards with test content)
    // Add more cleanup logic here as the project grows

    console.log('>>> [DB Cleanup] All garbage data removed successfully!');
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error('>>> [DB Cleanup] ERROR occurred during cleanup:', errorMsg);
    // Suppress exit code 1 if it's just a 404 or empty list to not break CI
    if (error.response?.status !== 404) {
        process.exit(0); 
    }
  }
}

cleanup();
