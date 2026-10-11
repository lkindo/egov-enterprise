/**
 * 화면 생존 기대값(슬롯 단계 PR-1, 설계서 11장 '항진인 dangling 검사는 기대 생존 화면 대조로 대체').
 *
 * 구성이 남겨야 할 등록 화면을 기능 소유로 계산하고, 실제로 남는 화면과 양방향으로 대조한다. 빠진 화면(missing)은
 * 선택한 기능의 화면이 연쇄로 지워졌다는 뜻이고, 남은 화면(extra)은 빠진 기능의 화면이 투영 뒤에도 남았다는 뜻이다.
 *
 * 기대값은 프리셋 removePaths 로 거르지 않는다. 지우는 목록과 같은 목록으로 기대값을 거르면, 경로를 다른 pack 의
 * removePaths 에 잘못 넣는 실수가 기대값도 함께 줄여 붉지 않는다. 그래서 기능 소유(core 화면 + 포함 기능의 화면 +
 * 모든 기능이 포함된 공유 화면)에서 시작해, 거버넌스 투영이 하는 리다이렉트 수렴만 더한다.
 *
 * 생성기(연쇄 직후)·정밀 점검·거버넌스 무결성(생성물)·시험이 같은 함수를 쓴다. 라우트 종류와 리다이렉트 목적지는
 * 라우트 원장이 원천이다(원장은 화면 소스와 대조하는 계약이 지킨다).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROUTE_LEDGER_PATH = 'config/ui-route-capabilities.json';
const ROUTING_KINDS = new Set(['page', 'page-redirect', 'config-redirect']);

/** 라우트 원장을 `route → { route, source, kind, target }` 으로 읽는다. 종류를 모르거나 목적지 없는 리다이렉트는 실패한다. */
export function routeRowsFromLedger(ledger) {
  if (!Array.isArray(ledger?.routes) || ledger.routes.length === 0) throw new Error('route ledger has no routes');
  const rows = new Map();
  for (const row of ledger.routes) {
    const kind = row?.routing?.kind;
    if (typeof row?.route !== 'string' || typeof row?.source !== 'string' || !ROUTING_KINDS.has(kind)) {
      throw new Error(`route ledger row lacks a known routing kind: ${row?.route}`);
    }
    if (kind !== 'page' && typeof row.routing.target !== 'string') throw new Error(`redirect route lacks a target: ${row.route}`);
    if (rows.has(row.route)) throw new Error(`duplicate route ledger row: ${row.route}`);
    rows.set(row.route, { route: row.route, source: row.source, kind, target: row.routing.target });
  }
  return rows;
}

export const readRouteRows = root => routeRowsFromLedger(JSON.parse(readFileSync(join(root, ROUTE_LEDGER_PATH), 'utf8')));

/** 리다이렉트 목적지를 라우트로 바꾼다. 거버넌스 투영과 같은 규칙이다: 쿼리를 떼고 `${x}` 를 `[x]` 로 쓴다. */
export const redirectTargetRoute = target => target.split('?')[0].replace(/\$\{([^}]+)\}/gu, '[$1]');

/**
 * 거버넌스 투영의 리다이렉트 정리를 디스크 없이 한다. 목적지가 남는 화면 집합에 없는 리다이렉트 화면(page-redirect·config-redirect)을
 * 수렴할 때까지 뺀다. 거버넌스 투영(projectRemovedRouteAliases)은 config-redirect 도 next.config 선언과 페이지 파일을 함께 지운다.
 * 원장에 없는 목적지는 거버넌스처럼 실패한다.
 */
export function convergeRedirectPages(routes, rows) {
  const kept = new Set(routes);
  for (;;) {
    const dropped = [...kept].filter(route => {
      const row = rows.get(route);
      if (!row || row.kind === 'page') return false;
      const target = redirectTargetRoute(row.target);
      if (!rows.has(target)) throw new Error(`Redirect target was not an upstream page: ${row.target} (${route})`);
      return !kept.has(target);
    });
    if (dropped.length === 0) return kept;
    for (const route of dropped) kept.delete(route);
  }
}

/**
 * 어느 구성에서나 남아야 하는 화면이다. 홈은 로그인 착지이자 권한 부족 복귀 목적지이고(DEC-OPS-083), 로그인은 진입점이다.
 * 카탈로그가 이 둘을 core 소유로 계산하지 못하면 기대값을 만들지 않는다 — 기능 소유가 바뀌어 홈이 어떤 기능과 함께 빠지는
 * 일을 소유 계산이 조용히 받아들이지 않게, 종전의 홈·로그인 필수 진입점 검사를 카탈로그와 무관하게 고정한다.
 */
export const REQUIRED_SCREENS = Object.freeze(['/', '/login']);

/** 구성이 남겨야 할 등록 화면. 카탈로그의 소유 라우트가 원장에 없으면 실패한다(라우트 원장과 권한 원장이 어긋났다). */
export function expectedPageRoutes(catalog, composition, rows) {
  for (const route of REQUIRED_SCREENS) if (!catalog.core.menuRoutes.includes(route)) throw new Error(`required screen is not a core route: ${route}`);
  const included = new Set(composition.resolvedDomains);
  const owned = [
    ...catalog.core.menuRoutes,
    ...catalog.capabilities.filter(feature => included.has(feature.id)).flatMap(feature => feature.menuRoutes),
    ...catalog.sharedUi.filter(group => group.domains.every(domain => included.has(domain))).flatMap(group => group.routes),
  ];
  for (const route of owned) if (!rows.has(route)) throw new Error(`catalog route has no route ledger row: ${route}`);
  return convergeRedirectPages(owned, rows);
}

/** 생성기·정밀 점검이 대조에 쓰는 입력. `root` 의 라우트 원장과 카탈로그·구성으로 만든다. */
export function pageSurvivalExpectation({ root, catalog, composition }) {
  const rows = readRouteRows(root);
  return { rows, expected: expectedPageRoutes(catalog, composition, rows) };
}

/**
 * 실제로 남는 화면(`survives(source)` 가 참인 원장 행)과 기대값을 대조한다. 거버넌스 투영 전(생성기 연쇄 직후·정밀 점검)에는
 * 그 투영이 할 리다이렉트 수렴을 실제 쪽에도 한다. 투영 뒤의 디스크(생성물 무결성)는 `convergeActual: false` 로 그대로 본다 —
 * 거버넌스가 남긴 목적지 없는 리다이렉트 화면을 수렴으로 가리지 않기 위해서다.
 * 결과는 라우트 순서로 정렬한 `{ route, source }` 목록이다. source 는 저장소 기준 페이지 경로다.
 */
export function pageSurvivalViolations({ rows, expected, survives, convergeActual = true }) {
  const present = [...rows.values()].filter(row => survives(row.source)).map(row => row.route);
  const actual = convergeActual ? convergeRedirectPages(present, rows) : new Set(present);
  const entries = routes => [...routes].sort((left, right) => left.localeCompare(right)).map(route => ({ route, source: rows.get(route).source }));
  return {
    missing: entries([...expected].filter(route => !actual.has(route))),
    extra: entries([...actual].filter(route => !expected.has(route))),
  };
}

export const describeRoutes = entries => entries.map(entry => entry.route).join(', ');

/**
 * 생성물 무결성 검사의 화면 대조. 원본 라우트 원장 스냅숏(`ledger`)과 구성으로 기대값을 만들고, 거버넌스 투영까지 끝난
 * 디스크의 page 파일(`pageSources`, 저장소 기준 경로)을 수렴 없이 대조한다. 오류 문장 목록을 돌려준다.
 */
export function artifactScreenErrors({ ledger, catalog, composition, pageSources }) {
  try {
    const rows = routeRowsFromLedger(ledger);
    const { missing, extra } = pageSurvivalViolations({ rows, expected: expectedPageRoutes(catalog, composition, rows),
      survives: source => pageSources.has(source), convergeActual: false });
    return missing.length || extra.length
      ? [`Projected screens differ from the composition: missing [${describeRoutes(missing)}] extra [${describeRoutes(extra)}]`] : [];
  } catch (error) {
    return [`Projected screens cannot be compared with the composition: ${error.message}`];
  }
}
