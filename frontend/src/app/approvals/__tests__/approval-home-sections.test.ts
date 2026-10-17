import { describe, expect, it } from 'vitest';
import { visibleEntries } from '@/extensions/slots';
import approvalSections from '@/extensions/informalsanction/home-sections';
import { HOME_SECTION_PERMISSIONS, expectedVisibleWhen } from '@/__tests__/cross-stack/home-section-permissions';

/**
 * [Phase 2 9단계 H3] 업무 홈의 결재 조각(약식 전자결재 기여)의 노출 행렬. 결재 디렉터리에 두어 결재와 함께 빠진다 — 업무 홈 레지스트리는
 * import 하지 않는다(소비자 표). 기여 파일과 슬롯 판정 함수(visibleEntries)를 그대로 탄다.
 *
 * 결재 대기 카드와 결재함 열기는 결재 조회 권한(APPROVAL_READ)이 있는 주체에게만 보인다(사용자 결정 B5). 대기 수를 결재 대기 API 로 세므로
 * 그 권한이 없으면 셀 수 없다 — 종전에는 대시보드 응답의 대기 수라 DASHBOARD_READ 만으로 보였다. 권한 상태를 모르면 보이지 않는다.
 *
 * 그 권한이 결재 대기 API 의 서버 바인딩·기본 그룹과 같은지는 서버 원장을 읽으므로 cross-stack/home-section-permission-bindings.test.ts 가
 * 본다(백엔드-only PR 에서도 돈다). 두 시험은 같은 기대값(cross-stack/home-section-permissions.ts)을 읽는다.
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

describe('업무 홈 결재 조각의 노출(약식 전자결재 기여)', () => {
  it.each(Object.keys(SUBJECTS) as (keyof typeof SUBJECTS)[])('노출 행렬 — 주체 %s', (subject) => {
    expect(visibleEntries(SUBJECTS[subject], [approvalSections]).map(entry => entry.id).sort())
      .toEqual(subject === 'granted' ? ['approval-open', 'approval-pending'] : []);
  });

  it('술어는 결재 대기 API 의 권한(서버 바인딩 대조와 같은 기대값)이다', () => {
    expect(approvalSections.map(entry => [entry.id, entry.visibleWhen]))
      .toEqual(expectedVisibleWhen(HOME_SECTION_PERMISSIONS.approval.sections));
  });
});
