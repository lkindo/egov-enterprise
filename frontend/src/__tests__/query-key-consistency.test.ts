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
 *    setQueryData·getQueryData·getQueryState·QueryCache.find·`exact: true` 는 길이까지 같아야 한다. 길이를 모르는 스프레드는 0개
 *    이상의 자리이고, 그 뒤에 남은 원소는 그대로 맞춰 본다.
 *    setQueryData 로 저장한 항목은 그 항목을 정확히 읽는 조작(getQueryData·getQueryState·정확 find)이 있으면 조회가 없어도 쓰인 것이다.
 *    접두 무효화·정확 삭제·다른 저장은 짝이 아니다.
 * ② 같은 이름공간(키 맨 앞 문자열)을 실제로 적은 파일은 하나뿐이다. 여러 파일이 각자 적으면 `src/queries/<도메인>-keys.ts` 의 계층형
 *    팩토리로 옮기고 펼쳐 쓴다.
 * ③ 정적 판정이 따라가지 못하는 조작(런타임에 조립한 키 등)만 `query-key-unchecked: <사유>` 주석으로 뺀다. 코드 뒤 주석은 그 줄을,
 *    홀로 선 주석은 다음 줄을 덮고, 덮는 줄의 조작은 하나여야 한다. 사유 없는 표지와 맞는 조작이 사라진 낡은 표지는 붉다.
 *
 * 판정은 실제 node_modules 타입을 읽는 TypeScript 프로그램의 심볼 해석이다.
 * - 조회 후보: 조작 필터가 아닌 모든 `queryKey` 속성(커스텀 훅에 넘기는 옵션처럼 정적으로 소비를 따라가지 못하는 것도 후보다).
 *   조회 훅·prefetch 호출(별칭·커스텀 훅 래퍼·키 래퍼·useQueries 포함)에서 실제로 쓰인 옵션은 호출 인자까지 대입한 인스턴스로 본다.
 *   스프레드 뒤에서 덮인 옵션은 다른 곳에서 통째로 쓰이지 않으면 후보가 아니고, 조작에만 쓰이는 const 옵션은 그 조작 자신과 맞춘
 *   것을 일치로 치지 않는다(오타 난 옵션을 무효화에만 쓰는 경우를 잡는다). queryFn 없는 객체(슬롯 기여)는 그 문맥 타입의 queryKey 를
 *   펼쳐 조회하는 화면이 덧붙이는 자리만큼만 늘린다.
 * - 키의 조건식·여러 return·useMemo 는 모든 대안으로 펼친다. 호출 인자로 정해지는 조건(`kind === 'list'`)은 평가해 닿지 않는 갈래를
 *   뺀다.
 * - 조작: 조작 호출마다 모은다. 키·exact·앞의 조건이 매개변수에 기대는 조작 도우미(`evict(kind)`)는 그 함수의 호출 자리마다 인자를
 *   대입해 보고, 그 인자로 닿지 않는 조작(조기 반환 뒤)은 뺀다. 나머지 매개변수는 그 자리부터의 인자다.
 * - 키 목록(QueryKey[])은 지역 변수·메서드 체인·넘긴 함수까지 흐름을 따라가 조작(정확·접두)과 조회를 가른다.
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
  /** `query-key-unchecked: <사유>` 표지로 판정에서 뺀 조작. */
  exempt: boolean;
  /** setQueryData — 그 항목을 정확히 읽는 다른 조작(getQueryData 등)이 있으면 조회가 없어도 쓰인 것이다. */
  writes: boolean;
  /** 항목을 읽는 조작(getQueryData·getQueryState·find) — 정확 조작이면 저장 항목의 짝이다. */
  reads: boolean;
  /** 조작·키를 적은 자리(소스 위치) — 같은 줄의 여러 조작을 가른다. */
  position: number;
}
/** 정적 판정이 따라가지 못하는 조작 하나를 빼는 표지. covers 는 덮는 줄(코드 뒤 주석이면 그 줄, 홀로 선 주석이면 다음 줄)이다. */
interface UncheckedMarker { file: string; line: number; reason: string; covers: number; ops: number }
export interface KeyCensus { uses: KeyUse[]; markers: UncheckedMarker[] }
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
interface Environment {
  known: boolean;
  /** 호출 자리를 대입한 함수 — 넘기지 않은 매개변수의 기본값은 이 함수의 것만 확정한다(바깥 함수 매개변수는 동적이다). */
  fn?: ts.Node;
  params: ReadonlyMap<ts.ParameterDeclaration, { argument: ts.Expression; environment: Environment }>;
  /** 나머지 매개변수(`...path`) → 그 자리부터의 인자들. */
  rests?: ReadonlyMap<ts.ParameterDeclaration, { args: readonly ts.Expression[]; environment: Environment }>;
}
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
      // 넘긴 값이 undefined 이면 이 매개변수의 기본값이 쓰인다(생략한 선택 인자를 그대로 넘기는 위임 `listKey(page, size, view)`).
      if (bound && declaration.initializer && this.comparable(bound.argument, bound.environment, 0) === 'k:undefined') {
        return { node: declaration.initializer, environment };
      }
      if (bound) return { node: bound.argument, environment: bound.environment };
      if (environment.known && environment.fn === declaration.parent && declaration.initializer) {
        return { node: declaration.initializer, environment };
      }
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
    const rests = new Map(base.rests ?? []);
    fn.parameters.forEach((parameter, index) => {
      if (parameter.dotDotDotToken) {
        rests.set(parameter, { args: call.arguments.slice(index), environment: callerEnvironment });
        return;
      }
      const argument = call.arguments[index];
      if (argument) params.set(parameter, { argument, environment: callerEnvironment });
    });
    return { known: true, fn, params, rests };
  }

  /** 함수가 돌려주는 식(닿을 수 있는 첫 return)과, 인자를 매개변수에 대입한 환경. */
  returned(call: ts.CallExpression, environment: Environment): { node: ts.Expression; environment: Environment } | undefined {
    const found = this.functionOf(call.expression, environment);
    if (!found) return undefined;
    const bound = this.bind(found.fn, call, environment, found.environment);
    const [node] = this.liveReturns(found.fn, bound);
    return node ? { node, environment: bound } : undefined;
  }

  /** 호출 인자로 보아 닿을 수 있는 return 식들. */
  liveReturns(fn: FunctionNode, environment: Environment): ts.Expression[] {
    return returnedExpressions(fn).filter((value) => this.reachable(value, fn, environment));
  }

  /**
   * 조건의 값 — 리터럴(그 상수·호출 인자)로 정해지면 true/false, 아니면 undefined. `!`·`&&`·`||`·`===`·`!==`·`==`·`!=`·`??` 와
   * 리터럴의 참거짓만 본다. `==`·`!=` 는 null 과 undefined 를 같게 본다.
   */
  evaluate(node: ts.Expression, environment: Environment, depth = 0): boolean | undefined {
    if (depth > MAX_DEPTH) return undefined;
    const target = unwrap(node);
    if (ts.isPrefixUnaryExpression(target) && target.operator === ts.SyntaxKind.ExclamationToken) {
      const inner = this.evaluate(target.operand, environment, depth + 1);
      return inner === undefined ? undefined : !inner;
    }
    if (ts.isBinaryExpression(target)) {
      const operator = target.operatorToken.kind;
      if (operator === ts.SyntaxKind.AmpersandAmpersandToken || operator === ts.SyntaxKind.BarBarToken) {
        const left = this.evaluate(target.left, environment, depth + 1);
        const right = this.evaluate(target.right, environment, depth + 1);
        if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
          if (left === false || right === false) return false;
          return left === true && right === true ? true : undefined;
        }
        if (left === true || right === true) return true;
        return left === false && right === false ? false : undefined;
      }
      const strict = operator === ts.SyntaxKind.EqualsEqualsEqualsToken || operator === ts.SyntaxKind.ExclamationEqualsEqualsToken;
      const loose = operator === ts.SyntaxKind.EqualsEqualsToken || operator === ts.SyntaxKind.ExclamationEqualsToken;
      if (strict || loose) {
        const normalize = (value: string | undefined): string | undefined => (loose && (value === 'k:null' || value === 'k:undefined')
          ? 'k:nullish' : value);
        const left = normalize(this.comparable(target.left, environment, depth + 1));
        const right = normalize(this.comparable(target.right, environment, depth + 1));
        if (left === undefined || right === undefined) return undefined;
        const equal = left === right;
        return operator === ts.SyntaxKind.EqualsEqualsEqualsToken || operator === ts.SyntaxKind.EqualsEqualsToken ? equal : !equal;
      }
    }
    const value = this.comparable(target, environment, depth + 1);
    if (value === undefined) return undefined;
    return !['k:false', 'k:null', 'k:undefined', 's:', 'n:0'].includes(value);
  }

  /**
   * 비교에 쓰는 값 — 리터럴과, 그것을 든 const·매개변수(호출 인자·기본값)만 푼다. 객체 속성은 바뀔 수 있고 받는 객체가 없을 수도
   * 있어(`row?.archived`) 풀지 않는다. 호출 자리를 아는데 넘기지 않은(기본값 없는) 매개변수는 undefined 다.
   */
  private comparable(node: ts.Expression, environment: Environment, depth: number): string | undefined {
    if (depth > MAX_DEPTH) return undefined;
    const target = unwrap(node);
    if (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target)) return `s:${target.text}`;
    if (ts.isNumericLiteral(target)) return `n:${target.text}`;
    if (target.kind === ts.SyntaxKind.TrueKeyword || target.kind === ts.SyntaxKind.FalseKeyword || target.kind === ts.SyntaxKind.NullKeyword) {
      return `k:${target.getText()}`;
    }
    if (ts.isBinaryExpression(target) && target.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
      const left = this.comparable(target.left, environment, depth + 1);
      if (left === undefined) return undefined;
      return left === 'k:null' || left === 'k:undefined' ? this.comparable(target.right, environment, depth + 1) : left;
    }
    // `as const` 객체 상수의 속성(`MAIL_SEND_RESULT.PENDING`)은 바뀌지 않아 푼다.
    if (ts.isPropertyAccessExpression(target) && !target.questionDotToken && this.isConstObject(target.expression)) {
      const value = this.valueOf(target, environment);
      return value ? this.comparable(value.node, value.environment, depth + 1) : undefined;
    }
    if (!ts.isIdentifier(target)) return undefined;
    if (target.text === 'undefined') return 'k:undefined';
    const declaration = this.declarationOf(target);
    if (declaration && ts.isParameter(declaration) && environment.known && environment.fn === declaration.parent
      && !environment.params.has(declaration) && !declaration.initializer && !declaration.dotDotDotToken) return 'k:undefined';
    const value = this.valueOf(target, environment);
    return value ? this.comparable(value.node, value.environment, depth + 1) : undefined;
  }

  /** `const X = { … } as const` 를 가리키는 식별자인가. */
  private isConstObject(node: ts.Expression): boolean {
    const target = unwrap(node);
    const declaration = ts.isIdentifier(target) ? this.declarationOf(target) : undefined;
    if (!declaration || !ts.isVariableDeclaration(declaration) || !declaration.initializer
      || !ts.isVariableDeclarationList(declaration.parent) || (declaration.parent.flags & ts.NodeFlags.Const) === 0) return false;
    const initializer = declaration.initializer;
    return ts.isAsExpression(initializer) && ts.isTypeReferenceNode(initializer.type) && initializer.type.typeName.getText() === 'const'
      && ts.isObjectLiteralExpression(unwrap(initializer.expression));
  }

  /** 문장이 이 인자로 반드시 함수를 빠져나가는가(return·throw, 그런 문장을 품은 블록, 정해진 갈래가 빠져나가는 if, try·finally). */
  private exits(statement: ts.Statement, environment: Environment): boolean {
    if (ts.isReturnStatement(statement) || ts.isThrowStatement(statement)) return true;
    if (ts.isBlock(statement)) return statement.statements.some((inner) => this.exits(inner, environment));
    if (ts.isIfStatement(statement)) {
      const value = this.evaluate(statement.expression, environment);
      const whenTrue = (): boolean => this.exits(statement.thenStatement, environment);
      const whenFalse = (): boolean => statement.elseStatement !== undefined && this.exits(statement.elseStatement, environment);
      if (value === true) return whenTrue();
      if (value === false) return whenFalse();
      return whenTrue() && whenFalse();
    }
    if (ts.isTryStatement(statement)) {
      // catch 가 있으면 try 안의 throw 가 잡힐 수 있어 catch 도 빠져나가야 한다. 정상으로 끝나는 finally 는 앞의 return 을 지키고,
      // finally 가 빠져나가면 그것으로 끝이다.
      const tried = this.exits(statement.tryBlock, environment)
        && (!statement.catchClause || this.exits(statement.catchClause.block, environment));
      return tried || (statement.finallyBlock !== undefined && this.exits(statement.finallyBlock, environment));
    }
    return false;
  }

  /**
   * 호출 인자로 보아 scope(함수·파일) 안의 node 에 닿을 수 있는가 — 거짓으로 정해진 조건의 갈래, 단락 평가로 건너뛰는 우변, 그
   * 인자로 반드시 빠져나가는 앞 문장(`if (tab === 'help') return;`, try 안의 조기 반환) 다음은 닿지 않는다.
   */
  reachable(node: ts.Node, scope: ts.Node, environment: Environment): boolean {
    for (let child: ts.Node = node, parent = node.parent; parent && child !== scope; child = parent, parent = parent.parent) {
      if (ts.isIfStatement(parent) && child !== parent.expression) {
        const value = this.evaluate(parent.expression, environment);
        if ((child === parent.thenStatement && value === false) || (child === parent.elseStatement && value === true)) return false;
      }
      if (ts.isConditionalExpression(parent) && child !== parent.condition) {
        const value = this.evaluate(parent.condition, environment);
        if ((child === parent.whenTrue && value === false) || (child === parent.whenFalse && value === true)) return false;
      }
      if (ts.isBinaryExpression(parent) && child === parent.right) {
        const operator = parent.operatorToken.kind;
        const and = operator === ts.SyntaxKind.AmpersandAmpersandToken;
        if (and || operator === ts.SyntaxKind.BarBarToken) {
          const left = this.evaluate(parent.left, environment);
          if ((and && left === false) || (!and && left === true)) return false;
        }
      }
      if (ts.isBlock(parent) || ts.isSourceFile(parent) || ts.isCaseClause(parent) || ts.isDefaultClause(parent)) {
        for (const statement of parent.statements) {
          if (statement === child) break;
          if (this.exits(statement, environment)) return false;
        }
      }
    }
    return true;
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
      const value = this.evaluate(target.condition, environment);
      const whenTrue = value === false ? NO_SITES : this.keySites(target.whenTrue, environment, depth + 1);
      const whenFalse = value === true ? NO_SITES : this.keySites(target.whenFalse, environment, depth + 1);
      const complete = (value === false || whenTrue.complete) && (value === true || whenFalse.complete);
      return { sites: [...whenTrue.sites, ...whenFalse.sites], complete, overridden: [] };
    }
    if (ts.isCallExpression(target)) {
      if (OPTION_WRAPPERS.has(this.callName(target))) {
        return target.arguments[0] ? this.keySites(target.arguments[0], environment, depth + 1) : NO_SITES;
      }
      const found = this.functionOf(target.expression, environment);
      if (!found) return NO_SITES;
      const bound = this.bind(found.fn, target, environment, found.environment);
      const branches = this.liveReturns(found.fn, bound).map((returned) => this.keySites(returned, bound, depth + 1));
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

  /** `useMemo(() => 값, deps)` 의 값 식. */
  private memoized(call: ts.CallExpression): ts.Expression[] {
    if (this.callName(call) !== 'useMemo' || !call.arguments[0]) return [];
    const callback = unwrap(call.arguments[0]);
    return ts.isArrowFunction(callback) || ts.isFunctionExpression(callback) ? returnedExpressions(callback) : [];
  }

  /** 키 식의 가능한 값들 — 조건식의 두 갈래, 여러 return 의 팩토리, useMemo 로 메모한 키. 풀 수 없으면 빈 배열. */
  expandAll(node: ts.Expression, environment: Environment = EMPTY, depth = 0): Element[][] {
    if (depth > MAX_DEPTH) return [];
    const target = unwrap(node);
    if (ts.isConditionalExpression(target)) {
      const value = this.evaluate(target.condition, environment);
      return [
        ...(value === false ? [] : this.expandAll(target.whenTrue, environment, depth + 1)),
        ...(value === true ? [] : this.expandAll(target.whenFalse, environment, depth + 1)),
      ];
    }
    if (ts.isCallExpression(target)) {
      const memo = this.memoized(target);
      if (memo.length > 0) return memo.flatMap((value) => this.expandAll(value, environment, depth + 1));
      const found = this.functionOf(target.expression, environment);
      if (found) {
        // 팩토리가 돌려줄 수 있는 모든 값(여러 return, 한 줄 화살표의 조건식) — 호출 인자로 닿지 않는 return 은 뺀다.
        const bound = this.bind(found.fn, target, environment, found.environment);
        return this.liveReturns(found.fn, bound).flatMap((value) => this.expandAll(value, bound, depth + 1));
      }
    }
    if ((ts.isIdentifier(target) || ts.isPropertyAccessExpression(target))
      && !(ts.isPropertyAccessExpression(target) && target.name.text === 'queryKey')) {
      const value = this.valueOf(target, environment);
      const inner = value && unwrap(value.node);
      if (value && inner && (ts.isConditionalExpression(inner) || ts.isCallExpression(inner))) {
        return this.expandAll(value.node, value.environment, depth + 1);
      }
    }
    const single = this.expand(node, environment, depth);
    return single ? [single] : [];
  }

  /** 키 식을 원소로 푼다. 풀 수 없으면 null. */
  expand(node: ts.Expression, environment: Environment = EMPTY, depth = 0): Element[] | null {
    if (depth > MAX_DEPTH) return null;
    const target = unwrap(node);
    if (ts.isArrayLiteralExpression(target)) {
      return target.elements.flatMap((element) => this.element(element, environment, depth + 1));
    }
    if (ts.isCallExpression(target)) {
      const [memo] = this.memoized(target);
      if (memo) return this.expand(memo, environment, depth + 1);
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
      // 나머지 매개변수의 스프레드는 호출 자리의 인자들이다(`scopedKey('detail')` → `[...ROOT, 'detail']`).
      const declaration = this.declarationOf(node.expression);
      const rest = declaration && ts.isParameter(declaration) ? environment.rests?.get(declaration) : undefined;
      if (rest) return rest.args.flatMap((argument) => this.element(argument, rest.environment, depth + 1));
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
  /** 덮인 옵션(스프레드 뒤 queryKey 가 덮었다)의 queryKey 속성 — 다른 곳에서 쓰이지 않으면 후보가 아니다. */
  overridden: Set<ts.Node>;
  /** 덮은 객체 안의 앞쪽 스프레드 식(덮인 옵션을 펼친 자리). */
  overriddenSources: Set<ts.Node>;
  /** 옵션을 매개변수로 받아 조회 훅에 넘기는 함수 → 그 매개변수 자리. */
  wrappers: Map<FunctionNode, Set<number>>;
  /** queryKey 를 매개변수로 받아 조회 훅에 넘기는 함수 → 자리 → 그 queryKey 속성(`useReport(queryKey)`). */
  keyWrappers: Map<FunctionNode, Map<number, ts.Node>>;
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
    for (const site of found.sites) {
      sink.instances.push({ property: site.property, key: site.key, environment: site.environment });
      // queryKey 자체가 호출 자리를 모르는 매개변수이면 그 함수의 호출 자리 인자가 키다.
      const keyDeclaration = resolver.declarationOf(site.key);
      if (keyDeclaration && ts.isParameter(keyDeclaration) && !site.environment.params.has(keyDeclaration) && isFunctionNode(keyDeclaration.parent)) {
        const fn = keyDeclaration.parent;
        if (!sink.keyWrappers.has(fn)) sink.keyWrappers.set(fn, new Map());
        sink.keyWrappers.get(fn)?.set(fn.parameters.indexOf(keyDeclaration), site.property);
      }
    }
    for (const overridden of found.overridden) {
      sink.overriddenSources.add(overridden.node);
      markOverridden(resolver, overridden.node, overridden.environment, sink);
    }
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
    const value = resolver.evaluate(target.condition, environment);
    if (value !== false) consume(resolver, target.whenTrue, environment, sink, depth + 1);
    if (value !== true) consume(resolver, target.whenFalse, environment, sink, depth + 1);
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
      for (const returned of resolver.liveReturns(found.fn, bound)) consume(resolver, returned, bound, sink, depth + 1);
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

export function collectKeyUses(files: readonly SourceFileEntry[]): KeyCensus {
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
  /** 식별자가 가리키는 심볼 — 단축 속성(`{ save }`)은 속성이 아니라 그 값의 심볼이다. */
  const symbolAt = (identifier: ts.Identifier): ts.Symbol | undefined => (ts.isShorthandPropertyAssignment(identifier.parent)
    && identifier.parent.name === identifier
    ? resolver.checker.getShorthandAssignmentValueSymbol(identifier.parent) : resolver.symbolOf(identifier));
  const references = (name: ts.Identifier): ts.Identifier[] => {
    const symbol = resolver.symbolOf(name);
    return (identifiers.get(name.text) ?? []).filter((identifier) => identifier !== name && !ts.isImportSpecifier(identifier.parent)
      && !ts.isExportSpecifier(identifier.parent) && symbolAt(identifier) === symbol);
  };

  // 1) 조회 — 조회 훅·prefetch 호출에서 출발해 커스텀 훅 래퍼(옵션·키를 받는 함수)를 고정점까지 따라간다.
  const sink: Sink = { instances: [], overridden: new Set(), overriddenSources: new Set(), wrappers: new Map(), keyWrappers: new Map() };
  for (const call of calls) {
    if (call.arguments[0] && QUERY_PRODUCERS.has(resolver.callName(call))) consume(resolver, call.arguments[0], EMPTY, sink);
  }
  const done = new Set<string>();
  const ids = new Map<FunctionNode, number>();
  const idOf = (fn: FunctionNode): number => {
    if (!ids.has(fn)) ids.set(fn, ids.size);
    return ids.get(fn) ?? -1;
  };
  for (let round = 0; round < 10; round += 1) {
    const pending: { fn: FunctionNode; index: number; property?: ts.Node }[] = [];
    for (const [fn, indexes] of sink.wrappers) {
      for (const index of indexes) if (!done.has(`o:${idOf(fn)}:${index}`)) pending.push({ fn, index });
    }
    for (const [fn, indexes] of sink.keyWrappers) {
      for (const [index, property] of indexes) if (!done.has(`k:${idOf(fn)}:${index}`)) pending.push({ fn, index, property });
    }
    if (pending.length === 0) break;
    for (const item of pending) done.add(`${item.property ? 'k' : 'o'}:${idOf(item.fn)}:${item.index}`);
    for (const call of calls) {
      const target = callTarget(call);
      if (!target) continue;
      for (const item of pending) {
        const argument = call.arguments[item.index];
        if (target !== item.fn || !argument) continue;
        if (item.property) sink.instances.push({ property: item.property, key: argument, environment: EMPTY });
        else consume(resolver, argument, EMPTY, sink);
      }
    }
  }

  // 표지 — `query-key-unchecked: <사유>` 주석(문자열 속 글자는 아니다)은 정적 판정이 따라가지 못하는 조작 하나를 뺀다. 코드 뒤에 붙은
  //    주석은 그 줄을, 홀로 선 주석은 다음 줄을 덮는다. 덮는 줄에 조작이 여럿이면 아무것도 빼지 않는다(③ 이 붉다).
  const markers: UncheckedMarker[] = [];
  for (const source of sources) {
    if (!source.text.includes('query-key-unchecked')) continue;
    const seen = new Set<number>();
    const scan = (ranges: readonly ts.CommentRange[] | undefined): void => {
      for (const range of ranges ?? []) {
        if (seen.has(range.pos)) continue;
        seen.add(range.pos);
        const match = /^(?:\/\/|\/\*)\s*query-key-unchecked:([\s\S]*?)(?:\*\/)?$/.exec(source.text.slice(range.pos, range.end));
        if (!match) continue;
        const { line } = source.getLineAndCharacterOfPosition(range.pos);
        const before = source.text.slice(source.getPositionOfLineAndCharacter(line, 0), range.pos).trim();
        const trailing = before !== '' && before !== '{';
        markers.push({ file: fileOf(source), line: line + 1, reason: (match[1] ?? '').trim(), covers: trailing ? line + 1 : line + 2, ops: 0 });
      }
    };
    const visit = (node: ts.Node): void => {
      scan(ts.getLeadingCommentRanges(source.text, node.pos));
      scan(ts.getTrailingCommentRanges(source.text, node.end));
      for (const child of node.getChildren(source)) visit(child);
    };
    visit(source);
  }

  const uses: KeyUse[] = [];
  /** selfOnly: 조작에만 쓰이는 const 옵션의 키, suffixes: 화면이 뒤에 덧붙이는 원소(후보마다 하나씩), writes·reads: 저장·읽기 조작. */
  interface PushFlags { selfOnly?: boolean; suffixes?: readonly Element[][]; writes?: boolean; reads?: boolean }
  const push = (anchor: ts.Node, role: KeyUse['role'], exact: boolean, key: ts.Expression, environment: Environment,
    property: ts.Node | null, through: ReadonlySet<ts.Node> = new Set(), flags: PushFlags = {}): KeyUse[] => {
    resolver.trace = new Set(through);
    resolver.unbound = new Set();
    const alternatives = resolver.expandAll(key, environment);
    const source = anchor.getSourceFile();
    const position = anchor.getStart(source);
    const base = {
      file: fileOf(source), line: source.getLineAndCharacterOfPosition(position).line + 1, role, exact, property,
      selfOnly: flags.selfOnly ?? false, exempt: false, writes: flags.writes ?? false, reads: flags.reads ?? false, position,
      through: resolver.trace,
    };
    const suffixes = flags.suffixes ?? [[]];
    const created = (alternatives.length > 0 ? alternatives : [null]).flatMap((expanded): KeyUse[] => (expanded
      ? suffixes.map((suffix) => ({ ...base, expanded: [...expanded, ...suffix] }))
      : [{ ...base, expanded: null }]));
    uses.push(...created);
    return created;
  };
  const instanceProperties = new Set(sink.instances.map((instance) => instance.property));
  for (const instance of sink.instances) push(instance.property, 'query', false, instance.key, instance.environment, instance.property);

  // 2) 후보 — 조작 필터가 아닌 그 밖의 queryKey 속성(소비를 따라가지 못한 옵션). queryFn 이 없는 객체(슬롯 기여)는 그 객체의 문맥
  //    타입의 queryKey 를 펼쳐 조회하는 화면(`[...panel.queryKey, range]`)이 덧붙이는 자리만큼만 늘린다(그런 화면이 없으면 그대로다).
  //    화면이 `panel.kind === 'series'` 같은 조건 갈래 안에서 펼치면 그 조건에 맞는 기여에만 덧붙인다. 덮인 옵션은 다른 곳에서
  //    통째로 쓰이지 않으면 빼고, 조작에만 쓰이는 const 옵션은 selfOnly.
  /** 펼친 쪽 조건 — 받는 객체의 문자열 속성이 값과 같아야(equal) 또는 달라야 한다. */
  interface Discriminant { name: string; value: string; equal: boolean }
  /** 인터페이스의 queryKey 선언 → 그것을 펼쳐 조회하는 키가 뒤에 덧붙이는 원소들과 그 조건. */
  const appended = new Map<ts.Declaration, { suffix: Element[]; when: Discriminant[] }[]>();
  /** `recv.name === 'lit'`(또는 !==·==·!=) 꼴의 조건. */
  const discriminantOf = (condition: ts.Expression, receiver: ts.Symbol): Discriminant | undefined => {
    const target = unwrap(condition);
    if (!ts.isBinaryExpression(target)) return undefined;
    const operator = target.operatorToken.kind;
    const equal = operator === ts.SyntaxKind.EqualsEqualsEqualsToken || operator === ts.SyntaxKind.EqualsEqualsToken;
    if (!equal && operator !== ts.SyntaxKind.ExclamationEqualsEqualsToken && operator !== ts.SyntaxKind.ExclamationEqualsToken) return undefined;
    for (const [side, other] of [[target.left, target.right], [target.right, target.left]] as const) {
      const access = unwrap(side);
      const literal = unwrap(other);
      if (ts.isPropertyAccessExpression(access) && ts.isIdentifier(access.expression) && resolver.symbolOf(access.expression) === receiver
        && ts.isStringLiteral(literal)) return { name: access.name.text, value: literal.text, equal };
    }
    return undefined;
  };
  for (const instance of sink.instances) {
    // 키를 상수까지 따라가 배열 리터럴을 찾는다(`const key = [...panel.queryKey, range]; useQuery({ queryKey: key })`).
    let key = unwrap(instance.key);
    let environment = instance.environment;
    for (let depth = 0; depth < MAX_DEPTH && ts.isIdentifier(key); depth += 1) {
      const value = resolver.valueOf(key, environment);
      if (!value) break;
      key = unwrap(value.node);
      environment = value.environment;
    }
    // `[...panel.queryKey, …]` 는 뒤 원소를 덧붙이고, `panel.queryKey` 를 그대로 쓰면 덧붙이지 않는다.
    let spread: ts.Expression | undefined = key;
    let rest: readonly ts.Expression[] = [];
    if (ts.isArrayLiteralExpression(key)) {
      const [head, ...tail] = key.elements;
      spread = head && ts.isSpreadElement(head) ? unwrap(head.expression) : undefined;
      rest = tail;
    }
    if (!spread || !ts.isPropertyAccessExpression(spread) || spread.name.text !== 'queryKey'
      || resolver.keySite(spread.expression, environment)) continue;
    const suffix: Element[] = rest.map((element) => (ts.isSpreadElement(element)
      ? { spread: element.expression.getText() } : resolver.literal(element, environment) ?? { expression: element.getText() }));
    const receiver = ts.isIdentifier(spread.expression) ? resolver.symbolOf(spread.expression) : undefined;
    // 갈래 조건은 키를 적은 자리와 그 키를 쓰는 queryKey 자리 둘 다에서 찾는다(변수에 먼저 담고 한 갈래에서만 쓰는 경우).
    const when: Discriminant[] = [];
    for (const start of new Set<ts.Node>([key, instance.property])) {
      for (let child: ts.Node = start, parent = start.parent; receiver && parent; child = parent, parent = parent.parent) {
        const branch = ts.isConditionalExpression(parent) && child !== parent.condition ? { condition: parent.condition, positive: child === parent.whenTrue }
          : ts.isIfStatement(parent) && child !== parent.expression ? { condition: parent.expression, positive: child === parent.thenStatement }
            : undefined;
        const found = branch && discriminantOf(branch.condition, receiver);
        if (branch && found) when.push({ ...found, equal: found.equal === branch.positive });
        if (isFunctionNode(parent)) break;
      }
    }
    for (const declaration of resolver.checker.getSymbolAtLocation(spread.name)?.declarations ?? []) {
      appended.set(declaration, [...(appended.get(declaration) ?? []), { suffix, when }]);
    }
  }
  /** 객체의 문자열 리터럴 속성 값(`kind: 'series'`). */
  const stringProperty = (object: ts.ObjectLiteralExpression, name: string): string | undefined => {
    for (const property of object.properties) {
      if (ts.isPropertyAssignment(property) && property.name.getText() === name && ts.isStringLiteral(property.initializer)) {
        return property.initializer.text;
      }
    }
    return undefined;
  };
  /** 문맥 타입의 유니언 갈래가 객체의 문자열 리터럴 속성(`kind: 'series'`)과 맞는가. */
  const discriminated = (member: ts.Type, object: ts.ObjectLiteralExpression): boolean => object.properties.every((property) => {
    if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.initializer)) return true;
    const value = property.initializer.text;
    const declared = member.getProperty(property.name.getText());
    if (!declared) return true;
    const type = resolver.checker.getTypeOfSymbolAtLocation(declared, object);
    const parts = type.isUnion() ? type.types : [type];
    return !parts.every((part) => part.isStringLiteral()) || parts.some((part) => part.isStringLiteral() && part.value === value);
  });
  const suffixesOf = (object: ts.ObjectLiteralExpression): Element[][] => {
    const type = resolver.checker.getContextualType(object);
    const members = !type ? [] : type.isUnion() ? type.types : [type];
    const found = members.filter((member) => discriminated(member, object))
      .flatMap((member) => member.getProperty('queryKey')?.declarations ?? [])
      .flatMap((declaration) => appended.get(declaration) ?? [])
      .filter(({ when }) => when.every(({ name, value, equal }) => {
        const own = stringProperty(object, name);
        return own === undefined || (own === value) === equal;
      }))
      .map(({ suffix }) => suffix);
    const unique = new Map(found.map((suffix) => [JSON.stringify(suffix), suffix]));
    return unique.size > 0 ? [...unique.values()] : [[]];
  };
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
  /** 옵션 객체를 통째로 쓰는 참조인가 — `base.staleTime`·`const { staleTime } = base` 처럼 키가 아닌 속성만 읽는 것은 아니다. */
  const usesWhole = (reference: ts.Identifier): boolean => {
    const outer = outermost(reference);
    const parent = outer.parent;
    if (ts.isPropertyAccessExpression(parent) && parent.expression === outer) return parent.name.text === 'queryKey';
    if (parent && ts.isVariableDeclaration(parent) && parent.initializer === outer && ts.isObjectBindingPattern(parent.name)) {
      return parent.name.elements.some((element) => element.dotDotDotToken !== undefined
        || (element.propertyName ?? element.name).getText() === 'queryKey');
    }
    return true;
  };
  const holderName = (holder: ts.Node): ts.Identifier | undefined => {
    const declaration = outermost(holder).parent;
    return declaration && ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name) ? declaration.name : undefined;
  };
  for (const property of keyProperties) {
    if (instanceProperties.has(property)) continue;
    const object = property.parent;
    if (!ts.isObjectLiteralExpression(object) || isOperationArgument(object)) continue;
    const wrapper = outermost(object).parent;
    const holder = wrapper && ts.isCallExpression(wrapper) && OPTION_WRAPPERS.has(resolver.callName(wrapper)) ? wrapper : object;
    const name = holderName(holder);
    const others = name ? references(name) : [];
    // 덮인 옵션은 덮은 스프레드·조작 밖에서도 통째로 쓰여야(다른 조회에 넘김 등) 후보로 남는다.
    if (sink.overridden.has(property) && !others.some((reference) => usesWhole(reference) && !isOperationReference(reference)
      && !sink.overriddenSources.has(outermost(reference)))) continue;
    const key = ts.isPropertyAssignment(property) ? property.initializer : property.name;
    const hasQueryFn = object.properties.some((candidate) => propertyValue(candidate, 'queryFn') !== undefined
      || (ts.isMethodDeclaration(candidate) && candidate.name.getText() === 'queryFn'));
    const selfOnly = !!name && others.every(isOperationReference);
    push(property, 'candidate', false, key, EMPTY, property, new Set(), { selfOnly, suffixes: hasQueryFn ? undefined : suffixesOf(object) });
  }

  // 3) 조작 — 조작 호출마다(같은 필터를 여러 호출에 넘겨도 각각). 키·exact·앞의 조건이 감싼 함수의 매개변수에 기대면 그 함수의
  //    호출 자리마다 인자를 대입해 보고, 그 인자로 닿지 않는 조작(조기 반환 뒤 등)은 그 자리에서 뺀다. 함수를 값으로 넘기는 곳
  //    (`onSelected(refresh)`)이 있으면 호출 자리 밖에서도 불릴 수 있어 제자리 조작도 남긴다.
  /** 함수를 직접 호출하지 않고 값으로 쓰는 참조가 있는가(이름을 모르는 함수는 있다고 본다). */
  const passedAsValue = (fn: FunctionNode): boolean => {
    const holder = ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn) ? fn : outermost(fn).parent;
    const name = holder && (ts.isFunctionDeclaration(holder) || ts.isMethodDeclaration(holder) || ts.isVariableDeclaration(holder))
      ? holder.name : undefined;
    if (!name || !ts.isIdentifier(name)) return true;
    return references(name).some((reference) => {
      const callee = ts.isPropertyAccessExpression(reference.parent) && reference.parent.name === reference
        ? outermost(reference.parent) : outermost(reference);
      return !(ts.isCallExpression(callee.parent) && callee.parent.expression === callee);
    });
  };
  interface Measured { key: ts.Expression; environment: Environment; exact: boolean; through: ReadonlySet<ts.Node> }
  const pushOperation = (anchor: ts.Node, measure: (environment: Environment) => Measured | undefined, flags: PushFlags = {}): void => {
    /** 조작 하나와, 저장이면 그 저장이 만든 항목(다른 읽기·조작의 후보 — 자기 자신과는, 다른 저장과도 맞추지 않는다). */
    const emit = (at: ts.Node, measured: Measured): { created: KeyUse[]; unbound: ts.ParameterDeclaration[] } => {
      const created = push(at, 'op', measured.exact, measured.key, measured.environment, null, measured.through, flags);
      const unbound = [...resolver.unbound];
      if (flags.writes) {
        created.push(...push(at, 'candidate', false, measured.key, measured.environment, [...measured.through][0] ?? null, new Set(),
          { selfOnly: true, writes: true }));
      }
      return { created, unbound };
    };
    resolver.unbound = new Set();
    const generic = measure(EMPTY);
    if (!generic) return;
    const measured = [...resolver.unbound];
    resolver.unbound = new Set();
    resolver.reachable(anchor, anchor.getSourceFile(), EMPTY);
    const conditions = [...resolver.unbound];
    const { created, unbound } = emit(anchor, generic);
    const keyed = [...new Set([...measured, ...unbound])];
    const owner = (keyed[0] ?? conditions[0])?.parent;
    if (!owner || !isFunctionNode(owner) || keyed.some((parameter) => parameter.parent !== owner)) return;
    let enclosed = false;
    for (let current: ts.Node | undefined = anchor.parent; current && !enclosed; current = current.parent) enclosed = current === owner;
    if (!enclosed) return;
    const sites = calls.filter((call) => callTarget(call) === owner);
    if (sites.length === 0) return;
    const passed = passedAsValue(owner);
    const remove = (): void => {
      for (const use of created) uses.splice(uses.indexOf(use), 1);
    };
    // 키·exact 가 매개변수에 기대지 않으면 조작은 제자리에 두고, 모든 호출 자리에서 닿지 않을 때만 뺀다(보고 위치를 지킨다).
    if (keyed.length === 0) {
      if (!passed && sites.every((site) => !resolver.reachable(anchor, owner, resolver.bind(owner, site, EMPTY)))) remove();
      return;
    }
    if (!passed) remove();
    for (const site of sites) {
      const bound = resolver.bind(owner, site, EMPTY);
      if (!resolver.reachable(anchor, owner, bound)) continue;
      const measuredSite = measure(bound);
      if (measuredSite) emit(site, measuredSite);
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
        // 풀 수 없는 exact 값은 정확 일치로 확정하지 않는다(매개변수 기본값 false 를 넘기는 도우미).
        const exact = exactValue ? literal?.literal === 'k:true' : defaultExact;
        return { key: site.key, environment: site.environment, exact, through: new Set([site.property]) };
      }, { reads: name === 'find' });
    }
    if (KEY_ARGUMENT_OPS.has(name) && !ts.isObjectLiteralExpression(unwrap(first))) {
      const writes = name === 'setQueryData';
      pushOperation(call, (environment) => ({ key: first, environment, exact: true, through: writes ? new Set([call]) : new Set() }),
        { writes, reads: !writes });
    }
  }

  // 4) 키 목록 — 목록 값이 흘러가는 곳을 따라간다. 목록 값은 목록 자신, 그것을 담은 지역 변수(`const stale = staleKeys(id)`), for…of
  //    변수, 배열 메서드 콜백(`keys.forEach(evict)`)의 첫 매개변수, 그 값을 받은 함수의 매개변수다. 목록 값을 인자로 받는 조작이 있으면
  //    원소는 그 조작이고(정확 여부는 그 조작의 exact), 목록 값을 받는 조회 훅이 있거나 아무 데도 흐르지 않으면 후보다(둘 다면 둘 다).
  //    QueryKey[] 변수에 push 한 원소도 그 목록의 원소다.
  interface KeyList { name?: ts.Identifier; elements: ts.Expression[] }
  const lists: KeyList[] = [];
  const listOfDeclaration = new Map<ts.Node, KeyList>();
  for (const source of sources) {
    const visit = (node: ts.Node): void => {
      const elements = keyListElements(node, source, resolver);
      const isListVariable = ts.isVariableDeclaration(node) && isKeyListVariable(node, source);
      if (elements.length > 0 || isListVariable) {
        const name = (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name && ts.isIdentifier(node.name)
          ? node.name : undefined;
        const list: KeyList = { name, elements: [...elements] };
        lists.push(list);
        listOfDeclaration.set(node, list);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const call of calls) {
    const callee = call.expression;
    if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'push') continue;
    const declaration = resolver.declarationOf(callee.expression);
    const list = declaration ? listOfDeclaration.get(declaration) : undefined;
    if (list) list.elements.push(...call.arguments);
  }
  /** 참조를 품은 문장(블록의 직접 자식). */
  const statementOf = (node: ts.Node): ts.Node => {
    let current = node;
    while (current.parent && !ts.isBlock(current.parent) && !ts.isSourceFile(current.parent) && !ts.isModuleBlock(current.parent)
      && !ts.isCaseClause(current.parent) && !ts.isDefaultClause(current.parent)) current = current.parent;
    return current;
  };
  /** 목록 원소의 쓰임 — 정확·접두 조작, 그중 읽기(정확 읽기면 저장 항목의 짝), 조회 훅. */
  interface ListFlow { exact: boolean; prefix: boolean; reads: boolean; produces: boolean }
  /** 원소를 하나씩 넘기는 배열 메서드 — 콜백의 첫 매개변수가 목록 값이다. */
  const ARRAY_METHODS = new Set(['map', 'forEach', 'filter', 'flatMap', 'some', 'every', 'find', 'findIndex', 'findLast']);
  const containsDerived = (node: ts.Node, derived: ReadonlySet<ts.Symbol>): boolean => {
    let found = false;
    const visit = (child: ts.Node): void => {
      if (found) return;
      if (ts.isIdentifier(child)) {
        const symbol = symbolAt(child);
        if (symbol && derived.has(symbol)) {
          found = true;
          return;
        }
      }
      ts.forEachChild(child, visit);
    };
    visit(node);
    return found;
  };
  /**
   * 식의 값이 목록 값인가 — 목록 값 자신, 그것을 품은 배열·객체(`{ queryKey }`), 그것에서 시작하는 메서드 체인(`keys.filter(…)`),
   * 목록 함수의 호출(`staleKeys(id)`). 목록 값을 인자로만 받은 호출의 결과(`cache.findAll({ queryKey })`)는 아니다.
   */
  const derivedValue = (node: ts.Expression, derived: ReadonlySet<ts.Symbol>, depth = 0): boolean => {
    if (depth > MAX_DEPTH) return false;
    const target = unwrap(node);
    if (ts.isIdentifier(target)) {
      const symbol = symbolAt(target);
      return !!symbol && derived.has(symbol);
    }
    if (ts.isArrayLiteralExpression(target) || ts.isObjectLiteralExpression(target)) return containsDerived(target, derived);
    if (ts.isConditionalExpression(target)) {
      return derivedValue(target.whenTrue, derived, depth + 1) || derivedValue(target.whenFalse, derived, depth + 1);
    }
    if (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target) || ts.isCallExpression(target)) {
      return derivedValue(target.expression, derived, depth + 1);
    }
    return false;
  };
  const declare = (name: ts.BindingName | undefined, derived: Set<ts.Symbol>): void => {
    const symbol = name && ts.isIdentifier(name) ? resolver.checker.getSymbolAtLocation(name) : undefined;
    if (symbol) derived.add(symbol);
  };
  /**
   * node 안에서 목록 값(derived — 목록 자신, 그 값을 담은 지역 변수, for…of 변수, 배열 메서드 콜백의 첫 매개변수, 그 값을 받은 함수의
   * 매개변수)을 인자로 받는 조작·조회 훅을 flow 에 적고, 목록 값을 담은 지역 변수를 holders 에도 모은다(다른 문장의 참조를 따라간다).
   * 같은 문장이라도 목록 값을 받지 않는 호출은 세지 않는다. environment 는 그 함수에 대입한 호출 인자다(도우미의 exact 기본값).
   */
  const analyze = (node: ts.Node, derived: Set<ts.Symbol>, environment: Environment, flow: ListFlow, holders: ts.Identifier[],
    depth: number, seen: Set<ts.Node>): void => {
    const into = (fn: FunctionNode, parameters: (ts.BindingName | undefined)[], bound: Environment): void => {
      if (!fn.body || depth >= 3 || seen.has(fn)) return;
      seen.add(fn);
      const inner = new Set<ts.Symbol>();
      for (const parameter of parameters) declare(parameter, inner);
      analyze(fn.body, inner, bound, flow, [], depth + 1, seen);
    };
    const visit = (child: ts.Node): void => {
      if (ts.isVariableDeclaration(child) && child.initializer && ts.isIdentifier(child.name) && derivedValue(child.initializer, derived)) {
        holders.push(child.name);
        declare(child.name, derived);
      }
      if (ts.isForOfStatement(child) && ts.isVariableDeclarationList(child.initializer) && derivedValue(child.expression, derived)) {
        for (const declaration of child.initializer.declarations) declare(declaration.name, derived);
      }
      if (ts.isCallExpression(child)) {
        const name = resolver.callName(child);
        const callee = unwrap(child.expression);
        if (ts.isPropertyAccessExpression(callee) && ARRAY_METHODS.has(callee.name.text) && derivedValue(callee.expression, derived)) {
          for (const argument of child.arguments) {
            const callback = unwrap(argument);
            if (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) {
              declare(callback.parameters[0]?.name, derived);
              continue;
            }
            const declaration = ts.isIdentifier(callback) || ts.isPropertyAccessExpression(callback) ? resolver.declarationOf(callback) : undefined;
            const fn = declaration ? functionNodeOf(declaration) : undefined;
            if (fn) into(fn, [fn.parameters[0]?.name], EMPTY);
          }
        } else if (child.arguments.some((argument) => containsDerived(argument, derived))) {
          if (KEY_ARGUMENT_OPS.has(name)) {
            flow.exact = true;
            if (name !== 'setQueryData') flow.reads = true;
          } else if (CACHE_OPS.has(name)) {
            const [first] = child.arguments;
            const option = first ? resolver.optionValue(first, 'exact', environment) : undefined;
            // 그 조작의 exact 를 따른다 — 적지 않으면 기본값, 풀 수 없으면 접두.
            const exact = option ? resolver.literal(option.node, option.environment)?.literal === 'k:true' : CACHE_OPS.get(name) === true;
            if (exact) {
              flow.exact = true;
              if (name === 'find') flow.reads = true;
            } else flow.prefix = true;
          } else if (QUERY_PRODUCERS.has(name)) flow.produces = true;
          else {
            const target = callTarget(child);
            if (target) {
              into(target, child.arguments.map((argument, index) => (containsDerived(argument, derived) ? target.parameters[index]?.name : undefined)),
                resolver.bind(target, child, environment));
            }
          }
        }
      }
      ts.forEachChild(child, visit);
    };
    visit(node);
  };
  const flowOf = (name: ts.Identifier, flow: ListFlow, depth: number, seen: Set<ts.Node>): void => {
    const symbol = resolver.symbolOf(name);
    if (!symbol) return;
    for (const reference of references(name)) {
      const statement = statementOf(reference);
      if (seen.has(statement)) continue;
      seen.add(statement);
      const holders: ts.Identifier[] = [];
      analyze(statement, new Set([symbol]), EMPTY, flow, holders, 0, seen);
      if (depth < 3) for (const holder of holders) flowOf(holder, flow, depth + 1, seen);
    }
  };
  const flows = new Map<ts.Expression, ListFlow>();
  for (const list of lists) {
    const flow: ListFlow = { exact: false, prefix: false, reads: false, produces: false };
    if (list.name) flowOf(list.name, flow, 0, new Set());
    for (const element of list.elements) {
      const merged = flows.get(element);
      flows.set(element, merged ? {
        exact: merged.exact || flow.exact, prefix: merged.prefix || flow.prefix, reads: merged.reads || flow.reads,
        produces: merged.produces || flow.produces,
      } : { ...flow });
    }
  }
  for (const [element, flow] of flows) {
    // 정확·접두 조작이 섞이면 원소마다 어느 쪽인지 알 수 없어 접두로만 본다(정상 코드를 붉히지 않게).
    if (flow.exact && !flow.prefix) {
      pushOperation(element, (environment) => ({ key: element, environment, exact: true, through: new Set() }), { reads: flow.reads });
    }
    if (flow.prefix) pushOperation(element, (environment) => ({ key: element, environment, exact: false, through: new Set() }));
    if ((!flow.exact && !flow.prefix) || flow.produces) push(element, 'candidate', false, element, EMPTY, null);
  }

  for (const marker of markers) {
    const covered = uses.filter((use) => use.role === 'op' && use.file === marker.file && use.line === marker.covers);
    marker.ops = new Set(covered.map((use) => use.position)).size;
    if (marker.reason !== '' && marker.ops === 1) for (const use of covered) use.exempt = true;
  }
  return { uses, markers };
}

/** 목록 변수인가 — QueryKey[] 로 타입을 달았거나 satisfies QueryKey[] 인 const. */
function isKeyListVariable(declaration: ts.VariableDeclaration, source: ts.SourceFile): boolean {
  const initializer = declaration.initializer;
  if (!initializer) return false;
  return KEY_LIST_TYPE.test(declaration.type?.getText(source) ?? '')
    || (ts.isSatisfiesExpression(initializer) && KEY_LIST_TYPE.test(initializer.type.getText(source)));
}

const headOf = (elements: readonly Element[] | null): { literal: string; origin: string } | null => {
  const first = elements?.[0];
  return first && 'literal' in first ? first : null;
};

/**
 * 조작 키가 조회 키와 맞는가. 첫 원소는 리터럴끼리 같아야 하고(머리가 풀리지 않은 조회 키가 모든 조작을 덮지 않게), 그 뒤로는
 * 리터럴끼리 같아야 하며 한쪽이 동적 값이면 맞을 수 있다고 본다. 조작 쪽의 길이 모르는 스프레드는 0개 이상의 자리다(뒤에 남은 원소는
 * 그대로 맞춰 본다). 조회 쪽의 길이 모르는 스프레드를 만나면 뒤 자리를 알 수 없어 거기서 맞는다고 본다. 정확 조작은 길이까지 같아야
 * 한다 — 조회 쪽에 남은 것이 길이를 모르는 스프레드뿐이면 비어 있을 수 있어 맞는다.
 */
export function keyMatches(op: readonly Element[], query: readonly Element[], exact: boolean): boolean {
  const [head] = op;
  const [otherHead] = query;
  if (!head || !otherHead || !('literal' in head) || !('literal' in otherHead) || head.literal !== otherHead.literal) return false;
  const match = (index: number, at: number): boolean => {
    const element = op[index];
    if (element === undefined) return !exact || query.slice(at).every((other) => 'spread' in other);
    const other = query[at];
    if ('spread' in element) return match(index + 1, at) || (other !== undefined && ('spread' in other || match(index, at + 1)));
    if (other === undefined) return false;
    if ('spread' in other) return true;
    if ('literal' in element && 'literal' in other && element.literal !== other.literal) return false;
    return match(index + 1, at + 1);
  };
  return match(1, 1);
}

export function checkedOperations(uses: readonly KeyUse[]): KeyUse[] {
  return uses.filter((use) => use.role === 'op' && headOf(use.expanded) !== null);
}

/** ① 맞는 조회 키가 없는 조작. 첫 원소가 리터럴로 풀린 조작만 보고, 표지로 뺀 조작은 보지 않는다. */
export function orphanOperations(uses: readonly KeyUse[]): KeyUse[] {
  const candidates = uses.filter((use) => (use.role === 'query' || use.role === 'candidate') && use.expanded !== null);
  // 저장 항목의 짝은 그 항목을 정확히 읽는 조작(getQueryData·getQueryState·정확 find)뿐이다 — 접두 무효화나 정확 삭제는 오타 난
  // 저장도 덮으므로 짝으로 치지 않는다.
  const readers = uses.filter((use) => use.role === 'op' && use.reads && use.exact && use.expanded !== null);
  return checkedOperations(uses).filter((op) => !op.exempt && !candidates.some((candidate) => {
    if (candidate.selfOnly && candidate.property !== null && op.through.has(candidate.property)) return false;
    // 저장은 다른 저장이 만든 항목과 맞추지 않는다(낙관적 갱신과 롤백이 같은 오타로 서로를 덮지 않게).
    if (op.writes && candidate.writes) return false;
    return op.expanded !== null && candidate.expanded !== null && keyMatches(op.expanded, candidate.expanded, op.exact);
  }) && !(op.writes && readers.some((reader) => op.expanded !== null && reader.expanded !== null
    && keyMatches(reader.expanded, op.expanded, true))));
}

/** ③ 표지 문제 — 사유가 없거나, 덮는 줄에 조작이 여럿이거나, 표지가 없으면 고아였을 조작이 덮는 줄에 없다(낡은 표지). */
export function markerProblems(census: KeyCensus): string[] {
  const unexempted = orphanOperations(census.uses.map((use) => ({ ...use, exempt: false })));
  return census.markers.flatMap((marker) => {
    const at = `${marker.file}:${marker.line}`;
    if (marker.reason === '') return [`${at} 사유가 없다`];
    if (marker.ops > 1) return [`${at} 덮는 줄(${marker.covers})에 조작이 여럿이다 — 표지는 조작 하나만 뺀다`];
    const covers = unexempted.some((op) => op.file === marker.file && op.line === marker.covers);
    return covers ? [] : [`${at} 덮는 줄(${marker.covers})에 맞는 조회가 없는 조작이 없다(낡은 표지)`];
  });
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

const production = (): KeyCensus => collectKeyUses(productionFiles(SRC).map((path) => ({
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
const orphansOf = (census: KeyCensus, file: string): string[] => orphanOperations(census.uses).filter((use) => use.file === file)
  .map((use) => `${use.line}:${describeKey(use)}`)
  .sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10) || left.localeCompare(right));

describe('쿼리 키 일관성', () => {
  let cached: KeyCensus | undefined;
  const census = (): KeyCensus => (cached ??= production());

  it('생산 소스에서 실제로 비교한다 — 첫 원소가 풀린 조회·조작이 있어야 한다(없으면 아래 계약은 공허하다)', () => {
    expect(census().uses.filter((use) => use.role === 'query' && headOf(use.expanded) !== null).length).toBeGreaterThan(0);
    expect(checkedOperations(census().uses).length).toBeGreaterThan(0);
  }, 180_000);

  it('① 캐시 조작의 키는 어떤 조회 키와 자리마다 맞는다', () => {
    const orphans = orphanOperations(census().uses).map((use) => `${use.file}:${use.line}${use.exact ? ' (정확)' : ''} ${describeKey(use)}`);
    expect(orphans, '맞는 조회 키가 없는 무효화·캐시 조작(조용히 아무것도 갱신하지 않는다) — 조회와 같은 팩토리를 쓴다. 키를 런타임에 '
      + `조립해 정적 판정이 따라가지 못하면 그 조작 바로 위에 'query-key-unchecked: <사유>' 를 둔다:\n${orphans.join('\n')}`).toEqual([]);
  }, 180_000);

  it('② 같은 쿼리 키 이름공간을 실제로 적은 파일은 하나뿐이다(여러 파일이면 src/queries/<도메인>-keys.ts 팩토리)', () => {
    const shared = [...sharedLiteralNamespaces(census().uses)].map(([head, files]) => `'${head}': ${files.join(', ')}`);
    expect(shared, `여러 파일이 각자 적은 쿼리 키 이름공간:\n${shared.join('\n')}`).toEqual([]);
  }, 180_000);

  it('③ query-key-unchecked 표지는 사유가 있고, 덮는 줄의 조작 하나가 실제로 판정에 걸릴 때만 둔다', () => {
    expect(markerProblems(census())).toEqual([]);
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
          + "const extra: QueryKey[] = [['jbos3']];\n"
          + "const stale = [...extra, ['jbos2']] satisfies QueryKey[]; for (const k of stale) qc.invalidateQueries({ queryKey: k });\n" // 27·28: 무효화 목록
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
          + 'function staleKeys(): QueryKey[] { return [keys9.old]; } for (const k of staleKeys()) void qc.invalidateQueries({ queryKey: k });\n' // 31
          + "const exact = true as const;\nuseRQ({ queryKey: ['ex', 1], queryFn });\nqc.invalidateQueries({ queryKey: ['ex'], exact });\n" // 34
          + "useRQ({ queryKey: ['hash', 1], queryFn });\nqc.getQueryData(['hash', '#1']);\n" // 36: 문자열 '#1' 은 숫자 1 이 아니다
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
      {
        // 5회차 — 정상이어야 할 것(오탐 금지)과 분기별 오타·표지.
        path: 'qk-self/d.tsx',
        text: "import { useMemo } from 'react';\n"
          + "import { useQuery, useQueries, type QueryKey, type QueryClient, type QueryCache } from '@tanstack/react-query';\n"
          + 'declare const qc: QueryClient; declare const cache: QueryCache; declare const queryFn: () => Promise<number>; declare const range: string; declare const editing: boolean; declare const id: number;\n'
          + "const STATS_KEY = ['stats-bbs'] as const;\nexport const contribution = { id: 'bbs', queryKey: STATS_KEY, load: queryFn };\n"
          + 'qc.getQueryData([...STATS_KEY]);\n' // 6: 펼쳐 조회하는 화면이 없는 queryFn 없는 키는 그대로 — 맞음
          + "const keyList: QueryKey[] = [['tab-a']];\nkeyList.push(['tab-b']);\nconst queries = keyList.map((queryKey) => ({ queryKey, queryFn }));\n"
          + 'useQueries({ queries });\n' // 조회용 목록 — 조작 아님
          + "const detailKey = (n: number) => ['page', 'detail', n] as const; const listKey = ['page', 'list'] as const;\n"
          + 'useQuery({ queryKey: editing ? detailKey(id) : listKey, queryFn });\nqc.getQueryData(detailKey(id));\n' // 13: 키의 분기 — 맞음
          + "function pageKey(n?: number) { if (n !== undefined) return ['pk', 'detail', n] as const; return ['pk', 'list'] as const; }\n"
          + "useQuery({ queryKey: pageKey(42), queryFn }); qc.getQueryData(['pk', 'detail', 42]);\n" // 15: 여러 return — 맞음
          + "function Memo() { const key = useMemo(() => ['memo-key', id] as const, []); useQuery({ queryKey: key, queryFn }); return null; }\n"
          + "qc.getQueryData(['memo-key', 7]);\n" // 17: useMemo 키 — 맞음
          + 'function useReport(queryKey: QueryKey) { return useQuery({ queryKey, queryFn }); }\n'
          + "useReport(['report', 1]); qc.invalidateQueries({ queryKey: ['report'] });\n" // 19: 키를 받는 커스텀 훅 — 맞음
          + "const base = { queryKey: ['base2'] as const, queryFn };\nuseQuery({ ...base, queryKey: ['other2'] }); declare const showBase: boolean;\n"
          + 'useQueries({ queries: [base].filter(() => showBase) }); qc.getQueryData(base.queryKey);\n' // 22: 덮였어도 다른 곳에서 쓰인다 — 맞음
          + "const ROOT2 = ['scoped'] as const; const scopedKey = (...path: string[]) => [...ROOT2, ...path] as const;\n"
          + 'useQuery({ queryKey: ROOT2, queryFn }); qc.getQueryData(scopedKey());\n' // 24: 조작 끝의 빈 스프레드 — 맞음
          + "function findInCache(exact = false) { return cache.find({ queryKey: ['fic'], exact }); }\n"
          + "useQuery({ queryKey: ['fic', 'list'], queryFn }); findInCache();\n" // 26: exact 기본값 false — 맞음
          + "qc.setQueryData(['stored', 1], 123); qc.getQueryData(['stored', 1]);\n" // 27: setQueryData 로 만든 항목 — 맞음
          + "function useFiles(view = 'list') { const options = () => ({ queryKey: ['files', view], queryFn }); return useQuery(options()); }\n"
          + "useFiles('detail'); qc.getQueryData(['files', 'detail']);\n" // 29: 바깥 함수 기본값을 확정하지 않는다 — 맞음
          + "function refresh(tab: string) { if (tab === 'help') return; return qc.invalidateQueries({ queryKey: ['queue', tab] }); }\n"
          + "useQuery({ queryKey: ['queue', 'active'], queryFn }); declare const prefix: string; useQuery({ queryKey: [prefix + 'x'], queryFn });\n"
          + "refresh('active'); refresh('help');\n" // 32: 'help' 는 조작 전에 돌아간다(조기 반환) — 맞음
          + "// query-key-unchecked: 런타임에 조립한 접두로 조회한다 — 정적 판정이 따라가지 못한다\nqc.invalidateQueries({ queryKey: ['ax'] });\n" // 34: 표지로 뺀다
          + "declare const flag2: boolean; useQuery({ queryKey: ['cases', 'open'], queryFn });\n"
          + "qc.invalidateQueries({ queryKey: flag2 ? ['cases', 'open'] : ['cases', 'opne'] });\n" // 36: 분기별 오타
          + "// query-key-unchecked:\nqc.invalidateQueries({ queryKey: ['no-reason'] });\n" // 37: 사유 없는 표지(뺄 수 없다) → 38 고아
          + "// query-key-unchecked: 고아가 아닌데 둔 표지\nqc.invalidateQueries({ queryKey: ['queue'] });\n" // 39: 낡은 표지
          + "useQuery({ queryKey: ['wr', 'list'], queryFn }); qc.invalidateQueries({ queryKey: ['wr'] });\n"
          + "qc.setQueryData(['wr', 'lsit'], 1);\n", // 42: 접두 무효화는 저장 항목을 읽지 않는다 — 오타 난 저장은 고아
      },
      {
        // 6회차 — 5회차 완화가 놓치던 오타(실수로 생길 형태)와 그 반대쪽 정상 코드.
        path: 'qk-self/e.tsx',
        text: "import { useQuery, useQueries, type QueryKey, type QueryClient, type QueryCache } from '@tanstack/react-query';\n"
          + 'declare const qc: QueryClient; declare const cache: QueryCache; declare const queryFn: () => Promise<number>; declare const range: string; declare const id: number; declare const prefix2: string;\n'
          + "interface SeriesPanel { kind: 'series'; queryKey: readonly unknown[]; load: (r?: string) => Promise<number> }\n"
          + "interface BodyPanel { kind: 'body'; queryKey: readonly unknown[]; load: () => Promise<number> }\n"
          + 'type Panel = SeriesPanel | BodyPanel; function define<T>(items: T[]): T[] { return items; }\n'
          + "const SERIES_KEY = ['e-series'] as const; const BODY_KEY = ['e-body'] as const;\n"
          + "export const panels = define<Panel>([{ kind: 'series', queryKey: SERIES_KEY, load: queryFn }, { kind: 'body', queryKey: BODY_KEY, load: queryFn }]);\n"
          + "useQueries({ queries: panels.map((panel) => (panel.kind === 'series' ? { queryKey: [...panel.queryKey, range], queryFn } : { queryKey: [...panel.queryKey], queryFn })) });\n"
          + 'qc.getQueryData([...SERIES_KEY, range]); qc.getQueryData([...BODY_KEY]);\n' // 9: 화면이 덧붙이는 자리만큼 — 맞음
          + "qc.getQueryData([...BODY_KEY, 'detail', id]);\n" // 10: 화면이 덧붙이지 않는 자리 → 고아
          + "useQuery({ queryKey: ['bl', 'list'], queryFn });\n"
          + "qc.setQueryData(['bl', 'list', 'draft'], 1);\n" // 12: 낙관적 갱신의 오타 → 고아
          + "qc.setQueryData(['bl', 'list', 'draft'], 2); qc.getQueryData(['bl', 'list']);\n" // 13: 롤백 — 저장끼리 짝이 아니다 → 고아
          + "function staleKeys(n: number): QueryKey[] { return [['ek-surveys'], ['ek-survyes', n]]; }\n"
          + "useQuery({ queryKey: ['ek-surveys'], queryFn }); const stale = staleKeys(id);\n" // 15: 지역 변수에 담은 목록의 오타 → 고아
          + 'for (const key of stale) void qc.invalidateQueries({ queryKey: key });\n'
          + "const evictKeys: QueryKey[] = [['ek-board']]; evictKeys.push(['ek-board-lsit']);\n" // 17: 함수에 넘겨 지우는 목록의 오타 → 고아
          + "const evict = (key: QueryKey) => qc.removeQueries({ queryKey: key }); useQuery({ queryKey: ['ek-board', 1], queryFn }); evictKeys.forEach(evict);\n"
          + "const rows: QueryKey[] = [['ek-rows', 1]]; useQueries({ queries: rows.map((queryKey) => ({ queryKey, queryFn })) });\n"
          + 'for (const queryKey of rows) void qc.invalidateQueries({ queryKey });\n' // 20: 조회도 하는 목록 — 맞음
          + "const reads: QueryKey[] = [['ek-articles']]; useQuery({ queryKey: ['ek-articles', id], queryFn });\n" // 21: 정확 읽기 목록의 ID 누락 → 고아
          + 'for (const queryKey of reads) qc.getQueryData(queryKey);\n'
          + "const ov = { queryKey: ['ek-old'] as const, queryFn, staleTime: 5 }; useQuery({ ...ov, queryKey: ['ek-new'] }); export const stale2 = ov.staleTime;\n"
          + 'qc.getQueryData(ov.queryKey);\n' // 24: 덮인 옵션의 다른 속성만 읽었다 → 고아
          + "useQuery({ queryKey: ['ek-home'], queryFn }); declare const scope: string[];\n"
          + "qc.getQueryData(['ek-home', ...scope, 'detial']);\n" // 26: 스프레드 뒤에 남는 원소 → 고아
          + "const ROOT = ['ek-scoped'] as const; const scoped = (...path: string[]) => [...ROOT, ...path] as const; useQuery({ queryKey: ROOT, queryFn });\n"
          + "qc.getQueryData(scoped('detial'));\n" // 28: 나머지 인자 → 고아
          + "function check(exact = false) { return cache.find({ queryKey: ['ek-key'], exact }); }\n"
          + "useQuery({ queryKey: ['ek-key', id], queryFn }); check(true);\n" // 30: 호출 자리가 exact 를 참으로 정했다 → 고아
          + "function pick(kind: string) { if (kind === 'list') return ['ek-single', 'list'] as const; return ['ek-single', 'detail'] as const; }\n"
          + "useQuery({ queryKey: pick('detail'), queryFn }); qc.getQueryData(['ek-single', 'list']);\n" // 32: 닿지 않는 return → 고아
          + "declare const typoFlag: boolean; const choose = (f: boolean) => (f ? ['ek-good'] as const : ['ek-goood'] as const); useQuery({ queryKey: ['ek-good'], queryFn });\n"
          + 'qc.getQueryData(choose(typoFlag));\n' // 34: 한 줄 화살표의 조건식 — 오타 갈래 → 고아
          + "useQuery({ queryKey: [prefix2 + 'y'], queryFn }); qc.invalidateQueries({ queryKey: ['ey'] }); // query-key-unchecked: 런타임에 조립한 접두\n"
          + "qc.getQueryData(['mistyped']);\n" // 36: 앞 줄 끝의 표지는 이 줄을 덮지 않는다 → 고아
          + '// query-key-unchecked: 두 조작을 한꺼번에 뺄 수 없다\n'
          + "qc.invalidateQueries({ queryKey: ['ez1'] }); qc.invalidateQueries({ queryKey: ['ez2'] });\n" // 38: 둘 다 고아 + 표지 문제
          + 'export const label = "// query-key-unchecked: 문자열 속 글자는 표지가 아니다";\n'
          + "qc.getQueryData(['in-string']);\n" // 40: 고아
          + "function sync(mode: string) { if (mode === 'off') return; void qc.invalidateQueries({ queryKey: ['ek-sync-typo'] }); }\n" // 41: 제자리에서 고아
          + "sync('on');\n" // 42: 키가 상수 — 닿는 호출 자리가 있으면 조작은 제자리(41)에 남는다
          + "function quiet(mode: string) { if (mode === 'off') return; void qc.invalidateQueries({ queryKey: ['ek-quiet-typo'] }); } quiet('off');\n", // 43: 닿지 않는다
      },
      {
        // 7회차 — 공통 선언의 슬롯 덧붙임, 목록 조작의 exact, 느슨한 비교·옵셔널 체인·콜백 전달·단락 평가·`??`·try/finally.
        path: 'qk-self/f.tsx',
        text: "import { useQuery, useQueries, type QueryKey, type QueryClient, type QueryCache } from '@tanstack/react-query';\n"
          + 'declare const qc: QueryClient; declare const cache: QueryCache; declare const queryFn: () => Promise<number>; declare const range: string; declare const id: number;\n'
          + "interface PanelBase { queryKey: readonly unknown[] } interface FSeries extends PanelBase { kind: 'series' } interface FBody extends PanelBase { kind: 'body' }\n"
          + 'type FPanel = FSeries | FBody; function defineF(items: FPanel[]): FPanel[] { return items; }\n'
          + "const FS_KEY = ['f-series'] as const; const FB_KEY = ['f-body'] as const;\n"
          + "export const fPanels = defineF([{ kind: 'series', queryKey: FS_KEY }, { kind: 'body', queryKey: FB_KEY }]);\n"
          + "useQueries({ queries: fPanels.map((panel) => (panel.kind === 'series' ? { queryKey: [...panel.queryKey, range], queryFn } : { queryKey: [...panel.queryKey], queryFn })) });\n"
          + 'qc.getQueryData([...FS_KEY, range]); qc.getQueryData([...FB_KEY]);\n' // 8: 갈래 조건에 맞는 덧붙임 — 맞음
          + 'qc.getQueryData([...FS_KEY]);\n' // 9: 공통 선언이어도 series 갈래만 덧붙인다 → 고아
          + 'qc.getQueryData([...FB_KEY, range]);\n' // 10: body 는 덧붙이지 않는다 → 고아
          + "interface Labeled { queryKey: readonly unknown[] } const LB_KEY = ['f-label'] as const; export const labeled: Labeled = { queryKey: LB_KEY };\n"
          + "declare const lbl: Labeled; const lkey = [...lbl.queryKey, 'list'] as const; useQuery({ queryKey: lkey, queryFn });\n"
          + "qc.getQueryData([...LB_KEY, 'list']);\n" // 13: 변수에 담은 키·리터럴 덧붙임 — 맞음
          + "qc.getQueryData([...LB_KEY, 'lsit']);\n" // 14: 고아
          + "const sKeys: QueryKey[] = [['f-surveys']]; useQuery({ queryKey: ['f-surveys', 1], queryFn });\n" // 15: 정확 무효화에 ID 누락 → 고아
          + 'for (const queryKey of sKeys) void qc.invalidateQueries({ queryKey, exact: true });\n'
          + "const fKeys: QueryKey[] = [['f-board']]; useQuery({ queryKey: ['f-board', 1], queryFn });\n"
          + 'for (const queryKey of fKeys) cache.find({ queryKey, exact: false });\n' // 18: 접두 찾기 — 맞음
          + "function refreshF(target?: number) { if (target != null) return; void qc.invalidateQueries({ queryKey: ['f-lsit'] }); }\n" // 19: 고아
          + "useQuery({ queryKey: ['f-list'], queryFn }); refreshF();\n" // 20: `!= null` 은 undefined 도 거른다 — 무효화가 실행된다
          + "const fRows = [{ id: 1, archived: true }]; const archiveKey = ['f-archive'] as const; const activeKey = ['f-active'] as const;\n"
          + 'function rowKey(row?: { archived: boolean }) { if (row?.archived) return archiveKey; return activeKey; }\n'
          + 'useQuery({ queryKey: rowKey(fRows.find((r) => r.id === id)), queryFn }); qc.getQueryData(activeKey);\n' // 23: 속성은 조건으로 풀지 않는다 — 맞음
          + "function refreshG(tab: string) { if (tab === 'help') return; void qc.invalidateQueries({ queryKey: ['f-board-lsit'] }); }\n" // 24: 고아
          + "declare function onSelected(callback: (tab: string) => void): void; useQuery({ queryKey: ['f-board-list'], queryFn }); refreshG('help'); onSelected(refreshG);\n"
          + "const gKeys: QueryKey[] = [['f-g-lsit']]; useQuery({ queryKey: ['f-g-list'], queryFn });\n" // 26: 고아
          + 'export const previous = gKeys.map((key) => qc.getQueryData(key));\n' // 27: 지역 변수 초기값 안의 읽기
          + "const hKeys: QueryKey[] = [['f-h-lsit']]; useQuery({ queryKey: ['f-h-list'], queryFn }); declare const fetchCount: () => Promise<number>;\n" // 28: 고아
          + "for (const key of hKeys) { void qc.invalidateQueries({ queryKey: key }); void qc.prefetchQuery({ queryKey: ['f-count'], queryFn: fetchCount }); }\n"
          + "const iKeys: QueryKey[] = [['f-i']]; useQuery({ queryKey: ['f-i', 1], queryFn }); useQuery({ queryKey: ['f-settings'], queryFn });\n"
          + "for (const key of iKeys) { qc.getQueryData(['f-settings']); void qc.invalidateQueries({ queryKey: key }); }\n" // 31: 다른 호출은 목록의 쓰임이 아니다 — 맞음
          + "const dKeys: QueryKey[] = [['f-draft', 1]]; qc.setQueryData(['f-draft', 1], 'v');\n"
          + 'for (const key of dKeys) qc.getQueryData(key);\n' // 33: 목록의 정확 읽기가 저장을 읽는다 — 맞음
          + "function save(n: number) { qc.setQueryData(['f-saved', n], 'v'); } save(1);\n"
          + "qc.getQueryData(['f-saved', 1]); qc.getQueryData(['f-saved', 2]);\n" // 35: 2 는 저장한 적 없다 → 고아
          + "const baseF = { queryKey: ['f-old'] as const, queryFn, staleTime: 5 }; useQuery({ ...baseF, queryKey: ['f-new'] }); export const { staleTime } = baseF;\n"
          + 'qc.getQueryData(baseF.queryKey);\n' // 37: 구조 분해로 다른 속성만 읽었다 → 고아
          + "function bump(tab: string) { return tab !== 'help' && qc.invalidateQueries({ queryKey: ['f-tickets', tab] }); }\n"
          + "useQuery({ queryKey: ['f-tickets', 'open'], queryFn }); bump('open'); bump('help');\n" // 39: 단락 평가로 건너뛴다 — 맞음
          + "function viewKey(view?: string) { if ((view ?? 'list') === 'list') return ['f-view', 'list'] as const; return ['f-view', 'detail'] as const; }\n"
          + "useQuery({ queryKey: viewKey(), queryFn }); qc.getQueryData(['f-view', 'detail']);\n" // 41: `??` 로 정해진 갈래 → 고아
          + "function jobs(tab: string) { try { if (tab === 'help') return; } finally { void 0; } void qc.invalidateQueries({ queryKey: ['f-jobs', tab] }); }\n"
          + "useQuery({ queryKey: ['f-jobs', 'open'], queryFn }); jobs('open'); jobs('help');\n", // 43: try 안에서 돌아간다 — 맞음
      },
      {
        // 8회차 — 모르면 느슨하게(정상 코드가 붉지 않게) 보고, 국소적인 미탐만 닫는다.
        path: 'qk-self/g.tsx',
        text: "import { useQuery, useQueries, type QueryKey, type QueryClient, type QueryCache } from '@tanstack/react-query';\n"
          + 'declare const qc: QueryClient; declare const cache: QueryCache; declare const queryFn: () => Promise<number>; declare const range: string;\n'
          + "const mKeys: QueryKey[] = [['g-stats', 1], ['g-surveys']]; useQuery({ queryKey: ['g-stats', 1], queryFn }); useQuery({ queryKey: ['g-surveys', 'list'], queryFn });\n"
          + "for (const queryKey of mKeys) { if (queryKey[0] === 'g-stats') void qc.invalidateQueries({ queryKey, exact: true }); else void qc.invalidateQueries({ queryKey }); }\n" // 4: 섞이면 접두 — 맞음
          + "function gListKey(page: number, view = 'all') { return view === 'all' ? ['g-list', page] as const : ['g-list', page, view] as const; }\n"
          + 'function gListOptions(page: number, view?: string) { return { queryKey: gListKey(page, view), queryFn }; }\n'
          + "useQuery(gListOptions(1)); qc.getQueryData(['g-list', 1]);\n" // 7: 생략한 인자를 넘겨도 기본값이 쓰인다 — 맞음
          + "interface GPanel { kind: 'series' | 'body'; queryKey: readonly unknown[] } function defineG(items: GPanel[]): GPanel[] { return items; }\n"
          + "const GS_KEY = ['g-series'] as const; const GB_KEY = ['g-body'] as const; export const gPanels = defineG([{ kind: 'series', queryKey: GS_KEY }, { kind: 'body', queryKey: GB_KEY }]);\n"
          + "useQueries({ queries: gPanels.map((panel) => { const seriesKey = [...panel.queryKey, range]; return panel.kind === 'series' ? { queryKey: seriesKey, queryFn } : { queryKey: panel.queryKey, queryFn }; }) });\n"
          + 'qc.getQueryData([...GS_KEY, range]); qc.getQueryData(GB_KEY);\n' // 11: 변수에 담은 키도 쓰는 갈래의 조건을 따른다 — 맞음
          + 'qc.getQueryData([...GB_KEY, range]);\n' // 12: body 에는 덧붙이지 않는다 → 고아
          + "const fa: QueryKey[] = [['g-board', 1]]; useQuery({ queryKey: ['g-board', 1, 'page'], queryFn });\n"
          + 'for (const queryKey of fa) for (const match of qc.getQueryCache().findAll({ queryKey })) qc.removeQueries({ queryKey: match.queryKey, exact: true });\n' // 14: 찾은 항목의 키 — 맞음
          + "function useDraft() { const save = (n: number, value: string) => qc.setQueryData(['g-draft', n], value); save(0, 'init'); qc.getQueryData(['g-draft', 0]); return { save }; }\n"
          + "const { save: saveDraft } = useDraft(); saveDraft(42, 'v'); qc.getQueryData(['g-draft', 42]);\n" // 16: 값으로 내보낸 저장 함수 — 맞음
          + "const bk: QueryKey[] = [['g-post-lsit']]; useQuery({ queryKey: ['g-post-list'], queryFn });\n" // 17: 고아
          + 'const invalidateG = (queryKey: QueryKey) => { const filters = { queryKey }; void qc.invalidateQueries(filters); }; bk.forEach(invalidateG);\n'
          + "const fk: QueryKey[] = [['g-survey-detial', 1]]; useQuery({ queryKey: ['g-survey-detail', 1], queryFn });\n" // 19: 고아
          + "export const cachedG = fk.find((key) => qc.getQueryState(key)?.status === 'success');\n"
          + "const ck: QueryKey[] = [['g-cached']]; useQuery({ queryKey: ['g-cached', 1], queryFn });\n" // 21: 고아
          + 'function cachedH(key: QueryKey, exact = true) { return cache.find({ queryKey: key, exact }); } for (const key of ck) cachedH(key);\n'
          + "const G_RESULT = { PENDING: 'pending', DONE: 'done' } as const;\n"
          + "function resultKey(code: string) { return code === G_RESULT.PENDING ? ['g-mail', 'pending'] as const : ['g-mail', 'completed'] as const; }\n"
          + "useQuery({ queryKey: resultKey(G_RESULT.PENDING), queryFn }); qc.getQueryData(['g-mail', 'completed']);\n", // 25: 고아
      },
    ]);
    expect(orphansOf(result, 'qk-self/a.tsx'), orphansOf(result, 'qk-self/a.tsx').join(' | ')).toEqual([
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
    expect(orphansOf(result, 'qk-self/b.tsx'), orphansOf(result, 'qk-self/b.tsx').join(' | ')).toEqual([
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
    expect(orphansOf(result, 'qk-self/d.tsx'), orphansOf(result, 'qk-self/d.tsx').join(' | ')).toEqual([
      '36:["cases","opne"]',
      '38:["no-reason"]',
      '42:["wr","lsit"]',
    ]);
    expect(orphansOf(result, 'qk-self/e.tsx'), orphansOf(result, 'qk-self/e.tsx').join(' | ')).toEqual([
      '10:["e-body","detail","{id}"]',
      '12:["bl","list","draft"]',
      '13:["bl","list","draft"]',
      '15:["ek-survyes","{n}"]',
      '17:["ek-board-lsit"]',
      '21:["ek-articles"]',
      '24:["ek-old"]',
      '26:["ek-home","...scope","detial"]',
      '28:["ek-scoped","detial"]',
      '30:["ek-key"]',
      '32:["ek-single","list"]',
      '34:["ek-goood"]',
      '36:["mistyped"]',
      '38:["ez1"]',
      '38:["ez2"]',
      '40:["in-string"]',
      '41:["ek-sync-typo"]',
    ]);
    expect(orphansOf(result, 'qk-self/f.tsx'), orphansOf(result, 'qk-self/f.tsx').join(' | ')).toEqual([
      '9:["f-series"]',
      '10:["f-body","{range}"]',
      '14:["f-label","lsit"]',
      '15:["f-surveys"]',
      '19:["f-lsit"]',
      '24:["f-board-lsit"]',
      '26:["f-g-lsit"]',
      '28:["f-h-lsit"]',
      '35:["f-saved","#2"]',
      '37:["f-old"]',
      '41:["f-view","detail"]',
    ]);
    expect(orphansOf(result, 'qk-self/g.tsx'), orphansOf(result, 'qk-self/g.tsx').join(' | ')).toEqual([
      '12:["g-body","{range}"]',
      '17:["g-post-lsit"]',
      '19:["g-survey-detial","#1"]',
      '21:["g-cached"]',
      '25:["g-mail","completed"]',
    ]);
    expect(markerProblems(result)).toEqual([
      'qk-self/d.tsx:37 사유가 없다',
      'qk-self/d.tsx:39 덮는 줄(40)에 맞는 조회가 없는 조작이 없다(낡은 표지)',
      'qk-self/e.tsx:37 덮는 줄(38)에 조작이 여럿이다 — 표지는 조작 하나만 뺀다',
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
    expect([...sharedLiteralNamespaces(result.uses)]).toEqual([
      ['auth', ['qk-self/p.tsx', 'qk-self/q.tsx']],
      ['jobs', ['qk-self/r.tsx', 'qk-self/s.tsx']],
      ['notes', ['qk-self/t.tsx', 'qk-self/u.tsx']],
    ]);
  }, 180_000);
});
