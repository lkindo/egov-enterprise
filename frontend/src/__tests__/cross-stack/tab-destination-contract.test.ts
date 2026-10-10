import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';
import { SCREEN_ALIASES } from '@/types/generated-screen-registry';
import { REPO_ROOT, pageInProjection, projectionRemovedFiles } from '@/test-utils/projection';

/**
 * 탭 목적지 계약 (Phase 2 — 슬롯 도입 전 census 범위 확장).
 *
 * 메뉴(tb_menu_info)·화면 별칭·화면 코드·백엔드 문자열(서버 알림 링크 등)이 `?tab=값` 으로 허브를 연다. 허브는 모르는
 * 탭이면 오류 없이 기본 탭을 연다 — 그래서 허브가 탭 이름을 바꾸거나 걷으면 그 링크는 조용히 엉뚱한 탭에 떨어진다. 허브를
 * 슬롯으로 나눌 때 바로 이 일이 생기므로, 여는 쪽의 모든 `?tab=` 값을 그 허브의 `?tab=` 해석과 대조한다.
 *
 * 규칙
 *   - 받는 쪽: `src/app/** /*-tabs.ts` 모듈이 내보내는 `TAB_HUB = { routes, parse }`. parse 가 값을 탭으로 읽어야 한다
 *     (null 이면 기본 탭으로 떨어진다). 모듈은 파일 이름으로 모아 import 없이 평가하므로 생성물에서 빠진 허브는 저절로 빠진다.
 *   - 여는 쪽: 메뉴 스냅숏(config/project-composer-menus.json)의 사용 중 메뉴, 생성 화면 목록의 별칭 목적지, 화면 코드의
 *     문자열 리터럴, 백엔드 소스의 문자열 리터럴(같은 파일 대문자 상수 + "?tab=" 결합 포함). 주석은 세지 않는다.
 *   - `?tab=` 을 보내는데 받는 해석이 없는 화면이면 red 다 — 새 허브는 `*-tabs.ts` 에 해석과 TAB_HUB 를 둔다.
 *   - 재사용 생성물에서 목적지 화면이 투영으로 빠졌으면(원장 확인) 그 목적지는 보지 않는다. 메뉴는 생성기가 투영하고,
 *     빠진 화면으로 가는 코드 링크는 도달성 census 가 본다.
 *
 * 이 계약은 탭 이름이 맞는지만 본다. 그 탭이 누구에게 보이는지(관리자 전용 탭 등)는 보지 않는다.
 *
 * ⚠ 알려진 한계: 경로나 탭 값에 식 자리가 든 템플릿 리터럴(`\`${ROUTE}?tab=${tab}\``), 프런트의 문자열 결합, 백엔드의
 *   메서드·소문자 변수 결합, SQL 시드의 문자열은 세지 않는다. 사용 중이 아닌 메뉴도 보지 않는다(다시 켜면 그때 본다).
 *   메뉴는 Flyway 를 적용한 스키마에서 만든 스냅숏으로 본다.
 */

type TabParser = (raw: string | null | undefined) => string | null;

interface TabHub {
  routes: readonly string[];
  parse: TabParser;
}

interface TabDestination {
  source: string;
  route: string;
  tab: string;
}

const JAVA_MODULES = ['foundation', 'business-core', 'business-app', 'api-server'];
const ROUTE_CHARS = String.raw`[A-Za-z0-9/_\-[\]]`;
const TAB_VALUE = String.raw`[A-Za-z0-9_-]+`;

/** `/경로?…tab=값…` 을 목적지로. 탭이 없으면 null. 경로·값의 모양이 틀리면 판정할 수 없어 실패한다. */
export function tabDestination(source: string, url: string): TabDestination | null {
  if (!/[?&]tab=/.test(url.split('#', 1)[0])) return null;
  const match = new RegExp(String.raw`^(\/${ROUTE_CHARS}*)\?(?:[^#]*&)?tab=(${TAB_VALUE})(?:[&#]|$)`).exec(url);
  if (!match) throw new Error(`${source}: ${url} — 탭 목적지를 판정할 수 없다(경로·탭 값의 모양을 확인한다)`);
  return { source, route: match[1].replace(/\/$/, '') || '/', tab: match[2] };
}

/** 주석을 같은 길이의 공백으로 지운다(줄 번호 보존). 문자열 안의 `//`(예: 'https://')는 건드리지 않는다. */
function withoutComments(source: string): string {
  const blank = (text: string) => text.replace(/[^\n]/g, ' ');
  return source.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (token) => (token.startsWith('/*') || token.startsWith('//') ? blank(token) : token));
}

const lineOf = (source: string, index: number) => source.slice(0, index).split('\n').length;

/**
 * 화면 코드의 문자열 리터럴에서 목적지를 찾는다. 경로와 탭 값까지가 정적이면 센다 — 그 뒤의 식 자리
 * (`\`/approvals?tab=PENDING&doc=${id}\``)는 괜찮고, 그 앞에 식 자리가 있으면 세지 않는다.
 */
export function frontendDestinations(source: string, file: string): TabDestination[] {
  const code = withoutComments(source);
  const pattern = new RegExp(String.raw`(['"\x60])(\/${ROUTE_CHARS}*\?[^'"\x60$]*?tab=${TAB_VALUE})(?=[&#'"\x60])`, 'g');
  return [...code.matchAll(pattern)]
    .map((match) => tabDestination(`${file}:${lineOf(code, match.index ?? 0)}`, match[2]))
    .filter((destination): destination is TabDestination => destination !== null);
}

/** 백엔드 소스의 문자열 리터럴과 같은 파일 대문자 상수 결합(`ROUTE + "?tab=값"`)에서 목적지를 찾는다. */
export function javaDestinations(source: string, file: string): TabDestination[] {
  const code = withoutComments(source);
  const constants = new Map([...code.matchAll(/\b([A-Z][A-Z0-9_]*)\s*=\s*"(\/[^"]*)"\s*;/g)].map((match) => [match[1], match[2]]));
  const at = (index: number) => `${file}:${lineOf(code, index)}`;
  const literal = [...code.matchAll(new RegExp(String.raw`"(\/${ROUTE_CHARS}*\?[^"]*?tab=[^"]*)"`, 'g'))]
    .map((match) => tabDestination(at(match.index ?? 0), match[1]));
  const joined = [...code.matchAll(/\b([A-Z][A-Z0-9_]*)\s*\+\s*"(\?[^"]*?tab=[^"]*)"/g)].map((match) => {
    const base = constants.get(match[1]);
    if (!base) throw new Error(`${at(match.index ?? 0)}: ${match[1]} 의 값을 같은 파일에서 찾지 못해 탭 목적지를 판정할 수 없다`);
    return tabDestination(at(match.index ?? 0), base + match[2]);
  });
  return [...literal, ...joined].filter((destination): destination is TabDestination => destination !== null);
}

/** 목적지마다 받는 허브의 해석으로 판정한다. 문제 목록을 돌려준다(빈 목록이면 통과). */
export function tabDestinationProblems(
  destinations: readonly TabDestination[],
  parserOf: (route: string) => TabParser | undefined,
): string[] {
  return destinations.flatMap(({ source, route, tab }) => {
    const parse = parserOf(route);
    if (!parse) return [`${source}: ${route}?tab=${tab} — 이 화면의 탭 해석이 없다(*-tabs.ts 에 해석과 TAB_HUB 를 둔다)`];
    return parse(tab) === null ? [`${source}: ${route}?tab=${tab} — 그 화면에 없는 탭이라 기본 탭으로 떨어진다`] : [];
  });
}

/** `*-tabs.ts` 모듈의 TAB_HUB 를 화면 경로별 해석으로 모은다. 선언이 없거나 경로가 겹치면 실패한다. */
export function hubParsers(modules: Record<string, { TAB_HUB?: TabHub }>): Map<string, TabParser> {
  const parsers = new Map<string, TabParser>();
  for (const [file, module] of Object.entries(modules)) {
    const hub = module.TAB_HUB;
    if (!hub || typeof hub.parse !== 'function' || !Array.isArray(hub.routes) || hub.routes.length === 0) {
      throw new Error(`${file} 이 TAB_HUB = { routes, parse } 를 내보내지 않는다`);
    }
    for (const route of hub.routes) {
      if (parsers.has(route)) throw new Error(`${route} 의 탭 해석이 둘이다(${file})`);
      parsers.set(route, hub.parse);
    }
  }
  return parsers;
}

/**
 * `src/app/** /*-tabs.ts` 모듈을 import 없이 읽는다 — 변환해 격리된 VM 에서 평가한다. 계산된 동적 import·glob 은 도달성 census 가
 * 판정할 수 없고, 리터럴 import 는 생성기 연쇄 제거에 걸려 생성물에서 이 계약을 지운다. 그래서 탭 모듈은 실행 import 를 두지
 * 않는다(`import type` 은 변환에서 사라진다). 생성물에서 빠진 허브의 모듈은 파일이 없으니 저절로 빠진다.
 */
export function evaluateTabModule(source: string, file: string): { TAB_HUB?: TabHub } {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file,
  });
  if (/\brequire\(/.test(outputText)) throw new Error(`${file}: 탭 해석 모듈은 실행 import 를 두지 않는다(타입 import 만 허용)`);
  const sandbox = { module: { exports: {} as { TAB_HUB?: TabHub } } };
  runInNewContext(outputText, { module: sandbox.module, exports: sandbox.module.exports });
  return sandbox.module.exports;
}

function tabModules(): Record<string, { TAB_HUB?: TabHub }> {
  const files = walk(join(REPO_ROOT, 'frontend', 'src', 'app'), (name) => name.endsWith('-tabs.ts'));
  return Object.fromEntries(files.map((path) => [repoPath(path), evaluateTabModule(readFileSync(path, 'utf8'), repoPath(path))]));
}

function walk(directory: string, accept: (name: string) => boolean): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return ['node_modules', '__tests__', 'test-utils'].includes(entry.name) ? [] : walk(path, accept);
    return accept(entry.name) ? [path] : [];
  });
}

const repoPath = (path: string) => relative(REPO_ROOT, path).split(sep).join('/');

function repositoryDestinations(): TabDestination[] {
  const menus = JSON.parse(readFileSync(join(REPO_ROOT, 'config', 'project-composer-menus.json'), 'utf8')) as {
    menus: { menu_sn: number; modern_route?: string | null; use_yn: string; del_yn: string }[];
  };
  const fromMenus = menus.menus
    .filter((menu) => menu.use_yn === 'Y' && menu.del_yn === 'N' && menu.modern_route)
    .map((menu) => tabDestination(`menu ${menu.menu_sn}`, menu.modern_route!));
  const fromAliases = SCREEN_ALIASES.map((alias) => (alias.target ? tabDestination(`alias ${alias.route}`, alias.target) : null));
  const fromFrontend = walk(join(REPO_ROOT, 'frontend', 'src'), (name) => /\.tsx?$/.test(name) && !/\.test\.|generated-/.test(name))
    .flatMap((path) => frontendDestinations(readFileSync(path, 'utf8'), repoPath(path)));
  const fromJava = JAVA_MODULES.flatMap((module) => walk(join(REPO_ROOT, module, 'src', 'main', 'java'), (name) => name.endsWith('.java')))
    .flatMap((path) => javaDestinations(readFileSync(path, 'utf8'), repoPath(path)));
  return [...fromMenus, ...fromAliases, ...fromFrontend, ...fromJava]
    .filter((destination): destination is TabDestination => destination !== null);
}

describe('탭 목적지 계약', () => {
  it('메뉴·별칭·화면 코드·백엔드 문자열이 여는 `?tab=` 값은 그 허브가 탭으로 읽는다', () => {
    const parsers = hubParsers(tabModules());
    // 목적지 화면이 투영으로 빠진 생성물에서는 그 목적지를 보지 않는다(원장 확인). 원본에서는 모두 본다.
    const destinations = repositoryDestinations().filter((destination) => pageInProjection(destination.route));
    expect(tabDestinationProblems(destinations, (route) => parsers.get(route))).toEqual([]);
    // 빈 수집은 통과가 아니다 — 출처마다 하한을 둔다(한 출처를 통째로 잃어도 합계로 가려지지 않게). 2026-10-10 원본 실측은
    //   메뉴 11·별칭 10·화면 코드 11·백엔드 8건이다. 가장 작은 생성물(core)에도 감시 허브의 메뉴·별칭은 남는다.
    const kindOf = ({ source }: TabDestination) => (source.startsWith('menu ') ? 'menu' : source.startsWith('alias ') ? 'alias'
      : source.startsWith('frontend/') ? 'frontend' : 'backend');
    const floors = projectionRemovedFiles().size > 0
      ? { menu: 1, alias: 1, frontend: 0, backend: 0 }
      : { menu: 8, alias: 8, frontend: 8, backend: 5 };
    for (const [kind, floor] of Object.entries(floors)) {
      expect(destinations.filter((destination) => kindOf(destination) === kind).length, `${kind} 출처의 탭 목적지 수`)
        .toBeGreaterThanOrEqual(floor);
    }
  });

  it('탭 해석이 받는 화면은 실제 화면이다', () => {
    const modules = tabModules();
    const parsers = hubParsers(modules);
    // 원본에는 탭 해석 모듈이 다섯 개 있다(지식·설문·감시·결재함·메모 보고). 이름 규칙이 깨져 하나도 모이지 않으면 실패한다.
    expect(Object.keys(modules).length).toBeGreaterThanOrEqual(projectionRemovedFiles().size > 0 ? 1 : 5);
    for (const route of parsers.keys()) {
      expect(existsSync(join(REPO_ROOT, 'frontend', 'src', 'app', ...route.split('/').filter(Boolean), 'page.tsx')), route).toBe(true);
    }
  });

  it('판정 규칙 — 없는 탭과 해석 없는 화면은 문제이고, 주석·앞쪽 식 자리는 세지 않으며 백엔드 상수 결합은 푼다', () => {
    const parser: TabParser = (raw) => (raw === 'A' ? 'A' : null);
    const parserOf = (route: string) => (route === '/hub' ? parser : undefined);
    expect(tabDestinationProblems([
      { source: 's1', route: '/hub', tab: 'A' },
      { source: 's2', route: '/hub', tab: 'B' },
      { source: 's3', route: '/other', tab: 'A' },
    ], parserOf)).toEqual([
      's2: /hub?tab=B — 그 화면에 없는 탭이라 기본 탭으로 떨어진다',
      's3: /other?tab=A — 이 화면의 탭 해석이 없다(*-tabs.ts 에 해석과 TAB_HUB 를 둔다)',
    ]);
    expect(frontendDestinations([
      "const a = '/hub?tab=A';",
      'const b = `/hub?tab=${tab}`;',
      'const c = `${ROUTE}?tab=A`;',
      'const d = "/hub?page=2&tab=B#top";',
      // 탭 값 뒤의 식 자리는 괜찮다 — 무엇을 여는지 정적으로 확정된다.
      'const e = `/hub?tab=C&doc=${id}`;',
      // 탭 값 앞에 식 자리가 있으면 세지 않는다.
      'const f = `/hub?x=${a}&tab=D`;',
      "// 주석 속 '/hub?tab=OLD' 는 링크가 아니다.",
      "/* 블록 주석 '/hub?tab=OLD2' 도 마찬가지다. */",
      "const g = 'https://example.org/a?tab=X';",
    ].join('\n'), 'f.ts').map(({ route, tab }) => `${route}:${tab}`)).toEqual(['/hub:A', '/hub:B', '/hub:C']);
    // 탭 값의 모양을 판정할 수 없으면 조용히 버리지 않고 실패한다.
    expect(() => tabDestination('s', '/hub?tab=A.B')).toThrow(/판정할 수 없다/);
    const java = [
      'private static final String ROUTE = "/hub";',
      'private static final String SENT = ROUTE + "?tab=MY";',
      '// 주석 속 "/hub?tab=OLD" 는 세지 않는다.',
      'static String link(long id) { return "/approvals?tab=PENDING&doc=" + id; }',
    ].join('\n');
    expect(javaDestinations(java, 'J.java').map(({ route, tab }) => `${route}:${tab}`)).toEqual(['/approvals:PENDING', '/hub:MY']);
    expect(() => javaDestinations('String SENT = UNKNOWN + "?tab=MY";', 'J.java')).toThrow(/UNKNOWN 의 값을/);
    expect(() => javaDestinations('String BAD = "/hub?tab=A.B";', 'J.java')).toThrow(/판정할 수 없다/);
    // 탭 모듈은 import 없이 평가한다 — 타입 import 는 사라지고, 실행 import 가 있으면 실패한다.
    expect(evaluateTabModule([
      "import type { X } from './x';",
      "export const TAB_HUB = { routes: ['/hub'], parse: (raw: string | null) => (raw === 'A' ? 'A' : null) };",
    ].join('\n'), 'hub-tabs.ts').TAB_HUB?.parse('A')).toBe('A');
    expect(() => evaluateTabModule("import { y } from './y';\nexport const TAB_HUB = { routes: ['/hub'], parse: y };", 'hub-tabs.ts'))
      .toThrow(/실행 import/);
    // 해석 모듈 모음 — 선언이 없거나 경로가 겹치면 실패한다.
    expect(() => hubParsers({ 'a-tabs.ts': {} })).toThrow(/TAB_HUB/);
    expect(() => hubParsers({
      'a-tabs.ts': { TAB_HUB: { routes: ['/hub'], parse: parser } },
      'b-tabs.ts': { TAB_HUB: { routes: ['/hub'], parse: parser } },
    })).toThrow(/해석이 둘이다/);
  });
});
