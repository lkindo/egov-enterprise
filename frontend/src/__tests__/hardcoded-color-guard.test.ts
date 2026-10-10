import { describe, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frozenInProjection } from '@/test-utils/projection';

/**
 * 🔗 하드코딩 색상 차단 게이트 — 브랜딩 토큰화(§2.B) 드리프트 방지.
 *
 * 중립(slate/gray/zinc/neutral/stone) + 브랜드 액센트(blue/indigo/sky/violet/purple/cyan/teal/fuchsia)
 * 하드코딩 Tailwind 팔레트 클래스는 globals.css 시맨틱/hub-* 토큰으로 대체해야 한다
 * (docs/03-guides/design-tokens.md). 리브랜딩=토큰 편집을 성립시키는 불변식.
 *
 * 현재 잔여(파스텔 틴트·히트맵 명암스케일 등 의도적 미치환)는 BASELINE 으로 동결(grandfather)하고,
 * 증가뿐 아니라 감소 후 기준선 미갱신도 차단한다. status 색(red/green/emerald/rose/amber/orange/yellow/lime/pink)은
 * 성공/경고/오류 시맨틱이라 제외한다(별도 success/warning/destructive 토큰 대상).
 *
 * 신규 코드가 팔레트 리터럴을 추가하면 이 게이트가 실패한다 → 기본 정책은 토큰으로 바꾸는 것이다.
 * 소스와 BASELINE 을 함께 올리는 변경은 자동 게이트가 과거값 없이 구별할 수 없으므로, 불가피한 예외는
 * 사유를 코드 리뷰에 명시해 승인받는다. 기준선의 일반적인 래칫 방향은 감소다.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const NEUTRAL_AND_BRAND = 'slate|gray|zinc|neutral|stone|blue|indigo|sky|violet|purple|cyan|teal|fuchsia';
const UTIL = 'text|bg|border|ring|divide|from|to|via|placeholder|fill|stroke|shadow|ring-offset|caret|outline|decoration|accent';
const VARIANT = '(?:dark:|hover:|focus:|group-hover:|focus-within:|active:|group-focus-within:)?';
const PATTERN = new RegExp(`${VARIANT}(?:${UTIL})-(?:${NEUTRAL_AND_BRAND})-[0-9]{2,3}(?:\\/[0-9]{1,3})?`, 'g');

// [동결 2026-07-18] 브랜딩 토큰화(중립 861 + 액센트 195) 이후 잔여 census.
// 자동 검사는 현재 census와의 exact 일치를 강제하고, 동시 상향 금지는 위 코드 리뷰 정책으로 통제한다.
// [하향 래칫 2026-07-18(2)] 死 camelCase 게시판 라우트 3종 삭제로 40 감소 → 247→207.
// [하향 래칫 2026-08-13] 실측 104까지 감소했으나 기준선이 207에 머물러 있던 103건의 여유를 제거.
// [하향 래칫 2026-08-16] reusable-base 정리로 미사용 대시보드 위젯의 하드코딩 색상 1건 제거.
// [하향 래칫 2026-08-21] 허위 command/status 문구 제거와 contextual contrast 수리로 중립/브랜드 리터럴 2건 제거.
// [하향 래칫 2026-08-21(2)] r4 접근성 triage에서 preview·onboarding·editor의 저대비 중립 리터럴 20건을 semantic token으로 치환.
// [하향 래칫 2026-08-21(3)] board maker의 template/action 중립 리터럴 3건도 검증된 semantic pair로 치환.
// [하향 래칫 2026-08-23] HubStatusBadge default 라벨의 저대비 중립 리터럴 1건을 muted pair로 치환.
// [하향 래칫 2026-08-23(2)] StatusBadge 대기 상태의 blue 리터럴 4건을 계약 검증된 info pair로 치환.
// [하향 래칫 2026-08-23(3)] HubListCard 장식 점의 slate 리터럴 1건을 theme-aware border 토큰으로 치환.
// [하향 래칫 2026-08-23(4)] 결재 허브의 hover 전용 퀵액션 오버레이 제거(m-4 전폭·정직성 정리)로
//   dark:from/via-slate-800 그라데이션 리터럴 2건 제거.
// [하향 래칫 2026-08-23(5)] 공통코드 밀집화(m-3) — 신규 등록 버튼의 bg-slate-900 1건을 Button 기본
//   variant(bg-primary 토큰)로 회수(m-3 단독 사전 red 실측: 71 != 72; m-4 하향과 병합해 70→69).
// [하향 래칫 2026-08-24] A2 메뉴·부서 이행에서 장식 색을 semantic surface/primary 토큰으로 회수
//   (사전 red 실측: 66 != 69).
// [하향 래칫 2026-08-25] 게시판 마스터 A1 이행 — 영문 마케팅 배너(rgba 그림자·slate 리터럴)
//   제거로 2건 감소(사전 red 실측: 64 != 66).
// [하향 래칫 2026-08-25(3)] 조직 권한 일괄 관리 A2 이행 — slate-100/slate-200 하드코딩
//   3건이 셸의 빈 상태·토큰 문구로 수렴하며 제거(사전 red 실측: 61 != 64).
// [하향 래칫 2026-09-05] DEC-OPS-034 작성 화면 수렴으로 삭제된 CommunityBoardsWriteClient 의 bg-slate-900 1건 제거 → 61→60.
// Superseded role/authority forms removed five legacy color occurrences.
// [하향 래칫 2026-09-16] 결재선의 단계 상태를 semantic 토큰으로 표현하며 ApprovalStepper의 브랜드색 2건 제거.
// [하향 래칫 2026-09-20] 53 -> 50. 그룹별 메뉴 현황의 미선택 안내가 text-slate-200·text-slate-300 으로
//   조판돼 있었다 — 라이트에서 대비 미달이고 다크에서는 배경과 거의 같은 색이다. 히어로 문구를
//   한 줄 안내로 바꾸며 muted 토큰으로 회수했다(사전 red 실측: 50 != 53).
// [하향 래칫 2026-09-20(2)] 50 -> 43. 같은 템플릿의 갤러리 플레이스홀더 그라데이션(indigo·purple),
//   아바타 상자 slate 그라데이션, FAQ 펼침 indigo 강조, 위키 hover 테두리 7건을 걷었다.
//   ⚠ 이 가드는 주석도 센다 — 이행 설명에 클래스 이름을 적으면 그만큼 수치가 남는다(실측).
// [하향 래칫 2026-09-20(3)] 43 -> 39. 결재 양식 허브(정적 데모)의 4건. 검색 아이콘과 단계 화살표가
//   중립 팔레트 리터럴로 조판돼 다크에서 배경과 겹쳤고, 배포 버튼과 승인 단계 아이콘은 흰색
//   리터럴이라 버튼 색을 바꾸면 글자가 사라진다. 넷 다 대응 전경 토큰으로 회수했다.
// [하향 래칫 2026-09-20(4)] 39 -> 34. 배너·팝업 관리의 5건. 다크 표면 위 흰색 리터럴과
//   선택 컨트롤 테두리의 중립 팔레트 리터럴을 대응 토큰으로 회수했다.
// [하향 래칫 2026-09-20(5)] 34 -> 33. 기관코드 목록의 상태 점 1건을 중립 토큰으로 회수했다.
// [하향 래칫 2026-09-20(6)] 33 -> 32. 게시판 미리보기 위키 카드의 중립 팔레트 hover 테두리 1건.
// [하향 래칫 2026-09-20(7)] 32 -> 25. 같은 배치 7건. 게시판 글 목록 제목이 중립 그라데이션 위에
//   투명 글자로 조판돼 다크에서 사라졌고, 빈 목록 안내는 중립 리터럴을 상속해 라이트에서 약 1.5:1
//   이었다. 댓글 카드의 반투명 흰색 표면도 함께 회수했다.
// [하향 래칫 2026-09-20(8)] 25 -> 21. 쪽지함 4건. 상세 모달의 작성 시각이 중립 리터럴로
//   라이트에서 약 1.5:1 이었고, 본문 패널의 흰색 링이 다크에서 밝은 테두리로 남았다.
// [하향 래칫 2026-09-25] 18 -> 10. DEC-OPS-129 로 네트워크 관리 화면·폼과 인프라 구성도 지도를 걷으며 8건이 함께 사라졌다.
//   토큰 치환이 아니라 표면 제거이며 새 리터럴은 0건이다.
// [하향 래칫 2026-10-07] 10 -> 9. 참조처 0건인 고아 컴포넌트(admin/components/InsightBanner.tsx)를 지우며 1건이 함께
//   사라졌다. 표면 제거이며 새 리터럴은 0건이다.
const BASELINE = 9;
// [2026-10-10 Phase 2 D6] 총계를 파일별로도 동결한다 — 재사용 생성물에서는 투영으로 빠진 파일의 몫만 뺀다(원장 확인).
//   합은 BASELINE 과 같아야 한다(아래 계약). 리터럴을 줄이거나 옮기면 이 표와 BASELINE 을 함께 고친다.
const BASELINE_BY_FILE: Record<string, number> = {
  'src/app/admin/community/boards/select-board-list/components/BoardPagination.tsx': 1,
  'src/app/admin/community/templates/TemplateAdminClient.tsx': 1,
  'src/app/cop/sms/selectSmsList/SmsHubClient.tsx': 1,
  'src/app/global-error.tsx': 4,
  'src/app/search/SearchClient.tsx': 1,
  'src/components/features/dashboard/RealTimeDashboard.tsx': 1,
};

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

describe('하드코딩 색상 차단 게이트 (§2.B 브랜딩 토큰화 드리프트 방지)', () => {
  it(`중립+브랜드액센트 하드코딩 occurrence 는 BASELINE(${BASELINE}) 과 정확히 같아야 한다`, () => {
    const files = collectFiles(SRC);

    // 게이트 무결성(false-green 방지): 스캔이 조용히 0건이면 vacuous 통과 → 차단
    if (files.length < 50) {
      throw new Error(`게이트 무결성 파손: .tsx/.jsx 스캔 건수(${files.length})가 예상 하한(50) 미만 — 스캔/경로 파손 의심.`);
    }

    const actual: Record<string, number> = {};
    for (const f of files) {
      const m = readFileSync(f, 'utf8').match(PATTERN);
      if (m && m.length > 0) actual[relative(join(SRC, '..'), f).split(sep).join('/')] = m.length;
    }
    // 재사용 생성물에서는 투영으로 빠진 파일 몫만 뺀다(원장 확인). 원본에서는 동결표 그대로다.
    const frozen = frozenInProjection(BASELINE_BY_FILE, (file) => join(SRC, '..', file));
    const diff = [...new Set([...Object.keys(actual), ...Object.keys(frozen)])].sort()
      .filter((file) => (actual[file] ?? 0) !== (frozen[file] ?? 0))
      .map((file) => `  ${file}: 실측 ${actual[file] ?? 0} / 동결 ${frozen[file] ?? 0}`);
    if (diff.length > 0) {
      const total = Object.values(actual).reduce((sum, count) => sum + count, 0);
      const expected = Object.values(frozen).reduce((sum, count) => sum + count, 0);
      const direction = total > expected
        ? `신규 ${total - expected}건 증가`
        : total < expected
          ? `${expected - total}건 감소 — 개선분을 확정하려면 BASELINE_BY_FILE 과 BASELINE 을 함께 내릴 것`
          : '파일 사이에서 옮겨졌다 — 동결표를 실측에 맞출 것';
      throw new Error(
        `🔗 [COLOR GUARD] 하드코딩 팔레트 색 ${total}건 != 동결 ${expected}건 — ${direction}.\n` +
        `globals.css 토큰(hub-*/시맨틱)으로 대체하세요(docs/03-guides/design-tokens.md). status 색은 제외 대상.\n` +
        diff.join('\n'),
      );
    }
  });

  it('파일별 동결의 합은 BASELINE 과 같다', () => {
    const total = Object.values(BASELINE_BY_FILE).reduce((sum, count) => sum + count, 0);
    if (total !== BASELINE) throw new Error(`BASELINE_BY_FILE 합 ${total} != BASELINE ${BASELINE} — 둘을 함께 고친다.`);
  });
});

/**
 * [2026-10-01] 흐린 보조 글자(`text-muted-foreground/10~60`, `placeholder:` 포함)는 장식에만 둔다.
 *
 * 그룹 설명·ID 라벨·로그 시각·작성자·등록일 같은 데이터 글자에 쓰여 흰 배경 대비가 1.67~2.49:1 이었다(WCAG 1.4.3
 * 기준 4.5:1). 토큰 대비 계약은 불투명도 수식어를 보지 않아 잡지 못했다. 데이터 글자 19곳은 걷었고, 남은 것은 모두
 * 보조기술에서 뺀 장식(빈 상태 아이콘·구분자·연결선)이다. 파일별로 동결해 데이터 글자에 새로 쓰면 red 가 된다 —
 * 장식이면 aria-hidden 과 함께 이 표에 사유를 남긴다.
 */
const MUTED_OPACITY = /\btext-muted-foreground\/[1-6]0\b/g;
const MUTED_OPACITY_BASELINE: Record<string, number> = {
  'src/app/admin/community/board/CommunityBoardClient.tsx': 2, // 빈 상태 아이콘, 행 화살표(aria-hidden)
  'src/app/admin/survey/components/SurveyQuestionsPanel.tsx': 2, // 빈 상태 아이콘, 가운뎃점 구분자(aria-hidden)
  'src/app/admin/survey/components/SurveyTemplatesPanel.tsx': 1, // 빈 상태 아이콘(aria-hidden)
  'src/app/admin/system/logs/user/SystemLogsUserClient.tsx': 5, // 건수 사이 '/' 구분자(aria-hidden)
  'src/app/components/ui/global-command-center.tsx': 1, // 빈 결과 아이콘(aria-hidden)
  'src/app/components/ui/standard-data-table.tsx': 1, // 검색창 돋보기(aria-hidden)
  'src/app/components/ui/workflow-canvas.tsx': 2, // 노드 연결선·화살촉(svg aria-hidden)
  'src/app/search/SearchClient.tsx': 1, // 빈 결과 아이콘(aria-hidden)
  'src/app/survey/components/SurveyStatsPanel.tsx': 1, // 빈 상태 아이콘(aria-hidden)
};

describe('흐린 보조 글자는 장식에만 (저대비 동결)', () => {
  it('파일별 사용 수가 동결값과 정확히 같다 — 데이터 글자에 새로 쓰면 red', () => {
    const actual: Record<string, number> = {};
    for (const f of collectFiles(SRC)) {
      const m = readFileSync(f, 'utf8').match(MUTED_OPACITY);
      if (m && m.length > 0) actual[f.replace(SRC, 'src').split(sep).join('/')] = m.length;
    }
    // 재사용 생성물에서는 투영으로 빠진 파일의 동결값만 뺀다(원장 확인).
    const frozen = frozenInProjection(MUTED_OPACITY_BASELINE, (file) => join(SRC, '..', file));
    const diff = [...new Set([...Object.keys(actual), ...Object.keys(frozen)])]
      .filter((file) => (actual[file] ?? 0) !== (frozen[file] ?? 0))
      .map((file) => `  ${file}: 실측 ${actual[file] ?? 0} / 동결 ${frozen[file] ?? 0}`);
    if (diff.length > 0) {
      throw new Error(
        '🔗 [CONTRAST GUARD] text-muted-foreground/10~60 사용이 동결값과 다르다.\n'
        + '데이터 글자면 불투명도를 걷고(text-muted-foreground), 장식이면 aria-hidden 과 함께 동결표를 갱신하라.\n'
        + diff.join('\n'),
      );
    }
  });
});
