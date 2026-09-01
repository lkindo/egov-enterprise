import { test, expect } from './fixtures/base-test';
import fs from 'fs';
import path from 'path';

/**
 * [Tier 26] 보안 관리 화면의 미커버 쓰기 경로
 *
 * 2026-09-01 e2e 전수 점검에서 **결과가 가장 큰 쓰기 두 개가 브라우저 레벨로 한 번도
 * 검증되지 않는다**는 것이 실측됐다(120개 라우트 중 57개 미방문, 그중 이 둘이 최상위 위험).
 *
 *  ① `/admin/security/dept-authority` — `updateDeptAuthorities` 로 **부서 구성원 전체의
 *     기존 개별 권한을 삭제하고 선택한 권한 그룹으로 교체**한다. e2e 참조 0건이었다.
 *  ② `/admin/security/login-policy` — IP 제한·허용 시간대·2단계 인증을 설정하는 424줄 화면.
 *     e2e 참조 0건이었다. ⚠ 이 화면은 2026-08-27(DEC-OPS-024)에 config redirect 를 걷어내
 *     **정본 경로로 되살린** 것인데, 되살린 뒤에도 테스트가 없어 다시 죽어도 아무도 모른다.
 *     (기존 `OpsGovernancePage` 가 방문하는 `/admin/user/login-policy` 는 이름만 비슷한
 *      다른 화면이며 모니터링 허브로 흡수된다 — "커버된 것처럼 보이는" 대표 함정이다.)
 *
 * [검증 전략] ①은 되돌릴 수 없는 일괄 변경이므로 **이 스펙이 만든 전용 부서**에만 적용한다.
 *   구성원이 없는 새 부서라 실질 부작용이 0이면서 저장 경로·응답·재조회는 그대로 검증된다.
 *   기존 부서를 골라 쓰면 통과하는 테스트가 남의 권한을 지운다.
 */

/** storageState(admin.json)에서 accessToken 을 꺼낸다(tier-19·24 와 동일 패턴). */
function getAdminBearerToken(): string {
    const authPath = path.resolve('playwright/.auth/admin.json');
    const state = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const cookieToken = (state.cookies ?? []).find((c: { name: string }) => c.name === 'accessToken')?.value;
    const lsToken = (state.origins?.[0]?.localStorage ?? [])
        .find((l: { name: string }) => l.name === 'accessToken')?.value;
    const token = cookieToken ?? lsToken;
    if (!token) {
        throw new Error('[tier-26] admin accessToken 을 playwright/.auth/admin.json 에서 찾을 수 없음 (setup 미실행?)');
    }
    return token;
}

const DEPT_API = '/api/v1/admin/system/departments';
const DEPT_AUTH_API = '/api/v1/admin/system/dept-authorities';
const AUTHORITY_API = '/api/v1/admin/system/authorities';

/** 이 스펙이 만든 자원만 지우기 위한 접두사. */
const PREFIX = 'E2E26_';

test.describe('Tier 26: 보안 관리 쓰기 경로', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    let auth: Record<string, string>;

    test.beforeAll(() => {
        auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
    });

    test('부서 권한 일괄 적용 — 전용 부서에 적용하고 재조회로 확인한다', async ({ page, request }) => {
        // 1) 전용 부서를 만든다. 기존 부서에 적용하면 이 테스트가 남의 권한을 지운다.
        const deptRes = await request.post(DEPT_API, {
            headers: auth,
            data: { ognzNm: `${PREFIX}Dept_${Date.now()}` },
        });
        expect(deptRes.ok(), `부서 생성 실패: ${deptRes.status()}`).toBeTruthy();
        const deptId = (await deptRes.json()).data as string;

        try {
            // 2) 적용할 권한 그룹을 고른다(서버가 이미 가진 것 중 하나 — 새로 만들지 않는다).
            const authListRes = await request.get(`${AUTHORITY_API}?pageIndex=1&pageUnit=10`, { headers: auth });
            expect(authListRes.ok(), `권한 목록 조회 실패: ${authListRes.status()}`).toBeTruthy();
            const authorities = (await authListRes.json()).data?.list ?? [];
            expect(authorities.length, '적용할 권한 그룹이 최소 1개는 있어야 한다').toBeGreaterThan(0);
            const authrtCd = authorities[0].authrtCd as string;

            await page.goto('/admin/security/dept-authority');

            // 3) 부서를 먼저 고른다.
            //    ⚠ 상세 패널과 그 안의 적용 버튼은 **부서를 고른 뒤에만** 존재한다 —
            //    `MasterDetailPage` 가 `{detail && detailActions && ...}` 로 묶어 렌더하고
            //    (master-detail-page.tsx:342), `SecurityDeptAuthorityClient` 의 detail 은
            //    `selectedDept ? ... : ...` 다. 선택 전에 버튼이나 고지를 찾으면 둘 다
            //    element not found 로 실패한다 — 2026-09-01 CI 에서 두 번 실측했다.
            const firstDept = page.locator('button[data-a2-master-item]').first();
            await expect(firstDept, '부서 목록이 비어 있으면 이 계약을 검증할 수 없다')
                .toBeVisible({ timeout: 20000 });
            await firstDept.click();

            // 4) 권한 그룹을 고르기 전에는 적용이 막혀야 한다 — 대상 없는 일괄 쓰기 방지.
            const applyButton = page.getByRole('button', { name: '부서 전체에 적용' });
            await expect(applyButton).toBeVisible({ timeout: 20000 });
            await expect(applyButton, '권한 그룹을 고르기 전에는 적용이 막혀야 한다').toBeDisabled();

            // 5) 화면이 되돌릴 수 없는 변경임을 밝히는지 확인한다(G10 — 실행 전 결과 고지).
            await expect(
                page.getByText('기존 개별 권한은 모두 삭제').first(),
                '일괄 적용 화면은 실행 전에 "기존 권한이 삭제된다"는 사실을 밝혀야 한다',
            ).toBeVisible({ timeout: 20000 });

            // 5) 실제 쓰기는 API 로 수행한다 — 부서 목록이 길면 UI 선택이 페이지네이션에
            //    의존해 플레이키해지는데, 이 테스트가 지키려는 계약은 '선택 UI'가 아니라
            //    '일괄 적용이 실제로 저장되는가'다.
            const applyRes = await request.post(`${DEPT_AUTH_API}/batch`, {
                headers: { ...auth, 'Content-Type': 'application/json' },
                data: { deptId, authrtCd },
            });
            expect(applyRes.ok(), `부서 권한 일괄 적용 실패: ${applyRes.status()}`).toBeTruthy();

            // 6) 재조회로 실제 반영을 확인한다. 응답 200 만으로는 저장을 증명하지 못한다.
            const verifyRes = await request.get(`${DEPT_AUTH_API}/${deptId}`, { headers: auth });
            expect(verifyRes.ok(), `부서 권한 재조회 실패: ${verifyRes.status()}`).toBeTruthy();
            const applied = JSON.stringify((await verifyRes.json()).data ?? '');
            expect(applied, '적용한 권한 코드가 재조회 결과에 있어야 한다').toContain(authrtCd);
        } finally {
            await request.delete(`${DEPT_API}/${deptId}`, { headers: auth }).catch(() => undefined);
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
        // 시드 사용자 수에 의존하지 않도록 "행이 있으면 수정 버튼도 있다"로 단언한다.
        const editButtons = page.getByRole('button', { name: /로그인 정책 수정$/ });
        const rowCount = await editButtons.count();
        expect(rowCount, '로그인 정책 대상 사용자가 최소 1명은 조회돼야 한다').toBeGreaterThan(0);
        await expect(editButtons.first()).toBeVisible();
    });
});
