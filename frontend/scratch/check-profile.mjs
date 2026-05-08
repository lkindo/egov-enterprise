
function decodeJWT(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

async function checkTest1Profile() {
    const API_URL = 'http://127.0.0.1:8080/api/v1';
    
    try {
        console.log('>>> Logging in as TEST1...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'TEST1', password: '1' })
        });
        const loginData = await loginRes.json();
        
        if (!loginData.success) {
            console.error('!!! Login failed:', loginData);
            return;
        }

        const token = loginData.data.accessToken;
        const payload = decodeJWT(token);
        console.log('>>> JWT Payload:', JSON.stringify(payload, null, 2));

        console.log('>>> Getting Board Master List with TEST1 token...');
        const boardListRes = await fetch(`${API_URL}/admin/system/board-masters`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('>>> Board List Response Status:', boardListRes.status);
    } catch (error) {
        console.error('!!! ERROR:', error);
    }
}

checkTest1Profile();
