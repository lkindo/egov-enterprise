import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { TEST_CREDENTIALS } from './test-credentials';

const adminFile = path.resolve('playwright/.auth/admin.json');
const userFile = path.resolve('playwright/.auth/user.json');

async function authenticate(request: any, id: string, password: string, authFilePath: string) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1/';
    const url = `${apiUrl.endsWith('/') ? apiUrl : apiUrl + '/'}auth/login`;

    let token: string;
    let refreshToken: string;
    let role: string;

    try {
        const response = await request.post(url, {
            data: { userId: id, password: password }
        });

        if (response.ok()) {
            const resBody = await response.json();
            token = resBody.data.accessToken;
            refreshToken = resBody.data.refreshToken;
            role = resBody.data.role;
        } else {
            throw new Error(`[AUTH SETUP] Backend login failed for ${id} (status: ${response.status()}).`);
        }
    } catch (err: any) {
        throw new Error(`[AUTH SETUP] Backend unreachable for ${id} (${err.message}).`);
    }

    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3001';
    const domain = new URL(webUrl).hostname;
    const storageState = {
        cookies: [
            { name: 'accessToken', value: token, domain: domain, path: '/', expires: -1, httpOnly: false },
            { name: 'refreshToken', value: refreshToken, domain: domain, path: '/', expires: -1, httpOnly: true },
            { name: 'userRole', value: role, domain: domain, path: '/', expires: -1, httpOnly: false }
        ],
        origins: [
            {
                origin: webUrl,
                localStorage: [
                    { name: 'accessToken', value: token },
                    { name: 'egov_smart_tour_v1', value: 'true' }
                ]
            }
        ]
    };

    if (!fs.existsSync(path.dirname(authFilePath))) fs.mkdirSync(path.dirname(authFilePath), { recursive: true });
    fs.writeFileSync(authFilePath, JSON.stringify(storageState, null, 2));
    console.log(`>>> SUCCESS: Session generated for ${id} at ${authFilePath}`);
}

setup('authenticate-admin', async ({ request }) => {
    await authenticate(request, TEST_CREDENTIALS.admin.id, TEST_CREDENTIALS.admin.password, adminFile);
});

setup('authenticate-user', async ({ request }) => {
    await authenticate(request, TEST_CREDENTIALS.user.id, TEST_CREDENTIALS.user.password, userFile);
});
