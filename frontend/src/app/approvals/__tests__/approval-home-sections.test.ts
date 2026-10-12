import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '@/test-utils/projection';
import { visibleEntries } from '@/extensions/slots';
import approvalSections from '@/extensions/informalsanction/home-sections';

/**
 * [Phase 2 9단계 H3] 업무 홈의 결재 조각(약식 전자결재 기여)의 노출 행렬. 결재 디렉터리에 두어 결재와 함께 빠진다 — 업무 홈 레지스트리는
 * import 하지 않는다(소비자 표). 기여 파일과 슬롯 판정 함수(visibleEntries)를 그대로 탄다.
 *
 * 결재 대기 카드와 결재함 열기는 결재 조회 권한(APPROVAL_READ)이 있는 주체에게만 보인다(사용자 결정 B5). 대기 수를 결재 대기 API 로 세므로
 * 그 권한이 없으면 셀 수 없다 — 종전에는 대시보드 응답의 대기 수라 DASHBOARD_READ 만으로 보였다. 권한 상태를 모르면 보이지 않는다.
 */
type Subject = null | { id: string; permissions: string[]; authorizationVersion?: string };
const SUBJECTS = {
  granted: { id: 'user', permissions: ['DASHBOARD_READ', 'APPROVAL_READ'], authorizationVersion: 'v1' },
  // 근접 오답: 업무 홈은 보지만 결재 조회 권한이 없다(종전에는 이 주체에게도 결재 대기 카드가 보였다).
  dashboardOnly: { id: 'user', permissions: ['DASHBOARD_READ', 'APPROVAL_CREATE'], authorizationVersion: 'v1' },
  signedOut: null,
  noVersion: { id: 'user', permissions: ['DASHBOARD_READ', 'APPROVAL_READ'] },
  emptyVersion: { id: 'user', permissions: ['DASHBOARD_READ', 'APPROVAL_READ'], authorizationVersion: '' },
} satisfies Record<string, Subject>;

const read = (file: string) => JSON.parse(readFileSync(path.join(REPO_ROOT, file), 'utf8'));

describe('업무 홈 결재 조각의 노출(약식 전자결재 기여)', () => {
  it.each(Object.keys(SUBJECTS) as (keyof typeof SUBJECTS)[])('노출 행렬 — 주체 %s', (subject) => {
    expect(visibleEntries(SUBJECTS[subject], [approvalSections]).map(entry => entry.id).sort())
      .toEqual(subject === 'granted' ? ['approval-open', 'approval-pending'] : []);
  });

  it('술어는 결재 대기 API 의 권한이고, 기본 그룹 셋이 모두 그 권한을 가진다', () => {
    const bindings = read('business-core/src/main/resources/authorization/operation-bindings.json') as
      Array<{ method: string; path: string; permission?: string }>;
    const pending = bindings.find(row => row.method === 'GET' && row.path === '/api/v1/approvals/pending')?.permission;
    expect(pending).toBe('APPROVAL_READ');
    expect(approvalSections.map(entry => [entry.id, entry.visibleWhen])).toEqual([
      ['approval-open', { permissions: [pending] }],
      ['approval-pending', { permissions: [pending] }],
    ]);
    const catalog = read('config/governance/permission-catalog.json') as { permissions: Array<{ code: string; defaultGroups: string[] }> };
    // 기본 그룹은 모두 이 권한을 가져 화면이 바뀌지 않는다. 기본 그룹에서 빠지면 이 노출 결정을 다시 본다.
    expect(catalog.permissions.find(row => row.code === 'APPROVAL_READ')?.defaultGroups).toEqual(['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER']);
  });
});
