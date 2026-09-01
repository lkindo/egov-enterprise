import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import {
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

function validate(registry) {
  return validateGovernanceRegistry({ registry, repoRoot });
}

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
    'node --test "scripts/*.test.mjs" ".agent/scripts/*.test.js"',
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
  assert.equal(byId.get('GATESET-CROSS-STACK-CONTRACTS').requiredCiContext, 'secret-scan');
  // [2026-08-31] 최대 카탈로그(FRONTEND-VITEST)에도 skip 금지를 동결한다 — 종전에는 이 카탈로그만
  //   it.skip/describe.only 가 자유였다(당시 위반 0건이라 무비용으로 켰다). Playwright .spec.ts 의
  //   플랫폼 waiver 는 suffix 가 달라(이 카탈로그는 .test.ts 만) 충돌하지 않는다.
  assert.equal(byId.get('GATESET-FRONTEND-VITEST').selector.forbidSkips, true);
  const playwright = byId.get('GATESET-PLAYWRIGHT-E2E');
  assert.equal(playwright.requiredCiContext, 'e2e-test');
  assert.equal(playwright.selector.forbidSkips, undefined);
  assert.deepEqual(playwright.selector.skipWaivers, [{
    id: 'PW-SKIP-LINUX-VISUAL-REGRESSION',
    source: 'frontend/e2e/04-quality-resilience.spec.ts',
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

test('Playwright config contract pins CI-only forbidOnly and the exact setup/full-suite topology', () => {
  const registry = loadGovernanceRegistry(registryPath);
  const playwright = registry.gateSets.find(({ id }) => id === 'GATESET-PLAYWRIGHT-E2E');
  const contract = playwright.selector.projectContract;
  assert.deepEqual(contract, {
    source: 'frontend/playwright.config.ts',
    forbidOnly: '!!process.env.CI',
    projects: [
      { name: 'setup', testMatch: '/.*\\.setup\\.ts/' },
      { name: 'full-suite', testMatch: '/.*\\.spec\\.ts/', dependencies: ['setup'] },
    ],
  });

  const source = readFileSync(path.join(repoRoot, contract.source), 'utf8');
  assert.deepEqual(validatePlaywrightProjectContract(source, contract), []);

  for (const weakened of [
    source.replace('testMatch: /.*\\.setup\\.ts/', 'testMatch: /global\\.setup\\.ts/'),
    source.replace('testMatch: /.*\\.spec\\.ts/', 'testMatch: /01-.*\\.spec\\.ts/'),
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

// [2026-09-01 신설 — GAP-HARNESS-002] 소비자 파일의 주석 문법을 파일 종류로 가른다.
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

// [2026-09-01 신설 — GAP-HARNESS-001] CI tier binding 은 "그 줄이 파일에 있다" 로 tier 를 주장할 수
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

  // ④ 워크플로가 아닌 소비자에 job/conditional 을 붙이면 red — 의미 없는 선언을 남기지 않는다.
  const misplaced = clone(registry);
  misplaced.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS')
    .selector.commandBindings.find((b) => b.source.includes('verify.mjs')).job = 'secret-scan';
  assert.match(misplaced && validate(misplaced).join('\n'), /workflow-only binding fields/);
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
  pit.selector.sourceJobId = 'ghost-mutation-source';

  assert.match(validate(registry).join('\n'), /ghost required-check aggregate selector.*mutation-test/i);
});

test('PIT registry and CI keep the same exact ten-scope matrix catalog', () => {
  const registry = loadGovernanceRegistry(registryPath);
  const pit = registry.gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE');
  const workflow = parseMutationScopeMatrix(
    readFileSync(path.join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8'),
  );

  assert.deepEqual(workflow.errors, []);
  assert.equal(pit.selector.matrixScopes.length, 10);
  assert.deepEqual(workflow.scopes, pit.selector.matrixScopes);
  assert.doesNotMatch(pit.selector.matrixScopes[0].classes, /service\.(?:image|calendar|log)\.\*/);
});

test('deleting a PIT scope is rejected in both the fixed catalog size and CI comparison', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const pit = registry.gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE');
  const [removed] = pit.selector.matrixScopes.splice(3, 1);
  const errors = validate(registry).join('\n');

  assert.match(errors, /PIT matrix catalog must contain exactly 10 scopes/i);
  assert.match(errors, new RegExp(`unregistered CI mutation matrix scope '${removed.scope}'`, 'i'));
});

test('duplicating a PIT scope is rejected instead of silently overwriting it', () => {
  const registry = clone(loadGovernanceRegistry(registryPath));
  const pit = registry.gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE');
  pit.selector.matrixScopes.push(clone(pit.selector.matrixScopes[0]));

  assert.match(validate(registry).join('\n'), /duplicate PIT matrix scope 'business-app'/i);
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
