// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frozenInProjection, frozenTableDiff } from '@/test-utils/projection';
import { codeWithoutComments, productionSourceFiles } from '../../../scripts/code-without-comments.mjs';

/**
 * 색 관련 생산 소스 불변식 가운데 ESLint 로 옮기지 않은 둘 — 흐린 보조 글자의 장식 한정과 HEX 리터럴 금지.
 *
 * [2026-11-18 DEC-OPS-420] 팔레트 원색(중립·브랜드 액센트·상태색)의 파일별 동결표는 걷었다. 판정은 eslint.config.mjs 의
 * local-theme/enforce-design-tokens 하나이고, 남은 동결분은 그 줄 바로 위의 동결 표지(palette-frozen)로 남는다
 * (eslint-palette-color.test.ts 가 실제 설정으로 확인한다).
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 색 리터럴을 세는 모집단 — 화면을 그리는 .tsx/.jsx 생산 소스. */
const colorSources = () => productionSourceFiles(SRC, ['.tsx', '.jsx']);

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
