import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import { frozenInProjection } from '@/test-utils/projection';

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
 * 2026-09-23 동결. 남은 11건은 옮기지 않기로 판단한 것이다 — 도달할 수 없는 화면 4(DEC-OPS-023 ①),
 * 테마 CSS 없이 뜨는 전역 오류 화면 1(토큰이 정의되지 않는다), 목록 안 소형 아이콘 버튼·수신자 칩 삭제·
 * 배너 점 같은 의도적 소형 6. 새 항목은 넣지 않는다. 파일의 수가 줄면 여기서도 내리고, 0 이 되면 지운다.
 */
const CONTROL_HEIGHT_OVERRIDES: Readonly<Record<string, number>> = {
  'app/admin/collaboration/mail-send/MailSendHubClient.tsx': 1,
  'app/admin/survey/components/SurveyQuestionsPanel.tsx': 3,
  'app/admin/system/audit/AuditTimelineClient.tsx': 1,
  'app/admin/uss/ion/sms/SmsAdminClient.tsx': 1,
  'app/components/dashboard/BannerSlider.tsx': 1,
  'app/cop/sms/selectSmsList/SmsHubClient.tsx': 3,
  'app/global-error.tsx': 1,
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
          // [2026-10-01] 중요 표시(!h-12 · h-12!)도 같은 고정 높이다 — 종전 정규식은 이 형태를 보지 못해 게시판 조회
          //   조건의 !h-12 가 compact 밀도에서도 48px 로 남았다.
          if (FIXED_HEIGHT.test((token.split(':').pop() ?? '').replace(/^!|!$/g, ''))) found.push({ file, line, tag, token });
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

    // 재사용 생성물에서는 투영으로 빠진 파일의 동결값만 뺀다(원장 확인). 원본에서는 동결표 그대로다.
    const frozenTable = frozenInProjection(CONTROL_HEIGHT_OVERRIDES, (file) => join(SRC_DIR, file));
    const drift: string[] = [];
    for (const file of [...new Set([...byFile.keys(), ...Object.keys(frozenTable)])].sort()) {
      const found = byFile.get(file) ?? [];
      const frozen = frozenTable[file] ?? 0;
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

/**
 * [2026-10-01] A3 '이탈 시 미저장 경고' — 폼을 담은 모달은 사고성 닫기(Esc·배경·X)를 보호한다.
 *
 * `StandardModal` 은 이 보호를 스스로 건다(useUnsavedCloseGuard). 원시 `<Dialog>` 로 폼을 담는 화면은 그 보호를
 * 물려받지 못하므로, 같은 훅(또는 화면이 dirty 를 넘기는 useDirtyCloseGuard)을 직접 써야 한다. 종전에는 폼 모달
 * 약 20곳이 Esc 한 번에 입력을 경고 없이 잃었다.
 *
 * 도달할 수 없는 화면(next.config 리다이렉트)은 이행 대상이 아니다(DEC-OPS-023 ①).
 */
const UNREACHABLE_FORM_DIALOGS = new Set(['src/app/cop/sms/selectSmsList/SmsHubClient.tsx']);

describe('A3 unsaved-close protection for form modals', () => {
  const sources = tsxSources(join(FRONTEND_DIR, 'src', 'app'))
    .concat(tsxSources(join(FRONTEND_DIR, 'src', 'components')))
    .map((file) => ({ file: relative(FRONTEND_DIR, file).split(sep).join('/'), text: readFileSync(file, 'utf8') }))
    .filter(({ file }) => !file.startsWith('src/app/components/ui/') && !file.startsWith('src/components/ui/'));
  const rawFormDialogs = sources.filter(({ text }) => /<Dialog\b/.test(text) && /<form\b/.test(text));

  it('finds the raw Dialog form screens it is meant to guard', () => {
    expect(rawFormDialogs.length, '원시 Dialog 폼을 하나도 찾지 못하면 이 계약은 vacuous 하다').toBeGreaterThan(0);
  });

  it('requires every raw Dialog that hosts a form to wire the unsaved-close guard', () => {
    const unguarded = rawFormDialogs
      .filter(({ file }) => !UNREACHABLE_FORM_DIALOGS.has(file))
      .filter(({ text }) => !/use(?:Unsaved|Dirty)CloseGuard\(/.test(text))
      .map(({ file }) => file);
    expect(unguarded, `폼을 담은 원시 Dialog 는 useUnsavedCloseGuard 를 쓰거나 StandardModal 로 옮긴다:\n${unguarded.join('\n')}`).toEqual([]);
  });

  it('keeps the guard inside StandardModal itself', () => {
    const modal = readFileSync(join(FRONTEND_DIR, 'src', 'app', 'components', 'ui', 'standard-modal.tsx'), 'utf8');
    expect(modal).toMatch(/useUnsavedCloseGuard\(/);
    expect(modal).toMatch(/onInputCapture=\{trackInput\}/);
  });
});

/**
 * [2026-10-05] 업무 표 행 토큰(--work-cell-px/py)의 소비 경계 — 카탈로그 §4 '업무 표 행 토큰'.
 *
 * 헌법 제2조 2항은 밀도를 배포 단위 전역 한 곳에서만 정하고 라우트별로 배정하지 않는다. 업무 표 토큰은 그 축과 별개로
 * "조밀한 업무 그리드(권한 매트릭스·화면 목록·메뉴 보드)" 라는 **컴포넌트의 표현**이다. 그런데 `StandardDataTable` 의
 * `rowDensity` 는 호출부가 고르는 prop 이라, 막지 않으면 아무 목록 화면이 'work' 를 붙여 화면별 밀도 선택 경로가 된다
 * (반박 리뷰 major 5). 그래서 소비를 두 겹으로 고정한다.
 *
 *   ① `--work-cell-*` 를 읽는 TS 소스는 아래 `WORK_TABLE_TOKEN_OWNERS` 에 사유와 함께 등재한 업무 그리드 컴포넌트(행 패딩을
 *      정의하는 공용 표, 메뉴 보드, 권한 작업대의 두 매트릭스와 두 변경 이력 표(편집기 탭·허브 영역))뿐이다 — 화면 파일(라우트)이 토큰을 직접 집어 쓰지 않는다.
 *      (2026-10-05 통합: 처음에는 공용 표 하나뿐이었고 소비 화면 작업이 그리드 컴포넌트를 등재하며 이 문장을 사실에 맞췄다.)
 *   ② `rowDensity` 를 'default' 가 아닌 값으로 넘기는 호출부는 아래 허용 목록과 **exact** 일치해야 한다. 목록의 각 항목은
 *      그 화면의 표가 왜 업무 그리드인지 사유를 갖는다. 목록 밖 소비는 red, 목록에 있는데 소비가 사라져도 red 다.
 *
 * 등재 기준(카탈로그 §4): 한 행이 한 줄 사실(이름·코드·상태·짧은 값)이고, 사용자가 많은 행을 훑어 비교·대조하며, 행 안에서
 * 여러 칸을 조작하는 업무 그리드. 일반 조회 목록(A1 결과 표)은 등재하지 않는다 — 그 밀도는 배포 전역 data-density 가 정한다.
 */
/** 토큰을 직접 읽는 업무 그리드 컴포넌트 → 사유. 라우트(화면 파일)가 아니라 그리드 컴포넌트만 등재한다. */
const WORK_TABLE_TOKEN_OWNERS: Readonly<Record<string, string>> = {
  'app/components/ui/standard-data-table.tsx': '공용 표 — rowDensity="work" 변형이 셀 패딩을 정의한다(그 변형을 쓰는 화면은 아래 목록).',
  'app/admin/system/menus/MenuBoard.tsx':
    '메뉴 구조 보드 — 영역 하나의 메뉴 수십 개를 이름·배지의 한 줄 줄로 다단 카드에 펼쳐 훑고, 줄마다 끌기·선택·옮기기를 하는 '
    + '업무 그리드다(카탈로그 §4 업무 표의 예시 \'메뉴 보드\'). 줄 상하 패딩만 --work-cell-py 로 받는다(손잡이 24px).',
  'app/admin/security/authority/components/ScreenPermissionTable.tsx':
    '권한 작업대 \'화면별 권한\' 매트릭스(A5) — 메뉴 트리 줄마다 이름 한 줄과 메뉴 표시·진입·등록·수정·삭제·그 밖의 기능 칸을 '
    + '나란히 훑고 칸을 조작하는 업무 그리드다(카탈로그 §4 업무 표의 예시 \'권한 매트릭스\', A5 계약이 칸 패딩을 고정).',
  'app/admin/security/authority/components/OperationPermissionMatrix.tsx':
    '권한 작업대 \'기능별 권한\' 매트릭스(A5) — 업무 영역 줄 × 행위 칸을 훑고 조작하는 업무 그리드다(화면별 권한 표와 같은 행 높이).',
  'app/admin/security/authority/components/GroupChangeHistory.tsx':
    '권한 작업대의 \'변경 이력\' 탭 표 — 같은 작업대의 두 매트릭스 사이에서 탭만 바꿔 오가는 fill 영역 안 표라 행 높이를 맞춘다'
    + '(2026-10-05 사용자 승인 압축안). 일반 A1 조회 목록이 아니라 작업대의 한 영역이다.',
  'app/admin/security/authority/components/AuthorizationHistory.tsx':
    '권한 관리 허브의 \'변경 이력\' 영역 표 — 편집기 \'변경 이력\' 탭(위 GroupChangeHistory)과 같은 감사 이력을 그룹·사용자·처리자·기간 '
    + '조건으로 넓혀 찾는 표다. 한 행이 한 변경 사실(시각·대상·변경·권한·처리자)이고 많은 행을 대조하며, 같은 허브의 fill 영역(그룹 · '
    + '기능권한)과 영역 단추만 바꿔 오가므로 두 이력 표의 행 높이를 맞춘다(2026-10-05 사용자 승인 압축안 2차, 종전 고정 p-3 은 '
    + '65~92px 행). 결과 한 건을 골라 여는 A1 조회 목록이 아니다.',
};
/** StandardDataTable 을 rowDensity="work" 로 쓰는 화면 파일 → 업무 그리드인 사유. */
const WORK_TABLE_ROW_DENSITY_CONSUMERS: Readonly<Record<string, string>> = {
  'app/admin/system/programs/ProgramAdminClient.tsx':
    '화면 관리의 화면 목록·넘어가는 경로 — 앱 화면 원장 전체(약 90행)를 이름·경로·진입 권한 칩·연결 메뉴·구분의 한 줄 사실로 '
    + '훑어 메뉴 연결을 대조하고 메뉴에 없는 화면을 메뉴에 넣는 업무 그리드다(카탈로그 §4 업무 표의 예시 \'화면 목록\'). '
    + '조건으로 좁혀 한 건을 고르는 일반 조회 결과가 아니다.',
};

/** rowDensity 에 기본이 아닌 값을 넘기는 JSX 속성과 객체 속성 자리를 찾는다(값이 식이면 판정할 수 없으므로 소비로 센다). */
function workRowDensitySites(file: string, text: string): number[] {
  const lines: number[] = [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const isDefaultLiteral = (node: ts.Node | undefined): boolean => {
    if (!node) return false;
    if (ts.isJsxExpression(node)) return isDefaultLiteral(node.expression);
    return (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && node.text === 'default';
  };
  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node) && node.name.getText(source) === 'rowDensity' && !isDefaultLiteral(node.initializer)) {
      lines.push(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);
    }
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'rowDensity' && !isDefaultLiteral(node.initializer)) {
      lines.push(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return lines;
}

function productionSources(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'node_modules') productionSources(full, acc);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Work-table row tokens ↔ component binding contract', () => {
  const sources = productionSources(SRC_DIR).map((full) => ({
    file: relative(SRC_DIR, full).split(sep).join('/'),
    text: readFileSync(full, 'utf8'),
  }));

  it('only registered work-grid components read --work-cell-* (screens never pick the token directly)', () => {
    const readers = sources.filter(({ text }) => text.includes('--work-cell-')).map(({ file }) => file).sort();
    expect(readers, `업무 표 행 토큰을 직접 읽는 소스는 업무 그리드 컴포넌트로 사유와 함께 등재한다:\n${readers.join('\n')}`)
      .toEqual(Object.keys(WORK_TABLE_TOKEN_OWNERS).sort());
    for (const [file, reason] of Object.entries(WORK_TABLE_TOKEN_OWNERS)) {
      expect(reason.trim().length, `${file} 의 등재 사유가 비었습니다`).toBeGreaterThan(10);
    }
  });

  it('keeps rowDensity="work" consumers exactly equal to the registered work grids', () => {
    const consumers = sources
      .filter(({ file }) => !(file in WORK_TABLE_TOKEN_OWNERS))
      .filter(({ text }) => text.includes('rowDensity'))
      .flatMap(({ file, text }) => workRowDensitySites(file, text).map((line) => ({ file, line })));
    const consumerFiles = [...new Set(consumers.map(({ file }) => file))].sort();
    expect(
      consumerFiles,
      `rowDensity 를 기본이 아닌 값으로 넘기는 화면은 업무 그리드 허용 목록에 사유와 함께 등재한다(카탈로그 §4):\n${
        consumers.map(({ file, line }) => `${file}:${line}`).join('\n')}`,
    ).toEqual(Object.keys(WORK_TABLE_ROW_DENSITY_CONSUMERS).sort());
    for (const [file, reason] of Object.entries(WORK_TABLE_ROW_DENSITY_CONSUMERS)) {
      expect(reason.trim().length, `${file} 의 등재 사유가 비었습니다`).toBeGreaterThan(10);
    }
  });

  it('detects literal and expression values, and ignores the default literal and comments', () => {
    const fixture = [
      '// <StandardDataTable rowDensity="work" /> 는 주석이다',
      'export const A = () => <StandardDataTable rowDensity="work" columns={[]} data={[]} />;',
      'export const B = () => <StandardDataTable rowDensity="default" columns={[]} data={[]} />;',
      'export const C = (d: "work" | "default") => <StandardDataTable rowDensity={d} columns={[]} data={[]} />;',
      'export const props = { rowDensity: \'work\' as const };',
    ].join('\n');
    expect(workRowDensitySites('fixture.tsx', fixture)).toEqual([2, 4, 5]);
  });

  it('documents the binding rule and this allowlist in the catalog', () => {
    expect(CATALOG_MD).toContain('WORK_TABLE_TOKEN_OWNERS');
    expect(CATALOG_MD).toContain('WORK_TABLE_ROW_DENSITY_CONSUMERS');
    expect(CATALOG_MD).toMatch(/업무 표 행 토큰/);
  });
});
