import assert from 'node:assert/strict';
import fs from 'node:fs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test, { after } from 'node:test';

import {
  analyzeVerifyRunnerExecution,
  createGovernanceAnalysisCache,
  createGovernanceRepositorySnapshot,
  exactBindingLineMatches,
  codeOwnerCovers,
  containsRunnerSkip,
  findRunnerSkipConstructs,
  findTaggedGatesOutsideRoots,
  effectiveCodeOwners,
  hasClassAnnotation,
  hasGateSkipConstruct,
  loadGovernanceRegistry,
  parseMutationScopeMatrix,
  readPopulationConsumer,
  validateGovernanceRegistry,
  validateCriticalMutationTargets,
  validatePitResultCheck,
  validatePlaywrightProjectContract,
} from './governance-gates-contract.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = path.join(repoRoot, 'config', 'governance', 'gates.json');
const UI_UX_FOUNDATION_CONTRACT_ASSETS = [
  'config/frontend-visible-terms.json',
  'config/krds-profile-mapping.json',
  'config/ui-navigation-disposition-proposal.json',
  'config/ui-navigation-disposition.schema.json',
  'config/ui-quality-baseline-index.json',
  'config/ui-quality-baseline-index.schema.json',
  'config/ui-quality-baseline-summary.schema.json',
  'config/ui-quality-evidence-policy.json',
  'config/ui-quality-scenarios.json',
  'config/ui-route-capabilities.json',
  'config/ui-url-state-census.json',
  'docs/02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md',
  'docs/02-architecture/decisions/ADR-0005-ui-quality-durable-evidence.md',
  'frontend/scripts/ui-quality-baseline-core.mjs',
  'frontend/scripts/ui-quality-baseline-runner.mjs',
  'scripts/frontend-reachability-census.mjs',
  'scripts/frontend-reachability-census.test.mjs',
  'scripts/frontend-module-graph.mjs',
  'scripts/frontend-module-resolver.mjs',
  'scripts/api-docker-context-contract.test.mjs',
  'scripts/frontend-docker-context-contract.test.mjs',
  'scripts/frontend-sensitive-console-contract.test.mjs',
  'scripts/frontend-visible-terms-contract.test.mjs',
  'scripts/krds-profile-mapping-contract.test.mjs',
  'scripts/playwright-auth-artifact-contract.test.mjs',
  'scripts/ui-navigation-disposition-contract.mjs',
  'scripts/ui-navigation-disposition-contract.test.mjs',
  'scripts/ui-quality-baseline-runner-contract.test.mjs',
  'scripts/ui-quality-evidence-durability.mjs',
  'scripts/ui-quality-evidence-durability-contract.test.mjs',
  'scripts/ui-quality-evidence-publication-contract.test.mjs',
  'scripts/ui-quality-scenarios-contract.test.mjs',
  'scripts/ui-route-capabilities-contract.mjs',
  'scripts/ui-route-capabilities-contract.test.mjs',
  'scripts/ui-url-state-census.mjs',
  'scripts/ui-url-state-census.test.mjs',
];

function clone(value) {
  return structuredClone(value);
}

// 레지스트리 객체만 바꾸는 시험은 저장소를 한 번 읽은 snapshot 하나를 함께 쓴다 — 그 시험들은 디스크를 바꾸지 않는다.
// 디스크를 바꾸는 시험(임시 루트·build 아래 fixture·snapshot 신선도 시험)은 validateFresh 나 자기 snapshot 을 쓴다.
// 분석 결과는 원문 텍스트가 같을 때만 재사용된다. 실행 중 디스크가 바뀌면 아래 after() 대조가 붉다.
const analysis = createGovernanceAnalysisCache();
const sharedSnapshot = createGovernanceRepositorySnapshot({ analysis, repoRoot });
function validate(registry) {
  return validateGovernanceRegistry({ registry, repoRoot, analysis, snapshot: sharedSnapshot });
}
function validateFresh(registry) {
  return validateGovernanceRegistry({ registry, repoRoot, analysis });
}

after(() => {
  const registry = loadGovernanceRegistry(registryPath);
  const shared = validate(registry);
  assert.deepEqual(validateFresh(registry), shared, 'a fresh repository read must agree with the shared snapshot — the disk changed during the run');
  assert.deepEqual(shared, []);
});

test('a shared repository snapshot is bound to the repository root it read', () => {
  const registry = loadGovernanceRegistry(registryPath);
  assert.throws(() => validateGovernanceRegistry({ registry, repoRoot: os.tmpdir(), snapshot: sharedSnapshot }),
    /governance snapshot is bound to .* not /);
  assert.throws(() => validateGovernanceRegistry({ registry, repoRoot, snapshot: createGovernanceRepositorySnapshot({ analysis }) }),
    /no repository root/);
  assert.throws(() => findTaggedGatesOutsideRoots(os.tmpdir(), registry.gateSets, undefined, sharedSnapshot),
    /governance snapshot is bound to/);
});

test('repository snapshots deduplicate scans while fresh snapshots see edited, added and deleted files', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'governance-snapshot-'));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('governance-snapshot-'));
    rmSync(root, { recursive: true, force: true });
  });
  const reads = new Map();
  const listings = new Map();
  const counted = (counts, name) => (...args) => {
    const key = path.resolve(args[0]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return fs[name](...args);
  };
  const fileSystem = { ...fs, readFileSync: counted(reads, 'readFileSync'), readdirSync: counted(listings, 'readdirSync') };
  const cache = createGovernanceAnalysisCache();
  const fresh = () => createGovernanceRepositorySnapshot({ analysis: cache, fileSystem });
  const file = path.join(root, 'First.java');
  writeFileSync(file, 'class First {}');
  const before = fresh();
  assert.deepEqual(before.javaClassNames(root), ['First']);
  before.javaFiles(root);
  before.javaClassNames(root);
  before.catalogFiles(root, true);
  assert.equal(listings.get(root), 1, 'Java census, class names and catalog share the directory observation');
  const inspect = source => ({ disabled: source.includes('@Disabled') });
  const first = before.analyze(file, 'disabled', inspect);
  assert.deepEqual(first, { disabled: false });
  assert.throws(() => { first.disabled = true; }, TypeError, 'analysis results cannot poison later assertions');
  assert.deepEqual(fresh().analyze(file, 'disabled', inspect), first);
  assert.deepEqual(cache.stats(), { hits: 1, misses: 1 });
  assert.equal(reads.get(file), 2, 'new validation still reads current text before trusting a cached analysis');
  writeFileSync(file, '@Disabled class First {}');
  assert.deepEqual(fresh().analyze(file, 'disabled', inspect), { disabled: true });
  assert.deepEqual(cache.stats(), { hits: 1, misses: 2 });
  writeFileSync(path.join(root, 'Second.java'), 'class Second {}');
  assert.deepEqual(fresh().javaClassNames(root), ['First', 'Second']);
  rmSync(file);
  const after = fresh();
  assert.deepEqual(after.javaClassNames(root), ['Second']);
  assert.equal(after.isFile(file), false);
  assert.throws(() => after.analyze(file, 'disabled', inspect), { code: 'ENOENT' });
});

test('shared analysis preserves full validator errors and cannot hide a new or edited skipped test', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'governance-cache-red-'));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('governance-cache-red-'));
    rmSync(root, { recursive: true, force: true });
  });
  mkdirSync(path.join(root, '.github'));
  mkdirSync(path.join(root, 'tests'));
  writeFileSync(path.join(root, '.github', 'required-checks.json'), JSON.stringify({ requiredChecks: [{ context: 'probe' }] }));
  writeFileSync(path.join(root, '.github', 'CODEOWNERS'), '** @lkindo\n');
  writeFileSync(path.join(root, 'runner.mjs'), 'run();\n');
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'node --test tests/*.test.mjs' } }));
  const fixture = {
    schemaVersion: 1,
    executionProfiles: [{ id: 'EXEC-PROBE', command: 'run', tier: ['local-full'],
      bindings: [{ source: 'runner.mjs', fragment: 'run();', tiers: ['local-full'] }] }],
    gateSets: [{ id: 'GATESET-PROBE', task: 'test', tier: ['local-full'], requiredCiContext: 'probe',
      category: 'test', owner: 'quality', redProof: 'a skipped test fails', inputs: ['tests'], evidence: ['test output'],
      selector: { type: 'runner-catalog', runner: 'node-test', forbidSkips: true,
        catalogs: [{ root: 'tests', suffixes: ['.test.mjs'], recursive: true }],
        packageScript: { source: 'package.json', name: 'test', command: 'node --test tests/*.test.mjs' },
        commandBindings: [{ source: 'runner.mjs', fragment: 'run();', tiers: ['local-full'] }] } }],
    qualityRatchets: [], qualityPopulations: [],
  };
  const cache = createGovernanceAnalysisCache();
  const check = () => {
    const cached = validateGovernanceRegistry({ registry: fixture, repoRoot: root, analysis: cache });
    assert.deepEqual(cached, validateGovernanceRegistry({ registry: fixture, repoRoot: root }), 'fresh and shared analyses report identical errors');
    return cached;
  };
  const source = path.join(root, 'tests', 'probe.test.mjs');
  const additional = path.join(root, 'tests', 'added.test.mjs');
  writeFileSync(source, "test('probe', () => {});\n");
  const baseline = check();
  assert.deepEqual(baseline, ['registry qualityPopulations must be a non-empty array', 'registry qualityRatchets must be a non-empty array']);
  assert.deepEqual(check(), baseline);
  writeFileSync(source, "test.skip('probe', () => {});\n");
  assert.match(check().join('\n'), /forbidden skip\/only\/todo: tests\/probe\.test\.mjs/);
  writeFileSync(source, "test('probe', () => {});\n");
  assert.deepEqual(check(), baseline);
  writeFileSync(additional, "test.only('added', () => {});\n");
  assert.match(check().join('\n'), /forbidden skip\/only\/todo: tests\/added\.test\.mjs/);
  rmSync(additional);
  assert.deepEqual(check(), baseline);
  rmSync(source);
  assert.match(check().join('\n'), /ghost runner selector matched no tests/);
  rmSync(path.join(root, 'runner.mjs'));
  assert.match(check().join('\n'), /ghost execution binding/);
});

const REQUIRED_GATE_SETS = [
  'GATESET-ARCHITECTURE',
  'GATESET-CROSS-STACK-CONTRACTS',
  'GATESET-FRONTEND-FORM-VALIDATION',
  'GATESET-FRONTEND-INVARIANTS',
  'GATESET-FRONTEND-VITEST',
  'GATESET-GOVERNANCE-HARNESS',
  'GATESET-NODE-OPERATIONAL-CONTRACTS',
  'GATESET-PIT-MUTATION-AGGREGATE',
  'GATESET-PLAYWRIGHT-E2E',
  'GATESET-SCHEMA-VALIDATION',
];

const REQUIRED_QUALITY_RATCHETS = [
  'QUALITY-BACKEND-BRANCH-COVERAGE',
  'QUALITY-BACKEND-LINE-COVERAGE',
  'QUALITY-BACKEND-MUTATION-SCORE',
  'QUALITY-FOUNDATION-CLASS-LINE-COVERAGE',
  'QUALITY-FOUNDATION-INSTRUCTION-COVERAGE',
  'QUALITY-FRONTEND-BRANCHES-COVERAGE',
  'QUALITY-FRONTEND-CSS-SINGLE-BUNDLE',
  'QUALITY-FRONTEND-CSS-TOTAL-BUNDLE',
  'QUALITY-FRONTEND-DESIGN-TOKEN-SEVERITY',
  'QUALITY-FRONTEND-FUNCTIONS-COVERAGE',
  'QUALITY-FRONTEND-JS-SHARED-BUNDLE',
  'QUALITY-FRONTEND-JS-SINGLE-BUNDLE',
  'QUALITY-FRONTEND-JS-TOTAL-BUNDLE',
  'QUALITY-FRONTEND-LINES-COVERAGE',
  'QUALITY-FRONTEND-LINT-WARNINGS',
  'QUALITY-FRONTEND-STATEMENTS-COVERAGE',
];

const REQUIRED_QUALITY_POPULATIONS = [
  'POPULATION-BACKEND-JACOCO',
  'POPULATION-BACKEND-PIT',
  'POPULATION-FRONTEND-VITEST',
];

test('repository governance registry exactly covers every tagged gate and current quality control', () => {
  const registry = loadGovernanceRegistry(registryPath);
  assert.deepEqual(validate(registry), []);
});

// [2026-08-31 신설] Gradle includeTags 는 테스트 소스셋 전체에서 태그를 찾지만 census 는
//   선언된 root 만 본다 — 태그된 클래스를 root 밖으로 옮기면 실행은 되면서 census 에서
//   사라지는 조용한 탈출 경로였다. 합성 트리로 red 를 증명한다.
test('a tagged gate outside its declared selector roots is a reproducible red', (t) => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'gate-escape-'));
  t.after(() => rmSync(tempRoot, { recursive: true, force: true }));

  const declaredRoot = 'api-server/src/test/java/nuri/api/harness';
  const escapedDir = path.join(tempRoot, 'api-server/src/test/java/nuri/api/other');
  mkdirSync(path.join(tempRoot, declaredRoot), { recursive: true });
  mkdirSync(escapedDir, { recursive: true });
  writeFileSync(path.join(escapedDir, 'EscapedGateTest.java'), [
    'package nuri.api.other;',
    'import org.junit.jupiter.api.Tag;',
    'import org.junit.jupiter.api.Test;',
    '@Tag("governance-harness")',
    'class EscapedGateTest {',
    '    @Test',
    '    void probe() {}',
    '}',
    '',
  ].join('\n'));

  const gateSets = [{
    id: 'GATESET-GOVERNANCE-HARNESS',
    selector: {
      type: 'java-class-annotation',
      annotation: 'Tag',
      value: 'governance-harness',
      roots: [declaredRoot],
    },
  }];

  assert.match(
    findTaggedGatesOutsideRoots(tempRoot, gateSets, ['api-server/src/test/java']).join('\n'),
    /outside declared selector roots.*EscapedGateTest/s,
  );
  // 선언 root 안이면 무해하다 — 같은 파일을 root 아래로 옮기면 오류가 사라진다.
  rmSync(path.join(escapedDir, 'EscapedGateTest.java'));
  writeFileSync(path.join(tempRoot, declaredRoot, 'EscapedGateTest.java'), [
    'package nuri.api.harness;',
    'import org.junit.jupiter.api.Tag;',
    'import org.junit.jupiter.api.Test;',
    '@Tag("governance-harness")',
    'class EscapedGateTest {',
    '    @Test',
    '    void probe() {}',
    '}',
    '',
  ].join('\n'));
  assert.deepEqual(findTaggedGatesOutsideRoots(tempRoot, gateSets, ['api-server/src/test/java']), []);
  // 스캔 루트가 사라지면 조용한 skip 이 아니라 오류다(false-green 방지).
  assert.match(
    findTaggedGatesOutsideRoots(tempRoot, gateSets, ['missing/src/test/java']).join('\n'),
    /scan root does not exist/,
  );
});

test('UI/UX foundation contract assets remain present in the required Node catalog', () => {
  const registry = loadGovernanceRegistry(registryPath);
  const operational = registry.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS');

  assert.ok(UI_UX_FOUNDATION_CONTRACT_ASSETS.every((source) => existsSync(path.join(repoRoot, source))));
  assert.ok(
    operational.selector.catalogs.some(
      ({ root, suffixes, recursive }) => root === 'scripts'
        && suffixes.includes('.test.mjs')
        && recursive === false,
    ),
  );
  assert.equal(
    operational.selector.packageScript.command,
    `node -e "require('node:fs').mkdirSync('build/operational-contracts',{recursive:true})" && node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=./scripts/node-test-junit-reporter.mjs --test-reporter-destination=build/operational-contracts/junit.xml "scripts/*.test.mjs" ".agent/scripts/*.test.js" "tools/migration-workspace/*.test.mjs" "tools/migration-workspace-prototype/*.test.mjs"`,
  );
  assert.ok([
    'config/ui-quality-evidence-policy.json',
    'config/ui-quality-baseline-index.json',
    'config/ui-quality-baseline-summary.schema.json',
    'config/ui-quality-baseline-index.schema.json',
    'docs/02-architecture/decisions/ADR-0005-ui-quality-durable-evidence.md',
    'scripts/ui-quality-evidence-durability.mjs',
    'scripts/ui-quality-evidence-durability-contract.test.mjs',
    'scripts/ui-quality-evidence-publication-contract.test.mjs',
  ].every((source) => UI_UX_FOUNDATION_CONTRACT_ASSETS.includes(source)));
});

test('registry keeps the ten authoritative gate sets and seven runner catalogs', () => {
  const registry = loadGovernanceRegistry(registryPath);
  const runnerSets = registry.gateSets.filter(({ selector }) => selector.type !== 'java-class-annotation');
  const byId = new Map(runnerSets.map((set) => [set.id, set]));

  assert.deepEqual(registry.gateSets.map(({ id }) => id).sort(), REQUIRED_GATE_SETS);
  assert.equal(runnerSets.length, 7);
  assert.ok(runnerSets.every(({ rules }) => rules === undefined));
  assert.equal(byId.get('GATESET-NODE-OPERATIONAL-CONTRACTS').selector.forbidSkips, true);
  assert.equal(byId.get('GATESET-FRONTEND-INVARIANTS').selector.forbidSkips, true);
  assert.equal(byId.get('GATESET-FRONTEND-FORM-VALIDATION').selector.forbidSkips, true);
  assert.equal(byId.get('GATESET-CROSS-STACK-CONTRACTS').selector.forbidSkips, true);
  // [2026-10-18 DEC-OPS-344 ①] frontend 축이 켜지면 커버리지 전체 스위트(frontend-build 집계)가, 꺼지면 secret-scan 이 돈다.
  assert.deepEqual(byId.get('GATESET-CROSS-STACK-CONTRACTS').requiredCiContext, ['secret-scan', 'frontend-build']);
  // [2026-08-31] 최대 카탈로그(FRONTEND-VITEST)에도 skip 금지를 동결한다 — 종전에는 이 카탈로그만
  //   it.skip/describe.only 가 자유였다(당시 위반 0건이라 무비용으로 켰다). Playwright .spec.ts 의
  //   플랫폼 waiver 는 suffix 가 달라(이 카탈로그는 .test.ts 만) 충돌하지 않는다.
  assert.equal(byId.get('GATESET-FRONTEND-VITEST').selector.forbidSkips, true);
  const playwright = byId.get('GATESET-PLAYWRIGHT-E2E');
  assert.equal(playwright.requiredCiContext, 'e2e-test');
  assert.equal(playwright.selector.forbidSkips, undefined);
  assert.deepEqual(playwright.selector.skipWaivers, [{
    id: 'PW-SKIP-LINUX-VISUAL-REGRESSION',
    source: 'frontend/e2e/quality/visual-baselines.spec.ts',
    stableToken: "process.platform !== 'linux'",
    owner: 'quality-engineering',
    reason: 'Pixel baselines are generated and enforced on the Linux CI rendering platform only.',
    condition: "process.platform !== 'linux'",
    reviewBy: '2027-02-19',
  }]);
});

test('quality registry keeps every current monotonic ratchet identity', () => {
  const registry = loadGovernanceRegistry(registryPath);

  assert.deepEqual(registry.qualityRatchets.map(({ id }) => id).sort(), REQUIRED_QUALITY_RATCHETS);
});

test('quality population registry owns the backend, frontend, and mutation denominators', () => {
  const registry = loadGovernanceRegistry(registryPath);

  assert.deepEqual(registry.qualityPopulations.map(({ id }) => id).sort(), REQUIRED_QUALITY_POPULATIONS);
});

test('coverage population selectors ignore comment, quoted-string, and template-string decoys', () => {
  const parsed = readPopulationConsumer(`
    const quoted = "coverage: { include: ['src/ghost/**'], exclude: ['**/*'] }";
    const templated = \`coverage: { include: ['src/template-ghost/**'], exclude: ['**/*'] }\`;
    // coverage: { include: ['src/comment-ghost/**'], exclude: ['**/*'] }
    export default { test: { coverage: {
      include: ['src/real/**'],
      exclude: ['src/types/**'],
    } } };
  `, { type: 'vitest-coverage-population' });

  assert.deepEqual(parsed, { include: ['src/real/**'], exclude: ['src/types/**'] });
});

test('Vitest threshold selectors bind the unique literal coverage child instead of decoys', async (t) => {
  const registry = loadGovernanceRegistry(registryPath);
  const configPath = path.join(repoRoot, 'frontend/vitest.config.mts');
  const original = readFileSync(configPath, 'utf8');
  const thresholds = Object.fromEntries(registry.qualityRatchets
    .filter(({ selector }) => selector.type === 'vitest-coverage-threshold')
    .map(({ selector, current }) => [selector.key, current]));
  const values = Object.entries(thresholds).map(([key, value]) => `${key}: ${value}`).join(', ');
  const block = /thresholds:\s*\{\s*statements:\s*\d+,\s*branches:\s*\d+,\s*functions:\s*\d+,\s*lines:\s*\d+,?\s*\}/;
  const replaceThresholds = replacement => {
    const changed = original.replace(block, replacement);
    assert.notEqual(changed, original, 'the probe must change the executable thresholds');
    return changed;
  };
  const inspect = source => {
    const fileSystem = { ...fs, readFileSync: (file, ...args) =>
      path.resolve(String(file)) === configPath ? source : fs.readFileSync(file, ...args) };
    return validateGovernanceRegistry({ registry, repoRoot, analysis,
      snapshot: createGovernanceRepositorySnapshot({ repoRoot, fileSystem, analysis }) });
  };

  await t.test('the current config and its unrelated conditional reporter spread stay valid', () => {
    assert.deepEqual(inspect(original), []);
  });
  await t.test('a leading unused object cannot conceal actual zero thresholds', () => {
    const source = `const unused = { thresholds: { ${values} } };\n`
      + replaceThresholds('thresholds: { statements: 0, branches: 0, functions: 0, lines: 0 }');
    assert.equal(inspect(source).filter(error => /QUALITY-FRONTEND-.*consumer value 0/.test(error)).length, 4);
  });
  await t.test('comment and string decoys cannot shadow the actual values', () => {
    const source = [
      '// thresholds: { statements: 0, branches: 0, functions: 0, lines: 0 }',
      'const quoted = "thresholds: { statements: 0, branches: 0, functions: 0, lines: 0 }";',
      'const templated = `thresholds: { statements: 0, branches: 0, functions: 0, lines: 0 }`;',
      original,
    ].join('\n');
    assert.deepEqual(inspect(source), []);
  });
  const invalid = [
    ['duplicate thresholds', replaceThresholds(`thresholds: { ${values} }, thresholds: { statements: 0 }`)],
    ['shared variable', `const shared = { ${values} }; const unused = { thresholds: { ${values} } };\n`
      + replaceThresholds('thresholds: shared')],
    ['nested thresholds', replaceThresholds(`nested: { thresholds: { ${values} } }`)],
    ['numeric expression', replaceThresholds(`thresholds: { ${values.replace(/statements: \d+/, 'statements: 85 - 85')} }`)],
    ['spread override', replaceThresholds(`thresholds: { ${values}, ...shared }`)],
    ['duplicate metric', replaceThresholds(`thresholds: { ${values}, statements: 0 }`)],
    ['quoted duplicate metric', replaceThresholds(`thresholds: { ${values}, 'statements': 0 }`)],
    ['coverage spread override', original.replace(/\bcoverage:\s*\{/, 'coverage: { ...shared,')],
  ];
  for (const [name, source] of invalid) {
    await t.test(`${name} fails closed`, () => {
      assert.match(inspect(source).join('\n'), /QUALITY-FRONTEND-.*Vitest/);
    });
  }
});

test('PIT population selector cannot be satisfied by comment or string decoys', () => {
  const parsed = readPopulationConsumer(`
    def quoted = 'pitest { excludedClasses = ["**/*"]; failWhenNoMutations = true }'
    // pitest { excludedClasses = ["**/*"]; failWhenNoMutations = true }
    subprojects {
      pitest {
        excludedClasses = ['**.*Dto']
        failWhenNoMutations = false
      }
    }
  `, { type: 'gradle-pitest-population' });

  assert.deepEqual(parsed, { excludedClasses: ['**.*Dto'], failWhenNoMutations: false });
});

test('frontend coverage roots cannot shrink and denominator-wide exclusions are rejected', () => {
  const narrowed = clone(loadGovernanceRegistry(registryPath));
  const frontend = narrowed.qualityPopulations.find(({ id }) => id === 'POPULATION-FRONTEND-VITEST');
  frontend.include.shift();
  assert.match(validate(narrowed).join('\n'), /include population shrank below baseline/i);

  const broad = clone(loadGovernanceRegistry(registryPath));
  broad.qualityPopulations.find(({ id }) => id === 'POPULATION-FRONTEND-VITEST')
    .exclude.push('**/*');
  assert.match(validate(broad).join('\n'), /denominator-wide exclusion is forbidden: \*\*\/\*/i);
});

test('backend JaCoCo exclusions cannot expand beyond the population baseline', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  registry.qualityPopulations.find(({ id }) => id === 'POPULATION-BACKEND-JACOCO')
    .exclude.push('**/service/**');

  assert.match(validate(registry).join('\n'), /coverage exclude population expanded beyond baseline/i);
});

test('PIT exclusion allowlist is exact-frozen and cannot cover a matrix target package', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const pit = registry.qualityPopulations.find(({ id }) => id === 'POPULATION-BACKEND-PIT');
  pit.excludedClasses[0] = 'nuri.business.service.board.*';
  const errors = validate(registry).join('\n');

  assert.match(errors, /excludedClasses allowlist must remain exact-frozen/i);
  assert.match(errors, /broad PIT exclusion 'nuri\.business\.service\.board\.\*' intersects matrix target/i);
});

test('PIT must fail closed when a target produces no mutations', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  registry.qualityPopulations.find(({ id }) => id === 'POPULATION-BACKEND-PIT')
    .failWhenNoMutations = false;

  assert.match(validate(registry).join('\n'), /failWhenNoMutations must remain true/i);
});

test('PIT result check stays attached to its task and validates the exact XML output', () => {
  const source = readFileSync(path.join(repoRoot, 'build.gradle'), 'utf8');
  assert.deepEqual(validatePitResultCheck(source), []);
});

test('PIT result-check removal, status inversion, unsafe parsing and decoys are rejected', () => {
  const source = readFileSync(path.join(repoRoot, 'build.gradle'), 'utf8');
  const mutations = [
    ["pitestVersion = '1.25.9'", "pitestVersion = '1.22.1'"],
    ["pitestVersion = '1.25.9'", "// pitestVersion = '1.25.9'"],
    ["pitestVersion = '1.25.9'", "pitestVersion = '1.25.9'\n        pitestVersion = '1.22.1'"],
    ['enableDefaultIncrementalAnalysis = false', 'enableDefaultIncrementalAnalysis = true'],
    ['enableDefaultIncrementalAnalysis = false', '// enableDefaultIncrementalAnalysis = false'],
    ['enableDefaultIncrementalAnalysis = false', 'enableDefaultIncrementalAnalysis = false\n        enableDefaultIncrementalAnalysis = true'],
    ['enableDefaultIncrementalAnalysis = false', "enableDefaultIncrementalAnalysis = false\n        historyInputLocation = file('old-history.txt')"],
    ['enableDefaultIncrementalAnalysis = false', "enableDefaultIncrementalAnalysis = false\n        historyOutputLocation = file('old-history.txt')"],
    ["tasks.named('pitest') {", "tasks.named('test') {"],
    ['doLast { task ->', 'doFirst { task ->'],
    ['doFirst { task ->', 'doLast { task ->'],
    ['timestampedReports = false', 'timestampedReports = true'],
    ["task.reportDir.file('mutations.xml')", "layout.buildDirectory.file('stale/mutations.xml')"],
    ['if (!mutationReport.isFile())', 'if (false)'],
    ["getAttribute('status') == 'RUN_ERROR'", "getAttribute('status') != 'RUN_ERROR'"],
    ["getAttribute('status') == 'RUN_ERROR'", "getAttribute('status') == 'TIMED_OUT'"],
    ["disallow-doctype-decl', true", "disallow-doctype-decl', false"],
    ["ACCESS_EXTERNAL_DTD, ''", "ACCESS_EXTERNAL_DTD, 'all'"],
    ['catch (org.xml.sax.SAXException | IOException exception) {', 'catch (IOException exception) {'],
    ['if (mutations.length == 0)', 'if (false)'],
    ['!mutationReport.delete()', 'false'],
    ['!reportDirectory.toPath().startsWith', 'reportDirectory.toPath().startsWith'],
    ['java.nio.file.Files.isSymbolicLink(mutationReport.toPath())', 'false'],
    ["if (mutations.item(index).getAttribute('status') == 'RUN_ERROR')", "def decoy = \"if (mutations.item(index).getAttribute('status') == 'RUN_ERROR')\"; if (false)"],
  ];
  for (const [before, after] of mutations) {
    assert.ok(source.includes(before), `fixture target must exist: ${before}`);
    assert.notDeepEqual(validatePitResultCheck(source.replace(before, after)), [], before);
  }
  assert.notDeepEqual(validatePitResultCheck(source.split(/\r?\n/).map(line => `// ${line}`).join('\n')), []);
  assert.notDeepEqual(validatePitResultCheck(`def decoy = ${JSON.stringify(source)}`), []);
});

test('duplicate stable rule IDs and duplicate sources are rejected', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const duplicate = clone(registry.gateSets[0].rules[0]);
  registry.gateSets[0].rules.push(duplicate);

  const errors = validate(registry).join('\n');
  assert.match(errors, /duplicate gate id/i);
  assert.match(errors, /duplicate registered source/i);
});

test('deleting a registry entry leaves the real tagged gate unregistered and fails closed', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const removed = registry.gateSets[0].rules.shift();

  assert.match(validate(registry).join('\n'), new RegExp(`unregistered tagged gate.*${removed.source.replaceAll('/', '\\/')}`, 'i'));
});

test('a registry source that does not satisfy its selector is rejected as a ghost', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  registry.gateSets[0].rules[0].source = 'api-server/src/test/java/nuri/api/harness/GhostGovernanceGate.java';

  assert.match(validate(registry).join('\n'), /ghost gate source/i);
});

test('a tagged dummy class cannot impersonate the registered basename test class', () => {
  const source = `
    @Tag("governance-harness") class Dummy {}
    public class RealGateTest { @Test void enforcesRule() {} }
  `;
  assert.equal(hasClassAnnotation(source, 'Tag', 'governance-harness', 'RealGateTest'), false);
  assert.equal(hasClassAnnotation(
    '@Tag("governance-harness") public class RealGateTest { @Test void rule() {} }',
    'Tag',
    'governance-harness',
    'RealGateTest',
  ), true);
  assert.equal(hasClassAnnotation(`
    @SuppressWarnings("""
      @Tag("governance-harness")
    """)
    public class RealGateTest { @Test void rule() {} }
  `, 'Tag', 'governance-harness', 'RealGateTest'), false);
});

test('registered Java gates cannot silently disable or conditionally skip themselves', () => {
  assert.equal(hasGateSkipConstruct('@Disabled class Gate { @Test void rule() {} }'), true);
  assert.equal(hasGateSkipConstruct('class Gate { @Test void rule() { assumeTrue(false); } }'), true);
  assert.equal(hasGateSkipConstruct('class Gate { @Test void rule() {} }'), false);
});

test('a quality selector that matches no real control is rejected as a ghost', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const lineCoverage = registry.qualityRatchets.find(({ id }) => id === 'QUALITY-BACKEND-LINE-COVERAGE');
  lineCoverage.selector.counter = 'INSTRUCTION';

  assert.match(validate(registry).join('\n'), /ghost quality selector.*QUALITY-BACKEND-LINE-COVERAGE/i);
});

test('JaCoCo ratchets pin COVEREDRATIO semantics rather than just a number', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  registry.qualityRatchets.find(({ id }) => id === 'QUALITY-BACKEND-LINE-COVERAGE')
    .selector.value = 'MISSEDRATIO';

  assert.match(validate(registry).join('\n'), /ghost quality selector.*QUALITY-BACKEND-LINE-COVERAGE/i);
});

test('a runner package selector that matches no script is rejected as a ghost', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const nodeContracts = registry.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS');
  nodeContracts.selector.packageScript.name = 'test:ghost-operational-contracts';

  assert.match(validate(registry).join('\n'), /ghost runner selector package script/i);
});

test('Playwright config contract pins CI-only forbidOnly and the disjoint setup/API/browser topology', () => {
  const registry = loadGovernanceRegistry(registryPath);
  const playwright = registry.gateSets.find(({ id }) => id === 'GATESET-PLAYWRIGHT-E2E');
  const contract = playwright.selector.projectContract;
  assert.deepEqual(contract, {
    source: 'frontend/playwright.config.ts',
    forbidOnly: '!!process.env.CI',
    projects: [
      { name: 'setup', testMatch: '/.*\\.setup\\.ts/' },
      { name: 'api-contract', testMatch: '/contracts\\/.*\\.spec\\.ts/', dependencies: ['setup'] },
      { name: 'full-suite', testMatch: '/(?:journeys|quality)\\/.*\\.spec\\.ts/', dependencies: ['setup'] },
    ],
  });

  const source = readFileSync(path.join(repoRoot, contract.source), 'utf8');
  assert.deepEqual(validatePlaywrightProjectContract(source, contract), []);

  for (const weakened of [
    source.replace('testMatch: /.*\\.setup\\.ts/', 'testMatch: /global\\.setup\\.ts/'),
    source.replace('testMatch: /(?:journeys|quality)\\/.*\\.spec\\.ts/', 'testMatch: /journeys\\/.*\\.spec\\.ts/'),
    source.replace('testMatch: /contracts\\/.*\\.spec\\.ts/', 'testMatch: /.*\\.spec\\.ts/'),
    source.replace("dependencies: ['setup']", 'dependencies: []'),
    source.replace('forbidOnly: !!process.env.CI', 'forbidOnly: false'),
    source.replace("name: 'full-suite'", "name: 'smoke-only'"),
    source.replace(
      'projects: [',
      "projects: [{ name: 'shadow-suite', testMatch: /shadow\\.spec\\.ts/ },",
    ),
  ]) {
    assert.notDeepEqual(validatePlaywrightProjectContract(weakened, contract), []);
  }
});

test('the operational catalog cannot narrow its glob or detach from a required execution path', () => {
  const narrowed = clone(loadGovernanceRegistry(registryPath));
  const narrowedContracts = narrowed.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS');
  narrowedContracts.selector.packageScript.command = 'node --test "scripts/required-checks-contract.test.mjs"';
  assert.match(validate(narrowed).join('\n'), /ghost runner selector package script/i);

  const detached = clone(loadGovernanceRegistry(registryPath));
  const detachedContracts = detached.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS');
  detachedContracts.selector.commandBindings[2].fragment = 'npm run test:ghost-operational-contracts';
  assert.match(validate(detached).join('\n'), /ghost runner command binding.*ci\.yml/i);
});

test('comment-only text cannot impersonate an executable runner binding', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const contracts = registry.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS');
  contracts.selector.commandBindings[0].fragment = 'Node 기반 운영 계약은 하나의 catalog runner가 소유한다.';

  assert.match(validate(registry).join('\n'), /ghost runner command binding.*pre-push/i);
});

test('bound commands require exact executable lines', () => {
  const expected = 'npm run test:operational-contracts';
  assert.equal(exactBindingLineMatches('npm run test:operational-contracts || true', expected), false);
  assert.equal(exactBindingLineMatches('echo npm run test:operational-contracts', expected), false);
  assert.equal(exactBindingLineMatches('true || npm run test:operational-contracts', expected), false);
  assert.equal(exactBindingLineMatches('npm run test:operational-contracts -- --test-name-pattern harmless', expected), false);
  assert.equal(exactBindingLineMatches('# npm run test:operational-contracts', expected), false);
  assert.equal(exactBindingLineMatches(expected, expected), true);
});

// [2026-09-01 신설 — 커밋 d6097b9f2 ①] 소비자 파일의 주석 문법을 파일 종류로 가른다.
//   종전에는 모든 파일에 Java 블록 주석 규칙을 적용해, YAML 주석 안의 `/*`(경로 glob·정규식·URL)가
//   블록 주석 시작으로 해석되면서 그 뒤 실행 내용이 통째로 사라졌다. 실측: ci.yml 주석에
//   'scripts' + '/*.test.mjs' 를 적은 것만으로 무관한 binding 4건이 동시에 ghost 판정됐다.
//   같은 원리로 실재하지 않는 binding 이 통과하는 false-green 방향도 성립했다.
test('binding matching uses the comment syntax of the consumer file, not Java rules everywhere', () => {
  const command = 'run: npm run test:operational-contracts';
  // 주석에 블록 주석 시작으로 읽힐 수 있는 시퀀스를 넣어도 YAML 의 실행 라인은 살아남아야 한다.
  const yaml = [
    'jobs:',
    '  secret-scan:',
    '    steps:',
    `      # 카탈로그(scripts${'/*'}.test.mjs)는 frontend 의존성을 로드한다`,
    `      ${command}`,
  ].join('\n');
  assert.equal(exactBindingLineMatches(yaml, command, '.github/workflows/ci.yml'), true);
  // 셸 훅도 같은 규칙이다(확장자가 없어 basename 으로 가른다).
  const hook = [`# glob 예시: scripts${'/*'}.test.mjs`, 'npm run test:operational-contracts \\'].join('\n');
  assert.equal(exactBindingLineMatches(hook, 'npm run test:operational-contracts \\', '.githooks/pre-push'), true);
  // 반대로 YAML 의 `#` 주석은 여전히 실행이 아니다 — 완화가 아니라 문법 정합이다.
  assert.equal(
    exactBindingLineMatches(`      # ${command}`, command, '.github/workflows/ci.yml'),
    false,
  );
  // Java 계열 소비자(.mjs·.gradle)는 종전 규칙을 유지한다 — 블록 주석 안의 명령은 실행이 아니다.
  const js = `/*\n  run('pnpm -C frontend run lint');\n*/`;
  assert.equal(exactBindingLineMatches(js, "run('pnpm -C frontend run lint');", 'scripts/verify.mjs'), false);
});

// [2026-09-01 신설 — 커밋 d6097b9f2 ②] CI tier binding 은 "그 줄이 파일에 있다" 로 tier 를 주장할 수
//   없다. 어느 job 인지, 조건부 step 뒤인지까지 선언해야 하고 실제와 어긋나면 red 다. 종전에는
//   EXEC-FOUNDATION-COVERAGE 가 local-full 을 선언하고도 실제 진입점이 그 태스크를 부르지 않아
//   커버리지 래칫 2종이 로컬에서 한 번도 검증되지 않았다(2026-08-31 실측).
test('workflow bindings bind to a job and declare conditional steps honestly', () => {
  const registry = loadGovernanceRegistry(registryPath);
  const ciBindings = [];
  const collect = (owner, bindings) => (bindings ?? []).forEach((binding) => {
    if (/^\.github\/workflows\/.+\.ya?ml$/.test(binding.source)) ciBindings.push([owner, binding]);
  });
  registry.executionProfiles.forEach((profile) => collect(profile.id, profile.bindings));
  registry.gateSets.forEach((set) => {
    collect(set.id, set.selector?.executionBindings);
    collect(set.id, set.selector?.commandBindings);
  });

  assert.ok(ciBindings.length >= 12, `CI binding 모집단이 붕괴했습니다: ${ciBindings.length}`);
  assert.ok(ciBindings.every(([, binding]) => typeof binding.job === 'string' && binding.job !== ''));
  assert.deepEqual(validate(registry), []);

  // ① 선언한 job 밖의 라인은 red — 라인이 다른 job 으로 옮겨가면 잡힌다.
  const wrongJob = clone(registry);
  wrongJob.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS')
    .selector.commandBindings.find((b) => b.source.includes('ci.yml')).job = 'backend-scope';
  assert.match(validate(wrongJob).join('\n'), /not inside job backend-scope/);

  // ② 조건부 step 인데 선언하지 않으면 red — tier 주장이 조용히 과장되는 것을 막는다.
  const hiddenCondition = clone(registry);
  delete hiddenCondition.gateSets.find(({ id }) => id === 'GATESET-CROSS-STACK-CONTRACTS')
    .selector.commandBindings.find((b) => b.source.includes('ci.yml')).conditional;
  assert.match(validate(hiddenCondition).join('\n'), /runs behind a step-level 'if:'/);

  // ③ 반대 방향(stale 선언)도 red — 조건이 사라지면 registry 도 함께 바뀌어야 한다.
  const staleCondition = clone(registry);
  staleCondition.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS')
    .selector.commandBindings.find((b) => b.source.includes('ci.yml')).conditional = true;
  assert.match(validate(staleCondition).join('\n'), /declares conditional: true but the step/);

  // ④ 워크플로가 아닌 소비자에 job 을, 워크플로·verify 가 아닌 소비자에 conditional 을 붙이면 red — 의미 없는 선언을 남기지 않는다.
  const misplaced = clone(registry);
  const misplacedBindings = misplaced.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS').selector.commandBindings;
  misplacedBindings.find((b) => b.source.includes('verify.mjs')).job = 'secret-scan';
  misplacedBindings.find((b) => b.source === '.githooks/pre-push').conditional = true;
  const misplacedErrors = validate(misplaced).join('\n');
  assert.match(misplacedErrors, /job is a workflow-only binding field: scripts\/verify\.mjs/);
  assert.match(misplacedErrors, /conditional is a workflow or verify-runner binding field: \.githooks\/pre-push/);
});

// [2026-10-17 신설] verify.mjs binding 도 "그 줄이 파일에 있다" 로 tier 를 주장할 수 없다. tier 가 뜻하는 범위 분기
//   (local-full = full, local-e2e = e2e)에서 호출을 따라가 닿는 줄이어야 하고, 조건 안이면 conditional 을 선언해야 한다.
//   종전에는 cross-stack 결속이 full 이 끄는 `if (crossStack)` 안의 줄을, frontend 불변식 결속이 full 이 부르지 않는
//   fast 전용 함수의 줄을 가리킨 채 green 이었다.
test('verify runner analysis follows calls from each scope branch and marks conditional or unreachable lines', () => {
  const synthetic = [
    'function runA() {',
    "  run('a');",
    '  if (flag) {',
    "    run('b');",
    '  }',
    '}',
    'function runGuarded() {',
    '  if (done) return;',
    "  run('c');",
    '}',
    'function runExited() {',
    '  return;',
    "  run('d');",
    '}',
    'function unused() {',
    "  run('e');",
    '}',
    'try {',
    "  if (scope === 'full') {",
    '    runA();',
    '    runGuarded();',
    '    runExited();',
    "    // run('f');",
    '    if (other) runA();',
    "    commands.forEach(command => runExited());",
    "  } else if (scope === 'e2e') {",
    '    if (other) {',
    '      runA();',
    '    }',
    '  }',
    '} catch (error) {}',
  ].join('\r\n');
  const { errors, scopes } = analyzeVerifyRunnerExecution(synthetic);
  assert.deepEqual(errors, []);
  assert.equal(scopes.full["run('a');"], 'unconditional', '무조건 부른 함수의 무조건 줄');
  assert.equal(scopes.full["run('b');"], 'conditional', '함수 안 if 블록');
  assert.equal(scopes.full["run('c');"], 'conditional', '앞선 조건부 조기 종료 뒤');
  assert.equal(Object.hasOwn(scopes.full, "run('d');"), false, '무조건 조기 종료 뒤는 닿지 않는다');
  assert.equal(Object.hasOwn(scopes.full, "run('e');"), false, '부르지 않는 함수는 닿지 않는다');
  assert.equal(Object.hasOwn(scopes.full, "run('f');"), false, '주석은 실행이 아니다');
  assert.equal(scopes.e2e["run('a');"], 'conditional', '조건 안에서 부른 함수의 줄은 조건부다');
  assert.equal(Object.hasOwn(scopes.e2e, "run('c');"), false);
  assert.match(analyzeVerifyRunnerExecution("run('x');").errors.join('\n'), /no verify scope branch/);
  assert.match(analyzeVerifyRunnerExecution("if (scope === 'full') run('x');").errors.join('\n'), /'full' has no block body/);

  // 함수 본문 안의 범위 분기는 진입점이 아니다 — 그 함수를 부르는지 보지 않으므로 구조 오류다(부르지 않는 클로저의 tier 주장 차단).
  const branch = "\n  if (scope === 'full') {\n    run('x');\n  }\n";
  for (const [open, close] of [
    ['function later() {', '}'],
    ['const later = () => {', '};'],
    ['const later = function () {', '};'],
    ['const handlers = { later() {', '} };'],
    ['for (const item of items) item.forEach(function () {', '});'],
    ['register(function ({ strict }) {', '});'],
  ]) {
    const { errors: enclosed, scopes: none } = analyzeVerifyRunnerExecution(`${open}${branch}${close}`);
    assert.match(enclosed.join('\n'), /verify scope branch 'full' is inside a function body/, open);
    assert.equal(none.full, undefined, open);
  }
  // 제어 블록(try·for·if)은 함수 본문이 아니다 — 분기 자체가 실행되는지는 pre-push 계약의 실행 관찰이 소유한다.
  for (const [open, close] of [['for (let i = 0; i < 1; i += 1) {', '}'], ['if (ready({ strict: true })) {', '}']]) {
    const controlled = analyzeVerifyRunnerExecution(`try {\n  ${open}${branch}  ${close}\n} finally {}`);
    assert.deepEqual(controlled.errors, [], open);
    assert.equal(controlled.scopes.full["run('x');"], 'unconditional', open);
  }
  // 실제 verify.mjs 에서 full 분기를 부르지 않는 함수 안으로 옮기면 종전에는 test:coverage 가 unconditional 로 남았다 — 이제 구조 오류다.
  const runner = readFileSync(path.join(repoRoot, 'scripts', 'verify.mjs'), 'utf8');
  const detached = runner.replace("} else if (scope === 'full') {", "} else if (scope === 'full-detached') {")
    .replace(/\r?\ntry \{\r?\n/u, match => `\nfunction later() {\n  if (scope === 'full') {\n    runFrontendPackaging();\n  }\n}${match}`);
  assert.notEqual(detached, runner);
  assert.match(analyzeVerifyRunnerExecution(detached).errors.join('\n'), /verify scope branch 'full' is inside a function body \(function later\(\)\)/);
});

test('verify runner bindings must be reached from the scope branch their tier names', () => {
  const registry = loadGovernanceRegistry(registryPath);
  const verifyBinding = (bindings) => bindings.find((binding) => binding.source === 'scripts/verify.mjs');
  const gateSet = (target, id) => target.gateSets.find((set) => set.id === id).selector;
  assert.equal(verifyBinding(gateSet(registry, 'GATESET-FRONTEND-INVARIANTS').commandBindings).fragment,
    "run('pnpm -C frontend run test:coverage');", 'full 에서 불변식 시험군을 실제로 돌리는 줄');
  assert.equal(verifyBinding(gateSet(registry, 'GATESET-CROSS-STACK-CONTRACTS').commandBindings).fragment,
    "run('pnpm -C frontend run test:coverage');", 'full 에서 cross-stack 시험군을 실제로 돌리는 줄');

  const mutated = clone(registry);
  // ① fast 전용 줄과 ② be 전용 줄을 local-full 근거로 되돌리면 red(종전 두 결속).
  verifyBinding(gateSet(mutated, 'GATESET-FRONTEND-INVARIANTS').commandBindings).fragment = "run('pnpm -C frontend exec vitest run src/__tests__');";
  verifyBinding(gateSet(mutated, 'GATESET-CROSS-STACK-CONTRACTS').commandBindings).fragment = "run('pnpm -C frontend exec vitest run src/__tests__/cross-stack');";
  // ③ 무조건 실행되는 줄에 conditional 을 선언하면 red(양방향).
  verifyBinding(mutated.executionProfiles.find(({ id }) => id === 'EXEC-FRONTEND-LINT').bindings).conditional = true;
  // ④ verify.mjs 가 뒷받침하지 않는 tier(pre-push)를 주장하면 red.
  verifyBinding(gateSet(mutated, 'GATESET-NODE-OPERATIONAL-CONTRACTS').commandBindings).tiers = ['pre-push', 'local-full', 'local-e2e'];
  const errors = validate(mutated).join('\n');
  assert.match(errors, /GATESET-FRONTEND-INVARIANTS: execution binding is not reached from the verify 'full' branch \(tier local-full\)/);
  assert.match(errors, /GATESET-CROSS-STACK-CONTRACTS: execution binding is not reached from the verify 'full' branch \(tier local-full\)/);
  assert.match(errors, /EXEC-FRONTEND-LINT: execution binding declares conditional: true but runs unconditionally/);
  assert.match(errors, /GATESET-NODE-OPERATIONAL-CONTRACTS: scripts\/verify\.mjs binding cannot claim tier pre-push/);

  // ⑤ full 분기가 패키징 함수를 부르지 않게 되면 test:coverage·bundle 결속이 모두 red — 줄은 파일에 남아 있어도 그렇다.
  const verifyPath = path.join(repoRoot, 'scripts', 'verify.mjs');
  const runner = readFileSync(verifyPath, 'utf8');
  const detached = runner.replace(/(\} else if \(scope === 'full'\) \{[\s\S]*?)runFrontendPackaging\(\);/, '$1');
  assert.notEqual(detached, runner);
  const fileSystem = { ...fs, readFileSync: (file, ...rest) => (path.resolve(file) === verifyPath ? detached : fs.readFileSync(file, ...rest)) };
  const detachedErrors = validateGovernanceRegistry({
    registry, repoRoot, snapshot: createGovernanceRepositorySnapshot({ analysis, fileSystem, repoRoot }),
  }).join('\n');
  for (const id of ['EXEC-FRONTEND-COVERAGE', 'EXEC-FRONTEND-BUNDLE', 'GATESET-FRONTEND-INVARIANTS', 'GATESET-CROSS-STACK-CONTRACTS', 'GATESET-FRONTEND-VITEST']) {
    assert.match(detachedErrors, new RegExp(`${id}: execution binding is not reached from the verify 'full' branch`), id);
  }

  // ⑥ 조건 안으로 옮기면 선언한 binding 만 통과하고 선언하지 않은 binding 은 red — 조건 선언이 실제로 받아들여진다.
  const guarded = runner.replace(/(\} else if \(scope === 'full'\) \{[\s\S]*?)runFrontendPackaging\(\);/, '$1if (packaging) runFrontendPackaging();');
  assert.notEqual(guarded, runner);
  const declared = clone(registry);
  verifyBinding(declared.executionProfiles.find(({ id }) => id === 'EXEC-FRONTEND-COVERAGE').bindings).conditional = true;
  const guardedFileSystem = { ...fs, readFileSync: (file, ...rest) => (path.resolve(file) === verifyPath ? guarded : fs.readFileSync(file, ...rest)) };
  const guardedErrors = validateGovernanceRegistry({
    registry: declared, repoRoot, snapshot: createGovernanceRepositorySnapshot({ analysis, fileSystem: guardedFileSystem, repoRoot }),
  }).join('\n');
  assert.doesNotMatch(guardedErrors, /EXEC-FRONTEND-COVERAGE:/);
  assert.match(guardedErrors, /EXEC-FRONTEND-BUNDLE: execution binding runs behind a condition in the verify 'full' branch/);
});

test('authoritative runner catalogs reject every supported skip/focus form without decoy false positives', () => {
  for (const forbidden of [
    'test.skip("rule", () => {})',
    'test.concurrent.skip("rule", () => {})',
    'test.concurrent.only("rule", () => {})',
    'test.describe.fixme("rule", () => {})',
    'describe.only("rule", () => {})',
    'test.todo("rule")',
    'test.fails("rule", () => {})',
    'test.fail(true, "expected failure")',
    'xtest("rule", () => {})',
    'xit("rule", () => {})',
    'xdescribe("rule", () => {})',
    'test("rule", { skip: true }, () => {})',
    'test("rule", { skip: "temporarily disabled" }, () => {})',
    't.skip("not supported here")',
  ]) {
    assert.equal(containsRunnerSkip(forbidden), true, forbidden);
  }

  assert.equal(containsRunnerSkip(`
    test("rule", () => {});
    test("explicit false option", { skip: false }, () => {});
    test("unrelated options", { unskip: true, xskip: true }, () => {});
    const quoted = "test.concurrent.skip('decoy')";
    const single = 'xdescribe("decoy")';
    const templated = \`t.skip("decoy") and test("x", { skip: true })\`;
    // test.only("comment decoy", () => {});
    /* xtest("block comment decoy", () => {}); */
  `), false);
});

test('conditional registration counts as a skip unless the projection ledger decides it', () => {
  for (const forbidden of [
    'if (process.env.CI) it("rule", () => {})',
    'if (flag) describe("rule", () => {})',
    'if (enabled) { test("rule", () => {}) }',
    'if (rows.length) it.each(rows)("rule %s", () => {})',
    'if (!existsSync(file)) test.concurrent("rule", () => {})',
  ]) {
    assert.deepEqual(findRunnerSkipConstructs(forbidden).map(({ kind }) => kind), ['conditional-registration'], forbidden);
  }
  // 투영 원장 판정(원본에서는 늘 참)만 등록을 가른다.
  assert.equal(containsRunnerSkip(`
    if (inProjection(path.join(SRC, 'a.ts'))) it("rule", () => {});
    if (repoPresent(
      'frontend/src/a.ts',
    )) describe("rule", () => {});
    if (srcPresent('app/a.tsx')) it("rule", () => {});
    if (hookInProjection) it("rule", () => {});
    if (PROJECTED_SOURCE !== undefined) describe("rule", () => {});
    it("body", () => { if (flag) { expect(1).toBe(1); } });
    const decoy = "if (flag) it('quoted', () => {})";
  `), false);
});

test('runner skip scanner enumerates every real construct for exact Playwright waiver matching', () => {
  const source = `
    test.skip(process.platform !== 'linux', 'linux-only');
    test.describe.fixme('broken', () => {});
    test('node form', { skip: true }, () => {});
    const decoy = "test.skip(true, 'quoted')";
  `;
  assert.deepEqual(
    findRunnerSkipConstructs(source).map(({ kind }) => kind),
    ['skip', 'fixme', 'skip-option'],
  );
});

test('Playwright skip waivers are exact, unique, current, and cannot hide new skip or focus constructs', () => {
  const missing = clone(loadGovernanceRegistry(registryPath));
  missing.gateSets.find(({ id }) => id === 'GATESET-PLAYWRIGHT-E2E').selector.skipWaivers = [];
  assert.match(validate(missing).join('\n'), /unwaived Playwright skip construct/i);

  const expired = clone(loadGovernanceRegistry(registryPath));
  expired.gateSets.find(({ id }) => id === 'GATESET-PLAYWRIGHT-E2E')
    .selector.skipWaivers[0].reviewBy = '2020-01-01';
  assert.match(validate(expired).join('\n'), /expired Playwright skip waiver/i);

  const stale = clone(loadGovernanceRegistry(registryPath));
  stale.gateSets.find(({ id }) => id === 'GATESET-PLAYWRIGHT-E2E')
    .selector.skipWaivers[0].stableToken = 'no-longer-present';
  assert.match(validate(stale).join('\n'), /stale Playwright skip waiver/i);

  const duplicate = clone(loadGovernanceRegistry(registryPath));
  const selector = duplicate.gateSets.find(({ id }) => id === 'GATESET-PLAYWRIGHT-E2E').selector;
  selector.skipWaivers.push(clone(selector.skipWaivers[0]));
  assert.match(validate(duplicate).join('\n'), /duplicate Playwright skip waiver/i);
});

test('Java gate sets require executable Gradle and task bindings in addition to tags', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const governance = registry.gateSets.find(({ id }) => id === 'GATESET-GOVERNANCE-HARNESS');
  governance.selector.executionBindings = [];

  assert.match(validate(registry).join('\n'), /GATESET-GOVERNANCE-HARNESS.*execution bindings are required/i);
});

test('declared gate tiers require an authoritative execution binding for every tier', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const governance = registry.gateSets.find(({ id }) => id === 'GATESET-GOVERNANCE-HARNESS');
  governance.selector.executionBindings = governance.selector.executionBindings
    .filter(({ tiers }) => !tiers.includes('pre-push'));

  assert.match(validate(registry).join('\n'), /do not cover declared tiers: pre-push/i);
});

test('every executable gate asset and CODEOWNERS itself remain governance-owned', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  registry.gateSets[0].inputs.push('README.md');

  assert.match(validate(registry).join('\n'), /not CODEOWNERS-protected: README\.md/i);
});

test('CODEOWNERS uses recursive globs and the last matching rule as GitHub does', () => {
  assert.equal(codeOwnerCovers('/frontend/src/**/*.test.ts', 'frontend/src/a/b/service.test.ts'), true);
  assert.equal(codeOwnerCovers('/frontend/src/**/*.test.ts', 'frontend/src/a/service.ts'), false);
  assert.deepEqual(effectiveCodeOwners([
    ['/scripts/', '@lkindo'],
    ['/scripts/unsafe.mjs', '@someone-else'],
  ], 'scripts/unsafe.mjs'), ['@someone-else']);
});

test('PIT remains bound to the strict source matrix and stable aggregate context', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const pit = registry.gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE');
  pit.selector.sourceJobIds = ['ghost-mutation-source', 'mutation-scope-migration'];

  assert.match(validate(registry).join('\n'), /ghost required-check aggregate selector.*mutation-test/i);
});

test('PIT registry and CI keep the same exact matrix catalog, and its size is pinned only here', () => {
  const registry = loadGovernanceRegistry(registryPath);
  const pit = registry.gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE');
  // 스코프는 두 잡에 나뉘어 산다(DEC-OPS-104) — union 이 원장과 정확히 같아야 한다.
  const ci = readFileSync(path.join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
  const product = parseMutationScopeMatrix(ci, 'mutation-scope');
  const migration = parseMutationScopeMatrix(ci, 'mutation-scope-migration');

  assert.deepEqual(product.errors, []);
  assert.deepEqual(migration.errors, []);
  // PIT 범위 수의 유일한 확인 지점이다. 범위를 더하거나 걷는 변경은 이 수와 원장·ci.yml 을 함께 고친다(ledger-pin(DEC-OPS-371)).
  assert.equal(pit.selector.matrixScopes.length, 23, 'PIT matrix scope count changed — update this pin with the registry and ci.yml');
  assert.deepEqual(pit.selector.sourceJobIds, ['mutation-scope', 'mutation-scope-migration']);
  const byScope = (a, b) => a.scope.localeCompare(b.scope);
  const declared = pit.selector.matrixScopes.map(({ job, ...rest }) => rest).sort(byScope);
  assert.deepEqual([...product.scopes, ...migration.scopes].sort(byScope), declared);
  // 소유 잡 태그가 실제 잡과 어긋나면 안 된다.
  const owners = new Map(pit.selector.matrixScopes.map(({ scope, job }) => [scope, job]));
  for (const entry of product.scopes) assert.equal(owners.get(entry.scope), 'mutation-scope');
  for (const entry of migration.scopes) assert.equal(owners.get(entry.scope), 'mutation-scope-migration');
  assert.doesNotMatch(pit.selector.matrixScopes[0].classes, /service\.(?:image|calendar|log)\.\*/);
});

test('PIT critical security targets remain in both the existing registry and CI scopes', () => {
  const registry = loadGovernanceRegistry(registryPath);
  const declared = registry.gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE').selector.matrixScopes;
  const ci = readFileSync(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf8');
  const actual = parseMutationScopeMatrix(ci, 'mutation-scope');
  assert.deepEqual(actual.errors, []);
  assert.deepEqual(validateCriticalMutationTargets(declared), []);
  assert.deepEqual(validateCriticalMutationTargets(actual.scopes), []);
});

test('PIT critical security targets cannot disappear by narrowing both matching catalogs', () => {
  const retained = ['nuri.business.service.auth.*', 'nuri.business.service.login.*', 'nuri.business.security.util.*'];
  const added = ['nuri.business.service.menu.MenuService', 'nuri.business.service.menu.MenuStructurePlan',
    'nuri.business.security.iam.EgovAuthenticationProvider', 'nuri.business.security.filter.RateLimitFilter'];
  const survey = 'nuri.business.service.survey.SurveyResultService';
  // [2026-10-19 DEC-OPS-366] 설문 결과는 설문 범위가, 사용자 관리의 보안 부작용은 사용자·조직 범위가 지킨다.
  const userOrg = ['nuri.business.service.user.UserService', 'nuri.business.service.user.LoginIdReuseGuard'];
  const scope = classes => [
    { scope: 'business-core-auth', classes: classes.join(',') },
    { scope: 'business-app-survey', classes: survey },
    { scope: 'business-core-user-org', classes: userOrg.join(',') },
  ];
  assert.deepEqual(validateCriticalMutationTargets(scope([...retained, ...added])), []);
  for (const missing of added) {
    const fixture = scope([...retained, ...added.filter(target => target !== missing)]);
    assert.deepEqual(validateCriticalMutationTargets(fixture), [
      `PIT business-core-auth is missing critical target '${missing}'`,
    ]);
  }
  const missingSurvey = scope([...retained, ...added]);
  missingSurvey[1].classes = 'nuri.business.service.mail.*';
  assert.deepEqual(validateCriticalMutationTargets(missingSurvey), [
    `PIT business-app-survey is missing critical target '${survey}'`,
  ]);
  for (const missing of userOrg) {
    const fixture = scope([...retained, ...added]);
    fixture[2].classes = userOrg.filter(target => target !== missing).join(',');
    assert.deepEqual(validateCriticalMutationTargets(fixture), [
      `PIT business-core-user-org is missing critical target '${missing}'`,
    ]);
  }
  assert.equal(validateCriticalMutationTargets([]).length, added.length + 1 + userOrg.length);

  // Exercise the real registry validator too, so a detached helper cannot satisfy this contract.
  const registry = clone(loadGovernanceRegistry(registryPath));
  const declared = registry.gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE').selector.matrixScopes;
  const protectedTargets = [...added, survey, ...userOrg];
  // 실제 범위는 패키지 글롭(survey.*·user.*)으로 대상을 덮으므로, 대상을 덮는 글롭까지 걷어야 두 원장을 함께 좁힌 상태가 된다.
  const covers = (glob, target) => new RegExp('^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*') + '$').test(target);
  for (const entry of declared) {
    entry.classes = entry.classes.split(',').filter(glob => !protectedTargets.some(target => covers(glob, target))).join(',');
  }
  const errors = validate(registry).join('\n');
  for (const target of protectedTargets) assert.ok(errors.includes(`missing critical target '${target}'`));
});

test('a PIT scope declared under the wrong job is rejected', () => {
  // [DEC-OPS-104] 태그만 바꾸면 그 스코프가 다른 잡에서 도는 것처럼 보인다 — 조건이 달라 실행 시점이 바뀐다.
  const registry = clone(loadGovernanceRegistry(registryPath));
  const pit = registry.gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE');
  const entry = pit.selector.matrixScopes.find(({ scope }) => scope === 'migration-validate');
  entry.job = 'mutation-scope';

  assert.match(validate(registry).join('\n'), /is declared under .mutation-scope. but runs in/i);
});

test('deleting a PIT scope is rejected by the CI comparison, and an empty catalog is rejected outright', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const pit = registry.gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE');
  const [removed] = pit.selector.matrixScopes.splice(3, 1);

  assert.match(validate(registry).join('\n'), new RegExp(`unregistered CI mutation matrix scope '${removed.scope}'`, 'i'));
  pit.selector.matrixScopes = [];
  assert.match(validate(registry).join('\n'), /PIT matrix catalog must be a non-empty scope list/i);
});

test('duplicating a PIT scope is rejected instead of silently overwriting it', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const pit = registry.gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE');
  pit.selector.matrixScopes.push(clone(pit.selector.matrixScopes[0]));

  assert.match(validate(registry).join('\n'), /duplicate PIT matrix scope 'business-app-board'/i);
});

test('narrowing any PIT scope field is rejected against the CI matrix', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const pit = registry.gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE');
  const entry = pit.selector.matrixScopes.find(({ scope }) => scope === 'business-core-file');
  entry.classes = entry.classes.split(',').slice(0, -1).join(',');

  assert.match(validate(registry).join('\n'), /PIT matrix scope 'business-core-file' field 'classes' differs/i);
});

test('every PIT target class and test glob must match a real class in its module source set', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const pit = registry.gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE');
  pit.selector.matrixScopes[0].classes = 'nuri.business.service.doesnotexist.*';

  assert.match(validate(registry).join('\n'), /classes glob 'nuri\.business\.service\.doesnotexist\.\*' matches no Java class/i);
});

test('lowering a quality threshold below its ratchet baseline is rejected', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const lineCoverage = registry.qualityRatchets.find(({ id }) => id === 'QUALITY-BACKEND-LINE-COVERAGE');
  lineCoverage.current = lineCoverage.baseline - 0.01;

  assert.match(validate(registry).join('\n'), /QUALITY-BACKEND-LINE-COVERAGE.*weakened below baseline/i);
});

test('consumer configuration must exactly match the registry current value', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const lineCoverage = registry.qualityRatchets.find(({ id }) => id === 'QUALITY-BACKEND-LINE-COVERAGE');
  lineCoverage.current += 0.01;

  assert.match(validate(registry).join('\n'), /QUALITY-BACKEND-LINE-COVERAGE.*consumer value.*registry current/i);
});

test('mutation threshold condition is bound to STRICT_MUTATION equals true and relaxed zero', () => {
  const inverted = clone(loadGovernanceRegistry(registryPath));
  const mutation = inverted.qualityRatchets.find(({ id }) => id === 'QUALITY-BACKEND-MUTATION-SCORE');
  mutation.selector.strictValue = 'false';
  assert.match(validate(inverted).join('\n'), /fail-closed mutationThreshold condition/i);

  const relaxed = clone(loadGovernanceRegistry(registryPath));
  relaxed.qualityRatchets.find(({ id }) => id === 'QUALITY-BACKEND-MUTATION-SCORE')
    .selector.relaxedValue = 75;
  assert.match(validate(relaxed).join('\n'), /fail-closed mutationThreshold condition/i);
});

test('every gate must map to a required CI context that exists in the current manifest', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  registry.gateSets[0].requiredCiContext = 'ghost-required-check';

  assert.match(validate(registry).join('\n'), /unknown required CI context.*ghost-required-check/i);
});


// 이 시험은 build 아래 fixture 를 같은 경로에 두 번 고쳐 쓴다 — 매번 디스크를 새로 읽어야 하므로 공유 snapshot 을 쓰지 않는다.
test('independent coverage scopes retain the root ratchet and reject weaker or missing controls', (t) => {
  const fixture = mkdtempSync(path.join(repoRoot, 'build', 'scoped-coverage-contract-'));
  t.after(() => {
    assert.ok(fixture.startsWith(path.join(repoRoot, 'build') + path.sep));
    rmSync(fixture, { recursive: true, force: true });
  });
  const source = readFileSync(path.join(repoRoot, 'build.gradle'), 'utf8');
  const sourcePath = path.join(fixture, 'build.gradle');
  for (const task of ['jacocoOnlineCoverageVerification', 'jacocoMigrationCoverageVerification']) {
    const start = source.indexOf(`tasks.register('${task}'`);
    assert.ok(start > 0);
    const registry = clone(loadGovernanceRegistry(registryPath));
    const ratchet = registry.qualityRatchets.find(({ id }) => id === 'QUALITY-BACKEND-LINE-COVERAGE');
    assert.deepEqual(ratchet.selector.equivalentTasks,
      ['jacocoOnlineCoverageVerification', 'jacocoMigrationCoverageVerification']);
    ratchet.source = path.relative(repoRoot, sourcePath).replaceAll('\\', '/');
    writeFileSync(sourcePath, source.slice(0, start) + source.slice(start).replace('minimum = 0.85', 'minimum = 0.50'));
    assert.match(validateFresh(registry).join('\n'), /coverage scopes must share the same threshold/);
    writeFileSync(sourcePath, source.replace(`tasks.register('${task}'`, `tasks.register('missing${task}'`));
    assert.match(validateFresh(registry).join('\n'), /ghost quality selector.*Gradle task/);
  }
});
