import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.resolve('playwright/.auth/user.json');

setup('authenticate-final', async ({ request }) => {
    const url = 'http://127.0.0.1:8080/api/v1/auth/login';
    const response = await request.post(url, {
        data: { id: 'webmaster', password: '1' }
    });

    if (!response.ok()) throw new Error(`Login failed ${response.status()}`);

    // BACKEND RESPONSE STRUCTURE: { success, data: { accessToken, role, ... } }
    const resBody = await response.json();
    const token = resBody.data.accessToken;
    const role = resBody.data.role || 'ROLE_ADMIN';

    console.log('>>> TOKEN ACQUIRED:', token.substring(0, 10) + '...');

    const storageState = {
        cookies: [
            { name: 'accessToken', value: token, domain: '127.0.0.1', path: '/', expires: -1 },
            { name: 'accessToken', value: token, domain: 'localhost', path: '/', expires: -1 },
            { name: 'userRole', value: role, domain: '127.0.0.1', path: '/', expires: -1 }
        ],
        origins: [
            {
                origin: 'http://127.0.0.1:3001',
                localStorage: [
                    { name: 'accessToken', value: token },
                    { name: 'egov_smart_tour_v1', value: 'true' }
                ]
            }
        ]
    };

    if (!fs.existsSync(path.dirname(authFile))) fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2));
    console.log('>>> SUCCESS: user.json generated via real data.accessToken');
});
