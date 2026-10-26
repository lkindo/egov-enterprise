// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frozenInProjection, frozenTableDiff } from '@/test-utils/projection';
import { codeWithoutComments, productionSourceFiles } from '../../../scripts/code-without-comments.mjs';

/**
 * 🔗 하드코딩 색상 차단 게이트 — 브랜딩 토큰화(§2.B) 드리프트 방지.
 *
 * 중립(slate/gray/zinc/neutral/stone) + 브랜드 액센트(blue/indigo/sky/violet/purple/cyan/teal/fuchsia)
 * 하드코딩 Tailwind 팔레트 클래스는 globals.css 시맨틱/hub-* 토큰으로 대체해야 한다
 * (docs/03-guides/design-tokens.md). 리브랜딩=토큰 편집을 성립시키는 불변식.
 *
 * 현재 잔여(파스텔 틴트·히트맵 명암스케일 등 의도적 미치환)는 파일별 동결표(BASELINE_BY_FILE)로 동결(grandfather)하고,
 * 증가뿐 아니라 감소 후 기준선 미갱신도 차단한다. status 색(red/green/emerald/rose/amber/orange/yellow/lime/pink)은
 * 성공/경고/오류 시맨틱이라 제외한다(별도 success/warning/destructive 토큰 대상).
 *
 * 신규 코드가 팔레트 리터럴을 추가하면 이 게이트가 실패한다 → 기본 정책은 토큰으로 바꾸는 것이다.
 * 소스와 동결표를 함께 올리는 변경은 자동 게이트가 과거값 없이 구별할 수 없으므로, 불가피한 예외는
 * 사유를 코드 리뷰에 명시해 승인받는다. 기준선의 일반적인 래칫 방향은 감소다.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const NEUTRAL_AND_BRAND = 'slate|gray|zinc|neutral|stone|blue|indigo|sky|violet|purple|cyan|teal|fuchsia';
const UTIL = 'text|bg|border|ring|divide|from|to|via|placeholder|fill|stroke|shadow|ring-offset|caret|outline|decoration|accent';
const VARIANT = '(?:dark:|hover:|focus:|group-hover:|focus-within:|active:|group-focus-within:)?';
const PATTERN = new RegExp(`${VARIANT}(?:${UTIL})-(?:${NEUTRAL_AND_BRAND})-[0-9]{2,3}(?:\\/[0-9]{1,3})?`, 'g');

// [동결] 브랜딩 토큰화 이후 잔여 census 를 파일별로 동결한다. 자동 검사는 현재 census 와의 exact 일치를 강제하고, 동시 상향 금지는
//   위 코드 리뷰 정책으로 통제한다. 재사용 생성물에서는 투영으로 빠진 파일의 몫만 뺀다(원장 확인). 총계는 표의 합에서 계산한다 —
//   총계와 표를 이중으로 동결하면 리터럴을 줄일 때마다 코드를 보지 않는 상수 수정이 붙는다(FE-CONTRACT-07). 리터럴을 줄이거나
//   옮기면 이 표만 고친다. 기준선 증감의 이력은 git 과 결정 기록에 있다.
// ⚠ 이 가드는 주석도 센다 — 이행 설명에 클래스 이름을 적으면 그만큼 수치가 남는다(실측).
const BASELINE_BY_FILE: Record<string, number> = {
  'src/app/admin/community/templates/TemplateAdminClient.tsx': 1,
  'src/app/cop/sms/selectSmsList/SmsHubClient.tsx': 1,
  'src/app/global-error.tsx': 4,
  'src/app/search/SearchClient.tsx': 1,
  'src/components/features/dashboard/RealTimeDashboard.tsx': 1,
};

// 재사용 생성물에서는 투영으로 빠진 파일 몫만 뺀다(원장 확인). 원본에서는 동결표 그대로다. 총계는 그 합이다.
const FROZEN = frozenInProjection(BASELINE_BY_FILE, (file) => join(SRC, '..', file));
const BASELINE = Object.values(FROZEN).reduce((sum, count) => sum + count, 0);

/** 색 리터럴을 세는 모집단 — 화면을 그리는 .tsx/.jsx 생산 소스. */
const colorSources = () => productionSourceFiles(SRC, ['.tsx', '.jsx']);

describe('하드코딩 색상 차단 게이트 (§2.B 브랜딩 토큰화 드리프트 방지)', () => {
  it(`중립+브랜드액센트 하드코딩 occurrence 는 파일별 동결표(합 ${BASELINE})와 정확히 같아야 한다`, () => {
    const files = colorSources();

    // 게이트 무결성(false-green 방지): 스캔이 조용히 0건이면 vacuous 통과 → 차단
    if (files.length < 50) {
      throw new Error(`게이트 무결성 파손: .tsx/.jsx 스캔 건수(${files.length})가 예상 하한(50) 미만 — 스캔/경로 파손 의심.`);
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
        `🔗 [COLOR GUARD] 하드코딩 팔레트 색 ${total}건 != 동결 ${BASELINE}건 — ${direction}.\n` +
        `globals.css 토큰(hub-*/시맨틱)으로 대체하세요(docs/03-guides/design-tokens.md). status 색은 제외 대상.\n` +
        diff.join('\n'),
      );
    }
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
    for (const f of colorSources()) {
      const m = readFileSync(f, 'utf8').match(MUTED_OPACITY);
      if (m && m.length > 0) actual[f.replace(SRC, 'src').split(sep).join('/')] = m.length;
    }
    // 재사용 생성물에서는 투영으로 빠진 파일의 동결값만 뺀다(원장 확인).
    const frozen = frozenInProjection(MUTED_OPACITY_BASELINE, (file) => join(SRC, '..', file));
    const diff = frozenTableDiff(actual, frozen);
    if (diff.length > 0) {
      throw new Error(
        '🔗 [CONTRAST GUARD] text-muted-foreground/10~60 사용이 동결값과 다르다.\n'
        + '데이터 글자면 불투명도를 걷고(text-muted-foreground), 장식이면 aria-hidden 과 함께 동결표를 갱신하라.\n'
        + diff.join('\n'),
      );
    }
  });
});

/**
 * [2026-10-18] HEX 색상 리터럴(`#RGB`~`#RRGGBBAA`) 하드코딩 차단.
 *
 * 차트·배경·SVG 마크에 `#3B82F6` 류 HEX 리터럴을 쓰면 브랜드 프로필(`krds-aligned`)과 다크 모드를 무시한다.
 * SVG presentation attribute 는 `useChartColors()` 훅(`c.accent`·`c.series`)으로, 일반 스타일은
 * `hsl(var(--primary))`·`hsl(var(--chart-1..5))` 또는 시맨틱 유틸리티로 참조한다.
 * 유일한 허용 예외는 HTML `<input type="color">` 명세상 `#rrggbb` 문자열이 필요한 레이아웃 테마 피커
 * 프리셋 데이터(`LayoutManagerClient.tsx` / `layout-theme.ts`)뿐이다.
 */
const HEX_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const HEX_PICKER_ALLOWLIST = new Set([
  'src/app/admin/system/layout/LayoutManagerClient.tsx',
  'src/lib/theme/layout-theme.ts',
]);

describe('HEX 색상 리터럴 하드코딩 차단 게이트', () => {
  it('테마 피커 프리셋 데이터 밖의 생산 소스(.tsx/.jsx/.ts)에는 HEX 색상 리터럴이 0건이어야 한다', () => {
    const files = productionSourceFiles(SRC, ['.tsx', '.jsx', '.ts']);
    const violations: string[] = [];
    let pickerCount = 0;

    for (const f of files) {
      const rel = relative(join(SRC, '..'), f).split(sep).join('/');
      const code = codeWithoutComments(readFileSync(f, 'utf8'), f);
      const matches = code.match(HEX_COLOR_PATTERN);
      if (!matches || matches.length === 0) continue;

      if (HEX_PICKER_ALLOWLIST.has(rel)) {
        pickerCount += matches.length;
      } else {
        violations.push(`${rel}: ${matches.length}건 (${matches.join(', ')})`);
      }
    }

    expect(
      violations,
      `🔗 [HEX COLOR GUARD] 테마 피커 밖에서 하드코딩 HEX 색상 리터럴이 발견됐습니다.\n` +
        `차트는 useChartColors()(c.accent / c.series), 일반 스타일은 시맨틱 토큰을 사용하세요.\n` +
        violations.join('\n'),
    ).toEqual([]);

    const layoutExists = existsSync(join(SRC, 'app', 'admin', 'system', 'layout', 'LayoutManagerClient.tsx'));
    if (layoutExists) {
      expect(pickerCount, '테마 피커 프리셋 HEX 리터럴 총계(기본값 1 + 스와치 4 = 5)').toBe(5);
    }
  });
});
