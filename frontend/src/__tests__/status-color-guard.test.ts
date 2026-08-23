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
const BASELINE = 656;

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
