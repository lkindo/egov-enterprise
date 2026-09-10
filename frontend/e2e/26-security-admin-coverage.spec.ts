import { randomBytes } from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { test, expect } from './fixtures/base-test';
import { getAdminBearerToken } from './utils/admin-token';

const AUTHORIZATION = '/api/v1/admin/authorization';
const USERS = '/api/v1/admin/system/users';
const MENUS = '/api/v1/admin/system/menus';
const PROGRAMS = '/api/v1/admin/system/programs';

type Headers = Record<string, string>;
type Grant = { type: 'OPERATION' | 'NAVIGATION'; code: string };
type Group = { code: string; name: string; description: string | null; grants: Grant[]; version: string; complete: boolean };
type Membership = { userId: string; groups: string[]; version: string; complete: boolean };
type CurrentUser = { id: string; esntlId: string; groups: string[]; permissions: string[]; authorizationVersion: string };

async function data<T>(response: APIResponse, label: string): Promise<T> {
    // Assert status only: response headers, credentials and login bodies are never diagnostic output.
    expect(response.status(), label).toBe(200);
    const envelope = await response.json() as { data: T };
    if (envelope.data === null || envelope.data === undefined) throw new Error(`${label}: response data is missing`);
    return envelope.data;
}

async function group(request: APIRequestContext, headers: Headers, code: string): Promise<Group> {
    const snapshot = await data<Group>(await request.get(`${AUTHORIZATION}/groups/${code}`, { headers }), '그룹 전체 조회');
    expect(snapshot.code).toBe(code);
    expect(snapshot.complete).toBe(true);
    expect(snapshot.version).toMatch(/^[a-f0-9]{64}$/);
    return snapshot;
}

async function membership(request: APIRequestContext, headers: Headers, userId: string): Promise<Membership> {
    const snapshot = await data<Membership>(await request.get(`${AUTHORIZATION}/users/${userId}/groups`, { headers }), '사용자 전체 배정 조회');
    expect(snapshot.userId).toBe(userId);
    expect(snapshot.complete).toBe(true);
    expect(snapshot.version).toMatch(/^[a-f0-9]{64}$/);
    return snapshot;
}

async function replaceGrants(request: APIRequestContext, headers: Headers, code: string, grants: Grant[]) {
    const before = await group(request, headers, code);
    const response = await request.put(`${AUTHORIZATION}/groups/${code}/grants`, {
        headers, data: { grants, version: before.version, complete: true },
    });
    expect(response.status(), '임시 그룹 기능권한 변경').toBe(200);
    return group(request, headers, code);
}

async function replaceGroups(request: APIRequestContext, headers: Headers, userId: string, groups: string[]) {
    const before = await membership(request, headers, userId);
    const response = await request.put(`${AUTHORIZATION}/users/${userId}/groups`, {
        headers, data: { groups, version: before.version, complete: true },
    });
    expect(response.status(), '임시 사용자 그룹 배정 변경').toBe(200);
    return membership(request, headers, userId);
}


type DepartmentMember = Membership & { loginId: string; userName: string };
type DepartmentSnapshot = { departmentId: string; users: DepartmentMember[]; version: string; complete: boolean };
const DEPT_API = '/api/v1/admin/system/departments';

async function departmentSnapshot(request: APIRequestContext, headers: Headers, departmentId: string) {
    const snapshot = await data<DepartmentSnapshot>(
        await request.get(`${AUTHORIZATION}/departments/${departmentId}/memberships`, { headers }), '부서 전체 배정 조회');
    expect(snapshot.departmentId).toBe(departmentId);
    expect(snapshot.complete).toBe(true);
    expect(snapshot.version).toMatch(/^[a-f0-9]{64}$/);
    for (const member of snapshot.users) {
        expect(member.complete).toBe(true);
        expect(member.version).toMatch(/^[a-f0-9]{64}$/);
    }
    return snapshot;
}

/** 전용 사용자와 부서에서 선택 사용자만 변경하고, 다른 그룹과 미선택 구성원의 배정을 보존한다. */
test.describe('Tier 26: 보안 관리 쓰기 경로', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('부서 그룹 추가·회수는 선택한 사용자에게만 적용하고 다른 그룹을 보존한다', async ({ page, playwright, baseURL }) => {
        if (!baseURL || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
            throw new Error('Department authorization fixtures require the isolated loopback E2E stack.');
        }
        // Own this context so a browser timeout cannot dispose the API before fixture cleanup.
        const request = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
        const auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
        const suffix = randomBytes(4).toString('hex');
        const departmentName = `E2E26 Dept ${suffix}`;
        const groupCode = `E2E26_${suffix.toUpperCase()}`;
        const userA = `e2e26_${suffix}a`;
        const userB = `e2e26_${suffix}b`;
        const createdUsers: string[] = [];
        let departmentId: string | undefined;
        let groupCreated = false;
        let primaryFailure: unknown;
        try {
            const department = await request.post(DEPT_API, { headers: auth, data: { ognzNm: departmentName } });
            departmentId = await data<string>(department, '전용 부서 생성');
            const createdGroup = await request.post(`${AUTHORIZATION}/groups`, {
                headers: auth, data: { code: groupCode, name: `E2E26 그룹 ${suffix}`, description: '부서 선택 배정 검증 전용' },
            });
            groupCreated = createdGroup.ok();
            expect(createdGroup.status(), '전용 그룹 생성').toBe(200);
            for (const [userId, userNm] of [[userA, '부서선택사용자'], [userB, '부서보존사용자']]) {
                const created = await request.post(USERS, {
                    headers: auth,
                    data: { userId, userNm, pswd: `Dept1!${randomBytes(16).toString('hex')}`, role: 'USER', ognzId: departmentId },
                });
                if (created.ok()) createdUsers.push(userId);
                expect(created.status(), '전용 부서 사용자 생성').toBe(200);
            }
            const before = await departmentSnapshot(request, auth, departmentId);
            expect(before.users.map(member => member.loginId).sort()).toEqual([userA, userB]);
            expect(before.users.every(member => member.groups.length === 1 && member.groups[0] === 'ROLE_USER')).toBe(true);
            const selected = before.users.find(member => member.loginId === userA);
            if (!selected) throw new Error('The selected fixture user is missing from its department.');

            const rejected = await request.put(`${AUTHORIZATION}/departments/${departmentId}/memberships`, {
                headers: auth,
                data: { userIds: [selected.userId], groupCode: `MISSING_${suffix}`, action: 'ADD', version: before.version, complete: true },
            });
            expect(rejected.status(), '존재하지 않는 그룹은 추가할 수 없음').toBe(404);
            expect(await departmentSnapshot(request, auth, departmentId)).toEqual(before);

            await page.goto('/admin/security/dept-authority');
            await expect(page).toHaveURL(/\/admin\/security\/dept-authority$/);
            await page.getByRole('textbox', { name: '부서 검색', exact: true }).fill(departmentName);
            await page.getByRole('region', { name: '부서 목록', exact: true }).getByRole('button', { name: departmentName, exact: true }).click();
            const editor = page.getByRole('region', { name: '부서 구성원 그룹 배정', exact: true });
            await expect(editor.getByRole('heading', { name: '전체 구성원 2명', exact: true })).toBeVisible();
            await expect(editor.getByRole('button', { name: '선택한 0명에게 적용', exact: true })).toBeDisabled();
            await expect(editor.getByText('선택한 사용자에게 지정한 그룹만 추가·회수합니다. 다른 그룹 배정은 유지됩니다.', { exact: true })).toBeVisible();
            await editor.getByRole('combobox', { name: '권한 그룹', exact: true }).selectOption(groupCode);
            await editor.getByRole('list', { name: '부서 전체 구성원', exact: true }).getByRole('listitem')
                .filter({ hasText: userA }).getByRole('checkbox').check();
            await editor.getByRole('button', { name: '선택한 1명에게 적용', exact: true }).click();
            const confirmation = page.getByRole('dialog', { name: '부서 사용자 그룹 변경', exact: true });
            await expect(confirmation.getByText(/다른 그룹은 유지됩니다/)).toBeVisible();
            const saved = page.waitForResponse(response => new URL(response.url()).pathname === `${AUTHORIZATION}/departments/${departmentId}/memberships`
                && response.request().method() === 'PUT');
            await confirmation.getByRole('button', { name: '확인', exact: true }).click();
            expect((await saved).status(), '선택 구성원 그룹 추가 UI 저장').toBe(200);
            const added = await departmentSnapshot(request, auth, departmentId);
            expect(added.users.find(member => member.loginId === userA)?.groups).toEqual([groupCode, 'ROLE_USER']);
            expect(added.users.find(member => member.loginId === userB)).toEqual(before.users.find(member => member.loginId === userB));
            expect(added.version).not.toBe(before.version);

            const stale = await request.put(`${AUTHORIZATION}/departments/${departmentId}/memberships`, {
                headers: auth,
                data: { userIds: [selected.userId], groupCode, action: 'REMOVE', version: before.version, complete: true },
            });
            expect(stale.status(), '오래된 부서 명부는 최신 배정을 덮어쓸 수 없음').toBe(409);
            expect(await departmentSnapshot(request, auth, departmentId)).toEqual(added);
            const removed = await request.put(`${AUTHORIZATION}/departments/${departmentId}/memberships`, {
                headers: auth,
                data: { userIds: [selected.userId], groupCode, action: 'REMOVE', version: added.version, complete: true },
            });
            expect(removed.status(), '선택 구성원 그룹 회수').toBe(200);
            const after = await departmentSnapshot(request, auth, departmentId);
            expect(after.users.find(member => member.loginId === userA)?.groups).toEqual(['ROLE_USER']);
            expect(after.users.find(member => member.loginId === userB)).toEqual(before.users.find(member => member.loginId === userB));
            await page.goto('/');
        } catch (error) {
            primaryFailure = error;
            throw error;
        } finally {
            const cleanupFailures: string[] = [];
            for (const userId of createdUsers) {
                try {
                    const removed = await request.delete(`${USERS}/${userId}`, { headers: auth });
                    if (removed.status() !== 200) cleanupFailures.push(`department fixture user cleanup status=${removed.status()}`);
                } catch { cleanupFailures.push('department fixture user cleanup request failed'); }
            }
            if (groupCreated) {
                try {
                    const snapshot = await group(request, auth, groupCode);
                    const removed = await request.delete(`${AUTHORIZATION}/groups/${groupCode}`, { headers: auth, params: { version: snapshot.version } });
                    if (removed.status() !== 200) cleanupFailures.push(`department fixture group cleanup status=${removed.status()}`);
                } catch { cleanupFailures.push('department fixture group cleanup request failed'); }
            }
            if (departmentId) {
                try {
                    const removed = await request.delete(`${DEPT_API}/${departmentId}`, { headers: auth });
                    if (removed.status() !== 200) cleanupFailures.push(`department fixture cleanup status=${removed.status()}`);
                } catch { cleanupFailures.push('department fixture cleanup request failed'); }
            }
            await request.dispose();
            if (cleanupFailures.length > 0) {
                const cleanupError = new Error(cleanupFailures.join('; '));
                if (primaryFailure !== undefined) throw new AggregateError([primaryFailure, cleanupError], 'Department authorization test and fixture cleanup failed');
                throw cleanupError;
            }
        }
    });

    test('로그인 보안 정책 화면이 정본 경로에서 살아 있다', async ({ page }) => {
        // ⚠ 이 단언의 핵심은 "리다이렉트되지 않는다" 이다. 2026-08-27 이전에는 next.config 의
        //   config redirect 가 이 경로를 삼켜 424줄 화면과 API 5개가 전 경로에서 도달 불가였고,
        //   메뉴 9020120 의 modern_route 가 이 경로를 정본으로 선언하는데도 그랬다.
        await page.goto('/admin/security/login-policy');
        await expect(page).toHaveURL(/\/admin\/security\/login-policy/, { timeout: 20000 });

        // 목록 화면의 조작 수단이 실제로 렌더돼야 한다 — 셸만 살아 있는 것으로는 부족하다.
        await expect(
            page.getByLabel('사용자 ID 또는 성명 검색'),
            '로그인 정책 화면에는 대상 사용자를 찾는 검색이 있어야 한다',
        ).toBeVisible({ timeout: 20000 });
        await expect(page.getByLabel('로그인 정책 목록 새로고침')).toBeVisible();

        // 정책 수정 진입점(사용자별)이 노출되는지 — 없으면 화면이 읽기 전용으로 죽은 것이다.
        //
        // ⚠ `count()` 는 **즉시 평가**라 목록이 아직 도착하지 않았으면 0 을 돌려준다. 검색창이
        //   보인다고 목록까지 온 것은 아니다 — 그 둘은 다른 시점이다. 2026-09-02 CI 에서 정확히
        //   이 이유로 red 가 났다(`getByLabel(검색)` 은 통과, 그 다음 `count()` 가 0).
        //   비동기 목록에는 `toBeVisible` 로 **기다리며** 단언해야 한다.
        const editButtons = page.getByRole('button', { name: /로그인 정책 수정$/ });
        await expect(
            editButtons.first(),
            '로그인 정책 대상 사용자가 최소 1명은 조회돼야 한다(목록이 비면 이 화면은 조작 불가다)',
        ).toBeVisible({ timeout: 20000 });
    });
});


test.describe('복수 권한 그룹의 실제 API와 편집 화면', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('그룹 합집합·부분/완전 회수·403·오래된 버전 409와 검색 중 전체 선택 보존', async ({ page, playwright, baseURL }) => {
        if (!baseURL || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
            throw new Error('Authorization fixtures require the isolated loopback E2E stack.');
        }
        const request = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
        const administrator = { Authorization: `Bearer ${getAdminBearerToken()}` };
        const suffix = randomBytes(4).toString('hex');
        const userId = `e2e_authz_${suffix}`;
        const password = `Authz1!${randomBytes(16).toString('hex')}`;
        const groupA = `E2E_AUTHZ_${suffix.toUpperCase()}_A`;
        const groupB = `E2E_AUTHZ_${suffix.toUpperCase()}_B`;
        const groupNameA = `E2E 권한 A ${suffix}`;
        const createdGroups: string[] = [];
        let userCreated = false;
        let primaryFailure: unknown;

        try {
            for (const [code, name] of [[groupA, groupNameA], [groupB, `E2E 권한 B ${suffix}`]]) {
                const response = await request.post(`${AUTHORIZATION}/groups`, {
                    headers: administrator, data: { code, name, description: '이 테스트에서만 사용하는 권한 그룹' },
                });
                if (response.ok()) createdGroups.push(code);
                expect(response.status(), '전용 그룹 생성').toBe(200);
            }
            const created = await request.post(USERS, {
                headers: administrator, data: { userId, pswd: password, userNm: 'E2E 권한 사용자', role: 'USER' },
            });
            userCreated = created.ok();
            expect(created.status(), '전용 사용자 생성').toBe(200);
            const login = await request.post('/api/v1/auth/login', { data: { userId, password } });
            expect(login.status(), '전용 사용자 로그인').toBe(200);
            const token: unknown = (await login.json())?.data?.accessToken;
            if (typeof token !== 'string' || token.length === 0) throw new Error('Fixture login did not return an access token.');
            const user = { Authorization: `Bearer ${token}` };
            const current = () => request.get('/api/v1/auth/me', { headers: user }).then(response => data<CurrentUser>(response, '현재 사용자 권한 조회'));
            const initial = await current();
            expect(initial.id).toBe(userId);
            expect(initial.groups).toEqual(['ROLE_USER']);
            const esntlId = initial.esntlId;
            if (!esntlId) throw new Error('Fixture user has no internal identifier.');

            const catalog = await data<{ navigation: { code: string }[] }>(
                await request.get(`${AUTHORIZATION}/catalog`, { headers: administrator }), '권한 카탈로그 조회');
            const menu = catalog.navigation[0]?.code;
            if (!menu) throw new Error('The migrated menu catalog is empty.');
            const grantsA: Grant[] = [{ type: 'OPERATION', code: 'MENU_READ' }, { type: 'NAVIGATION', code: menu }];
            const grantsB: Grant[] = [{ type: 'OPERATION', code: 'MENU_READ' }, { type: 'OPERATION', code: 'PROGRAM_READ' }];
            const beforeUi = await replaceGrants(request, administrator, groupA, grantsA);
            await replaceGrants(request, administrator, groupB, grantsB);

            await test.step('그룹 편집 UI는 검색 밖의 기존 기능권한과 메뉴 선택을 보존한다', async () => {
                await page.goto('/admin/security/authority');
                await expect(page.getByRole('heading', { name: '권한 그룹 관리', exact: true })).toBeVisible();
                await page.getByRole('textbox', { name: '그룹 검색', exact: true }).fill(groupA);
                await page.getByRole('region', { name: '권한 그룹 목록', exact: true }).getByRole('button').filter({ hasText: groupA }).click();
                const editor = page.getByRole('region', { name: `${groupNameA} 권한 설정`, exact: true });
                await expect(editor).toBeVisible();
                await editor.getByRole('textbox', { name: '기능 검색', exact: true }).fill('PROGRAM_READ');
                const program = editor.getByRole('row').filter({ has: page.getByText('PROGRAM_READ', { exact: true }) }).getByRole('checkbox');
                await expect(program).not.toBeChecked();
                await program.check();
                const saved = page.waitForResponse(response => new URL(response.url()).pathname === `${AUTHORIZATION}/groups/${groupA}/grants`
                    && response.request().method() === 'PUT');
                await editor.getByRole('button', { name: '권한 변경 저장', exact: true }).click();
                expect((await saved).status(), '그룹 편집 UI 저장').toBe(200);
                const afterUi = await group(request, administrator, groupA);
                expect(afterUi.grants).toEqual(expect.arrayContaining([...grantsA, { type: 'OPERATION', code: 'PROGRAM_READ' }]));
                expect(afterUi.grants).toHaveLength(3);

                const stale = await request.put(`${AUTHORIZATION}/groups/${groupA}/grants`, {
                    headers: administrator, data: { grants: [], version: beforeUi.version, complete: true },
                });
                expect(stale.status(), '오래된 그룹 버전은 다른 변경을 덮어쓸 수 없음').toBe(409);
                expect(await group(request, administrator, groupA)).toEqual(afterUi);
                await page.goto('/');
            });
            await replaceGrants(request, administrator, groupA, grantsA);

            const combined = await replaceGroups(request, administrator, esntlId, [groupA, groupB]);
            expect(combined.groups).toEqual([groupA, groupB]);
            const union = await current();
            expect(union.groups).toEqual([groupA, groupB]);
            expect(union.permissions).toEqual(['MENU_READ', 'PROGRAM_READ']);
            expect(union.authorizationVersion).not.toBe(initial.authorizationVersion);
            expect((await request.get(MENUS, { headers: user })).status()).toBe(200);
            expect((await request.get(PROGRAMS, { headers: user })).status()).toBe(200);
            expect((await request.get(`${AUTHORIZATION}/groups`, { headers: user })).status(), '업무 그룹은 권한관리 조회 불가').toBe(403);
            const protectedGroup = await group(request, administrator, groupA);
            expect((await request.put(`${AUTHORIZATION}/groups/${groupA}/grants`, {
                headers: user, data: { grants: [], version: protectedGroup.version, complete: true },
            })).status(), '업무 그룹은 권한관리 변경 불가').toBe(403);
            expect(await group(request, administrator, groupA)).toEqual(protectedGroup);

            // The same login token is reused throughout: every request must load current grants.
            await replaceGrants(request, administrator, groupB, [{ type: 'OPERATION', code: 'PROGRAM_READ' }]);
            expect((await current()).permissions).toEqual(['MENU_READ', 'PROGRAM_READ']);
            expect((await request.get(MENUS, { headers: user })).status(), 'A에 남은 공유 조회 권한 보존').toBe(200);
            const onlyB = await replaceGroups(request, administrator, esntlId, [groupB]);
            expect(onlyB.groups).toEqual([groupB]);
            expect((await current()).permissions).toEqual(['PROGRAM_READ']);
            expect((await request.get(MENUS, { headers: user })).status(), 'A 회수는 다음 요청부터 반영').toBe(403);
            expect((await request.get(PROGRAMS, { headers: user })).status(), '다른 그룹 B의 권한 보존').toBe(200);
            const staleMembership = await request.put(`${AUTHORIZATION}/users/${esntlId}/groups`, {
                headers: administrator, data: { groups: [], version: combined.version, complete: true },
            });
            expect(staleMembership.status(), '오래된 전체 배정은 현재 B를 지울 수 없음').toBe(409);
            expect(await membership(request, administrator, esntlId)).toEqual(onlyB);

            await replaceGroups(request, administrator, esntlId, []);
            const empty = await current();
            expect(empty.groups).toEqual([]);
            expect(empty.permissions).toEqual([]);
            expect((await request.get(PROGRAMS, { headers: user })).status(), '완전 회수 후 USER 권한이 암묵적으로 복구되지 않음').toBe(403);
        } catch (error) {
            primaryFailure = error;
            throw error;
        } finally {
            const cleanupFailures: string[] = [];
            if (userCreated) {
                try {
                    const removed = await request.delete(`${USERS}/${userId}`, { headers: administrator });
                    if (removed.status() !== 200) cleanupFailures.push(`fixture user cleanup status=${removed.status()}`);
                } catch { cleanupFailures.push('fixture user cleanup request failed'); }
            }
            for (const code of createdGroups) {
                try {
                    const snapshot = await group(request, administrator, code);
                    const removed = await request.delete(`${AUTHORIZATION}/groups/${code}`, {
                        headers: administrator, params: { version: snapshot.version },
                    });
                    if (removed.status() !== 200) cleanupFailures.push(`fixture group cleanup status=${removed.status()}`);
                } catch { cleanupFailures.push('fixture group cleanup request failed'); }
            }
            await request.dispose();
            if (cleanupFailures.length > 0) {
                const cleanupError = new Error(cleanupFailures.join('; '));
                if (primaryFailure !== undefined) throw new AggregateError([primaryFailure, cleanupError], 'Authorization test and fixture cleanup failed');
                throw cleanupError;
            }
        }
    });
});
