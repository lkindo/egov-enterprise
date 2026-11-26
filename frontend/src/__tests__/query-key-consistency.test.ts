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
 * ① 캐시 조작(invalidateQueries·setQueryData …)의 키는 어떤 조회 키와 자리마다 맞아야 한다. 키를 펼친 상수(`[...ROOT, page]`)는 그
 *    정의로 풀어 보고(같은 파일 우선, 다른 파일은 이름이 하나뿐일 때), `as const` 로 끝나는 팩토리 반환 배열도 조회 후보로 본다.
 *    풀 수 없는 키(호출 결과·매개변수)는 보지 않는다 — 같은 팩토리를 쓰는 양쪽은 구성상 맞는다.
 * ② 그 자리에 **리터럴로 쓴** 키의 맨 앞 이름(이름공간)은 한 파일 안에서만 쓴다. 여러 파일이 나눠 쓰면 `src/queries/<도메인>-keys.ts`
 *    의 계층형 팩토리로 옮긴다 — 상수·팩토리를 펼쳐 쓰는 것은 공유가 아니다.
 *
 * 판정은 문자열이 아니라 TS 구문 트리다.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

const CACHE_OPS = new Set([
  'invalidateQueries', 'refetchQueries', 'setQueryData', 'getQueryData', 'removeQueries', 'cancelQueries', 'resetQueries',
  'setQueriesData', 'getQueriesData', 'isFetching', 'fetchQuery', 'prefetchQuery', 'ensureQueryData', 'getQueryState',
]);
/** 첫 인자가 곧 키인 조작. */
const KEY_ARGUMENT_OPS = new Set(['setQueryData', 'getQueryData', 'getQueryState']);

type Element = { literal: string } | { expression: string } | { spread: string };
interface KeyUse {
  file: string;
  line: number;
  role: 'query' | 'op';
  /** 그 자리에 쓴 원소(같은 파일 const 변수만 따라간다) — ② 의 판정. */
  written: Element[] | null;
  /** 스프레드·상수를 정의로 푼 원소 — ① 의 판정. */
  expanded: Element[] | null;
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
  while (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

const isConstAssertion = (node: ts.Expression): boolean => {
  let current = node;
  while (ts.isParenthesizedExpression(current) || ts.isSatisfiesExpression(current)) current = current.expression;
  return ts.isAsExpression(current) && ts.isTypeReferenceNode(current.type) && current.type.typeName.getText() === 'const';
};

/** 이름(`ROOT`)·객체 속성(`keys.all`) → 배열 리터럴. */
type ArrayTable = Map<string, ts.ArrayLiteralExpression[]>;

function arrayDeclarations(source: ts.SourceFile): ArrayTable {
  const table: ArrayTable = new Map();
  const add = (name: string, node: ts.ArrayLiteralExpression): void => {
    table.set(name, [...(table.get(name) ?? []), node]);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.Const) !== 0) {
      for (const declaration of node.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
        const initializer = unwrap(declaration.initializer);
        if (ts.isArrayLiteralExpression(initializer)) add(declaration.name.text, initializer);
        if (ts.isObjectLiteralExpression(initializer)) {
          for (const property of initializer.properties) {
            if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
            const value = unwrap(property.initializer);
            if (ts.isArrayLiteralExpression(value)) add(`${declaration.name.text}.${property.name.text}`, value);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return table;
}

interface Resolver {
  /** 같은 파일 → 다른 파일(이름이 하나뿐일 때) 순서로 찾는다. */
  find(name: string, local: ArrayTable): { node: ts.ArrayLiteralExpression; local: ArrayTable } | undefined;
}

function referenceName(node: ts.Expression): string | null {
  const target = unwrap(node);
  if (ts.isIdentifier(target)) return target.text;
  if (ts.isPropertyAccessExpression(target) && ts.isIdentifier(target.expression)) return `${target.expression.text}.${target.name.text}`;
  return null;
}

/**
 * 그 파일에 쓴 원소. 같은 파일의 const 배열(변수 자체이거나 펼친 루트 `[...scope, 'x']`)은 풀어서 본다 — 파일마다 같은 루트 상수를
 * 따로 적는 것(`const scope = ['authorization', …]`)도 리터럴 공유다. 다른 파일의 상수·팩토리를 펼친 것은 풀지 않는다(공유가 아니다).
 */
function written(node: ts.Expression, source: ts.SourceFile, local: ArrayTable, depth = 0): Element[] | null {
  const target = unwrap(node);
  const name = ts.isIdentifier(target) ? target.text : null;
  const localArrays = name ? local.get(name) : undefined;
  const array = ts.isArrayLiteralExpression(target) ? target : localArrays?.length === 1 ? localArrays[0] : undefined;
  if (!array) return null;
  return array.elements.flatMap((element): Element[] => {
    if (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)) return [{ literal: element.text }];
    if (ts.isSpreadElement(element)) {
      const inner = unwrap(element.expression);
      const spreadLocal = ts.isIdentifier(inner) ? local.get(inner.text) : undefined;
      if (spreadLocal?.length === 1 && depth < 6) return written(inner, source, local, depth + 1) ?? [{ spread: inner.getText(source) }];
      return [{ spread: element.expression.getText(source) }];
    }
    return [{ expression: element.getText(source) }];
  });
}

/** 키 목록 — `QueryKey[]` 로 타입을 단 배열이나 이름이 `…Keys` 인 함수가 돌려주는 배열의 배열. 원소가 각각 무효화 키다. */
function keyListElements(node: ts.Node): ts.ArrayLiteralExpression[] {
  let list: ts.Expression | undefined;
  if (ts.isVariableDeclaration(node) && node.initializer && node.type && /\bQueryKey\b/.test(node.type.getText())) list = node.initializer;
  const functionName = ts.isFunctionDeclaration(node) ? node.name?.text
    : ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
      && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) ? node.name.text : undefined;
  if (functionName && /Keys$/.test(functionName)) {
    const body = ts.isFunctionDeclaration(node) ? node.body
      : ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
        ? node.initializer.body : undefined;
    if (body && !ts.isBlock(body)) list = body;
    if (body && ts.isBlock(body)) {
      const returned = body.statements.find(ts.isReturnStatement)?.expression;
      if (returned) list = returned;
    }
  }
  if (!list) return [];
  const array = unwrap(list);
  if (!ts.isArrayLiteralExpression(array)) return [];
  // 팩토리 호출이 섞여 있어도 리터럴로 쓴 원소는 센다(팩토리 원소는 구성상 맞는다).
  return array.elements.flatMap((element) => {
    if (ts.isSpreadElement(element)) return [];
    const value = unwrap(element);
    return ts.isArrayLiteralExpression(value) ? [value] : [];
  });
}

/** `QueryKey[]` 로 선언한 변수 이름(같은 파일) — 그 변수에 `push` 한 배열도 무효화 키다. */
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

function expand(array: ts.ArrayLiteralExpression, local: ArrayTable, resolver: Resolver, depth = 0): Element[] {
  return array.elements.flatMap((element): Element[] => {
    if (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)) return [{ literal: element.text }];
    if (ts.isSpreadElement(element)) {
      const name = referenceName(element.expression);
      const found = name && depth < 6 ? resolver.find(name, local) : undefined;
      return found ? expand(found.node, found.local, resolver, depth + 1) : [{ spread: element.expression.getText() }];
    }
    return [{ expression: element.getText() }];
  });
}

function expandedKey(node: ts.Expression, local: ArrayTable, resolver: Resolver): Element[] | null {
  const target = unwrap(node);
  if (ts.isArrayLiteralExpression(target)) return expand(target, local, resolver);
  const name = referenceName(target);
  const found = name ? resolver.find(name, local) : undefined;
  return found ? expand(found.node, found.local, resolver) : null;
}

function calleeName(call: ts.CallExpression): string {
  const callee = call.expression;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  if (ts.isIdentifier(callee)) return callee.text;
  return '';
}

export function collectKeyUses(files: readonly SourceFileEntry[]): { uses: KeyUse[]; factoryOutputs: Element[][] } {
  const parsed = files.map(({ path, text }) => {
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    return { path, source, local: arrayDeclarations(source) };
  });
  const global: Map<string, { node: ts.ArrayLiteralExpression; local: ArrayTable }[]> = new Map();
  for (const { local } of parsed) {
    for (const [name, nodes] of local) global.set(name, [...(global.get(name) ?? []), ...nodes.map((node) => ({ node, local }))]);
  }
  const resolver: Resolver = {
    find(name, local) {
      const own = local.get(name);
      if (own?.length === 1) return { node: own[0], local };
      if (own && own.length > 1) return undefined;
      const others = global.get(name);
      return others?.length === 1 ? others[0] : undefined;
    },
  };

  const uses: KeyUse[] = [];
  const factoryOutputs: Element[][] = [];
  for (const { path, source, local } of parsed) {
    const keyLists = queryKeyListNames(source);
    const record = (node: ts.Node, role: KeyUse['role'], key: ts.Expression): void => {
      uses.push({
        file: path,
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        role,
        written: written(key, source, local),
        expanded: expandedKey(key, local, resolver),
      });
    };
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'queryKey') {
        // { queryKey } 를 담은 객체가 곧장 캐시 조작의 인자이면 조작, 아니면 조회(useQuery·queryOptions …)다.
        const owner = node.parent.parent;
        const op = ts.isCallExpression(owner) && CACHE_OPS.has(calleeName(owner));
        record(node, op ? 'op' : 'query', node.initializer);
      }
      if (ts.isCallExpression(node) && KEY_ARGUMENT_OPS.has(calleeName(node))) {
        const [first] = node.arguments;
        if (first && !ts.isObjectLiteralExpression(first)) record(node, 'op', first);
      }
      for (const key of keyListElements(node)) record(key, 'op', key);
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'push'
        && ts.isIdentifier(node.expression.expression) && keyLists.has(node.expression.expression.text)) {
        for (const argument of node.arguments) {
          const value = unwrap(argument);
          if (ts.isArrayLiteralExpression(value)) record(value, 'op', value);
        }
      }
      // 팩토리가 돌려주는 키(`(id) => [...ROOT, id] as const`, `return [...] as const`)는 조회 후보다. 루트 상수 자체는 아니다.
      const returned = ts.isArrowFunction(node) && !ts.isBlock(node.body) ? node.body
        : ts.isReturnStatement(node) ? node.expression : undefined;
      if (returned && isConstAssertion(returned)) {
        const array = unwrap(returned);
        if (ts.isArrayLiteralExpression(array)) factoryOutputs.push(expand(array, local, resolver));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { uses, factoryOutputs };
}

const literalPrefix = (elements: readonly Element[] | null): string[] => {
  const prefix: string[] = [];
  for (const element of elements ?? []) {
    if (!('literal' in element)) break;
    prefix.push(element.literal);
  }
  return prefix;
};

/**
 * 조작 키의 리터럴 접두가 조회 키와 맞는가. 맨 앞(이름공간)은 리터럴끼리 같아야 한다 — 머리가 풀리지 않은 식·스프레드인 조회 키는
 * 무엇이든 될 수 있어 맞는다고 보면 한 단어짜리 무효화가 늘 통과한다. 둘째 자리부터는 조회 쪽 식이 그 값일 수 있어 맞는다고 보고,
 * 풀리지 않은 스프레드를 만나면 뒤 자리를 알 수 없어 거기서 맞는다고 본다.
 */
function prefixMatches(prefix: readonly string[], query: readonly Element[]): boolean {
  for (const [index, segment] of prefix.entries()) {
    const element = query[index];
    if (element === undefined) return false;
    if ('literal' in element) {
      if (element.literal !== segment) return false;
      continue;
    }
    if (index === 0) return false;
    if ('spread' in element) return true;
  }
  return true;
}

/** ① 조작 키의 리터럴 접두가 맞는 조회 키(조회 자리 또는 팩토리 반환)가 없는 자리. */
export function orphanOperations({ uses, factoryOutputs }: ReturnType<typeof collectKeyUses>): KeyUse[] {
  const candidates = [
    ...uses.filter((use) => use.role === 'query').flatMap((use) => (use.expanded ? [use.expanded] : [])),
    ...factoryOutputs,
  ];
  return uses.filter((use) => {
    if (use.role !== 'op') return false;
    const prefix = literalPrefix(use.expanded);
    return prefix.length > 0 && !candidates.some((query) => prefixMatches(prefix, query));
  });
}

/** ② 두 파일 이상이 리터럴로 쓴 이름공간(맨 앞 원소가 그 자리의 리터럴인 키) → 파일 목록. */
export function sharedLiteralNamespaces(uses: readonly KeyUse[]): Map<string, string[]> {
  const files = new Map<string, Set<string>>();
  for (const use of uses) {
    const [head] = literalPrefix(use.written);
    if (head === undefined) continue;
    if (!files.has(head)) files.set(head, new Set());
    files.get(head)?.add(use.file);
  }
  return new Map([...files].filter(([, set]) => set.size > 1).map(([head, set]) => [head, [...set].sort()]));
}

const production = (): ReturnType<typeof collectKeyUses> => collectKeyUses(productionFiles(SRC).map((path) => ({
  path: relative(SRC, path).split(sep).join('/'),
  text: readFileSync(path, 'utf8'),
})));

describe('쿼리 키 일관성', () => {
  it('생산 소스에서 조회 키와 캐시 조작 키를 찾는다 — 비면 아래 계약은 공허하다', () => {
    const { uses, factoryOutputs } = production();
    expect(uses.filter((use) => use.role === 'query').length).toBeGreaterThan(0);
    expect(uses.filter((use) => use.role === 'op' && use.expanded).length).toBeGreaterThan(0);
    expect(factoryOutputs.length).toBeGreaterThan(0);
  });

  it('① 캐시 조작의 키는 어떤 조회 키와 자리마다 맞는다', () => {
    const orphans = orphanOperations(production())
      .map((use) => `${use.file}:${use.line} ${JSON.stringify(literalPrefix(use.expanded))}`);
    expect(orphans, `맞는 조회 키가 없는 무효화·캐시 조작(조용히 아무것도 갱신하지 않는다) — 조회와 같은 팩토리를 쓴다:\n${orphans.join('\n')}`).toEqual([]);
  });

  it('② 리터럴 키 이름공간은 한 파일 안에서만 쓴다(여러 파일이면 src/queries/<도메인>-keys.ts 팩토리)', () => {
    const shared = [...sharedLiteralNamespaces(production().uses)].map(([head, files]) => `'${head}': ${files.join(', ')}`);
    expect(shared, `여러 파일이 리터럴로 나눠 쓰는 쿼리 키 이름공간:\n${shared.join('\n')}`).toEqual([]);
  });

  it('판정 자체 — 맞지 않는 조작·두 파일의 같은 리터럴 이름공간은 잡고, 상수 루트·팩토리를 펼친 키는 풀어서 맞춘다', () => {
    const result = collectKeyUses([
      { path: 'a.tsx', text: "const key = ['jobs', page] as const;\nuseQuery({ queryKey: key, queryFn });\nqc.invalidateQueries({ queryKey: ['jobs'] });\n" },
      {
        path: 'b.tsx',
        text: "qc.invalidateQueries({ queryKey: ['job'] });\nqc.setQueryData(['jobs', 1], data);\nuseQuery({ queryKey: [...scope, 'x'] });\n"
          + "const BOX = ['boxes'] as const;\nuseQuery({ queryKey: [...BOX, page] });\nqc.invalidateQueries({ queryKey: BOX });\n",
      },
      // 다른 파일의 루트 상수와 팩토리 함수: 조회는 호출 결과라 풀 수 없지만 팩토리 반환이 후보가 된다.
      { path: 'keys.ts', text: "export const HOME_ROOT = ['home', 'today'] as const;\nexport const homeKey = (id: string) => [...HOME_ROOT, id] as const;\n" },
      { path: 'c.tsx', text: "useQuery({ queryKey: homeKey(id) });\nqc.invalidateQueries({ queryKey: HOME_ROOT });\nqc.invalidateQueries({ queryKey: ['home', 'tomorrow'] });\n" },
    ]);
    // ['job'] 은 머리가 스프레드인 [...scope, 'x'] 로 덮이지 않는다. ['home','tomorrow'] 는 맞는 조회·팩토리가 없다.
    expect(orphanOperations(result).map((use) => `${use.file}:${literalPrefix(use.expanded).join('/')}`)).toEqual(['b.tsx:job', 'c.tsx:home/tomorrow']);
    // 'jobs' 는 a·b 가 리터럴로 쓴다. 'boxes' 는 b 한 파일, 'home' 은 c 의 리터럴 하나뿐이다(keys.ts 의 루트는 조회·조작 자리가 아니다).
    expect([...sharedLiteralNamespaces(result.uses)]).toEqual([['jobs', ['a.tsx', 'b.tsx']]]);
  });

  it('판정 자체 — 파일마다 적은 루트 상수, QueryKey[] 목록, …Keys 함수의 키 목록도 그 파일의 리터럴로 센다', () => {
    const result = collectKeyUses([
      { path: 'p.tsx', text: "const scope = ['auth', user?.id] as const;\nuseQuery({ queryKey: [...scope, 'groups'] });\n" },
      { path: 'q.tsx', text: "const scope = ['auth', user?.id];\nuseQuery({ queryKey: [...scope, 'catalog'] });\n" },
      {
        path: 'r.tsx',
        text: "const stale: QueryKey[] = [memoKeys.all, ['notes'], ['memo', id]];\nif (id) stale.push(other.key(id), ['letters', id]);\n"
          + 'for (const queryKey of stale) qc.invalidateQueries({ queryKey });\n',
      },
      { path: 's.ts', text: "export function staleKeys(id: number) {\n  return [['notes', id], ['letters']] as const;\n}\nuseQuery({ queryKey: ['memo', 1] });\n" },
    ]);
    expect([...sharedLiteralNamespaces(result.uses)]).toEqual([
      ['auth', ['p.tsx', 'q.tsx']],
      ['notes', ['r.tsx', 's.ts']],
      ['memo', ['r.tsx', 's.ts']],
      ['letters', ['r.tsx', 's.ts']],
    ]);
    // 목록의 키도 조작이다(팩토리 원소는 건너뛰고, push 한 배열도 센다) — 맞는 조회가 없으면 고아다.
    expect(orphanOperations(result).map((use) => `${use.file}:${literalPrefix(use.expanded).join('/')}`))
      .toEqual(['r.tsx:notes', 'r.tsx:letters', 's.ts:notes', 's.ts:letters']);
  });
});
