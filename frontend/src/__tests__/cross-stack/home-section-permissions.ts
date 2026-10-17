/**
 * 업무 홈 조각(기능의 `home-sections` 기여)이 부르는 사용자 API 와 그 노출 권한 — 한 벌의 기대값.
 *
 * 두 시험이 이 표를 함께 읽는다. 기능 디렉터리의 노출 시험(app/approvals/__tests__/approval-home-sections.test.ts,
 * app/admin/system/banner/__tests__/promotion-home-sections.test.ts)은 기여의 `visibleWhen` 이 이 권한인지 보고,
 * cross-stack/home-section-permission-bindings.test.ts 는 서버 인가 원장의 그 API 바인딩과 기본 그룹이 이 권한인지 본다.
 * 표가 하나라서 두 시험이 모두 녹색이면 "술어 = 조각이 부르는 API 의 서버 권한" 이 성립한다(종전에는 한 시험이 둘을 직접 비교했다).
 *
 * 기여 모듈을 import 하지 않는다 — 이 디렉터리의 파일이 기능 import 로 연쇄 제거되면 생성기가 승인되지 않은 게이트 제거로 멈춘다.
 * 경로는 저장소 기준이다.
 */
export interface HomeSectionPermission {
  /** 기여의 조각 id */
  readonly id: string;
  /** 조각이 부르는 사용자 API(GET) */
  readonly route: string;
  /** 노출 권한 = 그 API 의 서버 권한 */
  readonly permission: string;
}

export const HOME_SECTION_PERMISSIONS = {
  // 결재 대기 카드와 결재함 열기 — 대기 수를 결재 대기 API 로 센다(사용자 결정 B5).
  approval: {
    label: '결재(약식 전자결재)',
    contribution: 'frontend/src/extensions/informalsanction/home-sections.ts',
    sections: [
      { id: 'approval-open', route: '/api/v1/approvals/pending', permission: 'APPROVAL_READ' },
      { id: 'approval-pending', route: '/api/v1/approvals/pending', permission: 'APPROVAL_READ' },
    ],
  },
  // 공지 팝업과 홍보 배너 — 조각이 부르는 활성 팝업·노출 배너 API 의 권한이다(사용자 결정 B5).
  promotion: {
    label: '홍보(배너·팝업)',
    contribution: 'frontend/src/extensions/promotion/home-sections.ts',
    sections: [
      { id: 'popup', route: '/api/v1/popups/active', permission: 'POPUP_READ' },
      { id: 'banner', route: '/api/v1/banners/reflected', permission: 'BANNER_READ' },
    ],
  },
} as const satisfies Record<string, { label: string; contribution: string; sections: readonly HomeSectionPermission[] }>;

/** 기여의 `[id, visibleWhen]` 기대값 — 기능 쪽 시험이 기여 모듈의 값과 그대로 비교한다. */
export const expectedVisibleWhen = (sections: readonly HomeSectionPermission[]) =>
  sections.map(({ id, permission }) => [id, { permissions: [permission] }]);
