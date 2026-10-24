/**
 * 산출물 초안 내보내기의 추적 표 — 하류 추적 보기, 기관 요구사항 추적 조인, 입력 항목 후보, 시험 목록(DEC-OPS-382).
 *
 * 하류 추적 보기는 기능 → 화면(라우트) → 역량 → 구현·시험 증거 경로 → E2E 후보 → 쓰기 연산 후보를 한 줄에 잇는다. 잇지 못한 칸은
 * 비워 둔다(BLANK). E2E 후보는 계산된 후보다 — goto 리터럴이 그 화면을 여는 파일(page object 포함)과 PR 선별 규칙(IMPACT_RULES)이
 * 그 화면 소스에 거는 spec 이며, 그 시험이 그 역량을 단언한다는 뜻이 아니다. 쓰기 연산 후보는 화면의 쓰기 권한 코드와 같은 권한을
 * 요구하는 GET 이 아닌 연산이다(권한 코드로 이은 것이라 같은 권한을 쓰는 다른 화면의 연산도 섞인다).
 * 감리 준비 가이드의 화면 ID·프로그램 ID·단위시험 ID·통합시험 시나리오 ID 체계는 저장소에 없다 — 경로로 쓴다. 라우트 원장의
 * journeys 칸은 제품·UX 소유 검토 칸이라 읽기만 한다.
 *
 * 기관 요구사항 추적 CSV(--rtm)는 커밋하지 않는 실행 인자다(DEC-OPS-382 ② 의 예외). 저장소가 추적하는 파일은 받지 않는다. 열은
 * '요구사항 ID'·'대상 ID'(필수)와 '요구사항 이름'(선택)이고, 대상 ID 는 화면 ID(라우트)·역량 ID(라우트#역량)·인터페이스 ID(METHOD 경로)다.
 *
 * 시험 목록은 정적 추출이다 — 매개변수화 시험의 사례 수, 동적 제목, 조건부 건너뜀을 반영하지 않고, 통과 여부가 아니다.
 */
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';

const BLANK_JOIN = null;
const toPosix = (path) => path.split(sep).join('/');
const byText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

function walk(root, directory, predicate) {
  const absolute = join(root, directory);
  let entries;
  try { entries = readdirSync(absolute, { withFileTypes: true }); } catch { return []; }
  return entries.flatMap((entry) => {
    const child = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return ['node_modules', 'build', '.next', 'test-results'].includes(entry.name) ? [] : walk(root, child, predicate);
    return entry.isFile() && predicate(child) ? [child] : [];
  }).sort(byText);
}

/** 라우트 → 소유 기능. 소유 라우트는 경로 접두이고 exactRoutes 에 든 것만 그 화면 하나다(생성기 카탈로그와 같은 의미). */
export function routeOwnerResolver(moduleFiles) {
  const rules = Object.values(moduleFiles).filter((value) => value?.owns).map((value) => ({
    id: value.id, prefixes: value.owns.routes ?? [], exact: new Set(value.owns.exactRoutes ?? []) }));
  return (route) => rules.filter((rule) => rule.prefixes.some((prefix) => (rule.exact.has(prefix) ? route === prefix : route === prefix || route.startsWith(`${prefix}/`))))
    .map((rule) => rule.id).sort(byText);
}

/** E2E 파일의 goto 리터럴 경로 — 쿼리·해시를 떼고 템플릿 자리(${…})는 한 구간으로 본다. */
export function gotoPaths(text) {
  return [...text.matchAll(/\.goto\(\s*(['`])(\/[^'`]*)\1/gu)].map((match) => match[2].replace(/[?#].*$/u, '').replace(/\$\{[^}]*\}/gu, '\u0000'))
    .map((path) => (path.length > 1 ? path.replace(/\/$/u, '') : path));
}

/** 라우트 패턴(동적 구간 [x])이 리터럴 경로를 받는지. 리터럴의 템플릿 자리는 어떤 구간과도 맞는다. */
export function routeMatches(route, literal) {
  const routeParts = route.split('/');
  const literalParts = literal.split('/');
  if (routeParts.length !== literalParts.length) return false;
  return routeParts.every((part, index) => part === literalParts[index] || /^\[.+\]$/u.test(part) || literalParts[index].includes('\u0000'));
}

export function e2eCandidates(route, source, { gotoIndex, impactRules }) {
  const viaGoto = [...gotoIndex].filter(([, paths]) => paths.some((path) => routeMatches(route, path))).map(([file]) => file);
  const viaRules = (impactRules ?? []).filter((rule) => source && rule.prefixes.some((prefix) => source.startsWith(prefix)))
    .flatMap((rule) => rule.specs.map((spec) => `frontend/e2e/${spec}`));
  return [...new Set([...viaGoto, ...viaRules])].sort(byText);
}

export function traceSheet({ moduleFiles, routes, registry, policies, e2e, requirements = [] }) {
  const ownersOf = routeOwnerResolver(moduleFiles);
  const screens = new Map(registry.screens.map((screen) => [screen.route, screen]));
  const writes = (policies.operationBindings ?? []).filter((binding) => binding.method !== 'GET' && binding.permission);
  const requirementIds = new Map();
  for (const requirement of requirements) requirementIds.set(requirement.target, [...(requirementIds.get(requirement.target) ?? []), requirement.id]);
  const rows = [];
  for (const route of routes.routes.filter((row) => (row.routing?.kind ?? 'page') === 'page')) {
    const screen = screens.get(route.route);
    const writeCodes = new Set((screen?.permissions ?? []).filter((row) => row.source === 'write').map((row) => row.code));
    const operations = writes.filter((binding) => writeCodes.has(binding.permission)).map((binding) => `${binding.method} ${binding.path}`).sort(byText);
    const base = { feature: ownersOf(route.route), route: route.route, e2e: e2eCandidates(route.route, route.source, e2e), operations };
    const capabilities = route.capabilities ?? [];
    if (capabilities.length === 0) {
      rows.push({ ...base, capability: BLANK_JOIN, status: route.status, evidenceLevel: BLANK_JOIN, evidence: [], requirements: requirementIds.get(route.route) ?? [] });
    }
    for (const capability of capabilities) {
      const id = `${route.route}#${capability.id}`;
      rows.push({ ...base, capability: id, status: capability.status, evidenceLevel: capability.evidenceLevel, evidence: capability.evidence ?? [],
        requirements: [...new Set([...(requirementIds.get(route.route) ?? []), ...(requirementIds.get(id) ?? [])])].sort(byText) });
    }
  }
  return {
    id: 'trace', title: '하류 추적 보기', sources: ['config/modules/', 'config/ui-route-capabilities.json', 'frontend/src/types/generated-screen-registry.ts',
      'config/governance/authorization-policies.json', 'frontend/e2e/', 'scripts/e2e-shard-plan.mjs'],
    notices: [
      '기능 → 화면 → 역량 → 구현·시험 증거 → E2E 후보 → 쓰기 연산 후보를 잇는다. 잇지 못한 칸은 비워 둔다.',
      'E2E 후보는 계산된 후보다 — goto 리터럴이 그 화면을 여는 파일(page object 포함)과 PR 선별 규칙이 그 화면 소스에 거는 spec 이다. 그 시험이 그 역량을 단언한다는 뜻이 아니다.',
      '쓰기 연산 후보는 화면의 쓰기 권한 코드와 같은 권한을 요구하는 GET 이 아닌 연산이다 — 같은 권한을 쓰는 다른 화면의 연산도 섞인다.',
      '화면 ID·프로그램 ID·단위시험 ID·통합시험 시나리오 ID 체계는 없다 — 경로로 쓴다.',
      requirements.length ? '요구사항 ID 는 실행 인자로 받은 기관 요구사항 추적 CSV 에서 온다(커밋하지 않는다).' : '요구사항 ID 칸은 기관 요구사항 추적 CSV(--rtm)를 줄 때만 채운다.',
    ],
    columns: [['feature', '기능'], ['route', '화면 ID(경로)'], ['capability', '역량 ID'], ['status', '상태'], ['evidenceLevel', '증거 수준'],
      ['evidence', '구현·시험 증거'], ['e2e', 'E2E 후보'], ['operations', '쓰기 연산 후보'], ['requirements', '요구사항 ID']],
    rows,
  };
}

/** RFC 4180 CSV(BOM 허용). 따옴표 안의 쉼표·줄바꿈·이중 따옴표를 받는다. */
export function parseCsv(text) {
  const source = text.replace(/^﻿/u, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === '') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('requirement trace CSV has an unterminated quoted cell');
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ''));
}

export function readRequirements(text) {
  const [header, ...rows] = parseCsv(text);
  const index = (name) => (header ?? []).map((value) => value.trim()).indexOf(name);
  const id = index('요구사항 ID');
  const target = index('대상 ID');
  const name = index('요구사항 이름');
  if (id < 0 || target < 0) throw new Error("requirement trace CSV needs the columns '요구사항 ID' and '대상 ID'");
  return rows.map((cells) => ({ id: cells[id]?.trim() ?? '', target: cells[target]?.trim() ?? '', name: name >= 0 ? cells[name]?.trim() : null }))
    .filter((row) => row.id !== '' || row.target !== '');
}

/** 기관 요구사항이 가리키는 대상이 저장소에 있는지. 찾지 못한 대상을 숨기지 않는다. */
export function requirementSheet(requirements, { screens, capabilities, interfaces }) {
  const kindOf = (target) => (capabilities.has(target) ? '역량' : screens.has(target) ? '화면' : interfaces.has(target) ? '인터페이스' : null);
  return {
    id: 'requirements-trace', title: '요구사항 추적 조인', sources: ['(실행 인자) 기관 요구사항 추적 CSV'],
    notices: ['기관이 넘긴 요구사항 추적 CSV 를 저장소의 화면·역량·인터페이스 ID 와 이은 결과다. 찾지 못한 대상은 "찾음" 칸이 아니오다.',
      '요구사항의 충족 판정이 아니다 — 대상이 저장소에 있다는 것만 보인다.'],
    columns: [['id', '요구사항 ID'], ['name', '요구사항 이름'], ['target', '대상 ID'], ['kind', '대상 종류'], ['found', '찾음']],
    rows: requirements.map((row) => ({ ...row, kind: kindOf(row.target), found: kindOf(row.target) !== null })),
  };
}

function resolveSchema(openapi, schema, seen = new Set()) {
  if (!schema) return { name: null, properties: {}, required: [] };
  if (schema.$ref) {
    const name = schema.$ref.split('/').at(-1);
    if (seen.has(name)) return { name, properties: {}, required: [] };
    const resolved = resolveSchema(openapi, openapi.components?.schemas?.[name], new Set([...seen, name]));
    return { ...resolved, name };
  }
  const parts = (schema.allOf ?? []).map((part) => resolveSchema(openapi, part, seen));
  return { name: null, properties: Object.assign({}, ...parts.map((part) => part.properties), schema.properties ?? {}),
    required: [...new Set([...parts.flatMap((part) => part.required), ...(schema.required ?? [])])] };
}

function fieldType(openapi, property) {
  if (property.$ref) return `object(${property.$ref.split('/').at(-1)})`;
  if (property.type === 'array') return `array(${property.items?.$ref ? property.items.$ref.split('/').at(-1) : property.items?.type ?? '?'})`;
  return [property.type, property.format].filter(Boolean).join(':') || (property.allOf || property.oneOf ? 'object' : null);
}

/** 쓰기 연산의 요청 본문 필드 — 화면 입력 항목 설계의 후보다(한 단계만 펼친다). */
export function inputFieldSheet({ policies, openapi }) {
  const rows = [];
  for (const binding of [...(policies.operationBindings ?? [])].filter((row) => row.method !== 'GET').sort((left, right) => byText(`${left.method} ${left.path}`, `${right.method} ${right.path}`))) {
    const operation = openapi.paths?.[binding.path]?.[binding.method.toLowerCase()];
    const [mediaType, content] = Object.entries(operation?.requestBody?.content ?? {})[0] ?? [];
    if (!content?.schema) continue;
    const id = `${binding.method} ${binding.path}`;
    // 배열 본문(일괄 쓰기)은 항목의 필드를 `[].필드` 로 펼친다. 펼칠 필드가 없는 본문(배열·문자열 등)도 숨기지 않고 한 행을 둔다.
    const array = content.schema.type === 'array';
    const schema = resolveSchema(openapi, array ? content.schema.items : content.schema);
    const fields = Object.entries(schema.properties);
    if (fields.length === 0) {
      rows.push({ id, mediaType, schema: schema.name, field: null, type: fieldType(openapi, content.schema), required: operation.requestBody.required ?? null,
        minLength: null, maxLength: null, pattern: null, allowed: [], description: content.schema.description });
      continue;
    }
    for (const [field, raw] of fields) {
      const property = raw.$ref ? raw : { ...raw, ...(raw.allOf?.length === 1 && raw.allOf[0].$ref ? { $ref: raw.allOf[0].$ref } : {}) };
      rows.push({ id, mediaType, schema: schema.name, field: array ? `[].${field}` : field, type: fieldType(openapi, property),
        required: schema.required.includes(field), minLength: raw.minLength, maxLength: raw.maxLength, pattern: raw.pattern,
        allowed: raw.enum ?? [], description: raw.description });
    }
  }
  return {
    id: 'input-fields', title: '입력 항목 후보(요청 스키마)', sources: ['api-docs.json', 'config/governance/authorization-policies.json'],
    notices: ['GET 이 아닌 연산의 요청 본문 필드다 — 화면 입력 항목 설계의 후보이며 화면이 실제로 보이는 항목이 아니다.',
      '중첩 객체는 한 단계만 펼친다(object(스키마) 로 적는다). 배열 본문은 항목의 필드를 [].필드 로 적고, 펼칠 필드가 없는 본문은 필드 칸을 비운 한 행으로 둔다.',
      '길이·패턴·허용값은 OpenAPI 에 선언된 것만이다 — 서버 검증의 전부가 아니다.'],
    columns: [['id', '인터페이스 ID'], ['mediaType', '본문 형식'], ['schema', '요청 스키마'], ['field', '필드'], ['type', '타입'], ['required', '필수'],
      ['minLength', '최소 길이'], ['maxLength', '최대 길이'], ['pattern', '패턴'], ['allowed', '허용값'], ['description', '설명']],
    rows,
  };
}

const JAVA_TEST = /@(Test|ParameterizedTest|RepeatedTest|TestFactory|TestTemplate)\b/u;

/** Java 시험 메서드 — 시험 애노테이션 뒤 첫 메서드 선언과 그 앞의 @DisplayName. 문자열 이어 붙임은 첫 리터럴만 싣는다. */
export function javaTests(path, text) {
  const rows = [];
  const classes = [];
  let pending = [];
  const METHOD = /^(?:(?:public|protected|private|static|final|default|synchronized)\s+)*(?:<[^>]+>\s*)?[\w<>?,[\]. ]+?\s+(\w+)\s*\(/u;
  text.split(/\r?\n/u).forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    const declared = trimmed.match(/\b(?:class|record|interface|enum)\s+([A-Z]\w*)/u);
    if (declared) { classes.push(declared[1]); pending = []; return; }
    // 한 줄에 애노테이션과 선언이 함께 있으면(@Test void x()) 애노테이션을 떼고 선언을 본다.
    const rest = trimmed.replace(/^(?:@\w+(?:\([^)]*\))?\s+)+/u, '');
    if (trimmed.startsWith('@') && rest === trimmed) { pending.push(trimmed); return; }
    if (trimmed.startsWith('@')) pending.push(trimmed.slice(0, trimmed.length - rest.length));
    if (!pending.length) return;
    const method = rest.match(METHOD)?.[1];
    if (!method) { pending.push(trimmed); return; } // 여러 줄 애노테이션의 이어지는 줄
    const annotations = pending.join(' ');
    if (JAVA_TEST.test(annotations)) {
      rows.push({ kind: 'Java', file: path, line: index + 1, suite: classes.at(-1) ?? null, name: method,
        display: annotations.match(/@DisplayName\(\s*"((?:[^"\\]|\\.)*)"/u)?.[1] ?? null });
    }
    pending = [];
  });
  return rows;
}

/** Vitest·Playwright 시험 제목 — 줄 머리의 it(…)/test(…) 첫 문자열. describe 제목은 묶음 칸에 가장 가까운 것을 싣는다. */
export function scriptTests(path, text, kind) {
  const rows = [];
  const describes = [];
  text.split(/\r?\n/u).forEach((line, index) => {
    const describe = line.match(/^\s*(?:test\.)?describe(?:\.\w+)?\(\s*(['"`])((?:(?!\1).)*)\1/u);
    if (describe) describes.push({ indent: line.search(/\S/u), title: describe[2] });
    const found = line.match(/^\s*(?:it|test)(?:\.(?:skip|only|fixme|slow|todo|concurrent))?(?:\.each\([^)]*\))?\(\s*(['"`])((?:(?!\1).)*)\1/u);
    if (!found) return;
    const indent = line.search(/\S/u);
    const suite = [...describes].reverse().find((item) => item.indent < indent)?.title ?? null;
    rows.push({ kind, file: path, line: index + 1, suite, name: found[2], display: null });
  });
  return rows;
}

export function testListSheet(rows) {
  return {
    id: 'tests', title: '시험 목록', sources: ['foundation/src/test/', 'business-core/src/test/', 'business-app/src/test/', 'api-server/src/test/', 'frontend/src/', 'frontend/e2e/'],
    notices: ['정적 추출이다 — 매개변수화 시험의 사례 수, 동적 제목, 조건부 건너뜀은 반영하지 않는다. 통과 여부가 아니다(실행 결과는 CI 의 시험 결과 XML 이다).',
      '단위시험 ID 체계는 없다 — 파일 경로와 시험 이름으로 쓴다. 운영 계약 시험(scripts)과 독립 이관 도구(migration-tool)는 싣지 않는다.'],
    columns: [['kind', '종류'], ['file', '파일'], ['line', '줄'], ['suite', '묶음'], ['name', '시험 이름'], ['display', '표시 이름']],
    rows: [...rows].sort((left, right) => byText(left.file, right.file) || left.line - right.line),
  };
}

/**
 * 디스크에서 E2E 색인과 시험 파일을 읽는다. record(path, digest) 로 입력 집합의 다이제스트를 남기고, 읽는 파일마다
 * assertAllowed(path) 로 금지 입력 판정을 지난다.
 */
export async function loadTraceInputs(root, { digest, record, assertAllowed }) {
  const e2eFiles = walk(root, 'frontend/e2e', (path) => path.endsWith('.ts'));
  const gotoIndex = new Map();
  const texts = new Map();
  const read = (path) => { assertAllowed(path); const text = readFileSync(join(root, path), 'utf8'); texts.set(path, text); return text; };
  for (const file of e2eFiles) {
    const paths = gotoPaths(read(file));
    if (paths.length) gotoIndex.set(file, paths);
  }
  const { IMPACT_RULES } = await import('./e2e-shard-plan.mjs');
  const javaFiles = ['foundation', 'business-core', 'business-app', 'api-server'].flatMap((module) => walk(root, `${module}/src/test/java`, (path) => path.endsWith('.java')));
  const vitestFiles = walk(root, 'frontend/src', (path) => /\.test\.tsx?$/u.test(path));
  const specFiles = e2eFiles.filter((path) => path.endsWith('.spec.ts'));
  const tests = [
    ...javaFiles.flatMap((path) => javaTests(path, read(path))),
    ...vitestFiles.flatMap((path) => scriptTests(path, read(path), '프런트 단위')),
    ...specFiles.flatMap((path) => scriptTests(path, texts.get(path), 'E2E')),
  ];
  record(`(E2E·시험 소스 ${texts.size}개)`, digest([...texts].sort(([left], [right]) => byText(left, right)).map(([path, text]) => `${path}\t${digest(text)}\n`).join('')));
  return { e2e: { gotoIndex, impactRules: IMPACT_RULES }, tests };
}

/**
 * 기관 요구사항 추적 CSV — 저장소가 추적하는 파일과 금지 입력은 받지 않는다(커밋하지 않는 실행 인자).
 * 판정 전에 실제 경로로 정규화한다 — 대소문자만 다른 경로, junction·subst 같은 별칭으로 저장소 안 파일을 가리켜도 같은 판정을 받는다.
 */
export function readRequirementFile(root, path, { tracked, assertAllowed }) {
  const real = realpathSync.native(path);
  const inside = toPosix(relative(realpathSync.native(root), real));
  if (inside !== '' && !inside.startsWith('..') && !isAbsolute(inside)) {
    assertAllowed(inside);
    if (tracked(inside)) throw new Error(`requirement trace CSV must not be a tracked repository file: ${inside}`);
  }
  if (!statSync(real).isFile()) throw new Error(`requirement trace CSV is not a file: ${path}`);
  return readFileSync(real, 'utf8');
}
