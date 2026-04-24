import { test, expect } from '@playwright/test';

/**
 * 2026-04-24 Advanced Security Hardening E2E Tests
 * - Rate Limiting (Brute Force Protection)
 * - Session Revocation (DB-backed Refresh Token)
 */
test.describe('Advanced Security Hardening', () => {
    // 세션 정보 없이 깨끗한 상태에서 시작
    test.use({ storageState: { cookies: [], origins: [] } });
    
    // 1. Rate Limiting (429 Too Many Requests) 검증
    test('should return 429 after multiple failed login attempts', async ({ request }) => {
        const loginUrl = 'http://localhost:8080/api/v1/auth/login';
        let lastStatus = 0;
        
        console.log('>>> [RateLimit Test] Starting 30 consecutive failed login attempts...');
        
        for (let i = 0; i < 30; i++) {
            const response = await request.post(loginUrl, {
                data: {
                    userId: 'invalid_user',
                    password: 'wrong_password'
                }
            });
            lastStatus = response.status();
            if (lastStatus === 429) {
                console.log(`>>> [RateLimit Test] SUCCESS: Received 429 at attempt ${i + 1}`);
                break;
            }
        }
        
        expect(lastStatus).toBe(429);
    });

    // 2. 세션 무효화 (Logout & Revocation) 검증
    test('should revoke session after logout', async ({ request }) => {
        // 실제 테스트용 계정 정보 (auth.setup.ts 기반)
        const ADMIN_ID = 'webmaster';
        const ADMIN_PW = '1';
        
        console.log('>>> [Session Test] Step 1: Login');
        const loginRes = await request.post('http://localhost:8080/api/v1/auth/login', {
            data: { userId: ADMIN_ID, password: ADMIN_PW }
        });
        expect(loginRes.status()).toBe(200);
        
        // 쿠키 저장 확인 (Playwright request context handles cookies automatically)
        const meRes = await request.get('http://localhost:8080/api/v1/auth/me');
        expect(meRes.status()).toBe(200);
        console.log('>>> [Session Test] Step 2: Access /me (Authorized)');

        console.log('>>> [Session Test] Step 3: Logout');
        const logoutRes = await request.post('http://localhost:8080/api/v1/auth/logout');
        expect(logoutRes.status()).toBe(200);

        console.log('>>> [Session Test] Step 4: Access /me (Should be Unauthorized)');
        const meResAfter = await request.get('http://localhost:8080/api/v1/auth/me');
        expect(meResAfter.status()).toBe(401);

        console.log('>>> [Session Test] Step 5: Try Reissue (Should be Unauthorized)');
        const reissueRes = await request.post('http://localhost:8080/api/v1/auth/reissue');
        expect(reissueRes.status()).toBe(401);
    });

    // 3. Swagger 차단 검증 (Mocking Prod Profile is hard, but we can check if it exists in dev)
    test('should check swagger-ui status', async ({ request }) => {
        const response = await request.get('http://localhost:8080/swagger-ui/index.html');
        // 로컬/데브 환경에서는 200일 수 있지만, 운영 환경 설정을 검증하기 위한 가이드성 테스트
        console.log(`>>> [Swagger Test] Status: ${response.status()}`);
        if (process.env.NODE_ENV === 'production') {
            expect(response.status()).toBe(404);
        }
    });
});
