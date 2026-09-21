import path from 'path';
import { expect,test } from '../fixtures/browser-test';
const USER_AUTH = path.join(__dirname, '..', '..', 'playwright', '.auth', 'user.json');
// ── 브라우저 카나리아: 실제 브라우저 쿠키가 미들웨어까지 도달하는가 ────────────────
// 위 매트릭스는 Cookie 헤더를 직접 실어 미들웨어 '판정 로직'을 검증한다. 그 로직이 옳아도
// 브라우저가 쿠키를 싣지 못하면(SameSite·path·HttpOnly 설정 사고) 사용자는 여전히 튕긴다.
// 배선 자체는 층이 다르므로 최소 1건을 실제 브라우저로 남긴다.
test.describe('브라우저 쿠키와 미들웨어의 권한 판정 연결', () => {
    test.use({ storageState: USER_AUTH });
    test('실제 브라우저 세션의 일반 사용자는 관리 콘솔에서 차단되고 허용 경로는 통과한다', async ({ page }) => {
        await page.goto('/admin/community/boards/master');
        await expect(page).toHaveURL(/auth_error=unauthorized/, { timeout: 15000 });
        await page.goto('/admin/collaboration');
        await expect(page).not.toHaveURL(/auth_error=unauthorized/);
    });
    /**
     * 레거시 별칭이 설정 리다이렉트를 거쳐 **최종적으로도** 차단되는지.
     *
     * `next.config.redirects()` 는 미들웨어보다 **먼저** 실행되므로, 별칭 경로는 인증 게이트에
     * 도달하지 않는다. 그 자체는 정상이지만 — **별칭이 게이트 없는 곳으로 착지하면 그것이 우회로다.**
     * 위 E4 매트릭스는 단일 홉(maxRedirects:0)만 보므로 이 축을 원리적으로 잡지 못한다.
     *
     * 브라우저로 검증하는 이유는 편의가 아니라 **필요** 다: APIRequestContext 는 수동 `Cookie` 헤더를
     * 다음 홉으로 전달하지 않아(실증 완료) 체인 도중 세션을 잃는다. 브라우저는 쿠키 저장소를 쓰므로
     * 모든 홉에 세션이 실린다 — 실제 사용자가 겪는 경로와 같다.
     *
     * 사슬: /admin/system/audit → (config redirect) /admin/system/monitoring/hub?tab=system
     *       → (middleware, 비관리자) /?auth_error=unauthorized
     */
    test('레거시 별칭은 설정 리다이렉트를 거쳐도 최종적으로 차단된다', async ({ page }) => {
        await page.goto('/admin/system/audit');
        await expect(page, '레거시 별칭이 인증 게이트를 우회해 착지했다')
            .toHaveURL(/auth_error=unauthorized/, { timeout: 15000 });
    });
});
