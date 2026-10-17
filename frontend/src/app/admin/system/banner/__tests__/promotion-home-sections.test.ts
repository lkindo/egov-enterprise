import { describe, expect, it } from 'vitest';
import { visibleEntries } from '@/extensions/slots';
import promotionSections from '@/extensions/promotion/home-sections';
import { HOME_SECTION_PERMISSIONS, expectedVisibleWhen } from '@/__tests__/cross-stack/home-section-permissions';

/**
 * [Phase 2 9단계 H3] 업무 홈의 홍보 조각(배너·팝업 기여)의 노출 행렬. 배너·팝업 디렉터리에 두어 배너·팝업과 함께 빠진다 — 업무 홈
 * 레지스트리는 import 하지 않는다(소비자 표). 기여 파일과 슬롯 판정 함수(visibleEntries)를 그대로 탄다.
 *
 * 팝업은 POPUP_READ, 배너는 BANNER_READ 가 있는 주체에게만 보인다(사용자 결정 B5 — 조각이 부르는 사용자 API 의 권한). 권한 상태를
 * 모르면(로그아웃·권한 버전 없음·빈 권한 버전) 보이지 않는다. 노출일 뿐 인가가 아니다 — API 는 서버가 같은 권한으로 막는다(H3).
 *
 * 그 권한이 두 API 의 서버 바인딩·기본 그룹과 같은지는 서버 원장을 읽으므로 cross-stack/home-section-permission-bindings.test.ts 가
 * 본다(백엔드-only PR 에서도 돈다). 두 시험은 같은 기대값(cross-stack/home-section-permissions.ts)을 읽는다.
 */
type Subject = null | { id: string; permissions: string[]; authorizationVersion?: string };
const SUBJECTS = {
  both: { id: 'user', permissions: ['DASHBOARD_READ', 'POPUP_READ', 'BANNER_READ'], authorizationVersion: 'v1' },
  popupOnly: { id: 'user', permissions: ['DASHBOARD_READ', 'POPUP_READ'], authorizationVersion: 'v1' },
  // 근접 오답: 업무 홈과 관리 화면 권한은 있지만 사용자 조회 권한이 없다.
  bannerAdminOnly: { id: 'user', permissions: ['DASHBOARD_READ', 'BANNER_UPDATE', 'POPUP_UPDATE'], authorizationVersion: 'v1' },
  signedOut: null,
  noVersion: { id: 'user', permissions: ['POPUP_READ', 'BANNER_READ'] },
  emptyVersion: { id: 'user', permissions: ['POPUP_READ', 'BANNER_READ'], authorizationVersion: '' },
} satisfies Record<string, Subject>;
const EXPECTED: Record<keyof typeof SUBJECTS, string[]> = {
  both: ['popup', 'banner'],
  popupOnly: ['popup'],
  bannerAdminOnly: [],
  signedOut: [],
  noVersion: [],
  emptyVersion: [],
};

describe('업무 홈 홍보 조각의 노출(배너·팝업 기여)', () => {
  it.each(Object.keys(SUBJECTS) as (keyof typeof SUBJECTS)[])('노출 행렬 — 주체 %s', (subject) => {
    expect(visibleEntries(SUBJECTS[subject], [promotionSections]).map(entry => entry.id).sort())
      .toEqual([...EXPECTED[subject]].sort());
  });

  it('술어는 조각이 부르는 사용자 API 의 권한(서버 바인딩 대조와 같은 기대값)이다', () => {
    expect(promotionSections.map(entry => [entry.id, entry.visibleWhen]))
      .toEqual(expectedVisibleWhen(HOME_SECTION_PERMISSIONS.promotion.sections));
  });
});
