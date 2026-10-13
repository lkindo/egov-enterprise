/**
 * 생성기 화면의 표시 문구(설계서 14.1·E3·E9): 업무 영역 분류, 기능 카드 요약, 시작 구성의 한국어 이름.
 *
 * 카탈로그 해시 밖에 둔다. 문구를 고쳐도 구성 해시와 생성물이 바뀌지 않아야 하기 때문이다
 * (미배정 권한 안내와 같은 원칙, DEC-OPS-242 ④). 엔진이 카탈로그를 내보낼 때 `presentation` 으로 덧붙인다.
 *
 * 선언은 실제 카탈로그와 양방향으로 대조한다. 기능이 생겼는데 영역·요약이 없거나, 기능이 사라졌는데
 * 선언이 남거나, 시작 구성의 이름이 빠지면 실패한다. 화면 문구에는 기능 id 같은 영문 식별자를 쓰지 않는다.
 * 요약은 그 기능이 실제로 제공하는 화면만 말한다(없는 일지·결재 양식·공개 게시를 약속하지 않는다).
 *
 * 카드의 '화면' 수는 라우트 원장(config/ui-route-capabilities.json)에서 실제 페이지인 경로만 센다.
 * 리다이렉트 별칭은 화면이 아니다.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadComposerModules } from './composer-modules.mjs';

export const ROUTE_CENSUS_PATH = 'config/ui-route-capabilities.json';

function copyProblem(text, { max }) {
  if (typeof text !== 'string' || !text.trim()) return 'is empty';
  if (/[A-Za-z]/.test(text)) return 'contains Latin text such as a capability id';
  if ([...text].length > max) return `is longer than ${max} characters`;
  return null;
}

/** 매니페스트 v2(config/modules)의 표시 문구 — 업무 영역(core.json 의 영역과 기능 파일의 영역·순서), 기능 요약, 시작 구성 이름. */
export function loadComposerPresentationDeclarations(root) {
  const { presentation } = loadComposerModules(root).extras;
  return { areas: presentation.areas, summaries: presentation.summaries, presetLabels: presentation.presetLabels };
}

/** 라우트 원장의 경로별 종류(page·page-redirect·config-redirect). */
export function loadRouteKinds(root) {
  const census = JSON.parse(readFileSync(join(root, ROUTE_CENSUS_PATH), 'utf8'));
  return new Map(census.routes.map(row => [row.route, row.routing.kind]));
}

/**
 * 카탈로그와 대조한 표시 문구. 어긋나면 이유와 함께 실패한다. 업무 영역·요약·시작 구성 이름은 매니페스트 v2 의 표시 문구다
 * (loadComposerPresentationDeclarations — 11단계 C7 에서 이 모듈의 상수를 걷었다).
 */
export function composerPresentation(catalog, { routeKinds, areas, summaries, presetLabels } = {}) {
  if (!(routeKinds instanceof Map)) throw new Error('route kinds from the route census are required');
  if (!Array.isArray(areas) || !summaries || !presetLabels) throw new Error('presentation declarations from config/modules are required');
  const ids = catalog.capabilities.map(capability => capability.id);
  const known = new Set(ids);
  const placed = new Map();
  const areaIds = new Set();
  const areaLabels = new Set();
  for (const area of areas) {
    const problem = copyProblem(area.label, { max: 12 });
    if (problem) throw new Error(`area label ${problem}: ${area.id}`);
    if (areaIds.has(area.id) || areaLabels.has(area.label)) throw new Error(`area is declared twice: ${area.id}`);
    areaIds.add(area.id); areaLabels.add(area.label);
    if (!area.domains.length) throw new Error(`area has no capability: ${area.id}`);
    for (const domain of area.domains) {
      if (!known.has(domain)) throw new Error(`area lists an unknown capability: ${area.id}/${domain}`);
      if (placed.has(domain)) throw new Error(`capability is in two areas: ${domain}`);
      placed.set(domain, area.id);
    }
  }
  const unplaced = ids.filter(id => !placed.has(id)).sort();
  if (unplaced.length) throw new Error(`capability has no area: ${unplaced.join(', ')}`);
  for (const id of ids) {
    if (!Object.hasOwn(summaries, id)) throw new Error(`capability has no summary: ${id}`);
    const problem = copyProblem(summaries[id], { max: 30 });
    if (problem) throw new Error(`summary ${problem}: ${id}`);
  }
  const staleSummaries = Object.keys(summaries).filter(id => !known.has(id)).sort();
  if (staleSummaries.length) throw new Error(`summary has no capability: ${staleSummaries.join(', ')}`);
  const presetIds = catalog.presets.map(preset => preset.id);
  for (const id of presetIds) {
    if (!Object.hasOwn(presetLabels, id)) throw new Error(`preset has no label: ${id}`);
    const problem = copyProblem(presetLabels[id], { max: 12 });
    if (problem) throw new Error(`preset label ${problem}: ${id}`);
  }
  const stalePresets = Object.keys(presetLabels).filter(id => !presetIds.includes(id)).sort();
  if (stalePresets.length) throw new Error(`preset label has no preset: ${stalePresets.join(', ')}`);
  const screens = {};
  for (const capability of catalog.capabilities) {
    const unknown = capability.frontend.routes.filter(route => !routeKinds.has(route));
    if (unknown.length) throw new Error(`route census lacks a capability route: ${capability.id} ${unknown.join(', ')}`);
    screens[capability.id] = capability.frontend.routes.filter(route => routeKinds.get(route) === 'page').length;
  }
  return {
    areas: areas.map(area => ({ id: area.id, label: area.label, domains: [...area.domains] })),
    summaries: Object.fromEntries(ids.map(id => [id, summaries[id]])),
    presets: Object.fromEntries(presetIds.map(id => [id, { label: presetLabels[id] }])),
    screens,
  };
}
