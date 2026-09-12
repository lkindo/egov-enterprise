/**
 * 생산 코드가 **page-redirect 라우트를 가리키지 않는다**(정본으로 직접 간다).
 *
 * ── 이 가드가 막는 결함의 형태 ───────────────────────────────────────────────
 * 라우트를 page-redirect 로 바꾸면 그 라우트를 **가리키던 화면들**이 그대로 남는다. 리다이렉트는
 * 200 을 돌려주므로 타입 검사·린트·기존 계약 어디에도 걸리지 않고, 사용자에게는 이렇게 보인다.
 *
 *   - 라벨이 약속한 일이 일어나지 않는다 — '등록' 버튼이 목록에 떨어진다.
 *   - URL 에 실은 **식별자가 통째로 버려진다** — 행을 눌렀는데 목록으로 간다(가장 조용하다).
 *   - 목적지가 다시 원래 화면으로 돌아온다 — 눌러도 아무 일이 없다.
 *
 * 2026-09-12 하루에만 같은 형태를 다섯 번 실측했다(§A3-1 이행 4건 + 업무 홈의 '새 게시글 작성').
 * 종전 가드는 그중 §A3-1 4라우트만 문자열로 하드코딩했다 — 이 가드는 **route census 에서 파생**해
 * page-redirect 라우트 전체를 덮는다. 라우트가 새로 redirect 가 되면 목록을 손보지 않아도 걸린다.
 *
 * ── 왜 Next 라우트 해석이 필요한가 ──────────────────────────────────────────
 * 단순 접두 매칭으로는 **형제 정적 라우트를 오탐한다**. `/admin/community/boards/[id]` 가
 * page-redirect 라고 해서 `/admin/community/boards/detail` 까지 redirect 인 것은 아니다 —
 * Next 는 정적 세그먼트가 동적 세그먼트를 이긴다. 1차 시도에서 그 오탐이 21건 나왔고, 해석을
 * 구현하자 진짜 위반 1건으로 줄었다. 오탐이 많은 게이트는 결국 예외 목록으로 무력화된다(H2).
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..', '..', '..');
const SRC = path.resolve(__dirname, '..');
/**
 * 라우트 소유 판정에만 쓴다(그 라우트의 redirect 파일 자신은 목적지를 알아야 한다).
 * 스캔은 `src/app` 이 아니라 **`src` 전체**다 — 내비게이션은 화면 파일에만 있지 않다.
 * 실측: `components/business/deptJob/DeptJobListSection.tsx` 가 행 클릭으로 라우트를 민다.
 * 범위를 app 으로 좁히면 그런 공용 컴포넌트의 역참조가 영원히 보이지 않는다.
 */
const APP = path.resolve(__dirname, '..', 'app');

type RouteRow = { route: string; routing?: { kind?: string; target?: string } };

const capsRaw = JSON.parse(
  fs.readFileSync(path.join(REPO, 'config/ui-route-capabilities.json'), 'utf8'),
) as RouteRow[] | { routes: RouteRow[] };
const routeRows: RouteRow[] = Array.isArray(capsRaw) ? capsRaw : capsRaw.routes;

type Pattern = { route: string; kind: string; target: string | null; segs: string[] };

const patterns: Pattern[] = routeRows.map((r) => ({
  route: r.route,
  kind: r.routing?.kind ?? 'page',
  target: r.routing?.target ?? null,
  segs: r.route.split('/').filter(Boolean),
}));

const isDynamic = (s: string) => s.startsWith('[') && s.endsWith(']');
const isCatchAll = (s: string) => s.startsWith('[...') || s.startsWith('[[...');
/** 소스에서 뽑은 세그먼트가 런타임 계산값인가(`${...}`). 정적 세그먼트는 채울 수 없다. */
const isComputed = (s: string) => s.includes('${');

/**
 * Next 해석 — 세그먼트 수가 같은 후보 중 **리터럴 일치가 가장 많은** 것이 이긴다.
 * catch-all 은 이 판정에서 제외한다(우선순위가 가장 낮고 현재 대상도 없다).
 */
export function resolveRoute(targetPath: string): Pattern | null {
  const segs = targetPath.split('/').filter(Boolean);
  let best: Pattern | null = null;
  let bestScore = -1;
  for (const p of patterns) {
    if (p.segs.some(isCatchAll)) continue;
    if (p.segs.length !== segs.length) continue;
    let score = 0;
    let ok = true;
    for (let i = 0; i < segs.length; i += 1) {
      const actual = segs[i];
      const expected = p.segs[i];
      if (isDynamic(expected)) continue;
      if (isComputed(actual)) { ok = false; break; }
      if (actual !== expected) { ok = false; break; }
      score += 1;
    }
    if (ok && score > bestScore) { best = p; bestScore = score; }
  }
  return best;
}

const NAV = /(?:href=|router\.(?:push|replace)\(|redirect\()\s*[{`'"]*\s*([^`'"),}\s]+)/g;

function stripComments(source: string): string {
  let out = '';
  let mode: 'block' | 'line' | null = null;
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1] ?? '';
    if (mode === null) {
      if (c === '/' && n === '*') { mode = 'block'; i += 1; continue; }
      if (c === '/' && n === '/') { mode = 'line'; i += 1; continue; }
      out += c;
    } else if (mode === 'block') {
      if (c === '*' && n === '/') { mode = null; i += 1; }
    } else if (c === '\n') { mode = null; out += '\n'; }
  }
  return out;
}

function collectSources(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') collectSources(full, acc);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.test\.tsx?$/.test(entry.name)) continue;
    acc.push(full);
  }
  return acc;
}

/** 그 라우트의 redirect 파일 자신은 목적지를 알아야 한다. */
function ownsRoute(relFromApp: string, route: string): boolean {
  const dir = route.split('/').filter(Boolean).filter((s) => !isDynamic(s)).join('/');
  return relFromApp === `${dir}/page.tsx` || relFromApp.startsWith(`${dir}/`);
}

export function findViolations(): string[] {
  const found: string[] = [];
  for (const file of collectSources(SRC)) {
    // 표시는 src 기준, 라우트 소유 판정은 app 기준(app 밖 파일은 어떤 라우트도 소유하지 않는다).
    const relFromSrc = path.relative(SRC, file).replace(/\\/g, '/');
    const rel = path.relative(APP, file).replace(/\\/g, '/');
    const source = stripComments(fs.readFileSync(file, 'utf8'));
    for (const match of source.matchAll(NAV)) {
      const raw = match[1];
      if (!raw.startsWith('/')) continue;
      const targetPath = raw.split('?')[0].split('#')[0].replace(/\/$/, '');
      if (!targetPath) continue;
      const hit = resolveRoute(targetPath);
      if (!hit || hit.kind !== 'page-redirect') continue;
      if (ownsRoute(rel, hit.route)) continue;
      const entry = `${relFromSrc} → ${raw}  (라우트 ${hit.route} 는 ${hit.target} 로 보내는 page-redirect)`;
      if (!found.includes(entry)) found.push(entry);
    }
  }
  return found;
}

describe('page-redirect 라우트로의 역참조 차단', () => {
  it('route census 에 page-redirect 가 실제로 존재한다 — 모집단이 비면 이 가드는 공허하다', () => {
    const redirects = patterns.filter((p) => p.kind === 'page-redirect');
    expect(redirects.length).toBeGreaterThan(0);
    // 각 redirect 는 목적지를 선언해야 한다 — 목적지 없는 redirect 는 고칠 방향도 없다.
    expect(redirects.filter((p) => !p.target).map((p) => p.route)).toEqual([]);
  });

  it('생산 코드가 page-redirect 라우트를 가리키지 않는다', () => {
    expect(
      findViolations(),
      [
        'page-redirect 라우트를 가리키는 화면이 있습니다. 리다이렉트는 200 을 돌려주므로 아무것도 실패하지',
        '않지만, 사용자에게는 라벨이 약속한 일이 일어나지 않거나 URL 에 실은 식별자가 버려집니다.',
        '괄호 안의 목적지(정본)로 직접 보내세요.',
      ].join(' '),
    ).toEqual([]);
  });

  it('해석기가 형제 정적 라우트를 오탐하지 않고 동적 자리의 계산값은 잡는다', () => {
    /*
      이 게이트의 값은 "무엇을 잡는가" 만큼 "무엇을 안 잡는가" 에 있다.
      접두 매칭으로 되돌리면 아래 정적 형제들이 전부 위반으로 뒤집힌다(실측 오탐 21건).
    */
    const flagged = (target: string) => {
      const hit = resolveRoute(target.split('?')[0].replace(/\/$/, ''));
      return hit?.kind === 'page-redirect' ? hit.route : null;
    };

    /*
      §A3-1 이행 4라우트는 종전 전용 가드(a3-1-migrated-route-guard)가 문자열로 하드코딩해
      지키던 대상이다. 이 가드가 그것을 **대체**하므로, 넷을 여기서 명시적으로 고정한다 —
      일반화하면서 보호가 약해지지 않았음을 이 네 줄이 증명한다.
    */
    expect(flagged('/admin/collaboration/address-book/insert-address-book'))
      .toBe('/admin/collaboration/address-book/insert-address-book');
    expect(flagged('/admin/collaboration/scraps/insertScrap'))
      .toBe('/admin/collaboration/scraps/insertScrap');
    expect(flagged('/admin/collaboration/scraps/selectScrapDetail/${item.scrapSn}'))
      .toBe('/admin/collaboration/scraps/selectScrapDetail/[id]');
    expect(flagged('/admin/survey/manage/create')).toBe('/admin/survey/manage/create');

    // 이번에 새로 드러난 것 — 업무 홈의 '새 게시글 작성' 이 가리키던 곳.
    expect(flagged('/admin/community/boards')).toBe('/admin/community/boards');

    // 형제 정적 라우트 — Next 는 정적이 동적을 이긴다.
    expect(flagged('/admin/community/boards/detail?bbsId=${x}')).toBeNull();
    expect(flagged('/admin/community/boards/insert-board-article?bbsId=${x}')).toBeNull();
    expect(flagged('/admin/community/boards/master')).toBeNull();
    expect(flagged('/admin/collaboration/scraps/selectScrapList')).toBeNull();
  });
});
