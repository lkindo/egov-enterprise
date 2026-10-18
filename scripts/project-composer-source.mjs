/** Domain ownership rules for composing the existing source, without changing its module boundaries. */
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { ComposerError } from './project-composer-errors.mjs';
import { apiSourceOwner } from './project-composer-integrations.mjs';
import { describeRoutes, pageSurvivalViolations } from './reusable-page-survival.mjs';

/** Exact support files follow their optional consumer while module dependencies stay unchanged. */
/*
 * 선택 업무만 쓰는 지원 파일. 업무 앱의 다른 도메인 디렉터리 파일도 선언할 수 있다 — 그 도메인이 제공하고
 * 선언한 도메인만 쓰는 구현이다(지금 실례는 없다 — 커뮤니티가 쓰던 템플릿 배정 구현은 DEC-OPS-280 에서 포트가 됐다). 그런 파일은 두 도메인이 모두 있을 때만
 * 남고, 카탈로그는 선언 도메인이 디렉터리 도메인을 요구한다고 기록한다.
 */
export function supportFileDirectoryDomain(file) {
  return /^business-app\/src\/(?:main|test)\/java\/nuri\/business\/(?:domain|service)\/([a-z][a-z0-9_]*)\/(?:[A-Za-z_$][\w$]*\/)*[A-Za-z_$][\w$]*\.java$/u.exec(file)?.[1] ?? null;
}

/**
 * 지원 파일 선언의 판정(매니페스트 v2 기능 파일의 backend.supportFiles). `entries` 는 선언 순서의 `{ owner, owned, domain, files }` 다 —
 * owner 는 선언한 자리(기능 id), owned 는 그 자리가 소유한 기능이다. `appDomainList` 는 선택할 수 있는 기능 id 전부다.
 */
export function supportFileOwners(root, entries, appDomainList) {
  const result = new Map();
  const owners = new Set();
  const realRoot = realpathSync(root);
  const appDomains = new Set(appDomainList);
  for (const { owner: pack, owned, domain, files } of entries) {
    if (!owned.includes(domain) || result.has(domain)
      || !Array.isArray(files) || files.length === 0) throw new Error(`Invalid domain support owner: ${pack}/${domain}`);
    for (const file of files) {
      const directoryDomain = typeof file === 'string' ? supportFileDirectoryDomain(file) : null;
      if (typeof file !== 'string'
        || !(/^(?:foundation|business-core|api-server)\/src\/(?:main|test)\/java\/(?:[A-Za-z_$][\w$]*\/)+[A-Za-z_$][\w$]*\.java$/u.test(file)
          || (directoryDomain && directoryDomain !== domain && appDomains.has(directoryDomain)))
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
  const names = ['R__seed_framework.sql', 'R__seed_reference_data.sql', 'R__zz_seed_base_admin.sql', 'V1_0__baseline.sql', 'V1_1__seed_meta_standard.sql'].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected) || JSON.stringify(actual) !== JSON.stringify(names)) throw new Error('DB bundle migration population differs from its validated lock');
  for (const file of actual) {
    const hash = createHash('sha256').update(readFileSync(join(migrationDirectory, file))).digest('hex');
    if (hash !== lock.migrationFiles[`db/migration/${file}`]) throw new Error(`Validated DB migration checksum mismatch: ${file}`);
  }
}

/**
 * 선택 기능 RBAC 매트릭스(데모 표면) 파일. 어느 표면을 어느 기능이 지키는지는 기능 파일의 owns.rbacMatrix 가 정한다(로더의 extras.rbac,
 * composerOwnership 의 rbac — 게이트 소유·시작 구성 기대치와 같은 원천이다). 통계는 Phase 0c 에서 core 로 옮겨 core 매트릭스가 검사한다.
 */
export const RBAC = 'api-server/src/test/java/nuri/security/RbacDemoSurfaceAuthorizationMatrixTest.java';
// 데모 매트릭스를 설문과 함께 지우는 표지. 설문을 고르지 않은 구성은 남은 표면을 지키려고 이 줄을 지운다.
const RBAC_SURVEY_BOUNDARY = /^ *private static final Class<\?> SURVEY_PACK_BOUNDARY = nuri\.business\.service\.survey\.SurveyService\.class;\r?\n/m;

/**
 * 생성기가 투영에 쓰는 프로필(11단계 C3). 시작 구성과 직접 선택이 같은 모양이다 — 투영은 해석된 기능 목록(resolvedDomains)과 화면
 * 제외 경로(frontendRemovePaths)로만 하고 pack 을 보지 않는다. 시작 구성은 승인 기대치(지워지는 게이트·규칙·Java 연쇄)를 매니페스트
 * v2 의 presets.json 에서 받고, 직접 선택은 기능 파일의 게이트 소유에서 계산한다. `modules` 는 loadComposerModules 결과다.
 */
export function composerProfile(modules, composition) {
  const projection = { resolvedDomains: composition.resolvedDomains, frontendRemovePaths: composition.frontend.removePaths };
  const { presetExpectations, gateOwners, rbac } = modules.extras;
  // 목록만 복사한다. 목록이 아닌 값은 그대로 넘겨 승인 대조가 형식 오류로 말하게 한다(removedGateAcknowledgement·javaCascadeAcknowledgement).
  const copy = value => (Array.isArray(value) ? value.map(row => (row !== null && typeof row === 'object' ? { ...row } : row)) : value);
  if (composition.profile !== 'custom') {
    const expected = presetExpectations[composition.profile];
    if (!expected) throw new Error(`Preset expectations are not declared: ${composition.profile}`);
    return { ...projection, acknowledgedRemovedGates: copy(expected.gates), acknowledgedGateRemovalRules: copy(expected.gateRemovalRules),
      acknowledgedJavaCascade: copy(expected.javaCascade), description: expected.description };
  }
  const selected = new Set(composition.resolvedDomains);
  const acknowledgedRemovedGates = Object.entries(gateOwners)
    .filter(([, domains]) => domains.some(domain => !selected.has(domain)))
    .map(([file, domains]) => ({ file, reason: `선택하지 않은 검사 대상 도메인: ${domains.filter(domain => !selected.has(domain)).join(', ')}` }));
  if (!rbac.domains.some(domain => selected.has(domain))) acknowledgedRemovedGates.push({
    file: rbac.file, reason: `선택 가능한 RBAC 검사 표면(${rbac.domains.join(', ')})이 모두 제외됨. 필수 core 인가는 기존 별도 매트릭스로 검사한다.`,
  });
  return {
    ...projection,
    acknowledgedRemovedGates,
    acknowledgedGateRemovalRules: copy(presetExpectations.core.gateRemovalRules),
    description: '명시적 recipe와 의존성 해석으로 구성한 독립 프로젝트',
  };
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

function projectManagementRbacSurfaces(source, selected, surfaces) {
  const inventory = /    static Stream<ManagedSurface> managementSurfaces\(\) \{\r?\n        return Stream\.of\(([\s\S]*?)\);\r?\n    \}/.exec(source);
  if (!inventory) throw new Error('Management RBAC surface inventory contract drifted');
  // Constructor records have a fixed textual shape; keep each selected record byte-for-byte,
  // including its valid request payload and persisted-result assertions in the shared methods.
  const constructors = [...inventory[1].matchAll(/                new ManagedSurface\("([^"]+)", "[A-Z_]+", "[A-Z_]+", "[A-Za-z][A-Za-z0-9_]*",\r?\n                        """\r?\n[\s\S]*?\r?\n                        """, "[^"]*", "[^"]*"\)/g)];
  const paths = constructors.map(match => match[1]);
  const remainder = constructors.reduce((value, match) => value.replace(match[0], ''), inventory[1]);
  // 표면 집합은 기능 파일의 owns.rbacMatrix 와 정확히 같아야 한다. 남기는 생성자의 순서는 시험 파일의 것을 그대로 둔다.
  if (JSON.stringify([...paths].sort()) !== JSON.stringify(Object.keys(surfaces).sort()) || new Set(paths).size !== paths.length
      || !/^[\s,]*$/.test(remainder)) throw new Error('Management RBAC surface owner inventory drifted');
  const retained = constructors.filter(match => selected.has(surfaces[match[1]]));
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

/**
 * Preserve every assertion for a selected surface in the formerly pack-wide RBAC test. `rbac` 은 기능 파일의 RBAC 매트릭스 소유
 * (composerOwnership(modules).rbac — { domains, surfaces: 표면 → 기능 })다. 그 파일이 아니면 읽지 않는다.
 */
export function projectComposerJava(file, source, profile, rbac) {
  if (!profile.resolvedDomains || file.replaceAll('\\', '/') !== RBAC) return source;
  if (!Array.isArray(rbac?.domains) || rbac.surfaces === null || typeof rbac.surfaces !== 'object') {
    throw new Error('RBAC projection needs the feature RBAC ownership (composerOwnership(modules).rbac)');
  }
  const selected = new Set(profile.resolvedDomains);
  if (!rbac.domains.some(domain => selected.has(domain))) return source; // normal declared removal
  source = projectManagementRbacSurfaces(source, selected, rbac.surfaces);
  if (!selected.has('survey')) for (const method of [
    'adminReadsDemoOwnedAdministrativeSurfaces', 'ordinaryUserCannotReadDemoOwnedAdministrativeSurfaces',
    'anonymousDemoOwnedAdministrativeRequestsRequireAuthentication', 'explicitSurveyReadGrantWorksWithoutAnAdministrativeGroup',
    'ordinaryPollParticipantCannotCreateUpdateOrDeletePolls',
  ]) source = removeTest(source, method);
  if (!selected.has('survey')) {
    // 표지가 없으면 조용히 넘어가지 않는다 — 그대로 두면 설문이 없는 구성에서 이 매트릭스가 통째로 사라진다.
    if (!RBAC_SURVEY_BOUNDARY.test(source)) throw new Error('RBAC survey boundary marker drifted');
    source = source.replace(RBAC_SURVEY_BOUNDARY, '');
  }
  const method = /    @Test void ordinaryUserCannotEnterDemoOwnedAdministrativeEndpoints\(\) throws Exception \{[\s\S]*?\n    \}/.exec(source);
  if (!method) throw new Error('Mixed RBAC projection contract drifted');
  const blocks = method[0];
  const promotion = blocks.match(/        for \(String path : List\.of\("\/api\/v1\/admin\/system\/banners"[\s\S]*?\n        \}/)?.[0];
  // [2026-10-18 ADR-0034] 약식결재 관리 경로(PATCH /admin/system/ism/{id}/confirm) 단언은 그 API 와 함께 걷혔다. 남은 단언은
  //   배너·팝업(promotion) 하나라 그 기능이 없으면 시험을 통째로 뺀다. 다른 단언이 다시 섞이면 아래 대조가 red 다.
  if (!promotion || blocks.split('mockMvc.perform(').length !== 2) throw new Error('Mixed RBAC assertion inventory drifted');
  if (!selected.has('promotion')) source = removeTest(source, 'ordinaryUserCannotEnterDemoOwnedAdministrativeEndpoints');
  return source;
}

/**
 * 연쇄 제거 뒤 남은 등록 화면이 구성의 기대값과 같은지 본다(리다이렉트 수렴 포함, reusable-page-survival.mjs).
 * `pagePresent(source)` 는 그 page 파일이 생성물에 남았는지 답한다. 화면은 디렉터리·파일 이름 그대로 라우트가 되므로,
 * 생성기는 디스크의 실제 page 파일 이름(discoverPageRoutes)으로, 정밀 점검은 복사할 파일 목록과의 정확한 일치로 답한다 —
 * 대소문자를 가리지 않는 디스크에서도 이름이 다른 파일은 그 화면이 아니다(생성물 무결성 검사와 같은 판정).
 * 구성 밖 화면이 남으면 manifest 결함이라 일반 실패로 멈추고, 빠진 화면은 돌려줘 선택 소스 소실과 함께 알리게 한다.
 */
export function projectedScreenLosses(expectation, pagePresent) {
  const { missing, extra } = pageSurvivalViolations({ ...expectation, survives: pagePresent });
  if (extra.length) throw new Error(`Screens outside the composition survive projection: ${describeRoutes(extra)}`);
  return missing;
}

/** Selected source roots are an expected population, never inferred from what survived cascading removal. */
// `present` 는 생성물에 그 파일이 남았는지 답한다. 생성기는 디스크를, 정밀 점검(plan/deep)은 제거 계획을 본다.
// `lostScreens`(projectedScreenLosses 결과)를 함께 받아, 정밀 점검처럼 빠진 화면과 소스를 모두 모아 SOURCE_SURVIVAL 하나로 알린다.
// `ownership` 은 기능 소유(composerOwnership — 기능 id·지원 파일)다. 시작 구성도 직접 선택과 같은 기대 모집단을 본다(11단계 C3).
export function assertComposerSourceSurvives(sourceRoot, outputRoot, composition, ownership, { present = path => existsSync(join(outputRoot, path)), lostScreens = [] } = {}) {
  const lost = new Set(lostScreens.map(entry => entry.source));
  collectComposerSourceLosses(sourceRoot, composition, ownership, present, lost);
  if (!lost.size) return;
  const files = [...lost].sort((left, right) => left.localeCompare(right));
  throw new ComposerError('SOURCE_SURVIVAL', { files },
    `Selected capability source was removed: ${files.join(', ')}${lostScreens.length ? ` (expected screens: ${describeRoutes(lostScreens)})` : ''}`);
}

function collectComposerSourceLosses(sourceRoot, composition, ownership, present, lost) {
  const support = ownership.supportFiles;
  // 선택 도메인 디렉터리에서도 제외된 소비자가 소유한 지원 파일은 지워지는 것이 맞다(제외된 소비자만 쓰는 다른 기능 디렉터리의 구현).
  const excludedSupport = new Set([...support].filter(([owner]) => !composition.resolvedDomains.includes(owner))
    .flatMap(([, files]) => files));
  const requireFile = path => {
    const normalized = path.replaceAll('\\', '/');
    if (excludedSupport.has(normalized)) return;
    if (normalized.startsWith('frontend/') && composition.frontend.removePaths.some(removed =>
      normalized === `frontend/${removed}` || normalized.startsWith(`frontend/${removed}/`))) return;
    if (!present(path)) lost.add(normalized);
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
  for (const domain of composition.resolvedDomains) for (const file of support.get(domain) ?? []) requireFile(file);
  for (const path of composition.frontend.includedPaths) assertTree(join(sourceRoot, 'frontend', path));
  for (const path of composition.frontend.includedPaths) if (existsSync(join(sourceRoot, 'frontend', path)) && statSync(join(sourceRoot, 'frontend', path)).isFile()) requireFile(`frontend/${path}`);
  const selected = new Set(composition.resolvedDomains);
  const features = new Set(ownership.domains);
  // 참조 기능이 모두 선택된 컨트롤러는 남아야 한다. 디렉터리 소유 기능(apiSourceOwner)이 선택된 컨트롤러도 남아야 한다 —
  // 소유 기능만 고른 구성에서 다른 기능 타입 참조로 컨트롤러가 연쇄 제거되면, 참조 기능이 모두 선택된 것이 아니라 앞 규칙은
  // 통과시킨다(커뮤니티 사용자 API 가 게시판 참조로 조용히 지워지던 경로, DEC-OPS-280). 카탈로그가 그 참조를 간선으로 세면 둘은 같다.
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
      const file = relative(sourceRoot, path);
      const owner = apiSourceOwner(file.split(sep).join('/'), features);
      if ((domains.length && domains.every(domain => selected.has(domain))) || (owner && selected.has(owner))) requireFile(file);
    }
  }
  assertControllers(join(sourceRoot, 'api-server/src/main/java/nuri/api/controller'));
}
