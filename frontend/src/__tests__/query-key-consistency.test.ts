// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * 쿼리 키 일관성 계약(2026-11-26 품질 평가 PR-3b 4번).
 *
 * TanStack Query 는 키를 구조로 비교한다. 조회 키와 무효화 키가 다른 파일에 리터럴로 흩어져 있으면 한쪽의 오타·이름 변경이 다른 쪽의
 * 무효화를 **조용히** 깨뜨린다 — 저장한 뒤 목록이 갱신되지 않는데 아무 오류도 없다. 그래서 두 불변식을 생산 소스 전체에서 본다.
 *
 * ① 캐시 조작(invalidateQueries·setQueryData …)의 키는 어떤 조회 키와 자리마다 맞아야 한다. 상수(`ROOT`·`keys.users.all`)와 팩토리
 *    호출(`keys.scope(a, b)`, `homeKey(id)`)은 정의로 풀어 본다(같은 파일 우선, 다른 파일은 이름이 하나뿐일 때). 리터럴끼리는 모든 자리가
 *    같아야 하고, 한쪽이 동적 값인 자리는 맞을 수 있다고 본다. 첫 원소는 리터럴끼리 같아야 한다. `setQueryData`·`getQueryData`·
 *    `exact: true` 는 길이까지 같아야 한다(접두 일치가 아니다).
 * ② 같은 이름공간(키 맨 앞 문자열)을 리터럴로 적는 파일은 하나뿐이다 — 조회·조작 자리에 쓴 리터럴과, 키로 쓰인 상수·팩토리 정의를 센다.
 *    여러 파일이 나눠 쓰면 `src/queries/<도메인>-keys.ts` 의 계층형 팩토리로 옮기고 펼쳐 쓴다.
 *
 * 판정은 문자열이 아니라 TS 구문 트리다. 조회·조작은 호출 종류로 가르고, 알 수 없는 자리는 `queryFn` 이 있으면 조회로 보고 없으면
 * 세지 않는다.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 캐시를 읽거나 지우는 조작 — 그 키에 맞는 조회가 있어야 한다. */
const CACHE_OPS = new Set([
  'invalidateQueries', 'refetchQueries', 'removeQueries', 'cancelQueries', 'resetQueries', 'setQueriesData', 'getQueriesData',
  'isFetching', 'useIsFetching', 'findAll', 'find',
]);
/** 첫 인자가 곧 키이고 정확히 그 항목을 가리키는 조작. */
const EXACT_KEY_ARGUMENT_OPS = new Set(['setQueryData', 'getQueryData', 'getQueryState']);
/** 캐시 항목을 만드는 호출 — 조회다. */
const QUERY_PRODUCERS = new Set([
  'useQuery', 'useSuspenseQuery', 'useInfiniteQuery', 'useSuspenseInfiniteQuery', 'queryOptions', 'infiniteQueryOptions',
  'prefetchQuery', 'fetchQuery', 'ensureQueryData', 'prefetchInfiniteQuery', 'fetchInfiniteQuery', 'ensureInfiniteQueryData',
]);

type Element = { literal: string } | { expression: string } | { spread: string };
interface KeyUse {
  file: string;
  line: number;
  role: 'query' | 'op';
  /** 길이까지 같아야 하는 조작(setQueryData·getQueryData·exact: true). */
  exact: boolean;
  /** 상수·팩토리를 정의로 푼 원소 — ① 의 판정. 풀 수 없으면 null. */
  expanded: Element[] | null;
  /** 그 자리에 쓴 리터럴 이름공간(같은 파일의 const 변수·루트는 풀어 본다) — ② 의 판정. */
  writtenHead: string | null;
}
interface SourceFileEntry { path: string; text: string }

function productionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : productionFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : [];
  });
}

function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isParenthesizedExpression(current)
    || ts.isNonNullExpression(current)) {
    current = current.expression;
  }
  return current;
}

/** `a`, `a.b.c` — 식별자로만 이어진 참조 경로. */
function referencePath(node: ts.Expression): string | null {
  const target = unwrap(node);
  if (ts.isIdentifier(target)) return target.text;
  if (ts.isPropertyAccessExpression(target)) {
    const head = referencePath(target.expression);
    return head ? `${head}.${target.name.text}` : null;
  }
  return null;
}

/**
 * 정의: 배열 상수(`ROOT`, `keys.all`, `keys.users.all`), 배열을 돌려주는 팩토리(`keys.scope`, `function homeKey`), 또는 다른 키를
 * 가리키는 별칭 상수(`const scope = authorizationKeys.scope(a, b)`).
 */
interface Declaration {
  array?: ts.ArrayLiteralExpression;
  alias?: ts.Expression;
  file: string;
  context: FileContext;
  used: boolean;
}
type DeclarationTable = Map<string, Declaration[]>;
/** 파일의 정의 표, 그 파일에서 const·함수로 선언한 이름, import 한 이름(지역 이름 → 원래 이름). */
interface FileContext { table: DeclarationTable; declared: Set<string>; imports: Map<string, string> }

/** 팩토리 함수가 돌려주는 배열(식 본문 또는 첫 return). */
function returnedArray(fn: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration): ts.ArrayLiteralExpression | undefined {
  const body = fn.body;
  if (!body) return undefined;
  const returned = ts.isBlock(body) ? body.statements.find(ts.isReturnStatement)?.expression : body;
  if (!returned) return undefined;
  const array = unwrap(returned);
  return ts.isArrayLiteralExpression(array) ? array : undefined;
}

function fileContext(source: ts.SourceFile, file: string): FileContext {
  const context: FileContext = { table: new Map(), declared: new Set(), imports: new Map() };
  const add = (name: string, entry: Pick<Declaration, 'array' | 'alias'>): void => {
    context.table.set(name, [...(context.table.get(name) ?? []), { ...entry, file, context, used: false }]);
  };
  const addValue = (name: string, value: ts.Expression): void => {
    const target = unwrap(value);
    if (ts.isArrayLiteralExpression(target)) add(name, { array: target });
    else if (ts.isArrowFunction(target) || ts.isFunctionExpression(target)) {
      const array = returnedArray(target);
      if (array) add(name, { array });
    } else if (ts.isObjectLiteralExpression(target)) {
      for (const property of target.properties) {
        if (ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
          addValue(`${name}.${property.name.text}`, property.initializer);
        }
      }
    } else if (ts.isCallExpression(target) || ts.isIdentifier(target) || ts.isPropertyAccessExpression(target)) {
      add(name, { alias: target });
    }
  };
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.Const) !== 0) {
      for (const declaration of node.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        context.declared.add(declaration.name.text);
        if (declaration.initializer) addValue(declaration.name.text, declaration.initializer);
      }
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      context.declared.add(node.name.text);
      const array = returnedArray(node);
      if (array) add(node.name.text, { array });
    }
    if (ts.isImportSpecifier(node)) context.imports.set(node.name.text, (node.propertyName ?? node.name).text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return context;
}

class Resolver {
  constructor(private readonly global: DeclarationTable) {}

  /** 같은 파일에 선언한 이름이면 그 파일에서만, import 한 이름이면 다른 파일에서(이름이 하나뿐일 때) 찾는다. 그 밖(매개변수 등)은 풀지 않는다. */
  find(path: string, context: FileContext): Declaration | undefined {
    const [root, ...rest] = path.split('.');
    if (root === undefined) return undefined;
    if (context.declared.has(root)) {
      const own = context.table.get(path);
      return own?.length === 1 ? own[0] : undefined;
    }
    const imported = context.imports.get(root);
    if (imported === undefined) return undefined;
    const others = this.global.get([imported, ...rest].join('.'));
    return others?.length === 1 ? others[0] : undefined;
  }

  /** 키 식을 원소로 푼다. 풀 수 없으면 null. 쓰인 정의에 표시한다(② 가 센다). */
  expand(node: ts.Expression, context: FileContext, depth = 0): Element[] | null {
    const target = unwrap(node);
    if (ts.isArrayLiteralExpression(target)) return this.expandArray(target, context, depth);
    const path = ts.isCallExpression(target) ? referencePath(target.expression) : referencePath(target);
    // 한 단계마다 깊이가 두 번 오른다(정의 → 그 배열의 스프레드). 계층형 팩토리는 다섯 단계를 넘기도 한다 — 한도는 순환만 막는다.
    const found = path && depth < 40 ? this.find(path, context) : undefined;
    if (!found) return null;
    found.used = true;
    if (found.alias) return this.expand(found.alias, found.context, depth + 1);
    return found.array ? this.expandArray(found.array, found.context, depth + 1) : null;
  }

  private expandArray(array: ts.ArrayLiteralExpression, context: FileContext, depth: number): Element[] {
    return array.elements.flatMap((element): Element[] => {
      if (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)) return [{ literal: element.text }];
      if (ts.isSpreadElement(element)) {
        // 팩토리 매개변수(`...scope`)는 호출마다 다른 값이다 — 다른 곳의 같은 이름 상수로 풀지 않는다.
        if (isParameterReference(element.expression)) return [{ spread: element.expression.getText() }];
        return this.expand(element.expression, context, depth + 1) ?? [{ spread: element.expression.getText() }];
      }
      return [{ expression: element.getText() }];
    });
  }
}

/** 식이 둘러싼 함수의 매개변수(또는 그 속성)를 가리키는가. */
function isParameterReference(node: ts.Expression): boolean {
  let root = unwrap(node);
  while (ts.isPropertyAccessExpression(root)) root = unwrap(root.expression);
  if (!ts.isIdentifier(root)) return false;
  for (let scope: ts.Node | undefined = root.parent; scope; scope = scope.parent) {
    if (ts.isFunctionLike(scope) && scope.parameters.some((parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === root.text)) {
      return true;
    }
  }
  return false;
}

/** 그 자리에 쓴 맨 앞 리터럴 — 같은 파일의 const 배열(변수·펼친 루트)만 풀어 본다. 다른 파일 정의를 펼친 것은 공유가 아니다. */
function writtenHead(node: ts.Expression, context: FileContext, depth = 0): string | null {
  const target = unwrap(node);
  let array: ts.ArrayLiteralExpression | undefined;
  if (ts.isArrayLiteralExpression(target)) array = target;
  else if (ts.isIdentifier(target) && context.declared.has(target.text)) {
    const own = context.table.get(target.text);
    if (own?.length === 1) array = own[0].array;
  }
  const first = array?.elements[0];
  if (!first || depth > 6) return null;
  if (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) return first.text;
  return ts.isSpreadElement(first) && ts.isIdentifier(unwrap(first.expression)) ? writtenHead(first.expression, context, depth + 1) : null;
}

function calleeName(call: ts.CallExpression): string {
  const callee = call.expression;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  if (ts.isIdentifier(callee)) return callee.text;
  return '';
}

const hasProperty = (object: ts.ObjectLiteralExpression, name: string): boolean => object.properties
  .some((property) => (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)
    || ts.isMethodDeclaration(property)) && property.name?.getText() === name);

const isExactTrue = (object: ts.ObjectLiteralExpression): boolean => object.properties.some((property) => ts.isPropertyAssignment(property)
  && property.name.getText() === 'exact' && property.initializer.kind === ts.SyntaxKind.TrueKeyword);

/** `{ queryKey }` 를 담은 객체가 어느 호출에 들어가는지. 같은 파일 const 변수에 담긴 객체는 그 변수를 넘긴 호출을 찾는다. */
function objectRole(object: ts.ObjectLiteralExpression, source: ts.SourceFile): { role: KeyUse['role']; exact: boolean } | null {
  const fromCall = (call: ts.Node | undefined): { role: KeyUse['role']; exact: boolean } | null => {
    if (!call || !ts.isCallExpression(call)) return null;
    const name = calleeName(call);
    if (QUERY_PRODUCERS.has(name)) return { role: 'query', exact: false };
    if (CACHE_OPS.has(name)) return { role: 'op', exact: isExactTrue(object) };
    return null;
  };
  const direct = fromCall(object.parent);
  if (direct) return direct;
  const holder = object.parent;
  if (ts.isVariableDeclaration(holder) && ts.isIdentifier(holder.name)) {
    const name = holder.name.text;
    let found: { role: KeyUse['role']; exact: boolean } | null = null;
    const visit = (node: ts.Node): void => {
      if (!found && ts.isIdentifier(node) && node.text === name && node.parent && ts.isCallExpression(node.parent)
        && node.parent.arguments.includes(node)) found = fromCall(node.parent);
      ts.forEachChild(node, visit);
    };
    visit(source);
    if (found) return found;
  }
  // 알 수 없는 자리 — 조회 함수가 있으면 캐시를 만드는 조회 옵션이다. 필터만 있으면 세지 않는다.
  return hasProperty(object, 'queryFn') ? { role: 'query', exact: false } : null;
}

/** 키 목록 — `QueryKey[]` 로 타입을 단 배열이나 이름이 `…Keys` 인 함수가 돌려주는 배열. 원소가 각각 무효화 키다. */
function keyListElements(node: ts.Node, source: ts.SourceFile): ts.Expression[] {
  let list: ts.ArrayLiteralExpression | undefined;
  if (ts.isVariableDeclaration(node) && node.initializer && node.type && /\bQueryKey\b/.test(node.type.getText(source))) {
    const value = unwrap(node.initializer);
    if (ts.isArrayLiteralExpression(value)) list = value;
  }
  if (ts.isFunctionDeclaration(node) && node.name && /Keys$/.test(node.name.text)) list = returnedArray(node);
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /Keys$/.test(node.name.text) && node.initializer) {
    const value = unwrap(node.initializer);
    if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) list = returnedArray(value);
  }
  return (list?.elements ?? []).filter((element) => !ts.isSpreadElement(element));
}

/** `QueryKey[]` 로 선언한 변수 이름(같은 파일) — 그 변수에 `push` 한 원소도 무효화 키다. */
function queryKeyListNames(source: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.type && /\bQueryKey\b/.test(node.type.getText(source))) {
      names.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
}

export interface KeyCensus {
  uses: KeyUse[];
  /** 키로 쓰인 정의(상수·팩토리)가 그 파일에 리터럴로 적은 이름공간. */
  definitionHeads: { file: string; head: string }[];
}

export function collectKeyUses(files: readonly SourceFileEntry[]): KeyCensus {
  const parsed = files.map(({ path, text }) => {
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    return { path, source, context: fileContext(source, path) };
  });
  const global: DeclarationTable = new Map();
  for (const { context } of parsed) {
    for (const [name, entries] of context.table) global.set(name, [...(global.get(name) ?? []), ...entries]);
  }
  const resolver = new Resolver(global);

  const uses: KeyUse[] = [];
  for (const { path, source, context } of parsed) {
    const keyLists = queryKeyListNames(source);
    const record = (node: ts.Node, role: KeyUse['role'], exact: boolean, key: ts.Expression): void => {
      uses.push({
        file: path,
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        role,
        exact,
        expanded: resolver.expand(key, context),
        writtenHead: writtenHead(key, context),
      });
    };
    const visit = (node: ts.Node): void => {
      if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && node.name.getText(source) === 'queryKey'
        && ts.isObjectLiteralExpression(node.parent)) {
        const role = objectRole(node.parent, source);
        const key = ts.isPropertyAssignment(node) ? node.initializer : node.name;
        if (role) record(node, role.role, role.exact, key);
      }
      if (ts.isCallExpression(node) && EXACT_KEY_ARGUMENT_OPS.has(calleeName(node))) {
        const [first] = node.arguments;
        if (first && !ts.isObjectLiteralExpression(first)) record(node, 'op', true, first);
      }
      for (const key of keyListElements(node, source)) record(key, 'op', false, key);
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'push'
        && ts.isIdentifier(node.expression.expression) && keyLists.has(node.expression.expression.text)) {
        for (const argument of node.arguments) record(argument, 'op', false, argument);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  const definitionHeads: KeyCensus['definitionHeads'] = [];
  for (const entries of global.values()) {
    for (const entry of entries) {
      const first = entry.array?.elements[0];
      if (entry.used && first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))) {
        definitionHeads.push({ file: entry.file, head: first.text });
      }
    }
  }
  return { uses, definitionHeads };
}

const headOf = (elements: readonly Element[] | null): string | null => {
  const first = elements?.[0];
  return first && 'literal' in first ? first.literal : null;
};

/**
 * 조작 키가 조회 키와 맞는가. 첫 원소는 리터럴끼리 같아야 하고(머리가 풀리지 않은 조회 키는 무엇이든 될 수 있어 맞는다고 보면
 * 한 단어짜리 무효화가 늘 통과한다), 그 뒤로는 리터럴끼리 같아야 하며 한쪽이 동적 값이면 맞을 수 있다고 본다. 풀리지 않은 스프레드를
 * 만나면 뒤 자리를 알 수 없어 거기서 맞는다고 본다. 정확 조작은 길이까지 같아야 한다.
 */
export function keyMatches(op: readonly Element[], query: readonly Element[], exact: boolean): boolean {
  for (const [index, element] of op.entries()) {
    const other = query[index];
    if (other === undefined) return false;
    const literal = 'literal' in element ? element.literal : null;
    const otherLiteral = 'literal' in other ? other.literal : null;
    // 첫 원소는 스프레드보다 먼저 본다 — 머리가 풀리지 않은 조회 키 하나가 모든 조작을 덮으면 안 된다.
    if (index === 0) {
      if (literal === null || otherLiteral === null || literal !== otherLiteral) return false;
      continue;
    }
    if ('spread' in other || 'spread' in element) return true;
    if (literal !== null && otherLiteral !== null && literal !== otherLiteral) return false;
  }
  return !exact || op.length === query.length || query.slice(op.length).some((element) => 'spread' in element);
}

/** ① 맞는 조회 키가 없는 조작. 첫 원소가 리터럴로 풀린 조작만 본다. */
export function orphanOperations({ uses }: KeyCensus): KeyUse[] {
  const queries = uses.flatMap((use) => (use.role === 'query' && use.expanded ? [use.expanded] : []));
  return checkedOperations(uses).filter((use) => !queries.some((query) => use.expanded && keyMatches(use.expanded, query, use.exact)));
}

export function checkedOperations(uses: readonly KeyUse[]): KeyUse[] {
  return uses.filter((use) => use.role === 'op' && headOf(use.expanded) !== null);
}

/** ② 두 파일 이상이 리터럴로 적은 이름공간 → 파일 목록. */
export function sharedLiteralNamespaces({ uses, definitionHeads }: KeyCensus): Map<string, string[]> {
  const files = new Map<string, Set<string>>();
  const add = (head: string, file: string): void => {
    if (!files.has(head)) files.set(head, new Set());
    files.get(head)?.add(file);
  };
  for (const use of uses) if (use.writtenHead !== null) add(use.writtenHead, use.file);
  for (const { head, file } of definitionHeads) add(head, file);
  return new Map([...files].filter(([, set]) => set.size > 1).map(([head, set]) => [head, [...set].sort()]));
}

const production = (): KeyCensus => collectKeyUses(productionFiles(SRC).map((path) => ({
  path: relative(SRC, path).split(sep).join('/'),
  text: readFileSync(path, 'utf8'),
})));

const describeKey = (use: KeyUse): string => JSON.stringify((use.expanded ?? []).map((element) => (
  'literal' in element ? element.literal : 'spread' in element ? `...${element.spread}` : `{${element.expression}}`)));

describe('쿼리 키 일관성', () => {
  it('생산 소스에서 실제로 비교한다 — 첫 원소가 풀린 조회·조작과, 팩토리 호출을 푼 키가 있어야 한다(없으면 아래 계약은 공허하다)', () => {
    const census = production();
    expect(census.uses.filter((use) => use.role === 'query' && headOf(use.expanded) !== null).length).toBeGreaterThan(0);
    expect(checkedOperations(census.uses).length).toBeGreaterThan(0);
    expect(census.definitionHeads.length).toBeGreaterThan(0);
  });

  it('① 캐시 조작의 키는 어떤 조회 키와 자리마다 맞는다', () => {
    const orphans = orphanOperations(production()).map((use) => `${use.file}:${use.line}${use.exact ? ' (정확)' : ''} ${describeKey(use)}`);
    expect(orphans, `맞는 조회 키가 없는 무효화·캐시 조작(조용히 아무것도 갱신하지 않는다) — 조회와 같은 팩토리를 쓴다:\n${orphans.join('\n')}`).toEqual([]);
  });

  it('② 같은 쿼리 키 이름공간을 리터럴로 적는 파일은 하나뿐이다(여러 파일이면 src/queries/<도메인>-keys.ts 팩토리)', () => {
    const shared = [...sharedLiteralNamespaces(production())].map(([head, files]) => `'${head}': ${files.join(', ')}`);
    expect(shared, `여러 파일이 리터럴로 나눠 적는 쿼리 키 이름공간:\n${shared.join('\n')}`).toEqual([]);
  });

  it('판정 자체 — 자리마다·정확 조작·팩토리 호출·중첩 루트·키 목록 참조·옵션 변수·단축 속성·prefetch 를 가른다', () => {
    const census = collectKeyUses([
      {
        path: 'keys.ts',
        text: "export const orgKeys = { users: { all: ['users'] as const }, scope: (id: string) => ['auth', id] as const };\n"
          + "export function homeKey(id: string) { return ['home', 'today', id] as const; }\n",
      },
      {
        path: 'a.tsx',
        text: "import { orgKeys, homeKey } from './keys';\n"
          + "useQuery({ queryKey: [...orgKeys.scope(uid), 'group', code], queryFn });\n"
          + "qc.invalidateQueries({ queryKey: [...orgKeys.scope(uid), 'gruop'] });\n" // 동적 값 뒤의 오타
          + "useQuery({ queryKey: [...orgKeys.users.all, page], queryFn });\n"
          + "qc.invalidateQueries({ queryKey: ['users'] });\n" // 중첩 루트와 같은 값 — 맞는다
          + "useQuery({ queryKey: ['detail', id], queryFn });\n"
          + "qc.setQueryData(['detail'], next);\n" // 정확 조작인데 길이가 다르다
          + "qc.invalidateQueries({ queryKey: ['detail'] });\n" // 접두 무효화 — 맞는다
          + "const filters = { queryKey: ['jbos'] };\nqc.invalidateQueries(filters);\n" // 옵션 변수의 오타
          + "const queryKey = ['home', 'today', uid] as const;\nuseQuery({ queryKey, queryFn });\n" // 단축 속성 조회
          + "qc.prefetchQuery({ queryKey: ['summary'], queryFn });\n" // prefetch 는 조회다
          + "const deleted = ['knowledge-articels'] as const;\nconst stale: QueryKey[] = [deleted, homeKey(uid)];\n" // 목록의 참조 원소
          + "const scope = orgKeys.scope(uid);\nqc.setQueryData([...scope, 'gruop', code], next);\n" // 호출로 만든 별칭 상수
          // 머리가 풀리지 않은 조회 키(매개변수 스프레드)는 어떤 조작도 덮지 않는다 — 덮으면 위 다섯이 모두 맞는 것으로 보인다.
          + "function load(keys: string[]) { return useQuery({ queryKey: [...keys, 'x'], queryFn }); }\n",
      },
    ]);
    // 줄은 키를 적은 자리(옵션 객체의 queryKey, 목록의 원소)다. 팩토리를 풀면 동적 원소는 팩토리 매개변수 이름으로 보인다.
    expect(orphanOperations(census).map((use) => `${use.line}:${describeKey(use)}`)).toEqual([
      '3:["auth","{id}","gruop"]',
      '7:["detail"]',
      '9:["jbos"]',
      '15:["knowledge-articels"]',
      '17:["auth","{id}","gruop","{code}"]',
    ]);
  });

  it('판정 자체 — 리터럴을 여러 파일이 적으면(자리·루트 상수·파일마다 복제한 지역 팩토리·QueryKey[] 목록) 공유로 센다', () => {
    const census = collectKeyUses([
      { path: 'p.tsx', text: "const scope = ['auth', user?.id] as const;\nuseQuery({ queryKey: [...scope, 'groups'], queryFn });\n" },
      { path: 'q.tsx', text: "const scope = ['auth', user?.id];\nuseQuery({ queryKey: [...scope, 'catalog'], queryFn });\n" },
      { path: 'r.tsx', text: "const make = (id: number) => ['jobs', id] as const;\nuseQuery({ queryKey: make(1), queryFn });\n" },
      { path: 's.tsx', text: "const make = (id: number) => ['jobs', id] as const;\nqc.invalidateQueries({ queryKey: make(2) });\n" },
      { path: 't.tsx', text: "const stale: QueryKey[] = [orgKeys.all, ['notes']];\nuseQuery({ queryKey: ['notes', 1], queryFn });\n" },
      { path: 'u.ts', text: "export const noteKeys = { all: ['notes'] as const };\n" }, // 쓰이지 않는 정의는 세지 않는다
      // 다른 파일의 루트를 펼친 것은 공유가 아니다.
      { path: 'v.ts', text: "export const boxKeys = { all: ['boxes'] as const };\n" },
      {
        path: 'w.tsx',
        text: "import { boxKeys } from './v';\nuseQuery({ queryKey: [...boxKeys.all, page], queryFn });\nqc.invalidateQueries({ queryKey: boxKeys.all });\n",
      },
      // 같은 이름의 다른 파일 상수라도 import 하지 않았으면 따라가지 않는다(매개변수·지역 변수와 섞지 않는다).
      { path: 'x.tsx', text: "function load(scope: string[]) { return useQuery({ queryKey: [...scope, 'x'], queryFn }); }\n" },
    ]);
    expect([...sharedLiteralNamespaces(census)]).toEqual([
      ['auth', ['p.tsx', 'q.tsx']],
      ['jobs', ['r.tsx', 's.tsx']],
    ]);
  });
});
