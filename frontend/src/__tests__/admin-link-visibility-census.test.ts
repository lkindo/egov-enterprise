import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import { registeredPagePermissions } from '@/lib/auth/page-access';
import { projectionRemovedFiles } from '@/test-utils/projection';

/**
 * 관리 화면으로 가는 링크·버튼 노출 census (DIP B4 P1).
 *
 * 라우트 게이트(proxy.ts)는 `/admin/**` 을 `canEnterRegisteredPage` 로 막는다. 화면이 그 길을 다른 판정으로
 * 보이면, 버튼은 있는데 누르면 홈으로 튕기는 조용한 결함이 된다 — 워크허브 '메모보고 관리' 는 업무함 권한으로
 * 버튼을 보였고 목적지는 메모보고 전체 조회 권한을 요구했다(DEC-OPS-023 ②).
 *
 * 규칙: 코드에 적힌 `/admin/...` 목적지(href·link·moreHref·url 속성, router.push/replace)는 다음 중 하나여야 한다.
 *   1. 목적지가 인증된 누구에게나 열린다(요구 권한이 비어 있다).
 *   2. 이 파일이 놓인 화면에 들어온 사람이면 목적지에도 들어갈 수 있다(출발 화면의 권한 ⊆ 목적지 권한).
 *   3. 같은 파일이 같은 목적지로 `canOpenPage(주체, '<목적지>')` 를 부른다 — 라우트와 같은 판정으로 노출한다.
 *      목록을 거르는 형태(`href: '<목적지>'` 항목 + `canOpenPage(주체, x.href)`)도 인정한다.
 * 등록되지 않은 목적지는 라우트 게이트가 누구에게나 거부하므로 예외 없이 red 다.
 *
 * 슬롯 기여(src/extensions, 슬롯 단계 PR-4)는 출발 화면이 없는 데이터다. 그래서 2·3 의 파일 단위 판정을 쓰지 않고, 링크 항목마다
 * 같은 객체의 `visibleWhen: { page: '<같은 목적지>' }` 만 게이트로 인정한다 — 셸은 그 술어를 canOpenPage 로 판정한다(slots.ts).
 * 기여는 AST 로 읽는다: 따옴표·계산·단축 키도 링크 키로 보고, 값이 리터럴이 아닌 링크와 키를 알 수 없는 속성은 붉다(unresolved).
 * 검사 대상은 .ts·.tsx 전부다(시험·선언 파일 제외).
 *
 * ⚠ 알려진 한계: 일반 파일에서 변수로 조립한 목적지(`router.push(TAB_ROUTES[tab])`)는 세지 않는다. 출발 화면은 파일에서 가장
 *   가까운 page.tsx 의 라우트로 보며, 여러 라우트가 같이 쓰는 파일은 그 판정이 넓을 수 있다 — 그래서 공용
 *   컴포넌트(src/components, src/app/components)는 출발 권한이 없는 것(인증만)으로 본다.
 */

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');
/** 슬롯 기여 디렉터리. 이 아래 파일은 항목 단위 판정만 받는다(위 설명). */
const EXTENSIONS_DIR = join(FRONTEND_DIR, 'src', 'extensions');
const SCAN_ROOTS = [APP_DIR, join(FRONTEND_DIR, 'src', 'components'), EXTENSIONS_DIR];

const LINK_PATTERN =
  /(?:href|link|moreHref|url)\s*[=:]\s*\{?\s*(?:[\w.!&|() ]+\?\s*)?([`'"])(\/admin\/[^`'"]*)\1|router\.(?:push|replace)\(\s*([`'"])(\/admin\/[^`'"]*)\3/g;
const GATE_LITERAL = /canOpenPage\(\s*[^,()]+,\s*([`'"])(\/admin\/[^`'"]*)\1\s*\)/g;
const GATE_BY_HREF_FIELD = /canOpenPage\(\s*[^,()]+,\s*[\w.]+\.href\s*\)/;
const LINK_KEYS = new Set(['href', 'link', 'moreHref', 'url']);

interface LinkSourceFile {
  path: string;
  source: string;
  /** 이 파일이 놓인 화면의 라우트. 공용 컴포넌트면 null. */
  route: string | null;
  /** 슬롯 기여 — 항목 단위 판정만 받는다. */
  strict?: boolean;
}

interface LinkFinding {
  path: string;
  line: number;
  target: string;
  /** unresolved: 슬롯 기여의 링크 값을 리터럴로 읽을 수 없다(이름·식·단축·펼침·계산 키). */
  reason: 'unregistered' | 'ungated' | 'unresolved';
}

/** 쿼리·해시를 떼고 동적 세그먼트(`${...}`·`[id]`)를 같은 모양으로 만든다. */
function normalizeTarget(raw: string): string {
  return raw.split(/[?#]/, 1)[0].replace(/\$\{[^}]*\}/g, '[x]').replace(/\[[^\]/]+\]/g, '[x]').replace(/\/$/, '');
}

type PermissionLookup = (path: string) => readonly string[] | null;

interface ContributionLink {
  offset: number;
  /** 문자열·템플릿 리터럴 값. 이름·식·단축 속성이거나 키를 알 수 없는 속성(펼침·계산)이면 null — 목적지를 읽을 수 없다. */
  target: string | null;
  /** 같은 객체의 `visibleWhen: { page: '<리터럴>' }`(술어가 그것 하나일 때). */
  page: string | undefined;
}

/**
 * 슬롯 기여의 링크 속성을 AST 로 찾는다. 키는 이름·따옴표·문자열 계산 키·단축 속성을 모두 링크 키로 본다. 값이 리터럴이 아니거나
 * 키를 알 수 없는 속성(펼침·리터럴 아닌 계산 키)은 목적지를 모르는 링크로 낸다 — 정규식으로는 그 꼴이 0건으로 지나간다.
 */
function contributionLinks(source: string): ContributionLink[] {
  const file = ts.createSourceFile('contribution.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const links: ContributionLink[] = [];
  const nameOf = (property: ts.ObjectLiteralElementLike): string | undefined => {
    if (ts.isShorthandPropertyAssignment(property)) return property.name.text;
    if (!ts.isPropertyAssignment(property)) return undefined;
    const { name } = property;
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text;
    if (ts.isComputedPropertyName(name) && (ts.isStringLiteral(name.expression) || ts.isNoSubstitutionTemplateLiteral(name.expression))) {
      return name.expression.text;
    }
    return undefined;
  };
  const literal = (node: ts.Expression): string | undefined => {
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return literal(node.expression);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    return ts.isTemplateExpression(node) ? node.getText(file).slice(1, -1) : undefined;
  };
  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const visible = node.properties.find((property) => nameOf(property) === 'visibleWhen');
      const rule = visible && ts.isPropertyAssignment(visible) && ts.isObjectLiteralExpression(visible.initializer)
        ? visible.initializer.properties : undefined;
      const only = rule?.length === 1 ? rule[0] : undefined;
      const page = only && nameOf(only) === 'page' && ts.isPropertyAssignment(only) ? literal(only.initializer) : undefined;
      for (const property of node.properties) {
        const key = nameOf(property);
        const unknownKey = ts.isSpreadAssignment(property)
          || (ts.isPropertyAssignment(property) && ts.isComputedPropertyName(property.name) && key === undefined);
        if (!unknownKey && (key === undefined || !LINK_KEYS.has(key))) continue;
        const target = !unknownKey && ts.isPropertyAssignment(property) ? literal(property.initializer) ?? null : null;
        links.push({ offset: property.getStart(file), target, page });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return links;
}

/** 슬롯 기여 판정: 링크 항목마다 같은 객체의 같은 목적지 page 술어만 게이트다. 파일 단위 판정(출발 화면·canOpenPage)은 쓰지 않는다. */
function contributionFindings(file: LinkSourceFile, lookup: PermissionLookup): LinkFinding[] {
  const findings: LinkFinding[] = [];
  const lineOf = (offset: number) => file.source.slice(0, offset).split('\n').length;
  const judge = (offset: number, raw: string, page: string | undefined) => {
    const target = normalizeTarget(raw);
    const required = lookup(target);
    if (!required) findings.push({ path: file.path, line: lineOf(offset), target, reason: 'unregistered' });
    else if (required.length > 0 && (page === undefined || normalizeTarget(page) !== target)) {
      findings.push({ path: file.path, line: lineOf(offset), target, reason: 'ungated' });
    }
  };
  for (const link of contributionLinks(file.source)) {
    if (link.target === null) findings.push({ path: file.path, line: lineOf(link.offset), target: '(읽을 수 없는 목적지)', reason: 'unresolved' });
    else if (link.target.startsWith('/admin/')) judge(link.offset, link.target, link.page);
  }
  // 호출 꼴(router.push·replace)은 정규식으로 본다. 기여는 함정 규칙상 호출을 둘 수 없지만 census 는 그 규칙에 기대지 않는다.
  for (const match of file.source.matchAll(LINK_PATTERN)) if (match[4] !== undefined) judge(match.index, match[4], undefined);
  return findings;
}

function findUngatedAdminLinks(files: LinkSourceFile[], lookup: PermissionLookup): LinkFinding[] {
  const findings: LinkFinding[] = [];
  for (const file of files) {
    if (file.strict) {
      findings.push(...contributionFindings(file, lookup));
      continue;
    }
    const gated = new Set([...file.source.matchAll(GATE_LITERAL)].map((match) => normalizeTarget(match[2])));
    const filtersByHref = GATE_BY_HREF_FIELD.test(file.source);
    const sourceRequired = file.route ? lookup(file.route) : null;
    for (const match of file.source.matchAll(LINK_PATTERN)) {
      const raw = match[2] ?? match[4];
      const target = normalizeTarget(raw);
      const line = file.source.slice(0, match.index).split('\n').length;
      const required = lookup(target);
      if (!required) {
        findings.push({ path: file.path, line, target, reason: 'unregistered' });
        continue;
      }
      if (required.length === 0) continue;
      if (sourceRequired && sourceRequired.length > 0 && sourceRequired.every((code) => required.includes(code))) continue;
      if (gated.has(target)) continue;
      if (filtersByHref && /^\s*href\s*:/.test(match[0])) continue;
      findings.push({ path: file.path, line, target, reason: 'ungated' });
    }
  }
  return findings;
}

function screenFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : screenFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.(?:test|d)\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** 파일에서 가장 가까운 page.tsx 의 라우트. 공용 컴포넌트 디렉터리는 null. */
function owningRoute(file: string): string | null {
  const shared = [join(APP_DIR, 'components'), join(FRONTEND_DIR, 'src', 'components')];
  if (!file.startsWith(APP_DIR) || shared.some((root) => file.startsWith(root))) return null;
  let directory = dirname(file);
  while (directory.startsWith(APP_DIR)) {
    if (existsSync(join(directory, 'page.tsx'))) {
      const route = '/' + relative(APP_DIR, directory).split(sep).join('/');
      return route === '/' ? '/' : route;
    }
    directory = dirname(directory);
  }
  return null;
}

/** 페이지 게이트는 `/admin` 아래만 본다. 그 밖의 출발 화면은 인증만 요구한다. */
function lookupRoute(path: string): readonly string[] | null {
  if (path !== '/admin' && !path.startsWith('/admin/')) return [];
  return registeredPagePermissions(path);
}

function repositoryFiles(): LinkSourceFile[] {
  return SCAN_ROOTS.flatMap(screenFiles).map((path) => ({
    path: relative(FRONTEND_DIR, path).split(sep).join('/'),
    source: readFileSync(path, 'utf8'),
    route: owningRoute(path),
    strict: path.startsWith(EXTENSIONS_DIR + sep),
  }));
}

describe('관리 화면 링크 노출 census', () => {
  it('관리 화면으로 가는 길은 라우트 게이트와 같은 판정으로만 보인다', () => {
    const findings = findUngatedAdminLinks(repositoryFiles(), lookupRoute);
    expect(
      findings.map((finding) => `${finding.path}:${finding.line} ${finding.target} (${finding.reason})`),
      '목적지 권한을 갖지 못한 사람에게 보이는 링크입니다. canOpenPage(user, "<목적지>") 로 노출을 판정하세요.',
    ).toEqual([]);
  });

  it('census 가 실제로 링크를 센다(빈 스캔의 거짓 green 방지)', () => {
    const counted = repositoryFiles().reduce((total, file) => total + [...file.source.matchAll(LINK_PATTERN)].length, 0);
    // 하한은 스캔이 깨지거나 일부가 빠지는 것을 잡는다. 원본은 종전 값 그대로이고, 투영 원장이 있는 재사용 생성물에서만
    //   가장 작은 생성물에서도 성립하는 값으로 낮춘다(2026-10-10 실측: 원본 57·collaboration 38·core 19. Phase 2 D6).
    expect(counted).toBeGreaterThan(projectionRemovedFiles().size > 0 ? 10 : 30);
  });

  describe('판정 규칙', () => {
    const permissions: Record<string, readonly string[]> = {
      '/admin/open': [],
      '/admin/hub': ['HUB_READ'],
      '/admin/memo': ['MEMO_READ'],
      '/admin/detail/[id]': ['DETAIL_READ'],
      '/admin/wide': ['HUB_READ', 'OTHER_READ'],
    };
    const lookup: PermissionLookup = (path) => {
      const normalized = normalizeTarget(path);
      return Object.entries(permissions).find(([route]) => normalizeTarget(route) === normalized)?.[1] ?? null;
    };
    const file = (source: string, route: string | null = '/admin/hub'): LinkSourceFile => ({ path: 'fixture.tsx', source, route });

    it('판정 없는 링크는 red 다', () => {
      expect(findUngatedAdminLinks([file('<Link href="/admin/memo">메모</Link>')], lookup))
        .toEqual([{ path: 'fixture.tsx', line: 1, target: '/admin/memo', reason: 'ungated' }]);
    });

    it('다른 권한으로 판정해도 red 다 — 같은 목적지로 canOpenPage 를 불러야 한다', () => {
      const source = "const ok = canPermission(user, 'DEPT_BOX_READ');\n{ok && <Link href=\"/admin/memo\">메모</Link>}";
      expect(findUngatedAdminLinks([file(source)], lookup)).toHaveLength(1);
      const other = "const ok = canOpenPage(user, '/admin/open');\n{ok && <Link href=\"/admin/memo\">메모</Link>}";
      expect(findUngatedAdminLinks([file(other)], lookup)).toHaveLength(1);
    });

    it('canOpenPage 로 같은 목적지를 판정하면 통과한다(쿼리는 무시)', () => {
      const source = "const ok = canOpenPage(user, '/admin/memo');\n{ok && <Link href=\"/admin/memo?tab=x\">메모</Link>}";
      expect(findUngatedAdminLinks([file(source)], lookup)).toEqual([]);
    });

    it('동적 세그먼트는 라우트 모양으로 맞춘다', () => {
      const source = "const ok = canOpenPage(user, '/admin/detail/[id]');\nrouter.push(`/admin/detail/${row.id}`);";
      expect(findUngatedAdminLinks([file(source)], lookup)).toEqual([]);
      expect(findUngatedAdminLinks([file('router.push(`/admin/detail/${row.id}`);')], lookup)).toHaveLength(1);
    });

    it('삼항으로 목적지를 주는 속성도 센다', () => {
      expect(findUngatedAdminLinks([file('link={ready ? "/admin/memo" : undefined}')], lookup)).toHaveLength(1);
    });

    it('열린 목적지와, 출발 화면 권한이 목적지를 함축하는 링크는 판정이 필요 없다', () => {
      expect(findUngatedAdminLinks([file('<Link href="/admin/open">열림</Link>', null)], lookup)).toEqual([]);
      expect(findUngatedAdminLinks([file('<Link href="/admin/wide">넓음</Link>')], lookup)).toEqual([]);
      // 공용 컴포넌트는 출발 권한이 없다고 본다.
      expect(findUngatedAdminLinks([file('<Link href="/admin/hub">허브</Link>', null)], lookup)).toHaveLength(1);
    });

    it('href 목록을 canOpenPage 로 거르면 통과하고, 거르지 않으면 red 다', () => {
      const filtered = "const all = [{ href: '/admin/memo', title: 'a' }];\nconst links = all.filter((link) => canOpenPage(user, link.href));";
      expect(findUngatedAdminLinks([file(filtered)], lookup)).toEqual([]);
      expect(findUngatedAdminLinks([file("const all = [{ href: '/admin/memo', title: 'a' }];")], lookup)).toHaveLength(1);
    });

    describe('슬롯 기여(src/extensions)는 항목 단위 page 술어만 게이트로 본다', () => {
      const contribution = (body: string): LinkSourceFile => ({
        path: 'src/extensions/x/shell-links.ts', route: null, strict: true,
        source: `export default defineContributions('shell-links', [${body}]);`,
      });
      const check = (body: string) => findUngatedAdminLinks([contribution(body)], lookup).map((finding) => finding.reason);

      it('술어가 없거나 always·permissions 술어면 red 다', () => {
        expect(check("{ id: 'memo', href: '/admin/memo' }")).toEqual(['ungated']);
        expect(check("{ id: 'memo', href: '/admin/memo', visibleWhen: { always: '사유' } }")).toEqual(['ungated']);
        expect(check("{ id: 'memo', href: '/admin/memo', visibleWhen: { permissions: ['MEMO_READ'] } }")).toEqual(['ungated']);
      });

      it('같은 객체의 같은 목적지 page 술어면 통과하고(쿼리·동적 자리는 맞춘다), 다른 목적지면 red 다', () => {
        expect(check("{ id: 'memo', href: '/admin/memo?tab=x', visibleWhen: { page: '/admin/memo' } }")).toEqual([]);
        expect(check("{ id: 'detail', url: `/admin/detail/${id}`, visibleWhen: { page: '/admin/detail/[id]' } }")).toEqual([]);
        expect(check("{ id: 'memo', moreHref: '/admin/memo', visibleWhen: { page: '/admin/hub' } }")).toEqual(['ungated']);
      });

      it('다른 객체의 술어와 파일 단위 판정은 게이트가 아니다', () => {
        expect(check("{ id: 'memo', href: '/admin/memo', nested: { visibleWhen: { page: '/admin/memo' } } }")).toEqual(['ungated']);
        expect(check("{ id: 'a', visibleWhen: { page: '/admin/memo' } }, { id: 'b', link: '/admin/memo' }")).toEqual(['ungated']);
        // 같은 목적지의 canOpenPage 리터럴, href 목록 거르기, 목적지를 함축하는 출발 화면 — 일반 파일이면 셋 다 통과시킨다.
        const fileLevel = contribution("{ id: 'memo', href: '/admin/memo' }");
        const source = `const ok = canOpenPage(user, '/admin/memo');\nconst all = [{ id: 'x', title: 'a' }].filter((x) => canOpenPage(user, x.href));\n${fileLevel.source}`;
        expect(findUngatedAdminLinks([{ ...fileLevel, source, route: '/admin/memo' }], lookup).map((finding) => finding.reason)).toEqual(['ungated']);
        expect(findUngatedAdminLinks([{ ...fileLevel, source, route: '/admin/memo', strict: false }], lookup)).toEqual([]);
      });

      it('키·값의 꼴과 무관하게 링크를 찾고, 목적지를 읽을 수 없으면 red 다', () => {
        // 따옴표·계산 키도 링크 키다(정규식은 둘 다 0건으로 지나간다).
        expect(check("{ id: 'memo', 'href': '/admin/memo', visibleWhen: { always: '사유' } }")).toEqual(['ungated']);
        expect(check("{ id: 'memo', ['href']: '/admin/memo', visibleWhen: { always: '사유' } }")).toEqual(['ungated']);
        expect(check("{ id: 'memo', 'href': '/admin/memo', visibleWhen: { page: '/admin/memo' } }")).toEqual([]);
        // 값이 이름·식·단축 속성이거나 키를 알 수 없는 속성이면 page 술어가 있어도 목적지를 모른다.
        expect(check("{ id: 'memo', href: MEMO_ROUTE, visibleWhen: { page: '/admin/memo' } }")).toEqual(['unresolved']);
        expect(check("{ id: 'memo', href, visibleWhen: { page: '/admin/memo' } }")).toEqual(['unresolved']);
        expect(check("{ id: 'memo', link: ready ? '/admin/memo' : '/board', visibleWhen: { page: '/admin/memo' } }")).toEqual(['unresolved']);
        expect(check("{ id: 'memo', ...links, visibleWhen: { page: '/admin/memo' } }")).toEqual(['unresolved']);
        expect(check("{ id: 'memo', [KEY]: '/admin/memo', visibleWhen: { page: '/admin/memo' } }")).toEqual(['unresolved']);
        // 대조: 리터럴에 붙은 as const 는 읽고, /admin 밖 목적지와 링크가 아닌 키는 보지 않는다.
        expect(check("{ id: 'memo', href: '/admin/memo' as const, visibleWhen: { page: '/admin/memo' } }")).toEqual([]);
        expect(check("{ id: 'board', href: '/board', label, visibleWhen: { always: '사유' } }")).toEqual([]);
      });

      it('등록되지 않은 목적지는 page 술어가 있어도 red 다', () => {
        expect(check("{ id: 'none', href: '/admin/nowhere', visibleWhen: { page: '/admin/nowhere' } }")).toEqual(['unregistered']);
      });
    });

    it('등록되지 않은 목적지는 판정과 무관하게 red 다', () => {
      const source = "const ok = canOpenPage(user, '/admin/nowhere');\n<Link href=\"/admin/nowhere\">없음</Link>";
      expect(findUngatedAdminLinks([file(source)], lookup)[0]?.reason).toBe('unregistered');
    });
  });
});
