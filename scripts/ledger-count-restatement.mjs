/**
 * 원장이 세는 수는 원장 하나가 정본이다(DEC-OPS-340) — 그 수를 다시 적은 사본을 찾는 공용 판정.
 *
 * 두 모집단을 본다. 판정은 둘 다 scripts/shared-memory-contract.test.mjs 가 실행하고 붉음을 증명한다.
 *
 * 1. 공용 메모리 행(.agent/memory) — ledgerMemoryViolations. 행이 원장에 링크하는지와 원장 라벨 가까이의 수치 표기가 없는지를 본다
 *    (수치 일치는 대조하지 않는다. 행은 수를 쓰지 않는다는 규약이다).
 * 2. 시험 소스 — testSourceRestatements. 원장이 **지금** 세는 값(ledgerCountFacts)과 같은 수가 그 값의 라벨 가까이(같은 줄과 위아래
 *    두 줄)의 수 리터럴이나 문자열 안에 있으면 사본이다. 원장이 바뀌면 사본만 붉어져 CI 왕복으로 따로 고쳐 왔다 — 2026-10 의 고정값
 *    실패 71(활성 메뉴)·412(operation)·22(기능)·60(migration 검증)이 모두 이 형태였다. 시험은 원장을 읽어 기대값을 얻는다.
 *    구현에서 같은 값을 다시 계산해 비교하는 동어반복으로 바꾸지 않는다(신호가 준다).
 *
 * 시험 소스 판정의 경계:
 * - 값이 같고 라벨이 가까워야 한다. 숫자 리터럴 일반은 막지 않는다(시험의 정당한 수가 너무 많다). 2 미만의 값은 보지 않는다.
 * - 주석 속 수는 세지 않는다(시험을 붉게 만드는 것은 단언과 문자열이다). 라벨은 주석에 있어도 된다.
 * - 산술로 만든 사본(77-2, 5 + 2 + 22 + 231 의 231 같은 파생 수)은 보지 않는다. 그 몫은 시험이 원장을 읽는다는 규약이 지킨다.
 * - 의도한 고정(원장 수가 바뀌면 사람이 알아채게 둔 단 하나의 확인 지점)은 그 줄이나 바로 윗줄에 `ledger-pin(<결정 ID>)` 를
 *   적는다. 결정 ID 는 지금의 작업을 제약하는 결정 색인(공용·영역, DEC-OPS-381)에 있어야 한다 — 표기만으로 사본을 덮을 수 없고 사용자 승인 결정이 필요하다(H2).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { loadComposerModules } from './composer-modules.mjs';
import { BINDING_DECISION_INDEXES } from './decision-indexes.mjs';
import { stripComments } from './project-composer-integrations.mjs';

/*
 * [2026-10-17 DEC-OPS-340] 원장이 세는 수는 원장 하나가 정본이다. 결합 census(config/governance/cross-domain-coupling-census.json,
 * DEC-OPS-090)와 배선 census(config/governance/operation-consumer-census.json 의 `expected`)를 공용 메모리 행에 다시 적으면
 * 원장이 바뀔 때마다 메모리 행을 같이 고쳐야 하고, 빠뜨리면 낡은 수가 남는다(2026-09-10 원장 갱신 371→385·32→29 가 메모리에
 * 남지 않은 것도 이 복제에서 생겼다). 그래서 수치 일치를 대조하지 않고, 행이 원장에 링크하는지와 원장 라벨 가까이의 수치 표기가
 * 어느 공용 메모리 행에도 없는지를 본다. 정본 게이트(배선 census 의 단조 래칫, 결합 원장의 edge 정확 집합)는 그대로라 판정 신호는
 * 줄지 않는다.
 * 수치 표기는 라벨 뒤에 조사·기호 하나·'수'·짧은 한글 낱말 하나를 건너 붙은 수(단위 개·건, 또는 단위 없이 날짜·ID 의 일부가 아닌 수)와
 * 'N개 라벨' 어순이다. 굵게 표시를 수의 안팎 어디에 달아도, 라벨을 띄어 쓰거나 붙여 써도, '→' 를 '->' 로 써도, 대소문자가 달라도 같다.
 * 라벨 앞뒤가 영문·경로 문자면 다른 낱말이다(docs/04-operations, operation-consumer-census). 라벨에서 떨어진 문장 속 서술
 * ('… 역전해 0이 됐다')은 보지 않는다 — 그 몫은 행이 수를 쓰지 않는다는 규약이 지킨다.
 * 입력 계약 원장(GAP-CONTRACT-001)의 라벨은 '길이'·'날짜' 처럼 다른 행에서도 원장과 무관한 수(컬럼 길이, 인덱스 수, ADR 의 표준 길이 수)
 * 곁에 쓰이는 일반 낱말이라 rowOnly 로 그 gap 행 안에서만 본다. 원장 이름이 고유한 라벨(app→core·unwired 등)은 모든 메모리 행에서 본다.
 */
export const LEDGER_MEMORY_BINDINGS = Object.freeze([
  Object.freeze({ id: 'GAP-ARCH-001', ledger: 'config/governance/cross-domain-coupling-census.json', labels: Object.freeze(['app→app', 'app→core']) }),
  Object.freeze({ id: 'GAP-WIRING-001', ledger: 'config/governance/operation-consumer-census.json', labels: Object.freeze(['operation', 'unwired', '화면 고아']) }),
  Object.freeze({ id: 'GAP-CONTRACT-001', ledger: 'config/governance/input-contract-mirror-census.json', rowOnly: true,
    labels: Object.freeze(['길이', '필수', '읽기 전용', 'enum', '중첩 검증', '날짜']) }),
]);

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
// 라벨은 띄어 쓰든 붙여 쓰든, '→' 를 '->' 로 쓰든 같은 라벨이다. 앞뒤가 영문·경로 문자면 다른 낱말이다.
const labelPattern = (label) => `(?<![A-Za-z_/.-])${escapeRegExp(label)
  .replace(/\s*→\s*/gu, '\\s*(?:→|->)\\s*')
  .replace(/ +/gu, '\\s*')}(?![A-Za-z_/.-])`;
// 수는 굵게 표시를 안팎 어디에 달아도 같다. 단위(개·건)가 없으면 날짜·ID·경로의 일부가 아니어야 한다.
const RESTATED_COUNT = String.raw`\*{0,2}\d[\d,]*\*{0,2}(?:\s*(?:개|건)|(?![\d/.:-]))`;
// 라벨과 수 사이에는 조사·기호 하나, '수', 또는 짧은 한글 낱말 하나(뒤에 공백)까지만 둔다.
const LABEL_COUNT_BRIDGE = String.raw`(?:(?:[은는이가의:(=]|수)\s*|[가-힣]{1,6}\s+)?`;
const ledgerCountRestatement = (label) => new RegExp(
  `${labelPattern(label)}\\s*\\*{0,2}\\s*${LABEL_COUNT_BRIDGE}${RESTATED_COUNT}`
  + `|\\d[\\d,]*\\*{0,2}\\s*(?:개|건)\\*{0,2}\\s*(?:의\\s*)?${labelPattern(label)}`,
  'iu',
);

/*
 * gap 행은 자동 로드되는 known-gaps.md 의 전문 표나, 특정 경로에만 걸려 옮긴 영역 상세(docs/04-operations/known-gaps-detail.md)에
 * 있다(DEC-OPS-389). known-gaps.md 의 레지스트리 줄(6열)은 상세 행을 가리키는 요약이라 원장 링크를 요구하지 않는다 — 원장 링크와
 * 행 범위(rowOnly) 검출은 두 파일의 전문 행(9열)을 본다. 수치 재진술 검출은 레지스트리 줄을 포함한 모든 줄을 그대로 본다.
 */
export const GAP_FILES = Object.freeze(['known-gaps.md', 'known-gaps-detail.md']);
const GAP_ROW_CELLS = 9;
const tableCellCount = (line) => line.trim().slice(1, -1).split('|').length;

/** files: { 'known-gaps.md': text, ... } — 공용 메모리 파일 이름과 원문. 위반 문장 목록을 돌려준다. */
export function ledgerMemoryViolations(files) {
  const violations = [];
  const gapRows = GAP_FILES.flatMap((file) => (files[file] ?? '').split(/\r?\n/))
    .filter((line) => tableCellCount(line) === GAP_ROW_CELLS);
  for (const { id, ledger } of LEDGER_MEMORY_BINDINGS) {
    const row = gapRows.find((line) => line.startsWith(`| ${id} |`));
    if (!row) {
      violations.push(`${id}: 활성 gap 행이 필요합니다.`);
    } else if (!row.includes(`](../../${ledger})`)) {
      violations.push(`${id}: 원장 링크(${ledger})가 필요합니다 — 현재 수는 원장이 정본입니다.`);
    }
  }
  for (const [file, text] of Object.entries(files)) {
    for (const line of text.split(/\r?\n/)) {
      for (const { id, ledger, labels, rowOnly } of LEDGER_MEMORY_BINDINGS) {
        if (rowOnly && !(GAP_FILES.includes(file) && line.startsWith(`| ${id} |`))) continue;
        for (const label of labels) {
          if (ledgerCountRestatement(label).test(line)) {
            violations.push(`${file}: '${label}' 수를 다시 적었습니다 — ${ledger} 가 정본이니 링크만 남기십시오.`);
          }
        }
      }
    }
  }
  return violations;
}

// ─── 원장이 지금 세는 값 ────────────────────────────────────────────────────────────────────────────────────────────

const OPERATION_CENSUS = 'config/governance/operation-consumer-census.json';
const COUPLING_CENSUS = 'config/governance/cross-domain-coupling-census.json';
const INPUT_CONTRACT_CENSUS = 'config/governance/input-contract-mirror-census.json';
const MENU_SNAPSHOT = 'config/project-composer-menus.json';
const GATE_REGISTRY = 'config/governance/gates.json';
const MODULE_DECLARATIONS = 'config/modules';

// 라벨은 낱말이다. 영문은 식별자의 camelCase·snake_case·kebab-case 조각과 글의 낱말을 같은 낱말 열로 보고(복수형 포함), 한글은 글자열로 찾는다.
// 다른 뜻으로 흔히 쓰는 낱말은 라벨로 두지 않는다 — 'domain'(DB 표준 도메인·DDD), '프리셋'·'preset'(기간·테마 프리셋), 'mutation'(화면의 쓰기 요청).
// 그 대신 원장의 이름으로 쓰는 복수형('domains'·'presets')과 두 낱말 라벨('mutation scope')을 둔다.
const MENU_LABELS = Object.freeze(['menu', '메뉴']);
const FEATURE_LABELS = Object.freeze(['feature', 'capability', 'domains', '기능']);
const PRESET_LABELS = Object.freeze(['presets', '시작 구성']);
const SCHEMA_VALIDATION_LABELS = Object.freeze(['schema validation', 'migration test', 'migration 검증', '스키마 검증', '마이그레이션 시험']);
const PIT_LABELS = Object.freeze(['pit', 'pitest', 'mutation scope', 'matrix scope', '뮤테이션']);

/**
 * 원장 하나가 세는 값과 그 라벨. 값은 실행할 때마다 원장에서 다시 센다 — 이 목록에 수를 적지 않는다.
 * 시험 소스의 사본이 막히는 값만 둔다. 같은 값이 둘이면(활성 메뉴와 관리자 트리) 각자 남는다.
 */
export function ledgerCountFacts(root) {
  const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
  const facts = [];
  const add = (id, ledger, value, labels) => {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${ledger}: ${id} 을(를) 셀 수 없습니다 (${value})`);
    facts.push(Object.freeze({ id, ledger, value, labels }));
  };

  const operation = read(OPERATION_CENSUS).expected ?? {};
  add('operation-count', OPERATION_CENSUS, operation.operationCount, Object.freeze(['operation']));
  add('unwired-max', OPERATION_CENSUS, operation.unwiredMax, Object.freeze(['unwired']));
  add('screen-orphan-max', OPERATION_CENSUS, operation.screenOrphanMax, Object.freeze(['screen orphan', '화면 고아']));
  add('ungated-write-max', OPERATION_CENSUS, operation.ungatedWriteMax, Object.freeze(['ungated']));

  const edges = read(COUPLING_CENSUS).edges ?? [];
  add('app-to-app-edges', COUPLING_CENSUS, edges.filter((edge) => edge.module === 'business-app').length, Object.freeze(['app→app']));
  add('app-to-core-edges', COUPLING_CENSUS, edges.filter((edge) => edge.module === 'business-core').length, Object.freeze(['app→core']));

  const input = read(INPUT_CONTRACT_CENSUS).expected ?? {};
  for (const [key, labels] of [
    ['lengthFields', ['length fields']], ['requiredFields', ['required fields']], ['readOnlyFields', ['read only fields']],
    ['enumFields', ['enum fields']], ['nestedValidationFields', ['nested validation']], ['calendarDateFields', ['calendar date']],
  ]) add(`input-contract-${key}`, INPUT_CONTRACT_CENSUS, input[key], Object.freeze(labels));

  const menus = read(MENU_SNAPSHOT);
  add('menu-rows', MENU_SNAPSHOT, menus.menus.length, MENU_LABELS);
  add('active-menus', MENU_SNAPSHOT, menus.menus.filter((menu) => menu.use_yn === 'Y').length, MENU_LABELS);
  add('navigation-grants', MENU_SNAPSHOT, menus.navigation.length, Object.freeze(['navigation', '메뉴 배정']));
  for (const group of [...new Set(menus.navigation.map((row) => row.authrt_cd))].sort()) {
    add(`navigation-grants-${group}`, MENU_SNAPSHOT, menus.navigation.filter((row) => row.authrt_cd === group).length,
      Object.freeze(['navigation', '메뉴 배정']));
  }

  const modules = loadComposerModules(root);
  add('features', MODULE_DECLARATIONS, Object.keys(modules.declarations.features).length, FEATURE_LABELS);
  add('presets', `${MODULE_DECLARATIONS}/presets.json`, modules.files['presets.json'].presets.length, PRESET_LABELS);

  const gates = read(GATE_REGISTRY).gateSets ?? [];
  const schemaValidation = gates.find((set) => set.id === 'GATESET-SCHEMA-VALIDATION')?.rules;
  add('schema-validation-rules', GATE_REGISTRY, Array.isArray(schemaValidation) ? schemaValidation.length : undefined, SCHEMA_VALIDATION_LABELS);
  const pit = gates.find((set) => set.id === 'GATESET-PIT-MUTATION-AGGREGATE')?.selector?.matrixScopes;
  add('pit-scopes', GATE_REGISTRY, Array.isArray(pit) ? pit.length : undefined, PIT_LABELS);
  for (const job of [...new Set((pit ?? []).map((scope) => scope.job))].sort()) {
    add(`pit-scopes-${job}`, GATE_REGISTRY, pit.filter((scope) => scope.job === job).length, PIT_LABELS);
  }
  return Object.freeze(facts);
}

// ─── 시험 소스 ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** 시험 소스 모집단 — 상대 경로의 위치·접미사. 생산 코드·생성기는 여기서 보지 않는다. */
export const TEST_SOURCE_ROOTS = Object.freeze([
  Object.freeze({ root: 'scripts', recursive: true, suffixes: Object.freeze(['.test.mjs']) }),
  Object.freeze({ root: 'tools', recursive: true, suffixes: Object.freeze(['.test.mjs']) }),
  Object.freeze({ root: 'frontend/src', recursive: true, suffixes: Object.freeze(['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx']) }),
  Object.freeze({ root: 'frontend/e2e', recursive: true, suffixes: Object.freeze(['.ts', '.tsx', '.mjs', '.js']) }),
  ...['foundation', 'business-core', 'business-app', 'api-server', 'migration-tool']
    .map((module) => Object.freeze({ root: `${module}/src/test`, recursive: true, suffixes: Object.freeze(['.java']) })),
]);

const SKIPPED_DIRECTORIES = new Set(['node_modules', '.next', 'build', 'dist', 'coverage', 'test-results', 'playwright-report']);

export function testSourceFiles(root) {
  const files = [];
  const walk = (relative, suffixes) => {
    let entries;
    try { entries = readdirSync(join(root, relative), { withFileTypes: true }); } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const path = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) walk(path, suffixes);
      } else if (entry.isFile() && suffixes.some((suffix) => entry.name.endsWith(suffix))) files.push(path);
    }
  };
  for (const { root: directory, suffixes } of TEST_SOURCE_ROOTS) walk(directory, suffixes);
  return files.sort();
}

let typescript;
function ts() {
  typescript ??= createRequire(new URL('../frontend/package.json', import.meta.url))('typescript');
  return typescript;
}

/*
 * 수가 "센 값" 자리에 있을 때만 본다 — 단언 호출의 인자(산술 안 포함), 비교의 피연산자, 선언·대입의 값. 함수 인자(`menu(70, …)` 같은
 * 시험 데이터의 ID), 객체 속성 값(`maxRetries: 5`), 문자열 속 일반 수(cron·max-parallel)는 센 값의 사본이 아니다.
 * 문자열 속 수는 'N개'·'N건' 이거나, 문자열이 코드를 담아 '= N' 또는 단언 호출의 인자 'isEqualTo(N)' 로 쓴 수다.
 */
const ASSERTION_CALLS = Object.freeze([
  'toHaveLength', 'toHaveSize', 'toBe', 'toEqual', 'toStrictEqual',
  'toBeGreaterThan', 'toBeGreaterThanOrEqual', 'toBeLessThan', 'toBeLessThanOrEqual',
  'equal', 'strictEqual', 'deepEqual', 'deepStrictEqual', 'notEqual', 'notStrictEqual',
  'assertEquals', 'assertNotEquals', 'isEqualTo', 'isNotEqualTo', 'hasSize',
  'hasSizeGreaterThan', 'hasSizeGreaterThanOrEqualTo', 'hasSizeLessThan', 'hasSizeLessThanOrEqualTo',
  'isGreaterThan', 'isGreaterThanOrEqualTo', 'isLessThan', 'isLessThanOrEqualTo',
]);
const ASSERTION_CALL_SET = new Set(ASSERTION_CALLS);
const STRING_COUNT = new RegExp(String.raw`(?<![\w.$/:#@%+-])\d+(?=\s*(?:개|건))`
  + String.raw`|(?<=(?:(?:^|[^=!<>])=|\b(?:${ASSERTION_CALLS.join('|')})\()\s*)\d+(?![\w.])`, 'gu');
const JAVA_NUMBER = /(?<![\w.$])(?:0[xX][\da-fA-F_]+|\d[\d_]*)[lL]?(?![\w.])/gu;

function lineStarts(text) {
  const starts = [0];
  for (let index = text.indexOf('\n'); index >= 0; index = text.indexOf('\n', index + 1)) starts.push(index + 1);
  return starts;
}
function lineOf(starts, offset) {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (starts[middle] <= offset) low = middle; else high = middle - 1;
  }
  return low;
}

/**
 * Java 코드(주석·문자열을 지운 원문)에서 index 의 수가 센 값 자리인가. 바로 앞이 비교 연산자이거나, 같은 문장 안에서 괄호 밖으로
 * 나가며 처음 만나는 것이 대입·초기화의 '=' 이거나, 처음 만나는 여는 괄호가 단언 호출의 괄호다.
 */
function javaCountPosition(code, index) {
  const before = code.slice(Math.max(0, index - 4), index).trimEnd();
  if (/(?:[=!<>]=|[^-]>|<)$/u.test(before)) return true;
  let depth = 0;
  for (let at = index - 1; at >= 0; at -= 1) {
    const char = code[at];
    if (char === ')' || char === ']') depth += 1;
    else if (char === '(' || char === '[') {
      if (depth > 0) { depth -= 1; continue; }
      if (char === '[') return false;
      const callee = /([A-Za-z_$][\w$]*)\s*$/u.exec(code.slice(Math.max(0, at - 80), at))?.[1];
      return ASSERTION_CALL_SET.has(callee);
    } else if (depth === 0 && (char === ';' || char === '{' || char === '}')) return false;
    else if (depth === 0 && char === '=' && !'=!<>'.includes(code[at - 1] ?? '') && code[at + 1] !== '=') return true;
  }
  return false;
}

/** TS·JS 의 수 리터럴이 센 값 자리인가(javaCountPosition 과 같은 규칙을 구문 트리로 본다). ancestors: 가까운 조상이 끝에 온다. */
function scriptCountPosition(node, ancestors, t) {
  const arithmetic = new Set([t.SyntaxKind.PlusToken, t.SyntaxKind.MinusToken, t.SyntaxKind.AsteriskToken, t.SyntaxKind.SlashToken]);
  const comparison = new Set([
    t.SyntaxKind.EqualsEqualsToken, t.SyntaxKind.EqualsEqualsEqualsToken, t.SyntaxKind.ExclamationEqualsToken,
    t.SyntaxKind.ExclamationEqualsEqualsToken, t.SyntaxKind.LessThanToken, t.SyntaxKind.LessThanEqualsToken,
    t.SyntaxKind.GreaterThanToken, t.SyntaxKind.GreaterThanEqualsToken,
  ]);
  let current = node;
  for (let depth = ancestors.length - 1; ; depth -= 1) {
    const parent = ancestors[depth];
    if (!parent) return false;
    if (t.isParenthesizedExpression(parent) || t.isPrefixUnaryExpression(parent)
      || (t.isBinaryExpression(parent) && arithmetic.has(parent.operatorToken.kind))) {
      current = parent;
      continue;
    }
    if (t.isBinaryExpression(parent)) {
      return comparison.has(parent.operatorToken.kind) || (parent.operatorToken.kind === t.SyntaxKind.EqualsToken && parent.right === current);
    }
    if (t.isVariableDeclaration(parent)) return parent.initializer === current;
    if (t.isCallExpression(parent) && parent.arguments.includes(current)) {
      const callee = parent.expression;
      const name = t.isIdentifier(callee) ? callee.text : t.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
      return ASSERTION_CALL_SET.has(name);
    }
    return false;
  }
}

/** 소스의 센 값 자리의 수 가운데 wanted(value) 인 것 — { value, line(0 기반) }. 주석 속 수는 없다. */
function sourceNumbers(text, path, wanted) {
  const starts = lineStarts(text);
  const numbers = [];
  if (extname(path) === '.java') {
    const code = stripComments(text, { kind: 'java', strings: false });
    const withStrings = stripComments(text, { kind: 'java', strings: true });
    for (const match of code.matchAll(JAVA_NUMBER)) {
      const value = Number(match[0].replace(/[_lL]/gu, ''));
      if (wanted(value) && javaCountPosition(code, match.index)) numbers.push({ value, line: lineOf(starts, match.index) });
    }
    // 문자열 구간은 주석만 지운 원문에는 남고 문자열까지 지운 원문에서는 공백이 된 자리다.
    for (const match of withStrings.matchAll(STRING_COUNT)) {
      const value = Number(match[0]);
      if (wanted(value) && code[match.index] === ' ') numbers.push({ value, line: lineOf(starts, match.index) });
    }
    return numbers;
  }
  const t = ts();
  const kind = { '.ts': 'TS', '.tsx': 'TSX', '.mjs': 'JS', '.js': 'JS', '.cjs': 'JS', '.jsx': 'JSX' }[extname(path)];
  if (!kind) throw new Error(`시험 소스 형식을 읽을 규칙이 없습니다: ${path}`);
  const source = t.createSourceFile(path, text, t.ScriptTarget.Latest, false, t.ScriptKind[kind]);
  const stringKinds = new Set([
    t.SyntaxKind.StringLiteral, t.SyntaxKind.NoSubstitutionTemplateLiteral,
    t.SyntaxKind.TemplateHead, t.SyntaxKind.TemplateMiddle, t.SyntaxKind.TemplateTail,
  ]);
  const ancestors = [];
  const visit = (node) => {
    if (node.kind === t.SyntaxKind.NumericLiteral) {
      const value = Number(node.text);
      if (wanted(value) && scriptCountPosition(node, ancestors, t)) {
        numbers.push({ value, line: lineOf(starts, node.getStart(source)) });
      }
    } else if (stringKinds.has(node.kind)) {
      const start = node.getStart(source);
      const raw = text.slice(start, node.end);
      for (const match of raw.matchAll(STRING_COUNT)) {
        const value = Number(match[0]);
        if (wanted(value)) numbers.push({ value, line: lineOf(starts, start + match.index) });
      }
    }
    ancestors.push(node);
    t.forEachChild(node, visit);
    ancestors.pop();
  };
  visit(source);
  return numbers;
}

/** 한 줄의 영문 낱말 열(소문자). 식별자는 camelCase·snake_case·kebab-case 조각으로 나눈다. 수는 낱말이 아니다. */
function lineWords(line) {
  const words = [];
  for (const run of line.match(/[A-Za-z][A-Za-z0-9]*/gu) ?? []) {
    for (const piece of run.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+/gu) ?? []) words.push(piece.toLowerCase());
  }
  return words;
}
const sameWord = (word, label) => word === label || word === `${label}s` || word === `${label}es`
  || (label.endsWith('y') && word === `${label.slice(0, -1)}ies`);
const HANGUL = /[가-힣]/u;

/** 라벨 하나가 그 줄에 있는가. 영문 라벨은 이어진 낱말 열로, 한글이 든 라벨은 공백을 무시한 글자열로 찾는다. */
function lineHasLabel(line, words, label) {
  if (HANGUL.test(label)) {
    const compact = label.replace(/\s+/gu, '');
    return line.replace(/\s+/gu, '').includes(compact);
  }
  const wanted = label.toLowerCase().split(/[\s→>-]+/u).filter(Boolean);
  for (let index = 0; index + wanted.length <= words.length; index += 1) {
    if (wanted.every((part, offset) => sameWord(words[index + offset], part))) return true;
  }
  return false;
}

export const LEDGER_PIN = /ledger-pin\(\s*((?:DEC-OPS-\d{3,}|ADR-\d{4}))\s*\)/u;
/** 라벨을 찾는 범위 — 수가 있는 줄의 위아래 두 줄. */
export const LABEL_WINDOW = 2;

/**
 * 한 시험 소스 파일에서 원장 값의 사본을 찾는다. decisionIds: 의도한 고정 표기(`ledger-pin(ID)`)가 가리킬 수 있는 결정 ID 집합.
 * 돌려주는 것: { file, line(1 기반), value, fact, ledger, label, pinned } — pinned 는 승인 결정에 묶인 의도한 고정이다.
 * 결정 인덱스에 없는 ID 를 가리킨 표기는 pinError 로 남는다(표기만으로 사본을 덮지 못한다).
 */
export function testSourceRestatements(path, text, facts, decisionIds = new Set()) {
  const normalized = text.replace(/\r\n?/gu, '\n');
  const lines = normalized.split('\n');
  const byValue = new Map();
  for (const fact of facts) {
    if (fact.value >= 2) byValue.set(fact.value, [...(byValue.get(fact.value) ?? []), fact]);
  }
  // 줄의 낱말은 후보 수 가까이의 줄만 필요할 때 한 번 센다.
  const wordsByLine = new Map();
  const labelOn = (index, fact) => {
    if (!wordsByLine.has(index)) wordsByLine.set(index, lineWords(lines[index]));
    return fact.labels.find((candidate) => lineHasLabel(lines[index], wordsByLine.get(index), candidate));
  };
  const findings = [];
  const seen = new Set();
  for (const { value, line } of sourceNumbers(normalized, path, (candidate) => byValue.has(candidate))) {
    for (const fact of byValue.get(value)) {
      let label;
      for (let index = Math.max(0, line - LABEL_WINDOW); index <= Math.min(lines.length - 1, line + LABEL_WINDOW) && !label; index += 1) {
        label = labelOn(index, fact);
      }
      if (!label) continue;
      const key = `${line}\0${fact.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const pin = (lines[line].match(LEDGER_PIN) ?? (line > 0 ? lines[line - 1].match(LEDGER_PIN) : null))?.[1];
      findings.push({
        file: path, line: line + 1, value, fact: fact.id, ledger: fact.ledger, label,
        pinned: Boolean(pin && decisionIds.has(pin)),
        ...(pin && !decisionIds.has(pin) ? { pinError: `ledger-pin(${pin}) 이 가리키는 결정이 지금의 작업을 제약하는 결정 색인에 없습니다` } : {}),
      });
    }
  }
  return findings;
}

/** 지금의 작업을 제약하는 결정 색인(공용·영역)의 결정 ID. 역사 색인의 결정은 고정 근거가 되지 못한다. */
export function decisionIndexIds(root) {
  return new Set(BINDING_DECISION_INDEXES.flatMap((file) =>
    [...readFileSync(join(root, file), 'utf8').matchAll(/^\| ((?:DEC-OPS-\d{3,}|ADR-\d{4})) \|/gmu)].map((match) => match[1])));
}

/** 위반 문장. 의도한 고정(pinned)은 위반이 아니다. */
export function restatementMessage(finding) {
  return `${finding.file}:${finding.line}: '${finding.label}' 가까이의 ${finding.value} 은(는) ${finding.ledger} 가 세는 값(${finding.fact})의 사본입니다 — `
    + `시험은 원장을 읽어 기대값을 얻으십시오${finding.pinError ? ` (${finding.pinError})` : ''}.`;
}

/** 저장소 전체의 위반 문장 목록. */
export function testSourceViolations(root) {
  const facts = ledgerCountFacts(root);
  const decisions = decisionIndexIds(root);
  return testSourceFiles(root)
    .flatMap((path) => testSourceRestatements(path, readFileSync(join(root, path), 'utf8'), facts, decisions))
    .filter((finding) => !finding.pinned)
    .map(restatementMessage);
}
