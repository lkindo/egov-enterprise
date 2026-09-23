import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO_DIR = join(FRONTEND_DIR, '..');
const GLOBALS_PATH = join(FRONTEND_DIR, 'src', 'app', 'globals.css');
const CATALOG_PATH = join(REPO_DIR, 'docs', '02-architecture', 'work-screen-grammar-catalog.md');

const GLOBALS_CSS = readFileSync(GLOBALS_PATH, 'utf8');
const CATALOG_MD = readFileSync(CATALOG_PATH, 'utf8');

/**
 * 업무 화면 문법 카탈로그 ↔ 밀도 토큰 계약.
 *
 * 카탈로그(docs/02-architecture/work-screen-grammar-catalog.md) §4 는 `compact` 밀도의
 * 합격선을 토큰 값에서 산출한다(행 높이 = 2×--cell-py + 본문 줄 높이 …). 그래서 표의 값이
 * globals.css 와 어긋나는 순간 문서가 조용히 거짓이 되고, 그 위에 세운 파일럿 합격 판정도
 * 함께 무의미해진다. 여기서 막는 것은 "문서가 코드보다 오래된 상태"다.
 *
 * 이 계약이 지키는 것:
 *   ① `:root[data-density="compact"]` 토큰 블록과 카탈로그 §4 표가 **양방향 exact 일치**
 *      (CSS 에만 있는 토큰 = 문서 누락 / 문서에만 있는 토큰 = 유령 계약, 둘 다 red)
 *   ② 값 문자열까지 일치 (2rem → 2.25rem 같은 조용한 밀도 변경 차단)
 *   ③ 카탈로그가 이 테스트 파일을 정본 결속 근거로 명시 (테스트 이름 변경 시 문서도 함께 갱신)
 *
 * 정본은 CSS 다. 값이 바뀌면 CSS 를 먼저 고치고 카탈로그 표를 같은 변경에서 갱신한다.
 */

/** `/* … *\/` 주석을 제거한다 — 주석 안의 예시 값이 선언으로 오인되지 않게 한다. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * 셀렉터 바로 뒤에 오는 블록 본문을 돌려준다.
 * `:root[data-density="compact"] .standard-data-table-responsive thead th` 처럼
 * 같은 접두사를 가진 후행 블록과 섞이지 않도록 여는 중괄호가 붙어 있는 것만 고른다.
 */
function densityBlockBody(css: string): string {
  const match = /:root\[data-density="compact"\]\s*\{/.exec(css);
  if (!match) return '';
  const start = match.index + match[0].length;
  const end = css.indexOf('}', start);
  return end === -1 ? '' : css.slice(start, end);
}

/** `--key: value;` 선언을 key → value 맵으로 뽑는다. */
function declarations(cssBlock: string): Map<string, string> {
  const entries = [...stripComments(cssBlock).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)];
  return new Map(entries.map(([, key, value]) => [key, value.trim()]));
}

/** 카탈로그 §4 의 `<!-- density-contract:start -->` ~ `end` 구간 표를 맵으로 뽑는다. */
function catalogDensityTable(markdown: string): Map<string, string> {
  const section = /<!-- density-contract:start -->([\s\S]*?)<!-- density-contract:end -->/.exec(markdown);
  if (!section) return new Map();
  const rows = [...section[1].matchAll(/^\|\s*`(--[a-z0-9-]+)`\s*\|\s*`([^`]+)`\s*\|/gm)];
  return new Map(rows.map(([, token, value]) => [token, value.trim()]));
}

describe('Work screen grammar catalog ↔ density token contract', () => {
  const cssTokens = declarations(densityBlockBody(GLOBALS_CSS));
  const docTokens = catalogDensityTable(CATALOG_MD);

  it('finds the compact density block and the catalog density table', () => {
    expect(cssTokens.size).toBeGreaterThan(0);
    expect(docTokens.size).toBeGreaterThan(0);
  });

  it('keeps the catalog token list exactly equal to the compact block', () => {
    expect([...docTokens.keys()].sort()).toEqual([...cssTokens.keys()].sort());
  });

  it('keeps every catalog value identical to its CSS declaration', () => {
    for (const [token, cssValue] of cssTokens) {
      expect(docTokens.get(token), token).toBe(cssValue);
    }
  });

  it('binds the catalog to this contract file by name', () => {
    expect(CATALOG_MD).toContain('work-screen-grammar-contract.test.ts');
  });
});

/**
 * 컨트롤 높이 ↔ 밀도 토큰 계약.
 *
 * 카탈로그 §4 는 `--control-h` 를 "기본 컨트롤(버튼·입력) 높이" 로 정한다. 그 약속은 컨트롤이
 * 높이를 토큰에서 받을 때만 참이다. 2026-09-23 실측에서 두 경로가 그 약속을 조용히 깨고 있었다.
 *
 *   ① `Input`·`Button` 에 화면이 `h-11` 같은 고정 높이를 덧붙이면 tailwind-merge 가 기본값의
 *      `h-[var(--control-h)]` 를 지운다 — `compact` 밀도가 그 컨트롤에 닿지 않는다.
 *   ② `SelectTrigger` 는 반대로 기본값이 `data-[size=default]:h-9` 로 하드코딩돼 있었다.
 *      `[data-size]` 규칙(특이도 0,2,0)이 `.h-11`(0,1,0)을 이겨 화면의 `h-11` 은 적용되지 않았고
 *      밀도 토큰도 닿지 않았다. 그래서 같은 폼에서 입력칸은 44px, 선택칸은 36px 이었다.
 *
 * 이 계약이 지키는 것:
 *   ③ 기본 컴포넌트 3종(button·input·select)이 기본 높이를 토큰으로 선언한다.
 *   ④ 밀도 대상 컨트롤에 붙은 고정 높이 덮어쓰기는 **파일별 exact 동결**이다 — 늘면 red(새 덮어쓰기),
 *      줄었는데 동결을 안 내려도 red(기록이 사실과 어긋남). 파일 단위라 한 파일에서 지우고 다른
 *      파일에 더하는 교체도 red 다. 조회조건 바는 전용 토큰 `--filter-control-h` 를 쓴다.
 *
 * 판정은 문자열 grep 이 아니라 JSX AST 다 — 여는 태그가 윗줄에 있는 다중 행 className 과
 * `cn(...)`·조건식·템플릿 안의 문자열까지 소유 요소에 귀속한다.
 */
const SRC_DIR = join(FRONTEND_DIR, 'src');
const UI_DIR = join(SRC_DIR, 'components', 'ui');

/** 기본 높이를 정의하는 파일 자체는 ③ 이 따로 본다. */
const CONTROL_DEFINITIONS = new Set([
  'components/ui/button.tsx',
  'components/ui/input.tsx',
  'components/ui/select.tsx',
]);
const DENSITY_BOUND_TAGS = new Set(['Button', 'Input', 'SelectTrigger', 'button', 'input', 'select']);
/** 텍스트 컨트롤이 아닌 input — 높이가 `--control-h` 의 대상이 아니다. */
const NON_TEXT_INPUT_TYPES = new Set(['checkbox', 'radio', 'hidden', 'range', 'color']);
/** 변형 접두(`md:` 등)를 뗀 유틸리티가 고정 높이인가. `h-[var(--…)]` 는 토큰이라 걸리지 않는다. */
const FIXED_HEIGHT = /^h-(\d+(\.\d+)?|px|\[[\d.]+(px|rem)\])$/;

/**
 * 2026-09-23 동결. 남은 `h-11` 은 도달할 수 없는 화면(DEC-OPS-023 ①)뿐이다. 나머지는 `h-10`·`h-8`
 * 등 다른 고정 높이다. 파일의 수가 줄면 여기서도 내리고, 0 이 되면 항목을 지운다.
 */
const CONTROL_HEIGHT_OVERRIDES: Readonly<Record<string, number>> = {
  'app/admin/collaboration/mail-send/MailSendHubClient.tsx': 2,
  'app/admin/collaboration/scraps/selectScrapList/ScrapListClient.tsx': 2,
  'app/admin/community/board/CommunityBoardClient.tsx': 1,
  'app/admin/community/boards/select-board-list/components/BoardPagination.tsx': 2,
  'app/admin/community/templates/TemplateAdminClient.tsx': 2,
  'app/admin/operation/external-hr/ExternalHrClient.tsx': 2,
  'app/admin/security/authority/components/AuthorizationGroupEditor.tsx': 1,
  'app/admin/security/dept-authority/SecurityDeptAuthorityClient.tsx': 2,
  'app/admin/security/group/SecurityGroupClient.tsx': 2,
  'app/admin/stats/IntelligenceHubClient.tsx': 1,
  'app/admin/survey/components/SurveyQuestionsPanel.tsx': 6,
  'app/admin/survey/components/SurveyTemplatesPanel.tsx': 1,
  'app/admin/survey/hub/SurveyHubClient.tsx': 1,
  'app/admin/system/audit/AuditTimelineClient.tsx': 1,
  'app/admin/system/common-code/CommonCodeClient.tsx': 2,
  'app/admin/system/hpcm/HpcmClient.tsx': 2,
  'app/admin/system/isg/InternetSvcGuidanceClient.tsx': 2,
  'app/admin/system/menus/MenuAdminClient.tsx': 3,
  'app/admin/system/monitoring/MonitoringHubClient.tsx': 2,
  'app/admin/system/network/NetworkAdminClient.tsx': 2,
  'app/admin/system/programs/ProgramAdminClient.tsx': 2,
  'app/admin/uss/ion/sms/SmsAdminClient.tsx': 1,
  'app/admin/uss/olh/online-manual/ManualAdminClient.tsx': 2,
  'app/admin/work-hub/WorkHubClient.tsx': 4,
  'app/admin/workflow/WorkflowClient.tsx': 2,
  'app/components/dashboard/BannerSlider.tsx': 1,
  'app/components/layout/header.tsx': 3,
  'app/components/layout/sidebar.tsx': 2,
  'app/components/ui/app-notification-drawer.tsx': 1,
  'app/components/ui/code-picker.tsx': 1,
  'app/components/ui/recipient-picker.tsx': 3,
  'app/components/ui/smart-notification-hub.tsx': 3,
  'app/components/ui/smart-onboarding-hub.tsx': 1,
  'app/components/ui/standard-data-table.tsx': 10,
  'app/components/ui/standard-modal.tsx': 1,
  'app/components/ui/standard-search-filter.tsx': 1,
  'app/cop/cmy/selectCommunityList/CommunityHubClient.tsx': 1,
  'app/cop/sms/selectSmsList/SmsHubClient.tsx': 3,
  'app/global-error.tsx': 1,
  'app/login/LoginClient.tsx': 1,
  'app/smart-toolkit/schedule/dept/ScheduleDeptClient.tsx': 6,
  'app/survey/response/SurveyResponseClient.tsx': 2,
  'components/admin/system/NetworkForm.tsx': 2,
  'components/business/deptJob/DeptJobForm.tsx': 1,
  'components/business/deptJob/DeptJobListSection.tsx': 2,
  'components/features/satisfaction/SatisfactionSection.tsx': 2,
  'components/ui/RichTextEditor.tsx': 1,
  'components/ui/hub/HubChartCard.tsx': 3,
};

interface ControlHeightOverride {
  file: string;
  line: number;
  tag: string;
  token: string;
}

function tsxSources(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'node_modules') tsxSources(full, acc);
    } else if (entry.name.endsWith('.tsx') && !/\.(test|spec)\.tsx$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function jsxAttribute(node: ts.JsxOpeningLikeElement, name: string): ts.JsxAttribute | undefined {
  return node.attributes.properties.find(
    (property): property is ts.JsxAttribute => ts.isJsxAttribute(property) && property.name.getText() === name,
  );
}

/**
 * className 안의 문자열 조각 전부. ⚠ forEachChild 는 콜백이 참값을 돌려주면 그 자리에서 순회를
 * 멈춘다 — 배열을 돌려주는 화살표 식으로 쓰면 `cn(...)` 의 첫 자식(`cn`)에서 멈춰 인자를 하나도
 * 못 본다. 이 계약을 세우며 실제로 그렇게 과소 집계했다(아래 귀속 테스트가 고정한다).
 */
function classStrings(node: ts.Node, out: string[] = []): string[] {
  if (
    ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)
  ) {
    out.push(node.text);
  }
  ts.forEachChild(node, (child) => {
    classStrings(child, out);
  });
  return out;
}

function overridesIn(file: string, text: string): ControlHeightOverride[] {
  const found: ControlHeightOverride[] = [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      const type = jsxAttribute(node, 'type')?.initializer;
      const typeText = type && ts.isStringLiteral(type) ? type.text : '';
      const className = jsxAttribute(node, 'className')?.initializer;
      if (DENSITY_BOUND_TAGS.has(tag) && className && !NON_TEXT_INPUT_TYPES.has(typeText)) {
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        for (const token of classStrings(className).join(' ').split(/\s+/)) {
          if (FIXED_HEIGHT.test(token.split(':').pop() ?? '')) found.push({ file, line, tag, token });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function controlHeightOverrides(): ControlHeightOverride[] {
  return tsxSources(SRC_DIR).flatMap((full) => {
    const file = relative(SRC_DIR, full).split(sep).join('/');
    if (CONTROL_DEFINITIONS.has(file)) return [];
    const text = readFileSync(full, 'utf8');
    return /\bh-(?:\d|px\b|\[\d)/.test(text) ? overridesIn(file, text) : [];
  });
}

describe('Control height ↔ density token contract', () => {
  it('declares the default control heights of the base components from the density tokens', () => {
    const button = readFileSync(join(UI_DIR, 'button.tsx'), 'utf8');
    expect(button).toMatch(/default:\s*"h-\[var\(--control-h\)\]/);
    expect(button).toMatch(/sm:\s*"h-\[var\(--control-h-sm\)\]/);
    expect(button).toMatch(/icon:\s*"size-\[var\(--control-h\)\]/);
    expect(readFileSync(join(UI_DIR, 'input.tsx'), 'utf8')).toContain('h-[var(--control-h)]');

    const select = readFileSync(join(UI_DIR, 'select.tsx'), 'utf8');
    expect(select).toContain('data-[size=default]:h-[var(--control-h)]');
    expect(select).toContain('data-[size=sm]:h-[var(--control-h-sm)]');
    expect(
      select,
      'SelectTrigger 기본 높이가 다시 고정됐다 — compact 밀도가 선택 컨트롤에 닿지 않는다',
    ).not.toMatch(/data-\[size=(?:default|sm)\]:h-(?:\d|\[\d)/);
  });

  it('attributes class strings inside cn(...), conditionals and templates to the owning control', () => {
    const sample = [
      'export const Sample = () => (<>',
      '  <Input',
      '    className={cn("rounded-md h-11", invalid && "md:h-12")}',
      '  />',
      '  <Button className={`px-4 ${wide ? "h-10" : ""}`}>저장</Button>',
      '  <input type="checkbox" className="h-4 w-4" />',
      '  <Input className="h-[var(--control-h)] min-h-11" />',
      '  <div className="h-11" />',
      '</>);',
    ].join('\n');
    expect(overridesIn('sample.tsx', sample).map((o) => `${o.line}:${o.tag}:${o.token}`)).toEqual([
      '2:Input:h-11',
      '2:Input:md:h-12',
      '5:Button:h-10',
    ]);
  });

  it('keeps fixed-height overrides on density-bound controls exactly at the frozen per-file count', () => {
    const byFile = new Map<string, ControlHeightOverride[]>();
    for (const override of controlHeightOverrides()) {
      byFile.set(override.file, [...(byFile.get(override.file) ?? []), override]);
    }
    expect(byFile.size, '계측이 아무것도 찾지 못하면 이 계약은 vacuous 하다').toBeGreaterThan(0);

    const drift: string[] = [];
    for (const file of [...new Set([...byFile.keys(), ...Object.keys(CONTROL_HEIGHT_OVERRIDES)])].sort()) {
      const found = byFile.get(file) ?? [];
      const frozen = CONTROL_HEIGHT_OVERRIDES[file] ?? 0;
      if (found.length > frozen) {
        drift.push(
          `${file}: ${frozen} → ${found.length} — 새 고정 높이다. 컨트롤은 --control-h 를 따른다\n`
          + found.map((o) => `    ${o.line}행 <${o.tag}> ${o.token}`).join('\n'),
        );
      } else if (found.length < frozen) {
        drift.push(`${file}: ${frozen} → ${found.length} — 줄었다. 동결값을 ${found.length === 0 ? '지운다' : `${found.length} 로 내린다`}`);
      }
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });
});
