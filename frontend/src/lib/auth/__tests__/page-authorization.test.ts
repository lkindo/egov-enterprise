import { afterEach, describe, expect, it, vi } from 'vitest';
import { canEnterRegisteredPage, loadPageAuthorization } from '../page-authorization';
import { PAGE_PERMISSIONS } from '@/types/generated-permissions';
import { pageInProjection } from '@/test-utils/projection';

const SUBJECT = 'USRCNFRM_fixture_001';
const current = { id: 'fixture-login', esntlId: SUBJECT, groups: ['USER'], permissions: [], authorizationVersion: 'v1' };
const upstream = (data: unknown, status = 200) => new Response(JSON.stringify({ success: true, code: 'S000', message: '성공', data }), { status });

afterEach(() => vi.unstubAllGlobals());
// 예시 화면이 투영으로 빠진 생성물에서는 그 예시만 뺀다 — 라우트의 page 파일이 원장에 있고 실제로 없을 때다(원본에서는 그대로다).
const pages = (routes: string[]) => routes.filter(pageInProjection);
const pageRows = <T extends [string, ...string[]]>(rows: T[]) => rows.filter(([route]) => pageInProjection(route));

describe('page permission mapping', () => {
  it.each(pages(['/admin/survey/polls', '/admin/survey/polls/manage']))('requires both read permissions for %s', route => {
    for (const permissions of [[], ['POLL_READ'], ['POLL_READ_ALL'], ['SURVEY_READ', 'SURVEY_READ_ALL']]) {
      expect(canEnterRegisteredPage(route, { ...current, permissions })).toBe(false);
    }
    expect(canEnterRegisteredPage(route, { ...current, permissions: ['POLL_READ', 'POLL_READ_ALL'] })).toBe(true);
    expect(canEnterRegisteredPage(`${route}/`, { ...current, permissions: ['POLL_READ', 'POLL_READ_ALL'] })).toBe(true);
    expect(canEnterRegisteredPage(route, { permissions: ['POLL_READ', 'POLL_READ_ALL'] })).toBe(false);
  });
  if (pageInProjection('/admin/work-hub')) it('does not inherit an authenticated parent’s empty permission requirement for unknown children', () => {
    expect(canEnterRegisteredPage('/admin/work-hub', current)).toBe(true);
    expect(canEnterRegisteredPage('/admin/work-hub/unregistered-child', current)).toBe(false);
  });

  it('requires an explicitly registered permission for a protected page', () => {
    const required = PAGE_PERMISSIONS['/admin/system/menus'];
    expect(required.length).toBeGreaterThan(0);
    expect(canEnterRegisteredPage('/admin/system/menus', current)).toBe(false);
    expect(canEnterRegisteredPage('/admin/system/menus', { ...current, permissions: [...required] })).toBe(true);
  });

  it.each(pageRows([
    ['/admin/community/boards/master', 'BBS_MST_READ'],
    ['/admin/community/boards/maker', 'BBS_MST_CREATE'],
    ['/admin/community/templates', 'TEMPLATE_READ'],
  ]))('does not let an authenticated dynamic sibling shadow %s', (route, permission) => {
    expect(canEnterRegisteredPage(route, current)).toBe(false);
    expect(canEnterRegisteredPage(`${route}/`, current)).toBe(false);
    expect(canEnterRegisteredPage(route, { ...current, permissions: ['BOARD_READ'] })).toBe(false);
    expect(canEnterRegisteredPage(route, { ...current, permissions: [permission] })).toBe(true);
  });

  it('preserves authenticated dynamic community and board detail routes', () => {
    if (pageInProjection('/admin/community/[id]')) expect(canEnterRegisteredPage('/admin/community/fixture-community', current)).toBe(true);
    if (pageInProjection('/admin/community/boards/[id]')) expect(canEnterRegisteredPage('/admin/community/boards/fixture-board', current)).toBe(true);
    // 모든 생성물에 남는 동적 화면(부서 업무 상세)도 같은 판정이다 — 위 예시가 빠진 생성물에서 단언 없이 끝나지 않게 한다.
    expect(canEnterRegisteredPage('/smart-toolkit/dept-job/fixture-job', current)).toBe(true);
  });

  it.each(pageRows([
    ['/admin', 'DASHBOARD_READ', 'DASHBOARD_ADMIN_READ'],
    ['/admin/stats', 'STATS_READ', 'STATS_ADMIN_READ'],
    ['/admin/stats/board', 'STATS_READ', 'STATS_ADMIN_READ'],
    ['/admin/stats/data-usage', 'STATS_READ', 'STATS_ADMIN_READ'],
    ['/admin/stats/report', 'STATS_READ', 'STATS_ADMIN_READ'],
    ['/admin/stats/screen', 'STATS_READ', 'STATS_ADMIN_READ'],
    ['/admin/stats/user', 'STATS_READ', 'STATS_ADMIN_READ'],
    ['/admin/workflow', 'APPROVAL_READ', 'WORKFLOW_READ'],
    ['/admin/sanctn/workflow', 'APPROVAL_READ', 'WORKFLOW_READ'],
    ['/admin/survey/polls', 'POLL_READ', 'POLL_READ_ALL'],
    ['/admin/survey/polls/manage', 'POLL_READ', 'POLL_READ_ALL'],
  ]))('keeps %s separate from ordinary data reads while accepting an explicit grant', (route, ordinary, management) => {
    const regularUser = { ...current, groups: ['ROLE_USER'], permissions: [ordinary] };
    expect(canEnterRegisteredPage(route, regularUser)).toBe(false);
    expect(canEnterRegisteredPage(route, { ...regularUser, permissions: [ordinary, management] })).toBe(true);
  });

  it('matches the JWT essential ID when the backend login ID differs, with no-store and no redirect forwarding', async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstream(current));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadPageAuthorization('test-token', SUBJECT)).resolves.toEqual({
      groups: ['USER'], permissions: [], authorizationVersion: 'v1',
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/me$/), expect.objectContaining({
      headers: { Authorization: 'Bearer test-token', Accept: 'application/json' },
      cache: 'no-store', redirect: 'error', signal: expect.any(AbortSignal),
    }));
  });

  it.each([
    { ...current, esntlId: 'USRCNFRM_other_002' },
    { ...current, id: SUBJECT, esntlId: 'USRCNFRM_other_002' },
    { ...current, id: SUBJECT, esntlId: undefined },
    { ...current, authorizationVersion: undefined },
    { ...current, groups: undefined },
  ])('rejects a mismatched or incomplete snapshot', async (data) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream(data)));
    await expect(loadPageAuthorization('test-token', SUBJECT)).resolves.toBeNull();
  });

  it('does not grant access when the current-authority service fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unavailable')));
    await expect(loadPageAuthorization('test-token', SUBJECT)).resolves.toBeNull();
  });
});
