import { APIRequestContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { expect,test } from '../fixtures/browser-test';
import { PromotionPage } from '../pages/PromotionPage';
import { screenDate } from '../helpers/screen-date';
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
        // [ADR-0036] 종전에는 Pageable 목록에 pageIndex·pageUnit 을 보내 무시돼 첫 10건만 훑었다(그 뒤의 E2E 잔존분이 쌓였다).
        //   1 기반 page·size(상한 100)로 마지막 페이지까지 모은 뒤 지운다 — 지우면서 넘기면 다음 페이지가 당겨져 건너뛴다.
        const rows: Array<Record<string, unknown>> = [];
        for (let page = 1, totalPage = 1; page <= totalPage; page++) {
            const listRes = await request.get(`${API_BASE}/admin/system/${kind}`, { headers, params: { page, size: 100 } });
            if (!listRes.ok())
                return;
            const body = await listRes.json();
            rows.push(...(body?.data?.list ?? []));
            totalPage = Number(body?.data?.totalPage ?? 1);
        }
        for (const row of rows) {
            // [2026-10-20] 팝업 제목 필드는 popupTtlNm 이다 — 종전의 popupNm 은 없는 이름이라 팝업을 한 건도 지우지 못했고,
            //   만든 팝업이 실행 끝(globalTeardown)까지 남아 다른 시험의 업무 홈에 떴다.
            const rowTitle = String(row?.popupTtlNm ?? row?.bnrNm ?? row?.title ?? '');
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
    test('팝업 크기는 입력 원문을 보존하고 직접 정정한 정수 문자열만 저장한다', async ({ adminPage, adminRequest }, testInfo) => {
        const title = `E2E Popup Input ${Date.now()}`;
        const endpoint = '/api/v1/admin/system/popups';
        const created = await adminRequest.post(endpoint, { data: {
            popupTtlNm: title, popupWdthPstn: '0', popupVrtcPstn: '0',
            popupWdthSz: '400', popupVrtcSz: '300',
            ntceBgnde: screenDate(), ntceEndde: screenDate(1), ntceYn: 'N', stopvewSetupYn: 'N',
        } });
        expect(created.status()).toBe(201);
        const id = (await created.json()).data as number;
        expect(id).toBeGreaterThan(0);
        let actionCount = 0;
        try {
            const before = await adminRequest.get(`${endpoint}/${id}`);
            expect(before.status()).toBe(200);
            const initial = (await before.json()).data;
            await adminPage.goto('/admin/system/banner');
            await adminPage.getByRole('button', { name: /팝업 설정/ }).click();
            await adminPage.getByRole('button', { name: `${title} 팝업 수정`, exact: true }).click();
            const dialog = adminPage.getByRole('dialog', { name: '팝업 아키텍처 수정', exact: true });
            const width = dialog.locator('input[name="popupWdthSz"]');
            const height = dialog.locator('input[name="popupVrtcSz"]');
            await expect(width).toHaveAttribute('type', 'text');
            await expect(width).toHaveAttribute('inputmode', 'numeric');
            adminPage.on('request', request => {
                if (request.method() === 'POST' && new URL(request.url()).pathname === '/admin/system/banner'
                    && request.headers()['next-action']) actionCount++;
            });
            for (const invalid of ['99', '4001', '0100', '1e3', '100 ', '100.5']) {
                await width.fill(invalid);
                await dialog.getByRole('button', { name: '자산 수정', exact: true }).click();
                await expect(width).toHaveAttribute('aria-invalid', 'true');
                await expect(width).toHaveValue(invalid);
                expect(actionCount, '잘못된 크기로 저장 action을 호출하지 않는다').toBe(0);
            }
            await width.fill('100');
            await height.fill('4001');
            await dialog.getByRole('button', { name: '자산 수정', exact: true }).click();
            await expect(height).toHaveAttribute('aria-invalid', 'true');
            expect(actionCount).toBe(0);
            const unchanged = await adminRequest.get(`${endpoint}/${id}`);
            expect(unchanged.status()).toBe(200);
            expect((await unchanged.json()).data).toMatchObject({ popupWdthSz: '400', popupVrtcSz: '300', version: initial.version });
            await testInfo.attach('popup-size-correction', { body: await dialog.screenshot(), contentType: 'image/png' });
            await height.fill('4000');
            const savedResponse = adminPage.waitForResponse(response => response.request().method() === 'POST'
                && new URL(response.url()).pathname === '/admin/system/banner'
                && !!response.request().headers()['next-action']);
            await dialog.getByRole('button', { name: '자산 수정', exact: true }).click();
            expect((await savedResponse).status()).toBe(200);
            await expect(dialog).toBeHidden();
            expect(actionCount).toBe(1);
            const stored = await adminRequest.get(`${endpoint}/${id}`);
            expect(stored.status()).toBe(200);
            expect((await stored.json()).data).toMatchObject({ popupWdthSz: '100', popupVrtcSz: '4000', ntceYn: 'N' });
            await adminPage.getByRole('button', { name: `${title} 팝업 수정`, exact: true }).click();
            await expect(width).toHaveValue('100');
            await expect(height).toHaveValue('4000');
        } finally {
            try {
                await adminPage.goto('about:blank');
            } finally {
                const cleanup = await adminRequest.delete(`${endpoint}/${id}`);
                expect(cleanup.status(), '이 시험이 만든 비게시 팝업만 정리한다').toBe(200);
            }
        }
    });

    test('Portal Promotion Flow (Admin Popup/Banner -> User Visibility)', async ({ adminPage, userPage, actorPage, request }) => {
        const popupTitle = `E2E Popup ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const bannerTitle = `E2E Banner ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const promo = new PromotionPage(adminPage);
        try {
            /*
              [2026-10-20] 공지 팝업은 이제 모달 대화상자다 — 떠 있는 동안 업무 홈의 다른 조작을 막는다. 같은 실행의 다른 시험(다른 worker)이
              업무 홈을 쓰므로, 팝업이 게시돼 있는 시간을 짧게 둔다: 배너를 먼저 만들고, 팝업은 만든 직후 사용자 화면에서 확인하고 곧바로 지운다.
            */
            await test.step('Admin: Configure Main Banner', async () => {
                console.log(`>>> Configuring banner: ${bannerTitle}`);
                await promo.gotoBannerPopupAdmin();
                await promo.createBanner(bannerTitle);
            });
            await test.step('Admin: Configure Layer Popup', async () => {
                console.log(`>>> Configuring popup: ${popupTitle}`);
                await promo.createPopup(popupTitle);
            });
            await test.step('User: Popup is an accessible dialog, a bottom sheet on a phone', async () => {
                const popupDialog = await openPopupDialog(userPage, popupTitle);
                // 모달 대화상자이고, 제목이 이름이며, 초점이 제목으로 들어온다.
                await expect(popupDialog).toHaveAttribute('aria-modal', 'true');
                await expect(popupDialog.getByRole('heading', { name: popupTitle })).toBeFocused();
                // 넓은 화면에서는 저장한 좌표·크기(100, 100, 400×400)를 그대로 쓴다 — 화면 안에 들어오는 값이다.
                const desktopBox = await popupDialog.getByTestId('notice-popup-panel').boundingBox();
                expect(desktopBox, '팝업 패널이 보인다').not.toBeNull();
                expect(Math.abs(desktopBox!.x - 100)).toBeLessThanOrEqual(1);
                expect(Math.abs(desktopBox!.width - 400)).toBeLessThanOrEqual(1);
                await userPage.keyboard.press('Escape');
                await expect(popupDialog).toBeHidden();

                // 휴대폰 폭에서는 저장 좌표·크기 대신 화면 아래쪽 시트로 보인다(넘치지 않는다).
                const phone = await actorPage({ storageState: 'playwright/.auth/user.json', viewport: { width: 390, height: 844 } });
                const phoneDialog = await openPopupDialog(phone.page, popupTitle);
                // 대화상자는 열릴 때 짧게 움직인다 — 자리 잡은 뒤의 위치를 잰다(허용치는 그대로 1px).
                await expect(async () => {
                    const sheet = await phoneDialog.getByTestId('notice-popup-panel').boundingBox();
                    const viewport = await phone.page.evaluate(() => ({ width: document.documentElement.clientWidth, height: window.innerHeight }));
                    expect(sheet, '휴대폰 시트가 보인다').not.toBeNull();
                    expect(Math.abs(sheet!.x)).toBeLessThanOrEqual(1);
                    expect(Math.abs(sheet!.width - viewport.width)).toBeLessThanOrEqual(1);
                    expect(Math.abs(sheet!.y + sheet!.height - viewport.height)).toBeLessThanOrEqual(1);
                }).toPass({ timeout: 5_000 });
                // 머리의 X 단추 이름도 '<제목> 닫기' 라 정확히 '닫기' 인 아래 단추를 누른다.
                await phoneDialog.getByRole('button', { name: '닫기', exact: true }).click();
                await expect(phoneDialog).toBeHidden();
            });
            // 확인했으면 바로 지운다 — 게시된 모달 팝업이 다른 시험의 업무 홈을 막지 않게 한다.
            await deletePromotionByTitle(request, 'popups', popupTitle);
            await test.step('User: Verify Banner Visibility', async () => {
                console.log(`>>> Verifying banner on Dashboard`);
                await userPage.goto('/');
                const bannerRegion = userPage.getByRole('region', { name: '홍보 배너', exact: true });
                // 이미지 다운로드를 기다리는 동안 자동 회전으로 검증 대상이 바뀌지 않게 한다.
                await bannerRegion.hover();
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
                // http로 시작하는 원본 파일명도 외부 URL이 아니라 업로드한 첨부의 blob으로 표시해야 한다.
                const bannerImage = bannerRegion.getByRole('img', { name: bannerTitle, exact: true });
                await expect(bannerImage).toBeVisible();
                await expect(bannerImage).toHaveAttribute('src', /^blob:/);
                await expect.poll(() => bannerImage.evaluate(image => (image as HTMLImageElement).naturalWidth), {
                    message: '첨부 배너 이미지가 실제로 디코딩되어야 한다',
                }).toBeGreaterThan(0);
                const bannerLink = bannerRegion.getByRole('link', { name: `${bannerTitle} 자세히 보기 새창 열림`, exact: true });
                await expect(bannerLink).toHaveAttribute('href', 'https://egovframe.go.kr');
                await expect(bannerLink).toHaveAttribute('target', '_blank');
                await expect(bannerLink).toHaveAttribute('rel', 'noopener noreferrer');
            });
        }
        finally {
            // 누적이 다음 실행의 캐러셀 순회를 다시 어렵게 만들기 전에 지운다(위 주석의 7건 사고). 팝업은 위에서 이미 지웠다면 아무것도 하지 않는다.
            await deletePromotionByTitle(request, 'popups', popupTitle);
            await deletePromotionByTitle(request, 'banners', bannerTitle);
        }
    });
});

/**
 * 업무 홈을 열고 그 제목의 공지 팝업 대화상자를 돌려준다. 공지는 한 번에 하나씩 순서대로 뜨므로, 앞선 다른 공지가 보이면 Esc 로 넘긴다.
 * 관리자가 만든 팝업이 사용자에게 실제로 보여야 한다(무조건 단언) — 보이지 않으면 생성이 조용히 실패했거나 노출 로직이 깨진 것이다.
 */
async function openPopupDialog(page: Page, title: string) {
    const target = page.getByRole('dialog', { name: title });
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.goto('/');
        for (let skipped = 0; skipped < 5; skipped++) {
            const shown = await page.getByRole('dialog').first()
                .waitFor({ state: 'visible', timeout: 5000 })
                .then(() => true)
                .catch(() => false);
            if (!shown || await target.isVisible()) break;
            await page.keyboard.press('Escape');
        }
        if (await target.isVisible()) return target;
        console.log(`>>> [Promotion] Popup not found (attempt ${attempt + 1}), reloading...`);
    }
    await expect(target).toBeVisible({ timeout: 10000 });
    return target;
}
