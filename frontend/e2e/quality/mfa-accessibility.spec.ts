import AxeBuilder from '@axe-core/playwright';
import { createHmac, randomBytes } from 'node:crypto';
import { Page } from '@playwright/test';
import { expect,test } from '../fixtures/browser-test';
import { SITE_IDENTITY } from '../../src/config/site-identity';

// Scope worker-level artifact options to this synthetic-secret workflow only.
// Console/HTTP assertions stay active; finally closes pages before DOM error-context capture.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

function fixtureTotp(secret: string, step: number): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bits = [...secret].map(character => alphabet.indexOf(character).toString(2).padStart(5, '0')).join('');
    const key = Buffer.from(bits.match(/.{8}/g)!.map(byte => Number.parseInt(byte, 2)));
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const digest = createHmac('sha1', key).update(counter).digest();
    const offset = digest[digest.length - 1]! & 15;
    return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}

async function openAnonymousLogin(page: Page, url: string) {
    // SSR heading/font checks can finish before hydration sends the session request.
    // Observe the expected 401 before teardown checks that its ledger was consumed.
    await Promise.all([
        page.waitForResponse(response =>
            new URL(response.url()).pathname === '/api/v1/auth/me'
            && response.request().method() === 'GET'
            && response.status() === 401),
        page.goto(url),
    ]);
    await expect(page).toHaveTitle(`로그인 | ${SITE_IDENTITY.frameworkName}`);
}

test.describe('실제 추가 인증과 키보드 접근성', () => {
    test('선택 등록부터 추가 인증 로그인까지 제한 쿠키·키보드·오류 초점을 검증한다', async ({ actorPage, adminRequest }) => {
        const userId = `e2e_mfa_${randomBytes(5).toString('hex')}`;
        const password = `Mfa1!${randomBytes(16).toString('hex')}`;
        const created = await adminRequest.post('/api/v1/admin/system/users', {
            data: { userId, pswd: password, userNm: 'E2E 인증 사용자', role: 'USER' },
        });
        expect(created.status(), '격리된 MFA 사용자 생성').toBe(200);
        const actor = await actorPage({ storageState: { cookies: [], origins: [] } });
        const { page, context, guard } = actor;
        guard.expectErrors([{
            id: 'E2E-MFA-LOGIN-ME-401',
            specScope: 'mfa-accessibility.spec.ts :: 선택 등록부터 추가 인증 로그인까지 제한 쿠키·키보드·오류 초점을 검증한다',
            channel: 'response', urlPattern: /\/api\/v1\/auth\/me(?:\?|$)/,
            messagePattern: null, method: 'GET', status: 401, minOccurrences: 1, maxOccurrences: 4,
            reason: '최초 비로그인 진입과 명시적 로그아웃 뒤의 세션 확인이다.', expiresAt: '2026-12-31',
        }]);
        // A failed secret-bearing fill must not copy its value into an assertion/call log.
        const fillSecret = async (label: string, value: string) => {
            try {
                const input = page.getByLabel(label, { exact: true });
                await input.waitFor({ state: 'visible' });
                // Avoid fill(value) call-log arguments as well as media snapshots.
                await input.evaluate((element, nextValue) => {
                    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
                    setter.call(element, nextValue);
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }, value);
            }
            catch { throw new Error(`민감 입력 컨트롤에 값을 입력하지 못했습니다: ${label}`); }
        };
        const login = async () => {
            await page.getByRole('textbox', { name: '아이디', exact: true }).fill(userId);
            await fillSecret('비밀번호', password);
            const [response] = await Promise.all([
                page.waitForResponse(candidate => new URL(candidate.url()).pathname === '/api/auth/login'
                    && candidate.request().method() === 'POST', { timeout: 20_000 }),
                page.getByRole('button', { name: /로그인/ }).click(),
            ]);
            expect(response.status(), '로그인 Route Handler 응답 상태').toBe(200);
            await response.finished();
        };
        try {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await openAnonymousLogin(page, '/login');
            await login();
            await expect(page.getByRole('button', { name: '사용자 계정 메뉴' })).toBeVisible();
            await page.getByRole('button', { name: '사용자 계정 메뉴' }).click();
            await page.getByRole('button', { name: '추가 인증 관리', exact: true }).click();
            await expect(page.getByText('인증앱을 아직 등록하지 않았습니다.')).toBeVisible();
            await fillSecret('현재 비밀번호', password);
            const started = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/mfa/enrollment/start'
                && response.request().method() === 'POST', { timeout: 20_000 });
            await page.getByRole('button', { name: '인증앱 등록', exact: true }).click();
            expect((await started).status(), '등록 시작 응답 상태').toBe(200);
            const key = page.getByLabel('인증앱 등록 키', { exact: true });
            await expect.poll(() => key.isVisible(), { message: '등록 키 표시' }).toBe(true);
            await expect(page, '일반 권한 폐기가 진행 중인 등록 모달을 제거하지 않는다').toHaveURL(/\/$/);
            const secret = (await key.textContent())?.trim() ?? '';
            expect(/^[A-Z2-7]{32}$/.test(secret), '등록 키의 형식').toBe(true);
            const enrollmentStep = Math.floor(Date.now() / 30_000);
            await fillSecret('인증앱 코드', fixtureTotp(secret, enrollmentStep));
            await page.getByRole('button', { name: '인증 확인' }).click();
            await expect.poll(() => page.getByRole('list', { name: '일회용 복구 코드' }).isVisible(), { message: '일회용 복구 코드 표시' }).toBe(true);
            expect(await page.getByRole('list', { name: '일회용 복구 코드' }).getByRole('listitem').count()).toBeGreaterThan(0);
            expect(await key.count(), '등록 완료 후 등록 키 제거').toBe(0);
            await page.getByRole('button', { name: '복구 코드를 보관했습니다' }).click();
            await expect(page.getByRole('button', { name: '사용자 계정 메뉴' })).toBeVisible();
            await page.getByRole('button', { name: '사용자 계정 메뉴' }).click();
            await page.getByRole('button', { name: '로그아웃', exact: true }).click();
            await expect(page).toHaveURL(/\/login/);
            await login();
            await expect(page.getByRole('heading', { name: '추가 인증', exact: true })).toBeFocused();
            const restricted = await context.cookies();
            expect(restricted.some(cookie => cookie.name === 'accessToken' || cookie.name === 'refreshToken')).toBe(false);
            // The response headers and MFA view can become observable just before Chromium's cookie
            // store catches up. Keep the immediate no-session assertion above, then wait only for the
            // restricted challenge to appear with the exact security attributes.
            await expect.poll(async () => {
                const challenge = (await context.cookies()).find(cookie => cookie.name === 'mfa_challenge');
                return challenge ? { httpOnly: challenge.httpOnly, sameSite: challenge.sameSite } : null;
            }, { message: '제한 MFA 쿠키와 보안 속성 반영', timeout: 10_000 }).toEqual({
                httpOnly: true,
                sameSite: 'Strict',
            });
            let verificationRequests = 0;
            page.on('request', request => { if (new URL(request.url()).pathname === '/api/auth/mfa/verify') verificationRequests += 1; });
            await page.keyboard.press('Tab');
            await expect(page.getByLabel('인증앱 코드', { exact: true })).toBeFocused();
            await page.keyboard.type('123');
            await page.keyboard.press('Enter');
            await expect(page.getByRole('region', { name: '추가 인증', exact: true }).getByRole('alert')).toContainText('6자리');
            await expect(page.getByLabel('인증앱 코드', { exact: true })).toBeFocused();
            expect(verificationRequests).toBe(0);
            const accessibility = await new AxeBuilder({ page }).include('main').analyze();
            expect(accessibility.violations.map(violation => violation.id)).toEqual([]);
            // Enrollment consumed its counter. Wait for a new real counter instead of weakening replay checks.
            while (Math.floor(Date.now() / 30_000) <= enrollmentStep) await new Promise(resolve => setTimeout(resolve, 250));
            await fillSecret('인증앱 코드', fixtureTotp(secret, Math.floor(Date.now() / 30_000)));
            await page.getByRole('button', { name: '인증 확인' }).click();
            await expect(page.getByRole('button', { name: '사용자 계정 메뉴' })).toBeVisible();
            const authenticated = await context.cookies();
            expect(authenticated.some(cookie => cookie.name === 'accessToken' && cookie.httpOnly)).toBe(true);
            expect(authenticated.some(cookie => cookie.name === 'mfa_challenge')).toBe(false);
        } finally {
            // Close before the failure reaches Playwright's DOM error-context recorder.
            await context.close();
            const removed = await adminRequest.delete(`/api/v1/admin/system/users/${userId}`);
            expect(removed.status(), '격리된 MFA 사용자 정리').toBe(200);
        }
    });
});
