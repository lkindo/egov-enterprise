import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const adminFile = path.resolve('playwright/.auth/admin.json');
const userFile = path.resolve('playwright/.auth/user.json');

async function authenticate(request: any, id: string, authFilePath: string) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1/';
    const url = `${apiUrl.endsWith('/') ? apiUrl : apiUrl + '/'}auth/login`;

    let token: string;
    let refreshToken: string;
    let role: string;

    try {
        const response = await request.post(url, {
            data: { userId: id, password: '1' }
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

    const storageState = {
        cookies: [
            { name: 'accessToken', value: token, domain: 'localhost', path: '/', expires: -1 },
            { name: 'refreshToken', value: refreshToken, domain: 'localhost', path: '/', expires: -1, httpOnly: true },
            { name: 'userRole', value: role, domain: 'localhost', path: '/', expires: -1 }
        ],
        origins: [
            {
                origin: 'http://localhost:3000',
                localStorage: [
                    { name: 'accessToken', value: token },
                    { name: 'egov_smart_tour_v1', value: 'true' }
                ]
            },
            {
                origin: 'http://127.0.0.1:3000',
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
    await authenticate(request, 'webmaster', adminFile);
});

setup('authenticate-user', async ({ request }) => {
    await authenticate(request, 'TEST1', userFile);
});
