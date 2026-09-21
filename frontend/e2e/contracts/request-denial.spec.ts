import { expect,test } from '../fixtures/api-test';
test.describe('Quality & Resilience', () => {
    test.describe('Security & RBAC Integrity', () => {
        test.use({ storageState: 'playwright/.auth/user.json' });
        test("일반 사용자 쿠키와 잘못된 CSRF 헤더의 관리자 쓰기 요청을 거부한다", async ({ request }) => {
            // Spring API의 CSRF 활성 여부는 이 단언으로 알 수 없다. 이 요청의 인가 거부만 고정한다.
            const response = await request.post('/api/v1/admin/system/users', {
                headers: { 'X-XSRF-TOKEN': 'invalid-token' },
                data: { userId: 'csrf_attacker' }
            });
            expect([403, 401]).toContain(response.status());
        });
    });
});
