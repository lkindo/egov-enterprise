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

export const ROUTE_CENSUS_PATH = 'config/ui-route-capabilities.json';
export const COMPOSER_AREAS = Object.freeze([
  { id: 'communication', label: '소통·협업', domains: ['mail', 'sms', 'note', 'notification', 'addressbook', 'scrap'] },
  { id: 'knowledge', label: '지식·커뮤니티', domains: ['board', 'comment', 'help', 'system', 'template', 'isg'] },
  { id: 'work', label: '업무 지원', domains: ['informalsanction', 'operation', 'report', 'schedule', 'memoreport'] },
  { id: 'participation', label: '분석·참여', domains: ['survey', 'dashboard'] },
]);

export const CAPABILITY_SUMMARIES = Object.freeze({
  addressbook: '주소록과 연락처 관리',
  board: '게시판과 자주 묻는 질문·질의응답·위키',
  comment: '게시글 댓글과 댓글 관리',
  dashboard: '업무 홈 실시간 연결·오늘 게시글·전체 미읽음 알림',
  help: '도움말과 온라인 매뉴얼',
  informalsanction: '기안·결재·참조와 결재함',
  isg: '인터넷 서비스 안내 문구 등록·관리',
  mail: '메일 작성·발송과 발송 이력',
  memoreport: '메모 보고와 지시',
  note: '쪽지 보내기·받기',
  notification: '알림 센터와 실시간 알림',
  operation: '행사·외부인사·포상 관리',
  report: '개인 업무 보고',
  schedule: '개인·부서 일정',
  scrap: '게시글 스크랩',
  sms: '문자 발송과 결과 확인',
  survey: '설문조사와 여론조사·투표',
  system: '커뮤니티·배너·팝업 관리',
  template: '커뮤니티가 고르는 템플릿 원장 관리',
});

export const PRESET_LABELS = Object.freeze({
  core: '공통 기반만',
  collaboration: '협업 기본',
  demo: '전체 참조 기능',
});

function copyProblem(text, { max }) {
  if (typeof text !== 'string' || !text.trim()) return 'is empty';
  if (/[A-Za-z]/.test(text)) return 'contains Latin text such as a capability id';
  if ([...text].length > max) return `is longer than ${max} characters`;
  return null;
}

/** 라우트 원장의 경로별 종류(page·page-redirect·config-redirect). */
export function loadRouteKinds(root) {
  const census = JSON.parse(readFileSync(join(root, ROUTE_CENSUS_PATH), 'utf8'));
  return new Map(census.routes.map(row => [row.route, row.routing.kind]));
}

/** 카탈로그와 대조한 표시 문구. 어긋나면 이유와 함께 실패한다. */
export function composerPresentation(catalog, { routeKinds, areas = COMPOSER_AREAS, summaries = CAPABILITY_SUMMARIES, presetLabels = PRESET_LABELS } = {}) {
  if (!(routeKinds instanceof Map)) throw new Error('route kinds from the route census are required');
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
