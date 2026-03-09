import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const adminFile = path.resolve('playwright/.auth/admin.json');
const userFile = path.resolve('playwright/.auth/user.json');

async function authenticate(request: any, id: string, authFilePath: string) {
    const url = 'http://127.0.0.1:8080/api/v1/auth/login';
    const response = await request.post(url, {
        data: { id: id, password: '1' }
    }).catch((err: Error) => {
        throw new Error(`Connection failed for ${id}: ${err.message}`);
    });

    if (!response.ok()) throw new Error(`Login failed for ${id} ${response.status()}`);

    const resBody = await response.json();
    const token = resBody.data.accessToken;
    const role = resBody.data.role;

    const storageState = {
        cookies: [
            { name: 'accessToken', value: token, domain: '127.0.0.1', path: '/', expires: -1 },  
            { name: 'accessToken', value: token, domain: 'localhost', path: '/', expires: -1 },  
            { name: 'userRole', value: role, domain: '127.0.0.1', path: '/', expires: -1 },      
            { name: 'userRole', value: role, domain: 'localhost', path: '/', expires: -1 }       
        ],
        origins: [
            {
                origin: 'http://127.0.0.1:3001',
                localStorage: [{ name: 'accessToken', value: token }]
            },
            {
                origin: 'http://localhost:3001',
                localStorage: [{ name: 'accessToken', value: token }]
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
    await authenticate(request, 'user_regular', userFile);
});
