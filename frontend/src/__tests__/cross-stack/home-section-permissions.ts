/**
 * 업무 홈 조각(기능의 `home-sections` 기여)이 부르는 사용자 API 와 그 노출 권한 — 한 벌의 기대값.
 *
 * 두 시험이 이 표를 함께 읽는다. 기능 디렉터리의 노출 시험(app/approvals/__tests__/approval-home-sections.test.ts,
 * app/admin/system/banner/__tests__/promotion-home-sections.test.ts, app/smart-toolkit/schedule/__tests__/schedule-home-sections.test.ts,
 * app/admin/operation/memo-reports/__tests__/memo-report-home-sections.test.ts, app/survey/__tests__/survey-home-sections.test.ts)과
 * core 셸 시험(app/__tests__/UnifiedDashboardClient.shell.test.tsx — 부서 업무 카드)은 노출 권한이 이 권한인지 보고,
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
  // 오늘 일정 카드 — 일정 화면 달력과 같은 월별 조회로 오늘 것을 고른다(2026-10-20). 기간 조회(/schedules/range)는 쓰지 않는다.
  schedule: {
    label: '일정',
    contribution: 'frontend/src/extensions/schedule/home-sections.ts',
    sections: [
      { id: 'schedule-today', route: '/api/v1/schedules/monthly', permission: 'SCHEDULE_READ' },
    ],
  },
  // 읽지 않은 받은 보고 카드 — 받은 보고 목록에서 첫 열람이 없는 보고를 센다(2026-10-20).
  memoreport: {
    label: '메모 보고',
    contribution: 'frontend/src/extensions/memoreport/home-sections.ts',
    sections: [
      { id: 'memo-reports-received', route: '/api/v1/memo-reports/received', permission: 'MEMO_RPT_READ' },
    ],
  },
  // 참여할 설문 카드 — 설문 참여 화면과 같은 목록에서 진행 중이고 응답하지 않은 설문을 센다(2026-10-20).
  survey: {
    label: '설문',
    contribution: 'frontend/src/extensions/survey/home-sections.ts',
    sections: [
      { id: 'surveys-to-answer', route: '/api/v1/surveys', permission: 'SURVEY_READ' },
    ],
  },
  // 내 담당 업무 카드 — 부서 업무는 core 라 기여가 아니라 셸이 그린다(2026-10-20). contribution 은 그 카드 파일이다(늘 남는다).
  core: {
    label: '부서 업무(core 셸)',
    contribution: 'frontend/src/app/components/dashboard/DeptJobHomeCard.tsx',
    sections: [
      { id: 'dept-jobs', route: '/api/v1/dept-jobs', permission: 'DEPT_JOB_READ' },
    ],
  },
} as const satisfies Record<string, { label: string; contribution: string; sections: readonly HomeSectionPermission[] }>;

/** 기여의 `[id, visibleWhen]` 기대값 — 기능 쪽 시험이 기여 모듈의 값과 그대로 비교한다. */
export const expectedVisibleWhen = (sections: readonly HomeSectionPermission[]) =>
  sections.map(({ id, permission }) => [id, { permissions: [permission] }]);
