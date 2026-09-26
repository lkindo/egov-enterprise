import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registeredPagePermissions } from '@/lib/auth/page-access';

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
 * ⚠ 알려진 한계: 변수로 조립한 목적지(`router.push(TAB_ROUTES[tab])`)는 세지 않는다. 출발 화면은 파일에서 가장
 *   가까운 page.tsx 의 라우트로 보며, 여러 라우트가 같이 쓰는 파일은 그 판정이 넓을 수 있다 — 그래서 공용
 *   컴포넌트(src/components, src/app/components)는 출발 권한이 없는 것(인증만)으로 본다.
 */

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');
const SCAN_ROOTS = [APP_DIR, join(FRONTEND_DIR, 'src', 'components')];

const LINK_PATTERN =
  /(?:href|link|moreHref|url)\s*[=:]\s*\{?\s*(?:[\w.!&|() ]+\?\s*)?([`'"])(\/admin\/[^`'"]*)\1|router\.(?:push|replace)\(\s*([`'"])(\/admin\/[^`'"]*)\3/g;
const GATE_LITERAL = /canOpenPage\(\s*[^,()]+,\s*([`'"])(\/admin\/[^`'"]*)\1\s*\)/g;
const GATE_BY_HREF_FIELD = /canOpenPage\(\s*[^,()]+,\s*[\w.]+\.href\s*\)/;

interface LinkSourceFile {
  path: string;
  source: string;
  /** 이 파일이 놓인 화면의 라우트. 공용 컴포넌트면 null. */
  route: string | null;
}

interface LinkFinding {
  path: string;
  line: number;
  target: string;
  reason: 'unregistered' | 'ungated';
}

/** 쿼리·해시를 떼고 동적 세그먼트(`${...}`·`[id]`)를 같은 모양으로 만든다. */
function normalizeTarget(raw: string): string {
  return raw.split(/[?#]/, 1)[0].replace(/\$\{[^}]*\}/g, '[x]').replace(/\[[^\]/]+\]/g, '[x]').replace(/\/$/, '');
}

type PermissionLookup = (path: string) => readonly string[] | null;

function findUngatedAdminLinks(files: LinkSourceFile[], lookup: PermissionLookup): LinkFinding[] {
  const findings: LinkFinding[] = [];
  for (const file of files) {
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
    return entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') ? [path] : [];
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
    expect(counted).toBeGreaterThan(30);
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

    it('등록되지 않은 목적지는 판정과 무관하게 red 다', () => {
      const source = "const ok = canOpenPage(user, '/admin/nowhere');\n<Link href=\"/admin/nowhere\">없음</Link>";
      expect(findUngatedAdminLinks([file(source)], lookup)[0]?.reason).toBe('unregistered');
    });
  });
});
