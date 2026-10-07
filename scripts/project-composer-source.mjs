/** Domain ownership rules for composing the existing source, without changing its module boundaries. */
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';

/** Exact support files follow their optional consumer while module dependencies stay unchanged. */
export function domainSupportFiles(root, manifest) {
  const result = new Map();
  const owners = new Set();
  const realRoot = realpathSync(root);
  for (const [pack, value] of Object.entries(manifest.packs ?? {})) {
    const declarations = value.backend?.domainSupportFiles ?? {};
    if (!declarations || typeof declarations !== 'object' || Array.isArray(declarations)) throw new Error(`Invalid domain support declarations: ${pack}`);
    for (const [domain, files] of Object.entries(declarations)) {
      if (!value.backend?.appDomains?.includes(domain) || result.has(domain)
        || !Array.isArray(files) || files.length === 0) throw new Error(`Invalid domain support owner: ${pack}/${domain}`);
      for (const file of files) {
        if (typeof file !== 'string'
          || !/^(?:foundation|business-core|api-server)\/src\/(?:main|test)\/java\/(?:[A-Za-z_$][\w$]*\/)+[A-Za-z_$][\w$]*\.java$/u.test(file)
          || owners.has(file)) throw new Error(`Invalid or duplicate domain support file: ${file}`);
        const absolute = resolve(root, file);
        if (!existsSync(absolute) || !statSync(absolute).isFile()) throw new Error(`Missing domain support file: ${file}`);
        const child = relative(realRoot, realpathSync(absolute));
        if (isAbsolute(child) || child === '..' || child.startsWith(`..${sep}`)
          || child.split(sep).join('/') !== file) throw new Error(`Unsafe domain support file: ${file}`);
        owners.add(file);
      }
      result.set(domain, [...files]);
    }
  }
  return result;
}

/**
 * 소스 생성기가 받는 DB 번들은 같은 구성으로 만들어 빈 DB 재적용 검증까지 통과한 번들이어야 한다.
 * 프리셋도 같은 규칙이다(2026-10-07 Phase 0b). 원인이 다르면 고칠 행동도 다르므로 메시지를 나눈다.
 */
export function assertCompositionDatabaseLock(lock, composition) {
  if (!lock?.composition || lock.validated !== true) {
    throw new Error('DB 번들이 검증된 구성 번들이 아니다(구성 경로 이전 형식이거나 검증 전에 멈춘 번들). DB 생성기로 다시 만들어라.');
  }
  if (lock.profile !== composition.profile) throw new Error(`DB bundle profile ${lock.profile} != source profile ${composition.profile}`);
  if (lock.layout !== composition.backendLayout) {
    throw new Error(`DB 번들 레이아웃 ${lock.layout} 과 소스 레이아웃 ${composition.backendLayout} 이 다르다. DB 생성기를 --layout ${composition.backendLayout} 로 다시 실행하라.`);
  }
  if (lock.compositionHash !== composition.compositionHash) throw new Error('DB/source composition hash mismatch');
}

export function verifyCompositionDatabaseFiles(migrationDirectory, lock) {
  if (lock.validated !== true || !lock.migrationFiles || typeof lock.migrationFiles !== 'object') throw new Error('A validated composition DB bundle is required');
  const actual = readdirSync(migrationDirectory).filter(file => file.endsWith('.sql')).sort();
  const expected = Object.keys(lock.migrationFiles).map(path => {
    if (!/^db\/migration\/[A-Za-z0-9_]+\.sql$/.test(path)) throw new Error('Invalid DB bundle file identity');
    return path.slice('db/migration/'.length);
  }).sort();
  const names = ['R__seed_framework.sql', 'R__zz_seed_base_admin.sql', 'V1_0__baseline.sql', 'V1_1__seed_meta_standard.sql'].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected) || JSON.stringify(actual) !== JSON.stringify(names)) throw new Error('DB bundle migration population differs from its validated lock');
  for (const file of actual) {
    const hash = createHash('sha256').update(readFileSync(join(migrationDirectory, file))).digest('hex');
    if (hash !== lock.migrationFiles[`db/migration/${file}`]) throw new Error(`Validated DB migration checksum mismatch: ${file}`);
  }
}

const RBAC = 'api-server/src/test/java/nuri/security/RbacDemoSurfaceAuthorizationMatrixTest.java';
const MANAGEMENT_RBAC_SURFACES = new Map([
  ['/api/v1/admin/operation/events', 'operation'],
  ['/api/v1/admin/operation/rewards', 'operation'],
  ['/api/v1/help/hpcm', 'help'],
  ['/api/v1/help/manuals', 'help'],
  ['/api/v1/admin/system/banners', 'system'],
  ['/api/v1/admin/system/popups', 'system'],
  ['/api/v1/admin/system/templates', 'template'],
]);
const RBAC_DOMAINS = ['survey', 'stats', 'system', 'informalsanction', 'operation', 'help', 'template'];
const GATE_OWNERS = {
  'api-server/src/test/java/nuri/api/schema/AssignmentRecipientIntegrityIntegrationTest.java': ['note', 'notification'],
  'api-server/src/test/java/nuri/api/schema/MemoReportRecipientIntegrityIntegrationTest.java': ['memoreport'],
  'api-server/src/test/java/nuri/api/schema/ApprovalWorkflowIntegrationTest.java': ['informalsanction'],
  'api-server/src/test/java/nuri/api/schema/CommunityDecisionConcurrencyIntegrationTest.java': ['system'],
  'api-server/src/test/java/nuri/api/schema/CommunityTemplateIntegrityIntegrationTest.java': ['system', 'template'],
  'api-server/src/test/java/nuri/api/schema/EventApprovalIntegrityIntegrationTest.java': ['operation'],
  'api-server/src/test/java/nuri/api/schema/NotificationDurabilityIntegrationTest.java': ['notification'],
  'api-server/src/test/java/nuri/api/schema/ReferenceIntegrityCommunityFkIntegrationTest.java': ['board', 'system'],
  'api-server/src/test/java/nuri/api/schema/SurveySubmissionConcurrencyIntegrationTest.java': ['survey'],
  'api-server/src/test/java/nuri/api/schema/AddressBookSnapshotConcurrencyIntegrationTest.java': ['addressbook'],
  'api-server/src/test/java/nuri/api/schema/SmsDeliveryStateIntegrationTest.java': ['sms'],
  'api-server/src/test/java/nuri/api/schema/TemplateCreationIntegrityIntegrationTest.java': ['template'],
};

export function composerProfile(manifest, composition) {
  if (composition.profile !== 'custom') return manifest.profiles[composition.profile];
  const selected = new Set(composition.resolvedDomains);
  const acknowledgedRemovedGates = Object.entries(GATE_OWNERS)
    .filter(([, domains]) => domains.some(domain => !selected.has(domain)))
    .map(([file, domains]) => ({ file, reason: `선택하지 않은 검사 대상 도메인: ${domains.filter(domain => !selected.has(domain)).join(', ')}` }));
  if (!RBAC_DOMAINS.some(domain => selected.has(domain))) acknowledgedRemovedGates.push({
    file: RBAC, reason: `선택 가능한 RBAC 검사 표면(${RBAC_DOMAINS.join(', ')})이 모두 제외됨. 필수 core 인가는 기존 별도 매트릭스로 검사한다.`,
  });
  return {
    packs: composition.packs, resolvedDomains: composition.resolvedDomains,
    frontendRemovePaths: composition.frontend.removePaths,
    acknowledgedRemovedGates,
    acknowledgedGateRemovalRules: manifest.profiles.core.acknowledgedGateRemovalRules,
    description: '명시적 recipe와 의존성 해석으로 구성한 독립 프로젝트',
  };
}

const STATS_SHELL_BLOCK_OWNERS = { collaboration: ['board'], survey: ['survey'] };

/** Each existing optional block has an explicit owner. An unclassified new block fails closed. */
export function projectComposerFrontend(file, source, composition) {
  if (composition.profile !== 'custom') return source;
  const selected = new Set(composition.resolvedDomains);
  const normalized = file.replaceAll('\\', '/').replace(/^frontend\//, '');
  return source.replace(/^[^\n]*reusable-base:([a-z0-9_-]+):start[^\n]*\n[\s\S]*?^[^\n]*reusable-base:\1:end[^\n]*(?:\n|$)/gm, (block, pack) => {
    let owners;
    if (normalized === 'src/app/UnifiedDashboardClient.tsx') {
      // 안 읽은 쪽지 카드 블록은 쪽지 기능도 있어야 남는다 — 카드 파일이 쪽지 서비스를 쓴다.
      owners = pack === 'collaboration' ? (/UnreadNotesCard/.test(block) ? ['dashboard', 'note'] : ['dashboard'])
        : /BannerSlider|PopupManager/.test(block) ? ['system'] : ['dashboard', 'informalsanction'];
    } else if (['src/app/page.tsx', 'src/app/components/dashboard/ActivityFeed.tsx'].includes(normalized)) owners = ['dashboard'];
    else if (normalized === 'src/app/components/layout/header.tsx') owners = pack === 'collaboration' ? ['notification'] : ['help'];
    else if (['src/app/components/layout/footer.tsx', 'src/app/error.tsx'].includes(normalized)) owners = ['help'];
    else if (['src/app/search/SearchClient.tsx', 'src/app/components/ui/global-command-center.tsx'].includes(normalized)) owners = ['board'];
    // 댓글 탭은 collaboration 블록, 하네스 아틀라스 샘플 탭은 demo 블록이다 — 샘플 파일은 system 도메인 소유(패턴 갤러리와 같다).
    else if (normalized === 'src/app/admin/system/monitoring/MonitoringHubClient.tsx') owners = pack === 'demo' ? ['system'] : ['comment'];
    else if (normalized === 'src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx') owners = ['system'];
    // 통계 셸: 게시물·자료 이용 탭과 카드는 게시판, 설문 탭은 설문이 소유한다. 다른 pack 블록은 분류가 없으므로 실패한다.
    else if (normalized === 'src/app/admin/stats/IntelligenceHubClient.tsx' && STATS_SHELL_BLOCK_OWNERS[pack]) owners = STATS_SHELL_BLOCK_OWNERS[pack];
    else if (normalized === 'src/app/admin/stats/AdminStatsClient.tsx' && pack === 'collaboration') owners = ['board'];
    else if (normalized.startsWith('src/app/admin/collaboration/') || normalized.startsWith('src/app/admin/uss/ion/sms/')) owners = ['addressbook'];
    else throw new Error(`Unclassified composer UI block: ${normalized}/${pack}`);
    return owners.every(domain => selected.has(domain)) ? block : '';
  });
}

function removeTest(source, name) {
  const declaration = new RegExp(`    @Test void ${name}\\([^)]*\\)[^{]*\\{`).exec(source);
  if (!declaration) throw new Error(`RBAC projection contract drifted: ${name}`);
  let depth = 1;
  let end = declaration.index + declaration[0].length;
  // These contract methods contain no braces in string literals. Reject a changed declaration through tests.
  for (; end < source.length && depth; end++) {
    if (source[end] === '{') depth++;
    else if (source[end] === '}') depth--;
  }
  if (depth) throw new Error('Unbalanced RBAC contract method');
  return source.slice(0, declaration.index) + source.slice(end);
}

function projectManagementRbacSurfaces(source, selected) {
  const inventory = /    static Stream<ManagedSurface> managementSurfaces\(\) \{\r?\n        return Stream\.of\(([\s\S]*?)\);\r?\n    \}/.exec(source);
  if (!inventory) throw new Error('Management RBAC surface inventory contract drifted');
  // Constructor records have a fixed textual shape; keep each selected record byte-for-byte,
  // including its valid request payload and persisted-result assertions in the shared methods.
  const constructors = [...inventory[1].matchAll(/                new ManagedSurface\("([^"]+)", "[A-Z_]+", "[A-Z_]+", "[A-Za-z][A-Za-z0-9_]*",\r?\n                        """\r?\n[\s\S]*?\r?\n                        """, "[^"]*", "[^"]*"\)/g)];
  const paths = constructors.map(match => match[1]);
  const remainder = constructors.reduce((value, match) => value.replace(match[0], ''), inventory[1]);
  if (JSON.stringify(paths) !== JSON.stringify([...MANAGEMENT_RBAC_SURFACES.keys()])
      || !/^[\s,]*$/.test(remainder)) throw new Error('Management RBAC surface owner inventory drifted');
  const retained = constructors.filter(match => selected.has(MANAGEMENT_RBAC_SURFACES.get(match[1])));
  if (retained.length === constructors.length) return source;
  if (retained.length) return source.replace(inventory[1], `\n${retained.map(match => match[0]).join(',\n')}`);
  source = source.replace(inventory[0], '');
  // A parameterized test with an empty source is an execution error. Remove only the
  // management-specific methods when every management surface is absent.
  for (const name of ['managementWriteRequiresItsExactHttpPermission', 'managementWritesWithoutExactPermission',
    'exactManagementGrantsIndependentlyAllowRealHttpCrud', 'assertStoredName']) {
    const declaration = new RegExp(`^(?:    @[^\\r\\n]*\\r?\\n)*    (?:void|static Stream<Arguments>|private void) ${name}\\([\\s\\S]*?^    \\}`, 'm').exec(source);
    if (!declaration) throw new Error(`Management RBAC projection contract drifted: ${name}`);
    source = source.replace(declaration[0], '');
  }
  const record = /^    record ManagedSurface\([\s\S]*?^    \}/m.exec(source);
  if (!record) throw new Error('Management RBAC projection contract drifted: ManagedSurface');
  return source.replace(record[0], '');
}

/** Preserve every assertion for a selected surface in the formerly pack-wide RBAC test. */
export function projectComposerJava(file, source, profile) {
  if (!profile.resolvedDomains || file.replaceAll('\\', '/') !== RBAC) return source;
  const selected = new Set(profile.resolvedDomains);
  if (!RBAC_DOMAINS.some(domain => selected.has(domain))) return source; // normal declared removal
  source = projectManagementRbacSurfaces(source, selected);
  if (!selected.has('survey')) for (const method of [
    'adminReadsDemoOwnedAdministrativeSurfaces', 'ordinaryUserCannotReadDemoOwnedAdministrativeSurfaces',
    'anonymousDemoOwnedAdministrativeRequestsRequireAuthentication', 'explicitSurveyReadGrantWorksWithoutAnAdministrativeGroup',
    'ordinaryPollParticipantCannotCreateUpdateOrDeletePolls',
  ]) source = removeTest(source, method);
  if (!selected.has('stats')) {
    source = source.replace(/^.*@MockitoBean private nuri\.business\.service\.stats\.ReportStatsService reportStatsService;\r?\n/m, '');
    source = removeTest(source, 'delegatedStatisticsPermissionAllowsAdministrativeReadsWithoutAnAdminGroup');
  }
  const method = /    @Test void ordinaryStatisticsReaderCannotEnterAnyAdministrativeStatisticsEndpoint\(\) throws Exception \{[\s\S]*?\n    \}/.exec(source);
  if (!method) throw new Error('Mixed RBAC projection contract drifted');
  const blocks = method[0];
  const stats = blocks.match(/        mockMvc\.perform\(get\("\/api\/v1\/statistics\/connect"\)[\s\S]*?\n        \}/)?.[0];
  const system = blocks.match(/        for \(String path : List\.of\("\/api\/v1\/admin\/system\/banners"[\s\S]*?\n        \}/)?.[0];
  const sanction = blocks.match(/        mockMvc\.perform\(patch\("\/api\/v1\/admin\/system\/ism\/1\/confirm"\)[\s\S]*?\.andExpect\(status\(\)\.isForbidden\(\)\);/)?.[0];
  if (!stats || !system || !sanction) throw new Error('Mixed RBAC assertion inventory drifted');
  let next = blocks;
  if (!selected.has('stats')) next = next.replace(stats, '');
  if (!selected.has('system')) next = next.replace(system, '');
  if (!selected.has('informalsanction')) next = next.replace(sanction, '');
  source = source.replace(blocks, next);
  if (!['stats', 'system', 'informalsanction'].some(domain => selected.has(domain))) source = removeTest(source, 'ordinaryStatisticsReaderCannotEnterAnyAdministrativeStatisticsEndpoint');
  return source;
}

/** Selected source roots are an expected population, never inferred from what survived cascading removal. */
export function assertComposerSourceSurvives(sourceRoot, outputRoot, composition, manifest) {
  if (composition.profile !== 'custom') return;
  const requireFile = path => {
    const normalized = path.replaceAll('\\', '/');
    if (normalized.startsWith('frontend/') && composition.frontend.removePaths.some(removed =>
      normalized === `frontend/${removed}` || normalized.startsWith(`frontend/${removed}/`))) return;
    if (!existsSync(join(outputRoot, path))) throw new Error(`Selected capability source was removed: ${path}`);
  };
  function assertTree(directory) {
    if (!existsSync(directory)) return;
    if (statSync(directory).isFile()) { requireFile(relative(sourceRoot, directory)); return; }
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) assertTree(path);
      else requireFile(relative(sourceRoot, path));
    }
  }
  for (const domain of composition.resolvedDomains) for (const layer of ['domain', 'service']) {
    assertTree(join(sourceRoot, 'business-app/src/main/java/nuri/business', layer, domain));
  }
  const support = domainSupportFiles(sourceRoot, manifest ?? JSON.parse(readFileSync(join(sourceRoot, 'config/reusable-base-profiles.json'), 'utf8')));
  for (const domain of composition.resolvedDomains) for (const file of support.get(domain) ?? []) requireFile(file);
  for (const path of composition.frontend.includedPaths) assertTree(join(sourceRoot, 'frontend', path));
  for (const path of composition.frontend.includedPaths) if (existsSync(join(sourceRoot, 'frontend', path)) && statSync(join(sourceRoot, 'frontend', path)).isFile()) requireFile(`frontend/${path}`);
  const selected = new Set(composition.resolvedDomains);
  function assertControllers(directory) {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { assertControllers(path); continue; }
      if (!entry.name.endsWith('.java')) continue;
      const source = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, '');
      const domains = [...source.matchAll(/(?<![\w$])nuri\.business\.(?:domain|service)\.([a-z][a-z0-9_]*)\./g)]
        .map(match => match[1]).filter(domain => existsSync(join(sourceRoot, 'business-app/src/main/java/nuri/business/domain', domain))
          || existsSync(join(sourceRoot, 'business-app/src/main/java/nuri/business/service', domain)));
      if (domains.length && domains.every(domain => selected.has(domain))) requireFile(relative(sourceRoot, path));
    }
  }
  assertControllers(join(sourceRoot, 'api-server/src/main/java/nuri/api/controller'));
}
