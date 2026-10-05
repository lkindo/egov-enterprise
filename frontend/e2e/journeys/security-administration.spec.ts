import { APIRequestContext,APIResponse,type Locator } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { expect,test } from '../fixtures/browser-test';
import { collectPageCoverage } from '../fixtures/page-observation';
import { getAdminBearerToken } from '../utils/admin-token';
/**
 * [2026-10-05 반박 리뷰 반영 — blocker 회귀 방지] 단추 중심의 맨 위 요소가 단추 자신(또는 그 안)인가. 창이 낮을 때(기본 뷰포트
 * 1280×720 포함) 권한 표 상자가 편집기 안에서 넘쳐 저장 막대를 덮으면 클릭이 표 칸에 떨어진다('td intercepts pointer events').
 * 클릭이 시간 초과로 끝나기 전에 무엇이 덮었는지 이름 붙여 말한다.
 */
async function expectUncovered(button: Locator, label: string) {
    await button.scrollIntoViewIfNeeded();
    await expect.poll(() => button.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return hit === null ? 'null' : element.contains(hit) ? 'button' : `${hit.tagName.toLowerCase()}${hit.id ? `#${hit.id}` : ''}`;
    }), label).toBe('button');
}
test.describe('사용자와 권한 관리', () => {
    test.describe('Admin System (Core Management)', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test.describe('Security & Authority Management', () => {
            const suffix = Math.random().toString(36).substring(7);
            const authCode = `ROLE_E2E_${suffix.toUpperCase()}`;
            const groupId = `GROUP_E2E_${suffix.toUpperCase()}`;
            test('권한 그룹·사용자 분류 그룹 등록과 퇴역 롤 경로 이동', async ({ securityAdminPage }) => {
                console.log('\n>>> Starting Security & Authority CRUD Flow');
                // 1. Authority Management
                await securityAdminPage.gotoAuthorities();
                await securityAdminPage.createAuthority(authCode, `E2E Auth ${suffix}`);
                // 2. Group Management
                await securityAdminPage.gotoGroups();
                await securityAdminPage.createGroup(groupId, `E2E Group ${suffix}`);
                // 3. Role Management
                await securityAdminPage.gotoRoles();
                console.log('>>> Security & Authority CRUD Completed');
            });
        });
    });
});
test.describe('권한 변경과 충돌 제어', () => {
    const AUTHORIZATION = '/api/v1/admin/authorization';
    const USERS = '/api/v1/admin/system/users';
    const MENUS = '/api/v1/admin/system/menus';
    // [2026-10-04 프로그램 목록 퇴역] 합집합·회수 탐침을 프로그램 목록 조회(PROGRAM_READ)에서 행정 코드 조회(ADMCODE_READ)로
    //   옮겼다. 둘 다 ROLE_USER 에 없는 단일 READ 권한 하나로만 열리는 조회다(권한 원장 defaultGroups: ADMIN·SYSTEM).
    const ADMCODES = '/api/v1/admin/system/codes/administ';
    type Headers = Record<string, string>;
    type Grant = {
        type: 'OPERATION' | 'NAVIGATION';
        code: string;
    };
    type Group = {
        code: string;
        name: string;
        description: string | null;
        grants: Grant[];
        version: string;
        complete: boolean;
    };
    type Membership = {
        userId: string;
        groups: string[];
        version: string;
        complete: boolean;
    };
    type CurrentUser = {
        id: string;
        esntlId: string;
        groups: string[];
        permissions: string[];
        authorizationVersion: string;
    };
    type Navigation = {
        code: string;
        name: string;
        parentCode: string | null;
        route?: string | null;
        useYn?: string;
    };
    type MenuNode = {
        id: number;
        children: MenuNode[];
    };
    async function data<T>(response: APIResponse, label: string): Promise<T> {
        // Assert status only: response headers, credentials and login bodies are never diagnostic output.
        expect(response.status(), label).toBe(200);
        const envelope = await response.json() as {
            data: T;
        };
        if (envelope.data === null || envelope.data === undefined)
            throw new Error(`${label}: response data is missing`);
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
    type DepartmentMember = Membership & {
        loginId: string;
        userName: string;
    };
    type DepartmentSnapshot = {
        departmentId: string;
        users: DepartmentMember[];
        version: string;
        complete: boolean;
    };
    const DEPT_API = '/api/v1/admin/system/departments';
    async function departmentSnapshot(request: APIRequestContext, headers: Headers, departmentId: string) {
        const snapshot = await data<DepartmentSnapshot>(await request.get(`${AUTHORIZATION}/departments/${departmentId}/memberships`, { headers }), '부서 전체 배정 조회');
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
    test.describe('보안 관리 쓰기 경로', () => {
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
                    if (created.ok())
                        createdUsers.push(userId);
                    expect(created.status(), '전용 부서 사용자 생성').toBe(200);
                }
                const before = await departmentSnapshot(request, auth, departmentId);
                expect(before.users.map(member => member.loginId).sort()).toEqual([userA, userB]);
                expect(before.users.every(member => member.groups.length === 1 && member.groups[0] === 'ROLE_USER')).toBe(true);
                const selected = before.users.find(member => member.loginId === userA);
                if (!selected)
                    throw new Error('The selected fixture user is missing from its department.');
                const rejected = await request.put(`${AUTHORIZATION}/departments/${departmentId}/memberships`, {
                    headers: auth,
                    data: { userIds: [selected.userId], groupCode: `MISSING_${suffix}`, action: 'ADD', version: before.version, complete: true },
                });
                expect(rejected.status(), '존재하지 않는 그룹은 추가할 수 없음').toBe(404);
                expect(await departmentSnapshot(request, auth, departmentId)).toEqual(before);
                await page.goto('/admin/security/dept-authority');
                await expect(page).toHaveURL(/\/admin\/security\/dept-authority$/);
                const departmentSearch = page.getByRole('textbox', { name: '부서 검색', exact: true });
                await departmentSearch.fill(departmentName);
                // [DIP C9] 검색어는 조회/Enter 로 적용한다.
                await departmentSearch.press('Enter');
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
            }
            catch (error) {
                primaryFailure = error;
                throw error;
            }
            finally {
                const cleanupFailures: string[] = [];
                for (const userId of createdUsers) {
                    try {
                        const removed = await request.delete(`${USERS}/${userId}`, { headers: auth });
                        if (removed.status() !== 200)
                            cleanupFailures.push(`department fixture user cleanup status=${removed.status()}`);
                    }
                    catch {
                        cleanupFailures.push('department fixture user cleanup request failed');
                    }
                }
                if (groupCreated) {
                    try {
                        const snapshot = await group(request, auth, groupCode);
                        const removed = await request.delete(`${AUTHORIZATION}/groups/${groupCode}`, { headers: auth, params: { version: snapshot.version } });
                        if (removed.status() !== 200)
                            cleanupFailures.push(`department fixture group cleanup status=${removed.status()}`);
                    }
                    catch {
                        cleanupFailures.push('department fixture group cleanup request failed');
                    }
                }
                if (departmentId) {
                    try {
                        const removed = await request.delete(`${DEPT_API}/${departmentId}`, { headers: auth });
                        if (removed.status() !== 200)
                            cleanupFailures.push(`department fixture cleanup status=${removed.status()}`);
                    }
                    catch {
                        cleanupFailures.push('department fixture cleanup request failed');
                    }
                }
                await request.dispose();
                if (cleanupFailures.length > 0) {
                    const cleanupError = new Error(cleanupFailures.join('; '));
                    if (primaryFailure !== undefined)
                        throw new AggregateError([primaryFailure, cleanupError], 'Department authorization test and fixture cleanup failed');
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
            await expect(page.getByLabel('사용자 ID 또는 성명 검색'), '로그인 정책 화면에는 대상 사용자를 찾는 검색이 있어야 한다').toBeVisible({ timeout: 20000 });
            await expect(page.getByLabel('로그인 정책 목록 새로고침')).toBeVisible();
            // 정책 수정 진입점(사용자별)이 노출되는지 — 없으면 화면이 읽기 전용으로 죽은 것이다.
            //
            // ⚠ `count()` 는 **즉시 평가**라 목록이 아직 도착하지 않았으면 0 을 돌려준다. 검색창이
            //   보인다고 목록까지 온 것은 아니다 — 그 둘은 다른 시점이다. 2026-09-02 CI 에서 정확히
            //   이 이유로 red 가 났다(`getByLabel(검색)` 은 통과, 그 다음 `count()` 가 0).
            //   비동기 목록에는 `toBeVisible` 로 **기다리며** 단언해야 한다.
            const editButtons = page.getByRole('button', { name: /로그인 정책 수정$/ });
            await expect(editButtons.first(), '로그인 정책 대상 사용자가 최소 1명은 조회돼야 한다(목록이 비면 이 화면은 조작 불가다)').toBeVisible({ timeout: 20000 });
        });
    });
    test.describe('복수 권한 그룹의 실제 API와 편집 화면', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test('그룹 합집합·부분/완전 회수·403·오래된 버전 409와 검색 중 전체 선택 보존', async ({ page, actorPage, playwright, baseURL }) => {
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
                    if (response.ok())
                        createdGroups.push(code);
                    expect(response.status(), '전용 그룹 생성').toBe(200);
                }
                const created = await request.post(USERS, {
                    headers: administrator, data: { userId, pswd: password, userNm: 'E2E 권한 사용자', role: 'USER' },
                });
                userCreated = created.ok();
                expect(created.status(), '전용 사용자 생성').toBe(200);
                // Keep the BFF's login cookie out of the context that alternates explicit bearer subjects.
                const loginRequest = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
                let token: string | undefined;
                try {
                    const login = await loginRequest.post('/api/v1/auth/login', { data: { userId, password } });
                    expect(login.status(), '전용 사용자 로그인').toBe(200);
                    token = (login.headers()['set-cookie'] ?? '').split('\n')
                        .map(line => /^accessToken=([^;]+)/.exec(line.trim())?.[1]).find(Boolean);
                } finally {
                    await loginRequest.dispose();
                }
                if (!token)
                    throw new Error('Fixture login did not set an access cookie.');
                const user = { Authorization: `Bearer ${token}` };
                const current = () => request.get('/api/v1/auth/me', { headers: user }).then(response => data<CurrentUser>(response, '현재 사용자 권한 조회'));
                const initial = await current();
                expect(initial.id).toBe(userId);
                expect(initial.groups).toEqual(['ROLE_USER']);
                const esntlId = initial.esntlId;
                if (!esntlId)
                    throw new Error('Fixture user has no internal identifier.');
                const catalog = await data<{
                    navigation: Navigation[];
                }>(await request.get(`${AUTHORIZATION}/catalog`, { headers: administrator }), '권한 카탈로그 조회');
                const menu = catalog.navigation.find(entry => entry.parentCode === null)?.code;
                if (!menu)
                    throw new Error('The migrated menu catalog is empty.');
                const grantsA: Grant[] = [{ type: 'OPERATION', code: 'MENU_READ' }, { type: 'NAVIGATION', code: menu }];
                const grantsB: Grant[] = [{ type: 'OPERATION', code: 'MENU_READ' }, { type: 'OPERATION', code: 'ADMCODE_READ' }];
                const beforeUi = await replaceGrants(request, administrator, groupA, grantsA);
                await replaceGrants(request, administrator, groupB, grantsB);
                await test.step('그룹 편집 UI는 검색 밖의 기존 기능권한과 메뉴 선택을 보존한다', async () => {
                    // 앱 안에서 들어와야 Back 이 같은 문서 안의 이동이 된다(미저장 확인은 앱 라우터 이동을 가로챈다).
                    await page.goto('/admin');
                    await page.getByRole('main').getByRole('link', { name: '권한 그룹 관리', exact: true }).click();
                    await expect(page).toHaveURL(/\/admin\/security\/authority$/);
                    await expect(page.getByRole('heading', { name: '권한 그룹 관리', exact: true })).toBeVisible();
                    // [2026-10-05] 처음 들어오면 첫 그룹의 작업대가 바로 열린다 — 그룹을 고르기 전에도 화면별 권한 표가 보인다.
                    const firstEditor = page.getByRole('region', { name: /권한 설정$/ });
                    await expect(firstEditor).toBeVisible();
                    await expect(firstEditor.getByRole('group', { name: '화면별 권한 선택', exact: true })).toBeVisible();
                    await page.getByRole('textbox', { name: '그룹 검색', exact: true }).fill(groupA);
                    await page.getByRole('region', { name: '권한 그룹 목록', exact: true }).getByRole('button').filter({ hasText: groupA }).click();
                    const editor = page.getByRole('region', { name: `${groupNameA} 권한 설정`, exact: true });
                    await expect(editor).toBeVisible();
                    // [2026-10-02 2단계] 기본 탭은 '화면별 권한'(메뉴 트리 × 메뉴 표시·화면 진입·등록·수정·삭제·그 밖의 기능)이다.
                    // 기능권한을 영역 × 행위로 보려면 '기능별 권한' 탭을 연다. 칸의 이름은 '영역 × 행위 (코드)'다.
                    await expect(editor.getByRole('tab', { name: /^화면별 권한/ })).toHaveAttribute('aria-selected', 'true');
                    await editor.getByRole('tab', { name: /^기능별 권한/ }).click();
                    await editor.getByRole('textbox', { name: '기능 검색', exact: true }).fill('ADMCODE_READ');
                    const admcode = editor.getByRole('checkbox', { name: /\(ADMCODE_READ\)$/ });
                    await expect(admcode).not.toBeChecked();
                    await admcode.check();
                    // 탭 전환은 화면 안 상태라 이탈 확인 없이 편집을 유지하고 URL 도 바꾸지 않는다.
                    // Back/다른 화면 이동을 취소하면 같은 편집기와 선택이 남아야 한다.
                    await editor.getByRole('tab', { name: /^화면별 권한/ }).click();
                    await expect(editor.getByRole('group', { name: '화면별 권한 선택', exact: true })).toBeVisible();
                    await expect(page).toHaveURL(/\/admin\/security\/authority$/);
                    await expect(page.getByRole('dialog', { name: '저장하지 않은 변경' })).toHaveCount(0);
                    await page.evaluate(() => history.back());
                    const discard = page.getByRole('dialog', { name: '저장하지 않은 변경' });
                    await expect(discard).toBeVisible();
                    await discard.getByRole('button', { name: '계속 편집', exact: true }).click();
                    await expect(page).toHaveURL(/\/admin\/security\/authority$/);
                    await expect(editor.getByRole('tab', { name: /^화면별 권한/ })).toHaveAttribute('aria-selected', 'true');
                    await editor.getByRole('tab', { name: /^기능별 권한/ }).click();
                    await expect(admcode).toBeChecked();
                    await page.getByRole('link', { name: '통합 검색', exact: true }).click();
                    await expect(discard).toBeVisible();
                    await discard.getByRole('button', { name: '계속 편집', exact: true }).click();
                    await expect(admcode).toBeChecked();
                    const saved = page.waitForResponse(response => new URL(response.url()).pathname === `${AUTHORIZATION}/groups/${groupA}/grants`
                        && response.request().method() === 'PUT');
                    await expectUncovered(editor.getByRole('button', { name: '권한 변경 저장', exact: true }), '기능별 권한 탭의 저장 단추를 표 상자가 덮지 않는다');
                    await editor.getByRole('button', { name: '권한 변경 저장', exact: true }).click();
                    expect((await saved).status(), '그룹 편집 UI 저장').toBe(200);
                    const afterUi = await group(request, administrator, groupA);
                    expect(afterUi.grants).toEqual(expect.arrayContaining([...grantsA, { type: 'OPERATION', code: 'ADMCODE_READ' }]));
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
                expect(union.permissions).toEqual(['ADMCODE_READ', 'MENU_READ']);
                expect(union.authorizationVersion).not.toBe(initial.authorizationVersion);
                expect((await request.get(MENUS, { headers: user })).status()).toBe(200);
                expect((await request.get(ADMCODES, { headers: user })).status()).toBe(200);
                expect((await request.get(`${AUTHORIZATION}/groups`, { headers: user })).status(), '업무 그룹은 권한관리 조회 불가').toBe(403);
                const protectedGroup = await group(request, administrator, groupA);
                expect((await request.put(`${AUTHORIZATION}/groups/${groupA}/grants`, {
                    headers: user, data: { grants: [], version: protectedGroup.version, complete: true },
                })).status(), '업무 그룹은 권한관리 변경 불가').toBe(403);
                expect(await group(request, administrator, groupA)).toEqual(protectedGroup);
                await test.step('메뉴 계층 회수는 하위 표시까지 제거하고 기능 권한과 직접 URL 인가는 별도로 유지한다', async () => {
                    const visible = await data<{
                        list: MenuNode[];
                    }>(await request.get('/api/v1/menus/head', { headers: administrator }), '관리자 메뉴 트리 조회');
                    const visibleRoot = visible.list.find(entry => entry.children.length > 0);
                    if (!visibleRoot)
                        throw new Error('A visible parent and child are required for the hierarchy fixture.');
                    const visibleChild = visibleRoot.children[0];
                    const leaf = visibleChild.children[0] ?? visibleChild;
                    const rootMenu = catalog.navigation.find(entry => entry.code === String(visibleRoot.id));
                    if (!rootMenu)
                        throw new Error('Visible root is missing from the complete navigation catalog.');
                    await replaceGrants(request, administrator, groupA, [{ type: 'OPERATION', code: 'MENU_READ' }]);
                    await page.goto('/admin/security/authority');
                    await page.getByRole('textbox', { name: '그룹 검색', exact: true }).fill(groupA);
                    await page.getByRole('region', { name: '권한 그룹 목록', exact: true }).getByRole('button').filter({ hasText: groupA }).click();
                    const editor = page.getByRole('region', { name: `${groupNameA} 권한 설정`, exact: true });
                    // [2026-10-02 2단계] 메뉴 표시는 '화면별 권한' 표의 '메뉴 표시' 칸이다. 칸 이름은 '메뉴 × 메뉴 표시 (메뉴 번호)'다.
                    const screensTab = editor.getByRole('tab', { name: /^화면별 권한/ });
                    await screensTab.click();
                    const table = editor.getByRole('group', { name: '화면별 권한 선택', exact: true });
                    const menuCellName = (id: number) => new RegExp(` × 메뉴 표시 \\(${id}\\)$`);
                    const menuCell = (id: number) => table.getByRole('checkbox', { name: menuCellName(id) });
                    // filter({ has }) 의 내부 locator 는 그 줄 안에서 상대로 찾는다 — 편집기·표부터 시작하는 locator 를 넣으면 어떤 줄도 맞지 않는다.
                    const rowOf = (id: number) => table.getByRole('row').filter({ has: page.getByRole('checkbox', { name: menuCellName(id) }) });
                    const rootCheckbox = menuCell(visibleRoot.id);
                    const leafCheckbox = menuCell(leaf.id);
                    // 처음에는 영역만 펼친다 — 3단계 화면은 그 섹션을 펼쳐야 보인다(진입 권한 문제가 있는 섹션은 펼친 채 시작한다).
                    if (leaf !== visibleChild) {
                        const sectionToggle = rowOf(visibleChild.id).getByRole('button', { name: /하위 메뉴 (펼치기|접기)$/ });
                        if (await sectionToggle.getAttribute('aria-expanded') === 'false')
                            await sectionToggle.click();
                    }
                    // [2026-10-05 사용자 승인] 영역·섹션 줄의 메뉴 표시 칸은 그 아래 메뉴의 집계이고, 누르면 아래 메뉴 전체를 켜고 끈다.
                    // 그래서 상위 줄의 상태는 켜짐(true)·일부(mixed)·꺼짐(false) 가운데 하나로 본다(aria-checked).
                    await expect(rootCheckbox).toHaveAttribute('aria-checked', 'false');
                    await leafCheckbox.check();
                    await expect(rootCheckbox, '하위 선택은 필요한 모든 상위 선택을 함께 추가한다').not.toHaveAttribute('aria-checked', 'false');
                    await expect(menuCell(visibleChild.id)).not.toHaveAttribute('aria-checked', 'false');
                    const rootRow = rowOf(visibleRoot.id);
                    await rootRow.getByRole('button', { name: `${rootMenu.name} 하위 메뉴 접기`, exact: true }).click();
                    await expect(rootRow.getByRole('button', { name: `${rootMenu.name} 하위 메뉴 펼치기`, exact: true })).toHaveAttribute('aria-expanded', 'false');
                    // 일부만 켜진 영역 줄은 한 번 누르면 아래 전체를 켜고, 다시 누르면 아래 전체를 끈다.
                    if (await rootCheckbox.getAttribute('aria-checked') !== 'true')
                        await rootCheckbox.click();
                    await expect(rootCheckbox).toHaveAttribute('aria-checked', 'true');
                    await rootCheckbox.click();
                    await expect(rootCheckbox).toHaveAttribute('aria-checked', 'false');
                    await rootRow.getByRole('button', { name: `${rootMenu.name} 하위 메뉴 펼치기`, exact: true }).click();
                    await expect(leafCheckbox, '접혀 있던 하위 선택도 부모와 함께 회수된다').not.toBeChecked();
                    // Leave a leaf (and so its ancestors) selected and then revoke it so the persisted change is observable.
                    await leafCheckbox.check();
                    const saveSelected = page.waitForResponse(response => new URL(response.url()).pathname === `${AUTHORIZATION}/groups/${groupA}/grants` && response.request().method() === 'PUT');
                    await expectUncovered(editor.getByRole('button', { name: '권한 변경 저장', exact: true }), '화면별 권한 탭의 저장 단추를 표 상자가 덮지 않는다');
                    await editor.getByRole('button', { name: '권한 변경 저장', exact: true }).click();
                    expect((await saveSelected).status()).toBe(200);
                    const withNavigation = (await group(request, administrator, groupA)).grants.filter(grant => grant.type === 'NAVIGATION').map(grant => grant.code);
                    expect(withNavigation, '하위만 켜도 모든 상위가 명시적으로 저장된다').toEqual(expect.arrayContaining([String(visibleRoot.id), String(visibleChild.id), String(leaf.id)]));
                    // [A2] 저장 뒤에도 잠기지 않는다 — 응답 스냅샷이 새 기준선이라 '최신 정보 적용' 없이 이어서 편집한다.
                    await expect(screensTab).toHaveAttribute('aria-selected', 'true');
                    await expect(rootCheckbox).not.toHaveAttribute('aria-checked', 'false');
                    await expect(rootCheckbox).toBeEnabled();
                    if (await rootCheckbox.getAttribute('aria-checked') !== 'true')
                        await rootCheckbox.click();
                    await rootCheckbox.click();
                    await expect(rootCheckbox).toHaveAttribute('aria-checked', 'false');
                    const saveRevoked = page.waitForResponse(response => new URL(response.url()).pathname === `${AUTHORIZATION}/groups/${groupA}/grants` && response.request().method() === 'PUT');
                    await editor.getByRole('button', { name: '권한 변경 저장', exact: true }).click();
                    expect((await saveRevoked).status()).toBe(200);
                    const withoutNavigation = await group(request, administrator, groupA);
                    expect(withoutNavigation.grants).toEqual([{ type: 'OPERATION', code: 'MENU_READ' }]);
                    expect((await data<{
                        list: MenuNode[];
                    }>(await request.get('/api/v1/menus/head', { headers: user }), '회수 후 메뉴 조회')).list).toEqual([]);
                    expect((await data<{
                        list: MenuNode[];
                    }>(await request.get('/api/v1/menus/left', { headers: user, params: { menuNo: visibleRoot.id } }), '숨긴 상위의 하위 메뉴 직접 조회')).list).toEqual([]);
                    expect((await request.get(MENUS, { headers: user })).status(), '메뉴 표시 회수는 기능권한을 회수하지 않는다').toBe(200);
                    const directPage = await request.get('/admin/system/menus', { headers: { Cookie: `accessToken=${token}` }, maxRedirects: 0 });
                    expect(directPage.status(), '기능권한 보유자는 메뉴를 숨겨도 등록 화면 URL에 접근할 수 있다').toBe(200);
                    const orphan = await request.put(`${AUTHORIZATION}/groups/${groupA}/grants`, {
                        headers: administrator, data: { grants: [...withoutNavigation.grants, { type: 'NAVIGATION', code: String(leaf.id) }], version: withoutNavigation.version, complete: true },
                    });
                    expect(orphan.status(), '상위 없이 하위만 부여하는 직접 API 요청은 거절한다').toBe(400);
                    expect(await group(request, administrator, groupA)).toEqual(withoutNavigation);
                    await replaceGrants(request, administrator, groupA, grantsA);
                    await page.goto('/');
                });
                await test.step('투표 관리는 두 조회 권한을 모두 요구하고 등록 권한을 별도로 검사한다', async () => {
                    const routes = ['/admin/survey/polls', '/admin/survey/polls/manage'];
                    for (const permissions of [['POLL_READ'], ['POLL_READ_ALL'], ['POLL_CREATE']]) {
                        await replaceGrants(request, administrator, groupA,
                            permissions.map(code => ({ type: 'OPERATION', code })));
                        for (const route of routes) {
                            const denied = await request.get(route, { headers: { Cookie: `accessToken=${token}` }, maxRedirects: 0 });
                            expect(denied.status(), `${permissions.join('+')}만으로 관리 화면 진입 불가`).toBe(307);
                            expect(new URL(denied.headers().location, baseURL).searchParams.get('auth_error')).toBe('unauthorized');
                        }
                        const directWrite = await request.post('/api/v1/polls', {
                            headers: user,
                            data: { pollNm: `E2E AND ${suffix}`, pollBgngYmd: '20990101', pollEndYmd: '20990102',
                                pollKndCd: 'POLL01', pollDsuseYn: 'N', pollArticles: [{ pollArtclNm: 'A' }, { pollArtclNm: 'B' }] },
                        });
                        expect(directWrite.status(), '조회 권한이나 등록 권한 일부만 가진 직접 쓰기도 거부').toBe(403);
                    }
                    const reads: Grant[] = ['POLL_READ', 'POLL_READ_ALL'].map(code => ({ type: 'OPERATION', code }));
                    await replaceGrants(request, administrator, groupA, reads);
                    const actor = await actorPage({ storageState: { cookies: [], origins: [] } });
                    try {
                        await actor.context.addCookies([{ name: 'accessToken', value: token, url: baseURL, httpOnly: true, sameSite: 'Strict' }]);
                        await actor.page.goto(routes[0]);
                        await expect(actor.page.getByRole('heading', { name: '온라인 투표 관리', exact: true })).toBeVisible();
                        await expect(actor.page.getByRole('button', { name: '알림', exact: true })).toHaveCount(0);
                        await expect(actor.page.getByRole('button', { name: '신규 설문 등록', exact: true })).toHaveCount(0);
                        await replaceGrants(request, administrator, groupA, [...reads, { type: 'OPERATION', code: 'POLL_CREATE' }]);
                        await actor.page.reload();
                        await actor.page.getByRole('button', { name: '신규 설문 등록', exact: true }).click();
                        await expect(actor.page.getByRole('dialog', { name: '신규 설문 등록', exact: true })).toBeVisible();
                        await actor.page.keyboard.press('Escape');
                        await actor.page.goto('/');
                        await expect(actor.page.getByRole('heading', { name: '업무 홈', exact: true })).toBeVisible();
                        await expect(actor.page.getByRole('status').filter({
                            hasText: '업무 홈 대시보드에 접근할 권한이 없습니다.',
                        })).toBeVisible();
                    } finally {
                        // Observe the live page before its synthetic user is revoked/deleted.
                        // The fixture still verifies every recorded browser error at teardown.
                        try { await collectPageCoverage(actor.page); }
                        finally { await actor.context.close(); }
                    }
                    await replaceGrants(request, administrator, groupA, grantsA);
                });
                // The same login token is reused throughout: every request must load current grants.
                await replaceGrants(request, administrator, groupB, [{ type: 'OPERATION', code: 'ADMCODE_READ' }]);
                expect((await current()).permissions).toEqual(['ADMCODE_READ', 'MENU_READ']);
                expect((await request.get(MENUS, { headers: user })).status(), 'A에 남은 공유 조회 권한 보존').toBe(200);
                const onlyB = await replaceGroups(request, administrator, esntlId, [groupB]);
                expect(onlyB.groups).toEqual([groupB]);
                expect((await current()).permissions).toEqual(['ADMCODE_READ']);
                expect((await request.get(MENUS, { headers: user })).status(), 'A 회수는 다음 요청부터 반영').toBe(403);
                const revokedPage = await request.get('/admin/system/menus', { headers: { Cookie: `accessToken=${token}` }, maxRedirects: 0 });
                expect(revokedPage.status(), '기능권한 회수 후 같은 토큰으로 직접 URL 진입도 거절한다').toBe(307);
                expect(new URL(revokedPage.headers().location, baseURL).searchParams.get('auth_error')).toBe('unauthorized');
                expect((await request.get(ADMCODES, { headers: user })).status(), '다른 그룹 B의 권한 보존').toBe(200);
                const staleMembership = await request.put(`${AUTHORIZATION}/users/${esntlId}/groups`, {
                    headers: administrator, data: { groups: [], version: combined.version, complete: true },
                });
                expect(staleMembership.status(), '오래된 전체 배정은 현재 B를 지울 수 없음').toBe(409);
                expect(await membership(request, administrator, esntlId)).toEqual(onlyB);
                await replaceGroups(request, administrator, esntlId, []);
                const empty = await current();
                expect(empty.groups).toEqual([]);
                expect(empty.permissions).toEqual([]);
                expect((await request.get(ADMCODES, { headers: user })).status(), '완전 회수 후 USER 권한이 암묵적으로 복구되지 않음').toBe(403);
            }
            catch (error) {
                primaryFailure = error;
                throw error;
            }
            finally {
                const cleanupFailures: string[] = [];
                if (userCreated) {
                    try {
                        const removed = await request.delete(`${USERS}/${userId}`, { headers: administrator });
                        if (removed.status() !== 200)
                            cleanupFailures.push(`fixture user cleanup status=${removed.status()}`);
                    }
                    catch {
                        cleanupFailures.push('fixture user cleanup request failed');
                    }
                }
                for (const code of createdGroups) {
                    try {
                        const snapshot = await group(request, administrator, code);
                        const removed = await request.delete(`${AUTHORIZATION}/groups/${code}`, {
                            headers: administrator, params: { version: snapshot.version },
                        });
                        if (removed.status() !== 200)
                            cleanupFailures.push(`fixture group cleanup status=${removed.status()}`);
                    }
                    catch {
                        cleanupFailures.push('fixture group cleanup request failed');
                    }
                }
                await request.dispose();
                if (cleanupFailures.length > 0) {
                    const cleanupError = new Error(cleanupFailures.join('; '));
                    if (primaryFailure !== undefined)
                        throw new AggregateError([primaryFailure, cleanupError], 'Authorization test and fixture cleanup failed');
                    throw cleanupError;
                }
            }
        });
    });
    /**
     * [2026-10-02 2단계 D6·A6] 그룹 쪽에서 구성원을 한꺼번에 추가·회수하고, 그룹을 복제한다. 구성원 변경은 그룹 버전을 바꾸지
     * 않으므로 열려 있던 권한 초안이 그대로 저장된다(S1). 정리는 ROLE_E2E_ 코드 그룹을 구성원 해제 뒤 지운다.
     */
    test.describe('그룹 구성원 일괄 변경과 그룹 복제', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        type UserChoice = {
            id: string;
            userId: string;
            userNm: string;
        };
        type Change = {
            group: string | null;
            reason: string | null;
        };
        test('구성원 추가·회수는 권한 초안을 흔들지 않고, 복제한 그룹은 원본 권한과 사유를 남긴다', async ({ page, playwright, baseURL }) => {
            if (!baseURL || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
                throw new Error('Authorization fixtures require the isolated loopback E2E stack.');
            }
            const request = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
            const auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
            const suffix = randomBytes(4).toString('hex').toUpperCase();
            const groupCode = `ROLE_E2E_${suffix}`;
            const copyCode = `ROLE_E2E_${suffix}_C`;
            const groupName = `E2E 구성원 그룹 ${suffix}`;
            const copyName = `E2E 복제 그룹 ${suffix}`;
            const loginId = `e2e_member_${suffix.toLowerCase()}`;
            const userName = `E2E 구성원 ${suffix}`;
            const createdGroups: string[] = [];
            let userCreated = false;
            let primaryFailure: unknown;
            const members = async (code: string) => data<{ list: UserChoice[]; total: number }>(
                await request.get(`${AUTHORIZATION}/groups/${code}/members`, { headers: auth, params: { page: 0, size: 100 } }), '그룹 구성원 조회');
            try {
                const createdGroup = await request.post(`${AUTHORIZATION}/groups`, { headers: auth, data: { code: groupCode, name: groupName, description: '구성원 일괄 변경 검증 전용' } });
                if (createdGroup.ok())
                    createdGroups.push(groupCode);
                expect(createdGroup.status(), '전용 그룹 생성').toBe(200);
                const initial = await replaceGrants(request, auth, groupCode, [{ type: 'OPERATION', code: 'MENU_READ' }]);
                const createdUser = await request.post(USERS, {
                    headers: auth, data: { userId: loginId, userNm: userName, pswd: `Member1!${randomBytes(16).toString('hex')}`, role: 'USER' },
                });
                userCreated = createdUser.ok();
                expect(createdUser.status(), '전용 사용자 생성').toBe(200);

                await page.goto('/admin/security/authority');
                await page.getByRole('textbox', { name: '그룹 검색', exact: true }).fill(groupCode);
                await page.getByRole('region', { name: '권한 그룹 목록', exact: true }).getByRole('button').filter({ hasText: groupCode }).click();
                const editor = page.getByRole('region', { name: `${groupName} 권한 설정`, exact: true });
                await expect(editor).toBeVisible();
                // 권한 초안을 하나 만들어 둔다 — 구성원을 바꿔도 그대로 남아 같은 버전으로 저장되어야 한다.
                await editor.getByRole('tab', { name: /^기능별 권한/ }).click();
                await editor.getByRole('textbox', { name: '기능 검색', exact: true }).fill('ADMCODE_READ');
                await editor.getByRole('checkbox', { name: /\(ADMCODE_READ\)$/ }).check();

                await editor.getByRole('tab', { name: /^구성원/ }).click();
                await editor.getByRole('button', { name: '구성원 추가', exact: true }).click();
                const addDialog = page.getByRole('dialog', { name: `'${groupName}' 구성원 추가`, exact: true });
                await addDialog.getByRole('textbox', { name: '추가할 사용자 이름·로그인 ID', exact: true }).fill(loginId);
                await addDialog.getByRole('button', { name: '조회', exact: true }).click();
                const candidate = addDialog.getByRole('list', { name: '사용자 검색 결과', exact: true }).getByRole('checkbox', { name: `${userName} · ${loginId}`, exact: true });
                await expect(candidate).toBeEnabled();
                await candidate.check();
                const added = page.waitForResponse(response => new URL(response.url()).pathname === `${AUTHORIZATION}/groups/${groupCode}/members` && response.request().method() === 'PATCH');
                await addDialog.getByRole('button', { name: '1명 추가', exact: true }).click();
                expect((await added).status(), '구성원 일괄 추가 UI 저장').toBe(200);
                await expect(addDialog).toHaveCount(0);
                const afterAdd = await members(groupCode);
                expect(afterAdd.list.map(member => member.userId)).toEqual([loginId]);
                expect((await group(request, auth, groupCode)).version, '구성원 변경은 그룹 버전을 바꾸지 않는다').toBe(initial.version);

                await editor.getByRole('checkbox', { name: `${userName} (${loginId}) 선택`, exact: true }).check();
                await editor.getByRole('button', { name: '선택한 1명 회수', exact: true }).click();
                const revoked = page.waitForResponse(response => new URL(response.url()).pathname === `${AUTHORIZATION}/groups/${groupCode}/members` && response.request().method() === 'PATCH');
                const confirmation = page.getByRole('dialog', { name: '구성원 회수', exact: true });
                await expect(confirmation.getByText(/다른 그룹 배정은 그대로 유지됩니다/)).toBeVisible();
                await confirmation.getByRole('button', { name: '1명 회수', exact: true }).click();
                expect((await revoked).status(), '구성원 일괄 회수 UI 저장').toBe(200);
                expect((await members(groupCode)).list).toEqual([]);

                // 구성원을 두 번 바꿨어도 권한 초안은 남아 있고, 처음 읽은 버전으로 저장된다.
                await editor.getByRole('tab', { name: /^기능별 권한/ }).click();
                await expect(editor.getByRole('checkbox', { name: /\(ADMCODE_READ\)$/ })).toBeChecked();
                const savedGrants = page.waitForResponse(response => new URL(response.url()).pathname === `${AUTHORIZATION}/groups/${groupCode}/grants` && response.request().method() === 'PUT');
                await editor.getByRole('button', { name: '권한 변경 저장', exact: true }).click();
                expect((await savedGrants).status(), '구성원 변경 뒤 권한 초안 저장').toBe(200);
                const source = await group(request, auth, groupCode);
                expect(source.grants).toEqual(expect.arrayContaining([{ type: 'OPERATION', code: 'MENU_READ' }, { type: 'OPERATION', code: 'ADMCODE_READ' }]));

                // [2026-10-05] 편집기 머리를 한 줄로 줄이며 복제를 '더보기' 안으로 옮겼다(팝오버는 문서 끝에 그려져 편집기 밖에서 찾는다).
                await editor.getByRole('button', { name: '더보기', exact: true }).click();
                await page.getByRole('dialog', { name: `${groupName} 더보기`, exact: true }).getByRole('button', { name: '이 그룹으로 새 그룹 만들기', exact: true }).click();
                const copyDialog = page.getByRole('dialog', { name: '이 그룹으로 새 그룹 만들기', exact: true });
                await copyDialog.getByRole('textbox', { name: '그룹 코드', exact: true }).fill(copyCode);
                await copyDialog.getByRole('textbox', { name: '그룹명', exact: true }).fill(copyName);
                const copied = page.waitForResponse(response => new URL(response.url()).pathname === `${AUTHORIZATION}/groups/${groupCode}/copies` && response.request().method() === 'POST');
                await copyDialog.getByRole('button', { name: '새 그룹 만들기', exact: true }).click();
                const copyResponse = await copied;
                if (copyResponse.ok())
                    createdGroups.push(copyCode);
                expect(copyResponse.status(), '그룹 복제 UI 저장').toBe(200);
                await expect(page.getByRole('region', { name: `${copyName} 권한 설정`, exact: true })).toBeVisible();
                const copy = await group(request, auth, copyCode);
                expect([...copy.grants].sort((a, b) => a.code.localeCompare(b.code))).toEqual([...source.grants].sort((a, b) => a.code.localeCompare(b.code)));
                expect((await members(copyCode)).list, '구성원은 복사하지 않는다').toEqual([]);
                const history = await data<{ list: Change[] }>(await request.get(`${AUTHORIZATION}/history`, { headers: auth, params: { groupCode: copyCode, page: 0, size: 20 } }), '복제 그룹 이력 조회');
                expect(history.list.some(change => change.reason?.includes(groupCode)), '이력 사유에 복제 원본이 남는다').toBe(true);
                await page.goto('/');
            }
            catch (error) {
                primaryFailure = error;
                throw error;
            }
            finally {
                const cleanupFailures: string[] = [];
                // 구성원을 먼저 해제한다 — 구성원이 남은 그룹은 지울 수 없다(409).
                for (const code of createdGroups) {
                    try {
                        const remaining = await members(code);
                        if (remaining.list.length > 0) {
                            const released = await request.patch(`${AUTHORIZATION}/groups/${code}/members`, {
                                headers: auth, data: { add: [], remove: remaining.list.map(member => member.id), complete: true },
                            });
                            if (released.status() !== 200)
                                cleanupFailures.push(`fixture member cleanup status=${released.status()}`);
                        }
                    }
                    catch {
                        cleanupFailures.push('fixture member cleanup request failed');
                    }
                }
                if (userCreated) {
                    try {
                        const removed = await request.delete(`${USERS}/${loginId}`, { headers: auth });
                        if (removed.status() !== 200)
                            cleanupFailures.push(`fixture user cleanup status=${removed.status()}`);
                    }
                    catch {
                        cleanupFailures.push('fixture user cleanup request failed');
                    }
                }
                for (const code of [...createdGroups].reverse()) {
                    try {
                        const snapshot = await group(request, auth, code);
                        const removed = await request.delete(`${AUTHORIZATION}/groups/${code}`, { headers: auth, params: { version: snapshot.version } });
                        if (removed.status() !== 200)
                            cleanupFailures.push(`fixture group cleanup status=${removed.status()}`);
                    }
                    catch {
                        cleanupFailures.push('fixture group cleanup request failed');
                    }
                }
                await request.dispose();
                if (cleanupFailures.length > 0) {
                    const cleanupError = new Error(cleanupFailures.join('; '));
                    if (primaryFailure !== undefined)
                        throw new AggregateError([primaryFailure, cleanupError], 'Group member and copy test and fixture cleanup failed');
                    throw cleanupError;
                }
            }
        });
    });
    /**
     * [2026-10-02 3단계 G2·G3] 권한 묶음은 저장하지 않은 변경에만 더하고 기존 '권한 변경 저장'이 저장한다 — 더한 메뉴 표시는
     * 상위 메뉴까지 명시적이다(묵시 배정 없음). 그룹 비교는 읽기 전용이고, 편집 버튼이 그 그룹 편집기의 탭으로 옮긴다.
     * 정리는 ROLE_E2E_ 코드 그룹을 지운다(구성원을 두지 않는다).
     */
    test.describe('권한 묶음 적용과 그룹 비교', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test('묶음을 더해 저장하면 기능권한과 상위 메뉴까지의 메뉴 표시가 저장되고, 비교가 그 그룹의 편집기로 옮긴다', async ({ page, playwright, baseURL }) => {
            if (!baseURL || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
                throw new Error('Authorization fixtures require the isolated loopback E2E stack.');
            }
            const request = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
            const auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
            const suffix = randomBytes(4).toString('hex').toUpperCase();
            const groupCode = `ROLE_E2E_${suffix}_B`;
            const groupName = `E2E 묶음 그룹 ${suffix}`;
            let created = false;
            let primaryFailure: unknown;
            try {
                const createdGroup = await request.post(`${AUTHORIZATION}/groups`, { headers: auth, data: { code: groupCode, name: groupName, description: '권한 묶음 적용 검증 전용' } });
                created = createdGroup.ok();
                expect(createdGroup.status(), '전용 그룹 생성').toBe(200);

                await page.goto('/admin/security/authority');
                await page.getByRole('textbox', { name: '그룹 검색', exact: true }).fill(groupCode);
                await page.getByRole('region', { name: '권한 그룹 목록', exact: true }).getByRole('button').filter({ hasText: groupCode }).click();
                const editor = page.getByRole('region', { name: `${groupName} 권한 설정`, exact: true });
                await expect(editor).toBeVisible();
                await editor.getByRole('button', { name: '권한 묶음 적용', exact: true }).click();
                const dialog = page.getByRole('dialog', { name: '권한 묶음 적용', exact: true });
                await dialog.getByRole('radio', { name: '배너·팝업·도움말 관리', exact: true }).check();
                // 메뉴 표시도 1개 이상 더한다 — 0개를 받아들이면 메뉴 판정이 깨져도 이 검증이 통과한다.
                await expect(dialog.getByRole('region', { name: '묶음 미리보기', exact: true })).toContainText(/기능권한 추가 [1-9]\d*개\(이미 있음 0개\) · 메뉴 표시 추가 [1-9]\d*개/);
                await dialog.getByRole('button', { name: '선택한 묶음을 초안에 추가', exact: true }).click();
                await expect(dialog).toHaveCount(0);
                // 초안에 더했을 뿐이다 — 저장 전 요약이 늘어난 수를 보인다.
                // [2026-10-05] 저장 막대는 늘 보이는 한 줄 요약이다.
                await expect(editor.getByText(/^저장 전 변경: 추가 [1-9]\d* · 회수 0$/)).toBeVisible();
                const saved = page.waitForResponse(response => new URL(response.url()).pathname === `${AUTHORIZATION}/groups/${groupCode}/grants` && response.request().method() === 'PUT');
                await editor.getByRole('button', { name: '권한 변경 저장', exact: true }).click();
                expect((await saved).status(), '묶음을 더한 권한 저장').toBe(200);

                const snapshot = await group(request, auth, groupCode);
                const operations = snapshot.grants.filter(grant => grant.type === 'OPERATION').map(grant => grant.code);
                expect(operations).toEqual(expect.arrayContaining(['BANNER_READ', 'BANNER_CREATE', 'POPUP_READ', 'HELP_READ']));
                const catalog = await data<{ navigation: Navigation[] }>(await request.get(`${AUTHORIZATION}/catalog`, { headers: auth }), '권한 카탈로그 조회');
                const navigation = new Set(snapshot.grants.filter(grant => grant.type === 'NAVIGATION').map(grant => grant.code));
                // 상위 메뉴 검사는 빈 집합에서도 통과하므로, 묶음 화면(배너 및 팝업 관리)의 메뉴가 실제로 저장됐는지 먼저 확인한다.
                const bannerMenus = catalog.navigation.filter(entry => entry.route === '/admin/system/banner' && entry.useYn === 'Y');
                expect(bannerMenus.length, '배너 화면을 여는 사용 중 메뉴가 카탈로그에 있다').toBeGreaterThan(0);
                expect(bannerMenus.some(entry => navigation.has(entry.code)), '묶음이 배너 화면 메뉴의 메뉴 표시를 저장한다').toBe(true);
                for (const code of navigation) {
                    const parent = catalog.navigation.find(entry => entry.code === code)?.parentCode ?? null;
                    if (parent !== null)
                        expect(navigation.has(parent), `메뉴 ${code}의 상위 메뉴 ${parent}도 명시적으로 저장된다`).toBe(true);
                }

                await page.getByRole('button', { name: '그룹 비교', exact: true }).click();
                const comparison = page.getByRole('region', { name: '그룹 비교', exact: true });
                await comparison.getByRole('combobox', { name: /^A 그룹/ }).selectOption(groupCode);
                await comparison.getByRole('combobox', { name: /^B 그룹/ }).selectOption('ROLE_USER');
                await expect(comparison.getByText(/^A에만 [1-9]\d* · B에만 \d+/)).toBeVisible();
                await comparison.getByRole('tab', { name: '기능별', exact: true }).click();
                await comparison.getByRole('button', { name: `${groupName}에서 편집 (배너)`, exact: true }).click();
                await expect(editor.getByRole('tab', { name: /^기능별 권한/ })).toHaveAttribute('aria-selected', 'true');
                await page.goto('/');
            }
            catch (error) {
                primaryFailure = error;
                throw error;
            }
            finally {
                const cleanupFailures: string[] = [];
                if (created) {
                    try {
                        const snapshot = await group(request, auth, groupCode);
                        const removed = await request.delete(`${AUTHORIZATION}/groups/${groupCode}`, { headers: auth, params: { version: snapshot.version } });
                        if (removed.status() !== 200)
                            cleanupFailures.push(`fixture group cleanup status=${removed.status()}`);
                    }
                    catch {
                        cleanupFailures.push('fixture group cleanup request failed');
                    }
                }
                await request.dispose();
                if (cleanupFailures.length > 0) {
                    const cleanupError = new Error(cleanupFailures.join('; '));
                    if (primaryFailure !== undefined)
                        throw new AggregateError([primaryFailure, cleanupError], 'Permission bundle test and fixture cleanup failed');
                    throw cleanupError;
                }
            }
        });
    });
});
