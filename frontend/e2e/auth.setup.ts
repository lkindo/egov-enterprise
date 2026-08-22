import { test as setup, type APIRequestContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { TEST_CREDENTIALS } from './test-credentials';

const adminFile = path.resolve('playwright/.auth/admin.json');
const userFile = path.resolve('playwright/.auth/user.json');
const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;
const IS_POSIX = process.platform !== 'win32';

function assertPrivatePosixMode(targetPath: string, expectedMode: number, targetKind: string): void {
    const actualMode = fs.statSync(targetPath).mode & 0o777;
    if (actualMode !== expectedMode) {
        throw new Error(`[AUTH SETUP] Failed to enforce private ${targetKind} permissions.`);
    }
}

/**
 * 토큰이 들어 있는 storageState를 생성 순간부터 비공개로 유지한다.
 *
 * Windows에서는 POSIX mode/chmod가 DACL을 설정하지 않는다. 따라서 Windows에서는
 * 저장소의 gitignore 및 실행 계정의 작업공간 ACL이 경계이고, 아래 0700/0600 보장을
 * Windows까지 확장해 주장하지 않는다.
 */
function writePrivateStorageState(authFilePath: string, storageState: unknown): void {
    const directoryPath = path.dirname(authFilePath);
    fs.mkdirSync(directoryPath, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });

    if (IS_POSIX) {
        // mkdir의 mode는 기존 디렉터리에 적용되지 않으므로 매 실행마다 먼저 조인다.
        fs.chmodSync(directoryPath, PRIVATE_DIRECTORY_MODE);
        assertPrivatePosixMode(directoryPath, PRIVATE_DIRECTORY_MODE, 'directory');
    }

    const openFlags = fs.constants.O_WRONLY
        | fs.constants.O_CREAT
        | fs.constants.O_TRUNC
        | (IS_POSIX ? fs.constants.O_NOFOLLOW : 0);
    const descriptor = fs.openSync(authFilePath, openFlags, PRIVATE_FILE_MODE);
    const serializedState = JSON.stringify(storageState, null, 2);

    try {
        if (IS_POSIX) {
            // 기존 파일은 open의 mode를 상속하지 않으므로 자격증명을 쓰기 전에 descriptor를 조인다.
            fs.fchmodSync(descriptor, PRIVATE_FILE_MODE);
        }
        fs.writeFileSync(descriptor, serializedState, { encoding: 'utf8' });
    } finally {
        fs.closeSync(descriptor);
    }

    if (IS_POSIX) {
        // 쓰기 완료 후에도 최종 경로의 권한을 다시 고정해 이후 회귀를 fail-closed로 만든다.
        fs.chmodSync(authFilePath, PRIVATE_FILE_MODE);
        assertPrivatePosixMode(authFilePath, PRIVATE_FILE_MODE, 'file');
    }
}

/** 응답 헤더의 Set-Cookie 문자열에서 특정 쿠키 값을 추출한다(바디 토큰 축소 대비). */
function extractSetCookie(headers: Record<string, string>, name: string): string {
    const raw = headers['set-cookie'] || '';
    const m = raw.match(new RegExp(`${name}=([^;]+)`));
    return m ? m[1] : '';
}

async function authenticate(request: APIRequestContext, id: string, password: string, authFilePath: string) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1/';
    const url = `${apiUrl.endsWith('/') ? apiUrl : apiUrl + '/'}auth/login`;

    let token: string = '';
    let refreshToken: string = '';
    let success = false;

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
            }
        } catch {
            // 재시도 후에도 실패하면 아래의 고정 오류만 노출한다. 식별자·endpoint·응답 원문은 기록하지 않는다.
        }
        
        if (!success && attempt < 3) {
            await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
        }
    }

    if (!success) {
        throw new Error('[AUTH SETUP] Authentication setup failed after 3 attempts.');
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

    writePrivateStorageState(authFilePath, storageState);
    console.log('>>> SUCCESS: Authentication storage state generated.');
}

setup('authenticate-admin', async ({ request }) => {
    await authenticate(request, TEST_CREDENTIALS.admin.id, TEST_CREDENTIALS.admin.password, adminFile);
});

setup('authenticate-user', async ({ request }) => {
    await authenticate(request, TEST_CREDENTIALS.user.id, TEST_CREDENTIALS.user.password, userFile);
});
