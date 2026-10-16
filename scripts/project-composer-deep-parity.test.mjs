// 정밀 점검 계약(project-composer-deep.test.mjs)에서 가장 오래 걸리는 시험 가운데 하나(약 5분)를 따로 둔다 — node 는 한
// 파일의 시험을 차례로 돌리고 파일끼리는 함께 돌리므로, 나눈 만큼 운영 계약 전체 실행이 짧아진다. 준비물은 함께 쓴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { compositionDeepPlan, deepSummary } from './project-composer-deep.mjs';
import { projectSourceTree } from './generate-reusable-base-source.mjs';
import { composerProfile } from './project-composer-source.mjs';
import { assertRemovedGatesAcknowledged, pruneHistoricalMigrationTests, pruneUpstreamAtlas } from './reusable-source-gates.mjs';
import { copySourceTree, isCopyableSourceFile, normalize } from './reusable-source-tree.mjs';
import { AUTHORIZATION_POLICY_PATH, PERMISSION_BUNDLES_PATH, PERMISSION_CATALOG_PATH, applyPermissionSourceProjection, applyScreenAndBundleProjection,
  projectOperationBindings } from './reusable-permission-projection.mjs';
import { projectRemovedRouteAliases } from './reusable-governance-projection.mjs';
import { ROUTE_LEDGER_PATH } from './reusable-page-survival.mjs';
import { SCREEN_REGISTRY_INPUTS, UPSTREAM_ROUTE_LEDGER } from './screen-registry-model.mjs';
import { buildUnreviewedBaselineManifest, inspectRouteRepository } from './ui-route-capabilities-contract.mjs';
import { COMPOSER_SELECTION_PATH } from './project-composer-recipe.mjs';
import { projectSourceApiDocs } from './reusable-contract-projection.mjs';
import { isContractScopeFile, predictFromProjection, vanishedContractReferences } from './reusable-contract-references.mjs';
import { root, readJson, catalog, modules, ownership, files, compose, projectionFiles, quietly } from './project-composer-deep.test-helpers.mjs';

/*
 * 정밀 점검(설계서 10장 plan/deep, C3)은 생성기의 투영·규칙 제거·승인 판정을 디스크를 바꾸지 않고 미리 한다. 미리 본 결과가
 * 실제 생성과 다르면 '통과'라고 말한 구성이 생성 단계에서 실패하거나, 지워질 파일 수를 틀리게 말한다. 그래서 복사한 트리에
 * 생성기의 단계(projectSourceTree·규칙 제거·승인 대조)를 실제로 돌려 지워진 파일 집합·개수·게이트가 정확히 같은지 대조한다.
 */
test('the deep plan removes exactly the files, cascades and gates the generator projection removes', { timeout: 600_000 }, t => {
  // 시작 구성, 직접 선택, 소비자가 소유한 지원 파일을 걷는 선택을 하나씩 본다(모두 해석기가 계산한 제거 경로로 투영한다).
  const selections = [{ preset: 'core' }, { domains: ['mail'] }, { domains: ['template'] }];
  for (const selection of selections) {
    const composition = compose(selection);
    const label = JSON.stringify(selection);
    const deep = compositionDeepPlan({ root, catalog, composition, files, modules });
    assert.deepEqual(deep.blockers, [], `${label}: the real checkout has no projection blocker`);

    const output = mkdtempSync(join(tmpdir(), 'composer-deep-'));
    t.after(() => rmSync(output, { recursive: true, force: true, maxRetries: 5 }));
    copySourceTree(output, { sourceRoot: root, files: projectionFiles });
    const copied = projectionFiles.map(normalize).filter(file => isCopyableSourceFile(file, root) && (file.endsWith('.java') || file.startsWith('frontend/')));
    const profile = composerProfile(modules, composition);
    const { java, frontend } = projectSourceTree(output, { ownership, profile: structuredClone(profile), composition, sourceRoot: root, catalog });
    const actuallyRemoved = copied.filter(file => !existsSync(join(output, file))).sort();

    assert.deepEqual([...deep.java.files, ...deep.frontend.files].filter(file => copied.includes(file)).sort(), actuallyRemoved,
      `${label}: the deep plan must name exactly the files the generator removes`);
    assert.equal(deep.java.removedFiles, java.removedFiles, `${label}: Java removal count`);
    assert.equal(deep.frontend.removedFiles, frontend.removedFiles, `${label}: frontend removal count`);
    assert.equal(deep.frontend.cascadeFiles, frontend.cascadedFiles, `${label}: frontend cascade count`);
    assert.deepEqual(deep.removedGates, [...java.removedGates.map(gate => gate.file), ...frontend.removedGates].sort(), `${label}: removed gates`);
    // API 계약(10c-2): 정밀 점검이 말한 빠지는 연산은 생성기가 투영한 트리에서 판정한 것과 같다.
    const contract = projectSourceApiDocs(root, file => !existsSync(join(output, file)));
    assert.deepEqual(deep.apiContract.removedOperationIds, contract.removedOperations.map(operation => operation.operationId).sort(), `${label}: removed operations`);
    assert.deepEqual({ ...deep.apiContract, removedOperationIds: undefined },
      { ...contract.summary, removedOperationIds: undefined, keptAliasesWithoutBase: contract.keptAliasesWithoutBase }, `${label}: api-docs summary`);
    assert.ok(deep.apiContract.removedOperations > 0, `${label}: the projection removes operations`);
    // 사라진 계약 이름 판정(트랙 K 검토 #2): 정밀 점검이 투영 내용으로 미리 본 자리와, 생성기가 투영한 트리의 디스크 내용에서 찾는 자리가 같다.
    const onDisk = vanishedContractReferences(copied.filter(file => isContractScopeFile(file) && existsSync(join(output, file)))
      .map(file => ({ file, source: readFileSync(join(output, file), 'utf8') })), predictFromProjection(root, contract));
    assert.deepEqual(deep.blockers.find(blocker => blocker.code === 'API_CONTRACT_REFERENCE')?.files ?? [],
      [...new Set([...onDisk.hits, ...onDisk.issues].map(entry => entry.file))].sort(), `${label}: contract name references`);
    assert.ok(deep.java.cascadeFiles > 0 && deep.java.cascadeFiles < deep.java.removedFiles, `${label}: Java cascade is a strict part of the removal`);
    assert.match(deepSummary(deep), /^제거: Java \d+개\(연쇄 \d+\) · 프런트 \d+개\(연쇄 \d+\) · 검증 게이트 \d+건$/);

    // 규칙 제거와 승인 대조도 생성기와 같다: 같은 파일을 고르고, 정밀 점검이 통과라 말한 구성은 생성기 승인 대조도 통과한다.
    const ruleRemovals = { 'historical-migration-tests': pruneHistoricalMigrationTests(output).files, 'upstream-atlas': pruneUpstreamAtlas(output).files };
    assert.deepEqual(deep.ruleRemovals, ruleRemovals, `${label}: rule removals`);
    assert.ok(ruleRemovals['historical-migration-tests'].length > 0, `${label}: the rule selects real historical tests`);
    quietly(() => assertRemovedGatesAcknowledged(composition.profile, profile, java, frontend, ruleRemovals));

    // 권한 투영(10단계 10b)도 생성기와 같다: 생성기는 투영한 트리에서 핸들러 소스가 사라진 바인딩을 뺀다.
    const generatorBindings = projectOperationBindings(readJson(join(root, AUTHORIZATION_POLICY_PATH)).operationBindings, {
      sourceExists: file => existsSync(join(root, file)), removed: file => !existsSync(join(output, file)) });
    assert.deepEqual([deep.permissionProjection.operationBindings, deep.permissionProjection.removedOperationBindings],
      [generatorBindings.bindings.length, generatorBindings.removed.length], `${label}: retained and removed operation bindings`);
    assert.equal(deep.permissionProjection.permissions, composition.permissionCodes.length, `${label}: catalog = composition codes`);
    // 카탈로그 page·화면 목록·묶음 투영(트랙 B 검토 #1·#3)도 생성기와 같다: 복사한 트리에 생성기의 거버넌스 단계를 차례로 돌린다 —
    // 목적지가 사라진 리다이렉트 정리(넘기는 page 를 지운다), 카탈로그·바인딩 투영(남는 page 전부를 판정한다), 라우트 원장이 정해진 뒤
    // 화면 목록·묶음 투영. 정밀 점검은 원본 행을 거른 판정이라, 남는 page 모집단·화면 수·남는/빠지는 묶음·생성 제외 권한이 같아야 한다.
    for (const file of [PERMISSION_CATALOG_PATH, AUTHORIZATION_POLICY_PATH, PERMISSION_BUNDLES_PATH, SCREEN_REGISTRY_INPUTS.menus]) {
      mkdirSync(dirname(join(output, file)), { recursive: true });
      copyFileSync(join(root, file), join(output, file));
    }
    mkdirSync(dirname(join(output, UPSTREAM_ROUTE_LEDGER)), { recursive: true });
    copyFileSync(join(root, ROUTE_LEDGER_PATH), join(output, UPSTREAM_ROUTE_LEDGER));
    // 라우트 원장은 생성물 표지(활성 구성 하나와 그 기능 파일)와 구성 스냅숏으로 화면 제외 경로를 읽는다 — 생성기가 쓰는 모양을 둔다.
    const writeOutput = (file, value) => { mkdirSync(dirname(join(output, file)), { recursive: true }); writeFileSync(join(output, file), JSON.stringify(value)); };
    writeOutput('config/modules/presets.json', { schemaVersion: 2, active: composition.profile,
      presets: [{ id: composition.profile, domains: composition.resolvedDomains }] });
    for (const domain of composition.resolvedDomains) writeOutput(`config/modules/${domain}.json`, { id: domain });
    writeOutput(COMPOSER_SELECTION_PATH, { catalog, composition });
    projectRemovedRouteAliases(output, new Set(readJson(join(root, ROUTE_LEDGER_PATH)).routes.map(row => row.route)));
    const generatorCatalog = applyPermissionSourceProjection({ sourceRoot: root, outputRoot: output, composition });
    const generatorScreens = applyScreenAndBundleProjection({ sourceRoot: root, outputRoot: output,
      ledger: buildUnreviewedBaselineManifest(inspectRouteRepository(output), {}) });
    const { removedPagePermissions, screens, bundles, reducedBundles, droppedBundles, generatedExclusions } = deep.permissionProjection;
    assert.deepEqual({ removedPagePermissions, screens, bundles, reducedBundles, droppedBundles, generatedExclusions }, {
      removedPagePermissions: generatorCatalog.removedPagePermissions, screens: generatorScreens.screens, bundles: generatorScreens.bundles,
      reducedBundles: generatorScreens.reducedBundles, droppedBundles: generatorScreens.droppedBundles,
      generatedExclusions: generatorScreens.generatedExclusions,
    }, `${label}: catalog pages, screens and bundles`);
    assert.ok(removedPagePermissions.length > 0 && droppedBundles.length > 0, `${label}: the projection removes pages and bundles`);
    // 권한이 빠진 묶음은 이름·설명을 원본에서 들고 가지 않는다(GAP-COMPOSE-001) — 세 구성 모두 '기본 업무'의 권한이 줄어든다.
    assert.ok(reducedBundles.includes('basic-work'), `${label}: the basic work bundle loses permissions`);
  }
});
