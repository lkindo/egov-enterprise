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
 * ① 캐시 조작(invalidateQueries·setQueryData …)의 키는 어떤 조회 키와 자리마다 맞아야 한다. 리터럴(문자열·숫자·불리언·null,
 *    리터럴 상수)끼리는 모든 자리가 같아야 하고, 한쪽이 동적 값인 자리는 맞을 수 있다고 본다. 첫 원소는 리터럴끼리 같아야 한다.
 *    setQueryData·getQueryData·getQueryState·QueryCache.find·`exact: true` 는 길이까지 같아야 한다.
 * ② 같은 이름공간(키 맨 앞 문자열)을 실제로 적은 파일은 하나뿐이다. 여러 파일이 각자 적으면 `src/queries/<도메인>-keys.ts` 의 계층형
 *    팩토리로 옮기고 펼쳐 쓴다.
 *
 * 판정은 TypeScript 프로그램의 심볼 해석으로 한다 — 식별자는 실제 선언(스코프·import 경로)을 따라가고, 팩토리 호출은 인자를 매개변수에
 * 대입해 풀며, 풀 수 없는 스프레드는 튜플 타입이면 그 고정 길이만큼 동적 원소로 본다. `queryOptions` 는 조회 훅·prefetch 가 실제로
 * 쓸 때만 조회로 센다(선언만 하고 무효화에만 쓰면 캐시를 만들지 않는다).
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 캐시를 읽거나 지우는 조작(필터의 queryKey) — 그 키에 맞는 조회가 있어야 한다. 값은 기본 정확 일치 여부다. */
const CACHE_OPS = new Map<string, boolean>([
  ['invalidateQueries', false], ['refetchQueries', false], ['removeQueries', false], ['cancelQueries', false],
  ['resetQueries', false], ['setQueriesData', false], ['getQueriesData', false], ['isFetching', false], ['useIsFetching', false],
  ['findAll', false], ['find', true],
]);
/** 첫 인자가 곧 키이고 정확히 그 항목을 가리키는 조작. */
const KEY_ARGUMENT_OPS = new Set(['setQueryData', 'getQueryData', 'getQueryState']);
/** 캐시 항목을 만드는 호출 — 첫 인자가 조회 옵션이다. */
const QUERY_PRODUCERS = new Set([
  'useQuery', 'useSuspenseQuery', 'useInfiniteQuery', 'useSuspenseInfiniteQuery', 'prefetchQuery', 'fetchQuery', 'ensureQueryData',
  'prefetchInfiniteQuery', 'fetchInfiniteQuery', 'ensureInfiniteQueryData',
]);
/** 옵션을 그대로 돌려주는 도우미 — 이것만으로는 캐시를 만들지 않는다. */
const OPTION_WRAPPERS = new Set(['queryOptions', 'infiniteQueryOptions']);

type Element = { literal: string; origin: string } | { expression: string } | { spread: string };
interface KeyUse {
  file: string;
  line: number;
  /** query: 조회 훅이 실제로 쓰는 키, declared: 화면이 쓰지 않는 queryOptions 선언의 키(약한 후보), op: 캐시 조작. */
  role: 'query' | 'declared' | 'op';
  /** 길이까지 같아야 하는 조작. */
  exact: boolean;
  /** 심볼을 따라 푼 원소. 풀 수 없으면 null. */
  expanded: Element[] | null;
  /** 이 키를 적은 `queryKey` 속성(옵션 객체의 것일 때). */
  property: ts.Node | null;
  /** 풀면서 거친 옵션 객체의 `queryKey` 속성 — 조작이 자기 옵션의 키와 맞는 것을 일치로 치지 않는다. */
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

const VIRTUAL_ROOT = '/qk/';

/** 가상 파일 체계 위의 프로그램 — 원본 파일만 싣고 lib 는 실제 TypeScript 배포본에서 읽는다(외부 모듈은 풀리지 않아도 된다). */
function createKeyProgram(files: readonly SourceFileEntry[]): { program: ts.Program; fileOf: (source: ts.SourceFile) => string } {
  const sources = new Map(files.map(({ path, text }) => [`${VIRTUAL_ROOT}src/${path}`, text]));
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve, baseUrl: VIRTUAL_ROOT, paths: { '@/*': ['src/*'] }, noEmit: true, skipLibCheck: true, types: [],
    lib: ['lib.es2022.d.ts'], strict: true,
  };
  const libDirectory = dirname(ts.getDefaultLibFilePath(options)).replaceAll('\\', '/');
  const isLib = (name: string) => name.replaceAll('\\', '/').startsWith(libDirectory);
  const read = (name: string): string | undefined => sources.get(name) ?? (isLib(name) ? ts.sys.readFile(name) : undefined);
  const host: ts.CompilerHost = {
    getSourceFile: (name, version) => {
      const text = read(name);
      if (text === undefined) return undefined;
      const kind = name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
      return ts.createSourceFile(name, text, version, true, kind);
    },
    getDefaultLibFileName: () => `${libDirectory}/lib.es2022.d.ts`,
    writeFile: () => undefined,
    getCurrentDirectory: () => VIRTUAL_ROOT,
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (name) => read(name) !== undefined,
    readFile: read,
    directoryExists: () => true,
    getDirectories: () => [],
  };
  const program = ts.createProgram([...sources.keys()], options, host);
  return { program, fileOf: (source) => source.fileName.slice(`${VIRTUAL_ROOT}src/`.length) };
}

/** 매개변수 → 호출 자리의 인자(와 그 인자를 풀 환경). */
type Environment = ReadonlyMap<ts.ParameterDeclaration, { argument: ts.Expression; environment: Environment }>;
const EMPTY: Environment = new Map();
type FunctionNode = ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration | ts.MethodDeclaration;
const MAX_DEPTH = 40;

class KeyResolver {
  private readonly checker: ts.TypeChecker;
  /** 지금 푸는 키가 거친 옵션 객체의 queryKey 속성. */
  trace = new Set<ts.Node>();

  constructor(program: ts.Program, private readonly fileOf: (source: ts.SourceFile) => string) {
    this.checker = program.getTypeChecker();
  }

  /** `opts.queryKey` — opts 가 queryOptions 호출(또는 그것을 돌려주는 팩토리 호출)이나 옵션 객체이면 그 queryKey 속성. */
  private optionsKeyProperty(node: ts.PropertyAccessExpression, environment: Environment, depth: number):
    { property: ts.PropertyAssignment; environment: Environment } | undefined {
    if (node.name.text !== 'queryKey' || depth > MAX_DEPTH) return undefined;
    let value: { node: ts.Expression; environment: Environment } | undefined = { node: node.expression, environment };
    for (let step = 0; value && step < MAX_DEPTH; step += 1) {
      const target = unwrap(value.node);
      if (ts.isObjectLiteralExpression(target)) {
        const property = target.properties.find((candidate): candidate is ts.PropertyAssignment => ts.isPropertyAssignment(candidate)
          && candidate.name.getText() === 'queryKey');
        return property ? { property, environment: value.environment } : undefined;
      }
      if (ts.isCallExpression(target) && OPTION_WRAPPERS.has(calleeName(target)) && target.arguments[0]) {
        value = { node: target.arguments[0], environment: value.environment };
      } else if (ts.isCallExpression(target)) value = this.returned(target, value.environment);
      else if (ts.isIdentifier(target) || ts.isPropertyAccessExpression(target)) value = this.valueOf(target, value.environment);
      else value = undefined;
    }
    return undefined;
  }

  /** 식별자·속성 접근이 가리키는 선언. import 별칭은 원래 선언으로 넘긴다. */
  declarationOf(node: ts.Expression): ts.Declaration | undefined {
    const target = unwrap(node);
    const location = ts.isPropertyAccessExpression(target) ? target.name : target;
    let symbol = this.checker.getSymbolAtLocation(location);
    if (symbol && (symbol.flags & ts.SymbolFlags.Alias) !== 0) symbol = this.checker.getAliasedSymbol(symbol);
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
      const bound = environment.get(declaration);
      if (bound) return { node: bound.argument, environment: bound.environment };
      return declaration.initializer ? { node: declaration.initializer, environment } : undefined;
    }
    if (ts.isVariableDeclaration(declaration) && declaration.initializer
      && ts.isVariableDeclarationList(declaration.parent) && (declaration.parent.flags & ts.NodeFlags.Const) !== 0) {
      return { node: declaration.initializer, environment: EMPTY };
    }
    if (ts.isPropertyAssignment(declaration)) return { node: declaration.initializer, environment: EMPTY };
    return undefined;
  }

  /** 호출된 함수(팩토리)의 선언. */
  functionOf(callee: ts.Expression, environment: Environment): { fn: FunctionNode; environment: Environment } | undefined {
    const declaration = this.declarationOf(callee);
    if (declaration && (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration))) return { fn: declaration, environment: EMPTY };
    const value = this.valueOf(callee, environment);
    const fn = value && unwrap(value.node);
    return fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) ? { fn, environment: value.environment } : undefined;
  }

  /** 함수가 돌려주는 식(식 본문 또는 첫 return)과, 인자를 매개변수에 대입한 환경. */
  returned(call: ts.CallExpression, environment: Environment): { node: ts.Expression; environment: Environment } | undefined {
    const found = this.functionOf(call.expression, environment);
    if (!found?.fn.body) return undefined;
    const body = found.fn.body;
    const node = ts.isBlock(body) ? body.statements.find(ts.isReturnStatement)?.expression : body;
    if (!node) return undefined;
    const bound = new Map(found.environment);
    found.fn.parameters.forEach((parameter, index) => {
      const argument = call.arguments[index];
      if (argument && !parameter.dotDotDotToken) bound.set(parameter, { argument, environment });
    });
    return { node, environment: bound };
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
    if (ts.isPropertyAccessExpression(target)) {
      const found = this.optionsKeyProperty(target, environment, depth);
      if (found) {
        this.trace.add(found.property);
        return this.expand(found.property.initializer, found.environment, depth + 1);
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
    const literal = this.literal(node, environment, depth);
    return [literal ?? { expression: node.getText() }];
  }

  /** 소스에서 값이 정해진 원소(문자열·숫자·불리언·null, 그런 값의 상수·인자). origin 은 그 리터럴을 적은 파일이다. */
  private literal(node: ts.Expression, environment: Environment, depth: number): Element | null {
    const target = unwrap(node);
    const origin = (): string => this.fileOf(target.getSourceFile());
    if (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target)) return { literal: target.text, origin: origin() };
    if (ts.isNumericLiteral(target)) return { literal: `#${target.text}`, origin: origin() };
    if (target.kind === ts.SyntaxKind.TrueKeyword || target.kind === ts.SyntaxKind.FalseKeyword || target.kind === ts.SyntaxKind.NullKeyword) {
      return { literal: `!${target.getText()}`, origin: origin() };
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
    const type = this.checker.getTypeAtLocation(node);
    if ((type.flags & ts.TypeFlags.Object) === 0) return undefined;
    const object = type as ts.ObjectType;
    if ((object.objectFlags & ts.ObjectFlags.Reference) === 0) return undefined;
    const tuple = (type as ts.TypeReference).target as ts.TupleType;
    if ((tuple.objectFlags & ts.ObjectFlags.Tuple) === 0 || tuple.hasRestElement || tuple.minLength !== tuple.fixedLength) return undefined;
    return tuple.fixedLength;
  }

  /** 조회 훅·prefetch 의 첫 인자에서 닿는 옵션 객체·queryOptions 호출 — 그 안의 queryKey 가 실제 조회다. */
  collectConsumed(node: ts.Expression, environment: Environment, into: Set<ts.Node>, depth = 0): void {
    if (depth > MAX_DEPTH) return;
    const target = unwrap(node);
    if (ts.isObjectLiteralExpression(target)) {
      into.add(target);
      for (const property of target.properties) {
        if (ts.isSpreadAssignment(property)) this.collectConsumed(property.expression, environment, into, depth + 1);
        if (ts.isPropertyAssignment(property) && property.name.getText() === 'queries') {
          this.collectConsumed(property.initializer, environment, into, depth + 1);
        }
      }
      return;
    }
    if (ts.isArrayLiteralExpression(target)) {
      for (const element of target.elements) this.collectConsumed(ts.isSpreadElement(element) ? element.expression : element, environment, into, depth + 1);
      return;
    }
    if (ts.isConditionalExpression(target)) {
      this.collectConsumed(target.whenTrue, environment, into, depth + 1);
      this.collectConsumed(target.whenFalse, environment, into, depth + 1);
      return;
    }
    if (ts.isCallExpression(target)) {
      const name = calleeName(target);
      if (OPTION_WRAPPERS.has(name)) {
        into.add(target);
        if (target.arguments[0]) this.collectConsumed(target.arguments[0], environment, into, depth + 1);
        return;
      }
      if (name === 'map' && target.arguments[0]) {
        const callback = unwrap(target.arguments[0]);
        if ((ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) && callback.body) {
          const body = ts.isBlock(callback.body) ? callback.body.statements.find(ts.isReturnStatement)?.expression : callback.body;
          if (body) this.collectConsumed(body, environment, into, depth + 1);
        }
        return;
      }
      const result = this.returned(target, environment);
      if (result) this.collectConsumed(result.node, result.environment, into, depth + 1);
      return;
    }
    if (ts.isIdentifier(target) || ts.isPropertyAccessExpression(target)) {
      const value = this.valueOf(target, environment);
      if (value) this.collectConsumed(value.node, value.environment, into, depth + 1);
    }
  }
}

function calleeName(call: ts.CallExpression): string {
  const callee = call.expression;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  if (ts.isIdentifier(callee)) return callee.text;
  return '';
}

/** `QueryKey[]`·`readonly QueryKey[]`·`Array<QueryKey>` — 키 하나(`QueryKey`)가 아니라 키 목록. */
const KEY_LIST_TYPE = /(?:\bQueryKey\s*\[\s*\]|\bArray<\s*QueryKey\s*>|\bReadonlyArray<\s*QueryKey\s*>)/;

function exactOf(object: ts.ObjectLiteralExpression, defaultExact: boolean): boolean {
  for (const property of object.properties) {
    if (ts.isPropertyAssignment(property) && property.name.getText() === 'exact') {
      if (property.initializer.kind === ts.SyntaxKind.TrueKeyword) return true;
      if (property.initializer.kind === ts.SyntaxKind.FalseKeyword) return false;
    }
  }
  return defaultExact;
}

export function collectKeyUses(files: readonly SourceFileEntry[]): KeyUse[] {
  const { program, fileOf } = createKeyProgram(files);
  const resolver = new KeyResolver(program, fileOf);
  const sources = program.getSourceFiles().filter((source) => source.fileName.startsWith(`${VIRTUAL_ROOT}src/`));

  // 1) 조회 훅·prefetch 가 실제로 쓰는 옵션 객체·queryOptions 호출.
  const consumed = new Set<ts.Node>();
  for (const source of sources) {
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && node.arguments[0]) {
        const name = calleeName(node);
        if (QUERY_PRODUCERS.has(name) || name === 'useQueries' || name === 'useSuspenseQueries') {
          resolver.collectConsumed(node.arguments[0], EMPTY, consumed);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  const uses: KeyUse[] = [];
  const seen = new Set<ts.Node>();
  for (const source of sources) {
    const file = fileOf(source);
    const record = (anchor: ts.Node, role: KeyUse['role'], exact: boolean, key: ts.Expression, property: ts.Node | null = null): void => {
      if (seen.has(key)) return;
      seen.add(key);
      resolver.trace = new Set();
      const expanded = resolver.expand(key, EMPTY);
      uses.push({
        file,
        line: source.getLineAndCharacterOfPosition(anchor.getStart(source)).line + 1,
        role,
        exact,
        expanded,
        property,
        through: resolver.trace,
      });
    };

    /** 이 옵션 객체가 넘겨지는 조작(직접 인자, queryOptions 를 거친 것, const 변수에 담아 넘긴 것). */
    const operationOf = (object: ts.ObjectLiteralExpression): { exact: boolean } | null => {
      let holder: ts.Node = outermost(object);
      const wrapper = holder.parent;
      if (wrapper && ts.isCallExpression(wrapper) && OPTION_WRAPPERS.has(calleeName(wrapper))) holder = outermost(wrapper);
      const asOperation = (call: ts.Node | undefined): { exact: boolean } | null => {
        if (!call || !ts.isCallExpression(call)) return null;
        const defaultExact = CACHE_OPS.get(calleeName(call));
        return defaultExact === undefined ? null : { exact: exactOf(object, defaultExact) };
      };
      const direct = asOperation(holder.parent);
      if (direct) return direct;
      const declaration = holder.parent;
      if (declaration && ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
        const checker = program.getTypeChecker();
        const symbol = checker.getSymbolAtLocation(declaration.name);
        let found: { exact: boolean } | null = null;
        const visit = (node: ts.Node): void => {
          if (found) return;
          if (ts.isIdentifier(node) && node !== declaration.name && checker.getSymbolAtLocation(node) === symbol) {
            const argument = outermost(node);
            if (argument.parent && ts.isCallExpression(argument.parent) && argument.parent.arguments.some((value) => value === argument)) {
              found = asOperation(argument.parent);
            }
          }
          ts.forEachChild(node, visit);
        };
        visit(source);
        return found;
      }
      return null;
    };

    const visit = (node: ts.Node): void => {
      if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && node.name.getText(source) === 'queryKey'
        && ts.isObjectLiteralExpression(node.parent)) {
        const object = node.parent;
        const key = ts.isPropertyAssignment(node) ? node.initializer : node.name;
        const wrapper = outermost(object).parent;
        const isQuery = consumed.has(object) || (wrapper !== undefined && consumed.has(wrapper));
        if (isQuery) record(node, 'query', false, key, node);
        else {
          const operation = operationOf(object);
          if (operation) record(node, 'op', operation.exact, key, node);
          else if (wrapper && ts.isCallExpression(wrapper) && OPTION_WRAPPERS.has(calleeName(wrapper))) record(node, 'declared', false, key, node);
        }
      }
      if (ts.isCallExpression(node) && KEY_ARGUMENT_OPS.has(calleeName(node))) {
        const [first] = node.arguments;
        if (first && !ts.isObjectLiteralExpression(unwrap(first))) record(node, 'op', true, first);
      }
      // 키 목록 — QueryKey[] 로 선언한 배열(합쳐 넣은 스프레드 포함), 이름이 …Keys 인 함수의 반환, QueryKey[] 변수에 push 한 원소.
      const list = keyListOf(node, source);
      if (list) for (const element of listElements(list, resolver)) record(element, 'op', false, element);
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'push') {
        const declaration = resolver.declarationOf(node.expression.expression);
        if (declaration && ts.isVariableDeclaration(declaration) && isKeyListDeclaration(declaration, source)) {
          for (const argument of node.arguments) record(argument, 'op', false, argument);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return uses;
}

function isKeyListDeclaration(declaration: ts.VariableDeclaration, source: ts.SourceFile): boolean {
  if (declaration.type && KEY_LIST_TYPE.test(declaration.type.getText(source))) return true;
  const initializer = declaration.initializer;
  return initializer !== undefined && ts.isSatisfiesExpression(initializer) && KEY_LIST_TYPE.test(initializer.type.getText(source));
}

function keyListOf(node: ts.Node, source: ts.SourceFile): ts.ArrayLiteralExpression | undefined {
  if (ts.isVariableDeclaration(node) && node.initializer && isKeyListDeclaration(node, source)) {
    const value = unwrap(node.initializer);
    return ts.isArrayLiteralExpression(value) ? value : undefined;
  }
  const named = ts.isFunctionDeclaration(node) && node.name ? node.name.text
    : ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
      && (ts.isArrowFunction(unwrap(node.initializer)) || ts.isFunctionExpression(unwrap(node.initializer))) ? node.name.text : undefined;
  if (!named || !/Keys$/.test(named)) return undefined;
  const fn = ts.isFunctionDeclaration(node) ? node : unwrap((node as ts.VariableDeclaration).initializer as ts.Expression) as ts.ArrowFunction;
  const body = fn.body;
  const returned = body && (ts.isBlock(body) ? body.statements.find(ts.isReturnStatement)?.expression : body);
  const value = returned && unwrap(returned);
  return value && ts.isArrayLiteralExpression(value) && value.elements.some((element) => ts.isArrayLiteralExpression(unwrap(element as ts.Expression)))
    ? value : undefined;
}

/** 목록의 원소 — 스프레드는 const 목록으로 풀어 그 원소를 넣는다. */
function listElements(list: ts.ArrayLiteralExpression, resolver: KeyResolver, depth = 0): ts.Expression[] {
  return list.elements.flatMap((element) => {
    if (!ts.isSpreadElement(element)) return [element];
    const value = depth < MAX_DEPTH ? resolver.valueOf(element.expression, EMPTY) : undefined;
    const inner = value && unwrap(value.node);
    return inner && ts.isArrayLiteralExpression(inner) ? listElements(inner, resolver, depth + 1) : [];
  });
}

const headOf = (elements: readonly Element[] | null): { literal: string; origin: string } | null => {
  const first = elements?.[0];
  return first && 'literal' in first ? first : null;
};

/**
 * 조작 키가 조회 키와 맞는가. 첫 원소는 리터럴끼리 같아야 하고(머리가 풀리지 않은 조회 키가 모든 조작을 덮지 않게), 그 뒤로는
 * 리터럴끼리 같아야 하며 한쪽이 동적 값이면 맞을 수 있다고 본다. 길이를 모르는 스프레드를 만나면 뒤 자리를 알 수 없어 거기서 맞는다고
 * 본다. 정확 조작은 길이까지 같아야 한다.
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
  return !exact || op.length === query.length;
}

export function checkedOperations(uses: readonly KeyUse[]): KeyUse[] {
  return uses.filter((use) => use.role === 'op' && headOf(use.expanded) !== null);
}

/**
 * ① 맞는 조회 키가 없는 조작. 첫 원소가 리터럴로 풀린 조작만 본다. 화면이 쓰지 않는 queryOptions 선언(declared)도 후보지만, 조작이
 * 그 옵션 자신의 키(`invalidateQueries(opts)`, `getQueryData(opts.queryKey)`)이면 자기와 맞춘 것이라 일치로 치지 않는다.
 */
export function orphanOperations(uses: readonly KeyUse[]): KeyUse[] {
  const candidates = uses.filter((use) => (use.role === 'query' || use.role === 'declared') && use.expanded !== null);
  return checkedOperations(uses).filter((op) => !candidates.some((candidate) => {
    if (candidate.role === 'declared' && candidate.property !== null
      && (candidate.property === op.property || op.through.has(candidate.property))) return false;
    return op.expanded !== null && candidate.expanded !== null && keyMatches(op.expanded, candidate.expanded, op.exact);
  }));
}

/** ② 이름공간 → 그 첫 리터럴을 실제로 적은 파일들(둘 이상만). */
export function sharedLiteralNamespaces(uses: readonly KeyUse[]): Map<string, string[]> {
  const files = new Map<string, Set<string>>();
  for (const use of uses) {
    const head = headOf(use.expanded);
    if (!head || head.literal.startsWith('#') || head.literal.startsWith('!')) continue;
    if (!files.has(head.literal)) files.set(head.literal, new Set());
    files.get(head.literal)?.add(head.origin);
  }
  return new Map([...files].filter(([, set]) => set.size > 1).map(([head, set]) => [head, [...set].sort()]));
}

const production = (): KeyUse[] => collectKeyUses(productionFiles(SRC).map((path) => ({
  path: relative(SRC, path).split(sep).join('/'),
  text: readFileSync(path, 'utf8'),
})));

const describeKey = (use: KeyUse): string => JSON.stringify((use.expanded ?? []).map((element) => (
  'literal' in element ? element.literal : 'spread' in element ? `...${element.spread}` : `{${element.expression}}`)));

describe('쿼리 키 일관성', () => {
  let cached: KeyUse[] | undefined;
  const uses = (): KeyUse[] => (cached ??= production());

  it('생산 소스에서 실제로 비교한다 — 첫 원소가 풀린 조회·조작이 있어야 한다(없으면 아래 계약은 공허하다)', () => {
    expect(uses().filter((use) => use.role === 'query' && headOf(use.expanded) !== null).length).toBeGreaterThan(0);
    expect(checkedOperations(uses()).length).toBeGreaterThan(0);
  }, 120_000);

  it('① 캐시 조작의 키는 어떤 조회 키와 자리마다 맞는다', () => {
    const orphans = orphanOperations(uses()).map((use) => `${use.file}:${use.line}${use.exact ? ' (정확)' : ''} ${describeKey(use)}`);
    expect(orphans, `맞는 조회 키가 없는 무효화·캐시 조작(조용히 아무것도 갱신하지 않는다) — 조회와 같은 팩토리를 쓴다:\n${orphans.join('\n')}`).toEqual([]);
  }, 120_000);

  it('② 같은 쿼리 키 이름공간을 실제로 적은 파일은 하나뿐이다(여러 파일이면 src/queries/<도메인>-keys.ts 팩토리)', () => {
    const shared = [...sharedLiteralNamespaces(uses())].map(([head, files]) => `'${head}': ${files.join(', ')}`);
    expect(shared, `여러 파일이 각자 적은 쿼리 키 이름공간:\n${shared.join('\n')}`).toEqual([]);
  }, 120_000);

  it('판정 자체 ① — 자리·정확 조작·튜플 길이·옵션 변수·스코프·import 경로·인자 대입·숫자·find·queryOptions 를 가른다', () => {
    const result = collectKeyUses([
      {
        path: 'keys.ts',
        text: "type Scope = readonly [string | null, string];\n"
          + "export const orgKeys = { users: { all: ['users'] as const }, scope: (id: string) => ['auth', id] as const };\n"
          + "export const menu = { headAll: () => ['menus', 'head'] as const, head: (scope: Scope) => [...menu.headAll(), ...scope] as const };\n"
          + "export const byKind = (kind: string) => ['kinds', kind] as const;\n"
          + "export const memoKeys = { detail: (n: number) => ['memo', 'detail', n] as const };\n",
      },
      { path: 'one.ts', text: "export const keys = { all: ['alpha'] as const };\n" },
      { path: 'two.ts', text: "export const keys = { all: ['beta'] as const };\n" },
      {
        path: 'a.tsx',
        text: "import { orgKeys, menu, byKind, memoKeys } from './keys';\nimport { keys } from './one';\n"
          + "declare const uid: string; declare const code: string; declare const id: number; declare const s: readonly [string | null, string];\n"
          + "useQuery({ queryKey: [...orgKeys.scope(uid), 'group', code], queryFn });\n"
          + "const scope = orgKeys.scope(uid);\nqc.setQueryData([...scope, 'gruop', code], next);\n" // 5·6: 별칭 상수 뒤 오타 → 고아(6)
          + "useQuery({ queryKey: [...orgKeys.users.all, 1], queryFn });\nqc.invalidateQueries({ queryKey: ['users'] });\n" // 7·8: 맞음
          + "qc.getQueryData(['users', 2]);\n" // 9: 숫자가 다르다 → 고아
          + "useQuery({ queryKey: menu.head(s), queryFn });\nqc.getQueryState(menu.headAll());\n" // 10·11: 정확 조작 길이 2 ≠ 4 → 고아(11)
          + "const filters = { queryKey: ['community-boardz'] } as const;\nqc.invalidateQueries(filters);\n" // 12: as const 옵션 변수 → 고아
          + "function load() { const key = ['jobz']; return useQuery({ queryKey: key, queryFn }); }\n"
          + "function save() { const key = ['jbos']; return qc.invalidateQueries({ queryKey: key }); }\n" // 15: 스코프마다 다른 key → 고아
          + "useQuery({ queryKey: byKind('open'), queryFn });\nqc.invalidateQueries({ queryKey: byKind('opne') });\n" // 17: 인자 대입 → 고아
          + "useQuery({ queryKey: ['found', id], queryFn });\ncache.find({ queryKey: ['found'] });\ncache.findAll({ queryKey: ['found'] });\n" // 19: find 는 정확 → 고아
          + "const opts = queryOptions({ queryKey: ['jobs', 'detial'], queryFn });\nqc.invalidateQueries(opts);\n" // 21: 조회 훅이 쓰지 않는 queryOptions → 조작 → 고아
          + "useQuery({ queryKey: ['jobs', 'detail', id], queryFn });\n"
          + "qc.invalidateQueries({ queryKey: keys.all });\n" // 24: import 한 one.ts 의 'alpha' — 조회가 없다 → 고아
          + "const single: QueryKey = ['search', ['active', 'pending']];\nuseQuery({ queryKey: single, queryFn });\n" // 키 하나는 목록이 아니다
          + "const extra: QueryKey[] = [['jbos3']];\nconst stale = [...extra, ['jbos2']] satisfies QueryKey[];\n" // 27·28: 목록 원소 → 고아
          + "function keep(keys2: string[]) { return useQuery({ queryKey: [...keys2, 'x'], queryFn }); }\n" // 머리 미해석 조회는 덮지 않는다
          // 30·31: 화면이 쓰지 않는 queryOptions 선언은 같은 팩토리를 쓰는 다른 조작의 후보다(죽었지만 일관된 키) — 맞음.
          + "const memoOptions = (n: number) => queryOptions({ queryKey: memoKeys.detail(n), queryFn });\n"
          + 'qc.invalidateQueries({ queryKey: memoKeys.detail(3) });\n'
          // 32·33: 자기 옵션의 키로만 읽는 조작 — 자기와 맞춘 것이라 일치가 아니다 → 고아(33).
          + "const lonely = queryOptions({ queryKey: ['lonely', 'detial'], queryFn });\nqc.getQueryData(lonely.queryKey);\n",
      },
    ]);
    expect(orphanOperations(result).map((use) => `${use.line}:${describeKey(use)}`)).toEqual([
      '6:["auth","{id}","gruop","{code}"]',
      '9:["users","#2"]',
      '11:["menus","head"]',
      '12:["community-boardz"]',
      '15:["jbos"]',
      '17:["kinds","opne"]',
      '19:["found"]',
      '21:["jobs","detial"]',
      '24:["alpha"]',
      '27:["jbos3"]',
      '28:["jbos2"]',
      '33:["lonely","detial"]',
    ]);
  }, 120_000);

  it('판정 자체 ② — 첫 리터럴을 적은 파일로 센다(루트 상수·지역 팩토리·메서드 팩토리·문자열 상수 복제는 공유, 펼친 import 는 아니다)', () => {
    const result = collectKeyUses([
      // 각 파일은 모듈이다(export) — 실제 코드처럼 최상위 const 가 파일마다 따로 있다.
      { path: 'p.tsx', text: "export {};\nconst scope = ['auth', 1] as const;\nuseQuery({ queryKey: [...scope, 'groups'], queryFn });\n" },
      { path: 'q.tsx', text: "export {};\nconst scope = ['auth', 2];\nuseQuery({ queryKey: [...scope, 'catalog'], queryFn });\n" },
      { path: 'r.tsx', text: "export {};\nconst make = (id: number) => ['jobs', id] as const;\nuseQuery({ queryKey: make(1), queryFn });\n" },
      {
        path: 's.tsx',
        text: "export {};\nconst keys = { detail(id: number) { return ['jobs', id] as const; } };\nqc.invalidateQueries({ queryKey: keys.detail(2) });\n",
      },
      { path: 't.tsx', text: "export {};\nconst NS = 'notes';\nuseQuery({ queryKey: [NS, 1], queryFn });\n" },
      { path: 'u.tsx', text: "export {};\nconst NS = 'notes';\nqc.invalidateQueries({ queryKey: [NS] });\n" },
      { path: 'v.ts', text: "export const boxKeys = { all: ['boxes'] as const };\nexport const unused = { all: ['auth'] as const };\n" },
      { path: 'w.tsx', text: "import { boxKeys } from './v';\nuseQuery({ queryKey: [...boxKeys.all, 1], queryFn });\nqc.invalidateQueries({ queryKey: boxKeys.all });\n" },
    ]);
    expect([...sharedLiteralNamespaces(result)]).toEqual([
      ['auth', ['p.tsx', 'q.tsx']],
      ['jobs', ['r.tsx', 's.tsx']],
      ['notes', ['t.tsx', 'u.tsx']],
    ]);
  }, 120_000);
});
