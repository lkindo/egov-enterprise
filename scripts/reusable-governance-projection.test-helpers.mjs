// 생성물 거버넌스 투영 시험(reusable-governance-projection*.test.mjs)이 함께 쓰는 준비물과 구성별 투영 시험 본문이다. 이 파일은
// 시험이 아니다(이름이 *.test.mjs 가 아니라 운영 계약 실행이 고르지 않는다). 구성별 시험은 구성마다 2~7분이 걸린다 — node 는 한
// 파일의 시험을 차례로 돌리고 파일끼리는 함께 돌리므로, 구성별 시험을 나눈 파일(…-profiles-<n>.test.mjs)이 이 본문을 등록한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectReusableGovernance } from './reusable-governance-projection.mjs';
import { applyFrontendProjection, createFrontendProjector, pruneFrontend } from './reusable-source-frontend.mjs';
import { composerProfile } from './project-composer-source.mjs';
import { compositionProfiles } from './composition-profiles.mjs';
import { pruneJava } from './reusable-source-java.mjs';
import { buildUrlStateCensus } from './ui-url-state-census.mjs';
import { analyzeRouteCapabilities } from './ui-route-capabilities-contract.mjs';
import { canonicalJsonSha256, inspectReusableGovernance, MEMORY_PATHS, snapshotPathFor } from './reusable-governance-integrity.mjs';
import { REVIEW_MANIFEST_PATHS, REVIEW_SCOPE_PATH } from './reusable-review-scopes.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { COMPOSER_SELECTION_PATH, resolveProjectRecipe } from './project-composer-recipe.mjs';
import { COMPOSER_MENU_SNAPSHOT_PATH } from './project-composer-menu-preview.mjs';
import { PROJECTION_LEDGER_PATH, buildProjectionLedger, writeProjectionLedger } from './reusable-projection-ledger.mjs';
import { normalize, walk } from './reusable-source-tree.mjs';
import { PERMISSION_ARTIFACT_PATHS } from './generate-permissions.mjs';
import { AUTHORIZATION_POLICY_PATH, PERMISSION_BUNDLES_PATH, PERMISSION_CATALOG_PATH } from './reusable-permission-projection.mjs';
import { SCREEN_REGISTRY_OUTPUT, readScreenRegistryArtifact } from './screen-registry-model.mjs';
import { activeCompositionEntry, writeProjectedModules } from './generate-reusable-base-source.mjs';
import { MODULES_DIRECTORY, composerOwnership, loadComposerModules } from './composer-modules.mjs';
import { relative } from 'node:path';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const readJson = (root, path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
export const census = readJson(ROOT, 'config/ui-url-state-census.json');
export const approval = readJson(ROOT, 'config/ui-url-state-approval.json');
// 검토 범위는 기능 소유로 판정한다(11단계 C5 — v1 manifest 의 pack 을 걷었다). 원본 카탈로그가 판정 원천이다.
export const catalog = loadProjectComposerCatalog(ROOT);
export const presetComposition = preset => resolveProjectRecipe({ schemaVersion: 1, project: { name: 'review-probe' }, sourceRef: 'v1.0.0',
  selection: { preset } }, catalog);
export const reviewContract = readJson(ROOT, REVIEW_SCOPE_PATH);
export const upstreamReviews = Object.fromEntries(Object.entries(REVIEW_MANIFEST_PATHS).map(([key, path]) => [key, readJson(ROOT, path)]));
export const sourceCommit = 'a'.repeat(40);
// 생성기는 매니페스트 v2 의 기능 소유와 구성으로 투영한다(11단계 C3).
export const modules = loadComposerModules(ROOT);
export const ownership = composerOwnership(modules);
export const hash = value => createHash('sha256').update(`${JSON.stringify(value, null, 2)}\n`).digest('hex');

export function copyInputs(output) {
  for (const path of [
    'frontend/src', 'frontend/e2e', 'frontend/next.config.ts',
    'frontend/package.json', 'frontend/pnpm-lock.yaml', 'frontend/tsconfig.json',
    'config', 'docs', 'scripts', 'package.json', '.agent/knowledge',
    'api-server/src/main/java', 'api-server/src/test/java',
    'business-app/src/main/java', 'business-app/src/test/java',
    'business-core/src/main/java', 'business-core/src/test/java',
    'foundation/src/main/java', 'foundation/src/test/java',
    // 투영은 지운 ErrorCode 가 소유한 메시지 키를 함께 걷으므로 번들이 있어야 한다(Phase 2 D6).
    'foundation/src/main/resources/egovframework/message',
    'api-server/src/main/resources/db/migration/R__zz_seed_base_admin.sql',
  ]) {
    mkdirSync(dirname(join(output, path)), { recursive: true });
    cpSync(join(ROOT, path), join(output, path), { recursive: true });
  }
}

export function cleanupOwnedFixture(directory) {
  const resolved = resolve(directory);
  assert.equal(dirname(resolved), resolve(tmpdir()));
  assert.ok(resolved.startsWith(join(resolve(tmpdir()), 'egov-governance-projection-')));
  rmSync(resolved, { recursive: true });
}

/** 구성별 투영 시험을 나눠 담는 파일 수. 파일 이름은 reusable-governance-projection-profiles-<1..PROFILE_SHARDS>.test.mjs 다. */
export const PROFILE_SHARDS = 4;

/*
 * 구성 목록(compositionProfiles)에서 차례를 PROFILE_SHARDS 로 나눈 나머지가 shard - 1 인 구성의 투영 시험을 등록한다. 나눈 파일이
 * 하나라도 없으면 그 파일이 맡던 구성의 시험이 조용히 사라지므로, 남은 파일이 적재될 때 실패한다(시험 수가 줄지 않게 지킨다).
 */
export function registerProfileProjectionTests(shard) {
  if (!Number.isInteger(shard) || shard < 1 || shard > PROFILE_SHARDS) throw new Error(`profile projection shard must be 1..${PROFILE_SHARDS}: ${shard}`);
  const missing = Array.from({ length: PROFILE_SHARDS }, (_, index) => `reusable-governance-projection-profiles-${index + 1}.test.mjs`)
    .filter(name => !existsSync(join(ROOT, 'scripts', name)));
  if (missing.length) throw new Error(`profile projection shard files are missing, so their compositions would go untested: ${missing.join(', ')}`);
  for (const profileName of compositionProfiles().filter((_, index) => index % PROFILE_SHARDS === shard - 1)) {
    test(`${profileName} source projection rebuilds actual census, retains provenance, and leaves adoption pending`, () => {
      const output = mkdtempSync(join(tmpdir(), 'egov-governance-projection-'));
      try {
        copyInputs(output);
        const copied = walk(output, () => true).map(path => normalize(relative(output, path)));
        // 프리셋도 구성 경로로 생성한다(DEC-OPS-239) — 모든 프로필이 해석된 구성을 갖는다.
        const composition = resolveProjectRecipe({ schemaVersion: 1, project: { name: 'governance-probe' }, sourceRef: 'v1.0.0',
          selection: profileName === 'custom' ? { domains: [] } : { preset: profileName } }, loadProjectComposerCatalog(ROOT));
        // 생성기와 같은 프로필(composerProfile)과 같은 projector 로 투영한다 — 시작 구성과 직접 선택이 같은 기능 투영이다(11단계 C3).
        const profile = composerProfile(modules, composition);
        const projector = createFrontendProjector({ composition, files: copied.filter(file => file.startsWith('frontend/')) });
        const java = pruneJava(output, ownership, profile);
        const support = modules.files['memoreport.json'].backend.supportFiles;
        assert.ok(support.length > 0, 'the memo report declares support files');
        for (const file of support) {
          assert.equal(existsSync(join(output, file)), composition.resolvedDomains.includes('memoreport'), `${profileName}: domain support ${file}`);
        }
        const markerBlocks = applyFrontendProjection(output, projector);
        // lock.frontend.markerBlocks: 소유 기능이 구성에 없어 걷은 블록 수와 그 블록이 있던 파일 수다(시작 구성과 직접 선택이 같은 셈).
        //   이 단언이 집계를 '내용이 바뀐 파일 수'로 바꾸는 변이를 잡는다(블록 수와 파일 수가 다르다).
        //   마커 토큰이 곧 소유 기능이다(11단계 C6) — 기능 파일의 마커 선언에서 빠진 기능의 블록을 파일별로 센다.
        const excludedByFile = new Map();
        for (const row of modules.extras.markerBlocks) {
          if (!composition.resolvedDomains.includes(row.feature)) excludedByFile.set(row.file, (excludedByFile.get(row.file) ?? 0) + row.blocks);
        }
        const excluded = [...excludedByFile.values()];
        assert.deepEqual({ strippedBlocks: markerBlocks.strippedBlocks, changedFiles: markerBlocks.changedFiles },
          { strippedBlocks: excluded.reduce((sum, count) => sum + count, 0), changedFiles: excluded.filter(Boolean).length },
          `${profileName}: lock.frontend.markerBlocks`);
        assert.equal(Object.hasOwn(markerBlocks, 'excludedPacks'), false, `${profileName}: the projection does not report packs`);
        pruneFrontend(output, projector.directPaths);
        // 생성기처럼 복사한 v1 manifest 를 생성물에 남기지 않는다(11단계 C5). 표지는 매니페스트 v2 의 활성 구성이다.
        rmSync(join(output, 'config/reusable-base-profiles.json'));
        writeProjectedModules(output, modules, composition, activeCompositionEntry(modules, composition, profile, java));
        writeFileSync(join(output, 'config/governance/migration-adoption-review.json'), JSON.stringify({ status: 'approved', owner: 'synthetic-upstream-operator' }));
        const result = projectReusableGovernance({
          sourceRoot: ROOT, outputRoot: output, profile: profileName, sourceCommit, composition,
          projectSource: (file, text) => projector.project(file, text).source,
        });
        const projectionLedger = writeProjectionLedger(output, buildProjectionLedger(output, copied));
        // 지운 파일이 원장에 남는다. 복사한 v1 manifest 는 어느 구성에도 남기지 않으므로(11단계 C5) 아무것도 걷지 않는 demo 도 그 한 파일을 적는다.
        assert.ok(projectionLedger.files > 0, `${profileName}: 지운 파일이 원장에 남는다`);
        if (profileName === 'demo') assert.deepEqual(readJson(output, PROJECTION_LEDGER_PATH).removedFiles, ['config/reusable-base-profiles.json']);
        const lock = { schemaVersion: 1, profile: profileName, sourceCommit,
          composition: { ...composition, sourceCommit }, projectionLedger,
          governance: { path: 'config/governance/reusable-governance-projection.json', projectionSha256: canonicalJsonSha256(result) } };
        writeFileSync(join(output, 'reusable-base-lock.json'), `${JSON.stringify(lock, null, 2)}\n`);
        assert.deepEqual(inspectReusableGovernance(output).errors, []);
        // 원장은 생성기가 한 일의 기록이다 — 고치면 lock 해시가, 있는 파일을 적으면 실재 검사가 막는다.
        const ledgerText = readFileSync(join(output, PROJECTION_LEDGER_PATH), 'utf8');
        const ledger = JSON.parse(ledgerText);
        writeFileSync(join(output, PROJECTION_LEDGER_PATH), `${JSON.stringify({ ...ledger,
          removedFiles: [...ledger.removedFiles, 'package.json'].sort() }, null, 2)}\n`);
        // 생성물의 화면은 구성이 남겨야 할 화면과 같아야 한다(슬롯 단계 PR-1). core 가 걷는 댓글 관리 화면과, 목적지가 빠져 사라진
        // 스크랩 등록 리다이렉트 화면을 되살리면 둘 다 구성 밖 화면이다 — 투영 뒤의 디스크는 수렴 없이 그대로 본다.
        const revived = profileName === 'core'
          ? ['frontend/src/app/admin/collaboration/scraps/insertScrap/page.tsx', 'frontend/src/app/admin/system/comments/page.tsx'] : [];
        for (const page of revived) {
          assert.equal(existsSync(join(output, page)), false, `${profileName} removes ${page}`);
          mkdirSync(dirname(join(output, page)), { recursive: true });
          writeFileSync(join(output, page), readFileSync(join(ROOT, page)));
        }
        // 생성물의 기능 파일 집합은 구성과 같아야 한다(11단계 C3). 빠진 기능의 파일을 되살리거나(프리셋·빈 선택) 남은 기능의 파일을 걷으면(전체) 붉다.
        const absent = Object.keys(modules.declarations.features).find(domain => !composition.resolvedDomains.includes(domain));
        const moduleFile = join(output, MODULES_DIRECTORY, `${absent ?? 'board'}.json`);
        const moduleText = absent ? undefined : readFileSync(moduleFile, 'utf8');
        if (absent) writeFileSync(moduleFile, readFileSync(join(ROOT, MODULES_DIRECTORY, `${absent}.json`)));
        else rmSync(moduleFile);
        const tampered = inspectReusableGovernance(output).errors.join('\n');
        assert.match(tampered, absent ? new RegExp(`projected module set differs from composition \\(extra: ${absent}\\.json; missing: -\\)`)
          : /projected module set differs from composition \(extra: -; missing: board\.json\)/);
        // 기능 파일 집합이 활성 구성과 다르면 생성물 표지도 생성기 투영 구조가 아니다(11단계 C5).
        assert.match(tampered, new RegExp(`active='${profileName}' 인데 생성기 투영 구조가 아니다`));
        if (absent) rmSync(moduleFile);
        else writeFileSync(moduleFile, moduleText);
        assert.match(tampered, /Projection ledger checksum mismatch/);
        assert.match(tampered, /Projection ledger lists files that exist: .*package\.json/);
        if (revived.length) {
          assert.match(tampered, /Projected screens differ from the composition: missing \[\] extra \[\/admin\/collaboration\/scraps\/insertScrap, \/admin\/system\/comments\]/);
        }
        for (const page of revived) rmSync(join(output, page));
        writeFileSync(join(output, PROJECTION_LEDGER_PATH), ledgerText);
        writeFileSync(join(output, 'reusable-base-lock.json'), `${JSON.stringify({ ...lock, projectionLedger: undefined }, null, 2)}\n`);
        assert.match(inspectReusableGovernance(output).errors.join('\n'), /Source lock must bind the projection ledger/);
        writeFileSync(join(output, 'reusable-base-lock.json'), `${JSON.stringify(lock, null, 2)}\n`);
        assert.deepEqual(inspectReusableGovernance(output).errors, []);
        // 구성 스냅숏 연결을 지우고 lock 해시를 다시 맞춰도, 출처를 증명할 수 없는 투영은 어느 프로필에서도 통과하지 않는다.
        const { composition: boundComposition, ...unbound } = result;
        assert.ok(boundComposition, `${profileName}: the projection binds its composition`);
        writeFileSync(join(output, lock.governance.path), `${JSON.stringify(unbound, null, 2)}\n`);
        writeFileSync(join(output, 'reusable-base-lock.json'), `${JSON.stringify({ ...lock,
          governance: { ...lock.governance, projectionSha256: canonicalJsonSha256(unbound) } }, null, 2)}\n`);
        assert.ok(inspectReusableGovernance(output).errors.includes('Generated projection requires a resolved composition snapshot'), profileName);
        writeFileSync(join(output, lock.governance.path), `${JSON.stringify(result, null, 2)}\n`);
        writeFileSync(join(output, 'reusable-base-lock.json'), `${JSON.stringify(lock, null, 2)}\n`);
        assert.deepEqual(inspectReusableGovernance(output).errors, []);
        assert.deepEqual(analyzeRouteCapabilities(output, join(output, 'config/ui-route-capabilities.json')).result.errors, []);
        assert.deepEqual(readJson(output, 'config/ui-url-state-census.json'), buildUrlStateCensus({ repoRoot: output }));
        assert.equal(result.sourceCommit, sourceCommit);
        assert.equal(result.profile, profileName);
        assert.equal(result.activeArtifacts.filter(row => row.path === 'config/governance/permission-catalog.json').length, 1);
        const adoption = readJson(output, 'config/governance/adoption-review.json');
        assert.equal(adoption.status, 'pending');
        assert.equal(adoption.profile, profileName);
        assert.equal(adoption.reviewedAt, null);
        assert.deepEqual(adoption.evidence, []);
        const migrationAdoption = readJson(output, 'config/governance/migration-adoption-review.json');
        assert.equal(migrationAdoption.status, 'pending');
        assert.equal(migrationAdoption.owner, null);
        assert.equal(migrationAdoption.product, 'migration-tool');
        assert.equal(migrationAdoption.profile, null);
        const expectedCounts = { core: [5, 5], collaboration: [7, 6], demo: [8, 8], custom: [5, 5] }[profileName];
        assert.equal(result.projectedReviewScopes.uiQuality.scenarioIds.length, expectedCounts[0]);
        assert.equal(result.projectedReviewScopes.visibleTerms.pilotIds.length, expectedCounts[1]);
        assert.deepEqual(readJson(output, REVIEW_MANIFEST_PATHS.krds).profiles, upstreamReviews.krds.profiles);
        const home = readJson(output, REVIEW_MANIFEST_PATHS.visibleTerms).pilotCensus.find(row => row.id === 'content-user-home');
        assert.ok(home, 'the retained home pilot must continue to check remaining source');
        assert.deepEqual(home.findings, upstreamReviews.visibleTerms.pilotCensus.find(row => row.id === home.id).findings);
        // 업무 홈 문구 증거: core 셸 셋(page·셸·최근 활동) + 게시판 조각 셋·실시간 둘(collaboration) + 결재 대기 카드(demo, Phase 2 9단계).
        assert.equal(home.sources.length, { core: 3, custom: 3, collaboration: 8, demo: 9 }[profileName]);
        // Upstream owner decisions reopen as awaiting input in every generated profile (ADR-0018).
        const isDecision = finding => finding.status === 'accepted-by-owner';
        assert.ok(upstreamReviews.visibleTerms.pilotCensus.flatMap(row => row.findings ?? []).some(isDecision),
          'the upstream ledger must carry an owner decision for this proof to mean anything');
        const projectedTerms = readJson(output, REVIEW_MANIFEST_PATHS.visibleTerms).pilotCensus;
        assert.equal(projectedTerms.flatMap(row => row.findings ?? []).filter(isDecision).length, 0);
        const userLog = projectedTerms.find(row => row.id === 'content-user-log');
        const auditFields = userLog.findings.find(finding => finding.kind === 'technical-audit-fields');
        assert.equal(auditFields.status, 'blocked-input');
        assert.equal(auditFields.decisionRef, undefined);
        assert.equal(userLog.status, 'open');
        assert.ok(result.projectedReviewScopes.visibleTerms.resetDecisions
          .some(row => row.pilotId === 'content-user-log' && row.kind === 'technical-audit-fields'));
        for (const path of MEMORY_PATHS) {
          const memory = readFileSync(join(output, path), 'utf8');
          assert.match(memory, /derived-generated-profile-index/);
          assert.match(memory, /생성 시 두 기관 승인 원장은 pending/);
          assert.doesNotMatch(memory, /CTX-016|OCI V2_100/);
        }
        assert.ok(result.routes.length > 0);
        assert.ok(result.urlRecordIds.length > 0);
        if (profileName === 'demo') assert.equal(result.removedPagePermissions.length, 0);
        else assert.ok(result.removedPagePermissions.length > 0);
        const projectedPermissions = readJson(output, 'config/governance/permission-catalog.json').pagePermissions;
        const upstreamPermissions = readJson(ROOT, 'config/governance/permission-catalog.json').pagePermissions;
        for (const [route, required] of Object.entries(projectedPermissions)) {
          assert.deepEqual(required, upstreamPermissions[route], `${route} authorization must not change`);
        }
        // [10단계 10b] 권한 정의는 구성으로 함께 투영된다 — 카탈로그 = 구성 코드, 인가 원장 바인딩 = 핸들러 소스가 남는 행, 화면 목록·묶음의
        // 권한 ⊆ 카탈로그. 모든 기능을 고른 구성은 권한 원장·런타임 생성물·묶음·화면 목록이 원본과 바이트가 같다.
        const projectedCatalog = readJson(output, PERMISSION_CATALOG_PATH);
        assert.deepEqual(projectedCatalog.permissions.map(row => row.code).sort(), [...composition.permissionCodes].sort());
        const projectedBindings = readJson(output, AUTHORIZATION_POLICY_PATH).operationBindings;
        const sourceBindings = readJson(ROOT, AUTHORIZATION_POLICY_PATH).operationBindings;
        assert.equal(result.permissionProjection.operationBindings, projectedBindings.length);
        assert.equal(result.permissionProjection.removedOperationBindings, sourceBindings.length - projectedBindings.length);
        assert.ok(projectedBindings.every(row => row.access !== 'PERMISSION' || composition.permissionCodes.includes(row.permission)));
        const projectedRegistry = readScreenRegistryArtifact(readFileSync(join(output, SCREEN_REGISTRY_OUTPUT), 'utf8'));
        const catalogCodes = new Set(composition.permissionCodes);
        assert.ok(projectedRegistry.screens.every(screen => screen.permissions.every(row => catalogCodes.has(row.code))));
        assert.ok(projectedRegistry.bundles.length > 0 && projectedRegistry.bundles.every(bundle => bundle.permissions.every(code => catalogCodes.has(code))));
        const sameText = path => readFileSync(join(output, path), 'utf8').replace(/\r\n?/gu, '\n') === readFileSync(join(ROOT, path), 'utf8').replace(/\r\n?/gu, '\n');
        const permissionFiles = [PERMISSION_CATALOG_PATH, AUTHORIZATION_POLICY_PATH, PERMISSION_BUNDLES_PATH, SCREEN_REGISTRY_OUTPUT, ...PERMISSION_ARTIFACT_PATHS];
        if (profileName === 'demo') {
          for (const path of permissionFiles) assert.ok(sameText(path), `demo: ${path} must equal the source`);
          assert.equal(result.permissionProjection.removedOperationBindings, 0);
        } else {
          assert.ok(projectedBindings.length < sourceBindings.length, `${profileName}: bindings of removed handlers leave the ledger`);
          for (const path of [PERMISSION_CATALOG_PATH, AUTHORIZATION_POLICY_PATH, SCREEN_REGISTRY_OUTPUT]) assert.ok(!sameText(path), `${profileName}: ${path} is projected`);
        }
        for (const snapshot of result.upstreamSnapshots) {
          assert.ok(existsSync(join(output, snapshot.path)));
          assert.equal(readFileSync(join(output, snapshot.path), 'utf8'), readFileSync(join(ROOT, snapshot.sourcePath), 'utf8').replace(/\r\n?/gu, '\n'));
        }
        const projectedApproval = readJson(output, 'config/ui-url-state-approval.json');
        for (const row of projectedApproval.classes.filter(row => row.reviewState === 'approved')) {
          assert.deepEqual(row.approvals, approval.classes.find(original => original.classId === row.classId).approvals);
          assert.ok(row.selector.recordIds.every(id => result.urlRecordIds.includes(id)));
        }
        if (profileName === 'core') {
          function mutateFile(path, transform, expectedError) {
            const original = readFileSync(join(output, path), 'utf8');
            try {
              writeFileSync(join(output, path), transform(original));
              assert.match(inspectReusableGovernance(output).errors.join('\n'), expectedError);
            } finally { writeFileSync(join(output, path), original); }
          }
          mutateFile(result.upstreamSnapshots[0].path, text => text + '\n', /snapshot hash mismatch/);
          mutateFile('frontend/src/proxy.ts', text => text + '\n// source-evidence mutation\n', /Source evidence scope changed|Inherited source evidence changed/);
          // [10단계 10b] 묶음에 구성 밖 권한을 손으로 더하거나, 지워진 핸들러의 바인딩을 원장에 남기면 생성물 불변식이 붉다.
          mutateFile(PERMISSION_BUNDLES_PATH, text => {
            const changed = JSON.parse(text);
            changed.bundles[0].permissions.push('MAIL_SEND');
            return JSON.stringify(changed);
          }, /Projected screen registry: permission bundle ledger is invalid: Unknown permission code in permission bundle basic-work: MAIL_SEND/);
          mutateFile(AUTHORIZATION_POLICY_PATH, text => {
            const changed = JSON.parse(text);
            const stale = readJson(ROOT, AUTHORIZATION_POLICY_PATH).operationBindings.find(row => row.handler.includes('.MailApiController#'));
            changed.operationBindings.push({ ...stale, access: 'AUTHENTICATED', permission: null });
            return JSON.stringify(changed);
          }, /operation binding handler has no source: nuri\.api\.controller\.business\.mail\.MailApiController#/);
          mutateFile('reusable-base-lock.json', text => JSON.stringify({ ...JSON.parse(text), profile: 'demo' }), /lock profile/);
          // lock 에 pack 축이 되살아나거나 v1 manifest 가 다시 실리면 붉다(11단계 C5).
          mutateFile('reusable-base-lock.json', text => JSON.stringify({ ...JSON.parse(text), packs: ['core'] }), /Source lock profile\/commit mismatch/);
          writeFileSync(join(output, 'config/reusable-base-profiles.json'), readFileSync(join(ROOT, 'config/reusable-base-profiles.json')));
          assert.match(inspectReusableGovernance(output).errors.join('\n'), /Generated artifact must not carry the upstream v1 manifest/);
          rmSync(join(output, 'config/reusable-base-profiles.json'));
          // 표지가 빠지면(lock 은 있다) 생성물 판정이 실패한다.
          mutateFile('config/modules/presets.json', text => { const { active: _marker, ...rest } = JSON.parse(text); return JSON.stringify(rest); },
            /활성 구성 표지\(active\)가 없다/);
          mutateFile('.agent/memory/project-context.md', text => text + '\nUpstream production state is approved here.\n', /Generated memory must separate/);
          mutateFile('config/ui-url-state-approval.json', text => {
            const changed = JSON.parse(text);
            changed.classes.find(row => row.reviewState === 'approved').selector.stateItemNames.push('token');
            return JSON.stringify(changed);
          }, /Inherited state selector widened|Active URL approval is invalid/);
          // Rebinding checksums alone cannot shrink declared feature ownership.
          const metadataPath = 'config/governance/reusable-governance-projection.json';
          const oldMetadata = readFileSync(join(output, metadataPath), 'utf8');
          const oldLock = readFileSync(join(output, 'reusable-base-lock.json'), 'utf8');
          try {
            const changed = JSON.parse(oldMetadata);
            changed.projectedReviewScopes.uiQuality.scenarioIds.shift();
            writeFileSync(join(output, metadataPath), JSON.stringify(changed));
            const changedLock = JSON.parse(oldLock);
            changedLock.governance.projectionSha256 = canonicalJsonSha256(changed);
            writeFileSync(join(output, 'reusable-base-lock.json'), JSON.stringify(changedLock));
            assert.match(inspectReusableGovernance(output).errors.join('\n'), /review scope metadata drifted/);
          } finally {
            writeFileSync(join(output, metadataPath), oldMetadata);
            writeFileSync(join(output, 'reusable-base-lock.json'), oldLock);
          }
        }
        if (composition) {
          for (const permissionPath of [snapshotPathFor('config/governance/permission-catalog.json'), 'config/governance/permission-catalog.json']) {
            const originalPermissions = readFileSync(join(output, permissionPath), 'utf8');
            try {
              const changedPermissions = JSON.parse(originalPermissions);
              const permission = changedPermissions.permissions.find(row => row.defaultGroups.length > 0);
              assert.ok(permission, 'the permission catalog must contain a default group for this mutation proof');
              permission.defaultGroups.pop();
              writeFileSync(join(output, permissionPath), JSON.stringify(changedPermissions));
              const errors = inspectReusableGovernance(output).errors.join('\n');
              if (permissionPath.includes('/upstream-review/')) {
                assert.match(errors, /Upstream snapshot hash mismatch/);
                assert.match(errors, /Composition catalog differs from upstream permission snapshot/);
              } else assert.match(errors, /Active review artifact changed: config\/governance\/permission-catalog\.json/);
            } finally { writeFileSync(join(output, permissionPath), originalPermissions); }
            assert.deepEqual(inspectReusableGovernance(output).errors, []);
          }
          const originalMenuSnapshot = readFileSync(join(output, COMPOSER_MENU_SNAPSHOT_PATH), 'utf8');
          try {
            const changedMenuSnapshot = JSON.parse(originalMenuSnapshot);
            changedMenuSnapshot.menus[0].menu_nm = 'Unreviewed replacement';
            writeFileSync(join(output, COMPOSER_MENU_SNAPSHOT_PATH), JSON.stringify(changedMenuSnapshot));
            assert.match(inspectReusableGovernance(output).errors.join('\n'), /Composer menu snapshot checksum mismatch/);
          } finally { writeFileSync(join(output, COMPOSER_MENU_SNAPSHOT_PATH), originalMenuSnapshot); }
          assert.deepEqual(inspectReusableGovernance(output).errors, []);
          const selection = readJson(output, COMPOSER_SELECTION_PATH);
          assert.equal(selection.composition.compositionHash, composition.compositionHash);
          selection.composition.permissionCodes.push('MAIL_SEND');
          writeFileSync(join(output, COMPOSER_SELECTION_PATH), JSON.stringify(selection));
          assert.match(inspectReusableGovernance(output).errors.join('\n'), /snapshot checksum mismatch|does not match/);
        }
        console.log(`${profileName}: routes=${result.routes.length}, URL records=${result.urlRecordIds.length}, inherited=${result.inheritedUrlRecordIds.length}, adoption=pending`);
      } finally {
        cleanupOwnedFixture(output);
      }
    });
  }
}
