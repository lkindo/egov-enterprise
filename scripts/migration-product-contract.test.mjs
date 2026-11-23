import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { isOwnedDoc, validateDocumentationLinks } from './docs-link-integrity.mjs';
import { MIGRATION_PRODUCT_DOCS, generateMigrationProduct } from './generate-migration-product.mjs';
import { migrationProvenanceDigest, verifySourceMigrationProfileProvenance } from './migration-profile-provenance.mjs';
import { readMigrationAssetLedger } from './reusable-product-assets.mjs';
import { ownedDocFiles } from './reusable-source-docs.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function isolatedEnvironment(ceiling) {
  // Disposable repositories must not execute a developer's global hooks or signing program.
  const env = { ...process.env, GIT_CEILING_DIRECTORIES: ceiling,
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' };
  // Neither a parent test runner nor its Git worktree may supply fixture state.
  for (const name of ['NODE_TEST_CONTEXT', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[name];
  return env;
}

function temporaryRoot(t) {
  const base = realpathSync(tmpdir());
  const fixture = mkdtempSync(resolve(base, 'migration-product-contract-'));
  t.after(() => {
    const back = relative(base, fixture);
    assert.ok(back.startsWith('migration-product-contract-') && !back.includes(sep) && !isAbsolute(back));
    assert.equal(realpathSync(fixture), fixture);
    rmSync(fixture, { recursive: true, force: true });
  });
  return fixture;
}

function git(cwd, env, args) {
  const child = spawnSync('git', args, { cwd, env, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

function initializeRepository(cwd, env, message = 'Independent initial history') {
  git(cwd, env, ['init', '--quiet']);
  git(cwd, env, ['-c', 'user.name=Migration Contract Fixture',
    '-c', 'user.email=migration-contract@example.invalid', 'commit', '--quiet', '--allow-empty',
    '-m', message]);
  return git(cwd, env, ['rev-parse', 'HEAD']);
}

function provenanceContract(outputRoot, env) {
  const child = spawnSync(process.execPath, ['--test',
    '--test-name-pattern=migration duration profile provenance matches its verification boundary',
    'scripts/migration-verification-contract.test.mjs'], { cwd: outputRoot, env, encoding: 'utf8' });
  assert.match(child.stdout, /^# tests 1$/m, child.stdout + child.stderr);
  return child;
}

test('standalone migration export retains independent verification and clears inherited environment approval', (t) => {
  const base = resolve(root, 'build/migration-product');
  const generatedRoot = resolve(base, `contract-${randomBytes(8).toString('hex')}`);
  t.after(() => {
    const back = relative(base, generatedRoot);
    assert.ok(back.startsWith('contract-') && !back.includes(sep) && !isAbsolute(back));
    rmSync(generatedRoot, { recursive: true, force: true });
  });
  const result = generateMigrationProduct({ sourceRoot: root, outputRoot: generatedRoot });
  // The real packaged workspace drill must resolve only its actual engine closure in every exported product.
  for (const input of ['engine.mjs', 'store.mjs', 'inputs.mjs']) {
    const file = `tools/migration-workspace/${input}`;
    assert.equal(readFileSync(resolve(generatedRoot, file), 'utf8'), readFileSync(resolve(root, file), 'utf8'));
  }
  for (const absent of ['server.mjs', 'ai.mjs', 'public']) {
    assert.equal(existsSync(resolve(generatedRoot, 'tools/migration-workspace', absent)), false);
  }
  assert.equal(readFileSync(resolve(generatedRoot, 'db_columns.json'), 'utf8'),
    readFileSync(resolve(root, 'db_columns.json'), 'utf8'),
    'default standalone export includes upstream db_columns.json for target standard validation');
  // 이관 문서는 이 제품으로 나간다(DEC-OPS-428). 기대값은 이 시험이 따로 든다 — 생성기의 목록을 기대값으로 쓰면 목록에서 한 줄을 빼도 통과한다.
  // 생성 애플리케이션 프로젝트에서 뺀 이관 문서(이관 제거 원장)는 여기 실려야 한다. 작업공간 실행 안내만 예외다 — 그 도구는 원본 저장소에서만 돈다.
  const workspaceGuide = 'docs/03-guides/migration-workspace-guide.md';
  const removedFromApplications = readMigrationAssetLedger(root).assets.filter(asset => asset.startsWith('docs/'));
  assert.ok(removedFromApplications.includes(workspaceGuide));
  const promisedDocs = [
    ...removedFromApplications.filter(doc => doc !== workspaceGuide),
    // 기관 승인 원장·실행 descriptor 의 절차와 이 도구의 결정 기록. 생성 프로젝트에도 남는 것이 있어 원장으로는 셀 수 없다.
    'docs/03-guides/governance-review-lifecycle.md',
    'docs/02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md',
    'docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md',
    'docs/02-architecture/decisions/ADR-0029-legacy-standardization-migration.md',
    'docs/02-architecture/decisions/ADR-0031-migration-ledger-confirmation-followup.md',
  ].sort();
  assert.deepEqual([...MIGRATION_PRODUCT_DOCS].sort(), promisedDocs);
  for (const doc of promisedDocs) assert.ok(existsSync(resolve(generatedRoot, doc)), doc);
  const productDocs = ownedDocFiles(generatedRoot);
  assert.ok(productDocs.includes('README.md') && promisedDocs.every(doc => productDocs.includes(doc)));
  // 제품에 없는 대상을 가리키던 링크는 글자만 남아 끊긴 링크가 없다.
  assert.deepEqual(validateDocumentationLinks({ repoRoot: generatedRoot, files: productDocs }).errors
    .filter(error => isOwnedDoc(error.split(' -> ')[0])), []);
  // 링크 정리 뒤의 README 가 약속한 문서를 빠짐없이 잇는다 — 대상이 없는 링크는 글자로 바뀌어 여기서 빠진다.
  const productReadme = readFileSync(resolve(generatedRoot, 'README.md'), 'utf8');
  assert.deepEqual([...new Set([...productReadme.matchAll(/\]\((docs\/[^)#\s]+)(?:#[^)\s]*)?\)/g)].map(match => match[1]))].sort(), promisedDocs);
  // 제품에 싣지 않는 절차(전체 복구)와 원본의 실측 기록은 위치를 글로 알린다.
  for (const pointer of ['docs/04-operations/backup-and-restore-runbook.md', 'docs/04-operations/known-gaps-detail.md', 'durationProfileProvenance.producerCommit']) {
    assert.ok(productReadme.includes(pointer), pointer);
  }
  assert.equal(existsSync(resolve(generatedRoot, 'docs/04-operations/backup-and-restore-runbook.md')), false);
  // README 가 안내하는 npm 명령은 이 제품에 있다. 설계와 도입 가이드에 남은 원본 전용 이름은 그 줄이나 바로 뒤 문단이 원본 저장소의 이름임을 밝힌다.
  const productScripts = Object.keys(JSON.parse(readFileSync(resolve(generatedRoot, 'package.json'), 'utf8')).scripts);
  const readmeAliases = [...new Set([...productReadme.matchAll(/`npm run ([a-z:-]+)/g)].map(match => match[1]))].sort();
  assert.deepEqual(readmeAliases.filter(alias => !productScripts.includes(alias)), ['migration:export']);
  for (const doc of ['docs/02-architecture/legacy-migration-tool-design.md', 'docs/03-guides/governance-review-lifecycle.md']) {
    const lines = readFileSync(resolve(generatedRoot, doc), 'utf8').split(/\r?\n/);
    const unexplained = lines.flatMap((line, index) => /npm run (?:verify:migration|review:migration|review:adoption:migration)(?![\w:-])/.test(line)
      && !/원본 저장소/.test(lines.slice(index, index + 4).join(' ')) ? [`${doc}:${index + 1}`] : []);
    assert.deepEqual(unexplained, []);
  }
  const isolatedRoot = temporaryRoot(t);
  const outputRoot = resolve(isolatedRoot, 'product');
  cpSync(generatedRoot, outputRoot, { recursive: true });
  const childEnv = isolatedEnvironment(isolatedRoot);
  const engineImport = "await import('./tools/migration-workspace/engine.mjs')";
  const importedEngine = spawnSync(process.execPath, ['--input-type=module', '--eval', engineImport],
    { cwd: outputRoot, encoding: 'utf8', env: childEnv });
  assert.equal(importedEngine.status, 0, importedEngine.stderr);
  assert.equal(importedEngine.stdout, '');
  for (const input of ['engine.mjs', 'store.mjs', 'inputs.mjs']) {
    const file = resolve(outputRoot, 'tools/migration-workspace', input);
    const bytes = readFileSync(file);
    try {
      rmSync(file);
      const missing = spawnSync(process.execPath, ['--input-type=module', '--eval', engineImport],
        { cwd: outputRoot, encoding: 'utf8', env: childEnv });
      assert.notEqual(missing.status, 0);
      assert.match(missing.stderr, /ERR_MODULE_NOT_FOUND/);
      assert.ok(missing.stderr.includes(input));
    } finally { writeFileSync(file, bytes); }
  }
  initializeRepository(outputRoot, childEnv);
  assert.equal(realpathSync(git(outputRoot, childEnv, ['rev-parse', '--show-toplevel'])), realpathSync(outputRoot));
  const upstreamCommit = JSON.parse(readFileSync(resolve(root, 'config/migration-test-duration-profile.json'), 'utf8')).source.commit;
  assert.notEqual(spawnSync('git', ['cat-file', '-e', `${upstreamCommit}^{commit}`],
    { cwd: outputRoot, env: childEnv, encoding: 'utf8' }).status, 0, 'fixture must not borrow producer history');
  assert.ok(result.scope.fileCount > 200);
  for (const absent of ['frontend', 'foundation', 'business-app', 'business-core', 'api-server', 'node_modules',
    'config/ui-url-state-census.json', 'config/modules/presets.json', '.github/workflows/ci.yml',
    'scripts/adoption-execute-products.test.mjs']) assert.equal(existsSync(resolve(outputRoot, absent)), false, absent);
  assert.equal(readFileSync(resolve(outputRoot, 'settings.gradle'), 'utf8'), "rootProject.name = 'egov-migration-tool'\ninclude 'migration-tool'\n");
  const approval = JSON.parse(readFileSync(resolve(outputRoot, 'config/governance/migration-adoption-review.json'), 'utf8'));
  assert.equal(approval.status, 'pending');
  assert.equal(approval.owner, null);
  assert.deepEqual(approval.evidence, []);
  const helper = resolve(outputRoot, 'scripts/reusable-layout.mjs');
  assert.equal(readFileSync(helper, 'utf8'), readFileSync(resolve(root, 'scripts/reusable-layout.mjs'), 'utf8'));
  // 줄바꿈은 검사 대상이 아니다 — 자매 계약(migration-verification-contract)과 같은 사유로 정규화한다.
  const workflow = readFileSync(resolve(outputRoot, '.github/workflows/migration-tool.yml'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(workflow, /^  push:\n    branches: \[main, master\]$/m);
  assert.match(workflow, /^  pull_request:$/m);
  assert.match(workflow, /^          cache-read-only: false$/m,
    'the exported repository has one independent cache writer');
  assert.doesNotMatch(workflow, /^    paths(?:-ignore)?:/m,
    'standalone product must validate every changed runtime helper without producer CI');
  // Resolve the complete module graph before injecting individual missing helpers.
  // Importing these entrypoints must not run verification, scanning or publication.
  // verify rejects an unknown scope after resolving imports, before any check can run.
  const importScript = (entrypoint) => `${entrypoint === 'verify.mjs' ? "process.argv[2] = 'import-check-only'; " : ''}await import('./scripts/${entrypoint}')`;
  for (const entrypoint of ['adoption-execute.mjs', 'governance-review.mjs', 'verify.mjs']) {
    const imported = spawnSync(process.execPath,
      ['--input-type=module', '--eval', importScript(entrypoint)],
      { cwd: outputRoot, encoding: 'utf8', env: childEnv });
    assert.equal(imported.status, entrypoint === 'verify.mjs' ? 2 : 0, `${entrypoint} must import independently: ${imported.stderr}`);
    assert.equal(imported.stdout, '');
    if (entrypoint === 'verify.mjs') assert.match(imported.stderr, /알 수 없는 범위 'import-check-only'/u);
    else assert.equal(imported.stderr, '');
  }
  // A nested `node --test` inherits NODE_TEST_CONTEXT from this parent runner.
  // Clear it so the exported contracts really run instead of recursively skipping.
  for (const args of [
    ['--test', 'scripts/migration-verification-contract.test.mjs', 'scripts/adoption-execute.test.mjs'],
    ['scripts/governance-review.mjs', '--product', 'migration-tool', '--mode', 'report'],
  ]) {
    const child = spawnSync(process.execPath, args, { cwd: outputRoot, encoding: 'utf8', env: childEnv });
    assert.equal(child.status, 0, child.stdout + child.stderr);
    if (args[0] === '--test') {
      assert.match(child.stdout, /^# tests [1-9]\d*$/m, 'exported contracts must execute a nonempty test population');
      assert.doesNotMatch(child.stdout + child.stderr, /recursive.*(?:skip|run)|skipping.*recursive/iu);
      t.diagnostic(`Exported migration/adoption contracts: ${child.stdout.match(/^# tests \d+$/m)[0]}`);
    }
  }
  const pending = spawnSync(process.execPath, ['scripts/governance-review.mjs', '--product', 'migration-tool',
    '--mode', 'adoption', '--environment', 'fixture'], { cwd: outputRoot, encoding: 'utf8', env: childEnv });
  assert.equal(pending.status, 1);

  const profilePath = resolve(outputRoot, 'config/migration-test-duration-profile.json');
  const profileBytes = readFileSync(profilePath, 'utf8');
  const lockPath = resolve(outputRoot, 'migration-product-lock.json');
  const lockBytes = readFileSync(lockPath, 'utf8');
  const profile = JSON.parse(profileBytes);
  const lock = JSON.parse(lockBytes);
  assert.deepEqual(lock.durationProfileProvenance.source, profile.source);
  assert.equal(lock.durationProfileProvenance.producerCommit, git(root, isolatedEnvironment(dirname(root)), ['rev-parse', 'HEAD']));
  assert.match(lock.durationProfileProvenance.profileSha256, /^[a-f0-9]{64}$/);
  // Checkout line endings are not a change in the measurements.
  writeFileSync(profilePath, profileBytes.replace(/\r?\n/g, '\r\n'));
  assert.equal(provenanceContract(outputRoot, childEnv).status, 0);
  writeFileSync(profilePath, profileBytes);
  for (const mutate of [
    () => rmSync(profilePath),
    () => rmSync(lockPath),
    () => { const changed = structuredClone(profile); changed.source.runId += 1; writeFileSync(profilePath, JSON.stringify(changed)); },
    () => { const changed = structuredClone(profile); changed.durationsMs[Object.keys(changed.durationsMs)[0]] += 1; writeFileSync(profilePath, JSON.stringify(changed)); },
    () => { const changed = structuredClone(profile); delete changed.source.classMeasurements; writeFileSync(profilePath, JSON.stringify(changed)); },
    () => {
      const changed = structuredClone(profile);
      const record = Object.values(changed.source.classMeasurements)[0];
      record.measuredAt = '2026-10-31T00:00:00Z';
      writeFileSync(profilePath, JSON.stringify(changed));
    },
    () => { const changed = structuredClone(lock); delete changed.durationProfileProvenance; writeFileSync(lockPath, JSON.stringify(changed)); },
    () => { const changed = structuredClone(lock); changed.durationProfileProvenance.producerCommit = 'f'.repeat(40); writeFileSync(lockPath, JSON.stringify(changed)); },
    () => { const changed = structuredClone(lock); changed.durationProfileProvenance.profileSha256 = 'f'.repeat(64); writeFileSync(lockPath, JSON.stringify(changed)); },
    () => {
      const changedProfile = structuredClone(profile);
      changedProfile.source.runId += 1;
      const changedLock = structuredClone(lock);
      changedLock.durationProfileProvenance.source = changedProfile.source;
      changedLock.durationProfileProvenance.profileSha256 = migrationProvenanceDigest(changedProfile);
      writeFileSync(profilePath, JSON.stringify(changedProfile));
      writeFileSync(lockPath, JSON.stringify(changedLock));
    },
  ]) {
    try {
      mutate();
      const rejected = provenanceContract(outputRoot, childEnv);
      assert.equal(rejected.status, 1, rejected.stdout + rejected.stderr);
      assert.match(rejected.stdout + rejected.stderr, /duration profile provenance|ENOENT/);
    } finally {
      writeFileSync(profilePath, profileBytes);
      writeFileSync(lockPath, lockBytes);
    }
  }
  // A legitimate-looking output lock cannot change the producer contract's mode.
  const contractPath = resolve(outputRoot, 'scripts/migration-verification-contract.test.mjs');
  const generatedContract = readFileSync(contractPath);
  try {
    writeFileSync(contractPath, readFileSync(resolve(root, 'scripts/migration-verification-contract.test.mjs')));
    const sourceInNewHistory = provenanceContract(outputRoot, childEnv);
    assert.equal(sourceInNewHistory.status, 1);
    assert.match(sourceInNewHistory.stdout + sourceInNewHistory.stderr, /duration profile provenance.*source commit/);
  } finally { writeFileSync(contractPath, generatedContract); }
  // A missing transitive helper must break the actual isolated entrypoint, not be
  // silently resolved from the producer checkout or an installed package.
  for (const [dependency, entrypoint] of [
    ['reusable-layout.mjs', 'adoption-execute.mjs'],
    ['release-images.mjs', 'adoption-execute.mjs'],
    ['ci-change-scope.mjs', 'governance-review.mjs'],
    ['vendor-evidence-inputs.mjs', 'governance-review.mjs'],
    ['composition-profiles.mjs', 'adoption-execute.mjs'],
    ['read-regular-file.mjs', 'governance-review.mjs'],
    ['verification-record.mjs', 'verify.mjs'],
    ['migration-test-shard.mjs', 'migration-verification-contract.test.mjs'],
    ['migration-profile-provenance.mjs', 'migration-verification-contract.test.mjs'],
    ['adoption-execute-fixtures.mjs', 'adoption-execute.test.mjs'],
  ]) {
    const missingHelper = resolve(outputRoot, 'scripts', dependency);
    const helperContent = readFileSync(missingHelper);
    try {
      rmSync(missingHelper);
      const missingDependency = spawnSync(process.execPath,
        ['--input-type=module', '--eval', importScript(entrypoint)],
        { cwd: outputRoot, encoding: 'utf8', env: childEnv });
      assert.notEqual(missingDependency.status, 0);
      assert.match(missingDependency.stderr, /ERR_MODULE_NOT_FOUND/);
      assert.ok(missingDependency.stderr.includes(dependency));
    } finally { writeFileSync(missingHelper, helperContent); }
  }
  assert.throws(() => generateMigrationProduct({ sourceRoot: root, outputRoot: generatedRoot }), /new child directory/);
});

test('local measurement bases survive squash by requiring producer main ancestry', (t) => {
  const sourceRoot = temporaryRoot(t);
  const env = isolatedEnvironment(dirname(sourceRoot));
  const upstream = initializeRepository(sourceRoot, env);
  git(sourceRoot, env, ['update-ref', 'refs/remotes/origin/main', upstream]);
  const branch = initializeRepository(sourceRoot, env, 'Unmerged local measurement inputs');
  const name = 'nuri.migration.FixtureTest';
  const profile = { source: { runId: 1, commit: upstream, measuredAt: '2026-10-30T00:00:00Z',
    classMeasurements: { [name]: { kind: 'local-junit', baseCommit: upstream, measuredAt: '2026-10-30T01:00:00Z' } } },
  durationsMs: { [name]: 1 } };
  assert.equal(verifySourceMigrationProfileProvenance(profile, sourceRoot).producerCommit, branch);
  for (const [baseCommit, reason] of [[branch, /ancestor of producer main/], ['f'.repeat(40), /must exist/]]) {
    const changed = structuredClone(profile);
    changed.source.classMeasurements[name].baseCommit = baseCommit;
    assert.throws(() => verifySourceMigrationProfileProvenance(changed, sourceRoot), reason);
  }
  git(sourceRoot, env, ['update-ref', '-d', 'refs/remotes/origin/main']);
  assert.throws(() => verifySourceMigrationProfileProvenance(profile, sourceRoot), /requires producer origin\/main history/);
});

test('export verifies producer history before writing and rejects missing, unrelated and shallow provenance', (t) => {
  const fixtureRoot = temporaryRoot(t);
  const env = isolatedEnvironment(fixtureRoot);
  const originalProfile = JSON.parse(readFileSync(resolve(root, 'config/migration-test-duration-profile.json'), 'utf8'));
  for (const scenario of ['missing', 'unrelated', 'shallow', 'no-git']) {
    let sourceRoot = resolve(fixtureRoot, scenario);
    mkdirSync(sourceRoot);
    let measuredCommit;
    if (scenario !== 'no-git') measuredCommit = initializeRepository(sourceRoot, env);
    if (scenario === 'unrelated') {
      git(sourceRoot, env, ['checkout', '--quiet', '--orphan', 'unrelated']);
      initializeRepository(sourceRoot, env, 'Unrelated initial history');
    }
    if (scenario === 'shallow') {
      initializeRepository(sourceRoot, env);
      const shallowRoot = resolve(fixtureRoot, 'shallow-clone');
      git(fixtureRoot, env, ['clone', '--quiet', '--depth=1', '--no-local', pathToFileURL(sourceRoot).href, shallowRoot]);
      sourceRoot = shallowRoot;
      assert.equal(git(sourceRoot, env, ['rev-parse', '--is-shallow-repository']), 'true');
    }
    const profile = structuredClone(originalProfile);
    profile.source.commit = scenario === 'missing' || scenario === 'no-git' ? 'f'.repeat(40) : measuredCommit;
    mkdirSync(resolve(sourceRoot, 'config'), { recursive: true });
    writeFileSync(resolve(sourceRoot, 'config/migration-test-duration-profile.json'), JSON.stringify(profile));
    writeFileSync(resolve(sourceRoot, 'migration-product-lock.json'), JSON.stringify({ product: 'migration-tool',
      mode: 'exported', durationProfileProvenance: { source: profile.source } }));
    const outputRoot = resolve(sourceRoot, 'build/migration-product/rejected');
    const reason = scenario === 'unrelated' ? /duration profile provenance: source commit must be an ancestor/
      : scenario === 'no-git' ? /duration profile provenance: producer must have its own Git history/
        : /duration profile provenance: source commit must exist/;
    assert.throws(() => generateMigrationProduct({ sourceRoot, outputRoot }), reason, scenario);
    assert.equal(existsSync(outputRoot), false, `${scenario}: invalid provenance must not create a partial export`);
  }
});

test('export cannot target the repository, a parent directory or a sibling product', () => {
  for (const outputRoot of [root, resolve(root, '..'), resolve(root, 'build'), resolve(root, 'build/reusable-base')]) {
    assert.throws(() => generateMigrationProduct({ sourceRoot: root, outputRoot }), /new child directory/);
  }
});

test('standalone migration export supports targeting a validated generated DB bundle catalog', async (t) => {
  const { schemaSnapshotHash } = await import('./project-composer-db.mjs');
  const { parseColumnCatalog } = await import('./reusable-migration-catalog.mjs');
  const fixture = temporaryRoot(t);
  const bundle = resolve(fixture, 'core-bundle');
  mkdirSync(bundle, { recursive: true });
  const snapshot = { columns: [{ table_name: 'tb_user_info', ordinal_position: 1, column_name: 'user_id' }] };
  const schemaHash = schemaSnapshotHash(snapshot);
  writeFileSync(resolve(bundle, 'schema-contract.json'), JSON.stringify({ snapshot }));
  writeFileSync(resolve(bundle, 'profile-lock.json'), JSON.stringify({ validated: false, schemaSnapshotHash: schemaHash }));

  const base = resolve(root, 'build/migration-product');
  const rejectedRoot = resolve(base, `contract-bad-bundle-${randomBytes(8).toString('hex')}`);
  t.after(() => rmSync(rejectedRoot, { recursive: true, force: true }));
  assert.throws(() => generateMigrationProduct({ sourceRoot: root, outputRoot: rejectedRoot, dbBundle: bundle }), /validated: true/);
  assert.equal(existsSync(rejectedRoot), false, 'invalid dbBundle must fail before creating outputRoot');

  writeFileSync(resolve(bundle, 'profile-lock.json'), JSON.stringify({ validated: true, schemaSnapshotHash: schemaHash }));
  const targetedRoot = resolve(base, `contract-targeted-${randomBytes(8).toString('hex')}`);
  t.after(() => rmSync(targetedRoot, { recursive: true, force: true }));
  const result = generateMigrationProduct({ sourceRoot: root, outputRoot: targetedRoot, dbBundle: bundle });
  assert.ok(result.outputRoot);
  assert.deepEqual([...parseColumnCatalog(readFileSync(resolve(targetedRoot, 'db_columns.json'), 'utf8')).keys()],
    ['flyway_schema_history', 'tb_user_info']);
  const targetedLock = JSON.parse(readFileSync(resolve(targetedRoot, 'migration-product-lock.json'), 'utf8'));
  assert.deepEqual(targetedLock.targetCatalog, { tables: 2, source: 'db-bundle' });
});
