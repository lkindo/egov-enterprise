/** Domain ownership rules for composing the existing source, without changing its module boundaries. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

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
const RBAC_DOMAINS = ['survey', 'stats', 'system', 'informalsanction'];
const GATE_OWNERS = {
  'api-server/src/test/java/nuri/api/schema/ApprovalWorkflowIntegrationTest.java': ['informalsanction'],
  'api-server/src/test/java/nuri/api/schema/ReferenceIntegrityCommunityFkIntegrationTest.java': ['board', 'system'],
  'api-server/src/test/java/nuri/api/schema/SurveySubmissionConcurrencyIntegrationTest.java': ['survey'],
};

export function composerProfile(manifest, composition) {
  if (composition.profile !== 'custom') return manifest.profiles[composition.profile];
  const selected = new Set(composition.resolvedDomains);
  const acknowledgedRemovedGates = Object.entries(GATE_OWNERS)
    .filter(([, domains]) => domains.some(domain => !selected.has(domain)))
    .map(([file, domains]) => ({ file, reason: `선택하지 않은 검사 대상 도메인: ${domains.filter(domain => !selected.has(domain)).join(', ')}` }));
  if (!RBAC_DOMAINS.some(domain => selected.has(domain))) acknowledgedRemovedGates.push({
    file: RBAC, reason: '선택 가능한 RBAC 검사 표면(survey, stats, system, informalsanction)이 모두 제외됨. 필수 core 인가는 기존 별도 매트릭스로 검사한다.',
  });
  return {
    packs: composition.packs, resolvedDomains: composition.resolvedDomains,
    frontendRemovePaths: composition.frontend.removePaths,
    acknowledgedRemovedGates,
    acknowledgedGateRemovalRules: manifest.profiles.core.acknowledgedGateRemovalRules,
    description: '명시적 recipe와 의존성 해석으로 구성한 독립 프로젝트',
  };
}

/** Each existing optional block has an explicit owner. An unclassified new block fails closed. */
export function projectComposerFrontend(file, source, composition) {
  if (composition.profile !== 'custom') return source;
  const selected = new Set(composition.resolvedDomains);
  const normalized = file.replaceAll('\\', '/').replace(/^frontend\//, '');
  return source.replace(/^[^\n]*reusable-base:([a-z0-9_-]+):start[^\n]*\n[\s\S]*?^[^\n]*reusable-base:\1:end[^\n]*(?:\n|$)/gm, (block, pack) => {
    let owners;
    if (normalized === 'src/app/UnifiedDashboardClient.tsx') {
      owners = pack === 'collaboration' ? ['dashboard']
        : /BannerSlider|PopupManager/.test(block) ? ['system'] : ['dashboard', 'informalsanction'];
    } else if (['src/app/page.tsx', 'src/app/components/dashboard/ActivityFeed.tsx'].includes(normalized)) owners = ['dashboard'];
    else if (normalized === 'src/app/components/layout/header.tsx') owners = pack === 'collaboration' ? ['notification'] : ['help'];
    else if (['src/app/components/layout/footer.tsx', 'src/app/error.tsx'].includes(normalized)) owners = ['help'];
    else if (['src/app/search/SearchClient.tsx', 'src/app/components/ui/global-command-center.tsx'].includes(normalized)) owners = ['board'];
    else if (normalized === 'src/app/admin/system/monitoring/MonitoringHubClient.tsx') owners = ['comment'];
    else if (normalized === 'src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx') owners = ['system'];
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

/** Preserve every assertion for a selected surface in the formerly pack-wide RBAC test. */
export function projectComposerJava(file, source, profile) {
  if (!profile.resolvedDomains || file.replaceAll('\\', '/') !== RBAC) return source;
  const selected = new Set(profile.resolvedDomains);
  if (!RBAC_DOMAINS.some(domain => selected.has(domain))) return source; // normal declared removal
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
export function assertComposerSourceSurvives(sourceRoot, outputRoot, composition) {
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
      const domains = [...source.matchAll(/\bnuri\.business\.(?:domain|service)\.([a-z][a-z0-9_]*)\./g)]
        .map(match => match[1]).filter(domain => existsSync(join(sourceRoot, 'business-app/src/main/java/nuri/business/domain', domain))
          || existsSync(join(sourceRoot, 'business-app/src/main/java/nuri/business/service', domain)));
      if (domains.length && domains.every(domain => selected.has(domain))) requireFile(relative(sourceRoot, path));
    }
  }
  assertControllers(join(sourceRoot, 'api-server/src/main/java/nuri/api/controller'));
}
