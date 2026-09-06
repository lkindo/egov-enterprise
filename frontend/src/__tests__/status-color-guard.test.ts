import { describe, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
 * 감소했는데 BASELINE 을 안 내리면 실패시켜 개선분 확정을 강제한다(단방향이면 개선이 슬랙으로 녹아 사라진다).
 *
 * 치환 지침(docs/03-guides/design-tokens.md):
 *   green/emerald 계열 → `text-success` / `bg-success` / `border-success`
 *   amber/yellow/orange 계열 → `text-warning` / `bg-warning`
 *   red/rose 계열 → `text-destructive` / `bg-destructive` / `*-destructive-emphasis`
 *   정보성 blue 계열은 기존 가드 소관(`text-info`)
 *
 * 데이터 시각화의 명암 스케일(히트맵·차트 등)처럼 의미상 팔레트가 필요한 자리는 예외가 될 수 있다.
 * 그 경우 사유를 코드 리뷰에 명시하고 BASELINE 을 올린다 — 단, 목록을 늘려 신호를 지우는 것과
 * 정당한 예외를 구분하는 것은 리뷰어의 책임이다(AGENTS.md Evidence guardrails H2).
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

// 기존 가드(hardcoded-color-guard.test.ts)가 명시적으로 제외한 계열 — 두 게이트의 합집합이 전 팔레트다.
const STATUS_COLORS = 'red|green|emerald|rose|amber|orange|yellow|lime|pink';
const UTIL = 'text|bg|border|ring|divide|from|to|via|placeholder|fill|stroke|shadow|ring-offset|caret|outline|decoration|accent';
const VARIANT = '(?:dark:|hover:|focus:|group-hover:|focus-within:|active:|group-focus-within:)?';
const PATTERN = new RegExp(`${VARIANT}(?:${UTIL})-(?:${STATUS_COLORS})-[0-9]{2,3}(?:\\/[0-9]{1,3})?`, 'g');

// [동결 2026-08-16] 게이트 신설 시점 실측 census. 래칫의 정상 방향은 감소다.
// [하향 래칫 2026-08-21] demo/fake 상태 문구 정직성, shell 대비, 알림·오류 상태 수리에서 status 리터럴 12건 제거.
// [하향 래칫 2026-08-21(2)] r4 접근성 triage에서 오류·완료·onboarding 상태색 12건을 semantic pair로 치환.
// [하향 래칫 2026-08-21(3)] board maker의 template/완료 상태 리터럴 6건을 success/destructive/warning pair로 치환.
// [하향 래칫 2026-08-21(4)] onboarding 단계 아이콘 2건을 destructive/success semantic emphasis로 치환.
// [하향 래칫 2026-08-21(5)] r6 dark dashboard의 감사 상태 라벨 1건을 success-emphasis로 치환.
// [하향 래칫 2026-08-21(6)] KnowledgeHub FAQ 공개 상태 1건을 theme-aware success emphasis token으로 이행.
// [하향 래칫 2026-08-23] hub 프리미티브 대비 수리 — HubMetrics 아이콘/트렌드 19건, HubStatusBadge 상태 변형 9건을
//   양 프로필 4.5:1 검증된 success/warning/destructive pair로 치환(라이트 1.10:1 오류 아이콘·1.23:1 상태 라벨 해소).
// [하향 래칫 2026-08-23(2)] StatusBadge 승인/반려 8건과 Badge success 변형 3건(2.54:1 미소비 변형)을
//   계약 검증된 채움형 pair(bg-X + text-X-foreground)로 치환.
// [하향 래칫 2026-08-23(3)] hub 토큰 다크 재정의(themes/*.css)로 HubListCard 21건·HubSummaryCard 16건의
//   dark: 팔레트 fallback 을 hub-* 토큰으로 회수(전 값 양 테마 AA 실측, 토큰 주석 참조).
// [하향 래칫 2026-08-23(4)] 결재 허브·기안 화면의 계측 없는 장식 지표 제거(m-4 정직성 정리)로
//   emerald/rose 리터럴 10건 제거(퀵액션 오버레이 4·가짜 컴플라이언스 카드 2·'검증된 경로' 칩 2·
//   기안 화면 'Encryption Active'/'Logic Path' 각 1).
// [하향 래칫 2026-08-23(5)] 공통코드 밀집화(m-3) — 계층 Save 버튼 emerald 2건(bg-emerald-500·
//   hover:bg-emerald-600)을 success pair 로, 상세코드 삭제 버튼 rose 2건(text-rose-500·
//   hover:bg-rose-50)을 destructive pair 로 치환(m-3 단독 사전 red 실측: 672 != 676;
//   m-4 하향과 병합해 666→662).
// [하향 래칫 2026-08-23(4)] m-2: 라우트가 렌더하지 않는 test-only 死화면
//   admin/user/manage/UserManageClient.tsx 삭제로 status 리터럴 6건 감소(실측 676→670 red 확인 후 하향).
// [병합 확정 2026-08-23] main(666)과 m-2(-6)의 독립 하향을 병합 트리 실측 660으로 확정.
// [병합 확정 2026-08-23(2)] main(660)과 m-3(-4)의 독립 하향을 병합 트리 실측 656으로 확정.
// [하향 래칫 2026-08-24] A1 archetype 이행(W3) — 주소록 목록의 삭제 버튼 rose 2건
//   (hover:bg-rose-500/10·hover:text-rose-500)을 destructive pair 로 치환(사전 red 실측: 654 != 656).
// [하향 래칫 2026-08-24(2)] W3 wave 2 — 행사 운영 센터의 장식 카운터 카드(rose 그라데이션 1건)
//   제거로 감소(사전 red 실측: 653 != 654).
// [하향 래칫 2026-08-24(3)] A2 메뉴·부서 이행에서 선택·저장·삭제 상태 팔레트를
//   primary/destructive/Button semantic variant로 회수(사전 red 실측: 642 != 653).
// [하향 래칫 2026-08-24(4)] A2 메일 이력 이행에서 성공·대기·실패 badge와 삭제·상세 surface의
//   emerald/amber/rose 리터럴 13건을 success/warning/destructive pair로 회수(사전 red 실측: 629 != 642).
// [하향 래칫 2026-08-24(5)] A2 공통코드 이행에서 상세코드 폼의 필수·오류·사용 상태
//   rose/emerald 리터럴 8건을 destructive/success emphasis 토큰으로 회수(사전 red 실측: 621 != 629).
// [하향 래칫 2026-08-24(5)] 결재함 A2 이행 — 상세 승인/반려 버튼의 emerald·rose 리터럴 4건을
//   기본·destructive 버튼 variant 로 이행(사전 red 실측: 617 != 621).
// [하향 래칫 2026-08-24(6)] 권한 매트릭스 A5 계약 — 허용 셀 지표의 emerald 리터럴 1건을
//   surface-inverse-foreground 로 이행(사전 red 실측: 616 != 617).
// [하향 래칫 2026-08-25] 약식 결재 A1 이행 — 지표 카드의 amber/emerald/rose 계열 리터럴이
//   결과 툴바 한 줄 요약으로 수렴하며 1건 감소(사전 red 실측: 615 != 616).
// [하향 래칫 2026-08-25(2)] 관리자 통계 A7 이행 — 장식 지표 카드(LuxuryStatCard)의
//   emerald/indigo/rose 계열 리터럴 7건이 셸의 요약 지표로 수렴하며 제거(사전 red 실측: 608 != 615).
// [하향 래칫 2026-08-25(3)] 설문 통계 A7 이행 — amber 계열 장식(아이콘 배경·강조 텍스트·
//   포커스 링) 10건이 셸의 요약 지표·조회 조건으로 수렴하며 제거(사전 red 실측: 598 != 608).
// [하향 래칫 2026-08-25(4)] 게시판 마스터 A1 이행 — 지표 카드(emerald/amber 강조) 2건이
//   결과 툴바 한 줄 요약으로 수렴하며 제거(사전 red 실측: 596 != 598).
// [하향 래칫 2026-08-25(5)] 온라인 설문 관리 A1 이행 — 지표 카드(emerald 강조) 1건이
//   결과 툴바 한 줄 요약으로 수렴하며 제거(사전 red 실측: 595 != 596).
// [하향 래칫 2026-08-25(6)] 조직 권한 일괄 관리 A2 이행 — rose-500 경고 아이콘·밑줄 강조
//   3건이 평문 안내 문구로 수렴하며 제거(사전 red 실측: 592 != 595).
// [하향 래칫 2026-08-26] frontend 입력 검증 루프 — 신규 오류 안내·삭제 동작의 status 색을
//   모두 destructive semantic token으로 작성하고, 인접 폼 정리에서 기존 리터럴 44건을 제거
//   (최종 diff 신규 status 리터럴 0건, 사전 red 실측: 548 != 592).
// [하향 래칫 2026-08-27] 세션 연장 실패 안내 — 실패 성격을 둘로 나누며 추가한 안내 문단과
//   기존 문단의 rose 리터럴 4건을 destructive semantic token으로 대체
//   (신규 리터럴 0건, 사전 red 실측: 550 != 548 → 546 != 548).
// [하향 래칫 2026-08-28] 포상 '승인상태' 열 제거 — confmYn 을 'Y' 로 바꾸는 경로가 제품에
//   없어(컨트롤러 GET/POST 뿐, 서비스에 갱신 메서드 없음) 전 건 영구 '대기중'이던 배지를
//   열째로 걷어내며 emerald 리터럴 3건이 함께 사라졌다. 신규 status 리터럴 0건
//   (사전 red 실측: 543 != 546 — 게이트가 직접 543 으로 내리라고 지시).
// [하향 래칫 2026-08-28(2)] 커뮤니티 상세의 가짜 'Member_Pulse' 패널 제거 — 하드코딩한 다섯
//   명을 접속 중처럼 보이게 하던 emerald 점 리터럴 1건이 패널과 함께 사라졌다. 신규 status
//   리터럴 0건(사전 red 실측: 542 != 543 — 게이트가 직접 542 로 내리라고 지시).
// [하향 래칫 2026-08-29] 설문 응답 상세의 '검증된 응답' 배지 제거 — 조건 없이 모든 응답에
//   붙던 고정 표시였고(서버 DTO 에 검증 여부 필드 자체가 없다) 초록 체크가 "이 응답은
//   확인됐다" 는 뜻으로 읽혔다. 배지와 함께 emerald 리터럴 2건이 사라졌다. 신규 status
//   리터럴 0건(사전 red 실측: 540 != 542 — 게이트가 직접 540 으로 내리라고 지시).
// [하향 래칫 2026-08-29(2)] 알림 드로어의 '알림 전체 삭제' 휴지통 버튼 제거 — onClick 이 전혀
//   없어 눌러도 아무 일이 없는데 hover 시 빨갛게 변해 파괴적 동작을 예고했다(서버에 일괄 삭제
//   경로가 없다). 버튼과 함께 rose 리터럴 2건(hover:text-rose-500·hover:border-rose-200)이
//   사라졌다. 신규 status 리터럴 0건(사전 red 실측: 538 != 540 — 게이트가 직접 538 로 내리라고 지시).
// [하향 래칫 2026-08-29(3)] 관리자 홈 감사 타임라인의 죽은 액션 3개('분석 리포트 생성'·
//   '시각화 검증'·'스냅샷 롤백')와 거짓 시스템 상태 2줄 제거 — 넷 다 onClick 이 없었고,
//   특히 빨간 '스냅샷 롤백' 은 되돌릴 API 가 없는데 파괴적 동작을 예고했다. 함께 사라진
//   status 리터럴 6건(rose 계열 4·emerald 1·초록 점 1). 신규 status 리터럴 0건
//   (사전 red 실측: 532 != 538 — 게이트가 직접 532 로 내리라고 지시).
// [하향 래칫 2026-08-29(4)] 알림 표의 '우선순위' 열 제거 — 서버는 우선순위를 저장하지 않고
//   (NotificationDto 에 필드 없음) 값은 제목 키워드 -> 분류 -> 우선순위로 두 단계 파생한 것이라
//   제목에 '보안' 이 없는 긴급 알림은 언제나 'low' 로 보였다. 열과 함께 rose 리터럴 2건
//   (text-rose-600·text-rose-400)이 사라졌다. 신규 status 리터럴 0건
//   (사전 red 실측: 530 != 532 — 게이트가 직접 530 으로 내리라고 지시).
// [하향 래칫 2026-08-29(5)] 로그인 정책의 'ENFORCE_MFA_AUTHENTICATION' 문구 제거 — 제품
//   어디에도 없는 식별자를 한국어 라벨 밑에 초록색으로 붙여 두어 이미 적용된 설정 이름처럼
//   읽혔다. 문구와 함께 emerald 리터럴 1건(text-emerald-600)이 사라졌다. 신규 status 리터럴 0건
//   (사전 red 실측: 529 != 530 — 게이트가 직접 529 로 내리라고 지시).
// [하향 래칫 2026-09-03] 본문 편집기의 가짜 상태 푸터 제거 — 초록 점 + 'Ready for Production'
//   이 어떤 상태도 가리키지 않았고(그런 상태값이 서버에도 화면에도 없다) 옆의
//   '{길이} _ CHARACTERS_LOGGED' 도 실재하지 않는 로깅을 주장했다. 푸터를 사실(글자 수)과
//   저장 형식 안내로 바꾸며 emerald 리터럴 1건(bg-emerald-500)이 사라졌다. 신규 status 리터럴 0건
//   (사전 red 실측: 528 != 529 — 게이트가 직접 528 로 내리라고 지시).
// [2026-09-05 DEC-OPS-034] 528 → 522. 게시글 작성 화면 3종을 정본 하나로 수렴하면서 삭제된
//   CommunityBoardsWriteClient(text-rose-500 등 6건)의 하드코딩이 사라졌다 — 개선분 확정(하향).
// [2026-09-06 DEC-OPS-038] 522 → 521: 알림 발송 데모(notification-sender.tsx)를 걷으며 그 안의 status 팔레트 하드코딩 1건이 사라졌다.
const BASELINE = 521;

// 게이트 무결성 하한 — 기존 가드와 동일 축(스캔 파손 시 vacuous 통과 차단).
const MIN_SCANNED_FILES = 50;

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next' || e.name === '__tests__') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...collectFiles(p));
    else if (/\.(tsx|jsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}

describe('status 색 하드코딩 차단 게이트 (기존 색상 가드의 제외 계열 봉합)', () => {
  it(`status 계열 하드코딩 occurrence 는 BASELINE(${BASELINE}) 과 정확히 같아야 한다`, () => {
    const files = collectFiles(SRC);

    // false-green 방지: 스캔이 조용히 비면 통과처럼 보인다 → 명시적으로 파손 처리
    if (files.length < MIN_SCANNED_FILES) {
      throw new Error(
        `게이트 무결성 파손: .tsx/.jsx 스캔 건수(${files.length})가 예상 하한(${MIN_SCANNED_FILES}) 미만 — 스캔/경로 파손 의심.`,
      );
    }

    let total = 0;
    const offenders: Array<{ file: string; count: number }> = [];
    for (const f of files) {
      const m = readFileSync(f, 'utf8').match(PATTERN);
      if (m && m.length > 0) {
        total += m.length;
        offenders.push({ file: f.replace(SRC, 'src'), count: m.length });
      }
    }

    if (total !== BASELINE) {
      offenders.sort((a, b) => b.count - a.count);
      const direction = total > BASELINE
        ? `신규 ${total - BASELINE}건 증가 — success/warning/destructive 토큰으로 작성하세요`
        : `${BASELINE - total}건 감소 — 개선분을 확정하려면 BASELINE 을 ${total}로 내릴 것`;
      throw new Error(
        `🚦 [STATUS COLOR GUARD] status 팔레트 하드코딩 ${total}건 != 베이스라인 ${BASELINE} — ${direction}.\n` +
        `globals.css 시맨틱 토큰(success/warning/info/destructive)으로 대체하세요(docs/03-guides/design-tokens.md).\n` +
        `상위 파일:\n` + offenders.slice(0, 10).map(o => `  ${o.count}  ${o.file}`).join('\n'),
      );
    }
  });
});
