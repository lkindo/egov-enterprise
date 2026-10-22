// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import { keepInProjection, missingOutsideLedger } from '@/test-utils/projection';
import { codeWithoutComments } from '../../../scripts/code-without-comments.mjs';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');

/**
 * 페이지당 건수 선택 채택 census.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A1 — **필수** 항목이다.
 *
 * 기능은 `StandardDataTable` 이 처음부터 갖고 있었는데(`pagination.onPageSizeChange`),
 * 2026-08-25 실측에서 서버 페이징이 있는 A1 화면 15개가 그 컨트롤을 전달하지 않고 있었다.
 * 업무 화면에서 "한 화면에 몇 건"은 스캔 비용을 직접 좌우하므로, 셸을 경유한다는 사실만으로는
 * 문법이 전달되지 않는다는 것을 보여 준 축이다.
 *
 * 이 게이트는 **서버 페이징이 있는 A1 소비 화면은 페이지당 건수를 제공한다**를 고정한다.
 * 페이징이 없는 화면(전량 조회)은 대상이 아니다 — 그때는 선택지 자체가 의미가 없다.
 */
function screenFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : screenFiles(path);
    if (!entry.name.endsWith('.tsx') || entry.name === 'loading.tsx' || entry.name.endsWith('.test.tsx')) return [];
    return [path];
  });
}

/*
 * [queryKey 결속 — 모집단 exact] 크기만 바꾸고 조회 키에 넣지 않으면 React Query 가 캐시를 그대로 돌려줘 **컨트롤이 조용히 죽는다**
 * (과거 설문 관리에서 같은 방식으로 죽은 새로고침 버튼이 있었다). 종전 판정은 파일에 `queryKey:` 글자가 없으면 건너뛰었고, 건너뛴 수를
 * 세지도 않았다. 그래서 조회를 query option factory(src/queries)로 옮긴 화면이 늘수록 모집단이 말없이 줄었다 — factory 인자에서 크기를
 * 빼도 녹색이었다(FE-CONTRACT-03).
 *
 * 이제 `onPageSizeChange` 를 (주석 밖에서) 넘기는 src/app 파일은 모두 다음 다섯 갈래 중 **정확히 하나**다. 어디에도 들지 않으면 red 다.
 *  (a) 리터럴 queryKey 결속 — 조회 훅을 쓰고 `queryKey: [...]` 배열을 직접 적는다. 종전 판정 그대로 표에 넘긴 값의 식별자가 그 배열에 있는지 본다.
 *  (b) factory 결속 — 조회 훅을 쓰고 리터럴 queryKey 가 없다. 표에 넘긴 크기의 식별자가 조회 훅 첫 인자인 factory 호출의 인자에 있는지
 *      구문 트리로 본다. factory 가 그 인자를 queryKey 에 넣는다는 사실은 factory **함수**마다 src/queries/__tests__ 의 단위 시험 it 하나가
 *      지키고, 아래 FACTORY_KEY_TESTS 가 그 it 를 함수 단위 exact 로 가리킨다.
 *  (c) 수동 조회, (d) 클라이언트 페이징, (e) 표 컴포넌트 자신 — React Query 조회가 아니어서 queryKey 판정 밖이다. 사유와 함께 exact 목록이다.
 *      목록에 있는데 조회 훅을 쓰기 시작하면 분류가 겹쳐 red 다 — 목록에서 빼고 (a)·(b) 판정을 받는다.
 *      사유 문장(크기가 재조회 인자·slice 계산에 쓰인다)은 이 census 가 아니라 화면마다 크기를 바꾸는 렌더 시험이 지킨다 —
 *      주소록(AddressBookListClient.page-size)·쪽지(NotePage.validation)·패턴 갤러리(pattern-gallery.page-size)·화면 관리(ProgramAdminClient).
 */
const QUERY_HOOKS = new Set(['useQuery', 'useSuspenseQuery', 'useQueries']);

/** (c) React Query 없이 조회 함수를 직접 다시 부르는 화면 — 크기 변경이 그 호출의 인자로 쓰인다. */
const MANUAL_FETCH: Readonly<Record<string, string>> = {
  'src/app/admin/collaboration/address-book/select-address-book-list/AddressBookListClient.tsx':
    '수동 조회 — 크기를 바꾸면 fetchList(1, 검색어, size) 로 1쪽부터 다시 부른다',
  'src/app/note/NoteHubClient.tsx': '수동 조회 — 조회 콜백이 page·pageSize 에 의존해 크기를 바꾸면 effect 가 다시 부른다',
};

/** (d) 이미 가진 행을 화면에서 잘라 보이는 화면 — 크기는 slice 계산에 쓰인다. */
const CLIENT_SLICE: Readonly<Record<string, string>> = {
  'src/app/admin/patterns/PatternGalleryClient.tsx': '클라이언트 페이징 — 시연용 고정 행을 filtered.slice 로 자른다',
  'src/app/admin/system/programs/ProgramAdminClient.tsx': '클라이언트 페이징 — 생성된 화면 목록을 slice 로 자른다',
};

/** (e) 표 컴포넌트 자신 — onPageSizeChange 를 받아 부르는 쪽이다. */
const COMPONENTS: Readonly<Record<string, string>> = {
  'src/app/components/ui/standard-data-table.tsx': '표 컴포넌트 — pagination.onPageSizeChange 를 받아 부른다',
};

const LISTED: ReadonlyArray<readonly [Exclude<PageSizeKind, 'literal-queryKey' | 'factory'>, Readonly<Record<string, string>>]> = [
  ['manual-fetch', MANUAL_FETCH],
  ['client-slice', CLIENT_SLICE],
  ['component', COMPONENTS],
];

type PageSizeKind = 'literal-queryKey' | 'factory' | 'manual-fetch' | 'client-slice' | 'component';

/** src/app 아래 시험이 아닌 .ts·.tsx(타입 선언 제외) — 모집단 후보. 훅·도우미 .ts 가 크기를 넘겨도 빠지지 않는다. */
function appSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : appSourceFiles(path);
    if (!/\.tsx?$/.test(entry.name) || entry.name.endsWith('.d.ts') || /\.test\.tsx?$/.test(entry.name)) return [];
    return [path];
  });
}

const frontendPath = (path: string) => relative(FRONTEND_DIR, path).split(sep).join('/');

function parse(code: string, fileName: string): ts.SourceFile {
  return ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

const lineOf = (sourceFile: ts.SourceFile, node: ts.Node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

const propertyNameIs = (property: ts.ObjectLiteralElementLike, name: string) =>
  property.name !== undefined && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) && property.name.text === name;

/** 조회 훅 호출 — `useQuery(...)` 와 `rq.useQuery(...)`. */
function queryHookCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  walk(sourceFile, (node) => {
    if (!ts.isCallExpression(node)) return;
    const callee = node.expression;
    const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
    if (QUERY_HOOKS.has(name)) calls.push(node);
  });
  return calls;
}

/**
 * 값으로 읽히는 식별자. 속성 이름(`a.b` 의 b, `{ b: 1 }` 의 b)은 값이 아니다. 함수 본문 안도 뺀다 — 조회 함수(queryFn)가 읽는 크기는
 * 캐시를 가르지 않는다.
 */
function valueIdentifiers(node: ts.Node): Set<string> {
  const names = new Set<string>();
  const visit = (current: ts.Node) => {
    if (ts.isFunctionLike(current)) return;
    if (ts.isIdentifier(current)) {
      const parent = current.parent;
      const isPropertyName = (ts.isPropertyAccessExpression(parent) && parent.name === current)
        || (ts.isPropertyAssignment(parent) && parent.name === current);
      if (!isPropertyName) names.add(current.text);
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return names;
}

/** 표에 넘긴 pagination 객체(onPageSizeChange 를 가진 객체 리터럴)마다 pageSize 값의 식별자. 같은 객체에 pageSize 가 없으면 빈 집합(판정 불가). */
function paginationPageSizes(sourceFile: ts.SourceFile): Array<{ line: number; identifiers: Set<string> }> {
  const found: Array<{ line: number; identifiers: Set<string> }> = [];
  walk(sourceFile, (node) => {
    if (!ts.isObjectLiteralExpression(node) || !node.properties.some((property) => propertyNameIs(property, 'onPageSizeChange'))) return;
    const pageSize = node.properties.find((property) => propertyNameIs(property, 'pageSize'));
    const identifiers = pageSize === undefined ? new Set<string>()
      : ts.isShorthandPropertyAssignment(pageSize) ? new Set([pageSize.name.text])
        : ts.isPropertyAssignment(pageSize) ? valueIdentifiers(pageSize.initializer)
          : new Set<string>();
    found.push({ line: lineOf(sourceFile, node), identifiers });
  });
  return found;
}

/**
 * 조회 훅 첫 인자의 factory 호출 — `useQuery(factory(page, pageSize))` 와 `useQuery({ ...factory(page, pageSize), enabled })`.
 * 옵션 객체의 다른 속성(enabled·select)과 변수에 담아 넘긴 옵션은 키 계산으로 보지 않는다(판정할 수 없으면 결속이 아니다).
 */
function factoryCalls(hook: ts.CallExpression): ts.CallExpression[] {
  const first = hook.arguments[0];
  if (first === undefined) return [];
  if (ts.isCallExpression(first)) return [first];
  if (!ts.isObjectLiteralExpression(first)) return [];
  return first.properties.flatMap((property) => (
    ts.isSpreadAssignment(property) && ts.isCallExpression(property.expression) ? [property.expression] : []));
}

/** factory 호출의 인자로 넘긴 값의 식별자. */
function factoryArgumentIdentifiers(factory: ts.CallExpression): Set<string> {
  const names = new Set<string>();
  for (const argument of factory.arguments) for (const name of valueIdentifiers(argument)) names.add(name);
  return names;
}

/** 호출한 함수의 이름 경로(`scrapQueryOptions.list(...)` → `scrapQueryOptions.list`). 이름과 점으로만 된 호출이 아니면 undefined. */
function calleePath(call: ts.CallExpression): string | undefined {
  const names: string[] = [];
  let root: ts.Expression = call.expression;
  while (ts.isPropertyAccessExpression(root)) {
    names.unshift(root.name.text);
    root = root.expression;
  }
  return ts.isIdentifier(root) ? [root.text, ...names].join('.') : undefined;
}

/** factory 호출의 바깥 이름(`scrapQueryOptions.list(...)` 의 scrapQueryOptions)을 import 한 모듈. import 가 아니면 undefined. */
function factoryModule(sourceFile: ts.SourceFile, name: string): string | undefined {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const clause = statement.importClause;
    const named = clause?.namedBindings !== undefined && ts.isNamedImports(clause.namedBindings)
      && clause.namedBindings.elements.some((element) => element.name.text === name);
    if (clause?.name?.text === name || named) return statement.moduleSpecifier.text;
  }
  return undefined;
}

/**
 * 크기 결속을 증명한 factory 함수의 키 — `@/queries/<모듈>#<callee>`(예: `@/queries/scrap-query-options#scrapQueryOptions.list`).
 * 모듈만 기록하면 같은 모듈의 다른 함수(크기를 인자로 받고 키에는 넣지 않는 새 함수)도 그 모듈의 시험 파일 하나로 통과했다(R5-2).
 * 키를 만들 수 없으면 그 사유를 돌려준다 — FACTORY_KEY_TESTS 에 없는 값이라 표 대조가 red 로 드러낸다.
 */
function factoryKey(sourceFile: ts.SourceFile, factory: ts.CallExpression): string {
  const callee = calleePath(factory);
  if (callee === undefined) return `${lineOf(sourceFile, factory)}행: factory 를 이름으로 부르지 않는다`;
  const moduleName = factoryModule(sourceFile, callee.split('.')[0]);
  return moduleName === undefined ? `${lineOf(sourceFile, factory)}행: factory 를 import 하지 않는다` : `${moduleName}#${callee}`;
}

/**
 * (b) factory 결속의 키 보장 — factory 함수마다 그 사실을 단언하는 단위 시험(src/queries/__tests__/<모듈>.test.ts)의 it 제목. 그 it 는
 * 크기만 다른 두 호출의 queryKey 가 다르다고 단언해야 한다(keyTestProblems). 모집단에서 관측한 factory 함수와 양방향 exact 다 —
 * 표에 없는 함수(같은 모듈의 새 함수 포함)도, 관측되지 않는 낡은 행도 red 다. 투영으로 빠진 행은 원장이 증명한다.
 */
const FACTORY_KEY_TESTS: Readonly<Record<string, string>> = {
  '@/queries/board-master-query-options#boardMasterQueryOptions.list':
    '목록 query options의 queryKey가 쪽·크기를 담는다(페이지 크기 결속 census 가 이 사실에 기댄다)',
  '@/queries/comment-query-options#commentQueryOptions.adminList':
    '관리자 목록 query options의 queryKey가 쪽·크기를 담는다(페이지 크기 결속 census 가 이 사실에 기댄다)',
  '@/queries/scrap-query-options#scrapQueryOptions.list':
    '목록 query options의 queryKey가 쪽·크기를 담는다(페이지 크기 결속 census 가 이 사실에 기댄다)',
  '@/queries/survey-query-options#surveyListOptions': '목록 queryKey 가 쪽·크기를 담아 크기를 바꾸면 다른 캐시 항목이 된다',
};

/** 표 키의 모듈 이름과 callee. 형식이 아니면 undefined. */
function parseFactoryKey(key: string): { module: string; callee: string } | undefined {
  const match = /^@\/queries\/([\w-]+)#([\w$]+(?:\.[\w$]+)*)$/.exec(key);
  return match === null ? undefined : { module: match[1], callee: match[2] };
}

/** 표 행이 가리키는 factory 모듈과 그 단위 시험 파일(절대 경로). */
const factoryKeyFiles = (moduleName: string) => [
  join(FRONTEND_DIR, 'src', 'queries', `${moduleName}.ts`),
  join(FRONTEND_DIR, 'src', 'queries', '__tests__', `${moduleName}.test.ts`),
];

/** 관측한 factory 키와 표의 차이 — 표에 없는 키(unknown)와 관측되지 않는 표 키(stale). */
function factoryKeyTableDiff(observed: readonly string[], expected: readonly string[]): { unknown: string[]; stale: string[] } {
  return {
    unknown: [...new Set(observed)].filter((key) => !expected.includes(key)).sort(),
    stale: expected.filter((key) => !observed.includes(key)).sort(),
  };
}

/**
 * 단위 시험 소스에서 제목이 `title` 인 it 가 queryKey 결속을 단언하는지. 문제 목록(비면 통과).
 * 그 it 안에서 `callee` 를 두 번 이상 부르고, `.queryKey` 를 읽고, `.not.toEqual`(또는 toStrictEqual)로 두 키가 다르다고 단언해야 한다.
 * 주석 속 제목·호출은 세지 않는다.
 */
function keyTestProblems(testSource: string, testFile: string, callee: string, title: string): string[] {
  const sourceFile = parse(codeWithoutComments(testSource, testFile), testFile);
  const blocks: ts.CallExpression[] = [];
  walk(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || !['it', 'test'].includes(node.expression.text)) return;
    const name = node.arguments[0];
    if (name !== undefined && (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) && name.text === title) blocks.push(node);
  });
  if (blocks.length !== 1) return [`${testFile}: it('${title}') 가 ${blocks.length}개다 — 하나여야 한다`];
  const body = blocks[0].arguments[1];
  let calls = 0;
  let readsKey = false;
  let assertsDifferent = false;
  if (body !== undefined) {
    walk(body, (node) => {
      if (ts.isCallExpression(node) && calleePath(node) === callee) calls += 1;
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'queryKey') readsKey = true;
      if (ts.isPropertyAccessExpression(node) && ['toEqual', 'toStrictEqual'].includes(node.name.text)
        && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'not') assertsDifferent = true;
    });
  }
  const problems: string[] = [];
  if (calls < 2) problems.push(`${testFile}: it('${title}') 가 ${callee} 를 두 번 이상 부르지 않는다(${calls}회)`);
  if (!readsKey || !assertsDifferent) problems.push(`${testFile}: it('${title}') 가 두 호출의 queryKey 가 다르다고 단언하지 않는다`);
  return problems;
}

/**
 * (a) 리터럴 queryKey 결속(종전 판정). 화면마다 상태 이름이 다르다(`pageSize`·`pageUnit`·`size`). 이름을 열거하는 대신 **표에 실제로 넘긴 값**의
 * 식별자를 뽑아 그 식별자가 queryKey 배열에 있는지 본다(2026-08-25 실측: 이름을 열거했더니 `size` 를 쓰는 포상 화면이 오탐으로 걸렸다).
 * 값이 단일 식별자가 아닐 수 있다(`data?.size ?? pageSize` 같은 대체식) — 식별자를 모두 모아 **하나라도** queryKey 에
 * 있으면 결속된 것으로 본다. 결속되면 true. 값을 찾지 못하면 종전에는 건너뛰었지만, 지금은 false 를 돌려 구문 트리 판정으로 넘긴다.
 */
function literalQueryKeyBound(code: string): boolean {
  const expression = code.match(/pageSize:\s*([^,\n]+)/)?.[1]
    ?? (/(^|[\s,{])pageSize\s*,/.test(code) ? 'pageSize' : '');
  const identifiers = expression.match(/[A-Za-z_$][\w$]*/g) ?? [];
  return identifiers.some((identifier) => new RegExp(`queryKey: \\[[^\\]]*\\b${identifier}\\b[^\\]]*\\]`).test(code));
}

interface PageSizeVerdict {
  readonly kind?: PageSizeKind;
  /** 분류·결속 위반. 비어 있으면 통과다. */
  readonly problems: string[];
  /** 크기 결속을 증명한 factory 함수(`@/queries/<모듈>#<callee>`) — FACTORY_KEY_TESTS 의 단위 시험 it 가 queryKey 결속을 지킨다. */
  readonly factoryKeys: string[];
}

/** 한 파일의 판정. `file` 은 frontend 기준 경로(`src/app/...`), `code` 는 주석을 뺀 소스다. */
function judgePageSizeScreen(file: string, code: string): PageSizeVerdict {
  const sourceFile = parse(code, file);
  const hooks = queryHookCalls(sourceFile);
  const hasLiteralKey = code.includes('queryKey:');
  const listed = LISTED.filter(([, table]) => Object.hasOwn(table, file)).map(([kind]) => kind);
  if (listed.length > 1) return { problems: [`목록 여러 곳에 있다: ${listed.join(', ')}`], factoryKeys: [] };
  if (listed.length === 1) {
    return hooks.length > 0 || hasLiteralKey
      ? { problems: [`${listed[0]} 로 적었는데 React Query 로 조회한다 — 목록에서 빼고 queryKey 판정을 받는다`], factoryKeys: [] }
      : { kind: listed[0], problems: [], factoryKeys: [] };
  }
  if (hooks.length === 0) {
    return { problems: ['분류 밖 — React Query 조회 훅이 없고 수동 조회·클라이언트 페이징·컴포넌트 목록에도 없다'], factoryKeys: [] };
  }

  const kind: PageSizeKind = hasLiteralKey ? 'literal-queryKey' : 'factory';
  if (hasLiteralKey && literalQueryKeyBound(code)) return { kind, problems: [], factoryKeys: [] };

  // 리터럴 queryKey 로 묶이지 않았으면(또는 리터럴 queryKey 가 없으면) 표의 pagination 객체마다 factory 인자 결속을 본다.
  const sizes = paginationPageSizes(sourceFile);
  if (sizes.length === 0) return { kind, problems: ['onPageSizeChange 를 가진 pagination 객체를 찾지 못해 판정할 수 없다'], factoryKeys: [] };
  const factories = hooks.flatMap(factoryCalls);
  const problems: string[] = [];
  const factoryKeys: string[] = [];
  for (const { line, identifiers } of sizes) {
    if (identifiers.size === 0) {
      problems.push(`${line}행: pageSize 를 onPageSizeChange 와 같은 객체로 넘기지 않아 판정할 수 없다`);
      continue;
    }
    const binding = factories.find((factory) => [...factoryArgumentIdentifiers(factory)].some((name) => identifiers.has(name)));
    if (binding === undefined) {
      problems.push(`${line}행: 표에 넘긴 크기(${[...identifiers].join(', ')})가 queryKey 에도 factory 인자에도 없다`);
      continue;
    }
    factoryKeys.push(factoryKey(sourceFile, binding));
  }
  return { kind, problems, factoryKeys };
}

describe('페이지당 건수 채택 census', () => {
  it('서버 페이징이 있는 A1 화면은 페이지당 건수를 제공한다', () => {
    const missing = screenFiles(APP_DIR)
      .filter((path) => {
        const source = readFileSync(path, 'utf8');
        return source.includes('components/patterns/work-list-page')
          && source.includes('totalPages:')
          && !source.includes('onPageSizeChange');
      })
      .map((path) => relative(FRONTEND_DIR, path).split(sep).join('/'))
      .sort();

    expect(
      missing,
      missing.length > 0
        ? `페이지당 건수 미제공:\n${missing.join('\n')}\n`
          + 'pagination 에 onPageSizeChange 를 넘기고, 변경 시 페이지를 1로 되돌린 뒤 queryKey 에 포함하세요.'
        : '',
    ).toEqual([]);
  });

  describe('페이지 크기를 바꿔도 재조회되지 않는 화면이 없다(queryKey 결속)', () => {
    const population = appSourceFiles(APP_DIR)
      .map((path) => ({ file: frontendPath(path), code: codeWithoutComments(readFileSync(path, 'utf8'), path) }))
      .filter(({ code }) => code.includes('onPageSizeChange'))
      .map(({ file, code }) => ({ file, ...judgePageSizeScreen(file, code) }));
    const ofKind = (kind: PageSizeKind) => population.filter((entry) => entry.kind === kind && entry.problems.length === 0);

    it('모집단이 실제로 있다(vacuity floor)', () => {
      // 스캔이 무너지면 통과가 아니라 실패다. 하한은 2026-10-17 실측(원본 36·리터럴 28, 가장 작은 core·approval 투영 16·14) 아래다 —
      // 정당하게 줄면 같은 변경에서 낮추고 사유를 남긴다.
      expect(population.length).toBeGreaterThanOrEqual(12);
      expect(ofKind('literal-queryKey').length).toBeGreaterThanOrEqual(10);
    });

    it('onPageSizeChange 를 넘기는 파일은 모두 한 갈래로 판정되고 크기가 조회 키에 묶인다', () => {
      const violations = population
        .filter(({ problems }) => problems.length > 0)
        .map(({ file, problems }) => `${file}: ${problems.join(' / ')}`);
      expect(violations, `페이지 크기 결속 위반 — 크기를 queryKey(또는 queryKey 를 만드는 factory 인자)에 넣거나, React Query 가 아니면 사유와 함께 목록에 적으세요:\n${violations.join('\n')}`)
        .toEqual([]);
    });

    it('목록(수동 조회·클라이언트 페이징·컴포넌트)은 실재하는 모집단 파일만 가리킨다', () => {
      const inPopulation = new Set(population.map(({ file }) => file));
      const listedFiles = LISTED.flatMap(([, table]) => Object.keys(table));
      // 투영으로 빠진 파일은 원장이 증명하고, 남은 파일은 지금도 onPageSizeChange 를 넘겨야 한다(낡은 항목은 사각을 만든다).
      expect(missingOutsideLedger(listedFiles.map((file) => join(FRONTEND_DIR, file)))).toEqual([]);
      const stale = keepInProjection(listedFiles, (file) => join(FRONTEND_DIR, file)).filter((file) => !inPopulation.has(file));
      expect(stale, '목록의 파일이 더는 onPageSizeChange 를 넘기지 않습니다 — 목록에서 지우세요').toEqual([]);
      for (const [, table] of LISTED) for (const reason of Object.values(table)) expect(reason.trim().length).toBeGreaterThan(0);
    });

    // factory 인자에 크기가 있다는 것만으로는 그 인자가 queryKey 에 들어간다는 보장이 없다 — 그 사실은 factory 함수마다 단위 시험 it 가
    //   고정하고, 그 it 를 FACTORY_KEY_TESTS 가 함수 단위 exact 로 가리킨다. 종전에는 모듈의 시험 파일이 있는지만 보았다(R5-2).
    const keyRows = Object.entries(FACTORY_KEY_TESTS).map(([key, title]) => ({ key, title, parsed: parseFactoryKey(key) }));

    it('factory 결속 화면이 부르는 factory 함수는 키 결속 단위 시험 표(FACTORY_KEY_TESTS)와 exact 다', () => {
      expect(keyRows.filter(({ parsed }) => parsed === undefined).map(({ key }) => key), '표 키는 @/queries/<모듈>#<callee> 형식이다').toEqual([]);
      // 투영으로 빠진 행은 원장이 증명하고(factory 모듈·단위 시험이 함께 빠진다), 남은 행은 지금도 모집단이 불러야 한다.
      const files = keyRows.flatMap(({ parsed }) => (parsed === undefined ? [] : factoryKeyFiles(parsed.module)));
      expect(missingOutsideLedger(files)).toEqual([]);
      const expected = keepInProjection(keyRows, ({ parsed }) => (parsed === undefined ? [] : factoryKeyFiles(parsed.module))).map(({ key }) => key);
      const observed = population.flatMap(({ factoryKeys }) => factoryKeys);
      expect(
        factoryKeyTableDiff(observed, expected),
        'unknown: 표에 없는 factory 함수 — 크기만 다른 두 호출의 queryKey 가 다르다고 단언하는 단위 시험 it 를 두고 표에 적으세요. '
          + 'stale: 모집단이 더는 부르지 않는 표 행 — 지우세요.',
      ).toEqual({ unknown: [], stale: [] });
    });

    it('표의 행마다 그 단위 시험 it 가 크기만 다른 두 호출의 queryKey 가 다르다고 단언한다', () => {
      const rows = keepInProjection(keyRows, ({ parsed }) => (parsed === undefined ? [] : factoryKeyFiles(parsed.module)));
      const problems = rows.flatMap(({ parsed, title }) => {
        if (parsed === undefined) return [];
        const testFile = factoryKeyFiles(parsed.module)[1];
        return keyTestProblems(readFileSync(testFile, 'utf8'), frontendPath(testFile), parsed.callee, title);
      });
      expect(problems, 'factory 키 결속 단위 시험이 표와 맞지 않습니다').toEqual([]);
    });
  });

  describe('판정 규칙(fixture)', () => {
    const SURVEY_LIKE = [
      "import { useQuery } from '@tanstack/react-query';",
      "import { surveyListOptions } from '@/queries/survey-query-options';",
      'export function SurveyClient() {',
      '  const [pageSize, setPageSize] = useState(10);',
      '  const { data } = useQuery(surveyListOptions(page, pageSize));',
      '  return <StandardDataTable pagination={{ currentPage: page + 1, totalPages: 3, pageSize,',
      '    onPageSizeChange: (size) => { setPageSize(size); setPage(0); } }} />;',
      '}',
    ].join('\n');
    const judge = (source: string, file = 'src/app/x/X.tsx') => judgePageSizeScreen(file, codeWithoutComments(source, file));

    it('factory 인자에 크기를 넘기면 (b) 결속이고 그 factory 모듈을 가리킨다', () => {
      expect(judge(SURVEY_LIKE)).toEqual({ kind: 'factory', problems: [], factoryKeys: ['@/queries/survey-query-options#surveyListOptions'] });
    });

    it('factory 인자에서 크기를 빼면 red 다(종전 판정은 queryKey: 가 없어 건너뛰었다)', () => {
      const dropped = SURVEY_LIKE.replace('surveyListOptions(page, pageSize)', 'surveyListOptions(page)');
      expect(judge(dropped).problems).toEqual(['6행: 표에 넘긴 크기(pageSize)가 queryKey 에도 factory 인자에도 없다']);
    });

    it('크기를 조회 함수 본문이나 속성 이름·주석에만 두면 결속이 아니다', () => {
      const inQueryFn = SURVEY_LIKE.replace('useQuery(surveyListOptions(page, pageSize))',
        'useQuery({ ...surveyListOptions(page), queryFn: () => load(page, pageSize) })');
      expect(judge(inQueryFn).problems).toHaveLength(1);
      const asPropertyName = SURVEY_LIKE.replace('surveyListOptions(page, pageSize)', 'surveyListOptions({ page, pageSize: 10 })');
      expect(judge(asPropertyName).problems).toHaveLength(1);
      const inComment = SURVEY_LIKE.replace('surveyListOptions(page, pageSize)', 'surveyListOptions(page /* pageSize */)');
      expect(judge(inComment).problems).toHaveLength(1);
      // 펼친 factory 호출의 인자는 키 계산이다.
      const spread = SURVEY_LIKE.replace('useQuery(surveyListOptions(page, pageSize))',
        'useQuery({ ...surveyListOptions(page, pageSize), enabled: true })');
      expect(judge(spread)).toEqual({ kind: 'factory', problems: [], factoryKeys: ['@/queries/survey-query-options#surveyListOptions'] });
    });

    it('리터럴 queryKey 화면은 종전 판정 그대로다', () => {
      const literal = SURVEY_LIKE.replace('useQuery(surveyListOptions(page, pageSize))',
        "useQuery({ queryKey: ['surveys', page, pageSize], queryFn: () => load(page, pageSize) })");
      expect(judge(literal)).toEqual({ kind: 'literal-queryKey', problems: [], factoryKeys: [] });
      const unbound = literal.replace("queryKey: ['surveys', page, pageSize]", "queryKey: ['surveys', page]");
      expect(judge(unbound).problems).toEqual(['6행: 표에 넘긴 크기(pageSize)가 queryKey 에도 factory 인자에도 없다']);
    });

    it('분류 밖의 새 onPageSizeChange 파일은 red 다', () => {
      const manual = SURVEY_LIKE.replace("import { useQuery } from '@tanstack/react-query';\n", '')
        .replace('const { data } = useQuery(surveyListOptions(page, pageSize));', 'useEffect(() => { void load(page, pageSize); }, [page, pageSize]);');
      expect(judge(manual).problems).toEqual(['분류 밖 — React Query 조회 훅이 없고 수동 조회·클라이언트 페이징·컴포넌트 목록에도 없다']);
      // 목록에 있으면 그 갈래다. 목록에 있는데 조회 훅을 쓰면 분류가 겹친다.
      const listedFile = 'src/app/note/NoteHubClient.tsx';
      expect(judge(manual, listedFile)).toEqual({ kind: 'manual-fetch', problems: [], factoryKeys: [] });
      expect(judge(SURVEY_LIKE, listedFile).problems).toEqual(['manual-fetch 로 적었는데 React Query 로 조회한다 — 목록에서 빼고 queryKey 판정을 받는다']);
    });

    it('시험 파일이 있는 모듈의 새 factory 함수도 표에 없으면 red 다(R5-2)', () => {
      // 실패 시나리오: 크기를 인자로 받지만 queryKey 에는 넣지 않는 새 함수. 모듈의 시험 파일(approval-query-options.test.ts)은 이미
      //   있어서 종전 판정은 녹색이었다. 이제 함수 단위로 기록하므로 표에 없는 키가 된다.
      const paged = SURVEY_LIKE
        .replace("import { surveyListOptions } from '@/queries/survey-query-options';", "import { approvalQueryOptions } from '@/queries/approval-query-options';")
        .replace('surveyListOptions(page, pageSize)', 'approvalQueryOptions.paged(page, pageSize)');
      const verdict = judge(paged);
      expect(verdict).toEqual({ kind: 'factory', problems: [], factoryKeys: ['@/queries/approval-query-options#approvalQueryOptions.paged'] });
      const tableKeys = Object.keys(FACTORY_KEY_TESTS);
      expect(factoryKeyTableDiff([...tableKeys, ...verdict.factoryKeys], tableKeys))
        .toEqual({ unknown: ['@/queries/approval-query-options#approvalQueryOptions.paged'], stale: [] });
      // 표의 행을 아무도 부르지 않으면 낡은 행이다.
      expect(factoryKeyTableDiff([], ['@/queries/x#y'])).toEqual({ unknown: [], stale: ['@/queries/x#y'] });
    });

    it('키 결속 it 는 그 제목으로 하나 있고, 크기만 다른 두 호출의 queryKey 가 다르다고 단언해야 한다', () => {
      const UNIT = [
        "it('목록 키가 크기를 담는다', () => {",
        '  expect(surveyListOptions(2, 50).queryKey).not.toEqual(surveyListOptions(2, 20).queryKey);',
        '});',
      ].join('\n');
      const check = (source: string) => keyTestProblems(source, 'x.test.ts', 'surveyListOptions', '목록 키가 크기를 담는다');
      expect(check(UNIT)).toEqual([]);
      // 제목이 지워지거나 바뀌면 red 다. 주석으로 남긴 it 도 세지 않는다.
      const missing = ["x.test.ts: it('목록 키가 크기를 담는다') 가 0개다 — 하나여야 한다"];
      expect(check(UNIT.replace('크기를 담는다', '쪽을 담는다'))).toEqual(missing);
      expect(check(`/*\n${UNIT}\n*/`)).toEqual(missing);
      // 두 키가 같다고 단언하거나, factory 를 한 번만 부르면 결속 증명이 아니다.
      expect(check(UNIT.replace('.not.toEqual', '.toEqual')))
        .toEqual(["x.test.ts: it('목록 키가 크기를 담는다') 가 두 호출의 queryKey 가 다르다고 단언하지 않는다"]);
      expect(check(UNIT.replace('surveyListOptions(2, 20).queryKey', "['surveys']")))
        .toEqual(["x.test.ts: it('목록 키가 크기를 담는다') 가 surveyListOptions 를 두 번 이상 부르지 않는다(1회)"]);
    });
  });
});
