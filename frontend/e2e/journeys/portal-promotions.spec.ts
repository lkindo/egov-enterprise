import { APIRequestContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { expect,test } from '../fixtures/browser-test';
import { PromotionPage } from '../pages/PromotionPage';
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
/**
 * 이 spec 이 UI 로 만든 홍보물(팝업·배너)을 제목으로 찾아 지운다.
 *
 * <p>⚠ [2026-09-01 신설] 종전에는 이 파일이 팝업과 배너를 만들고 **아무것도 지우지 않았다**
 * (`finally`·`afterEach`·delete 0건). globalTeardown 에만 의존했는데, 그 사이 잔존분이
 * 같은 실행의 다른 단언을 오염시킨다.
 *
 * <p>이것은 가설이 아니라 이 파일이 이미 겪은 사고다 — 아래 배너 검증 주석이 기록하듯
 * <b>E2E 배너가 7건까지 누적되자 이 테스트는 격리 실행에서도 100% 실패했다.</b> 당시 조치는
 * 단언을 순서 무관하게 바꾼 것(캐러셀 순회)이었고, 그 우회는 옳았지만 <b>누수 자체는 그대로</b>였다.
 * 여기서 그 원인을 닫는다.
 *
 * <p>정리 실패는 테스트를 깨뜨리지 않는다(정리는 계약이 아니다). 대신 경고로 남겨 누적을 드러낸다.
 */
async function deletePromotionByTitle(request: APIRequestContext, kind: 'popups' | 'banners', title: string): Promise<void> {
    const idField = kind === 'popups' ? 'popupSn' : 'bnrSn';
    try {
        const token = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'playwright', '.auth', 'admin.json'), 'utf8')).cookies?.find((c: {
            name: string;
        }) => c.name === 'accessToken')?.value;
        if (!token)
            return;
        const headers = { Authorization: `Bearer ${token}` };
        const listRes = await request.get(`${API_BASE}/admin/system/${kind}?pageIndex=1&pageUnit=100`, { headers });
        if (!listRes.ok())
            return;
        const body = await listRes.json();
        const rows: Array<Record<string, unknown>> = body?.data?.list ?? body?.data ?? [];
        for (const row of rows) {
            const rowTitle = String(row?.popupNm ?? row?.bnrNm ?? row?.title ?? '');
            if (!rowTitle.includes(title))
                continue;
            const id = row?.[idField];
            if (id === undefined || id === null)
                continue;
            const del = await request.delete(`${API_BASE}/admin/system/${kind}/${id}`, { headers });
            if (!del.ok()) {
                console.warn(`>>> [cleanup] ${kind} ${id} 삭제 실패(${del.status()}) — 잔존분이 누적됩니다.`);
            }
        }
    }
    catch (error) {
        console.warn(`>>> [cleanup] ${kind} 정리 중 오류 — 잔존분이 누적됩니다: ${String(error)}`);
    }
}
test.describe('Public Engagement & Experience', () => {
    test('Portal Promotion Flow (Admin Popup/Banner -> User Visibility)', async ({ adminPage, userPage, request }) => {
        const popupTitle = `E2E Popup ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const bannerTitle = `E2E Banner ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const promo = new PromotionPage(adminPage);
        try {
            await test.step('Admin: Configure Layer Popup', async () => {
                console.log(`>>> Configuring popup: ${popupTitle}`);
                await promo.gotoBannerPopupAdmin(); // Fixed method name
                await promo.createPopup(popupTitle);
            });
            await test.step('Admin: Configure Main Banner', async () => {
                console.log(`>>> Configuring banner: ${bannerTitle}`);
                await promo.createBanner(bannerTitle);
            });
            await test.step('User: Verify Promotion Visibility', async () => {
                console.log(`>>> Verifying popup and banner on Dashboard`);
                await userPage.goto('/');
                // Popups might take a moment to render or require a refresh
                const popupTitleLoc = userPage.getByText(popupTitle);
                for (let i = 0; i < 3; i++) {
                    const popupVisible = await popupTitleLoc.first()
                        .waitFor({ state: 'visible', timeout: 5000 })
                        .then(() => true)
                        .catch(() => false);
                    if (popupVisible)
                        break;
                    console.log(`>>> [Promotion] Popup not found (attempt ${i + 1}), reloading...`);
                    await userPage.reload();
                }
                // [E2E 감사 B] else-warn 통과 제거 — 관리자가 만든 팝업/배너가 사용자에게 실제로 보여야 한다(무조건 단언).
                // 보이지 않으면 생성이 조용히 실패했거나 노출 로직이 깨진 것이므로 실패 처리한다.
                await expect(popupTitleLoc.first()).toBeVisible({ timeout: 10000 });
                // [2026-07-27 결정적 검증] 메인 배너는 **한 번에 한 장만** 렌더하는 캐러셀이다
                //   (BannerSlider: `banners[currentIndex]`, 5초마다 회전). 그래서 "새 배너가 보이는가"를
                //   리로드로만 확인하면 슬라이드 순서에 운을 맡기게 된다 — 리로드는 currentIndex 를 0 으로
                //   되돌리므로 새 배너가 뒤쪽이면 **몇 번을 새로고침해도 영원히 보이지 않는다.**
                //   (실제로 E2E 배너가 7건까지 누적되자 이 테스트는 격리 실행에서도 100% 실패했다.)
                //   → 순서에 의존하지 않도록 '다음 슬라이드'로 한 바퀴 순회하며 찾는다.
                const bannerTitleLoc = userPage.getByText(bannerTitle).first();
                const nextSlideBtn = userPage.getByRole('button', { name: '다음 슬라이드' });
                const bannerVisible = await bannerTitleLoc
                    .waitFor({ state: 'visible', timeout: 5000 })
                    .then(() => true)
                    .catch(() => false);
                if (!bannerVisible) {
                    // 슬라이드가 1장뿐이면 이동 버튼이 없다(그 경우 위 검사로 이미 판정된다).
                    const hasNext = await nextSlideBtn
                        .waitFor({ state: 'visible', timeout: 5000 })
                        .then(() => true)
                        .catch(() => false);
                    if (hasNext) {
                        // 한 바퀴 돌면 반드시 만난다. 여유를 두되 무한 루프는 만들지 않는다.
                        for (let i = 0; i < 20; i++) {
                            await nextSlideBtn.click();
                            const currentSlideVisible = await bannerTitleLoc
                                .waitFor({ state: 'visible', timeout: 1000 })
                                .then(() => true)
                                .catch(() => false);
                            if (currentSlideVisible)
                                break;
                        }
                    }
                }
                await expect(bannerTitleLoc).toBeVisible({ timeout: 10000 });
            });
        }
        finally {
            // 누적이 다음 실행의 캐러셀 순회를 다시 어렵게 만들기 전에 지운다(위 주석의 7건 사고).
            await deletePromotionByTitle(request, 'popups', popupTitle);
            await deletePromotionByTitle(request, 'banners', bannerTitle);
        }
    });
});
