import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { TEST_CREDENTIALS } from './test-credentials';

const adminFile = path.resolve('playwright/.auth/admin.json');
const userFile = path.resolve('playwright/.auth/user.json');

/** 응답 헤더의 Set-Cookie 문자열에서 특정 쿠키 값을 추출한다(바디 토큰 축소 대비). */
function extractSetCookie(headers: Record<string, string>, name: string): string {
    const raw = headers['set-cookie'] || '';
    const m = raw.match(new RegExp(`${name}=([^;]+)`));
    return m ? m[1] : '';
}

async function authenticate(request: any, id: string, password: string, authFilePath: string) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1/';
    const url = `${apiUrl.endsWith('/') ? apiUrl : apiUrl + '/'}auth/login`;

    let token: string = '';
    let refreshToken: string = '';
    let success = false;
    let lastErr: any;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await request.post(url, {
                data: { userId: id, password: password },
                timeout: 5000
            });

            if (response.ok()) {
                const resBody = await response.json();
                token = resBody.data.accessToken;
                // [Phase 3 대비] refreshToken 은 응답 바디 축소(@JsonIgnore) 후에도 Set-Cookie 로 발급되므로
                // 바디 우선, 부재 시 Set-Cookie 헤더에서 파싱(계약 축소에 선제 대응).
                refreshToken = resBody.data.refreshToken || extractSetCookie(response.headers(), 'refreshToken');
                success = true;
                break;
            } else {
                lastErr = new Error(`status: ${response.status()}`);
            }
        } catch (err: any) {
            lastErr = err;
        }
        
        if (!success && attempt < 3) {
            await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
        }
    }

    if (!success) {
        throw new Error(`[AUTH SETUP] Backend unreachable for ${id} after 3 attempts (${lastErr?.message || 'unknown'}).`);
    }

    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3001';
    const domain = new URL(webUrl).hostname;
    // 프로덕션 정합: accessToken 은 HttpOnly(브라우저 JS 미접근). userRole 쿠키·localStorage accessToken 은
    // 어떤 프로덕션 코드도 소비하지 않는 죽은 잔재라 제거한다. egov_smart_tour_v1 은 투어 오버레이 억제용 살아있는 의존.
    const storageState = {
        cookies: [
            { name: 'accessToken', value: token, domain: domain, path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' as const },
            { name: 'refreshToken', value: refreshToken, domain: domain, path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' as const }
        ],
        origins: [
            {
                origin: webUrl,
                localStorage: [
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
