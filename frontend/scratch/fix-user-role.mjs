
async function fixUserRole() {
    const API_URL = 'http://127.0.0.1:8080/api/v1';
    
    try {
        console.log('>>> Logging in as admin...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'webmaster', password: '1' })
        });
        const loginData = await loginRes.json();
        const token = loginData.data.accessToken;
        
        console.log('>>> Searching for TEST1 in Admin System Users...');
        // searchCondition=1 means Search by ID
        const userListRes = await fetch(`${API_URL}/admin/system/users?searchCondition=1&searchKeyword=TEST1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userListData = await userListRes.json();
        
        if (!userListData.data) {
            console.error('!!! userListData.data is missing!', userListData);
            return;
        }

        const list = userListData.data.list || userListData.data.content || [];
        const testUser = list.find(u => u.userId === 'TEST1');
        
        if (!testUser) {
            console.error('!!! TEST1 user not found in the list!');
            console.log('>>> Sample users found:', list.map(u => u.userId));
            return;
        }
        
        const uniqId = testUser.esntlId;
        console.log(`>>> Found TEST1 uniqId: ${uniqId}`);
        
        console.log('>>> Updating role to ROLE_USER...');
        const updateRes = await fetch(`${API_URL}/admin/system/user-authorities`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{ uniqId: uniqId, authorCode: 'ROLE_USER' }])
        });
        
        if (updateRes.ok) {
            console.log('>>> SUCCESS: TEST1 role updated to ROLE_USER.');
        } else {
            const errData = await updateRes.text();
            console.error(`!!! FAILED: ${updateRes.status} - ${errData}`);
        }
    } catch (error) {
        console.error('!!! ERROR:', error);
    }
}

fixUserRole();
