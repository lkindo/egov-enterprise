// @vitest-environment node
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
import { inProjection } from '@/test-utils/projection';
import { codeWithoutComments, productionSourceFiles } from '../../../scripts/code-without-comments.mjs';

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

/**
 * 내비게이션 자리: JSX `href=`, router.push/replace, redirect(), 그리고 객체 리터럴의 링크 키(href·url·link·moreHref).
 * 객체 키는 링크 목록과 슬롯 기여(src/extensions, 슬롯 단계 PR-4)가 목적지를 적는 자리다 — 타입 주석(`href: string`)은 '/' 로
 * 시작하지 않으므로 아래 판정에서 빠진다. 따옴표·계산 키나 리터럴이 아닌 값은 이 정규식이 보지 못한다 — 슬롯 기여에서는 경계 계약의
 * 함정 규칙(`키: 값` 꼴만)과 관리 링크 census(리터럴이 아닌 링크 값은 unresolved)가 그 꼴을 막는다.
 */
const NAV = /(?:href=|\b(?:href|url|link|moreHref)\s*:|router\.(?:push|replace)\(|redirect\()\s*[{`'"]*\s*([^`'"),}\s]+)/g;

/** 그 라우트의 redirect 파일 자신은 목적지를 알아야 한다. */
function ownsRoute(relFromApp: string, route: string): boolean {
  const dir = route.split('/').filter(Boolean).filter((s) => !isDynamic(s)).join('/');
  return relFromApp === `${dir}/page.tsx` || relFromApp.startsWith(`${dir}/`);
}

/**
 * 한 파일의 위반. `relFromSrc` 는 표시용(src 기준), `rel` 은 라우트 소유 판정용(app 기준)이다.
 * 주석 속 인용은 세지 않는다 — 공용 판정(scripts/code-without-comments.mjs)이 문자열은 두고 주석만 지운다. 종전의 문자 상태 기계는
 * 문자열 속 `/*` 에서 블록 주석을 열어 그 뒤의 역참조를 놓쳤다(FE-CONTRACT-01).
 */
export function sourceViolations(relFromSrc: string, rel: string, rawSource: string): string[] {
  const found: string[] = [];
  const source = codeWithoutComments(rawSource, relFromSrc);
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
  return found;
}

export function findViolations(): string[] {
  const found: string[] = [];
  for (const file of productionSourceFiles(SRC, ['.ts', '.tsx'])) {
    // 표시는 src 기준, 라우트 소유 판정은 app 기준(app 밖 파일은 어떤 라우트도 소유하지 않는다).
    const relFromSrc = path.relative(SRC, file).replace(/\\/g, '/');
    const rel = path.relative(APP, file).replace(/\\/g, '/');
    for (const entry of sourceViolations(relFromSrc, rel, fs.readFileSync(file, 'utf8'))) {
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

  it('객체 리터럴의 링크 키도 내비게이션으로 센다 — 링크 목록과 슬롯 기여', () => {
    // 모집단에서 동적 자리가 없는 page-redirect 하나를 고른다(생성물에서도 남는 것). 첫 시험이 모집단이 비지 않음을 본다.
    const redirect = patterns.find((p) => p.kind === 'page-redirect' && !p.segs.some(isDynamic));
    expect(redirect).toBeDefined();
    const fixture = (body: string) => sourceViolations('extensions/x/shell-links.ts', '../extensions/x/shell-links.ts', body);
    for (const key of ['href', 'url', 'link', 'moreHref']) {
      expect(fixture(`export default [{ id: 'x', ${key}: '${redirect!.route}', label: 'x' }];`), key).toHaveLength(1);
    }
    // 대조: 타입 주석, 라우트가 아닌 경로, 주석 속 인용은 세지 않는다.
    expect(fixture(`interface Link { href: string; url: string }\nconst api = { url: '/api/v1/x' };\n// href: '${redirect!.route}'\n`)).toEqual([]);
  });

  it('문자열 속 주석 기호 뒤의 역참조도 잡는다', () => {
    // 실측 모양(FE-CONTRACT-01): 게시글 상세의 목록 출처 '/cop/cmy/selectCommunityDetail/*' 뒤에 둔 router.push 를 종전 문자 상태
    //   기계가 블록 주석으로 보고 놓쳤다(같은 줄을 파일 맨 위에 두면 잡았다). DEC-OPS-081 이 실제로 잡았던 결함 형태다.
    const redirect = patterns.find((p) => p.kind === 'page-redirect' && !p.segs.some(isDynamic));
    expect(redirect).toBeDefined();
    const source = [
      "const BOARD_LIST_ORIGINS = ['/admin/help', '/cop/cmy/selectCommunityDetail/*'] as const;",
      `const back = () => router.push('${redirect!.route}');`,
      '/* 블록 주석 */',
    ].join('\n');
    expect(sourceViolations('app/x/BoardDetailClient.tsx', 'x/BoardDetailClient.tsx', source)).toHaveLength(1);
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
    // 선택하지 않은 기능의 파일은 생성물에서 투영으로 빠진다 — 원장에 있고 실제로 없는 파일만 뺀다(원본에서는 그대로다).
    //   예시 라우트가 빠진 생성물에서는 그 라우트의 단언만 뺀다(원장이 page 파일의 부재를 확인한다).
    const expectRedirect = (target: string, route: string) => {
      if (inProjection(path.join(APP, ...route.split('/').filter(Boolean), 'page.tsx'))) expect(flagged(target)).toBe(route);
    };

    /*
      §A3-1 이행 4라우트는 종전 전용 가드(a3-1-migrated-route-guard)가 문자열로 하드코딩해
      지키던 대상이다. 이 가드가 그것을 **대체**하므로, 넷을 여기서 명시적으로 고정한다 —
      일반화하면서 보호가 약해지지 않았음을 이 네 줄이 증명한다.
    */
    expectRedirect('/admin/collaboration/address-book/insert-address-book', '/admin/collaboration/address-book/insert-address-book');
    expectRedirect('/admin/collaboration/scraps/insertScrap', '/admin/collaboration/scraps/insertScrap');
    expectRedirect('/admin/collaboration/scraps/selectScrapDetail/${item.scrapSn}', '/admin/collaboration/scraps/selectScrapDetail/[id]');
    expectRedirect('/admin/survey/manage/create', '/admin/survey/manage/create');

    // 이번에 새로 드러난 것 — 업무 홈의 '새 게시글 작성' 이 가리키던 곳.
    expectRedirect('/admin/community/boards', '/admin/community/boards');

    // 형제 정적 라우트 — Next 는 정적이 동적을 이긴다.
    expect(flagged('/admin/community/boards/detail?bbsId=${x}')).toBeNull();
    expect(flagged('/admin/community/boards/insert-board-article?bbsId=${x}')).toBeNull();
    expect(flagged('/admin/community/boards/master')).toBeNull();
    expect(flagged('/admin/collaboration/scraps/selectScrapList')).toBeNull();
  });
});
