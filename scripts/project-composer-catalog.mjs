import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { domainSupportFiles, supportFileDirectoryDomain } from './project-composer-source.mjs';
import { degradationPredicate, deriveEventTriples, requiresClosure, resolveIntegrations, sourceOwner } from './project-composer-integrations.mjs';
import { menuRouteKey } from './project-composer-db.mjs';
import { attachUserReasons } from './project-composer-reasons.mjs';
import { COMPOSER_MENU_SNAPSHOT_PATH } from './project-composer-menu-preview.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = 'config/reusable-base-profiles.json';
const PERMISSIONS = 'config/governance/permission-catalog.json';
const APP_ROOT = 'business-app/src/main/java/nuri/business';
const sorted = values => [...new Set(values)].sort();
const slash = value => value.split(sep).join('/');

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function compositionDigest(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function fail(message) { throw new Error(`project-composer catalog: ${message}`); }
function walk(directory) {
  if (!existsSync(directory)) return [];
  if (!statSync(directory).isDirectory()) return [directory];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(join(directory, entry.name)) : [join(directory, entry.name)]).sort();
}

// These declarations refine the existing pack ownership. Database ownership and
// backend paths are discovered below, never copied into a second table manifest.
// 메뉴는 경로를 소유한 기능에 속한다. `menuTabs` 는 다른 기능의 셸에 이 기능이 기여한 탭 메뉴이고,
// 셸이 남아 있어도 이 기능이 빠지면 숨긴다. 선언은 메뉴 스냅숏의 실제 행과 맞아야 한다.
const FEATURES = {
  addressbook: { label: '주소록', permissions: ['ADBK'], paths: [
    'src/app/admin/collaboration/address-book', 'src/services/business/user/addressbook', 'src/types/business/addressbook.ts'], routes: ['/admin/collaboration/address-book'] },
  board: { label: '게시판·지식', permissions: ['BOARD', 'BBS_MST', 'SATISFY', 'NOTICE', 'FAQ'], paths: [
    'src/app/actions/boardActions.ts', 'src/services/business/user/board/BoardUserService.ts',
    'src/services/foundation/system/BoardAdminService.ts', 'src/services/business/board/SatisfactionService.ts',
    'src/services/business/knowledge/knowledgeService.ts', 'src/app/admin/community/boards',
    // Phase 0c: 게시물·자료 이용 통계 화면은 게시판 데이터만 보여 준다. 통계 셸·나머지 통계 화면은 core 다.
    'src/app/admin/stats/board', 'src/app/admin/stats/data-usage'],
  routes: ['/admin/community/boards', '/admin/stats/board', '/admin/stats/data-usage'], menuTabs: ['/admin/help/faq?tab=WIKI', '/admin/help/faq?tab=FAQ', '/admin/help/faq?tab=QNA'] },
  comment: { label: '댓글', permissions: ['COMMENT'], paths: [
    'src/app/actions/commentActions.ts', 'src/services/business/comment/commentService.ts',
    'src/services/foundation/system/CommentAdminService.ts', 'src/app/admin/system/comments'],
  routes: ['/admin/system/comments'] },
  dashboard: { label: '실시간 대시보드', permissions: [], paths: [
    'src/app/dashboard-data.ts', 'src/components/features/dashboard/RealTimeDashboard.tsx'], routes: [] },
  help: { label: '도움말·온라인 매뉴얼', permissions: ['HELP'], paths: [
    'src/app/admin/help', 'src/app/admin/system/hpcm', 'src/app/admin/uss/olh', 'src/app/help',
    'src/services/business/user/help', 'src/services/foundation/system/HpcmAdminService.ts', 'src/services/foundation/user'],
  routes: ['/admin/help', '/admin/system/hpcm', '/admin/uss/olh', '/help'] },
  informalsanction: { label: '약식 전자결재', permissions: ['INFORMAL', 'APPROVAL', 'WORKFLOW'], paths: [
    'src/app/admin/sanctn/workflow', 'src/app/admin/system/ism', 'src/app/admin/workflow', 'src/app/approvals',
    'src/services/business/user/approval'], routes: ['/admin/sanctn/workflow', '/admin/system/ism', '/admin/workflow', '/approvals'] },
  isg: { label: '인터넷 서비스 안내', permissions: ['SERVICE'], paths: [
    'src/app/admin/system/isg', 'src/services/foundation/system/InternetSvcGuidanceAdminService.ts'], routes: ['/admin/system/isg'] },
  mail: { label: '메일', permissions: ['MAIL'], paths: [
    'src/services/business/mail/MailService.ts', 'src/app/admin/collaboration/mail-history', 'src/app/admin/collaboration/mail-send'],
  routes: ['/admin/collaboration/mail-history', '/admin/collaboration/mail-send'], requirements: ['메일 발송에 사용할 SMTP 설정'] },
  memoreport: { label: '메모 보고', permissions: ['MEMO_RPT'], paths: [
    'src/services/business/memoreport', 'src/app/admin/operation/memo-reports'], routes: ['/admin/operation/memo-reports'] },
  note: { label: '쪽지', permissions: ['NOTE'], paths: ['src/services/business/user/NoteService.ts', 'src/app/note', 'src/app/components/dashboard/UnreadNotesCard.tsx'],
    routes: ['/note'] },
  notification: { label: '알림', permissions: ['NOTI'], paths: [
    'src/app/components/layout/header-notifications.tsx', 'src/app/components/ui/app-notification-drawer.tsx',
    'src/lib/hooks/use-notifications.ts', 'src/services/foundation/system/NotificationAdminService.ts', 'src/app/admin/notifications'],
  routes: ['/admin/notifications'] },
  operation: { label: '행사·외부인사·포상', permissions: ['EVENT', 'EXT_HR', 'REWARD'], paths: [
    'src/app/admin/operation/events', 'src/app/admin/operation/external-hr', 'src/app/admin/operation/rewards',
    'src/app/admin/operation/rough-map', 'src/services/foundation/operation/OperationAdminService.ts',
    'src/services/foundation/operation/eventService.ts', 'src/services/foundation/operation/__tests__/eventService.test.ts',
    'src/app/admin/operation/error.tsx', 'src/app/admin/operation/__tests__'],
  routes: ['/admin/operation/events', '/admin/operation/external-hr', '/admin/operation/rewards', '/admin/operation/rough-map'] },
  report: { label: '업무 보고', permissions: ['WORK_RPT'], paths: [
    'src/app/smart-toolkit/work-report', 'src/components/business/report', 'src/services/business/user/ReportService.ts'],
  routes: ['/smart-toolkit/work-report'] },
  schedule: { label: '일정·일지', permissions: ['SCHEDULE'], paths: [
    'src/app/smart-toolkit/schedule', 'src/components/business/schedule', 'src/services/business/schedule', 'src/types/business/schedule.ts'],
  routes: ['/smart-toolkit/schedule'] },
  scrap: { label: '스크랩', permissions: ['SCRAP'], paths: [
    'src/services/business/user/ScrapService.ts', 'src/app/admin/collaboration/scraps'],
  routes: ['/admin/collaboration/scraps'] },
  sms: { label: '문자 발송', permissions: ['SMS'], paths: [
    'src/services/foundation/operation/SmsAdminService.ts', 'src/app/admin/uss/ion/sms', 'src/app/cop/sms'],
  routes: ['/admin/uss/ion/sms', '/cop/sms'], requirements: ['문자 발송 공급자 설정'] },
  survey: { label: '설문·투표', permissions: ['SURVEY', 'SURVEY_RSP', 'POLL'], paths: [
    'src/app/admin/survey', 'src/app/survey', 'src/lib/api/survey.ts', 'src/services/business/user/poll',
    'src/services/foundation/survey', 'src/services/foundation/system/SurveyAdminService.ts', 'src/types/business/poll.ts', 'src/types/business/survey.ts'],
  routes: ['/admin/survey', '/survey'] },
  system: { label: '커뮤니티·배너·팝업', permissions: ['COMMUNITY', 'BANNER', 'POPUP'], paths: [
    'src/app/actions/promotionActions.ts', 'src/app/components/dashboard/BannerSlider.tsx', 'src/app/components/dashboard/PopupManager.tsx',
    'src/app/admin/community/[id]', 'src/app/admin/community/board', 'src/app/admin/community/page.tsx',
    'src/app/admin/patterns', 'src/app/admin/system/banner', 'src/app/admin/system/layout', 'src/app/cop/cmy',
    'src/app/admin/system/monitoring/components/HarnessAtlasPanels.tsx',
    'src/services/business/community', 'src/services/business/user/BannerService.ts', 'src/services/business/user/PopupService.ts',
    'src/services/foundation/system/BannerAdminService.ts', 'src/services/foundation/system/CommunityAdminService.ts',
    'src/services/foundation/system/PopupAdminService.ts', 'src/types/business/community.ts', 'src/types/foundation/banner.ts'],
  routes: ['/admin/community', '/admin/community/[id]', '/admin/community/board', '/admin/patterns', '/admin/system/banner', '/admin/system/layout', '/cop/cmy'],
  exactRoutes: ['/admin/community'], menuTabs: ['/admin/help?tab=COMMUNITY'] },
  template: { label: '템플릿', permissions: ['TEMPLATE'], paths: [
    'src/app/admin/community/templates', 'src/app/admin/sanctn/forms', 'src/services/foundation/system/TemplateAdminService.ts'],
  routes: ['/admin/community/templates', '/admin/sanctn/forms'] },
};

// Required only by explicit domain selections. Legacy presets retain their
// existing reduced route surface; their pack projection is unchanged.
const SHARED_UI = [
  { id: 'collaboration-hub', domains: ['note', 'scrap'],
    paths: ['src/app/admin/collaboration/page.tsx', 'src/app/admin/collaboration/CollaborationHubClient.tsx'],
    routes: ['/admin/collaboration'], reason: '쪽지·스크랩 공동 화면이 두 기능의 서비스와 폼을 직접 참조한다.',
    evidence: 'frontend/src/app/admin/collaboration/CollaborationHubClient.tsx' },
  { id: 'knowledge-hub', domains: ['board', 'help', 'system'], paths: [], routes: [],
    reason: '지식·커뮤니티 공동 화면이 게시판 서비스, 도움말 헬퍼와 커뮤니티 관리 폼을 직접 참조한다.',
    evidence: 'frontend/src/app/admin/help/KnowledgeHubClient.tsx' },
  { id: 'work-hub', domains: ['report', 'schedule'],
    paths: ['src/app/admin/work-hub', 'src/app/smart-toolkit/dept-job/layout.tsx'], routes: ['/admin/work-hub'],
    reason: '업무 허브가 업무 보고와 일정 조회·작성 컴포넌트를 직접 참조한다.',
    evidence: 'frontend/src/app/admin/work-hub/WorkHubClient.tsx' },
];

const UI_DEPENDENCIES = [
  { from: 'system', domain: 'template', reason: '커뮤니티 관리 폼이 템플릿 조회 서비스를 직접 참조한다.',
    evidence: 'frontend/src/components/business/community/CommunityManageDialog.tsx', symbol: 'TemplateAdminService' },
];

const OPTIONAL_FOREIGN_KEYS = [{
  name: 'fk_tb_bbs_master_tb_cmnty_info', childTable: 'tb_bbs_master', parentTable: 'tb_cmnty_info',
  sourceDomain: 'board', targetDomain: 'system',
  reason: '커뮤니티 귀속은 선택 연동이며 기존 collaboration 투영에서도 커뮤니티 없는 게시판을 제공한다.',
  evidence: 'api-server/src/main/resources/db/migration/V2_102__add_reference_integrity_fks.sql',
}];

/*
 * 기능 사이의 필수 물리 외래 키. 자식 테이블을 고르면 부모 테이블도 있어야 DB 투영이 성공한다.
 * 해석기는 이 목록으로 위반을 계획 단계에서 찾고(자동 포함하지 않음), DB 생성기는 실제로 적용한
 * 스키마의 기능 사이 외래 키가 이 목록과 OPTIONAL_FOREIGN_KEYS 의 합과 정확히 같은지 대조한다.
 * 2026-10-07 전체 마이그레이션 적용 결과에서 기능 사이 외래 키는 5개와 선택 1개뿐이었다.
 * Phase 0c 에서 자료 이용 기록(tb_dta_use_stats)이 게시판 소유가 되어 그 외래 키가 기능 안으로 들어왔고,
 * 이제 이 4개와 선택 1개다. 설문만 골라도 게시판이 필요 없는 이유다.
 */
const REQUIRED_FOREIGN_KEYS = [
  { name: 'fk_tb_bbs_comment_tb_bbs_item', childTable: 'tb_bbs_comment', parentTable: 'tb_bbs_item', sourceDomain: 'comment', targetDomain: 'board',
    reason: '댓글은 게시글에 속한다.', evidence: 'api-server/src/main/resources/db/migration/V2_69__board_post_bigint_identity.sql' },
  { name: 'fk_tb_bbs_comment_tb_bbs_master', childTable: 'tb_bbs_comment', parentTable: 'tb_bbs_master', sourceDomain: 'comment', targetDomain: 'board',
    reason: '댓글은 게시판에 속한다.', evidence: 'api-server/src/main/resources/db/migration/V2_14__add_referential_fks_batch2.sql' },
  { name: 'fk_tb_bbs_scrap_tb_bbs_item', childTable: 'tb_bbs_scrap', parentTable: 'tb_bbs_item', sourceDomain: 'scrap', targetDomain: 'board',
    reason: '스크랩은 게시글을 가리킨다.', evidence: 'api-server/src/main/resources/db/migration/V2_69__board_post_bigint_identity.sql' },
  { name: 'fk_tb_rward_manage_tb_ifml_atrz_info', childTable: 'tb_rward_manage', parentTable: 'tb_ifml_atrz_info', sourceDomain: 'operation', targetDomain: 'informalsanction',
    reason: '포상은 결재 문서를 참조한다.', evidence: 'api-server/src/main/resources/db/migration/V2_78__informal_sanction_bigint_identity.sql' },
];

function javaCode(source) {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    value => value.replace(/[^\r\n]/g, ' '));
}
function covers(prefix, candidate) { return candidate === prefix || candidate.startsWith(`${prefix}/`); }
function frontendRules(domains) {
  return [
    ...domains.flatMap(domain => FEATURES[domain].paths.map(path => ({ path, domains: [domain] }))),
    ...SHARED_UI.flatMap(group => group.paths.map(path => ({ path, domains: group.domains }))),
    { path: 'src/app/admin/sanctn/WorkflowHubClient.tsx', domains: ['informalsanction', 'template'], mode: 'any' },
  ];
}

/** Read-only producer inventory. Does not contact a DB, execute Git or create output. */
export function loadProjectComposerCatalog(root = ROOT) {
  root = resolve(root);
  const manifest = JSON.parse(readFileSync(join(root, MANIFEST), 'utf8'));
  const permissions = JSON.parse(readFileSync(join(root, PERMISSIONS), 'utf8'));
  for (const dependency of UI_DEPENDENCIES) {
    if (!readFileSync(join(root, dependency.evidence), 'utf8').includes(dependency.symbol)) fail(`declared UI dependency drifted: ${dependency.evidence}`);
  }
  const domainOwners = new Map();
  for (const [packId, pack] of Object.entries(manifest.packs)) for (const domain of pack.backend?.appDomains ?? []) {
    if (domainOwners.has(domain)) fail(`duplicate domain owner: ${domain}`);
    domainOwners.set(domain, packId);
  }
  const domains = sorted(domainOwners.keys());
  if (canonicalJson(domains) !== canonicalJson(Object.keys(FEATURES).sort())) fail('capability declarations differ from manifest appDomains');
  const tableOwners = new Map();
  const sequenceOwners = new Map();
  for (const [packId, pack] of Object.entries(manifest.packs)) {
    for (const [kind, values, owners] of [['table', pack.database?.tables ?? [], tableOwners], ['sequence', pack.database?.sequences ?? [], sequenceOwners]]) {
      for (const value of values) { if (owners.has(value)) fail(`duplicate ${kind} owner: ${value}`); owners.set(value, packId); }
    }
  }
  const inventory = new Map(domains.map(domain => [domain, { files: [], tables: [], sequences: [], edges: [] }]));
  const sourceFingerprints = UI_DEPENDENCIES.map(({ evidence }) => ({ path: evidence,
    sha256: compositionDigest(readFileSync(join(root, evidence), 'utf8').replace(/\r\n/g, '\n')) }));
  const supportRequirements = new Map();
  const supportFiles = domainSupportFiles(root, manifest);
  for (const [domain, files] of supportFiles) for (const path of files) {
    inventory.get(domain).files.push(path);
    // 다른 도메인 디렉터리의 지원 파일은 그 도메인이 있어야 존재한다. 업무 앱 생산 소스의 지문은 아래 순회가 남긴다.
    const directoryDomain = supportFileDirectoryDomain(path);
    if (directoryDomain) {
      if (!inventory.has(directoryDomain)) fail(`support file directory domain is not selectable: ${path}`);
      const known = supportRequirements.get(domain) ?? [];
      if (!known.some(row => row.domain === directoryDomain)) supportRequirements.set(domain, [...known, { domain: directoryDomain, path }]);
    }
    if (!path.startsWith(`${APP_ROOT}/`)) sourceFingerprints.push({ path, sha256: compositionDigest(readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')) });
  }
  for (const absolute of walk(join(root, APP_ROOT)).filter(path => path.endsWith('.java'))) {
    const path = slash(relative(root, absolute));
    const domain = path.slice(APP_ROOT.length + 1).match(/^(?:domain|service)\/([^/]+)\//)?.[1];
    if (!inventory.has(domain)) fail(`unowned application source: ${path}`);
    const source = readFileSync(absolute, 'utf8');
    const owner = inventory.get(domain);
    owner.files.push(path);
    sourceFingerprints.push({ path, sha256: compositionDigest(source.replace(/\r\n/g, '\n')) });
    for (const match of source.matchAll(/@Table\s*\(\s*name\s*=\s*"([^"]+)"/g)) owner.tables.push(match[1]);
    for (const match of source.matchAll(/sequenceName\s*=\s*"([^"]+)"/g)) owner.sequences.push(match[1]);
    // Includes fully qualified field types (RewardManage), static and wildcard imports.
    for (const match of javaCode(source).matchAll(/(?<![\w$])nuri\.business\.(?:domain|service)\.([a-z][a-z0-9_]*)\./g)) {
      if (match[1] !== domain && inventory.has(match[1])) owner.edges.push({ domain: match[1], evidence: path });
    }
  }
  const sharedTables = manifest.sharedTableContracts ?? [];
  for (const shared of sharedTables) for (const consumer of shared.consumers) {
    if (!inventory.has(consumer) || !tableOwners.has(shared.table)) fail(`invalid shared table consumer: ${shared.table}/${consumer}`);
    inventory.get(consumer).tables.push(shared.table);
  }
  const ownedTables = new Map();
  for (const [domain, data] of inventory) for (const table of sorted(data.tables)) {
    if (!tableOwners.has(table)) fail(`entity table absent from manifest: ${domain}/${table}`);
    if (tableOwners.get(table) !== domainOwners.get(domain)
      && !sharedTables.some(shared => shared.table === table && shared.consumers.includes(domain))) fail(`cross-pack table lacks shared contract: ${domain}/${table}`);
    if (ownedTables.has(table) && !sharedTables.some(shared => shared.table === table
      && shared.consumers.includes(domain) && shared.consumers.includes(ownedTables.get(table)))) fail(`duplicate domain table without shared contract: ${table}`);
    ownedTables.set(table, domain);
  }
  for (const [table, pack] of tableOwners) if (pack !== 'core' && !ownedTables.has(table)) fail(`unowned optional table: ${table}`);
  for (const [sequence, pack] of sequenceOwners) if (pack !== 'core'
    && ![...inventory.values()].some(value => value.sequences.includes(sequence))) fail(`unowned optional sequence: ${sequence}`);

  const rules = frontendRules(domains);
  for (const rule of rules) if (!existsSync(join(root, 'frontend', rule.path))) fail(`frontend ownership path missing: ${rule.path}`);
  // Older packs own umbrella directories; verify every file against the
  // narrower feature declarations so new unowned UI cannot silently survive.
  const legacyFrontendPaths = Object.values(manifest.packs).flatMap(pack => pack.frontend?.removePaths ?? []);
  for (const path of legacyFrontendPaths) {
    if (!existsSync(join(root, 'frontend', path))) fail(`manifest frontend ownership path missing: ${path}`);
    for (const file of walk(join(root, 'frontend', path))) {
      const relativePath = slash(relative(join(root, 'frontend'), file));
      if (!rules.some(rule => covers(rule.path, relativePath))) fail(`frontend pack path has no capability refinement: ${relativePath}`);
    }
  }

  const declaredPermissionDomains = new Map();
  for (const domain of domains) for (const permissionDomain of FEATURES[domain].permissions) {
    if (declaredPermissionDomains.has(permissionDomain)) fail(`duplicate permission domain ownership: ${permissionDomain}`);
    if (!permissions.permissions.some(permission => permission.domain === permissionDomain)) fail(`unknown permission domain: ${permissionDomain}`);
    declaredPermissionDomains.set(permissionDomain, domain);
  }
  const allRoutes = Object.keys(permissions.pagePermissions).sort();
  for (const feature of Object.values(FEATURES)) for (const prefix of feature.routes) {
    if (!allRoutes.some(route => covers(prefix, route))) fail(`route declaration has no canonical page: ${prefix}`);
  }
  const routeOwners = new Map();
  for (const domain of domains) for (const route of allRoutes) {
    const feature = FEATURES[domain];
    if (feature.routes.some(prefix => (feature.exactRoutes ?? []).includes(prefix) ? route === prefix : covers(prefix, route))) {
      const previous = routeOwners.get(route);
      // Narrower paths override an umbrella (/admin/community vs its templates).
      const specificity = Math.max(...feature.routes.filter(prefix => covers(prefix, route)).map(prefix => prefix.length));
      if (!previous || specificity > previous.specificity) routeOwners.set(route, { domain, specificity });
      else if (specificity === previous.specificity && previous.domain !== domain) fail(`ambiguous route owner: ${route}`);
    }
  }
  const sharedRoutes = new Map(SHARED_UI.flatMap(group => group.routes.map(route => [route, group.domains])));
  const mandatoryPermissions = permissions.permissions.filter(permission => !declaredPermissionDomains.has(permission.domain)).map(permission => permission.code).sort();
  const mandatoryRoutes = allRoutes.filter(route => !routeOwners.has(route) && !sharedRoutes.has(route));
  // 간선마다 사용자용 한 문장을 붙인다. 선언과 간선이 어긋나면 여기서 실패한다(설계서 9.1 R5).
  const capabilities = attachUserReasons(domains.map(domain => {
    const feature = FEATURES[domain];
    const data = inventory.get(domain);
    if (!data.files.length) fail(`capability has no source: ${domain}`);
    const requires = [];
    for (const edge of data.edges) requires.push({ domain: edge.domain, kind: 'java', reason: `${domain} 소스가 ${edge.domain} 타입을 참조한다.`, evidence: edge.evidence });
    for (const support of supportRequirements.get(domain) ?? []) {
      requires.push({ domain: support.domain, kind: 'java', reason: `${domain} 이 쓰는 지원 구현이 ${support.domain} 소스에 있다.`, evidence: support.path });
    }
    for (const cluster of manifest.clusters ?? []) if (cluster.domains.includes(domain)) {
      for (const required of [...cluster.domains, ...(cluster.requiresDomains ?? [])].filter(item => item !== domain)) {
        requires.push({ domain: required, kind: 'manifest', reason: cluster.reason, evidence: `${MANIFEST}#clusters/${cluster.id}` });
      }
    }
    for (const cluster of SHARED_UI) if (cluster.domains.includes(domain)) {
      for (const required of cluster.domains.filter(item => item !== domain)) requires.push({ domain: required, kind: 'shared-ui', reason: cluster.reason, evidence: cluster.evidence, customOnly: true });
    }
    for (const dependency of UI_DEPENDENCIES.filter(row => row.from === domain)) {
      const { from, symbol, ...edge } = dependency;
      requires.push({ ...edge, kind: 'ui-import', customOnly: true });
    }
    return {
      id: domain, label: feature.label, description: `${feature.label}의 백엔드·화면·DB를 함께 포함합니다.`, available: true,
      pack: domainOwners.get(domain), requires: requires.sort((a, b) => canonicalJson(a) < canonicalJson(b) ? -1 : canonicalJson(a) > canonicalJson(b) ? 1 : 0),
      backend: { sourcePaths: ['domain', 'service'].map(layer => `${APP_ROOT}/${layer}/${domain}`).filter(path => existsSync(join(root, path))), sourceFiles: data.files.sort() },
      database: { tables: sorted(data.tables), explicitSequences: sorted(data.sequences) },
      frontend: { paths: feature.paths, routes: allRoutes.filter(route => routeOwners.get(route)?.domain === domain) },
      menuRoutes: allRoutes.filter(route => routeOwners.get(route)?.domain === domain),
      menuTabs: sorted(feature.menuTabs ?? []),
      permissionCodes: permissions.permissions.filter(permission => feature.permissions.includes(permission.domain)).map(permission => permission.code).sort(),
      requirements: feature.requirements ?? [],
    };
  }));
  // 탭 기여는 실제 메뉴 행과 셸 화면이 있어야 한다. 맞지 않는 선언은 아무 메뉴도 고르지 못한 채 조용히 남는다.
  const menuRows = JSON.parse(readFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), 'utf8')).menus
    .filter(row => row.use_yn === 'Y' && row.del_yn !== 'Y' && row.modern_route).map(row => menuRouteKey(row.modern_route).key);
  const tabContributors = new Map();
  for (const capability of capabilities) for (const route of capability.menuTabs) {
    const contribution = menuRouteKey(route);
    if (!contribution.tab || contribution.key !== route) fail(`menu tab must be a canonical path with one tab: ${route}`);
    if (!allRoutes.includes(contribution.path)) fail(`menu tab shell has no canonical page: ${route}`);
    if (!menuRows.includes(contribution.key)) fail(`menu tab has no active menu row: ${route}`);
    if (tabContributors.has(route)) fail(`menu tab has two contributors: ${route}`);
    tabContributors.set(route, capability.id);
  }
  for (const contract of [...REQUIRED_FOREIGN_KEYS, ...OPTIONAL_FOREIGN_KEYS]) {
    if (!readFileSync(join(root, contract.evidence), 'utf8').includes(`ADD CONSTRAINT ${contract.name}`)) fail(`declared foreign key drifted: ${contract.name}`);
    const owns = (domain, table) => capabilities.find(capability => capability.id === domain)?.database.tables.includes(table);
    if (!owns(contract.sourceDomain, contract.childTable) || !owns(contract.targetDomain, contract.parentTable)) fail(`declared foreign key ownership drifted: ${contract.name}`);
  }
  const presets = Object.entries(manifest.profiles).map(([id, profile]) => ({ id, label: id, description: profile.description,
    domains: sorted(profile.packs.flatMap(pack => manifest.packs[pack].backend?.appDomains ?? [])), packs: profile.packs,
    frontendRemovePaths: sorted(Object.entries(manifest.packs).filter(([pack]) => !profile.packs.includes(pack)).flatMap(([, pack]) => pack.frontend?.removePaths ?? [])) }));
  // 선택 연동: 발행·수신을 실제 소스에서 계산해 선언과 양방향으로 대조한다(설계서 9.1·B4).
  const supportOwners = new Map([...supportFiles].flatMap(([domain, files]) => files.map(file => [file, domain])));
  const integrates = resolveIntegrations({ root, triples: deriveEventTriples(root, sourceOwner(supportOwners, domains, requiresClosure(capabilities))),
    canDegrade: degradationPredicate(capabilities, presets), domains, optionalForeignKeys: OPTIONAL_FOREIGN_KEYS });
  const catalog = {
    schemaVersion: 1, mandatory: ['foundation', 'core'], databaseVendors: ['postgresql'], backendLayouts: ['multi-module', 'single-module'],
    provenance: { manifest: MANIFEST, permissions: PERMISSIONS, manifestHash: compositionDigest(manifest), permissionsHash: compositionDigest(permissions), sourceInventoryHash: compositionDigest(sourceFingerprints) },
    presets, capabilities, frontendRules: rules, sharedUi: SHARED_UI, integrates,
    core: { tables: sorted(manifest.packs.core.database.tables), explicitSequences: sorted(manifest.packs.core.database.sequences), permissionCodes: mandatoryPermissions, menuRoutes: mandatoryRoutes },
    sharedTableContracts: sharedTables, optionalForeignKeys: OPTIONAL_FOREIGN_KEYS, requiredForeignKeys: REQUIRED_FOREIGN_KEYS,
  };
  return { ...catalog, catalogHash: compositionDigest(catalog) };
}
