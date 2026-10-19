// @vitest-environment node
import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frozenInProjection, frozenTableDiff } from '@/test-utils/projection';
import { productionSourceFiles } from '../../../scripts/code-without-comments.mjs';

/**
 * 🚦 status 색 하드코딩 차단 게이트 — `hardcoded-color-guard.test.ts` 의 사각지대 봉합.
 *
 * 기존 가드는 중립(slate/gray/zinc/neutral/stone) + 브랜드 액센트(blue/indigo/sky/violet/purple/cyan/teal/fuchsia)
 * 만 세고, status 계열(red/green/emerald/rose/amber/orange/yellow/lime/pink)은 "성공/경고/오류 시맨틱이라
 * 별도 토큰 대상"이라며 **제외**했다. 그런데 그 별도 토큰은 이미 존재한다 —
 * `globals.css` 의 `--color-success` / `--color-success-emphasis` / `--color-warning` / `--color-info` /
 * `--color-destructive` / `--color-destructive-emphasis`. 즉 치환 대상이 있는데도 계측조차 되지 않아,
 * status 색 하드코딩은 **어떤 게이트에도 걸리지 않고 자유롭게 증식**할 수 있었다(2026-08-16 실측 786건 / 105개 파일).
 *
 * 이 게이트는 그 786건을 동결하고 증가를 차단한다. 기존 가드와 동일하게 **양방향**이다 —
 * 감소했는데 동결표를 안 내리면 실패시켜 개선분 확정을 강제한다(단방향이면 개선이 슬랙으로 녹아 사라진다).
 *
 * 치환 지침(docs/03-guides/design-tokens.md):
 *   green/emerald 계열 → `text-success` / `bg-success` / `border-success`
 *   amber/yellow/orange 계열 → `text-warning` / `bg-warning`
 *   red/rose 계열 → `text-destructive` / `bg-destructive` / `*-destructive-emphasis`
 *   정보성 blue 계열은 기존 가드 소관(`text-info`)
 *
 * 데이터 시각화의 명암 스케일(히트맵·차트 등)처럼 의미상 팔레트가 필요한 자리는 예외가 될 수 있다.
 * 그 경우 사유를 코드 리뷰에 명시하고 동결표를 올린다 — 단, 목록을 늘려 신호를 지우는 것과
 * 정당한 예외를 구분하는 것은 리뷰어의 책임이다(AGENTS.md Evidence guardrails H2).
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

// 기존 가드(hardcoded-color-guard.test.ts)가 명시적으로 제외한 계열 — 두 게이트의 합집합이 전 팔레트다.
const STATUS_COLORS = 'red|green|emerald|rose|amber|orange|yellow|lime|pink';
const UTIL = 'text|bg|border|ring|divide|from|to|via|placeholder|fill|stroke|shadow|ring-offset|caret|outline|decoration|accent';
const VARIANT = '(?:dark:|hover:|focus:|group-hover:|focus-within:|active:|group-focus-within:)?';
const PATTERN = new RegExp(`${VARIANT}(?:${UTIL})-(?:${STATUS_COLORS})-[0-9]{2,3}(?:\\/[0-9]{1,3})?`, 'g');

// [동결] 게이트 신설 시점 실측 census 를 파일별로 동결한다. 래칫의 정상 방향은 감소다. 재사용 생성물에서는 투영으로 빠진
//   파일의 몫만 뺀다(원장 확인). 총계는 표의 합에서 계산한다 — 총계와 표를 이중으로 동결하면 리터럴을 줄일 때마다 코드를
//   보지 않는 상수 수정이 붙는다(FE-CONTRACT-07). 리터럴을 줄이거나 옮기면 이 표만 고친다. 증감의 이력은 git 과 결정 기록에 있다.
// 이행할 때의 함정 둘:
//   · --warning-emphasis 는 이 저장소에 정의돼 있지 않아 text-warning-emphasis 는 클래스가 생성되지 않는다. 경고는 배경
//     틴트가 말하고 글자는 전경 토큰이다.
//   · 상태가 아니라 분류 표식인 색은 success/warning/destructive 가 아니라 hub-* 토큰으로 옮긴다 — 없는 의미를 주장하게 된다.
const BASELINE_BY_FILE: Record<string, number> = {
  'src/app/admin/AdminDashboardClient.tsx': 7,
  'src/app/admin/collaboration/address-book/select-address-book-detail/[id]/SelectAddressBookDetailClient.tsx': 1,
  'src/app/admin/collaboration/mail-send/MailSendHubClient.tsx': 2,
  'src/app/admin/community/templates/TemplateAdminClient.tsx': 3,
  'src/app/admin/error.tsx': 6,
  'src/app/admin/operation/memo-reports/MemoReportManagementClient.tsx': 3,
  'src/app/admin/stats/IntelligenceHubClient.tsx': 1,
  'src/app/admin/stats/StatsHubParts.tsx': 2,
  'src/app/admin/survey/components/StatsHubSurveyTab.tsx': 2,
  'src/app/admin/survey/hub/SurveyHubClient.tsx': 9,
  'src/app/admin/survey/manage/SurveyManageClient.tsx': 6,
  'src/app/admin/survey/polls/manage/page.tsx': 2,
  'src/app/admin/survey/stats/SurveyStatsClient.tsx': 7,
  'src/app/admin/system/logs/user/SystemLogsUserClient.tsx': 3,
  'src/app/admin/uss/olh/online-manual/ManualAdminClient.tsx': 3,
  'src/app/components/layout/header-notifications.tsx': 1,
  'src/app/components/ui/confirm-modal.tsx': 6,
  'src/app/components/ui/standard-form.tsx': 1,
  'src/app/components/ui/status-displays.tsx': 13,
  'src/app/components/ui/workflow-canvas.tsx': 4,
  'src/app/cop/sms/selectSmsList/SmsHubClient.tsx': 3,
  'src/app/global-error.tsx': 6,
  'src/app/login/LoginClient.tsx': 1,
  'src/app/smart-toolkit/dept-job/[id]/DeptJobDetailClient.tsx': 2,
  // [업무 허브 분해 W1] 업무 허브 클라이언트의 4건이 두 화면으로 나뉘었다(보고 삭제 2·일정 삭제 2) — 합은 같다.
  'src/app/smart-toolkit/schedule/ScheduleCalendarClient.tsx': 2,
  'src/app/smart-toolkit/work-report/WorkReportClient.tsx': 2,
  'src/components/business/deptJob/DeptJobForm.tsx': 7,
  'src/components/business/report/ReportCreateForm.tsx': 4,
  'src/components/business/schedule/ScheduleCreateForm.tsx': 6,
  'src/components/features/dashboard/RealTimeDashboard.tsx': 1,
  'src/components/features/satisfaction/Stars.tsx': 2,
};

// 재사용 생성물에서는 투영으로 빠진 파일 몫만 뺀다(원장 확인). 원본에서는 동결표 그대로다. 총계는 그 합이다.
const FROZEN = frozenInProjection(BASELINE_BY_FILE, (file) => join(SRC, '..', file));
const BASELINE = Object.values(FROZEN).reduce((sum, count) => sum + count, 0);

// 게이트 무결성 하한 — 기존 가드와 동일 축(스캔 파손 시 vacuous 통과 차단).
const MIN_SCANNED_FILES = 50;

describe('status 색 하드코딩 차단 게이트 (기존 색상 가드의 제외 계열 봉합)', () => {
  it(`status 계열 하드코딩 occurrence 는 파일별 동결표(합 ${BASELINE})와 정확히 같아야 한다`, () => {
    const files = productionSourceFiles(SRC, ['.tsx', '.jsx']);

    // false-green 방지: 스캔이 조용히 비면 통과처럼 보인다 → 명시적으로 파손 처리
    if (files.length < MIN_SCANNED_FILES) {
      throw new Error(
        `게이트 무결성 파손: .tsx/.jsx 스캔 건수(${files.length})가 예상 하한(${MIN_SCANNED_FILES}) 미만 — 스캔/경로 파손 의심.`,
      );
    }

    const actual: Record<string, number> = {};
    for (const f of files) {
      const m = readFileSync(f, 'utf8').match(PATTERN);
      if (m && m.length > 0) actual[relative(join(SRC, '..'), f).split(sep).join('/')] = m.length;
    }
    const diff = frozenTableDiff(actual, FROZEN);
    if (diff.length > 0) {
      const total = Object.values(actual).reduce((sum, count) => sum + count, 0);
      const direction = total > BASELINE
        ? `신규 ${total - BASELINE}건 증가`
        : total < BASELINE
          ? `${BASELINE - total}건 감소 — 개선분을 확정하려면 BASELINE_BY_FILE 을 실측으로 내릴 것`
          : '파일 사이에서 옮겨졌다 — 동결표를 실측에 맞출 것';
      throw new Error(
        `🚦 [STATUS COLOR GUARD] status 팔레트 하드코딩 ${total}건 != 동결 ${BASELINE}건 — ${direction}.\n` +
        `success/warning/destructive 토큰으로 작성하세요 — globals.css 시맨틱 토큰(success/warning/info/destructive)(docs/03-guides/design-tokens.md).\n` +
        diff.join('\n'),
      );
    }
  });
});
