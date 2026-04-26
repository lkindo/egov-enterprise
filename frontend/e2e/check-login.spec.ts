import { test, expect } from '@playwright/test';

test('login check', async ({ request }) => {
    const response = await request.post('http://localhost:8080/api/v1/auth/login', {
        data: { userId: 'webmaster', password: '1' }
    });
    console.log('Status:', response.status());
    if (response.ok()) {
        const data = await response.json();
        console.log('Login Success:', data.data.accessToken ? 'YES' : 'NO');
    } else {
        const text = await response.text();
        console.log('Login Failed:', text);
    }
});
