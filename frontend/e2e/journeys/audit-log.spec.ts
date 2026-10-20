import { randomBytes } from 'node:crypto';
import { request as playwrightRequest, type APIRequestContext, type APIResponse } from '@playwright/test';
import { expect, test as baseTest } from '../fixtures/browser-test';
import { createVisualAdmin } from '../fixtures/visual-admin';
import { getAdminBearerToken } from '../utils/admin-token';
import { anonymousCsrfRequestState } from '../fixtures/csrf';

/**
 * 관측 여정 — 알려진 행동을 하고, 그 행동이 남긴 기록 행을 화면에서 찾는다(2026-10-20).
 *
 * 종전 이 파일은 리다이렉트 화면(/admin/system/audit)에서 페이지 아무 곳의 날짜 문자열 하나만 확인했다. 기록이 실제로 남는지,
 * 화면이 그 기록을 조건으로 찾게 해 주는지는 보지 않았다. 이제 세 기록을 행동부터 따라간다.
 *
 * - 권한 없는 요청 → 실패 요청(시스템) 로그: 보안 필터가 거부한 요청은 핸들러가 없어 서비스 칸에 요청 경로가 남는다.
 *   경로에 이 실행만의 표지를 넣어 다른 실행의 행과 섞이지 않게 한다. 기록은 비동기 리스너가 쓰므로 API 로 도착을 기다린 뒤 화면을 연다.
 * - 사용자 상세 조회(개인정보 접근) → 개인정보 조회 기록과 민감 작업 감사 원장: 응답 준비 단계가 정보주체를 대상으로 남긴다.
 *   개인정보 조회 기록 화면은 정보주체 칸을 보이지 않으므로(API 도 싣지 않는다) 정보주체는 같은 준비 단계를 담은 감사 원장의
 *   '대상'으로 확인한다. 감사 원장 열람 권한(ADT_LOG_READ)은 기본 그룹에 없어, 이 테스트만의 그룹과 일회용 관리자를 쓴다.
 * - 감사 원장 내보내기 → 원장에 사유와 함께 남는다.
 *
 * 날짜·기간 조건을 쓰지 않는다 — 앱은 한국 시각, 러너는 UTC 라 자정 근처에 날짜 경계가 어긋난다. 일회용 계정은 브라우저 관찰이
 * 끝난 뒤(고정 장치 정리 순서) 지운다 — 열린 화면의 주체를 먼저 지우면 화면의 다음 요청이 실패로 잡힌다.
 */
const AUTHORIZATION = '/api/v1/admin/authorization';
type AuditActor = Awaited<ReturnType<typeof createVisualAdmin>>;
type Headers = Record<string, string>;

async function data<T>(response: APIResponse, label: string, expectedStatus = 200): Promise<T> {
    // 상태만 단언한다 — 응답 헤더·자격 증명·본문은 진단 출력에 싣지 않는다.
    expect(response.status(), label).toBe(expectedStatus);
    return (await response.json() as { data: T }).data;
}

function requireLoopback(baseURL: string | undefined): string {
    if (!baseURL || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
        throw new Error('Audit journey fixtures require the isolated loopback E2E stack.');
    }
    return baseURL;
}

async function deleteGroup(request: APIRequestContext, headers: Headers, code: string) {
    const snapshot = await data<{ version: string }>(await request.get(`${AUTHORIZATION}/groups/${code}`, { headers }), '감사 열람 그룹 조회');
    const removed = await request.delete(`${AUTHORIZATION}/groups/${code}`, { headers, params: { version: snapshot.version } });
    expect(removed.status(), '감사 열람 그룹 정리').toBe(200);
}

/**
 * 감사 원장을 읽는 일회용 관리자(ROLE_ADMIN + 이 테스트만의 ADT_LOG_READ 그룹)와 그가 상세를 열어 볼 정보주체.
 * 고정 장치는 actorPage 보다 먼저 준비되고 늦게 정리된다 — 브라우저 관찰을 끝낸 뒤 계정과 그룹을 지운다.
 */
const test = baseTest.extend<{ subject: AuditActor; auditor: AuditActor }>({
    subject: async ({ playwright, baseURL }, use) => {
        const fixtureRequest = await playwright.request.newContext({ baseURL: requireLoopback(baseURL), ...anonymousCsrfRequestState(requireLoopback(baseURL)) });
        try {
            const subject = await createVisualAdmin(fixtureRequest, baseURL!, { group: 'ROLE_USER' });
            try {
                await use(subject);
            } finally {
                await subject.dispose();
            }
        } finally {
            await fixtureRequest.dispose();
        }
    },
    auditor: async ({ playwright, baseURL }, use) => {
        const fixtureRequest = await playwright.request.newContext({ baseURL: requireLoopback(baseURL), ...anonymousCsrfRequestState(requireLoopback(baseURL)) });
        const administrator = { Authorization: `Bearer ${getAdminBearerToken()}` };
        const groupCode = `E2E_ADT_${randomBytes(4).toString('hex').toUpperCase()}`;
        let groupCreated = false;
        try {
            const created = await fixtureRequest.post(`${AUTHORIZATION}/groups`, {
                headers: administrator, data: { code: groupCode, name: `E2E 감사 원장 열람 ${groupCode}`, description: '감사 로그 여정 전용' },
            });
            groupCreated = created.ok();
            expect(created.status(), '감사 열람 그룹 생성').toBe(201);
            const group = await data<{ version: string }>(await fixtureRequest.get(`${AUTHORIZATION}/groups/${groupCode}`, { headers: administrator }), '감사 열람 그룹 조회');
            const granted = await fixtureRequest.put(`${AUTHORIZATION}/groups/${groupCode}/grants`, {
                headers: administrator,
                data: { grants: [{ type: 'OPERATION', code: 'ADT_LOG_READ' }], version: group.version, complete: true },
            });
            expect(granted.status(), '감사 열람 그룹 기능 권한').toBe(200);

            const auditor = await createVisualAdmin(fixtureRequest, baseURL!);
            try {
                const membershipUrl = `${AUTHORIZATION}/users/${auditor.esntlId}/groups`;
                const membership = await data<{ version: string; groups: string[] }>(
                    await fixtureRequest.get(membershipUrl, { headers: administrator }), '감사 열람 관리자 배정 조회');
                const assigned = await fixtureRequest.put(membershipUrl, {
                    headers: administrator, data: { groups: [...membership.groups, groupCode], version: membership.version, complete: true },
                });
                expect(assigned.status(), '감사 열람 관리자에게 그룹 배정').toBe(200);
                const me = await data<{ permissions: string[] }>(
                    await fixtureRequest.get('/api/v1/auth/me', { headers: auditor.authorization }), '감사 열람 관리자 권한 확인');
                expect(me.permissions).toContain('ADT_LOG_READ');
                await use(auditor);
            } finally {
                await auditor.dispose();
            }
        } finally {
            try {
                if (groupCreated) await deleteGroup(fixtureRequest, administrator, groupCode);
            } finally {
                await fixtureRequest.dispose();
            }
        }
    },
});

test.describe('관측 여정 — 행동이 남긴 기록을 찾는다', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('권한 없는 요청은 실패 요청(시스템) 로그에 그 경로와 응답 코드로 남는다', async ({ page, userRequest, adminRequest }) => {
        const marker = `E2EDENY${randomBytes(4).toString('hex').toUpperCase()}`;
        // 일반 사용자는 공통코드를 읽을 수 없다 — 보안 필터가 핸들러 전에 403 으로 거부하고, 그 요청 경로가 서비스 칸에 남는다.
        const denied = await userRequest.get(`/api/v1/admin/system/codes/cmmn/${marker}`);
        expect(denied.status(), '권한 없는 공통코드 조회').toBe(403);

        await expect.poll(async () => {
            const response = await adminRequest.get('/api/v1/admin/system/logs/system', { params: { searchKeyword: marker, page: 1, size: 10 } });
            if (response.status() !== 200) return -1;
            return Number((await response.json() as { data?: { total?: number } }).data?.total ?? 0);
        }, { message: '실패 요청 로그 도착', timeout: 30_000 }).toBeGreaterThanOrEqual(1);

        await page.goto('/admin/system/logs/system');
        const search = page.getByLabel('서비스 설명 · 요청ID');
        await search.fill(marker);
        await search.press('Enter');
        const row = page.getByRole('table', { name: '시스템 로그 목록' }).getByRole('row').filter({ hasText: marker }).first();
        await expect(row).toBeVisible({ timeout: 20_000 });
        await expect(row).toContainText(`/api/v1/admin/system/codes/cmmn/${marker}`);
        await expect(row).toContainText('403');
    });

    test('사용자 상세 조회는 개인정보 조회 기록과 감사 원장에 남고, 감사 원장을 조건으로 찾아 사유와 함께 내보낸다', async ({ subject, auditor, actorPage, baseURL }) => {
        // 개인정보 접근 — 일회용 관리자가 정보주체의 상세(연락처·주소·생년월일)를 연다.
        const apiRequest = await playwrightRequest.newContext({ baseURL, ...anonymousCsrfRequestState(baseURL) });
        try {
            const detail = await data<{ esntlId: string }>(
                await apiRequest.get(`/api/v1/admin/system/users/${subject.userId}`, { headers: auditor.authorization }), '정보주체 상세 조회');
            expect(detail.esntlId).toBe(subject.esntlId);
        } finally {
            await apiRequest.dispose();
        }

        const { page } = await actorPage({ storageState: auditor.storageState });

        await test.step('개인정보 조회 기록에 그 조회가 조회자와 함께 남는다', async () => {
            await page.goto('/admin/system/logs/privacy');
            // 표의 열 머리도 같은 이름이라 검색 입력란을 역할로 고른다.
            const search = page.getByRole('textbox', { name: '조회 대상 정보', exact: true });
            await search.fill('사용자 상세');
            await search.press('Enter');
            const row = page.getByRole('table', { name: '개인정보 접근 로그 목록' }).getByRole('row').filter({ hasText: auditor.userId });
            await expect(row.first()).toBeVisible({ timeout: 20_000 });
            await expect(row.first()).toContainText('사용자 상세');
        });

        await test.step('감사 원장을 행위자·작업 종류로 찾으면 응답 준비 단계가 정보주체를 대상으로 남아 있다', async () => {
            await page.goto('/admin/system/logs/audit');
            await expect(page.getByRole('heading', { name: '민감 작업 감사 원장', exact: true })).toBeVisible();
            const operation = page.getByLabel('작업 종류');
            await expect(operation.locator('option[value="UserApiController#getUser"]')).toHaveCount(1);
            await operation.selectOption('UserApiController#getUser');
            const actor = page.getByLabel('행위자 로그인 ID');
            await actor.fill(auditor.userId);
            await actor.press('Enter');
            const ledger = page.getByRole('table', { name: '민감 작업 감사 원장' });
            const prepared = ledger.getByRole('row').filter({ hasText: '응답 준비' }).filter({ hasText: subject.esntlId });
            await expect(prepared).toHaveCount(1, { timeout: 20_000 });
            await expect(prepared).toContainText(auditor.userId);
            await expect(prepared).toContainText('사용자 상세');
        });

        const reason = `E2E 월간 점검 ${randomBytes(3).toString('hex')}`;
        await test.step('같은 조건으로 사유를 적어 내보내면 파일을 받는다', async () => {
            await page.getByRole('button', { name: /전체 결과 내보내기/ }).click();
            const dialog = page.getByRole('dialog', { name: '감사 원장 내보내기' });
            await expect(dialog).toContainText('감사 원장에 남습니다');
            await dialog.getByLabel('내보내기 사유').fill(reason);
            const [download] = await Promise.all([
                page.waitForEvent('download'),
                dialog.getByRole('button', { name: '내보내기', exact: true }).click(),
            ]);
            expect(download.suggestedFilename()).toBe('audit-journal.xlsx');
        });

        await test.step('내보내기 자체가 사유와 함께 원장에 남는다', async () => {
            // 작업 종류 선택지는 화면을 열 때 읽는다 — 방금 생긴 작업 종류를 고르려면 다시 연다.
            await page.goto('/admin/system/logs/audit');
            const operation = page.getByLabel('작업 종류');
            await expect(operation.locator('option[value="AuditJournalApiController#exportAuditJournal"]')).toHaveCount(1);
            await operation.selectOption('AuditJournalApiController#exportAuditJournal');
            const actor = page.getByLabel('행위자 로그인 ID');
            await actor.fill(auditor.userId);
            await actor.press('Enter');
            const ledger = page.getByRole('table', { name: '민감 작업 감사 원장' });
            await expect(ledger.getByRole('row').filter({ hasText: `사유: ${reason}` }).first()).toBeVisible({ timeout: 20_000 });
        });
    });
});
