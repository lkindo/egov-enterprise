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
 * ① 캐시 조작(invalidateQueries·setQueryData …)의 키는 어떤 조회 키와 자리마다 맞아야 한다. 리터럴(문자열·숫자·불리언·null, 리터럴
 *    상수·인자)끼리는 모든 자리가 같아야 하고, 한쪽이 동적 값인 자리는 맞을 수 있다고 본다. 첫 원소는 리터럴끼리 같아야 한다.
 *    setQueryData·getQueryData·getQueryState·QueryCache.find·`exact: true` 는 길이까지 같아야 한다(길이를 모르는 끝 스프레드는 비어
 *    있을 수 있다).
 * ② 같은 이름공간(키 맨 앞 문자열)을 실제로 적은 파일은 하나뿐이다. 여러 파일이 각자 적으면 `src/queries/<도메인>-keys.ts` 의 계층형
 *    팩토리로 옮기고 펼쳐 쓴다.
 *
 * 판정은 실제 node_modules 타입을 읽는 TypeScript 프로그램의 심볼 해석이다.
 * - 조회 후보: 조작 필터가 아닌 모든 `queryKey` 속성(슬롯 기여·커스텀 훅에 넘기는 옵션처럼 정적으로 소비를 따라가지 못하는 것도 후보다).
 *   조회 훅·prefetch 호출(별칭·커스텀 훅 래퍼·useQueries 포함)에서 실제로 쓰인 옵션은 호출 인자까지 대입한 인스턴스로 본다. 스프레드
 *   뒤에서 덮인 옵션은 후보가 아니고, 조작에만 쓰이는 const 옵션은 그 조작 자신과 맞춘 것을 일치로 치지 않는다(오타 난 옵션을
 *   무효화에만 쓰는 경우를 잡는다).
 * - 조작: 조작 호출마다 모은다. 키를 매개변수로 받는 조작 도우미(`evict(kind)`)는 그 함수의 호출 자리마다 인자를 대입해 본다.
 * - 풀 수 없는 스프레드는 튜플 타입이면 그 고정 길이만큼 동적 원소로 본다.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = join(SRC, '..');
const normalizePath = (path: string): string => path.replaceAll('\\', '/');
const SRC_ROOT = `${normalizePath(SRC)}/`;

/** 캐시를 읽거나 지우는 조작(필터의 queryKey) — 값은 기본 정확 일치 여부다. */
const CACHE_OPS = new Map<string, boolean>([
  ['invalidateQueries', false], ['refetchQueries', false], ['removeQueries', false], ['cancelQueries', false],
  ['resetQueries', false], ['setQueriesData', false], ['getQueriesData', false], ['isFetching', false], ['useIsFetching', false],
  ['findAll', false], ['find', true],
]);
/** 첫 인자가 곧 키이고 정확히 그 항목을 가리키는 조작. */
const KEY_ARGUMENT_OPS = new Set(['setQueryData', 'getQueryData', 'getQueryState']);
/** 캐시 항목을 만드는 호출 — 첫 인자가 조회 옵션이다. */
const QUERY_PRODUCERS = new Set([
  'useQuery', 'useSuspenseQuery', 'useInfiniteQuery', 'useSuspenseInfiniteQuery', 'usePrefetchQuery', 'usePrefetchInfiniteQuery',
  'prefetchQuery', 'fetchQuery', 'ensureQueryData', 'prefetchInfiniteQuery', 'fetchInfiniteQuery', 'ensureInfiniteQueryData',
  'useQueries', 'useSuspenseQueries',
]);
/** 옵션을 그대로 돌려주는 도우미 — 이것만으로는 캐시를 만들지 않는다. */
const OPTION_WRAPPERS = new Set(['queryOptions', 'infiniteQueryOptions']);
/** `QueryKey[]`·`readonly QueryKey[]`·`Array<QueryKey>` — 키 하나(`QueryKey`)가 아니라 키 목록. */
const KEY_LIST_TYPE = /(?:\bQueryKey\s*\[\s*\]|\bArray<\s*QueryKey\s*>|\bReadonlyArray<\s*QueryKey\s*>)/;
const MAX_DEPTH = 40;

/** 리터럴은 종류를 붙여 적는다(s: 문자열, n: 숫자, k: 불리언·null) — 문자열 '#1' 과 숫자 1 이 섞이지 않게. */
type Element = { literal: string; origin: string } | { expression: string } | { spread: string };
interface KeyUse {
  file: string;
  line: number;
  /** query: 조회 훅이 실제로 쓰는 키, candidate: 소비를 따라가지 못한 queryKey 속성(약한 후보), op: 캐시 조작. */
  role: 'query' | 'candidate' | 'op';
  /** 길이까지 같아야 하는 조작. */
  exact: boolean;
  /** 심볼을 따라 푼 원소. 풀 수 없으면 null. */
  expanded: Element[] | null;
  /** 조회·후보 키를 적은 `queryKey` 속성. */
  property: ts.Node | null;
  /** 후보: 조작에만 쓰이는 const 옵션의 키(그 조작 자신과 맞춘 것은 일치가 아니다). */
  selfOnly: boolean;
  /** 조작이 풀면서 거친 옵션 객체의 `queryKey` 속성. */
  through: ReadonlySet<ts.Node>;
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
    || ts.isNonNullExpression(current) || ts.isTypeAssertionExpression(current)) {
    current = current.expression;
  }
  return current;
}

/** 감싼 식(as·satisfies·괄호·!)을 거슬러 올라간 바깥 노드. */
function outermost(node: ts.Node): ts.Node {
  let current = node;
  while (current.parent && (ts.isAsExpression(current.parent) || ts.isSatisfiesExpression(current.parent)
    || ts.isParenthesizedExpression(current.parent) || ts.isNonNullExpression(current.parent))) {
    current = current.parent;
  }
  return current;
}

/** src 밖(node_modules·lib)의 파싱 결과 — 프로그램을 여러 번 만들어도 다시 파싱하지 않는다. */
const libraryFiles = new Map<string, ts.SourceFile>();

/** 원본 src 는 주어진 파일만 보이고, 그 밖은 실제 디스크(node_modules 타입 — pnpm 링크는 실제 경로로 — 와 lib)를 읽는 프로그램. */
function createKeyProgram(files: readonly SourceFileEntry[]): ts.Program {
  const provided = new Map(files.map(({ path, text }) => [`${SRC_ROOT}${path}`, text]));
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX, baseUrl: normalizePath(FRONTEND), paths: { '@/*': ['./src/*'] }, strict: true, skipLibCheck: true,
    noEmit: true, types: [], esModuleInterop: true, resolveJsonModule: true,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  };
  const inSource = (name: string): boolean => normalizePath(name).startsWith(SRC_ROOT);
  const read = (name: string): string | undefined => (inSource(name) ? provided.get(normalizePath(name)) : ts.sys.readFile(name));
  const host: ts.CompilerHost = {
    getSourceFile: (name, version) => {
      const path = normalizePath(name);
      const cached = inSource(path) ? undefined : libraryFiles.get(path);
      if (cached) return cached;
      const text = read(path);
      if (text === undefined) return undefined;
      const source = ts.createSourceFile(path, text, version, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      if (!inSource(path)) libraryFiles.set(path, source);
      return source;
    },
    getDefaultLibFileName: (compilerOptions) => normalizePath(ts.getDefaultLibFilePath(compilerOptions)),
    writeFile: () => undefined,
    getCurrentDirectory: () => normalizePath(FRONTEND),
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (name) => (inSource(name) ? provided.has(normalizePath(name)) : ts.sys.fileExists(name)),
    readFile: read,
    directoryExists: (name) => inSource(`${normalizePath(name)}/`) || ts.sys.directoryExists(name),
    getDirectories: (name) => (inSource(`${normalizePath(name)}/`) ? [] : ts.sys.getDirectories(name)),
    realpath: (name) => (inSource(name) ? name : normalizePath(ts.sys.realpath?.(name) ?? name)),
  };
  return ts.createProgram([...provided.keys()], options, host);
}

/**
 * 매개변수 → 호출 자리의 인자(와 그 인자를 풀 환경). known 은 호출 자리를 아는지다 — 알면 넘기지 않은 매개변수는 기본값이고,
 * 모르면(함수 본문만 보는 중이면) 기본값으로 확정하지 않고 동적 값으로 본다.
 */
interface Environment { known: boolean; params: ReadonlyMap<ts.ParameterDeclaration, { argument: ts.Expression; environment: Environment }> }
const EMPTY: Environment = { known: false, params: new Map() };
type FunctionNode = ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration | ts.MethodDeclaration;
/** 옵션 객체 안에서 실제로 쓰일 수 있는 queryKey — 뒤의 속성·스프레드가 앞의 것을 덮는다. */
interface KeySite {
  property: ts.PropertyAssignment | ts.ShorthandPropertyAssignment;
  key: ts.Expression;
  environment: Environment;
  object: ts.ObjectLiteralExpression;
}
/**
 * 가능한 효과 queryKey 들. complete 는 반드시 그중 하나가 쓰인다는 뜻이다(조건부 스프레드의 빈 쪽이 있으면 앞의 것이 쓰일 수 있다).
 * overridden 은 확실히 덮인 앞쪽 스프레드 원천이다.
 */
interface KeySites { sites: KeySite[]; complete: boolean; overridden: { node: ts.Expression; environment: Environment }[] }
const NO_SITES: KeySites = { sites: [], complete: false, overridden: [] };

const isFunctionNode = (node: ts.Node): node is FunctionNode => ts.isArrowFunction(node) || ts.isFunctionExpression(node)
  || ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node);

/** 객체 속성 `name: 값`·단축 `name` 의 값 식. */
function propertyValue(property: ts.ObjectLiteralElementLike, name: string): ts.Expression | undefined {
  if (ts.isPropertyAssignment(property) && property.name.getText() === name) return property.initializer;
  if (ts.isShorthandPropertyAssignment(property) && property.name.text === name) return property.name;
  return undefined;
}

function returnedExpression(fn: FunctionNode): ts.Expression | undefined {
  const body = fn.body;
  if (!body) return undefined;
  if (!ts.isBlock(body)) return body;
  return body.statements.find(ts.isReturnStatement)?.expression;
}

/** 블록 본문의 모든 return 식(조건에 따라 다른 옵션을 돌려주는 팩토리). */
function returnedExpressions(fn: FunctionNode): ts.Expression[] {
  const body = fn.body;
  if (!body) return [];
  if (!ts.isBlock(body)) return [body];
  const found: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== body && isFunctionNode(node)) return;
    if (ts.isReturnStatement(node) && node.expression) found.push(node.expression);
    ts.forEachChild(node, visit);
  };
  visit(body);
  return found;
}

class KeyResolver {
  readonly checker: ts.TypeChecker;
  /** 지금 푸는 키가 거친 옵션 객체의 queryKey 속성. */
  trace = new Set<ts.Node>();
  /** 지금 푸는 키가 호출 자리를 모른 채 만난 매개변수. */
  unbound = new Set<ts.ParameterDeclaration>();

  constructor(program: ts.Program) {
    this.checker = program.getTypeChecker();
  }

  /** 호출한 함수의 이름 — import 별칭(`useQuery as useRQ`)은 원래 이름으로 본다. */
  callName(call: ts.CallExpression): string {
    const callee = unwrap(call.expression);
    if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
    if (!ts.isIdentifier(callee)) return '';
    const symbol = this.checker.getSymbolAtLocation(callee);
    if (symbol && (symbol.flags & ts.SymbolFlags.Alias) !== 0) {
      const specifier = symbol.declarations?.find(ts.isImportSpecifier);
      if (specifier) return (specifier.propertyName ?? specifier.name).text;
      const aliased = this.checker.getAliasedSymbol(symbol);
      if (aliased.name && aliased.name !== 'unknown') return aliased.name;
    }
    return callee.text;
  }

  symbolOf(node: ts.Node): ts.Symbol | undefined {
    let symbol = this.checker.getSymbolAtLocation(node);
    if (symbol && (symbol.flags & ts.SymbolFlags.Alias) !== 0) symbol = this.checker.getAliasedSymbol(symbol);
    return symbol;
  }

  /** 식별자·속성 접근이 가리키는 선언. import 별칭은 원래 선언으로 넘긴다. */
  declarationOf(node: ts.Expression): ts.Declaration | undefined {
    const target = unwrap(node);
    const symbol = this.symbolOf(ts.isPropertyAccessExpression(target) ? target.name : target);
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    if (declaration && ts.isShorthandPropertyAssignment(declaration)) {
      const value = this.checker.getShorthandAssignmentValueSymbol(declaration);
      return value?.valueDeclaration ?? value?.declarations?.[0];
    }
    return declaration;
  }

  /** 값으로 쓰인 식 → 그 값을 만든 식(const 초기값·속성 값·대입된 인자). 다시 대입할 수 있는 변수는 따라가지 않는다. */
  valueOf(node: ts.Expression, environment: Environment): { node: ts.Expression; environment: Environment } | undefined {
    const declaration = this.declarationOf(node);
    if (!declaration) return undefined;
    if (ts.isParameter(declaration)) {
      const bound = environment.params.get(declaration);
      if (bound) return { node: bound.argument, environment: bound.environment };
      if (environment.known && declaration.initializer) return { node: declaration.initializer, environment };
      this.unbound.add(declaration);
      return undefined;
    }
    // 지역 const·객체 속성은 지금 환경을 그대로 쓴다 — 팩토리 안의 `const key = ['jobs', kind]` 가 호출 인자를 잃지 않게.
    if (ts.isVariableDeclaration(declaration) && declaration.initializer
      && ts.isVariableDeclarationList(declaration.parent) && (declaration.parent.flags & ts.NodeFlags.Const) !== 0) {
      return { node: declaration.initializer, environment };
    }
    if (ts.isPropertyAssignment(declaration)) return { node: declaration.initializer, environment };
    return undefined;
  }

  /** 호출된 함수(팩토리)의 선언. 본문이 없는 선언(외부 라이브러리)은 풀지 않는다. */
  functionOf(callee: ts.Expression, environment: Environment): { fn: FunctionNode; environment: Environment } | undefined {
    const declaration = this.declarationOf(callee);
    if (declaration && (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration))) {
      return declaration.body ? { fn: declaration, environment: EMPTY } : undefined;
    }
    const value = this.valueOf(callee, environment);
    const fn = value && unwrap(value.node);
    return fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) ? { fn, environment: value.environment } : undefined;
  }

  /** 호출 인자를 매개변수에 대입한 환경. */
  bind(fn: FunctionNode, call: ts.CallExpression, callerEnvironment: Environment, base: Environment = EMPTY): Environment {
    const params = new Map(base.params);
    fn.parameters.forEach((parameter, index) => {
      const argument = call.arguments[index];
      if (argument && !parameter.dotDotDotToken) params.set(parameter, { argument, environment: callerEnvironment });
    });
    return { known: true, params };
  }

  /** 함수가 돌려주는 식(첫 return)과, 인자를 매개변수에 대입한 환경. */
  returned(call: ts.CallExpression, environment: Environment): { node: ts.Expression; environment: Environment } | undefined {
    const found = this.functionOf(call.expression, environment);
    const node = found && returnedExpression(found.fn);
    return found && node ? { node, environment: this.bind(found.fn, call, environment, found.environment) } : undefined;
  }

  /** 옵션 객체(또는 queryOptions 호출·그것을 돌려주는 팩토리·그 값을 든 상수·조건식)에서 쓰일 수 있는 queryKey 들. */
  keySites(node: ts.Expression, environment: Environment, depth = 0): KeySites {
    if (depth > MAX_DEPTH) return NO_SITES;
    const target = unwrap(node);
    if (ts.isObjectLiteralExpression(target)) {
      const properties = [...target.properties];
      const sites: KeySite[] = [];
      const overridden: KeySites['overridden'] = [];
      for (let index = properties.length - 1; index >= 0; index -= 1) {
        const property = properties[index];
        if (!property) continue;
        const earlier = (): KeySites['overridden'] => properties.slice(0, index).filter(ts.isSpreadAssignment)
          .map((spread) => ({ node: spread.expression, environment }));
        if ((ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) && property.name.getText() === 'queryKey') {
          const key = ts.isPropertyAssignment(property) ? property.initializer : property.name;
          sites.push({ property, key, environment, object: target });
          return { sites, complete: true, overridden: [...overridden, ...earlier()] };
        }
        if (ts.isSpreadAssignment(property)) {
          const inner = this.keySites(property.expression, environment, depth + 1);
          sites.push(...inner.sites);
          overridden.push(...inner.overridden);
          if (inner.complete) return { sites, complete: true, overridden: [...overridden, ...earlier()] };
        }
      }
      return { sites, complete: false, overridden };
    }
    if (ts.isConditionalExpression(target)) {
      const whenTrue = this.keySites(target.whenTrue, environment, depth + 1);
      const whenFalse = this.keySites(target.whenFalse, environment, depth + 1);
      return { sites: [...whenTrue.sites, ...whenFalse.sites], complete: whenTrue.complete && whenFalse.complete, overridden: [] };
    }
    if (ts.isCallExpression(target)) {
      if (OPTION_WRAPPERS.has(this.callName(target))) {
        return target.arguments[0] ? this.keySites(target.arguments[0], environment, depth + 1) : NO_SITES;
      }
      const found = this.functionOf(target.expression, environment);
      if (!found) return NO_SITES;
      const bound = this.bind(found.fn, target, environment, found.environment);
      const branches = returnedExpressions(found.fn).map((returned) => this.keySites(returned, bound, depth + 1));
      return {
        sites: branches.flatMap((branch) => branch.sites),
        complete: branches.length > 0 && branches.every((branch) => branch.complete),
        overridden: branches.flatMap((branch) => branch.overridden),
      };
    }
    if (ts.isIdentifier(target) || ts.isPropertyAccessExpression(target)) {
      const value = this.valueOf(target, environment);
      return value ? this.keySites(value.node, value.environment, depth + 1) : NO_SITES;
    }
    return NO_SITES;
  }

  /** 쓰일 수 있는 queryKey 가운데 첫째(조작·`.queryKey` 읽기). */
  keySite(node: ts.Expression, environment: Environment): KeySite | undefined {
    return this.keySites(node, environment).sites[0];
  }

  /** 옵션에서 실제로 쓰이는 이름 속성의 값(뒤의 속성·스프레드가 덮는다) — `exact` 판정. */
  optionValue(node: ts.Expression, name: string, environment: Environment, depth = 0): { node: ts.Expression; environment: Environment } | undefined {
    if (depth > MAX_DEPTH) return undefined;
    const target = unwrap(node);
    if (ts.isObjectLiteralExpression(target)) {
      for (const property of [...target.properties].reverse()) {
        const value = propertyValue(property, name);
        if (value) return { node: value, environment };
        if (ts.isSpreadAssignment(property)) {
          const inner = this.optionValue(property.expression, name, environment, depth + 1);
          if (inner) return inner;
        }
      }
      return undefined;
    }
    if (ts.isIdentifier(target) || ts.isPropertyAccessExpression(target)) {
      const value = this.valueOf(target, environment);
      return value ? this.optionValue(value.node, name, value.environment, depth + 1) : undefined;
    }
    return undefined;
  }

  /** 키 식을 원소로 푼다. 풀 수 없으면 null. */
  expand(node: ts.Expression, environment: Environment = EMPTY, depth = 0): Element[] | null {
    if (depth > MAX_DEPTH) return null;
    const target = unwrap(node);
    if (ts.isArrayLiteralExpression(target)) {
      return target.elements.flatMap((element) => this.element(element, environment, depth + 1));
    }
    if (ts.isCallExpression(target)) {
      const result = this.returned(target, environment);
      return result ? this.expand(result.node, result.environment, depth + 1) : null;
    }
    if (ts.isPropertyAccessExpression(target) && target.name.text === 'queryKey') {
      const site = this.keySite(target.expression, environment);
      if (site) {
        this.trace.add(site.property);
        return this.expand(site.key, site.environment, depth + 1);
      }
    }
    if (ts.isIdentifier(target) || ts.isPropertyAccessExpression(target)) {
      const value = this.valueOf(target, environment);
      return value ? this.expand(value.node, value.environment, depth + 1) : null;
    }
    return null;
  }

  private element(node: ts.Expression, environment: Environment, depth: number): Element[] {
    if (ts.isSpreadElement(node)) {
      const inner = this.expand(node.expression, environment, depth + 1);
      if (inner) return inner;
      const length = this.fixedTupleLength(node.expression);
      return length === undefined
        ? [{ spread: node.expression.getText() }]
        : Array.from({ length }, (_, index) => ({ expression: `${node.expression.getText()}[${index}]` }));
    }
    return [this.literal(node, environment, depth) ?? { expression: node.getText() }];
  }

  /** 소스에서 값이 정해진 원소(문자열·숫자·불리언·null, 그런 값의 상수·인자). origin 은 그 리터럴을 적은 파일이다. */
  literal(node: ts.Expression, environment: Environment, depth = 0): { literal: string; origin: string } | null {
    const target = unwrap(node);
    const origin = (): string => target.getSourceFile().fileName.slice(SRC_ROOT.length);
    if (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target)) return { literal: `s:${target.text}`, origin: origin() };
    if (ts.isNumericLiteral(target)) return { literal: `n:${target.text}`, origin: origin() };
    if (target.kind === ts.SyntaxKind.TrueKeyword || target.kind === ts.SyntaxKind.FalseKeyword || target.kind === ts.SyntaxKind.NullKeyword) {
      return { literal: `k:${target.getText()}`, origin: origin() };
    }
    if (depth < MAX_DEPTH && (ts.isIdentifier(target) || ts.isPropertyAccessExpression(target))) {
      const value = this.valueOf(target, environment);
      if (value) {
        const inner = unwrap(value.node);
        if (!ts.isArrayLiteralExpression(inner) && !ts.isObjectLiteralExpression(inner) && !ts.isCallExpression(inner)) {
          return this.literal(value.node, value.environment, depth + 1);
        }
      }
    }
    return null;
  }

  private fixedTupleLength(node: ts.Expression): number | undefined {
    const tuple = this.tupleTarget(this.checker.getTypeAtLocation(node));
    return tuple && !tuple.hasRestElement && tuple.minLength === tuple.fixedLength ? tuple.fixedLength : undefined;
  }

  private tupleTarget(type: ts.Type): ts.TupleType | undefined {
    if ((type.flags & ts.TypeFlags.Object) === 0 || ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) === 0) return undefined;
    const target = (type as ts.TypeReference).target;
    return (target.objectFlags & ts.ObjectFlags.Tuple) !== 0 ? target as ts.TupleType : undefined;
  }

  /** 배열·튜플 값인가(키 목록의 원소 판정). */
  isArrayValue(node: ts.Expression): boolean {
    if (ts.isArrayLiteralExpression(unwrap(node))) return true;
    const type = this.checker.getTypeAtLocation(node);
    if (this.tupleTarget(type)) return true;
    const name = type.getSymbol()?.getName();
    return name === 'Array' || name === 'ReadonlyArray';
  }
}

/** 조회 인스턴스 — 실제로 쓰인 옵션의 queryKey 와 그 호출 인자 환경. */
interface QueryInstance { property: ts.Node; key: ts.Expression; environment: Environment }
interface Sink {
  instances: QueryInstance[];
  /** 덮인 옵션(스프레드 뒤 queryKey 가 덮었다)의 queryKey 속성 — 후보가 아니다. */
  overridden: Set<ts.Node>;
  wrappers: Map<FunctionNode, Set<number>>;
}

/** 덮인 옵션 원천의 queryKey 속성들을 overridden 에 넣는다. */
function markOverridden(resolver: KeyResolver, node: ts.Expression, environment: Environment, sink: Sink): void {
  for (const site of resolver.keySites(node, environment).sites) sink.overridden.add(site.property);
}

/** 인자가 호출 자리를 모르는 매개변수이면 그 함수·자리를 래퍼로 적는다(커스텀 훅이 옵션을 받아 조회 훅에 넘긴다). */
function registerWrapper(resolver: KeyResolver, node: ts.Expression, environment: Environment, sink: Sink): boolean {
  const declaration = resolver.declarationOf(node);
  if (!declaration || !ts.isParameter(declaration) || environment.params.has(declaration)) return false;
  const fn = declaration.parent;
  if (!isFunctionNode(fn)) return false;
  if (!sink.wrappers.has(fn)) sink.wrappers.set(fn, new Set());
  sink.wrappers.get(fn)?.add(fn.parameters.indexOf(declaration));
  return true;
}

/** 조회 훅의 인자에서 실제로 쓰이는 옵션들을 모은다. */
function consume(resolver: KeyResolver, node: ts.Expression, environment: Environment, sink: Sink, depth = 0): void {
  if (depth > MAX_DEPTH) return;
  const target = unwrap(node);
  if (ts.isObjectLiteralExpression(target)) {
    const found = resolver.keySites(target, environment);
    for (const site of found.sites) sink.instances.push({ property: site.property, key: site.key, environment: site.environment });
    for (const overridden of found.overridden) markOverridden(resolver, overridden.node, overridden.environment, sink);
    for (const property of target.properties) {
      if (ts.isSpreadAssignment(property)) registerWrapper(resolver, property.expression, environment, sink);
      const queries = propertyValue(property, 'queries');
      if (queries) consume(resolver, queries, environment, sink, depth + 1);
    }
    return;
  }
  if (ts.isArrayLiteralExpression(target)) {
    for (const element of target.elements) consume(resolver, ts.isSpreadElement(element) ? element.expression : element, environment, sink, depth + 1);
    return;
  }
  if (ts.isConditionalExpression(target)) {
    consume(resolver, target.whenTrue, environment, sink, depth + 1);
    consume(resolver, target.whenFalse, environment, sink, depth + 1);
    return;
  }
  if (ts.isCallExpression(target)) {
    const name = resolver.callName(target);
    const [first] = target.arguments;
    if (OPTION_WRAPPERS.has(name)) {
      if (first) consume(resolver, first, environment, sink, depth + 1);
      return;
    }
    if ((name === 'map' || name === 'useMemo') && first) {
      // `ids.map(id => 옵션)`·`ids.map(makeOptions)`·`useMemo(() => 옵션 목록, [])` — 콜백이 돌려주는 것이 옵션이다.
      const callback = unwrap(first);
      const fn = ts.isArrowFunction(callback) || ts.isFunctionExpression(callback) ? callback
        : resolver.functionOf(callback, environment)?.fn;
      if (fn) for (const returned of returnedExpressions(fn)) consume(resolver, returned, environment, sink, depth + 1);
      return;
    }
    const found = resolver.functionOf(target.expression, environment);
    if (found) {
      const bound = resolver.bind(found.fn, target, environment, found.environment);
      for (const returned of returnedExpressions(found.fn)) consume(resolver, returned, bound, sink, depth + 1);
    }
    return;
  }
  if (ts.isIdentifier(target) || ts.isPropertyAccessExpression(target)) {
    if (registerWrapper(resolver, target, environment, sink)) return;
    const value = resolver.valueOf(target, environment);
    if (value) consume(resolver, value.node, value.environment, sink, depth + 1);
  }
}

function functionNodeOf(node: ts.Node): FunctionNode | undefined {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) return node;
  if (ts.isVariableDeclaration(node) && node.initializer) {
    const value = unwrap(node.initializer);
    if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) return value;
  }
  return undefined;
}

/** 키 목록의 원소 식 — QueryKey[] 로 선언한 배열·함수 반환, 이름이 …Keys 인 함수가 돌려주는 배열·튜플의 배열. */
function keyListElements(node: ts.Node, source: ts.SourceFile, resolver: KeyResolver): ts.Expression[] {
  const typeText = (type: ts.TypeNode | undefined): string => (type ? type.getText(source) : '');
  let list: ts.ArrayLiteralExpression | undefined;
  let declared = false;
  if (ts.isVariableDeclaration(node) && node.initializer) {
    const initializer = node.initializer;
    declared = KEY_LIST_TYPE.test(typeText(node.type))
      || (ts.isSatisfiesExpression(initializer) && KEY_LIST_TYPE.test(typeText(initializer.type)));
    const value = unwrap(initializer);
    if (declared && ts.isArrayLiteralExpression(value)) list = value;
  }
  const fn = functionNodeOf(node);
  if (!list && fn) {
    const name = ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) ? node.name.text
      : (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name ? node.name.getText(source) : '';
    declared = KEY_LIST_TYPE.test(typeText(fn.type));
    if (declared || /Keys$/.test(name)) {
      const returned = returnedExpression(fn);
      const value = returned && unwrap(returned);
      if (value && ts.isArrayLiteralExpression(value)) list = value;
    }
  }
  if (!list) return [];
  const elements = spreadList(list, resolver);
  // 타입을 적지 않은 …Keys 함수는 원소가 모두 배열·튜플일 때만 키 목록이다(키 하나를 돌려주는 팩토리와 가른다).
  if (!declared && !elements.every((element) => resolver.isArrayValue(element))) return [];
  return elements;
}

function spreadList(list: ts.ArrayLiteralExpression, resolver: KeyResolver, depth = 0): ts.Expression[] {
  return list.elements.flatMap((element) => {
    if (!ts.isSpreadElement(element)) return [element];
    const value = depth < MAX_DEPTH ? resolver.valueOf(element.expression, EMPTY) : undefined;
    const inner = value && unwrap(value.node);
    return inner && ts.isArrayLiteralExpression(inner) ? spreadList(inner, resolver, depth + 1) : [];
  });
}

export function collectKeyUses(files: readonly SourceFileEntry[]): KeyUse[] {
  const program = createKeyProgram(files);
  const resolver = new KeyResolver(program);
  const sources = program.getSourceFiles().filter((source) => source.fileName.startsWith(SRC_ROOT));
  const fileOf = (source: ts.SourceFile): string => source.fileName.slice(SRC_ROOT.length);
  const calls: ts.CallExpression[] = [];
  const keyProperties: (ts.PropertyAssignment | ts.ShorthandPropertyAssignment)[] = [];
  /** 이름 → 그 이름의 식별자들(참조 찾기의 앞 단계 — 심볼로 다시 확인한다). */
  const identifiers = new Map<string, ts.Identifier[]>();
  for (const source of sources) {
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) calls.push(node);
      if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && ts.isObjectLiteralExpression(node.parent)
        && node.name.getText(source) === 'queryKey') keyProperties.push(node);
      if (ts.isIdentifier(node)) identifiers.set(node.text, [...(identifiers.get(node.text) ?? []), node]);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  const callTargets = new Map<ts.CallExpression, FunctionNode | undefined>();
  const callTarget = (call: ts.CallExpression): FunctionNode | undefined => {
    if (!callTargets.has(call)) callTargets.set(call, resolver.functionOf(call.expression, EMPTY)?.fn);
    return callTargets.get(call);
  };
  /** 선언 식별자와 같은 심볼을 가리키는 참조(import·export 지정자는 빼고). */
  const references = (name: ts.Identifier): ts.Identifier[] => {
    const symbol = resolver.symbolOf(name);
    return (identifiers.get(name.text) ?? []).filter((identifier) => identifier !== name && !ts.isImportSpecifier(identifier.parent)
      && !ts.isExportSpecifier(identifier.parent) && resolver.symbolOf(identifier) === symbol);
  };
  /** 노드가 어떤 호출의 인자 안에 있는가(그 호출의 이름 조건). */
  const insideArgumentOf = (node: ts.Node, names: ReadonlySet<string>): boolean => {
    for (let current: ts.Node = node; current.parent; current = current.parent) {
      const parent = current.parent;
      if (ts.isCallExpression(parent) && parent.arguments.some((argument) => argument === current) && names.has(resolver.callName(parent))) {
        return true;
      }
    }
    return false;
  };

  // 1) 조회 — 조회 훅·prefetch 호출에서 출발해 커스텀 훅 래퍼를 고정점까지 따라간다.
  const sink: Sink = { instances: [], overridden: new Set(), wrappers: new Map() };
  for (const call of calls) {
    if (call.arguments[0] && QUERY_PRODUCERS.has(resolver.callName(call))) consume(resolver, call.arguments[0], EMPTY, sink);
  }
  const done = new Map<FunctionNode, Set<number>>();
  for (let round = 0; round < 10; round += 1) {
    const pending = [...sink.wrappers].flatMap(([fn, indexes]) => [...indexes].filter((index) => !done.get(fn)?.has(index))
      .map((index) => ({ fn, index })));
    if (pending.length === 0) break;
    for (const { fn, index } of pending) {
      if (!done.has(fn)) done.set(fn, new Set());
      done.get(fn)?.add(index);
    }
    for (const call of calls) {
      const target = callTarget(call);
      for (const { fn, index } of pending) {
        const argument = call.arguments[index];
        if (target === fn && argument) consume(resolver, argument, EMPTY, sink);
      }
    }
  }

  const uses: KeyUse[] = [];
  const push = (anchor: ts.Node, role: KeyUse['role'], exact: boolean, key: ts.Expression, environment: Environment,
    property: ts.Node | null, through: ReadonlySet<ts.Node> = new Set(), selfOnly = false): KeyUse => {
    resolver.trace = new Set(through);
    resolver.unbound = new Set();
    const expanded = resolver.expand(key, environment);
    const source = anchor.getSourceFile();
    const use: KeyUse = {
      file: fileOf(source),
      line: source.getLineAndCharacterOfPosition(anchor.getStart(source)).line + 1,
      role,
      exact,
      expanded,
      property,
      selfOnly,
      through: resolver.trace,
    };
    uses.push(use);
    return use;
  };
  const instanceProperties = new Set(sink.instances.map((instance) => instance.property));
  for (const instance of sink.instances) push(instance.property, 'query', false, instance.key, instance.environment, instance.property);

  // 2) 후보 — 조작 필터가 아닌 그 밖의 queryKey 속성(소비를 따라가지 못한 옵션). 덮인 옵션은 빼고, 조작에만 쓰이는 const 옵션은 selfOnly.
  const isOperationArgument = (node: ts.Node): boolean => {
    const outer = outermost(node);
    const parent = outer.parent;
    return !!parent && ts.isCallExpression(parent) && parent.arguments.some((argument) => argument === outer)
      && (CACHE_OPS.has(resolver.callName(parent)) || KEY_ARGUMENT_OPS.has(resolver.callName(parent)));
  };
  /** 참조가 조작에 쓰이는가 — 조작의 인자, 그 `.queryKey`, 또는 조작 필터 안의 속성 값·스프레드(`{ ...filters, exact }`). */
  const isOperationReference = (reference: ts.Identifier): boolean => {
    const parent = reference.parent;
    const node: ts.Node = ts.isPropertyAccessExpression(parent) && parent.expression === reference && parent.name.text === 'queryKey'
      ? parent : reference;
    if (isOperationArgument(node)) return true;
    const container = outermost(node).parent;
    return !!container && (ts.isPropertyAssignment(container) || ts.isSpreadAssignment(container))
      && ts.isObjectLiteralExpression(container.parent) && isOperationArgument(container.parent);
  };
  /** const 로 든 옵션이 조작에만 쓰이는가. */
  const usedOnlyByOperations = (holder: ts.Node): boolean => {
    const declaration = outermost(holder).parent;
    if (!declaration || !ts.isVariableDeclaration(declaration) || !ts.isIdentifier(declaration.name)) return false;
    return references(declaration.name).every(isOperationReference);
  };
  for (const property of keyProperties) {
    if (instanceProperties.has(property) || sink.overridden.has(property)) continue;
    const object = property.parent;
    if (!ts.isObjectLiteralExpression(object) || isOperationArgument(object)) continue;
    const key = ts.isPropertyAssignment(property) ? property.initializer : property.name;
    const wrapper = outermost(object).parent;
    const holder = wrapper && ts.isCallExpression(wrapper) && OPTION_WRAPPERS.has(resolver.callName(wrapper)) ? wrapper : object;
    push(property, 'candidate', false, key, EMPTY, property, new Set(), usedOnlyByOperations(holder));
  }

  // 3) 조작 — 조작 호출마다(같은 필터를 여러 호출에 넘겨도 각각). 키가 감싼 함수의 매개변수에 기대면 그 함수의 호출 자리마다 본다.
  const pushOperation = (anchor: ts.Node, measure: (environment: Environment) => { key: ts.Expression; environment: Environment;
    exact: boolean; through: ReadonlySet<ts.Node> } | undefined): void => {
    const generic = measure(EMPTY);
    if (!generic) return;
    const use = push(anchor, 'op', generic.exact, generic.key, generic.environment, null, generic.through);
    const unbound = [...resolver.unbound];
    const owner = unbound[0]?.parent;
    if (!owner || !isFunctionNode(owner) || unbound.some((parameter) => parameter.parent !== owner)) return;
    const sites = calls.filter((call) => callTarget(call) === owner);
    if (sites.length === 0) return;
    uses.splice(uses.indexOf(use), 1);
    for (const site of sites) {
      const bound = resolver.bind(owner, site, EMPTY);
      const measured = measure(bound);
      if (measured) push(site, 'op', measured.exact, measured.key, measured.environment, null, measured.through);
    }
  };
  for (const call of calls) {
    const name = resolver.callName(call);
    const [first] = call.arguments;
    if (!first) continue;
    const defaultExact = CACHE_OPS.get(name);
    if (defaultExact !== undefined) {
      pushOperation(call, (environment) => {
        const site = resolver.keySite(first, environment);
        if (!site) return undefined;
        const exactValue = resolver.optionValue(first, 'exact', environment);
        const literal = exactValue ? resolver.literal(exactValue.node, exactValue.environment) : null;
        const exact = literal?.literal === 'k:true' ? true : literal?.literal === 'k:false' ? false : defaultExact;
        return { key: site.key, environment: site.environment, exact, through: new Set([site.property]) };
      });
    }
    if (KEY_ARGUMENT_OPS.has(name) && !ts.isObjectLiteralExpression(unwrap(first))) {
      pushOperation(call, (environment) => ({ key: first, environment, exact: true, through: new Set() }));
    }
  }

  // 4) 키 목록 — 원소마다 무효화 키다(조회 훅에 넘기는 목록이면 조회로 본다). QueryKey[] 변수에 push 한 원소도.
  const listed = new Set<ts.Node>();
  for (const source of sources) {
    const visit = (node: ts.Node): void => {
      const elements = keyListElements(node, source, resolver);
      if (elements.length > 0) {
        const name = ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) ? node.name
          : ts.isFunctionDeclaration(node) ? node.name : undefined;
        const forQueries = !!name && references(name).some((reference) => insideArgumentOf(reference, QUERY_PRODUCERS));
        for (const element of elements) {
          if (listed.has(element)) continue;
          listed.add(element);
          if (forQueries) push(element, 'query', false, element, EMPTY, null);
          else pushOperation(element, (environment) => ({ key: element, environment, exact: false, through: new Set() }));
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const call of calls) {
    const callee = call.expression;
    if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'push') continue;
    const declaration = resolver.declarationOf(callee.expression);
    const source = call.getSourceFile();
    const isList = declaration !== undefined && ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined
      && (KEY_LIST_TYPE.test(declaration.type?.getText(source) ?? '')
        || (ts.isSatisfiesExpression(declaration.initializer) && KEY_LIST_TYPE.test(declaration.initializer.type.getText(source))));
    if (isList) {
      for (const argument of call.arguments) {
        pushOperation(argument, (environment) => ({ key: argument, environment, exact: false, through: new Set() }));
      }
    }
  }
  return uses;
}

const headOf = (elements: readonly Element[] | null): { literal: string; origin: string } | null => {
  const first = elements?.[0];
  return first && 'literal' in first ? first : null;
};

/**
 * 조작 키가 조회 키와 맞는가. 첫 원소는 리터럴끼리 같아야 하고(머리가 풀리지 않은 조회 키가 모든 조작을 덮지 않게), 그 뒤로는
 * 리터럴끼리 같아야 하며 한쪽이 동적 값이면 맞을 수 있다고 본다. 길이를 모르는 스프레드를 만나면 뒤 자리를 알 수 없어 거기서 맞는다고
 * 본다. 정확 조작은 길이까지 같아야 한다 — 조회 쪽에 남은 것이 길이를 모르는 스프레드뿐이면 비어 있을 수 있어 맞는다.
 */
export function keyMatches(op: readonly Element[], query: readonly Element[], exact: boolean): boolean {
  for (const [index, element] of op.entries()) {
    const other = query[index];
    if (other === undefined) return false;
    const literal = 'literal' in element ? element.literal : null;
    const otherLiteral = 'literal' in other ? other.literal : null;
    if (index === 0) {
      if (literal === null || otherLiteral === null || literal !== otherLiteral) return false;
      continue;
    }
    if ('spread' in other || 'spread' in element) return true;
    if (literal !== null && otherLiteral !== null && literal !== otherLiteral) return false;
  }
  return !exact || op.length === query.length || query.slice(op.length).every((element) => 'spread' in element);
}

export function checkedOperations(uses: readonly KeyUse[]): KeyUse[] {
  return uses.filter((use) => use.role === 'op' && headOf(use.expanded) !== null);
}

/** ① 맞는 조회 키가 없는 조작. 첫 원소가 리터럴로 풀린 조작만 본다. */
export function orphanOperations(uses: readonly KeyUse[]): KeyUse[] {
  const candidates = uses.filter((use) => (use.role === 'query' || use.role === 'candidate') && use.expanded !== null);
  return checkedOperations(uses).filter((op) => !candidates.some((candidate) => {
    if (candidate.selfOnly && candidate.property !== null && op.through.has(candidate.property)) return false;
    return op.expanded !== null && candidate.expanded !== null && keyMatches(op.expanded, candidate.expanded, op.exact);
  }));
}

/** ② 문자열 이름공간 → 그 첫 리터럴을 실제로 적은 파일들(둘 이상만). */
export function sharedLiteralNamespaces(uses: readonly KeyUse[]): Map<string, string[]> {
  const files = new Map<string, Set<string>>();
  for (const use of uses) {
    const head = headOf(use.expanded);
    if (!head?.literal.startsWith('s:')) continue;
    const name = head.literal.slice(2);
    if (!files.has(name)) files.set(name, new Set());
    files.get(name)?.add(head.origin);
  }
  return new Map([...files].filter(([, set]) => set.size > 1).map(([head, set]) => [head, [...set].sort()]));
}

const production = (): KeyUse[] => collectKeyUses(productionFiles(SRC).map((path) => ({
  path: relative(SRC, path).split(sep).join('/'),
  text: readFileSync(path, 'utf8'),
})));

const display = (element: Element): string => {
  if ('spread' in element) return `...${element.spread}`;
  if ('expression' in element) return `{${element.expression}}`;
  if (element.literal.startsWith('n:')) return `#${element.literal.slice(2)}`;
  return element.literal.slice(2);
};
const describeKey = (use: KeyUse): string => JSON.stringify((use.expanded ?? []).map(display));

describe('쿼리 키 일관성', () => {
  let cached: KeyUse[] | undefined;
  const uses = (): KeyUse[] => (cached ??= production());

  it('생산 소스에서 실제로 비교한다 — 첫 원소가 풀린 조회·조작이 있어야 한다(없으면 아래 계약은 공허하다)', () => {
    expect(uses().filter((use) => use.role === 'query' && headOf(use.expanded) !== null).length).toBeGreaterThan(0);
    expect(checkedOperations(uses()).length).toBeGreaterThan(0);
  }, 180_000);

  it('① 캐시 조작의 키는 어떤 조회 키와 자리마다 맞는다', () => {
    const orphans = orphanOperations(uses()).map((use) => `${use.file}:${use.line}${use.exact ? ' (정확)' : ''} ${describeKey(use)}`);
    expect(orphans, `맞는 조회 키가 없는 무효화·캐시 조작(조용히 아무것도 갱신하지 않는다) — 조회와 같은 팩토리를 쓴다:\n${orphans.join('\n')}`).toEqual([]);
  }, 180_000);

  it('② 같은 쿼리 키 이름공간을 실제로 적은 파일은 하나뿐이다(여러 파일이면 src/queries/<도메인>-keys.ts 팩토리)', () => {
    const shared = [...sharedLiteralNamespaces(uses())].map(([head, files]) => `'${head}': ${files.join(', ')}`);
    expect(shared, `여러 파일이 각자 적은 쿼리 키 이름공간:\n${shared.join('\n')}`).toEqual([]);
  }, 180_000);

  it('판정 자체 ① — 자리·정확 조작·튜플 길이·옵션 변수·스코프·import 경로·인자 대입·숫자·find·queryOptions 를 가른다', () => {
    const result = collectKeyUses([
      {
        path: 'qk-self/keys.ts',
        text: "type Scope = readonly [string | null, string];\n"
          + "export const orgKeys = { users: { all: ['users'] as const }, scope: (id: string) => ['auth', id] as const };\n"
          + "export const menu = { headAll: () => ['menus', 'head'] as const, head: (scope: Scope) => [...menu.headAll(), ...scope] as const };\n"
          + "export const byKind = (kind: string) => ['kinds', kind] as const;\n"
          + "export const memoKeys = { detail: (n: number) => ['memo', 'detail', n] as const };\n",
      },
      { path: 'qk-self/one.ts', text: "export const keys = { all: ['alpha'] as const };\n" },
      { path: 'qk-self/two.ts', text: "export const keys = { all: ['beta'] as const };\n" },
      {
        path: 'qk-self/a.tsx',
        text: "import { orgKeys, menu, byKind, memoKeys } from './keys';\nimport { keys } from './one';\n"
          + 'declare const uid: string; declare const code: string; declare const id: number; declare const s: readonly [string | null, string];\n'
          + "useQuery({ queryKey: [...orgKeys.scope(uid), 'group', code], queryFn });\n"
          + "const scope = orgKeys.scope(uid);\nqc.setQueryData([...scope, 'gruop', code], next);\n" // 6: 별칭 상수 뒤 오타
          + "useQuery({ queryKey: [...orgKeys.users.all, 1], queryFn });\nqc.invalidateQueries({ queryKey: ['users'] });\n" // 8: 맞음
          + "qc.getQueryData(['users', 2]);\n" // 9: 숫자가 다르다
          + "useQuery({ queryKey: menu.head(s), queryFn });\nqc.getQueryState(menu.headAll());\n" // 11: 정확 조작 길이 2 ≠ 4
          + "const filters = { queryKey: ['community-boardz'] } as const;\nqc.invalidateQueries(filters);\n" // 13: as const 옵션 변수
          + "function load() { const key = ['jobz']; return useQuery({ queryKey: key, queryFn }); }\n"
          + "function save() { const key = ['jbos']; return qc.invalidateQueries({ queryKey: key }); }\n" // 15: 스코프마다 다른 key
          + "useQuery({ queryKey: byKind('open'), queryFn });\nqc.invalidateQueries({ queryKey: byKind('opne') });\n" // 17: 인자 대입
          + "useQuery({ queryKey: ['found', id], queryFn });\ncache.find({ queryKey: ['found'] });\ncache.findAll({ queryKey: ['found'] });\n" // 19: find 는 정확
          + "const opts = queryOptions({ queryKey: ['jobs', 'detial'], queryFn });\nqc.invalidateQueries(opts);\n" // 22: 조작에만 쓰는 옵션 자신의 키
          + "useQuery({ queryKey: ['jobs', 'detail', id], queryFn });\n"
          + 'qc.invalidateQueries({ queryKey: keys.all });\n' // 24: import 한 one.ts 의 'alpha' — 조회가 없다
          + "const single: QueryKey = ['search', ['active', 'pending']];\nuseQuery({ queryKey: single, queryFn });\n" // 키 하나는 목록이 아니다
          + "const extra: QueryKey[] = [['jbos3']];\nconst stale = [...extra, ['jbos2']] satisfies QueryKey[];\n" // 27·28: 목록 원소
          + "function keep(keys2: string[]) { return useQuery({ queryKey: [...keys2, 'x'], queryFn }); }\n" // 머리 미해석 조회는 덮지 않는다
          + 'const memoOptions = (n: number) => queryOptions({ queryKey: memoKeys.detail(n), queryFn });\n' // 쓰이지 않는 선언 = 약한 후보
          + 'qc.invalidateQueries({ queryKey: memoKeys.detail(3) });\n' // 31: 같은 팩토리의 다른 조작 — 맞음
          + "const lonely = queryOptions({ queryKey: ['lonely', 'detial'], queryFn });\nqc.getQueryData(lonely.queryKey);\n", // 33: 자기 옵션 키
      },
      {
        path: 'qk-self/c.ts',
        text: "import { queryOptions } from '@tanstack/react-query';\ndeclare const queryFn: () => Promise<number>;\n"
          + "export const sharedOpts = queryOptions({ queryKey: ['jobz-shared'], queryFn });\n",
      },
      {
        path: 'qk-self/b.tsx',
        text: "import { useMemo } from 'react';\n"
          + "import { queryOptions as qo, useQuery as useRQ, usePrefetchQuery, useQueries, type QueryKey, type QueryClient, type QueryCache } from '@tanstack/react-query';\n"
          + "import { sharedOpts } from './c';\n"
          + 'declare const qc: QueryClient; declare const cache: QueryCache; declare const queryFn: () => Promise<number>;\n'
          + "const jobOpts = qo({ queryKey: ['wrapped', 1], queryFn });\n"
          + 'function useJobs(o: typeof jobOpts) { return useRQ(o); }\n'
          + 'useJobs(jobOpts);\nqc.getQueryData(jobOpts.queryKey);\n' // 8: 커스텀 훅 래퍼·별칭 — 맞음
          + "const listOpts = qo({ queryKey: ['listed'], queryFn });\nconst queries = [listOpts];\nuseQueries({ queries });\n"
          + 'qc.getQueryData(listOpts.queryKey);\n' // 12: useQueries 단축 속성 — 맞음
          + "const preOpts = qo({ queryKey: ['pre'], queryFn });\nusePrefetchQuery(preOpts);\nqc.getQueryData(preOpts.queryKey);\n" // 15: 맞음
          + "const kindOpts = (k: string) => qo({ queryKey: ['kinded', k], queryFn });\nuseRQ(kindOpts('open'));\n"
          + "qc.getQueryData(['kinded', 'opne']);\n" // 18: 옵션 팩토리 인자 대입
          + 'qc.invalidateQueries(sharedOpts);\n' // 19: 다른 파일의 조작에만 쓰는 옵션 자신의 키
          + "const filt = { queryKey: ['multi'] };\nuseRQ({ queryKey: ['multi', 1], queryFn });\n"
          + 'qc.invalidateQueries(filt);\ncache.find(filt);\n' // 22 맞음, 23: 같은 필터의 find 는 정확
          + "const oldOpts = qo({ queryKey: ['old'], queryFn });\nuseRQ({ ...oldOpts, queryKey: ['new'] });\n"
          + 'qc.getQueryData(oldOpts.queryKey);\n' // 26: 스프레드 뒤 queryKey 가 덮었다
          + "function Comp() { const scope = useMemo(() => ['u', 'v'] as const, []); useRQ({ queryKey: ['memo2', ...scope], queryFn }); return null; }\n"
          + "qc.getQueryState(['memo2', 'u']);\n" // 28: 외부 타입 튜플 길이 — 정확 조작 길이 2 ≠ 3
          + "const keys9 = { old: ['jobz2'] as const };\nuseRQ({ queryKey: ['jobs2'], queryFn });\n"
          + 'function staleKeys(): QueryKey[] { return [keys9.old]; }\n' // 31: 팩토리 참조만인 목록
          + "const exact = true as const;\nuseRQ({ queryKey: ['ex', 1], queryFn });\nqc.invalidateQueries({ queryKey: ['ex'], exact });\n" // 34
          + "useRQ({ queryKey: ['hash', 1], queryFn });\nqc.getQueryData(['hash', '#1']);\n" // 36: 문자열 '#1' 은 숫자 1 이 아니다
          // 37~: 4회차 — 정상이어야 할 것(오탐 금지)과 잡아야 할 것.
          + "const panel = { id: 'x', queryKey: ['slot-stats'] as const };\ndeclare const panels: { queryKey: readonly unknown[] }[];\n"
          + 'useQueries({ queries: panels.map((p) => ({ queryKey: [...p.queryKey, 1], queryFn })) });\n'
          + "qc.invalidateQueries({ queryKey: ['slot-stats'] });\n" // 40: 슬롯 기여의 키(약한 후보) — 맞음
          + "const f2 = { queryKey: ['jobsx'], exact: true };\nuseRQ({ queryKey: ['jobsx', 1], queryFn });\nqc.invalidateQueries({ ...f2, exact: false });\n" // 43 맞음
          + "const g2 = { queryKey: ['jobsy'] };\nuseRQ({ queryKey: ['jobsy', 1], queryFn });\nqc.invalidateQueries({ ...g2, exact: true });\n" // 46: 덮은 exact
          + "const jobOpts2 = qo({ queryKey: ['wrapped2'], queryFn });\nfunction useJobs2(o: typeof jobOpts2) { return useRQ({ ...o, staleTime: 10 }); }\n"
          + 'useJobs2(jobOpts2);\nqc.getQueryData(jobOpts2.queryKey);\n' // 50: 펼쳐 받는 커스텀 훅 — 맞음
          + "declare const ids: string[];\nconst makeOptions = (one: string) => ({ queryKey: ['mapped', one], queryFn });\n"
          + "useQueries({ queries: ids.map(makeOptions) });\nqc.invalidateQueries({ queryKey: ['mapped'] });\n" // 54: 맞음
          + "function List() { const qs = useMemo(() => [{ queryKey: ['memoized'], queryFn }], []); useQueries({ queries: qs }); return null; }\n"
          + "qc.getQueryData(['memoized']);\n" // 56: 맞음
          + "declare const flag: boolean; const baseOpts = qo({ queryKey: ['base'], queryFn });\nconst newOpts = qo({ queryKey: ['newer'], queryFn });\n"
          + 'useRQ({ ...baseOpts, ...(flag ? newOpts : {}) });\nqc.getQueryData(newOpts.queryKey);\n' // 60: 조건부 스프레드 — 맞음
          + "function pick(admin: boolean) { if (admin) return qo({ queryKey: ['admin-x'], queryFn }); return qo({ queryKey: ['user-x'], queryFn }); }\n"
          + "useRQ(pick(true));\nqc.getQueryData(['admin-x']);\n" // 63: 모든 return — 맞음
          + "function usePage(kind = 'list') { return useRQ({ queryKey: ['pages', kind], queryFn }); }\nusePage('detail');\n"
          + "qc.getQueryData(['pages', 'detail']);\n" // 66: 기본값을 확정하지 않는다 — 맞음
          + "useRQ({ queryKey: ['group', ...ids], queryFn });\nqc.getQueryData(['group']);\n" // 68: 빈 스프레드 — 맞음
          + "const tabKeys: QueryKey[] = [['tabq']];\nuseQueries({ queries: tabKeys.map((queryKey) => ({ queryKey, queryFn })) });\n" // 조회용 목록
          + "const sc = qc.getQueryData<readonly [string, string]>(['jobs2'])!;\nuseRQ({ queryKey: ['permission', ...sc], queryFn });\n"
          + "qc.getQueryData(['permission', 'u']);\n" // 73: 외부(pnpm) 타입 튜플 길이 — 정확 조작 길이 2 ≠ 3
          + "const options3 = (kind: string) => { const key = ['jobs3', kind] as const; return qo({ queryKey: key, queryFn }); };\n"
          + "useRQ(options3('open'));\nqc.getQueryData(['jobs3', 'opne']);\n" // 76: 팩토리 안 지역 const 의 인자
          + "useRQ({ queryKey: ['tickets', 'open'], queryFn });\nfunction evict(kind: string) { return qc.invalidateQueries({ queryKey: ['tickets', kind] }); }\n"
          + "evict('opne');\n", // 79: 조작 도우미의 호출 자리
      },
    ]);
    const orphansOf = (file: string): string[] => orphanOperations(result).filter((use) => use.file === file)
      .map((use) => `${use.line}:${describeKey(use)}`).sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10));
    expect(orphansOf('qk-self/a.tsx'), orphansOf('qk-self/a.tsx').join(' | ')).toEqual([
      '6:["auth","{id}","gruop","{code}"]',
      '9:["users","#2"]',
      '11:["menus","head"]',
      '13:["community-boardz"]',
      '15:["jbos"]',
      '17:["kinds","opne"]',
      '19:["found"]',
      '22:["jobs","detial"]',
      '24:["alpha"]',
      '27:["jbos3"]',
      '28:["jbos2"]',
      '33:["lonely","detial"]',
    ]);
    expect(orphansOf('qk-self/b.tsx'), orphansOf('qk-self/b.tsx').join(' | ')).toEqual([
      '18:["kinded","opne"]',
      '19:["jobz-shared"]',
      '23:["multi"]',
      '26:["old"]',
      '28:["memo2","u"]',
      '31:["jobz2"]',
      '34:["ex"]',
      '36:["hash","#1"]',
      '46:["jobsy"]',
      '73:["permission","u"]',
      '76:["jobs3","opne"]',
      '79:["tickets","opne"]',
    ]);
  }, 180_000);

  it('판정 자체 ② — 첫 리터럴을 적은 파일로 센다(루트 상수·지역 팩토리·메서드 팩토리·문자열 상수 복제는 공유, 펼친 import 는 아니다)', () => {
    const result = collectKeyUses([
      // 각 파일은 모듈이다(export) — 실제 코드처럼 최상위 const 가 파일마다 따로 있다.
      { path: 'qk-self/p.tsx', text: "export {};\nconst scope = ['auth', 1] as const;\nuseQuery({ queryKey: [...scope, 'groups'], queryFn });\n" },
      { path: 'qk-self/q.tsx', text: "export {};\nconst scope = ['auth', 2];\nuseQuery({ queryKey: [...scope, 'catalog'], queryFn });\n" },
      { path: 'qk-self/r.tsx', text: "export {};\nconst make = (id: number) => ['jobs', id] as const;\nuseQuery({ queryKey: make(1), queryFn });\n" },
      {
        path: 'qk-self/s.tsx',
        text: "export {};\nconst keys = { detail(id: number) { return ['jobs', id] as const; } };\nqc.invalidateQueries({ queryKey: keys.detail(2) });\n",
      },
      { path: 'qk-self/t.tsx', text: "export {};\nconst NS = 'notes';\nuseQuery({ queryKey: [NS, 1], queryFn });\n" },
      { path: 'qk-self/u.tsx', text: "export {};\nconst NS = 'notes';\nqc.invalidateQueries({ queryKey: [NS] });\n" },
      { path: 'qk-self/v.ts', text: "export const boxKeys = { all: ['boxes'] as const };\nexport const unused = { all: ['auth'] as const };\n" },
      {
        path: 'qk-self/w.tsx',
        text: "import { boxKeys } from './v';\nuseQuery({ queryKey: [...boxKeys.all, 1], queryFn });\nqc.invalidateQueries({ queryKey: boxKeys.all });\n",
      },
    ]);
    expect([...sharedLiteralNamespaces(result)]).toEqual([
      ['auth', ['qk-self/p.tsx', 'qk-self/q.tsx']],
      ['jobs', ['qk-self/r.tsx', 'qk-self/s.tsx']],
      ['notes', ['qk-self/t.tsx', 'qk-self/u.tsx']],
    ]);
  }, 180_000);
});
