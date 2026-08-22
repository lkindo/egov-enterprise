import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import * as baselineCore from '../frontend/scripts/ui-quality-baseline-core.mjs';

import {
  assertArtifactSafe,
  assertStableDirtyBuildInputFingerprint,
  assertStableBuildInputSnapshot,
  assertStableProtocolFileHash,
  assertStableBaselineExecutionContract,
  aggregateScenarioExecution,
  aggregateArtifactContentDigest,
  captureBaselineExecutionContract,
  captureCommittedWorktreeFileHash,
  createBaselineDockerInspectInvocation,
  createBaselineDockerImageInspectInvocation,
  createDirtyBuildInputFingerprint,
  createProductionBuildInputTreeHash,
  captureProtocolFileHash,
  createAutomatedRunProjection,
  createAutomatedRunSeal,
  createBaselineExecutionId,
  buildExecutionPlan,
  classifyAutomatedCaseOutcome,
  classifyClientErrorResponse,
  classifyEvidenceDurability,
  classifyPerformanceObservation,
  classifySyntheticRichTextReadback,
  classifySyntheticMutationFailureReason,
  createExecutedSyntheticMutationEvidence,
  createNotExecutedTaskEvidence,
  createSafeRequestCategoryCounts,
  observeLcpWithinBoundedFrames,
  observeStableResponsiveGeometry,
  observeStableVisualReadiness,
  packageManagerVersionCommand,
  performanceFailureRecord,
  pollForExpectedValue,
  prepareFirstUseOnboardingPreference,
  REQUIRED_PRODUCTION_BUILD_INPUT_FILES,
  requireDirtyBuildInputFingerprint,
  runSyntheticMutationLifecycle,
  SAFE_REQUEST_CATEGORIES,
  finalizeStagedRunPublication,
  sanitizeLcpObservation,
  selectSyntheticMutationDiagnosticCases,
  selectProductionBuildInputPaths,
  summarizeAuthoritativeTaskEvidence,
  summarizeAutomatedOutcome,
  summarizeRunStatus,
  sha256,
  stableJson,
  validateBaselineBuildAttestation,
  validateBaselineDockerStack,
  validateInvalidCredentialsProbeFixture,
} from '../frontend/scripts/ui-quality-baseline-core.mjs';

import {
  readBaselineBuildAttestationFile,
  validateExecutionPreflight as validateRunnerExecutionPreflight,
} from '../frontend/scripts/ui-quality-baseline-runner.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(repoRoot, 'config', 'ui-quality-scenarios.json'), 'utf8'));
const frontendPackage = JSON.parse(readFileSync(join(repoRoot, 'frontend', 'package.json'), 'utf8'));
const runnerPath = join(repoRoot, 'frontend', 'scripts', 'ui-quality-baseline-runner.mjs');
const runnerSource = readFileSync(runnerPath, 'utf8');
const statusDisplaysSource = readFileSync(
  join(repoRoot, 'frontend', 'src', 'app', 'components', 'ui', 'status-displays.tsx'),
  'utf8',
);
const baselineProtocolSource = readFileSync(
  join(repoRoot, 'docs', '04-operations', 'ui-ux-baseline-protocol.md'),
  'utf8',
);
const gitAttributesSource = readFileSync(join(repoRoot, '.gitattributes'), 'utf8');
const BASELINE_CONTRACT_COMMAND = 'node --test ../scripts/ui-quality-scenarios-contract.test.mjs ../scripts/ui-quality-baseline-runner-contract.test.mjs';
const BASELINE_EXECUTION_COMMAND = 'node scripts/ui-quality-baseline-runner.mjs --execute --include-performance';
const REQUIRED_BASELINE_SCRIPT = `${BASELINE_CONTRACT_COMMAND} && ${BASELINE_EXECUTION_COMMAND}`;
const EXACT_BOUND_LF_PATHS = Object.freeze([
  'docs/04-operations/ui-ux-baseline-protocol.md',
  'frontend/scripts/ui-quality-baseline-core.mjs',
  'frontend/scripts/ui-quality-baseline-runner.mjs',
  'scripts/ui-quality-baseline-runner-contract.test.mjs',
  'scripts/ui-quality-scenarios-contract.test.mjs',
]);
const FRONTEND_CONTAINER_ID = '1'.repeat(64);
const BACKEND_CONTAINER_ID = '2'.repeat(64);
const FRONTEND_IMAGE_ID = `sha256:${'a'.repeat(64)}`;
const BACKEND_IMAGE_ID = `sha256:${'b'.repeat(64)}`;
const BASELINE_BUILD_SHA = 'c'.repeat(40);
const BASELINE_BUILD_INPUT_TREE_HASH = 'd'.repeat(64);
const BASELINE_COMMIT_TREE_ID = 'e'.repeat(40);
const BASELINE_DOCKER_PROJECT = 'egov-uiux-baseline-r13-fixture';
const BASELINE_DOCKER_NETWORK = 'egov-uiux-baseline-r13-fixture_default';
const FRONTEND_CONTAINER_NAME = 'egov-uiux-baseline-r13-fixture-frontend-1';
const BACKEND_CONTAINER_NAME = 'egov-uiux-baseline-r13-fixture-api-1';

function baselineBuildAttestationFixture(payloadOverrides = {}, envelopeOverrides = {}) {
  const payload = {
    schemaVersion: 1,
    kind: 'ui-quality-baseline-build-attestation',
    baselineRunId: 'r13',
    buildSha: BASELINE_BUILD_SHA,
    buildInputTreeHash: BASELINE_BUILD_INPUT_TREE_HASH,
    commitTreeId: BASELINE_COMMIT_TREE_ID,
    images: {
      api: { id: BACKEND_IMAGE_ID },
      frontend: { id: FRONTEND_IMAGE_ID },
    },
    ...payloadOverrides,
  };
  const envelope = {
    payload,
    payloadSha256: sha256(Buffer.from(`${stableJson(payload)}\n`, 'utf8')),
    ...envelopeOverrides,
  };
  const rawBytes = Buffer.from(`${stableJson(envelope)}\n`, 'utf8');
  return {
    envelope,
    rawBytes,
    rawSha256: sha256(rawBytes),
  };
}

function dockerContainerInspectProjection({
  id,
  name,
  image,
  privatePort,
  hostIp = '127.0.0.1',
  hostPort,
  running = true,
  status = 'running',
  healthStatus = 'healthy',
  restartCount = 0,
  portBindings,
  extraPorts = {},
  composeProject = BASELINE_DOCKER_PROJECT,
  composeService,
  networkPresent = true,
  extraLabels = {},
  extra = {},
}) {
  return Buffer.from(`${JSON.stringify({
    Id: id,
    Name: name,
    Image: image,
    State: {
      Running: running,
      Status: status,
      Health: { Status: healthStatus },
    },
    RestartCount: restartCount,
    Ports: {
      [privatePort]: portBindings ?? [{ HostIp: hostIp, HostPort: hostPort }],
      ...extraPorts,
    },
    Labels: {
      ComposeProject: composeProject,
      ComposeService: composeService,
      ...extraLabels,
    },
    NetworkPresent: networkPresent,
    ...extra,
  })}\n`, 'utf8');
}

function dockerImageInspectProjection({
  id,
  buildSha = BASELINE_BUILD_SHA,
  buildInputTreeHash = BASELINE_BUILD_INPUT_TREE_HASH,
  extraLabels = {},
  extra = {},
}) {
  return Buffer.from(`${JSON.stringify({
    Id: id,
    Labels: {
      BuildSha: buildSha,
      BuildInputTreeHash: buildInputTreeHash,
      ...extraLabels,
    },
    ...extra,
  })}\n`, 'utf8');
}

function baselineDockerStackFixture(overrides = {}) {
  const containerProjections = {
    frontend: dockerContainerInspectProjection({
      id: FRONTEND_CONTAINER_ID,
      name: `/${FRONTEND_CONTAINER_NAME}`,
      image: FRONTEND_IMAGE_ID,
      privatePort: '3000/tcp',
      hostPort: '3013',
      composeService: 'frontend',
      ...overrides.frontend,
    }),
    backend: dockerContainerInspectProjection({
      id: BACKEND_CONTAINER_ID,
      name: `/${BACKEND_CONTAINER_NAME}`,
      image: BACKEND_IMAGE_ID,
      privatePort: '8080/tcp',
      hostPort: '18091',
      composeService: 'api',
      ...overrides.backend,
    }),
  };
  const imageProjections = {
    frontend: dockerImageInspectProjection({
      id: FRONTEND_IMAGE_ID,
      ...overrides.frontendImage,
    }),
    backend: dockerImageInspectProjection({
      id: BACKEND_IMAGE_ID,
      ...overrides.backendImage,
    }),
  };
  const containerCalls = [];
  const imageCalls = [];
  return {
    input: {
      frontendContainerId: FRONTEND_CONTAINER_ID,
      backendContainerId: BACKEND_CONTAINER_ID,
      frontendBuildId: FRONTEND_IMAGE_ID,
      backendBuildId: BACKEND_IMAGE_ID,
      frontendOrigin: 'http://127.0.0.1:3013',
      apiOrigin: 'http://127.0.0.1:18091',
      dockerProject: BASELINE_DOCKER_PROJECT,
      dockerNetwork: BASELINE_DOCKER_NETWORK,
      frontendContainerName: FRONTEND_CONTAINER_NAME,
      backendContainerName: BACKEND_CONTAINER_NAME,
      buildSha: BASELINE_BUILD_SHA,
      buildInputTreeHash: BASELINE_BUILD_INPUT_TREE_HASH,
      inspectContainer: (request) => {
        containerCalls.push(request);
        return containerProjections[request.role];
      },
      inspectImage: (request) => {
        imageCalls.push(request);
        return imageProjections[request.role];
      },
      ...overrides.input,
    },
    containerCalls,
    imageCalls,
  };
}

function baselineExecutionEnvironment(overrides = {}) {
  const attestation = baselineBuildAttestationFixture();
  return {
    UI_BASELINE_STACK_CLASSIFICATION: 'isolated-synthetic',
    UI_BASELINE_FRONTEND_BUILD_ID: FRONTEND_IMAGE_ID,
    UI_BASELINE_BACKEND_BUILD_ID: BACKEND_IMAGE_ID,
    UI_BASELINE_FRONTEND_CONTAINER_ID: FRONTEND_CONTAINER_ID,
    UI_BASELINE_BACKEND_CONTAINER_ID: BACKEND_CONTAINER_ID,
    UI_BASELINE_FRONTEND_CONTAINER_NAME: FRONTEND_CONTAINER_NAME,
    UI_BASELINE_BACKEND_CONTAINER_NAME: BACKEND_CONTAINER_NAME,
    UI_BASELINE_DOCKER_PROJECT: BASELINE_DOCKER_PROJECT,
    UI_BASELINE_DOCKER_NETWORK: BASELINE_DOCKER_NETWORK,
    UI_BASELINE_BUILD_ATTESTATION_PATH: resolve(tmpdir(), 'ui-quality-build-attestation.json'),
    UI_BASELINE_BUILD_ATTESTATION_SHA256: attestation.rawSha256,
    UI_BASELINE_API_URL: 'http://127.0.0.1:18091',
    UI_BASELINE_SYNTHETIC_SEED_LABEL: 'isolated-fixture-v1',
    UI_BASELINE_ADMIN_ID: 'private-admin-id',
    UI_BASELINE_ADMIN_SECRET: 'private-admin-secret',
    ...overrides,
  };
}

function assertExactBoundLfAttributes(source) {
  const exactRules = new Map(source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.split(/\s+/))
    .filter(([pattern]) => EXACT_BOUND_LF_PATHS.includes(pattern))
    .map(([pattern, ...attributes]) => [pattern, attributes]));

  for (const relativePath of EXACT_BOUND_LF_PATHS) {
    const attributes = exactRules.get(relativePath);
    assert.ok(attributes, `missing exact .gitattributes rule for ${relativePath}`);
    assert.ok(attributes.includes('text'), `${relativePath} must be text`);
    assert.ok(attributes.includes('eol=lf'), `${relativePath} must force LF`);
  }

  const fixtureRoot = mkdtempSync(join(tmpdir(), 'uiq-gitattributes-'));
  const initialized = spawnSync('git', ['init', '--quiet'], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });
  assert.equal(initialized.status, 0, initialized.stderr);
  writeFileSync(join(fixtureRoot, '.gitattributes'), source, 'utf8');
  for (const relativePath of EXACT_BOUND_LF_PATHS) {
    const checked = spawnSync(
      'git',
      ['check-attr', 'text', 'eol', '--', relativePath],
      { cwd: fixtureRoot, encoding: 'utf8' },
    );
    assert.equal(checked.status, 0, checked.stderr);
    const effectiveAttributes = new Map(checked.stdout
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split(': '))
      .map(([reportedPath, attribute, value]) => {
        assert.equal(reportedPath, relativePath);
        return [attribute, value];
      }));
    assert.equal(effectiveAttributes.get('text'), 'set', `${relativePath} must resolve text=set`);
    assert.equal(effectiveAttributes.get('eol'), 'lf', `${relativePath} must resolve eol=lf`);
  }
}

function createPublicationFixture(label) {
  const root = mkdtempSync(join(tmpdir(), `uiq-${label}-`));
  const canonicalRoot = join(root, 'ui-quality-baseline');
  const stagingRoot = join(root, '.staging-attempt');
  const historyRoot = join(root, 'ui-quality-baseline-history', 'pre-attempt-current');
  const diagnosticRoot = join(root, 'ui-quality-baseline-diagnostics', 'attempt');
  mkdirSync(canonicalRoot, { recursive: true });
  mkdirSync(stagingRoot, { recursive: true });
  writeFileSync(join(canonicalRoot, 'historical-marker.json'), '{"run":"r12"}\n', 'utf8');
  writeFileSync(join(stagingRoot, 'staged-marker.json'), '{"run":"r13"}\n', 'utf8');
  return {
    boundaryRoot: root,
    root,
    canonicalRoot,
    stagingRoot,
    historyRoot,
    diagnosticRoot,
  };
}

function createDirectoryLink(target, linkPath) {
  symlinkSync(target, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
}

function assertArtifactBoundaryFailure(action) {
  assert.throws(action, (error) => {
    assert.equal(error?.message, 'baseline artifact directory boundary verification failed');
    return true;
  });
}

function assertRuntimeScenarioAggregateBinding(source) {
  const executableSource = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.equal(
    executableSource.match(/\baggregateScenarioExecution\s*\(\s*\{/g)?.length ?? 0,
    1,
    'runner must have one executable scenario aggregate call',
  );
  assert.match(
    executableSource,
    /const scenarioAggregate = aggregateScenarioExecution\(\{\s*scenarioId: scenario\.id,\s*plannedStateCases: plan\.stateCases,\s*stateResults,\s*plannedPerformanceCases: plan\.performanceCases,\s*performanceResults,\s*manualChecksComplete: manual\.every\(\(\{ status: manualStatus \}\) => manualStatus === 'pass'\),\s*evidenceDurable: durability\.eligibleForMeasuredPromotion,\s*\}\);/,
  );
  assert.doesNotMatch(executableSource, /\bsummarizeAuthoritativeTaskEvidence\b|\bsummarizeRunStatus\b/);
  assert.match(executableSource, /plannedCaseCount:\s*plannedStateCaseCount/);
  assert.doesNotMatch(executableSource, /plannedCaseCount:\s*(?:cases|stateResults)\.length/);
}

test('runner binds all eight scenarios, six render combinations and every declared state', () => {
  const plan = buildExecutionPlan(manifest);

  assert.equal(plan.scenarioCount, 8);
  assert.equal(plan.renderCases.length, 48);
  assert.equal(plan.stateCases.length, 96);
  assert.equal(plan.performanceCases.length, 48);
  assert.deepEqual(
    [...new Set(plan.renderCases.map(({ scenarioId }) => scenarioId))].sort(),
    manifest.scenarios.map(({ id }) => id).sort(),
  );

  for (const scenario of manifest.scenarios) {
    assert.equal(
      plan.renderCases.filter(({ scenarioId }) => scenarioId === scenario.id).length,
      6,
      `${scenario.id} must bind current-default x light/dark x three viewports`,
    );
    assert.equal(
      plan.stateCases.filter(({ scenarioId }) => scenarioId === scenario.id).length,
      scenario.journeySteps.length * 6,
      `${scenario.id} must execute every journey state in every render combination`,
    );
  }

  assert.equal(new Set(plan.stateCases.map(({ caseId }) => caseId)).size, plan.stateCases.length);
  assert.equal(
    plan.stateCases.filter(({ scenarioId, stepId }) => (
      scenarioId === 'first-use-onboarding' && stepId === 'onboarding-first-use'
    )).length,
    6,
  );
  assert.ok(plan.stateCases.every(({ identity }) => (
    Object.keys(identity).sort().join(',')
      === ['brandTheme', 'colorMode', 'role', 'route', 'state', 'viewport'].sort().join(',')
  )));
  const declaredMutationRequirements = manifest.scenarios.flatMap((scenario) => (
    scenario.journeySteps.flatMap((step) => (
      step.requiredTaskEvidenceId == null
        ? []
        : [`${scenario.id}/${step.id}/${step.requiredTaskEvidenceId}`]
    ))
  ));
  const plannedMutationRequirements = [...new Set(plan.stateCases.flatMap((stateCase) => (
    stateCase.requiredTaskEvidenceId == null
      ? []
      : [`${stateCase.scenarioId}/${stateCase.stepId}/${stateCase.requiredTaskEvidenceId}`]
  )))];
  assert.deepEqual(plannedMutationRequirements.sort(), declaredMutationRequirements.sort());
});

test('runner rejects widened or incomplete render populations instead of producing partial green', () => {
  const incomplete = structuredClone(manifest);
  incomplete.scenarios[0].renderMatrix.viewports.pop();
  assert.throws(() => buildExecutionPlan(incomplete), /render matrix.*exact/i);

  const duplicateState = structuredClone(manifest);
  duplicateState.scenarios[0].journeySteps.push(structuredClone(duplicateState.scenarios[0].journeySteps[0]));
  assert.throws(() => buildExecutionPlan(duplicateState), /duplicate.*step/i);

  const missingState = structuredClone(manifest);
  missingState.scenarios[0].journeySteps.pop();
  assert.throws(() => buildExecutionPlan(missingState), /journey population.*exact/i);

  const addedState = structuredClone(manifest);
  addedState.scenarios[0].journeySteps.push({
    ...structuredClone(addedState.scenarios[0].journeySteps[0]),
    id: 'unreviewed-extra-state',
  });
  assert.throws(() => buildExecutionPlan(addedState), /journey population.*exact/i);

  const mutationScenario = (fixture, scenarioId) => (
    fixture.scenarios.find(({ id }) => id === scenarioId)
  );
  const unknownMutationRequirement = structuredClone(manifest);
  mutationScenario(unknownMutationRequirement, 'user-management-hub')
    .journeySteps[0].requiredTaskEvidenceId = 'unreviewed-mutation-evidence';
  assert.throws(
    () => buildExecutionPlan(unknownMutationRequirement),
    /unsupported mutation task evidence requirement/i,
  );

  const duplicateMutationRequirement = structuredClone(manifest);
  const duplicateMutationSteps = mutationScenario(
    duplicateMutationRequirement,
    'user-management-hub',
  ).journeySteps;
  duplicateMutationSteps[1].requiredTaskEvidenceId = duplicateMutationSteps[0].requiredTaskEvidenceId;
  assert.throws(
    () => buildExecutionPlan(duplicateMutationRequirement),
    /duplicates a mutation task evidence requirement/i,
  );

  const missingMutationRequirement = structuredClone(manifest);
  delete mutationScenario(missingMutationRequirement, 'board-maker-wizard')
    .journeySteps[0].requiredTaskEvidenceId;
  assert.throws(
    () => buildExecutionPlan(missingMutationRequirement),
    /mutation task evidence population must exactly match/i,
  );

  for (const operation of ['pop', 'push']) {
    const viewportDrift = structuredClone(manifest);
    if (operation === 'pop') {
      viewportDrift.dimensions.viewports.pop();
      for (const scenario of viewportDrift.scenarios) scenario.renderMatrix.viewports.pop();
    } else {
      viewportDrift.dimensions.viewports.push({ id: 'unreviewed-1440', width: 1440, height: 900 });
      for (const scenario of viewportDrift.scenarios) scenario.renderMatrix.viewports.push('unreviewed-1440');
    }
    assert.throws(() => buildExecutionPlan(viewportDrift), /viewport population.*exact/i);

    const themeDrift = structuredClone(manifest);
    if (operation === 'pop') {
      themeDrift.dimensions.brandThemes.pop();
      for (const scenario of themeDrift.scenarios) scenario.renderMatrix.brandThemes.pop();
    } else {
      themeDrift.dimensions.brandThemes.push({ id: 'unreviewed-theme' });
      for (const scenario of themeDrift.scenarios) scenario.renderMatrix.brandThemes.push('unreviewed-theme');
    }
    assert.throws(() => buildExecutionPlan(themeDrift), /brand theme population.*exact/i);
  }
});

test('redaction guard rejects forbidden keys and credential-like values', () => {
  const forbidden = manifest.privacy.forbiddenArtifactKeys;
  assert.throws(
    () => assertArtifactSafe({ scenarioId: 'auth-login', password: 'decoy' }, forbidden),
    /forbidden artifact key/i,
  );
  assert.throws(
    () => assertArtifactSafe({ scenarioId: 'auth-login', diagnostic: 'Bearer decoy-secret-value' }, forbidden),
    /credential-like artifact value/i,
  );
  assert.throws(
    () => assertArtifactSafe({ scenarioId: 'auth-login', diagnostic: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZWNveSJ9.signature' }, forbidden),
    /credential-like artifact value/i,
  );

  assert.doesNotThrow(() => assertArtifactSafe({
    scenarioId: 'auth-login',
    status: 'partial-automated-evidence',
    baseOrigin: 'http://127.0.0.1:3003',
    axe: [{ ruleId: 'color-contrast', nodeCount: 2, locator: 'redacted-node-1' }],
  }, forbidden));
});

test('LCP metadata stores only closed roles and bounded redacted resource categories', () => {
  const baseOrigin = 'http://127.0.0.1:3003';
  const sameOrigin = sanitizeLcpObservation({
    tag: 'IMG',
    role: 'img',
    resourceUrl: `${baseOrigin}/${['private', 'records', '42', 'confidential.pdf'].join('/')}?signature=decoy`,
    size: 2048.4,
  }, baseOrigin);

  assert.deepEqual(sameOrigin, {
    tag: 'img',
    role: 'img',
    resourceOrigin: 'same-origin',
    resourceCategory: 'application-resource',
    resourceRouteTemplate: '/:resource',
    size: 2048,
  });
  assert.doesNotMatch(JSON.stringify(sameOrigin), /private|records|confidential|signature|42/i);

  const crossOrigin = sanitizeLcpObservation({
    tag: 'custom-account-card',
    role: 'record-owner',
    resourceUrl: `https://${['external', 'example'].join('.')}/${['accounts', '42', 'avatar.png'].join('/')}`,
    size: 128,
  }, baseOrigin);
  assert.deepEqual(crossOrigin, {
    tag: 'unknown',
    role: null,
    resourceOrigin: 'cross-origin',
    resourceCategory: 'external-resource',
    resourceRouteTemplate: null,
    size: 128,
  });
  assert.doesNotMatch(JSON.stringify(crossOrigin), /example|accounts|avatar|42/i);

  assert.doesNotThrow(() => assertArtifactSafe(
    { lcp: sameOrigin },
    manifest.privacy.forbiddenArtifactKeys,
  ));
  assert.throws(
    () => assertArtifactSafe({
      lcp: { ...sameOrigin, resourcePath: '/redacted-test-only' },
    }, manifest.privacy.forbiddenArtifactKeys),
    /unsafe LCP artifact field/i,
  );
  assert.throws(
    () => assertArtifactSafe({
      lcp: { ...sameOrigin, role: 'record-owner' },
    }, manifest.privacy.forbiddenArtifactKeys),
    /unsafe LCP artifact role/i,
  );
  assert.throws(
    () => assertArtifactSafe({
      lcp: sameOrigin,
      lcpResourceUrl: 'redacted-test-only',
    }, manifest.privacy.forbiddenArtifactKeys),
    /unsafe LCP artifact field/i,
  );
  assert.match(runnerSource, /lcp:\s*sanitizeLcpObservation\(rawLcp,\s*baseOrigin\)/);
});

test('ignored evidence remains ephemeral and cannot be summarized as measured', () => {
  assert.deepEqual(
    classifyEvidenceDurability({ ignored: true, repositoryTracked: false }),
    {
      status: 'ephemeral-ignored',
      eligibleForMeasuredPromotion: false,
      reasonCode: 'ignored-artifact-not-durable',
    },
  );
  assert.equal(
    summarizeRunStatus({
      plannedCases: 96,
      completedCases: 96,
      invalidCases: 0,
      plannedPerformanceCases: 48,
      completedPerformanceCases: 48,
      invalidPerformanceCases: 0,
      functionalTasksComplete: false,
      manualChecksComplete: false,
      evidenceDurable: false,
    }),
    'partial-automated-evidence',
  );
});

test('measured status requires complete functional, automated, manual and durable evidence', () => {
  const base = {
    plannedCases: 96,
    completedCases: 96,
    invalidCases: 0,
    plannedPerformanceCases: 48,
    completedPerformanceCases: 48,
    invalidPerformanceCases: 0,
    functionalTasksComplete: true,
    manualChecksComplete: true,
    evidenceDurable: true,
  };
  assert.equal(summarizeRunStatus(base), 'measured');

  for (const key of ['functionalTasksComplete', 'manualChecksComplete', 'evidenceDurable']) {
    assert.notEqual(summarizeRunStatus({ ...base, [key]: false }), 'measured');
  }
  assert.notEqual(summarizeRunStatus({ ...base, completedCases: 95 }), 'measured');
  assert.notEqual(summarizeRunStatus({ ...base, invalidCases: 1 }), 'measured');
  assert.notEqual(summarizeRunStatus({ ...base, completedPerformanceCases: 47 }), 'measured');
  assert.notEqual(summarizeRunStatus({ ...base, invalidPerformanceCases: 1 }), 'measured');
  assert.notEqual(summarizeRunStatus({ ...base, plannedPerformanceCases: 0 }), 'measured');
});

test('automated observation never aliases findings or incomplete evidence to a pass', () => {
  assert.deepEqual(
    classifyAutomatedCaseOutcome({
      blockedPrerequisite: false,
      runtimeInvalid: false,
      failedAssertionCount: 0,
      expectedRouteReached: true,
      axeViolationCount: 0,
      horizontalOverflowPx: 0,
      colorModeApplied: true,
    }),
    {
      status: 'automated-state-observed',
      outcome: 'no-automated-finding-observed',
      findingCodes: [],
    },
  );

  const findings = classifyAutomatedCaseOutcome({
    blockedPrerequisite: false,
    runtimeInvalid: false,
    failedAssertionCount: 2,
    expectedRouteReached: false,
    axeViolationCount: 1,
    horizontalOverflowPx: 12,
    colorModeApplied: false,
  });
  assert.equal(findings.status, 'automated-state-observed');
  assert.equal(findings.outcome, 'automated-findings-observed');
  assert.deepEqual(findings.findingCodes, [
    'automated-axe-violation',
    'automated-state-contract-failed',
    'color-mode-not-applied',
    'page-horizontal-overflow',
    'unexpected-final-route',
  ]);
  assert.notEqual(findings.outcome, 'pass');

  assert.deepEqual(
    classifyAutomatedCaseOutcome({ blockedPrerequisite: true }),
    {
      status: 'blocked-prerequisite',
      outcome: 'automated-observation-incomplete',
      findingCodes: ['blocked-prerequisite'],
    },
  );
  assert.deepEqual(
    classifyAutomatedCaseOutcome({ runtimeInvalid: true }),
    {
      status: 'invalid-run',
      outcome: 'automated-observation-invalid',
      findingCodes: ['unexpected-runtime-signal'],
    },
  );
  assert.deepEqual(
    classifyAutomatedCaseOutcome({ notExecutedTaskCount: 1 }),
    {
      status: 'blocked-prerequisite',
      outcome: 'automated-observation-incomplete',
      findingCodes: ['blocked-prerequisite'],
    },
  );
  assert.deepEqual(
    classifyAutomatedCaseOutcome({ runtimeInvalid: true, notExecutedTaskCount: 1 }),
    {
      status: 'invalid-run',
      outcome: 'automated-observation-invalid',
      findingCodes: ['unexpected-runtime-signal'],
    },
    'unexpected runtime signals must fail closed even when a task prerequisite is blocked',
  );
});

test('client error categorization permits only exact step-scoped auth 401 responses', () => {
  const bootstrap = {
    scenarioId: 'auth-login',
    method: 'GET',
    pathname: '/api/v1/auth/me',
    status: 401,
  };
  assert.equal(
    classifyClientErrorResponse({ ...bootstrap, stepId: 'successful-login' }),
    SAFE_REQUEST_CATEGORIES.AUTH_ME_BOOTSTRAP_401,
  );
  assert.equal(
    classifyClientErrorResponse({ ...bootstrap, stepId: 'invalid-credentials' }),
    SAFE_REQUEST_CATEGORIES.AUTH_ME_BOOTSTRAP_401,
  );
  assert.equal(
    classifyClientErrorResponse({
      scenarioId: 'auth-login',
      stepId: 'invalid-credentials',
      method: 'POST',
      pathname: '/api/auth/login',
      status: 401,
    }),
    SAFE_REQUEST_CATEGORIES.INVALID_CREDENTIALS_401,
  );

  const unexpectedCases = [
    { ...bootstrap, stepId: 'successful-login', method: 'POST' },
    { ...bootstrap, stepId: 'successful-login', pathname: '/api/v1/auth/me/' },
    { ...bootstrap, stepId: 'successful-login', status: 403 },
    { ...bootstrap, scenarioId: 'admin-shell-hub', stepId: 'hub-ready' },
    {
      scenarioId: 'auth-login',
      stepId: 'successful-login',
      method: 'POST',
      pathname: '/api/auth/login',
      status: 401,
    },
  ];
  for (const response of unexpectedCases) {
    assert.equal(
      classifyClientErrorResponse(response),
      SAFE_REQUEST_CATEGORIES.UNEXPECTED_HTTP_4XX,
    );
  }
  assert.equal(classifyClientErrorResponse({ ...bootstrap, status: 200 }), null);

  const categoryCounts = createSafeRequestCategoryCounts();
  categoryCounts[SAFE_REQUEST_CATEGORIES.AUTH_ME_BOOTSTRAP_401] += 1;
  assert.deepEqual(categoryCounts, {
    'auth-me-bootstrap-401': 1,
    'invalid-credentials-401': 0,
    'unexpected-http-4xx': 0,
  });
  assert.doesNotThrow(() => assertArtifactSafe(
    { responseCategoryCounts: categoryCounts },
    manifest.privacy.forbiddenArtifactKeys,
  ));
  assert.doesNotMatch(JSON.stringify(categoryCounts), /(?:https?:|\/api\/|\?|#)/i);
});

test('invalid-credentials fixture reaches authentication semantics without widening expected 4xx', () => {
  const fixture = validateInvalidCredentialsProbeFixture({
    actorValue: 'InvalidProbe9',
    secretValue: 'Invalid9!Probe',
  });
  assert.equal(fixture.actorValue.length <= 20, true);
  assert.deepEqual(fixture, {
    actorValue: 'InvalidProbe9',
    secretValue: 'Invalid9!Probe',
  });
  assert.throws(
    () => validateInvalidCredentialsProbeFixture({
      actorValue: 'A'.repeat(21),
      secretValue: 'Invalid9!Probe',
    }),
    /login request contract/i,
  );
  assert.throws(
    () => validateInvalidCredentialsProbeFixture({
      actorValue: 'invalid-probe',
      secretValue: 'Invalid9!Probe',
    }),
    /login request contract/i,
  );
  assert.throws(
    () => validateInvalidCredentialsProbeFixture({
      actorValue: 'InvalidProbe9',
      secretValue: 'not-valid',
    }),
    /login request contract/i,
  );

  assert.equal(
    classifyClientErrorResponse({
      scenarioId: 'auth-login',
      stepId: 'invalid-credentials',
      method: 'POST',
      pathname: '/api/auth/login',
      status: 400,
    }),
    SAFE_REQUEST_CATEGORIES.UNEXPECTED_HTTP_4XX,
    'request-validation failures must remain unexpected instead of broadening the 401 allowlist',
  );
  assert.match(runnerSource, /validateInvalidCredentialsProbeFixture/);
  assert.doesNotMatch(runnerSource, /UI_BASELINE_INVALID_ACTOR|UI_BASELINE_INVALID_SECRET/);
});

test('first-use preference preparation establishes same-origin storage before clearing one bounded key', async () => {
  const events = [];
  await prepareFirstUseOnboardingPreference({
    establishSameOriginStorage: async () => { events.push('origin-established'); },
    clearSeenPreference: async () => { events.push('preference-cleared'); },
  });
  assert.deepEqual(events, ['origin-established', 'preference-cleared']);

  let clearedAfterFailure = false;
  await assert.rejects(
    prepareFirstUseOnboardingPreference({
      establishSameOriginStorage: async () => { throw new Error('bounded setup failure'); },
      clearSeenPreference: async () => { clearedAfterFailure = true; },
    }),
    /bounded setup failure/i,
  );
  assert.equal(clearedAfterFailure, false, 'preference mutation must not run without an established origin');

  assert.match(runnerSource, /__uiq_first_use_preparation__/);
  assert.match(runnerSource, /prepareFirstUseOnboardingPreference/);
  assert.match(runnerSource, /route\.fulfill\(\{[\s\S]*status:\s*200[\s\S]*contentType:\s*'text\/html'/);
  assert.doesNotMatch(runnerSource, /read(?:FileSync|Json)\((?:adminStatePath|userStatePath)/);
  assert.match(baselineProtocolSource, /same-origin[^\n]*preference/i);
  assert.match(baselineProtocolSource, /request validation[^\n]*400[^\n]*unexpected-http-4xx/i);
});

test('not-executed task evidence uses closed assertion/reason pairs and blocks completion', () => {
  const closedPairs = [
    ['successful-login-executed', 'ephemeral-login-credentials-required'],
    ['role-status-mutation-readback-executed', 'approved-synthetic-user-mutation-target-required'],
    ['synthetic-role-status-rollback-complete', 'approved-synthetic-user-mutation-target-required'],
    ['cross-role-created-answer-readback', 'approved-synthetic-faq-mutation-target-required'],
    ['faq-authoritative-save-readback', 'approved-synthetic-faq-mutation-target-required'],
    ['admin-created-faq-readback', 'approved-synthetic-faq-mutation-target-required'],
    ['single-deploy-authoritative-readback', 'approved-synthetic-board-deploy-target-required'],
  ];
  for (const [id, reasonCode] of closedPairs) {
    assert.deepEqual(
      createNotExecutedTaskEvidence({ id, reasonCode }),
      { id, status: 'not-executed', reasonCode },
    );
    if (id === 'successful-login-executed') {
      assert.match(runnerSource, new RegExp(`id: '${id}'`));
      assert.match(runnerSource, new RegExp(`reasonCode: '${reasonCode}'`));
    } else {
      assert.match(
        runnerSource,
        new RegExp(`completedSyntheticMutationEvidence\\(\\s*'${id}',\\s*stateCase`),
      );
      assert.doesNotMatch(runnerSource, new RegExp(`reasonCode: '${reasonCode}'`));
    }
  }
  assert.throws(
    () => createNotExecutedTaskEvidence({
      id: 'role-status-mutation-readback-executed',
      reasonCode: 'free-form-explanation-with-private-details',
    }),
    /unsupported not-executed task evidence/i,
  );
  for (const prototypeKey of ['toString', '__proto__']) {
    assert.throws(
      () => createNotExecutedTaskEvidence({ id: prototypeKey, reasonCode: undefined }),
      /unsupported not-executed task evidence/i,
    );
  }
  assert.throws(
    () => createNotExecutedTaskEvidence({
      id: 'unknown-task',
      reasonCode: 'approved-synthetic-user-mutation-target-required',
    }),
    /unsupported not-executed task evidence/i,
  );
});

test('synthetic mutation evidence is closed, redacted and complete only after rollback with zero active residue', async () => {
  const mutationTaskIds = [
    'role-status-mutation-readback-executed',
    'synthetic-role-status-rollback-complete',
    'cross-role-created-answer-readback',
    'faq-authoritative-save-readback',
    'admin-created-faq-readback',
    'single-deploy-authoritative-readback',
  ];
  const fixtureCaseId = 'uiq-0123456789abcdef0123';
  const completeEvidence = (id, caseId = fixtureCaseId) => createExecutedSyntheticMutationEvidence({
    id,
    caseId,
    syntheticNamespace: 'uiq-baseline-mutation-v1',
    mutationObserved: 'observed',
    authoritativeReadback: 'observed',
    rollbackReadback: 'observed',
    cleanupReadback: 'zero-active-residue',
    activeResidueCount: 0,
  });

  for (const id of mutationTaskIds) {
    assert.deepEqual(completeEvidence(id), {
      id,
      caseId: fixtureCaseId,
      status: 'executed',
      syntheticNamespace: 'uiq-baseline-mutation-v1',
      mutationObserved: 'observed',
      authoritativeReadback: 'observed',
      rollbackReadback: 'observed',
      cleanupReadback: 'zero-active-residue',
      activeResidueCount: 0,
    });
  }
  assert.throws(
    () => createExecutedSyntheticMutationEvidence({
      id: mutationTaskIds[0],
      syntheticNamespace: 'uiq-baseline-mutation-v1',
      mutationObserved: 'observed',
      authoritativeReadback: 'observed',
      rollbackReadback: 'observed',
      cleanupReadback: 'zero-active-residue',
      activeResidueCount: 0,
    }),
    /unsupported synthetic mutation evidence/i,
    'executed evidence without its planned privacy-safe case ID must fail closed',
  );
  for (const unsafeCaseId of ['synthetic-user-1', 'uiq-0123456789ABCDEF0123', 'uiq-0123']) {
    assert.throws(
      () => completeEvidence(mutationTaskIds[0], unsafeCaseId),
      /unsupported synthetic mutation evidence/i,
      unsafeCaseId,
    );
  }
  assert.match(
    runnerSource,
    /function completedSyntheticMutationEvidence\(id, stateCase\)[\s\S]*requiredTaskEvidenceId !== id[\s\S]*caseId: stateCase\.caseId/,
  );
  assert.throws(
    () => createExecutedSyntheticMutationEvidence({
      ...completeEvidence(mutationTaskIds[0]),
      rawUrl: 'https://unsafe.invalid/private?token=decoy',
    }),
    /unsupported synthetic mutation evidence/i,
  );
  assert.throws(
    () => createExecutedSyntheticMutationEvidence({
      ...completeEvidence(mutationTaskIds[0]),
      activeResidueCount: 1,
    }),
    /unsupported synthetic mutation evidence/i,
  );

  const events = [];
  const result = await runSyntheticMutationLifecycle({
    execute: async () => { events.push('execute'); return 'closed-result'; },
    cleanup: async () => { events.push('cleanup'); },
    readActiveResidueCount: async () => { events.push('readback'); return 0; },
  });
  assert.equal(result, 'closed-result');
  assert.deepEqual(events, ['execute', 'cleanup', 'readback']);

  const cleanupAfterFailure = [];
  await assert.rejects(
    runSyntheticMutationLifecycle({
      execute: async () => { cleanupAfterFailure.push('execute'); throw new Error('bounded failure'); },
      cleanup: async () => { cleanupAfterFailure.push('cleanup'); },
      readActiveResidueCount: async () => { cleanupAfterFailure.push('readback'); return 0; },
    }),
    /bounded failure/,
  );
  assert.deepEqual(cleanupAfterFailure, ['execute', 'cleanup', 'readback']);

  await assert.rejects(
    runSyntheticMutationLifecycle({
      execute: async () => 'not-closed',
      cleanup: async () => undefined,
      readActiveResidueCount: async () => 1,
    }),
    (error) => error?.code === 'synthetic-mutation-cleanup-failed'
      && !error.message.includes('not-closed'),
  );

  const plan = buildExecutionPlan(manifest);
  const expectedStateCases = (scenarioId) => plan.stateCases
    .filter((stateCase) => stateCase.scenarioId === scenarioId);
  const completeCases = (scenarioId) => expectedStateCases(scenarioId).map(({
    caseId,
    identity,
    requiredTaskEvidenceId,
  }) => {
    return {
      caseId,
      identity,
      taskEvidence: requiredTaskEvidenceId ? [completeEvidence(requiredTaskEvidenceId, caseId)] : [],
    };
  });
  const summarize = (scenarioId, caseResults, plannedCases = expectedStateCases(scenarioId)) => (
    summarizeAuthoritativeTaskEvidence({
      scenarioId,
      caseResults,
      expectedStateCases: plannedCases,
    })
  );

  assert.equal(summarizeAuthoritativeTaskEvidence({
    scenarioId: 'user-management-hub',
    caseResults: completeCases('user-management-hub'),
    expectedStateCases: expectedStateCases('user-management-hub'),
  }), true);
  assert.equal(summarize(
    'faq-admin-user-lifecycle',
    completeCases('faq-admin-user-lifecycle'),
  ), true);
  assert.equal(summarize('board-maker-wizard', completeCases('board-maker-wizard')), true);

  const missingMutationCase = completeCases('board-maker-wizard');
  const missingMutationIndex = missingMutationCase.findIndex(({ taskEvidence }) => taskEvidence.length === 1);
  missingMutationCase.splice(missingMutationIndex, 1);
  assert.equal(summarize('board-maker-wizard', missingMutationCase), false,
    'five-of-six mutation dimensions must never be called complete');

  const missingMutationEvidence = completeCases('board-maker-wizard');
  missingMutationEvidence.find(({ taskEvidence }) => taskEvidence.length === 1).taskEvidence = [];
  assert.equal(summarize('board-maker-wizard', missingMutationEvidence), false,
    'a planned mutation dimension without executed evidence must remain incomplete');

  const missingNonMutationCase = completeCases('board-maker-wizard');
  const missingNonMutationIndex = missingNonMutationCase.findIndex(({ taskEvidence }) => taskEvidence.length === 0);
  missingNonMutationCase.splice(missingNonMutationIndex, 1);
  assert.equal(summarize('board-maker-wizard', missingNonMutationCase), false,
    'a truncated scenario case population must never be called complete');

  const invalidEvidenceMutations = [
    ['truncated evidence', (entry) => ({ id: entry.id, status: 'executed' })],
    ['wrong namespace', (entry) => ({ ...entry, syntheticNamespace: 'unreviewed-namespace' })],
    ['missing mutation readback', ({ mutationObserved: _removed, ...entry }) => entry],
    ['missing authoritative readback', ({ authoritativeReadback: _removed, ...entry }) => entry],
    ['missing rollback readback', ({ rollbackReadback: _removed, ...entry }) => entry],
    ['missing cleanup readback', ({ cleanupReadback: _removed, ...entry }) => entry],
    ['active residue', (entry) => ({ ...entry, activeResidueCount: 1 })],
    ['unexpected raw field', (entry) => ({ ...entry, rawUrl: 'redacted-fixture' })],
  ];
  for (const [label, mutateEvidence] of invalidEvidenceMutations) {
    const cases = completeCases('board-maker-wizard');
    const target = cases.find(({ taskEvidence }) => taskEvidence.length === 1);
    target.taskEvidence = [mutateEvidence(target.taskEvidence[0])];
    assert.equal(summarize('board-maker-wizard', cases), false, label);
  }

  const concentratedEvidence = completeCases('board-maker-wizard');
  const mutationCases = concentratedEvidence.filter(({ taskEvidence }) => taskEvidence.length === 1);
  const allEvidence = mutationCases.flatMap(({ taskEvidence }) => taskEvidence);
  for (const result of mutationCases) result.taskEvidence = [];
  mutationCases[0].taskEvidence = allEvidence;
  assert.equal(summarize('board-maker-wizard', concentratedEvidence), false,
    'six records concentrated in one case must not impersonate six dimensions');

  const wrongStepEvidence = completeCases('user-management-hub');
  const firstTaskCase = wrongStepEvidence.find(({ taskEvidence }) => (
    taskEvidence[0]?.id === 'role-status-mutation-readback-executed'
  ));
  const secondTaskCase = wrongStepEvidence.find(({ taskEvidence }) => (
    taskEvidence[0]?.id === 'synthetic-role-status-rollback-complete'
  ));
  [firstTaskCase.taskEvidence, secondTaskCase.taskEvidence] = [
    secondTaskCase.taskEvidence,
    firstTaskCase.taskEvidence,
  ];
  assert.equal(summarize('user-management-hub', wrongStepEvidence), false,
    'task evidence must remain bound to its declared journey step');

  const duplicateCase = completeCases('board-maker-wizard');
  const duplicateTargets = duplicateCase.filter(({ taskEvidence }) => taskEvidence.length === 1);
  duplicateTargets[1].caseId = duplicateTargets[0].caseId;
  assert.equal(summarize('board-maker-wizard', duplicateCase), false,
    'duplicate case identities must fail closed');

  const dimensionDrift = structuredClone(expectedStateCases('board-maker-wizard'));
  dimensionDrift[0].identity.viewport = 'unreviewed-1440';
  assert.equal(summarize('board-maker-wizard', completeCases('board-maker-wizard'), dimensionDrift), false,
    'planned mutation dimensions must remain exact');

  assert.equal(summarizeAuthoritativeTaskEvidence({
    scenarioId: 'auth-login',
    caseResults: completeCases('auth-login'),
    expectedStateCases: expectedStateCases('auth-login'),
  }), true, 'non-mutation scenarios have no authoritative mutation prerequisite');
});

test('runner binds authoritative mutation completion to the validated per-scenario state plan', () => {
  assert.doesNotThrow(() => assertRuntimeScenarioAggregateBinding(runnerSource));
  const decoyOnly = `${runnerSource.replace(
    'const scenarioAggregate = aggregateScenarioExecution({',
    'const scenarioAggregate = legacyObservedResultAggregate({',
  )}\n/* decoy only: const scenarioAggregate = aggregateScenarioExecution({}); */`;
  assert.throws(
    () => assertRuntimeScenarioAggregateBinding(decoyOnly),
    /one executable scenario aggregate call/,
    'comment-only aggregate text must not conceal a disconnected runtime',
  );
  assert.match(
    baselineProtocolSource,
    /scenarioId → stepId → caseId → brandTheme × colorMode × viewport/,
  );
  assert.match(
    baselineProtocolSource,
    /planned state\/performance count[^\n]*`buildExecutionPlan`[^\n]*`partial-automated-evidence`/,
  );
});

test('scenario runtime aggregation keeps declared plan cardinality when observations are missing or substituted', () => {
  const plan = buildExecutionPlan(manifest);
  const scenarioId = 'board-maker-wizard';
  const plannedStateCases = plan.stateCases.filter((stateCase) => stateCase.scenarioId === scenarioId);
  const plannedPerformanceCases = plan.performanceCases.filter((renderCase) => (
    renderCase.scenarioId === scenarioId
  ));
  const completeStateResults = plannedStateCases.map(({ caseId, identity, requiredTaskEvidenceId }) => ({
    caseId,
    identity,
    status: 'automated-state-observed',
    failedAssertionCount: 0,
    taskEvidence: requiredTaskEvidenceId ? [createExecutedSyntheticMutationEvidence({
      id: requiredTaskEvidenceId,
      caseId,
      syntheticNamespace: 'uiq-baseline-mutation-v1',
      mutationObserved: 'observed',
      authoritativeReadback: 'observed',
      rollbackReadback: 'observed',
      cleanupReadback: 'zero-active-residue',
      activeResidueCount: 0,
    })] : [],
  }));
  const completePerformanceResults = plannedPerformanceCases.map(({ renderCaseId }) => ({
    renderCaseId,
    status: 'lab-performance-observed',
  }));
  const aggregate = (stateResults, performanceResults = completePerformanceResults) => aggregateScenarioExecution({
    scenarioId,
    plannedStateCases: plan.stateCases,
    stateResults,
    plannedPerformanceCases: plan.performanceCases,
    performanceResults,
    manualChecksComplete: true,
    evidenceDurable: true,
  });

  const complete = aggregate(completeStateResults);
  assert.equal(complete.plannedStateCaseCount, 12);
  assert.equal(complete.completedStateCaseCount, 12);
  assert.equal(complete.authoritativeTaskReadbackComplete, true);
  assert.equal(complete.status, 'measured');

  const missing = aggregate(completeStateResults.slice(0, -1));
  assert.equal(missing.plannedStateCaseCount, 12);
  assert.equal(missing.completedStateCaseCount, 11);
  assert.equal(missing.authoritativeTaskReadbackComplete, false);
  assert.equal(missing.status, 'partial-automated-evidence');

  const substituted = structuredClone(completeStateResults);
  substituted.at(-1).caseId = substituted[0].caseId;
  assert.equal(aggregate(substituted).plannedStateCaseCount, 12);
  assert.equal(aggregate(substituted).authoritativeTaskReadbackComplete, false);
  assert.equal(aggregate(substituted).status, 'partial-automated-evidence');

  const substitutedIdentity = structuredClone(completeStateResults);
  substitutedIdentity.at(-1).identity.viewport = 'unreviewed-1440';
  assert.equal(aggregate(substitutedIdentity).statePopulationExact, false);
  assert.equal(aggregate(substitutedIdentity).authoritativeTaskReadbackComplete, false);
  assert.equal(aggregate(substitutedIdentity).status, 'partial-automated-evidence');

  const unexpected = structuredClone(completeStateResults);
  unexpected.push({ ...unexpected[0], caseId: 'uiq-unplanned-state-case' });
  assert.equal(aggregate(unexpected).statePopulationExact, false);
  assert.equal(aggregate(unexpected).status, 'partial-automated-evidence');

  const requiredEvidenceCases = completeStateResults
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => result.taskEvidence.length === 1);
  const copiedAcrossDimensions = structuredClone(completeStateResults);
  copiedAcrossDimensions[requiredEvidenceCases[1].index].taskEvidence = structuredClone(
    copiedAcrossDimensions[requiredEvidenceCases[0].index].taskEvidence,
  );
  assert.equal(aggregate(copiedAcrossDimensions).authoritativeTaskReadbackComplete, false);
  assert.equal(aggregate(copiedAcrossDimensions).status, 'partial-automated-evidence');

  const swappedAcrossDimensions = structuredClone(completeStateResults);
  [swappedAcrossDimensions[requiredEvidenceCases[0].index].taskEvidence,
    swappedAcrossDimensions[requiredEvidenceCases[1].index].taskEvidence] = [
    swappedAcrossDimensions[requiredEvidenceCases[1].index].taskEvidence,
    swappedAcrossDimensions[requiredEvidenceCases[0].index].taskEvidence,
  ];
  assert.equal(aggregate(swappedAcrossDimensions).authoritativeTaskReadbackComplete, false);
  assert.equal(aggregate(swappedAcrossDimensions).status, 'partial-automated-evidence');

  const missingEvidenceCaseId = structuredClone(completeStateResults);
  const missingCaseIdTarget = missingEvidenceCaseId[requiredEvidenceCases[0].index].taskEvidence[0];
  delete missingCaseIdTarget.caseId;
  assert.equal(aggregate(missingEvidenceCaseId).authoritativeTaskReadbackComplete, false);
  assert.equal(aggregate(missingEvidenceCaseId).status, 'partial-automated-evidence');

  const missingPerformance = aggregate(
    completeStateResults,
    completePerformanceResults.slice(0, -1),
  );
  assert.equal(missingPerformance.plannedPerformanceCaseCount, 6);
  assert.equal(missingPerformance.completedPerformanceCaseCount, 5);
  assert.equal(missingPerformance.performancePopulationExact, false);
  assert.equal(missingPerformance.status, 'partial-automated-evidence');

  const substitutedPerformanceResults = structuredClone(completePerformanceResults);
  substitutedPerformanceResults.at(-1).renderCaseId = substitutedPerformanceResults[0].renderCaseId;
  const substitutedPerformance = aggregate(completeStateResults, substitutedPerformanceResults);
  assert.equal(substitutedPerformance.completedPerformanceCaseCount, 5);
  assert.equal(substitutedPerformance.performancePopulationExact, false);
  assert.equal(substitutedPerformance.status, 'partial-automated-evidence');

  const unexpectedPerformanceResults = structuredClone(completePerformanceResults);
  unexpectedPerformanceResults.push({
    ...unexpectedPerformanceResults[0],
    renderCaseId: 'uiq-unplanned-performance-case',
  });
  const unexpectedPerformance = aggregate(completeStateResults, unexpectedPerformanceResults);
  assert.equal(unexpectedPerformance.performancePopulationExact, false);
  assert.equal(unexpectedPerformance.status, 'partial-automated-evidence');

  const crossScenarioSubstitution = structuredClone(completePerformanceResults);
  crossScenarioSubstitution.at(-1).renderCaseId = plan.performanceCases.find((performanceCase) => (
    performanceCase.scenarioId !== scenarioId
  )).renderCaseId;
  const substitutedAcrossScenarios = aggregate(completeStateResults, crossScenarioSubstitution);
  assert.equal(substitutedAcrossScenarios.completedPerformanceCaseCount, 5);
  assert.equal(substitutedAcrossScenarios.performancePopulationExact, false);
  assert.equal(substitutedAcrossScenarios.status, 'partial-automated-evidence');

  for (const status of ['invalid-run', 'substituted', 'undeclared', 'unknown-observation']) {
    const untrustedPerformanceResults = completePerformanceResults.map((result) => ({
      ...result,
      status,
    }));
    const untrustedPerformance = aggregate(completeStateResults, untrustedPerformanceResults);
    assert.equal(untrustedPerformance.completedPerformanceCaseCount, 0, status);
    assert.equal(untrustedPerformance.invalidPerformanceCaseCount, 6, status);
    assert.notEqual(untrustedPerformance.status, 'measured', status);
  }
});

test('non-mutation scenarios can complete without synthetic mutation evidence', () => {
  const plan = buildExecutionPlan(manifest);
  const scenarioId = 'admin-shell-hub';
  const stateResults = plan.stateCases
    .filter((stateCase) => stateCase.scenarioId === scenarioId)
    .map(({ caseId, identity }) => ({
      caseId,
      identity,
      status: 'automated-state-observed',
      failedAssertionCount: 0,
      taskEvidence: [],
    }));
  const performanceResults = plan.performanceCases
    .filter((performanceCase) => performanceCase.scenarioId === scenarioId)
    .map(({ renderCaseId }) => ({ renderCaseId, status: 'lab-performance-observed' }));
  const aggregate = aggregateScenarioExecution({
    scenarioId,
    plannedStateCases: plan.stateCases,
    stateResults,
    plannedPerformanceCases: plan.performanceCases,
    performanceResults,
    manualChecksComplete: true,
    evidenceDurable: true,
  });

  assert.equal(aggregate.authoritativeTaskReadbackComplete, true);
  assert.equal(aggregate.completedStateCaseCount, aggregate.plannedStateCaseCount);
  assert.equal(aggregate.completedPerformanceCaseCount, aggregate.plannedPerformanceCaseCount);
  assert.equal(aggregate.status, 'measured');

  const extraneousMutationEvidence = structuredClone(stateResults);
  extraneousMutationEvidence[0].taskEvidence = [createExecutedSyntheticMutationEvidence({
    id: 'single-deploy-authoritative-readback',
    caseId: extraneousMutationEvidence[0].caseId,
    syntheticNamespace: 'uiq-baseline-mutation-v1',
    mutationObserved: 'observed',
    authoritativeReadback: 'observed',
    rollbackReadback: 'observed',
    cleanupReadback: 'zero-active-residue',
    activeResidueCount: 0,
  })];
  const contaminated = aggregateScenarioExecution({
    scenarioId,
    plannedStateCases: plan.stateCases,
    stateResults: extraneousMutationEvidence,
    plannedPerformanceCases: plan.performanceCases,
    performanceResults,
    manualChecksComplete: true,
    evidenceDurable: true,
  });
  assert.equal(contaminated.authoritativeTaskReadbackComplete, false);
  assert.equal(contaminated.status, 'partial-automated-evidence');
});

test('synthetic mutation failures expose only an allowlisted bounded reason code', () => {
  assert.equal(
    classifySyntheticMutationFailureReason(
      { code: 'synthetic-user-status-readback-failed' },
      'state-preparation-failed',
    ),
    'synthetic-user-status-readback-failed',
  );
  assert.equal(
    classifySyntheticMutationFailureReason(
      { code: 'private-value-from-upstream' },
      'state-preparation-failed',
    ),
    'state-preparation-failed',
  );
  assert.equal(
    classifySyntheticMutationFailureReason(
      { code: 'synthetic-user-status-readback-failed?token=decoy' },
      'state-preparation-failed',
    ),
    'state-preparation-failed',
  );
  assert.match(runnerSource, /classifySyntheticMutationFailureReason\(error, `\$\{stage\}-failed`\)/);
});

test('synthetic FAQ rich-text readback distinguishes canonical editor HTML without retaining raw content', () => {
  assert.equal(
    classifySyntheticRichTextReadback({
      expectedPlainText: 'UIQ MUT ANSWER bounded',
      observedValue: 'UIQ MUT ANSWER bounded',
    }),
    'semantic-plain-text',
  );
  assert.equal(
    classifySyntheticRichTextReadback({
      expectedPlainText: 'UIQ MUT ANSWER bounded',
      observedValue: '<p>UIQ MUT ANSWER bounded</p>',
    }),
    'canonical-tiptap-html',
  );
  assert.equal(
    classifySyntheticRichTextReadback({
      expectedPlainText: 'UIQ <MUT> & ANSWER',
      observedValue: '<p>UIQ &lt;MUT&gt; &amp; ANSWER</p>',
    }),
    'canonical-tiptap-html',
  );
  assert.equal(
    classifySyntheticRichTextReadback({
      expectedPlainText: 'UIQ MUT ANSWER bounded',
      observedValue: '<div>UIQ MUT ANSWER bounded</div>',
    }),
    'not-matched',
    'semantically similar but non-canonical markup must fail closed',
  );
  assert.equal(
    classifySyntheticRichTextReadback({
      expectedPlainText: 'UIQ MUT ANSWER bounded',
      observedValue: '<p>UIQ MUT ANSWER bounded</p>',
      rawHtml: 'private-decoy',
    }),
    'not-matched',
    'the helper accepts no raw-content side channel fields',
  );
  const unsafeProbe = '<script>private-decoy</script>';
  const rejected = classifySyntheticRichTextReadback({
    expectedPlainText: 'UIQ MUT ANSWER bounded',
    observedValue: unsafeProbe,
  });
  assert.equal(rejected, 'not-matched');
  assert.doesNotMatch(rejected, /private-decoy|script/i);
  assert.match(runnerSource, /expectedContentKind: 'canonical-tiptap-html'/);
  assert.doesNotMatch(runnerSource, /(?:rawHtml|observedHtml|storedHtml)\s*:/i);
});

test('synthetic mutation diagnostic is a fixed six-step non-baseline slice', () => {
  const plan = buildExecutionPlan(manifest);
  const selected = selectSyntheticMutationDiagnosticCases(plan.stateCases);
  const expectedStepIds = [
    'user-hub-ready',
    'mutation-error',
    'admin-compose-faq',
    'admin-faq-readback',
    'user-faq-search',
    'wizard-ready',
  ];
  assert.equal(selected.length, 6);
  assert.deepEqual(selected.map(({ stepId }) => stepId).sort(), expectedStepIds.sort());
  assert.equal(new Set(selected.map(({ stepId }) => stepId)).size, 6);

  const incomplete = plan.stateCases.filter(({ stepId }) => stepId !== 'wizard-ready');
  assert.throws(
    () => selectSyntheticMutationDiagnosticCases(incomplete),
    /synthetic mutation diagnostic population is incomplete/i,
  );

  assert.match(runnerSource, /UI_BASELINE_MUTATION_DIAGNOSTIC/);
  assert.match(runnerSource, /synthetic-mutation-v1/);
  assert.match(runnerSource, /diagnostic-not-baseline-evidence/);
  assert.doesNotMatch(runnerSource, /UI_BASELINE_(?:CASE|STEP|SCENARIO)_FILTER/);
  assert.match(baselineProtocolSource, /synthetic-mutation-v1/);
  assert.match(baselineProtocolSource, /zero-active-residue/);
});

test('draft restoration polling is bounded and tolerates transient reads without fabricating success', async () => {
  let successfulReads = 0;
  let successfulWaits = 0;
  const restored = await pollForExpectedValue({
    readValue: async () => {
      successfulReads += 1;
      if (successfulReads === 1) throw new Error('transient synthetic read');
      return successfulReads === 3 ? 'restored' : 'pending';
    },
    expectedValue: 'restored',
    maxAttempts: 5,
    intervalMs: 0,
    wait: async () => { successfulWaits += 1; },
  });
  assert.equal(restored, true);
  assert.equal(successfulReads, 3);
  assert.equal(successfulWaits, 2);

  let absentReads = 0;
  const absent = await pollForExpectedValue({
    readValue: async () => { absentReads += 1; return 'pending'; },
    expectedValue: 'restored',
    maxAttempts: 2,
    intervalMs: 0,
    wait: async () => undefined,
  });
  assert.equal(absent, false);
  assert.equal(absentReads, 2);
  await assert.rejects(
    pollForExpectedValue({
      readValue: async () => 'restored',
      expectedValue: 'restored',
      maxAttempts: 0,
    }),
    /maxAttempts/i,
  );
});

test('scenario aggregate prioritizes invalid, then blocked, then findings, then clean observation', () => {
  const clean = {
    status: 'automated-state-observed',
    automatedOutcome: 'no-automated-finding-observed',
  };
  const finding = {
    status: 'automated-state-observed',
    automatedOutcome: 'automated-findings-observed',
  };
  const blocked = {
    status: 'blocked-prerequisite',
    automatedOutcome: 'automated-observation-incomplete',
  };
  const invalid = {
    status: 'invalid-run',
    automatedOutcome: 'automated-observation-invalid',
  };

  assert.equal(summarizeAutomatedOutcome([clean]), 'no-automated-finding-observed');
  assert.equal(summarizeAutomatedOutcome([clean, finding]), 'automated-findings-observed');
  assert.equal(summarizeAutomatedOutcome([finding, blocked]), 'automated-observation-incomplete');
  assert.equal(summarizeAutomatedOutcome([blocked, invalid, finding]), 'automated-observation-invalid');
  assert.notEqual(
    summarizeAutomatedOutcome([invalid, blocked]),
    'automated-observation-incomplete',
    'an invalid case must never be collapsed into incomplete evidence',
  );
});

test('production snapshot selects explicit build inputs and rejects private, secret and generated paths', () => {
  const candidates = [
    '.dockerignore',
    'build.gradle',
    'settings.gradle',
    'gradle.properties',
    'lombok.config',
    'gradlew',
    'gradle/libs.versions.toml',
    'gradle/wrapper/gradle-wrapper.jar',
    'gradle/wrapper/gradle-wrapper.properties',
    'api-server/Dockerfile',
    'api-server/build.gradle',
    'api-server/src/main/java/nuri/Api.java',
    'business-app/build.gradle',
    'business-app/src/main/java/nuri/App.java',
    'business-core/build.gradle',
    'business-core/src/main/java/nuri/Core.java',
    'foundation/build.gradle',
    'foundation/src/main/resources/application.yml',
    'migration-tool/build.gradle',
    'frontend/Dockerfile',
    'frontend/.dockerignore',
    'frontend/package.json',
    'frontend/pnpm-lock.yaml',
    'frontend/src/app/page.tsx',
    'frontend/public/logo.svg',
    'frontend/scripts/ui-quality-baseline-core.mjs',
    'config/ui-quality-scenarios.json',
    'config/ui-route-capabilities.json',
    'frontend/.env.e2e',
    'frontend/playwright/.auth/admin.json',
    'frontend/test-results/result.json',
    'api-server/build/libs/app.jar',
    'business-core/storage/private.bin',
    'foundation/src/main/resources/private-key.pem',
    'api-server/src/main/resources/application-local.yml',
    'api-server/src/main/resources/application-local.yaml',
    'api-server/src/main/resources/application-local.properties',
  ];

  const selected = selectProductionBuildInputPaths(candidates);
  const firstForbidden = candidates.indexOf('frontend/.env.e2e');
  for (const required of candidates.slice(0, firstForbidden)) assert.ok(selected.includes(required), required);
  for (const forbidden of candidates.slice(firstForbidden)) assert.ok(!selected.includes(forbidden), forbidden);
  assert.ok(
    REQUIRED_PRODUCTION_BUILD_INPUT_FILES.includes('lombok.config'),
    'the annotation-processing configuration must be a required committed build input',
  );
  assert.match(
    baselineProtocolSource,
    /`lombok\.config`[^\r\n]*production build input/,
    'the protocol must identify the root annotation-processing configuration as build input',
  );
  assert.throws(
    () => selectProductionBuildInputPaths(['../outside/private.txt']),
    /unsafe build input path/i,
  );
  assert.doesNotThrow(() => assertStableBuildInputSnapshot('same-hash', 'same-hash'));
  assert.throws(
    () => assertStableBuildInputSnapshot('start-hash', 'changed-hash'),
    /build inputs changed during baseline execution/i,
  );

  const committedPaths = [...new Set([
    ...selected,
    ...REQUIRED_PRODUCTION_BUILD_INPUT_FILES,
  ])].sort();
  const committedBlobByPath = new Map(committedPaths.map((relativePath) => [
    relativePath,
    Buffer.from(`${relativePath}\ncommitted-lf\n`, 'utf8'),
  ]));
  const committedTreeHash = createProductionBuildInputTreeHash({
    trackedPaths: committedPaths,
    readCommittedFile: (relativePath) => committedBlobByPath.get(relativePath),
  });
  const checkoutTransformedTreeHash = sha256(committedPaths
    .map((relativePath) => `${relativePath}:${sha256(Buffer.from(
      `${relativePath}\r\ncommitted-lf\r\n`,
      'utf8',
    ))}`)
    .join('\n'));
  assert.match(committedTreeHash, /^[a-f0-9]{64}$/);
  assert.notEqual(
    committedTreeHash,
    checkoutTransformedTreeHash,
    'clean checkout line-ending conversion must not redefine the committed build-input tree',
  );
  assert.throws(
    () => createProductionBuildInputTreeHash({
      trackedPaths: committedPaths,
      readCommittedFile: () => 'decoded text is not raw Git blob bytes',
    }),
    /raw committed bytes/i,
  );
});

test('production snapshot keeps source directories that collide with generated artifact names', () => {
  const logRouteSourcePaths = [
    'frontend/src/app/admin/system/logs/LogDashboardClient.tsx',
    'frontend/src/app/admin/system/logs/__tests__/LogDashboardClient.test.tsx',
    'frontend/src/app/admin/system/logs/__tests__/SystemLogsUserClient.resilience.test.tsx',
    'frontend/src/app/admin/system/logs/__tests__/log-clients.contract.test.tsx',
    'frontend/src/app/admin/system/logs/login/page.tsx',
    'frontend/src/app/admin/system/logs/page.tsx',
    'frontend/src/app/admin/system/logs/privacy/page.tsx',
    'frontend/src/app/admin/system/logs/system/page.tsx',
    'frontend/src/app/admin/system/logs/user/page.tsx',
    'frontend/src/app/admin/system/logs/user/SystemLogsUserClient.tsx',
    'frontend/src/app/admin/system/logs/web/page.tsx',
  ];
  const additionalSourceCollisions = [
    'frontend/src/app/admin/system/build/page.tsx',
    'frontend/src/app/admin/system/coverage/page.tsx',
    'frontend/src/app/admin/system/storage/page.tsx',
    'frontend/src/app/admin/system/tmp/page.tsx',
    'api-server/src/main/java/egovframework/example/logs/LogService.java',
    'business-core/src/main/java/egovframework/example/storage/StoragePolicy.java',
  ];
  const generatedOrPrivatePaths = [
    'gradle/build/generated.gradle',
    'gradle/logs/task.log',
    'gradle/storage/cache.bin',
    'gradle/tmp/temporary.gradle',
    'frontend/src/build/generated.ts',
    'frontend/src/logs/browser.log',
    'frontend/src/storage/cache.bin',
    'frontend/src/tmp/temporary.ts',
    'api-server/src/main/logs/application.log',
    'frontend/src/app/admin/system/logs/.env.production',
    'frontend/src/app/admin/system/storage/private-key.pem',
    'frontend/src/.ssh/id_rsa',
    'frontend/src/node_modules/example/index.js',
  ];

  const expectedSourcePaths = [...logRouteSourcePaths, ...additionalSourceCollisions].sort();
  assert.equal(logRouteSourcePaths.length, 11, 'the complete /admin/system/logs/user regression set must stay bound');
  assert.deepEqual(
    selectProductionBuildInputPaths([
      ...expectedSourcePaths,
      ...generatedOrPrivatePaths,
    ]),
    expectedSourcePaths,
  );
});

test('build attestation binds canonical envelope bytes to source and exact image IDs', () => {
  const fixture = baselineBuildAttestationFixture();
  const expected = {
    rawBytes: fixture.rawBytes,
    expectedRawSha256: fixture.rawSha256,
    buildSha: BASELINE_BUILD_SHA,
    buildInputTreeHash: BASELINE_BUILD_INPUT_TREE_HASH,
    commitTreeId: BASELINE_COMMIT_TREE_ID,
    frontendBuildId: FRONTEND_IMAGE_ID,
    backendBuildId: BACKEND_IMAGE_ID,
  };
  assert.deepEqual(validateBaselineBuildAttestation(expected), {
    frontendBuildId: FRONTEND_IMAGE_ID,
    backendBuildId: BACKEND_IMAGE_ID,
    verified: true,
  });

  const flatSelfHash = {
    ...fixture.envelope.payload,
    payloadSha256: fixture.envelope.payloadSha256,
  };
  const hostileBytes = [
    Buffer.from(`${JSON.stringify(fixture.envelope, null, 2)}\n`, 'utf8'),
    Buffer.from(`${stableJson(flatSelfHash)}\n`, 'utf8'),
    Buffer.alloc(4_097, 0x20),
  ];
  for (const rawBytes of hostileBytes) {
    assert.throws(
      () => validateBaselineBuildAttestation({
        ...expected,
        rawBytes,
        expectedRawSha256: sha256(rawBytes),
      }),
      /build attestation/i,
    );
  }

  const wrongPayloadDigest = baselineBuildAttestationFixture({}, { payloadSha256: 'f'.repeat(64) });
  assert.throws(
    () => validateBaselineBuildAttestation({
      ...expected,
      rawBytes: wrongPayloadDigest.rawBytes,
      expectedRawSha256: wrongPayloadDigest.rawSha256,
    }),
    /build attestation/i,
  );
  const wrongImage = baselineBuildAttestationFixture({
    images: {
      api: { id: BACKEND_IMAGE_ID },
      frontend: { id: `sha256:${'f'.repeat(64)}` },
    },
  });
  assert.throws(
    () => validateBaselineBuildAttestation({
      ...expected,
      rawBytes: wrongImage.rawBytes,
      expectedRawSha256: wrongImage.rawSha256,
    }),
    /build attestation/i,
  );
  const duplicatedImage = baselineBuildAttestationFixture({
    images: {
      api: { id: FRONTEND_IMAGE_ID },
      frontend: { id: FRONTEND_IMAGE_ID },
    },
  });
  assert.throws(
    () => validateBaselineBuildAttestation({
      ...expected,
      rawBytes: duplicatedImage.rawBytes,
      expectedRawSha256: duplicatedImage.rawSha256,
      backendBuildId: FRONTEND_IMAGE_ID,
    }),
    /build attestation/i,
  );
});

test('build attestation file reader allows only bounded regular non-symlink files outside the repository', () => {
  const fixture = baselineBuildAttestationFixture();
  const boundaryRoot = mkdtempSync(join(tmpdir(), 'uiq-build-attestation-'));
  const repositoryRoot = join(boundaryRoot, 'repository');
  const attestationPath = join(boundaryRoot, 'build-attestation.json');
  mkdirSync(repositoryRoot);
  writeFileSync(attestationPath, fixture.rawBytes);
  assert.deepEqual(readBaselineBuildAttestationFile({
    attestationPath,
    repositoryRoot,
  }), fixture.rawBytes);

  assert.throws(
    () => readBaselineBuildAttestationFile({
      attestationPath: 'relative-attestation.json',
      repositoryRoot,
    }),
    /build attestation file/i,
  );
  assert.throws(
    () => readBaselineBuildAttestationFile({
      attestationPath: join(repositoryRoot, 'inside.json'),
      repositoryRoot,
    }),
    /build attestation file/i,
  );
  assert.throws(
    () => readBaselineBuildAttestationFile({
      attestationPath,
      repositoryRoot,
      realpathFile: (targetPath) => (
        targetPath === repositoryRoot
          ? repositoryRoot
          : join(repositoryRoot, 'inside-via-parent-link.json')
      ),
    }),
    /build attestation file/i,
  );
  assert.throws(
    () => readBaselineBuildAttestationFile({
      attestationPath,
      repositoryRoot,
      lstatFile: () => ({
        isFile: () => true,
        isSymbolicLink: () => true,
        size: fixture.rawBytes.length,
      }),
      readFile: () => fixture.rawBytes,
    }),
    /build attestation file/i,
  );
  assert.throws(
    () => readBaselineBuildAttestationFile({
      attestationPath,
      repositoryRoot,
      lstatFile: () => ({
        isFile: () => true,
        isSymbolicLink: () => false,
        size: 4_097,
      }),
      readFile: () => Buffer.alloc(4_097),
    }),
    /build attestation file/i,
  );
});

test('Docker container and image inspect invocations are fixed, identifier-bound, bounded, and secret-free', () => {
  const containerInvocation = createBaselineDockerInspectInvocation({
    containerId: FRONTEND_CONTAINER_ID,
    privatePort: '3000/tcp',
    networkName: BASELINE_DOCKER_NETWORK,
  });

  assert.equal(containerInvocation.command, 'docker');
  assert.deepEqual(containerInvocation.args.slice(0, 4), [
    'inspect',
    '--type',
    'container',
    '--format',
  ]);
  assert.equal(containerInvocation.args.at(-1), FRONTEND_CONTAINER_ID);
  assert.equal(containerInvocation.timeoutMs, 5_000);
  assert.equal(containerInvocation.maxOutputBytes, 4_096);
  const containerFormat = containerInvocation.args.at(-2);
  for (const selectedPath of [
    '.Id',
    '.Name',
    '.Image',
    '.State.Running',
    '.State.Status',
    '.State.Health.Status',
    '.RestartCount',
    '.NetworkSettings.Ports',
    '.NetworkSettings.Networks',
    '.Config.Labels',
  ]) assert.match(containerFormat, new RegExp(selectedPath.replaceAll('.', '\\.')));
  assert.doesNotMatch(
    containerFormat,
    /org\.opencontainers\.image\.revision|io\.egov\.ui-quality\.build-input-tree-sha256/,
    'mutable container labels must never supply immutable build provenance',
  );
  assert.doesNotMatch(
    containerFormat,
    /\.Config\.Env|\.Config\.Cmd|\.Config\.Entrypoint|{{\s*json\s+\.\s*}}/,
  );

  const imageInvocation = createBaselineDockerImageInspectInvocation({
    imageId: FRONTEND_IMAGE_ID,
  });
  assert.equal(imageInvocation.command, 'docker');
  assert.deepEqual(imageInvocation.args.slice(0, 3), ['image', 'inspect', '--format']);
  assert.equal(imageInvocation.args.at(-1), FRONTEND_IMAGE_ID);
  assert.equal(imageInvocation.timeoutMs, 5_000);
  assert.equal(imageInvocation.maxOutputBytes, 4_096);
  const imageFormat = imageInvocation.args.at(-2);
  assert.match(imageFormat, /\.Id/);
  assert.match(imageFormat, /org\.opencontainers\.image\.revision/);
  assert.match(imageFormat, /io\.egov\.ui-quality\.build-input-tree-sha256/);
  assert.doesNotMatch(
    imageFormat,
    /\.Config\.Env|\.Config\.Cmd|\.Config\.Entrypoint|{{\s*json\s+\.\s*}}/,
  );

  const containerAdapterSource = runnerSource.match(
    /function inspectBaselineContainer\(request\) \{([\s\S]*?)\n\}/,
  )?.[1];
  assert.ok(containerAdapterSource, 'the runner container adapter must remain discoverable');
  assert.match(containerAdapterSource, /createBaselineDockerInspectInvocation\(request\)/);
  const imageAdapterSource = runnerSource.match(
    /function inspectBaselineImage\(request\) \{([\s\S]*?)\n\}/,
  )?.[1];
  assert.ok(imageAdapterSource, 'the runner image adapter must remain discoverable');
  assert.match(imageAdapterSource, /createBaselineDockerImageInspectInvocation\(request\)/);
  for (const adapterSource of [containerAdapterSource, imageAdapterSource]) {
    assert.match(adapterSource, /execFileSync\(invocation\.command, invocation\.args/);
    assert.match(adapterSource, /timeout:\s*invocation\.timeoutMs/);
    assert.match(adapterSource, /maxBuffer:\s*invocation\.maxOutputBytes/);
    assert.match(adapterSource, /stdio:\s*\['ignore', 'pipe', 'ignore'\]/);
  }
  assert.throws(
    () => createBaselineDockerInspectInvocation({
      containerId: `${FRONTEND_CONTAINER_ID};decoy`,
      privatePort: '3000/tcp',
      networkName: BASELINE_DOCKER_NETWORK,
    }),
    /inspect request is invalid/i,
  );
  assert.throws(
    () => createBaselineDockerInspectInvocation({
      containerId: FRONTEND_CONTAINER_ID,
      privatePort: '3001/tcp',
      networkName: BASELINE_DOCKER_NETWORK,
    }),
    /inspect request is invalid/i,
  );
  assert.throws(
    () => createBaselineDockerImageInspectInvocation({
      imageId: `${FRONTEND_IMAGE_ID};decoy`,
    }),
    /image inspect request is invalid/i,
  );
});

test('Docker stack validator binds containers to separately inspected immutable images', () => {
  const fixture = baselineDockerStackFixture();
  assert.deepEqual(validateBaselineDockerStack(fixture.input), {
    frontendBuildId: FRONTEND_IMAGE_ID,
    backendBuildId: BACKEND_IMAGE_ID,
    verified: true,
  });
  assert.deepEqual(fixture.containerCalls, [
    {
      role: 'frontend',
      containerId: FRONTEND_CONTAINER_ID,
      privatePort: '3000/tcp',
      networkName: BASELINE_DOCKER_NETWORK,
    },
    {
      role: 'backend',
      containerId: BACKEND_CONTAINER_ID,
      privatePort: '8080/tcp',
      networkName: BASELINE_DOCKER_NETWORK,
    },
  ]);
  assert.deepEqual(fixture.imageCalls, [
    { role: 'frontend', imageId: FRONTEND_IMAGE_ID },
    { role: 'backend', imageId: BACKEND_IMAGE_ID },
  ]);

  const localhostFixture = baselineDockerStackFixture({
    input: {
      frontendOrigin: 'http://localhost:3013',
      apiOrigin: 'http://localhost:18091',
    },
  });
  assert.equal(validateBaselineDockerStack(localhostFixture.input).verified, true);
});

test('Docker stack validator rejects decoy identity, image, state, health, restart, and provenance evidence', () => {
  const hostileCases = [
    ['wrong inspected ID', { frontend: { id: '3'.repeat(64) } }, {}, /identity/i],
    ['wrong inspected name', { frontend: { name: '/egov-uiux-baseline-r13-decoy-frontend-1' } }, {}, /identity/i],
    ['fixed default name input', {}, { frontendContainerName: 'egov-frontend' }, /stack contract/i],
    ['decoy environment image', {}, { frontendBuildId: `sha256:${'e'.repeat(64)}` }, /image binding/i],
    ['other actual image', { backend: { image: `sha256:${'f'.repeat(64)}` } }, {}, /image binding/i],
    ['wrong inspected image ID', { backendImage: { id: `sha256:${'f'.repeat(64)}` } }, {}, /image binding/i],
    ['stopped', { frontend: { running: false, status: 'exited' } }, {}, /runtime state/i],
    ['wrong running status', { backend: { status: 'paused' } }, {}, /runtime state/i],
    ['unhealthy', { frontend: { healthStatus: 'unhealthy' } }, {}, /runtime state/i],
    ['health still starting', { backend: { healthStatus: 'starting' } }, {}, /runtime state/i],
    ['restart observed', { frontend: { restartCount: 1 } }, {}, /runtime state/i],
    ['wrong image revision label', { backendImage: { buildSha: 'e'.repeat(40) } }, {}, /build provenance/i],
    ['wrong image tree label', { frontendImage: { buildInputTreeHash: 'f'.repeat(64) } }, {}, /build provenance/i],
    ['wrong compose project', { frontend: { composeProject: 'egov-uiux-baseline-r13-decoy' } }, {}, /stack provenance/i],
    ['wrong compose service', { backend: { composeService: 'frontend' } }, {}, /stack provenance/i],
    ['missing exact network', { frontend: { networkPresent: false } }, {}, /stack provenance/i],
    [
      'mutable container build labels cannot substitute for image metadata',
      {
        frontend: {
          extraLabels: {
            BuildSha: BASELINE_BUILD_SHA,
            BuildInputTreeHash: BASELINE_BUILD_INPUT_TREE_HASH,
          },
        },
      },
      {},
      /projection shape/i,
    ],
    ['unexpected projection field', { frontend: { extra: { Config: { Env: ['SECRET=raw'] } } } }, {}, /projection shape/i],
    ['unexpected image projection field', { backendImage: { extra: { RepoTags: ['decoy:latest'] } } }, {}, /projection shape/i],
  ];

  for (const [label, projectionOverrides, inputOverrides, expected] of hostileCases) {
    const fixture = baselineDockerStackFixture({
      ...projectionOverrides,
      input: inputOverrides,
    });
    assert.throws(() => validateBaselineDockerStack(fixture.input), expected, label);
  }
});

test('Docker stack validator rejects malformed, oversized, failed, and multi-binding inspection', () => {
  const invalidInspections = [
    ['CLI missing or timeout', () => { throw new Error('raw docker failure with host data'); }],
    ['non-buffer output', () => '{}'],
    ['malformed JSON', () => Buffer.from('{not-json}\n', 'utf8')],
    ['multiple JSON results', () => Buffer.from('{}\n{}\n', 'utf8')],
    ['oversized JSON', () => Buffer.alloc(4_097, 0x20)],
  ];
  for (const [label, inspectContainer] of invalidInspections) {
    const fixture = baselineDockerStackFixture({ input: { inspectContainer } });
    let observed;
    assert.throws(
      () => validateBaselineDockerStack(fixture.input),
      (error) => {
        observed = error.message;
        return /Docker inspection/i.test(error.message);
      },
      label,
    );
    assert.doesNotMatch(observed, /raw docker failure|SECRET|127\.0\.0\.1/);
    assert.ok(!observed.includes(FRONTEND_CONTAINER_ID));
  }

  for (const [label, inspectImage] of invalidInspections) {
    const fixture = baselineDockerStackFixture({ input: { inspectImage } });
    let observed;
    assert.throws(
      () => validateBaselineDockerStack(fixture.input),
      (error) => {
        observed = error.message;
        return /Docker (?:image )?inspection/i.test(error.message);
      },
      `image ${label}`,
    );
    assert.doesNotMatch(observed, /raw docker failure|SECRET|127\.0\.0\.1/);
    assert.ok(!observed.includes(FRONTEND_IMAGE_ID));
  }

  for (const overrides of [
    { frontend: { hostPort: '3014' } },
    { backend: { hostPort: '18092' } },
    { frontend: { hostIp: '0.0.0.0' } },
    { backend: { hostIp: '::' } },
    { frontend: { portBindings: [] } },
    {
      frontend: {
        extraPorts: {
          '3001/tcp': [{ HostIp: '127.0.0.1', HostPort: '3014' }],
        },
      },
    },
    {
      backend: {
        portBindings: [
          { HostIp: '127.0.0.1', HostPort: '18091' },
          { HostIp: '::1', HostPort: '18091' },
        ],
      },
    },
    { input: { frontendOrigin: 'http://127.0.0.1' } },
    { input: { apiOrigin: 'https://example.invalid:18091' } },
  ]) {
    const fixture = baselineDockerStackFixture(overrides);
    assert.throws(() => validateBaselineDockerStack(fixture.input), /port binding/i);
  }
});

test('runner execution preflight behavior invokes exact Docker inspection in every provenance-writing mode', () => {
  for (const mode of [
    { genericDiagnostic: false, mutationDiagnostic: false, includePerformance: true },
    { genericDiagnostic: false, mutationDiagnostic: true, includePerformance: false },
    { genericDiagnostic: true, mutationDiagnostic: false, includePerformance: false },
  ]) {
    const fixture = baselineDockerStackFixture();
    const environment = baselineExecutionEnvironment();
    const preflight = validateRunnerExecutionPreflight({
      ...mode,
      baseOrigin: 'http://127.0.0.1:3013',
      buildSha: BASELINE_BUILD_SHA,
      buildInputTreeHash: BASELINE_BUILD_INPUT_TREE_HASH,
      commitTreeId: BASELINE_COMMIT_TREE_ID,
      environment,
      authStateExists: () => true,
      readBuildAttestation: () => baselineBuildAttestationFixture().rawBytes,
      inspectContainer: fixture.input.inspectContainer,
      inspectImage: fixture.input.inspectImage,
    });
    assert.deepEqual(Object.keys(preflight).sort(), [
      'backendBuildId',
      'frontendBuildId',
      'verifyAtFinish',
    ]);
    assert.equal(preflight.frontendBuildId, FRONTEND_IMAGE_ID);
    assert.equal(preflight.backendBuildId, BACKEND_IMAGE_ID);
    assert.doesNotMatch(JSON.stringify(preflight), new RegExp(FRONTEND_CONTAINER_ID));
    assert.equal(fixture.containerCalls.length, 2, 'preflight must inspect both closed container roles');
    assert.equal(fixture.imageCalls.length, 2, 'preflight must inspect both exact image IDs');
    assert.deepEqual(preflight.verifyAtFinish(), {
      frontendBuildId: FRONTEND_IMAGE_ID,
      backendBuildId: BACKEND_IMAGE_ID,
      verified: true,
    });
    assert.equal(fixture.containerCalls.length, 4, 'finish verification must inspect both container roles again');
    assert.equal(fixture.imageCalls.length, 4, 'finish verification must inspect both image IDs again');
  }
});

test('runner finish verification rejects a container that switches image IDs after preflight', () => {
  const fixture = baselineDockerStackFixture();
  const inspectContainer = (request) => {
    const completedPreflight = fixture.containerCalls.length >= 2;
    if (completedPreflight && request.role === 'frontend') {
      fixture.containerCalls.push(request);
      return dockerContainerInspectProjection({
        id: FRONTEND_CONTAINER_ID,
        name: `/${FRONTEND_CONTAINER_NAME}`,
        image: `sha256:${'e'.repeat(64)}`,
        privatePort: '3000/tcp',
        hostPort: '3013',
        composeService: 'frontend',
      });
    }
    return fixture.input.inspectContainer(request);
  };
  const preflight = validateRunnerExecutionPreflight({
    genericDiagnostic: true,
    mutationDiagnostic: false,
    includePerformance: false,
    baseOrigin: 'http://127.0.0.1:3013',
    buildSha: BASELINE_BUILD_SHA,
    buildInputTreeHash: BASELINE_BUILD_INPUT_TREE_HASH,
    commitTreeId: BASELINE_COMMIT_TREE_ID,
    environment: baselineExecutionEnvironment(),
    authStateExists: () => true,
    readBuildAttestation: () => baselineBuildAttestationFixture().rawBytes,
    inspectContainer,
    inspectImage: fixture.input.inspectImage,
  });
  assert.equal(fixture.containerCalls.length, 2);
  assert.equal(fixture.imageCalls.length, 2);
  assert.throws(() => preflight.verifyAtFinish(), /image binding/i);
  assert.equal(fixture.containerCalls.length, 3);
  assert.equal(fixture.imageCalls.length, 2, 'changed container image must fail before image metadata is trusted');
});

test('runner preflight consumes the expected external build attestation before Docker inspection', () => {
  const fixture = baselineDockerStackFixture();
  const environment = baselineExecutionEnvironment();
  let readCount = 0;
  assert.throws(
    () => validateRunnerExecutionPreflight({
      genericDiagnostic: true,
      mutationDiagnostic: false,
      includePerformance: false,
      baseOrigin: 'http://127.0.0.1:3013',
      buildSha: BASELINE_BUILD_SHA,
      buildInputTreeHash: BASELINE_BUILD_INPUT_TREE_HASH,
      commitTreeId: BASELINE_COMMIT_TREE_ID,
      environment,
      authStateExists: () => true,
      readBuildAttestation: () => {
        readCount += 1;
        return Buffer.from('{"decoy":true}\n', 'utf8');
      },
      inspectContainer: fixture.input.inspectContainer,
      inspectImage: fixture.input.inspectImage,
    }),
    /build attestation/i,
  );
  assert.equal(readCount, 1);
  assert.equal(fixture.containerCalls.length, 0);
  assert.equal(fixture.imageCalls.length, 0);
});

test('runner execution preflight fails closed on missing identifiers and never trusts decoy environment fields', () => {
  const fixture = baselineDockerStackFixture();
  const environment = baselineExecutionEnvironment({
    UI_BASELINE_FRONTEND_CONTAINER_ID: '',
    UI_BASELINE_DECOY_CONTAINER_ID: FRONTEND_CONTAINER_ID,
  });
  assert.throws(
    () => validateRunnerExecutionPreflight({
      genericDiagnostic: true,
      mutationDiagnostic: false,
      includePerformance: false,
      baseOrigin: 'http://127.0.0.1:3013',
      buildSha: BASELINE_BUILD_SHA,
      buildInputTreeHash: BASELINE_BUILD_INPUT_TREE_HASH,
      commitTreeId: BASELINE_COMMIT_TREE_ID,
      environment,
      authStateExists: () => true,
      readBuildAttestation: () => baselineBuildAttestationFixture().rawBytes,
      inspectContainer: fixture.input.inspectContainer,
      inspectImage: fixture.input.inspectImage,
    }),
    /preflight is incomplete/i,
  );
  assert.equal(fixture.containerCalls.length, 0);
  assert.equal(fixture.imageCalls.length, 0);

  environment.UI_BASELINE_FRONTEND_CONTAINER_ID = FRONTEND_CONTAINER_ID;
  environment.UI_BASELINE_API_URL = 'http://[malformed-private-input';
  assert.throws(
    () => validateRunnerExecutionPreflight({
      genericDiagnostic: true,
      mutationDiagnostic: false,
      includePerformance: false,
      baseOrigin: 'http://127.0.0.1:3013',
      buildSha: BASELINE_BUILD_SHA,
      buildInputTreeHash: BASELINE_BUILD_INPUT_TREE_HASH,
      commitTreeId: BASELINE_COMMIT_TREE_ID,
      environment,
      authStateExists: () => true,
      readBuildAttestation: () => baselineBuildAttestationFixture().rawBytes,
      inspectContainer: fixture.input.inspectContainer,
      inspectImage: fixture.input.inspectImage,
    }),
    (error) => error.message === 'baseline origin is invalid',
  );
  assert.equal(fixture.containerCalls.length, 0);
  assert.equal(fixture.imageCalls.length, 0);
});

test('authoritative execute path consumes attested image IDs and repeats Docker verification before sealing', () => {
  const executableSource = runnerSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const executeSource = executableSource.match(
    /async function execute\(contract, includePerformance\) \{([\s\S]*?)\n\}\n\nasync function main/,
  )?.[1];
  assert.ok(executeSource, 'the authoritative execute path must remain discoverable');
  assert.ok(
    executeSource.indexOf('captureExecutionPreflightRequirements({')
      < executeSource.indexOf("commandOutput('git', ['rev-parse', 'HEAD'])"),
    'closed environment requirements must fail before source capture',
  );
  assert.ok(
    executeSource.indexOf('attestExecutionStack({') < executeSource.indexOf('chromium.launch'),
    'the actual Docker stack must be attested before browser launch',
  );
  assert.match(
    executeSource,
    /const commitTreeIdAtStart = commandOutput\('git', \['rev-parse', `\$\{buildShaAtStart\}\^\{tree\}`\]\)/,
    'the build envelope commit tree must be derived from the exact bound commit',
  );
  assert.match(
    executeSource,
    /attestExecutionStack\(\{[\s\S]*?commitTreeId:\s*commitTreeIdAtStart/,
    'the authoritative stack attestation must consume the exact commit tree ID',
  );
  assert.ok(
    executeSource.indexOf('attestExecutionStack({') < executeSource.indexOf('createRunWorkspace('),
    'failed start attestation must not create a staging workspace',
  );
  assert.match(executeSource, /frontendBuildId:\s*stackPreflight\.frontendBuildId/);
  assert.match(executeSource, /backendBuildId:\s*stackPreflight\.backendBuildId/);
  assert.match(
    executeSource,
    /verifyFinalExecutionProvenance\([\s\S]*?stackPreflight\.verifyAtFinish/,
    'the same closed stack binding must be re-inspected before either final seal',
  );
  assert.doesNotMatch(
    executeSource,
    /(?:frontend|backend)BuildId:\s*sanitizeIdentifier\(process\.env/,
    'artifact provenance must come from the attested images, not unchecked environment text',
  );
});

test('protocol documents the exact run-scoped Docker attestation and closed failure boundary', () => {
  for (const variableName of [
    'UI_BASELINE_API_URL',
    'UI_BASELINE_FRONTEND_CONTAINER_ID',
    'UI_BASELINE_BACKEND_CONTAINER_ID',
    'UI_BASELINE_FRONTEND_CONTAINER_NAME',
    'UI_BASELINE_BACKEND_CONTAINER_NAME',
    'UI_BASELINE_DOCKER_PROJECT',
    'UI_BASELINE_DOCKER_NETWORK',
    'UI_BASELINE_BUILD_ATTESTATION_PATH',
    'UI_BASELINE_BUILD_ATTESTATION_SHA256',
  ]) assert.ok(
    baselineProtocolSource.includes(`\`${variableName}\``),
    `${variableName} must be present in the protocol environment table`,
  );
  assert.match(baselineProtocolSource, /docker inspect/i);
  assert.match(baselineProtocolSource, /docker image inspect/i);
  assert.match(baselineProtocolSource, /State\.Running[\s\S]*State\.Status[\s\S]*Health\.Status[\s\S]*RestartCount/);
  assert.match(baselineProtocolSource, /com\.docker\.compose\.project[\s\S]*com\.docker\.compose\.service/);
  assert.match(baselineProtocolSource, /org\.opencontainers\.image\.revision/);
  assert.match(baselineProtocolSource, /io\.egov\.ui-quality\.build-input-tree-sha256/);
  assert.match(baselineProtocolSource, /container projection은 provenance label을 읽지 않/i);
  assert.match(baselineProtocolSource, /payloadSha256[\s\S]*commitTreeId/);
  assert.match(baselineProtocolSource, /raw inspect[\s\S]*기록하지 않/i);
  assert.match(baselineProtocolSource, /CLI[\s\S]*timeout[\s\S]*malformed[\s\S]*multiple/i);
  assert.match(baselineProtocolSource, /artifactRoot[\s\S]*lstat[\s\S]*realpath/);
  assert.match(baselineProtocolSource, /path escape[\s\S]*symlink\/junction[\s\S]*non-directory ancestor/i);
  assert.match(baselineProtocolSource, /TOCTOU[\s\S]*repository 밖 publish/i);
});

test('exact-bound protocol and tooling paths force LF and reject a weakened Windows checkout rule', () => {
  assert.doesNotThrow(() => assertExactBoundLfAttributes(gitAttributesSource));

  const weakened = `${gitAttributesSource.trimEnd()}\n*.mjs text working-tree-encoding=UTF-8 eol=crlf\n`;
  assert.throws(
    () => assertExactBoundLfAttributes(weakened),
    /must resolve eol=lf/,
  );
});

test('protocol provenance hashes exact raw bytes and fails closed on missing or drifting input', () => {
  const lfBytes = Buffer.from('# UI baseline protocol\nstep: exact\n', 'utf8');
  const crlfBytes = Buffer.from('# UI baseline protocol\r\nstep: exact\r\n', 'utf8');
  const lfHash = captureProtocolFileHash(() => lfBytes);
  const crlfHash = captureProtocolFileHash(() => crlfBytes);

  assert.match(lfHash, /^[a-f0-9]{64}$/);
  assert.match(crlfHash, /^[a-f0-9]{64}$/);
  assert.notEqual(lfHash, crlfHash, 'protocol hashing must preserve exact raw file bytes');
  assert.doesNotThrow(() => assertStableProtocolFileHash(lfHash, lfHash));
  assert.throws(
    () => assertStableProtocolFileHash(lfHash, crlfHash),
    /baseline protocol changed during baseline execution/i,
  );
  assert.throws(
    () => assertStableProtocolFileHash('not-provided', 'not-provided'),
    /baseline protocol changed during baseline execution/i,
  );
  assert.throws(
    () => captureProtocolFileHash(() => {
      throw new Error('unsafe raw path detail');
    }),
    /baseline protocol file hash capture failed/i,
  );
  assert.throws(
    () => captureProtocolFileHash(() => '# decoded text is not raw bytes'),
    /baseline protocol file hash capture failed/i,
  );

  assert.equal(
    captureCommittedWorktreeFileHash({
      readWorktreeFile: () => lfBytes,
      readCommittedFile: () => Buffer.from(lfBytes),
    }),
    lfHash,
  );
  assert.throws(
    () => captureCommittedWorktreeFileHash({
      readWorktreeFile: () => crlfBytes,
      readCommittedFile: () => lfBytes,
    }),
    /differs from the bound build commit/i,
    'normalized Git cleanliness must not hide raw worktree/blob byte drift',
  );
  assert.throws(
    () => captureCommittedWorktreeFileHash({
      readWorktreeFile: () => 'decoded worktree text',
      readCommittedFile: () => lfBytes,
    }),
    /raw bytes/i,
  );
});

test('execution contract derives the exact protocol pointer and detects contract TOCTOU drift', () => {
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const captured = captureBaselineExecutionContract(() => manifestBytes);

  assert.equal(captured.protocolPointer, 'docs/04-operations/ui-ux-baseline-protocol.md');
  assert.equal(captured.executionScenarioManifestHash, sha256(stableJson(manifest)));
  assert.match(captured.executionPlanHash, /^[a-f0-9]{64}$/);
  assert.match(captured.manifestFileHash, /^[a-f0-9]{64}$/);
  assert.doesNotThrow(() => assertStableBaselineExecutionContract(captured, captured));

  const semanticallyIdenticalDifferentBytes = captureBaselineExecutionContract(
    () => Buffer.from(JSON.stringify(manifest), 'utf8'),
  );
  assert.throws(
    () => assertStableBaselineExecutionContract(captured, semanticallyIdenticalDifferentBytes),
    /baseline execution contract changed during baseline execution/i,
    'raw manifest bytes must remain stable across the contract-to-runner boundary',
  );

  const alternateExistingPointer = {
    ...manifest,
    protocol: 'docs/README.md',
  };
  assert.throws(
    () => captureBaselineExecutionContract(
      () => Buffer.from(JSON.stringify(alternateExistingPointer), 'utf8'),
    ),
    /canonical baseline protocol pointer/i,
    'another existing repository file must not split the protocol provenance source',
  );
  assert.throws(
    () => captureBaselineExecutionContract(() => '# decoded text is not raw bytes'),
    /baseline execution contract capture failed/i,
  );
});

test('authoritative runner consumes the captured execution contract and finalization helper', () => {
  const executableSource = runnerSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.match(executableSource, /captureBaselineExecutionContract\(\(\)\s*=>\s*readFileSync\(manifestPath\)\)/);
  assert.match(executableSource, /contract\.protocolPointer/);
  assert.match(executableSource, /assertStableBaselineExecutionContract\(/);
  assert.match(
    executableSource,
    /function baselineProtocolHash\(contract, buildSha\)[\s\S]*?boundSourceFileHash\(buildSha, contract\.protocolPointer\)/,
    'protocol provenance must bind exact worktree bytes to the canonical buildSha blob',
  );
  assert.match(
    executableSource,
    /function boundSourceFileHash\(buildSha, relativePath\)[\s\S]*?captureCommittedWorktreeFileHash\(\{[\s\S]*?readWorktreeFile:[\s\S]*?readFileSync\(absolutePath\)[\s\S]*?readCommittedFile:[\s\S]*?readCommittedFile\(buildSha, relativePath\)/,
    'bound source hashing must compare actual worktree and committed raw bytes',
  );
  assert.match(
    executableSource,
    /createProductionBuildInputTreeHash\(\{\s*trackedPaths:[^,]+,\s*readCommittedFile:/,
    'runner must derive build-input provenance from raw Git blob bytes at the bound build SHA',
  );
  assert.doesNotMatch(
    executableSource,
    /entries\.push\(`\$\{relativePath[^`]+sha256\(readFileSync\(absolutePath\)\)/,
    'working-tree line endings must not redefine committed build provenance',
  );
  assert.match(
    executableSource,
    /function toolingHashes\(buildSha\)[\s\S]*?runnerHash:\s*boundSourceFileHash\(buildSha,/,
    'tooling provenance must bind actual worktree bytes to buildSha before durable readback',
  );
  assert.match(
    executableSource,
    /createAutomatedRunProjection\(\{[\s\S]*?executionPlan:\s*plan,[\s\S]*?stateResults,[\s\S]*?performanceResults,[\s\S]*?scenarioSummaries:\s*runSummaries,[\s\S]*?\}\)/,
    'the final seal must receive the compact automated projection derived from actual run results',
  );
  assert.match(executableSource, /createAutomatedRunSeal\(\{[\s\S]*?automatedProjection,/);
  assert.doesNotMatch(
    executableSource,
    /(?:runner|core|runnerContract|scenarioContract)Hash:\s*sha256\(readFileSync\(/,
    'working-tree line endings must not redefine committed tooling provenance',
  );
  assert.equal(
    executableSource.match(/finalizeStagedRunPublication\s*\(\s*\{/g)?.length,
    2,
    'diagnostic and full execution branches must both consume the tested finalizer',
  );
  assert.match(
    executableSource,
    /createRunWorkspace\(\{\s*boundaryRoot:\s*repoRoot,\s*artifactRoot,\s*executionId,\s*diagnostic,\s*\}\)/,
    'the authoritative workspace must consume the physical repository boundary',
  );
  assert.equal(
    executableSource.match(/finalizeStagedRunPublication\(\{\s*publicationKind:\s*'(?:diagnostic|full)',\s*boundaryRoot:\s*repoRoot,/g)?.length,
    2,
    'both publication branches must consume the physical repository boundary',
  );
  assert.match(
    executableSource,
    /function writeSafeJson\([\s\S]*?ensureBoundedArtifactDirectory\(\{\s*boundaryRoot:\s*repoRoot,[\s\S]*?writeFileSync\(targetPath,[\s\S]*?assertBoundedArtifactDirectory\(\{\s*boundaryRoot:\s*repoRoot,/,
    'every staged JSON write must create and revalidate its parent within the repository boundary',
  );
  const executeSource = executableSource.match(
    /async function execute\(contract, includePerformance\) \{([\s\S]*?)\n\}\n\nasync function main/,
  )?.[1];
  assert.ok(executeSource, 'the authoritative execute path must remain discoverable');
  assert.ok(
    executeSource.indexOf("phase: 'initializing'") < executeSource.indexOf('chromium.launch'),
    'a fresh final:false progress marker must exist in staging before browser launch',
  );
  assert.match(executeSource, /const root = workspace\.stagingRoot/);
  assert.ok(
    executeSource.lastIndexOf("'run-summary.json'")
      < executeSource.lastIndexOf('finalizeStagedRunPublication({'),
    'all full-run evidence must be staged before the tested finalizer verifies and seals it',
  );
  assert.doesNotMatch(executableSource, /const baselineProtocolPath\s*=/);
  assert.doesNotMatch(
    executableSource,
    /protocolHash[^\n]*(?:not-provided|unknown|unavailable|null)/i,
  );
  assert.doesNotThrow(() => assertArtifactSafe(
    { protocolHash: captureProtocolFileHash(() => Buffer.from('protocol fixture')) },
    manifest.privacy.forbiddenArtifactKeys,
  ));
});

test('full-run finalization leaves the historical root untouched when finish verification turns red', () => {
  const fixture = createPublicationFixture('full-drift');
  const events = [];

  assert.throws(() => finalizeStagedRunPublication({
    publicationKind: 'full',
    boundaryRoot: fixture.boundaryRoot,
    stagingRoot: fixture.stagingRoot,
    publishedRoot: fixture.canonicalRoot,
    historyRoot: fixture.historyRoot,
    prepareFinalMarker: () => {
      events.push('prepare');
      return { inventoryDigest: 'a'.repeat(64) };
    },
    verifyFinalProvenance: () => {
      events.push('verify');
      throw new Error('protocol drift fixture');
    },
    createFinalMarker: () => ({ final: true }),
    writeFinalMarker: () => events.push('write'),
  }), /protocol drift fixture/);

  assert.deepEqual(events, ['prepare', 'verify']);
  assert.equal(readFileSync(join(fixture.canonicalRoot, 'historical-marker.json'), 'utf8'), '{"run":"r12"}\n');
  assert.ok(existsSync(join(fixture.stagingRoot, 'staged-marker.json')));
  assert.ok(!existsSync(fixture.historyRoot));
});

test('run workspace creation is physically bounded to normal repository directories', () => {
  const boundaryRoot = mkdtempSync(join(tmpdir(), 'uiq-workspace-safe-'));
  const artifactRoot = join(boundaryRoot, 'build', 'reports', 'ui-quality-baseline');
  const executionId = '00000000-0000-4000-8000-000000000013';

  const workspace = baselineCore.createRunWorkspace({
    boundaryRoot,
    artifactRoot,
    executionId,
    diagnostic: false,
  });

  assert.ok(existsSync(workspace.stagingRoot));
  assert.equal(workspace.publishedRoot, artifactRoot);
  assert.equal(
    workspace.historyRoot,
    join(boundaryRoot, 'build', 'reports', 'ui-quality-baseline-history', `pre-${executionId}-current`),
  );
});

test('run workspace rejects path escape, non-directory ancestors, and actual junction or directory symlink ancestors', () => {
  const executionId = '00000000-0000-4000-8000-000000000013';

  const escapedBoundary = mkdtempSync(join(tmpdir(), 'uiq-workspace-escape-boundary-'));
  const escapedTarget = mkdtempSync(join(tmpdir(), 'uiq-workspace-escape-target-'));
  assertArtifactBoundaryFailure(() => baselineCore.createRunWorkspace({
    boundaryRoot: escapedBoundary,
    artifactRoot: join(escapedTarget, 'ui-quality-baseline'),
    executionId,
    diagnostic: false,
  }));
  assert.deepEqual(readdirSync(escapedTarget), []);

  const fileBoundary = mkdtempSync(join(tmpdir(), 'uiq-workspace-file-'));
  writeFileSync(join(fileBoundary, 'build'), 'not-a-directory\n', 'utf8');
  assertArtifactBoundaryFailure(() => baselineCore.createRunWorkspace({
    boundaryRoot: fileBoundary,
    artifactRoot: join(fileBoundary, 'build', 'reports', 'ui-quality-baseline'),
    executionId,
    diagnostic: false,
  }));

  const linkedBoundary = mkdtempSync(join(tmpdir(), 'uiq-workspace-link-boundary-'));
  const linkedTarget = mkdtempSync(join(tmpdir(), 'uiq-workspace-link-target-'));
  mkdirSync(join(linkedBoundary, 'build'));
  createDirectoryLink(linkedTarget, join(linkedBoundary, 'build', 'reports'));
  assertArtifactBoundaryFailure(() => baselineCore.createRunWorkspace({
    boundaryRoot: linkedBoundary,
    artifactRoot: join(linkedBoundary, 'build', 'reports', 'ui-quality-baseline'),
    executionId,
    diagnostic: false,
  }));
  assert.deepEqual(readdirSync(linkedTarget), []);
});

test('finalization rejects an actual linked ancestor before callbacks or outside publication', () => {
  const boundaryRoot = mkdtempSync(join(tmpdir(), 'uiq-finalize-link-boundary-'));
  const linkedTarget = mkdtempSync(join(tmpdir(), 'uiq-finalize-link-target-'));
  mkdirSync(join(boundaryRoot, 'build'));
  mkdirSync(join(linkedTarget, '.staging-attempt'));
  writeFileSync(join(linkedTarget, '.staging-attempt', 'staged-marker.json'), '{}\n', 'utf8');
  createDirectoryLink(linkedTarget, join(boundaryRoot, 'build', 'reports'));
  const events = [];

  assertArtifactBoundaryFailure(() => finalizeStagedRunPublication({
    publicationKind: 'diagnostic',
    boundaryRoot,
    stagingRoot: join(boundaryRoot, 'build', 'reports', '.staging-attempt'),
    publishedRoot: join(boundaryRoot, 'build', 'reports', 'ui-quality-baseline-diagnostics', 'attempt'),
    prepareFinalMarker: () => events.push('prepare'),
    verifyFinalProvenance: () => events.push('verify'),
    createFinalMarker: () => ({ final: true }),
    writeFinalMarker: (stagingRoot) => {
      events.push('write');
      writeFileSync(join(stagingRoot, 'run-progress.json'), '{}\n', 'utf8');
    },
  }));

  assert.deepEqual(events, []);
  assert.ok(!existsSync(join(linkedTarget, '.staging-attempt', 'run-progress.json')));
});

test('finalization revalidates the physical boundary after marker preparation to close TOCTOU replacement', () => {
  const boundaryRoot = mkdtempSync(join(tmpdir(), 'uiq-finalize-toctou-boundary-'));
  const reportRoot = join(boundaryRoot, 'build', 'reports');
  const displacedReportRoot = join(boundaryRoot, 'displaced-reports');
  const linkedTarget = mkdtempSync(join(tmpdir(), 'uiq-finalize-toctou-target-'));
  const stagingRoot = join(reportRoot, '.staging-attempt');
  const publishedRoot = join(reportRoot, 'ui-quality-baseline');
  const historyRoot = join(reportRoot, 'ui-quality-baseline-history', 'pre-attempt-current');
  mkdirSync(stagingRoot, { recursive: true });
  mkdirSync(publishedRoot, { recursive: true });
  mkdirSync(join(linkedTarget, '.staging-attempt'));
  const events = [];

  assertArtifactBoundaryFailure(() => finalizeStagedRunPublication({
    publicationKind: 'full',
    boundaryRoot,
    stagingRoot,
    publishedRoot,
    historyRoot,
    prepareFinalMarker: () => {
      events.push('prepare');
      renameSync(reportRoot, displacedReportRoot);
      createDirectoryLink(linkedTarget, reportRoot);
      return {};
    },
    verifyFinalProvenance: () => events.push('verify'),
    createFinalMarker: () => ({ final: true }),
    writeFinalMarker: (targetRoot) => {
      events.push('write');
      writeFileSync(join(targetRoot, 'automated-run-seal.json'), '{}\n', 'utf8');
    },
  }));

  assert.deepEqual(events, ['prepare']);
  assert.ok(!existsSync(join(linkedTarget, '.staging-attempt', 'automated-run-seal.json')));
});

test('full-run publication writes the seal last, archives r12, and restores it if the swap fails', () => {
  const successful = createPublicationFixture('full-success');
  const successEvents = [];
  const result = finalizeStagedRunPublication({
    publicationKind: 'full',
    boundaryRoot: successful.boundaryRoot,
    stagingRoot: successful.stagingRoot,
    publishedRoot: successful.canonicalRoot,
    historyRoot: successful.historyRoot,
    prepareFinalMarker: () => {
      successEvents.push('prepare');
      return { inventoryDigest: 'b'.repeat(64) };
    },
    verifyFinalProvenance: () => {
      successEvents.push('verify');
      return { protocolHash: 'c'.repeat(64) };
    },
    createFinalMarker: (prepared, verified) => ({
      evidenceKind: 'automated-run-seal-v2',
      final: true,
      ...prepared,
      ...verified,
    }),
    writeFinalMarker: (stagingRoot, marker) => {
      successEvents.push('write');
      writeFileSync(join(stagingRoot, 'automated-run-seal.json'), `${JSON.stringify(marker)}\n`, 'utf8');
    },
    renamePath: (source, target) => {
      successEvents.push(`rename:${source === successful.canonicalRoot ? 'old' : 'staging'}`);
      mkdirSync(dirname(target), { recursive: true });
      renameSync(source, target);
    },
  });

  assert.deepEqual(successEvents, ['prepare', 'verify', 'write', 'rename:old', 'rename:staging']);
  assert.equal(result.publicationKind, 'full');
  assert.ok(existsSync(join(successful.canonicalRoot, 'automated-run-seal.json')));
  assert.ok(existsSync(join(successful.historyRoot, 'historical-marker.json')));

  const failed = createPublicationFixture('full-rollback');
  let swapAttempted = false;
  assert.throws(() => finalizeStagedRunPublication({
    publicationKind: 'full',
    boundaryRoot: failed.boundaryRoot,
    stagingRoot: failed.stagingRoot,
    publishedRoot: failed.canonicalRoot,
    historyRoot: failed.historyRoot,
    prepareFinalMarker: () => ({}),
    verifyFinalProvenance: () => ({}),
    createFinalMarker: () => ({ final: true }),
    writeFinalMarker: (stagingRoot, marker) => {
      writeFileSync(join(stagingRoot, 'automated-run-seal.json'), `${JSON.stringify(marker)}\n`, 'utf8');
    },
    renamePath: (source, target) => {
      if (source === failed.stagingRoot && target === failed.canonicalRoot) {
        swapAttempted = true;
        throw new Error('simulated second rename failure');
      }
      mkdirSync(dirname(target), { recursive: true });
      renameSync(source, target);
    },
  }), /simulated second rename failure/);
  assert.equal(swapAttempted, true);
  assert.equal(readFileSync(join(failed.canonicalRoot, 'historical-marker.json'), 'utf8'), '{"run":"r12"}\n');
  assert.ok(existsSync(join(failed.stagingRoot, 'automated-run-seal.json')));
  assert.ok(!existsSync(failed.historyRoot), 'rollback must restore the archived root to canonical');
});

test('diagnostic publication seals a unique run-scoped sibling without touching the canonical root', () => {
  const fixture = createPublicationFixture('diagnostic');
  const events = [];

  finalizeStagedRunPublication({
    publicationKind: 'diagnostic',
    boundaryRoot: fixture.boundaryRoot,
    stagingRoot: fixture.stagingRoot,
    publishedRoot: fixture.diagnosticRoot,
    prepareFinalMarker: () => {
      events.push('prepare');
      return {};
    },
    verifyFinalProvenance: () => {
      events.push('verify');
      return {};
    },
    createFinalMarker: () => ({
      evidenceKind: 'diagnostic-run-seal-v1',
      final: true,
    }),
    writeFinalMarker: (stagingRoot, marker) => {
      events.push('write');
      writeFileSync(join(stagingRoot, 'run-progress.json'), `${JSON.stringify(marker)}\n`, 'utf8');
    },
    renamePath: (source, target) => {
      events.push('rename');
      mkdirSync(dirname(target), { recursive: true });
      renameSync(source, target);
    },
  });

  assert.deepEqual(events, ['prepare', 'verify', 'write', 'rename']);
  assert.equal(readFileSync(join(fixture.canonicalRoot, 'historical-marker.json'), 'utf8'), '{"run":"r12"}\n');
  assert.ok(existsSync(join(fixture.diagnosticRoot, 'run-progress.json')));
  assert.ok(!existsSync(fixture.historyRoot));
});

test('automated projection is derived from the exact state and performance result population', () => {
  const executionPlan = buildExecutionPlan(manifest);
  const stateResults = executionPlan.stateCases.map((stateCase) => ({
    caseId: stateCase.caseId,
    status: 'automated-state-observed',
    invalidReasonCode: null,
    assertions: [{ id: 'bounded-contract-fixture', passed: true }],
    failedAssertionCount: 0,
    axe: [],
    axeViolationCount: 0,
    automatedFindingCodes: [],
    automatedOutcome: 'no-automated-finding-observed',
    responsive: { horizontalOverflowPx: 0 },
    taskEvidence: stateCase.requiredTaskEvidenceId === null ? [] : [
      createExecutedSyntheticMutationEvidence({
        id: stateCase.requiredTaskEvidenceId,
        caseId: stateCase.caseId,
        syntheticNamespace: 'uiq-baseline-mutation-v1',
        mutationObserved: 'observed',
        authoritativeReadback: 'observed',
        rollbackReadback: 'observed',
        cleanupReadback: 'zero-active-residue',
        activeResidueCount: 0,
      }),
    ],
  }));
  const stats = (value) => ({
    median: value,
    minimum: value,
    maximum: value,
    medianAbsoluteDeviation: 0,
  });
  const conditionSummary = (value) => ({
    routeJsTransferBytes: stats(value),
    lcpMs: stats(value),
    cls: stats(0),
    readinessLatencyProxyMs: stats(value),
  });
  const performanceResults = executionPlan.performanceCases.map((performanceCase, index) => {
    const value = index + 1;
    return {
      renderCaseId: performanceCase.renderCaseId,
      status: 'lab-performance-observed',
      invalidReasonCode: null,
      failureStage: null,
      conditionRuns: ['cold', 'warm'].flatMap((condition) => Array.from(
        { length: 3 },
        (_, repetition) => ({
          condition,
          repetition: repetition + 1,
          metrics: {
            routeJsTransferBytes: value,
            lcpMs: value,
            cls: 0,
            readinessLatencyProxyMs: value,
          },
        }),
      )),
      summary: {
        cold: conditionSummary(value),
        warm: conditionSummary(value),
      },
    };
  });
  const scenarioSummaries = manifest.scenarios.map(({ id }) => ({
    scenarioId: id,
    status: 'partial-automated-evidence',
    plannedCaseCount: executionPlan.stateCases.filter(({ scenarioId }) => scenarioId === id).length,
    invalidCaseCount: 0,
    plannedPerformanceCaseCount: 6,
    completedPerformanceCaseCount: 6,
    invalidPerformanceCaseCount: 0,
    axeViolationCaseCount: 0,
    failedAssertionCaseCount: 0,
  }));
  const projection = createAutomatedRunProjection({
    executionPlan,
    stateResults,
    performanceResults,
    scenarioSummaries,
  });

  assert.equal(projection.stateCases.length, 96);
  assert.equal(projection.performance.length, 48);
  assert.equal(projection.performanceConditionRunCount, 288);
  assert.equal(projection.mutationRequiredCaseCount, 36);
  assert.ok(projection.scenarios.every(({ status }) => status === 'measured'));

  const changedPerformanceResults = structuredClone(performanceResults);
  for (const run of changedPerformanceResults[0].conditionRuns) {
    if (run.condition === 'cold') run.metrics.lcpMs += 1;
  }
  changedPerformanceResults[0].summary.cold.lcpMs = stats(2);
  const changedProjection = createAutomatedRunProjection({
    executionPlan,
    stateResults,
    performanceResults: changedPerformanceResults,
    scenarioSummaries,
  });
  assert.notEqual(
    sha256(Buffer.from(`${stableJson(changedProjection)}\n`, 'utf8')),
    sha256(Buffer.from(`${stableJson(projection)}\n`, 'utf8')),
  );
  assert.throws(
    () => createAutomatedRunProjection({
      executionPlan,
      stateResults: stateResults.slice(1),
      performanceResults,
      scenarioSummaries,
    }),
    /exact completed execution population/i,
  );
});

test('automated run seal binds paths, canonical bytes and the compact automated projection', () => {
  const executionId = createBaselineExecutionId(
    () => '123e4567-e89b-42d3-a456-426614174000',
  );
  assert.throws(
    () => createBaselineExecutionId(() => 'attempt-1'),
    /execution id generation failed/i,
  );
  const provenance = {
    baselineRunId: 'r13',
    executionId,
    runnerVersion: 2,
    startedAt: '2026-08-22T00:00:00.000Z',
    finishedAt: '2026-08-22T00:15:00.000Z',
    protocolHash: '1'.repeat(64),
    buildSha: 'a'.repeat(40),
    buildInputTreeHash: '2'.repeat(64),
    dirtyBuildInputDiffHash: null,
    executionScenarioManifestHash: '3'.repeat(64),
    executionPlanHash: '4'.repeat(64),
    routeTruthHash: '5'.repeat(64),
    privacyRuleHash: '6'.repeat(64),
    runnerHash: '7'.repeat(64),
    coreHash: '8'.repeat(64),
    runnerContractHash: '9'.repeat(64),
    scenarioContractHash: 'a'.repeat(64),
    frontendBuildId: `sha256:${'b'.repeat(64)}`,
    backendBuildId: `sha256:${'c'.repeat(64)}`,
  };
  const identity = { baselineRunId: 'r13', executionId };
  const asEntry = (relativePath, value) => ({
    relativePath,
    bytes: Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'),
  });
  const executionPlan = buildExecutionPlan(manifest);
  provenance.executionPlanHash = sha256(stableJson(executionPlan));
  const scenarios = manifest.scenarios.map(({ id }) => ({
    scenarioId: id,
    plannedCaseCount: executionPlan.stateCases.filter(({ scenarioId }) => scenarioId === id).length,
    invalidCaseCount: 0,
    plannedPerformanceCaseCount: 6,
    completedPerformanceCaseCount: 6,
    invalidPerformanceCaseCount: 0,
  }));
  const runSummary = {
    ...identity,
    runnerVersion: provenance.runnerVersion,
    startedAt: provenance.startedAt,
    finishedAt: provenance.finishedAt,
    buildSha: provenance.buildSha,
    manifestHash: provenance.executionScenarioManifestHash,
    executionPlanHash: provenance.executionPlanHash,
    protocolHash: provenance.protocolHash,
    scenarioCount: 8,
    plannedRenderCaseCount: 48,
    plannedStateCaseCount: 96,
    includePerformance: true,
    scenarios,
  };
  const runProgress = {
    ...identity,
    runnerVersion: provenance.runnerVersion,
    startedAt: provenance.startedAt,
    phase: 'complete',
    plannedStateCaseCount: 96,
    completedStateCaseCount: 96,
    invalidStateCaseCount: 0,
    plannedPerformanceCaseCount: 48,
    completedPerformanceCaseCount: 48,
    invalidPerformanceCaseCount: 0,
    final: true,
  };
  const environment = {
    ...identity,
    runnerVersion: provenance.runnerVersion,
    startedAt: provenance.startedAt,
    buildSha: provenance.buildSha,
    manifestHash: provenance.executionScenarioManifestHash,
    executionPlanHash: provenance.executionPlanHash,
    protocolPath: manifest.protocol,
    protocolHash: provenance.protocolHash,
    protocolHashVerifiedAtFinish: true,
    buildInputTreeHash: provenance.buildInputTreeHash,
    buildInputTreeHashVerifiedAtFinish: true,
    dirtyBuildInputDiffHash: null,
    dirtyBuildInputDiffHashVerifiedAtFinish: true,
    routeTruthHash: provenance.routeTruthHash,
    privacyRuleHash: provenance.privacyRuleHash,
    runnerHash: provenance.runnerHash,
    coreHash: provenance.coreHash,
    runnerContractHash: provenance.runnerContractHash,
    scenarioContractHash: provenance.scenarioContractHash,
    frontendBuildId: provenance.frontendBuildId,
    backendBuildId: provenance.backendBuildId,
  };
  const entries = [
    asEntry('run-summary.json', runSummary),
    asEntry('run-progress.json', runProgress),
    ...manifest.scenarios.map(({ id }) => asEntry(`${id}/environment.json`, environment)),
  ];
  for (const { id } of manifest.scenarios) {
    for (const relativePath of [
      `${id}/manifest-snapshot.json`,
      `${id}/task-observations.json`,
      `${id}/manual/manual-checks.json`,
      `${id}/baseline-result.json`,
    ]) entries.push(asEntry(relativePath, {
      ...identity,
      status: 'synthetic-contract-fixture',
      artifactSlot: relativePath,
    }));
  }
  for (const stateCase of executionPlan.stateCases) {
    entries.push(asEntry(`checkpoints/${stateCase.caseId}.json`, {
      ...identity,
      caseId: stateCase.caseId,
    }));
    entries.push(asEntry(`${stateCase.scenarioId}/axe/${stateCase.caseId}.json`, {
      ...identity,
      caseId: stateCase.caseId,
    }));
  }
  for (const performanceCase of executionPlan.performanceCases) {
    entries.push(asEntry(
      `${performanceCase.scenarioId}/performance/${performanceCase.renderCaseId}.json`,
      {
        ...identity,
        renderCaseId: performanceCase.renderCaseId,
      },
    ));
  }
  assert.equal(entries.length, 282);

  const stateCases = executionPlan.stateCases.map((stateCase) => ({
    caseId: stateCase.caseId,
    scenarioId: stateCase.scenarioId,
    status: 'automated-state-observed',
    automatedOutcome: 'no-automated-finding-observed',
    assertionCount: 1,
    passedAssertionCount: 1,
    failedAssertionCount: 0,
    axeViolationCount: 0,
    horizontalOverflowPx: 0,
    findingCount: 0,
    requiredTaskEvidenceId: stateCase.requiredTaskEvidenceId,
    taskEvidenceComplete: stateCase.requiredTaskEvidenceId !== null,
  })).sort((left, right) => left.caseId.localeCompare(right.caseId));
  const stats = (value) => ({
    minimum: value,
    median: value,
    maximum: value,
    medianAbsoluteDeviation: 0,
  });
  const condition = (value) => ({
    routeJsTransferBytes: stats(value),
    lcpMs: stats(value),
    cls: stats(0),
    readinessLatencyProxyMs: stats(value),
  });
  const performance = executionPlan.performanceCases.map((performanceCase, index) => ({
    renderCaseId: performanceCase.renderCaseId,
    scenarioId: performanceCase.scenarioId,
    status: 'lab-performance-observed',
    cold: condition(index + 1),
    warm: condition(index + 1),
  })).sort((left, right) => left.renderCaseId.localeCompare(right.renderCaseId));
  const mutationCount = stateCases.filter(({ requiredTaskEvidenceId }) => (
    requiredTaskEvidenceId !== null
  )).length;
  const automatedProjection = {
    scenarioCount: 8,
    renderCaseCount: 48,
    plannedStateCaseCount: 96,
    observedStateCaseCount: 96,
    invalidStateCaseCount: 0,
    plannedPerformanceCaseCount: 48,
    observedPerformanceCaseCount: 48,
    invalidPerformanceCaseCount: 0,
    performanceConditionRunCount: 288,
    assertionCount: 96,
    passedAssertionCount: 96,
    failedAssertionCount: 0,
    mutationRequiredCaseCount: mutationCount,
    mutationExecutedCaseCount: mutationCount,
    mutationReadbackCaseCount: mutationCount,
    mutationRollbackCaseCount: mutationCount,
    mutationCleanupCaseCount: mutationCount,
    activeMutationResidueCount: 0,
    nonMutationEmptyEvidenceCaseCount: 96 - mutationCount,
    axeViolationCaseCount: 0,
    axeViolationNodeCount: 0,
    horizontalOverflowCaseCount: 0,
    findingCount: 0,
    stateCases,
    scenarios: manifest.scenarios.map(({ id }) => ({
      scenarioId: id,
      plannedStateCaseCount: stateCases.filter(({ scenarioId }) => scenarioId === id).length,
      observedStateCaseCount: stateCases.filter(({ scenarioId }) => scenarioId === id).length,
      invalidStateCaseCount: 0,
      plannedPerformanceCaseCount: 6,
      observedPerformanceCaseCount: 6,
      invalidPerformanceCaseCount: 0,
      axeViolationCaseCount: 0,
      failedAssertionCaseCount: 0,
      status: 'measured',
    })).sort((left, right) => left.scenarioId.localeCompare(right.scenarioId)),
    performance,
  };
  const seal = createAutomatedRunSeal({
    artifactEntries: entries,
    automatedProjection,
    provenance,
    executionPlan,
  });
  assert.equal(seal.evidenceKind, 'automated-run-seal-v2');
  assert.equal(seal.baselineRunId, 'r13');
  assert.equal(seal.executionId, executionId);
  assert.equal(seal.final, true);
  assert.deepEqual(Object.keys(seal).sort(), [
    'evidenceKind', 'baselineRunId', 'executionId', 'status', 'final',
    'runnerVersion', 'startedAt', 'finishedAt', 'runSummaryDigest',
    'runProgressDigest', 'environmentDigest', 'protocolHash',
    'protocolHashVerifiedAtFinish', 'buildSha', 'buildInputTreeHash',
    'dirtyBuildInputDiffHash', 'executionScenarioManifestHash', 'executionPlanHash',
    'routeTruthHash', 'privacyRuleHash', 'runnerHash', 'coreHash',
    'runnerContractHash', 'scenarioContractHash', 'frontendBuildId',
    'backendBuildId', 'automatedInventoryDigest', 'automatedProjectionDigest',
    'plannedStateCaseCount', 'completedStateCaseCount', 'invalidStateCaseCount',
    'plannedPerformanceCaseCount', 'completedPerformanceCaseCount',
    'invalidPerformanceCaseCount', 'sealDigest',
  ].sort());
  const expectedInventoryRecords = entries.map(({ relativePath, bytes }) => ({
    relativePath,
    contentDigest: sha256(bytes),
  })).sort((left, right) => (
    left.relativePath < right.relativePath ? -1 : Number(left.relativePath > right.relativePath)
  ));
  assert.equal(
    seal.automatedInventoryDigest,
    sha256(Buffer.from(`${stableJson(expectedInventoryRecords)}\n`, 'utf8')),
  );
  assert.equal(
    seal.automatedProjectionDigest,
    sha256(Buffer.from(`${stableJson(automatedProjection)}\n`, 'utf8')),
  );
  assert.equal(seal.runSummaryDigest, sha256(entries[0].bytes));
  assert.equal(seal.runProgressDigest, sha256(entries[1].bytes));
  assert.equal(seal.environmentDigest, aggregateArtifactContentDigest(
    entries.slice(2, 10).map(({ bytes }) => bytes),
  ));
  const sealProjection = Object.fromEntries(
    Object.entries(seal).filter(([key]) => key !== 'sealDigest'),
  );
  assert.equal(seal.sealDigest, sha256(Buffer.from(`${stableJson(sealProjection)}\n`, 'utf8')));

  const mixed = [...entries];
  mixed[10] = asEntry(mixed[10].relativePath, {
    baselineRunId: 'r13',
    executionId: '123e4567-e89b-42d3-a456-426614174001',
  });
  assert.throws(
    () => createAutomatedRunSeal({
      artifactEntries: mixed,
      automatedProjection,
      provenance,
      executionPlan,
    }),
    /mixed execution identity/i,
  );
  const swappedSlots = entries.map((entry) => ({ ...entry }));
  [swappedSlots[10].bytes, swappedSlots[11].bytes] = [
    swappedSlots[11].bytes,
    swappedSlots[10].bytes,
  ];
  assert.equal(
    aggregateArtifactContentDigest(swappedSlots.map(({ bytes }) => bytes)),
    aggregateArtifactContentDigest(entries.map(({ bytes }) => bytes)),
    'the legacy content-only digest cannot detect a cross-slot swap',
  );
  const swappedSeal = createAutomatedRunSeal({
    artifactEntries: swappedSlots,
    automatedProjection,
    provenance,
    executionPlan,
  });
  assert.notEqual(swappedSeal.automatedInventoryDigest, seal.automatedInventoryDigest);

  const mutatedProjection = structuredClone(automatedProjection);
  mutatedProjection.performance[0].cold.lcpMs.median += 1;
  const projectionMutatedSeal = createAutomatedRunSeal({
    artifactEntries: entries,
    automatedProjection: mutatedProjection,
    provenance,
    executionPlan,
  });
  assert.notEqual(projectionMutatedSeal.automatedProjectionDigest, seal.automatedProjectionDigest);
  assert.notEqual(projectionMutatedSeal.sealDigest, seal.sealDigest);

  const noncanonical = entries.map((entry) => ({ ...entry }));
  noncanonical[10].bytes = Buffer.from(JSON.stringify(
    JSON.parse(noncanonical[10].bytes.toString('utf8')),
  ), 'utf8');
  assert.throws(
    () => createAutomatedRunSeal({
      artifactEntries: noncanonical,
      automatedProjection,
      provenance,
      executionPlan,
    }),
    /canonical JSON artifact bytes/i,
  );
  const substitutedPath = [...entries];
  substitutedPath[substitutedPath.length - 1] = {
    ...substitutedPath.at(-1),
    relativePath: 'checkpoints/substituted-existing-shape.json',
  };
  assert.throws(
    () => createAutomatedRunSeal({
      artifactEntries: substitutedPath,
      automatedProjection,
      provenance,
      executionPlan,
    }),
    /artifact path population is incomplete/i,
  );
  assert.throws(
    () => createAutomatedRunSeal({
      artifactEntries: entries,
      automatedProjection,
      provenance: { ...provenance, dirtyBuildInputDiffHash: 'f'.repeat(64) },
      executionPlan,
    }),
    /provenance is incomplete/i,
    'a combined-eligible r13 seal must come from a clean production build-input tree',
  );
});

test('dirty build-input fingerprint canonically covers tracked, staged, deleted and untracked inputs', () => {
  const contents = new Map([
    ['frontend/src/tracked.ts', Buffer.from('tracked-current')],
    ['frontend/src/staged.ts', Buffer.from('staged-current')],
    ['frontend/src/untracked.ts', Buffer.from('untracked-current')],
  ]);
  const reads = [];
  const readSelectedFile = (relativePath) => {
    reads.push(relativePath);
    const value = contents.get(relativePath);
    if (!value) throw new Error(`unexpected fixture read: ${relativePath}`);
    return value;
  };
  const trackedChanges = [
    { status: 'M', path: 'frontend/src/tracked.ts' },
    { status: 'A', path: 'frontend/src/staged.ts' },
    { status: 'D', path: 'frontend/src/deleted.ts' },
  ];
  const untrackedPaths = ['frontend/src/untracked.ts'];

  const fingerprint = createDirtyBuildInputFingerprint({
    trackedChanges,
    untrackedPaths,
    readSelectedFile,
  });
  const reordered = createDirtyBuildInputFingerprint({
    trackedChanges: [...trackedChanges].reverse(),
    untrackedPaths: [...untrackedPaths].reverse(),
    readSelectedFile,
  });

  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(reordered, fingerprint, 'input ordering must not affect the fingerprint');
  assert.ok(!reads.includes('frontend/src/deleted.ts'), 'deleted input must not be read');
  assert.equal(createDirtyBuildInputFingerprint({
    trackedChanges: [],
    untrackedPaths: [],
    readSelectedFile,
  }), null);

  contents.set('frontend/src/tracked.ts', Buffer.from('tracked-changed-again'));
  assert.notEqual(createDirtyBuildInputFingerprint({
    trackedChanges,
    untrackedPaths,
    readSelectedFile,
  }), fingerprint, 'selected content changes must change the fingerprint');
});

test('dirty build-input fingerprint never reads private or ignored candidates and fails closed', () => {
  const excluded = [
    'frontend/.env.e2e',
    'frontend/src/.env.private',
    'frontend/playwright/.auth/admin.json',
    'frontend/src/private-key.pem',
    'frontend/src/test-results/result.json',
    'api-server/src/main/resources/application-local.yml',
    'api-server/build/libs/app.jar',
  ];
  const reads = [];
  const fingerprint = createDirtyBuildInputFingerprint({
    trackedChanges: [
      { status: 'M', path: 'frontend/src/selected.ts' },
      ...excluded.map((path) => ({ status: 'M', path })),
    ],
    untrackedPaths: [
      'frontend/src/new-selected.ts',
      ...excluded,
    ],
    readSelectedFile: (relativePath) => {
      reads.push(relativePath);
      if (excluded.includes(relativePath)) throw new Error('excluded fixture was touched');
      return Buffer.from(`fixture:${relativePath}`);
    },
  });

  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(reads.sort(), [
    'frontend/src/new-selected.ts',
    'frontend/src/selected.ts',
  ]);
  assert.doesNotMatch(fingerprint, /selected|fixture|private|auth/i);
  assert.doesNotThrow(() => assertArtifactSafe(
    { dirtyBuildInputDiffHash: fingerprint },
    manifest.privacy.forbiddenArtifactKeys,
  ));
  assert.throws(
    () => createDirtyBuildInputFingerprint({
      trackedChanges: [{ status: 'R100', path: 'frontend/src/renamed.ts' }],
      untrackedPaths: [],
      readSelectedFile: () => Buffer.from('fixture'),
    }),
    /unsupported dirty build input status/i,
  );
  assert.throws(
    () => requireDirtyBuildInputFingerprint(() => {
      throw new Error('raw git failure fixture');
    }),
    /preflight could not fingerprint dirty production build inputs/i,
  );
  assert.throws(
    () => requireDirtyBuildInputFingerprint(() => 'not-a-sha256'),
    /preflight could not fingerprint dirty production build inputs/i,
  );
  assert.equal(requireDirtyBuildInputFingerprint(() => null), null);

  assert.doesNotThrow(() => assertStableDirtyBuildInputFingerprint(null, null));
  assert.doesNotThrow(() => assertStableDirtyBuildInputFingerprint(fingerprint, fingerprint));
  assert.throws(
    () => assertStableDirtyBuildInputFingerprint(null, fingerprint),
    /dirty production build inputs changed during baseline execution/i,
  );
  assert.throws(
    () => assertStableDirtyBuildInputFingerprint(fingerprint, 'f'.repeat(64)),
    /dirty production build inputs changed during baseline execution/i,
  );
});

test('runner and protocol bind a privacy-safe dirty build-input fingerprint at start and finish', () => {
  assert.match(runnerSource, /git[\s\S]*diff[\s\S]*--name-status[\s\S]*--no-renames[\s\S]*HEAD/);
  assert.match(runnerSource, /ls-tree[\s\S]*--name-only[\s\S]*HEAD/);
  assert.match(runnerSource, /ls-files[\s\S]*--cached/);
  assert.match(runnerSource, /git[\s\S]*ls-files[\s\S]*--others[\s\S]*--exclude-standard/);
  assert.match(
    runnerSource,
    /function selectedTrackedBuildInputPaths\(\)[\s\S]*selectProductionBuildInputPaths[\s\S]*'ls-tree'[\s\S]*'ls-files', '--cached'/,
  );
  assert.match(
    runnerSource,
    /function trackedBuildInputChanges\(selectedPaths\)[\s\S]*boundedPathChunks\(selectedPaths\)[\s\S]*'diff'[\s\S]*\.\.\.selectedPathChunk/,
  );
  assert.match(
    runnerSource,
    /function untrackedBuildInputPaths\(\)[\s\S]*selectProductionBuildInputPaths\(gitNullTerminatedFields[\s\S]*'--exclude-standard'/,
  );
  assert.match(
    runnerSource,
    /trackedChanges:\s*trackedBuildInputChanges\(selectedTrackedBuildInputPaths\(\)\)/,
  );
  assert.match(runnerSource, /dirtyBuildInputDiffHashAtStart\s*=\s*dirtyBuildInputFingerprint\(\)/);
  assert.match(runnerSource, /dirtyBuildInputDiffHashAtFinish\s*=\s*dirtyBuildInputFingerprint\(\)/);
  assert.match(
    runnerSource,
    /assertStableDirtyBuildInputFingerprint\(\s*dirtyBuildInputDiffHashAtStart,\s*dirtyBuildInputDiffHashAtFinish,?\s*\)/,
  );
  assert.match(runnerSource, /dirtyBuildInputDiffHash:\s*dirtyBuildInputDiffHashAtStart/);
  assert.match(runnerSource, /dirtyBuildInputDiffHashVerifiedAtFinish:\s*true/);
  assert.doesNotMatch(runnerSource, /dirtyBuildInputDiff(?:Hash)?:[^\n]*(?:not-provided|unknown|unavailable)/i);
  assert.match(baselineProtocolSource, /dirtyBuildInputDiffHash/);
  assert.match(baselineProtocolSource, /64-hex/);
  assert.match(baselineProtocolSource, /원문 diff|raw diff/i);
});

test('performance observation requires exact repeats and finite required metrics', () => {
  const repeatPolicy = manifest.repeatPolicy;
  const run = (condition, repetition, overrides = {}) => ({
    condition,
    repetition,
    metrics: {
      routeJsTransferBytes: 1024,
      lcpMs: 250,
      cls: 0,
      readinessLatencyProxyMs: 120,
      ...overrides,
    },
  });
  const complete = [
    ...[1, 2, 3].map((repetition) => run('cold', repetition)),
    ...[1, 2, 3].map((repetition) => run('warm', repetition)),
  ];

  assert.deepEqual(classifyPerformanceObservation(complete, repeatPolicy), {
    status: 'lab-performance-observed',
    invalidReasonCode: null,
    failureStage: null,
  });
  assert.deepEqual(classifyPerformanceObservation(complete.slice(0, -1), repeatPolicy), {
    status: 'invalid-run',
    invalidReasonCode: 'performance-repetition-incomplete',
    failureStage: 'repeat-validation',
  });
  assert.deepEqual(classifyPerformanceObservation([
    ...complete,
    run('decoy', 1),
  ], repeatPolicy), {
    status: 'invalid-run',
    invalidReasonCode: 'performance-repetition-incomplete',
    failureStage: 'repeat-validation',
  });
  const duplicateRepeat = structuredClone(complete);
  duplicateRepeat.at(-1).repetition = 2;
  assert.deepEqual(classifyPerformanceObservation(duplicateRepeat, repeatPolicy), {
    status: 'invalid-run',
    invalidReasonCode: 'performance-repetition-incomplete',
    failureStage: 'repeat-validation',
  });
  const noLcp = complete.map((entry) => ({
    ...entry,
    metrics: { ...entry.metrics, lcpMs: null },
  }));
  assert.deepEqual(classifyPerformanceObservation(noLcp, repeatPolicy), {
    status: 'invalid-run',
    invalidReasonCode: 'required-performance-metric-not-observed',
    failureStage: 'metric-validation',
  });
  const oneMissingLcp = complete.map((entry, index) => (index === 1
    ? { ...entry, metrics: { ...entry.metrics, lcpMs: null } }
    : entry));
  assert.equal(
    classifyPerformanceObservation(oneMissingLcp, repeatPolicy).invalidReasonCode,
    'required-performance-metric-not-observed',
    'every required metric must be finite in every planned repetition',
  );
  const nonFinite = complete.map((entry) => ({
    ...entry,
    metrics: { ...entry.metrics, readinessLatencyProxyMs: Number.NaN },
  }));
  assert.equal(
    classifyPerformanceObservation(nonFinite, repeatPolicy).invalidReasonCode,
    'required-performance-metric-not-observed',
  );
});

test('LCP delivery gets a bounded observer-drain window without inventing a no-candidate value', async () => {
  let delayedReads = 0;
  let delayedFrames = 0;
  const delayed = await observeLcpWithinBoundedFrames({
    readObserved: async () => {
      delayedReads += 1;
      return delayedReads >= 3;
    },
    advanceFrame: async () => { delayedFrames += 1; },
    maxFrames: 4,
  });

  assert.deepEqual(delayed, {
    status: 'observed',
    polls: 3,
    framesWaited: 2,
  });
  assert.equal(delayedFrames, 2);

  let emptyFrames = 0;
  const noCandidate = await observeLcpWithinBoundedFrames({
    readObserved: async () => false,
    advanceFrame: async () => { emptyFrames += 1; },
    maxFrames: 2,
  });
  assert.deepEqual(noCandidate, {
    status: 'not-observed-after-bounded-wait',
    polls: 3,
    framesWaited: 2,
  });
  assert.equal(emptyFrames, 2);
  assert.notEqual(noCandidate.status, 'observed');
});

test('responsive geometry requires consecutive stable samples and preserves persistent overflow evidence', async () => {
  const geometry = (scrollWidth, offenders = []) => ({
    scrollWidth,
    clientWidth: 320,
    viewportWidth: 320,
    themeClassMatchesPreference: true,
    offenders,
  });

  const transientSamples = [geometry(324), geometry(321), geometry(321), geometry(321)];
  let transientIndex = 0;
  const transient = await observeStableResponsiveGeometry({
    readSample: async () => transientSamples[transientIndex++],
    advanceFrame: async () => undefined,
    requiredConsecutiveSamples: 3,
    maxSamples: transientSamples.length,
  });
  assert.equal(transient.status, 'stable');
  assert.equal(transient.sample.horizontalOverflowPx, 1);
  assert.equal(transient.maxHorizontalOverflowPxObserved, 4);
  assert.equal(transient.sampleCount, 4);
  assert.equal(transient.consecutiveStableSamples, 3);
  assert.ok(!('samples' in transient), 'raw geometry sample history must not reach the artifact');

  const unsafeMetadata = {
    tag: 'DIV',
    role: 'alert',
    side: 'inline-end',
    overflowPx: 4,
    id: 'private-record-id',
    className: 'private-class',
    textContent: 'private content',
  };
  const persistentSamples = Array.from({ length: 3 }, () => geometry(324, [unsafeMetadata]));
  let persistentIndex = 0;
  const persistent = await observeStableResponsiveGeometry({
    readSample: async () => persistentSamples[persistentIndex++],
    advanceFrame: async () => undefined,
    requiredConsecutiveSamples: 3,
    maxSamples: persistentSamples.length,
  });
  assert.equal(persistent.status, 'stable');
  assert.equal(persistent.sample.horizontalOverflowPx, 4);
  assert.deepEqual(persistent.sample.offenders, [{
    tag: 'div',
    role: 'alert',
    side: 'inline-end',
    overflowPx: 4,
  }]);
  assert.doesNotThrow(() => assertArtifactSafe(persistent, manifest.privacy.forbiddenArtifactKeys));
  assert.ok(classifyAutomatedCaseOutcome({
    horizontalOverflowPx: persistent.sample.horizontalOverflowPx,
  }).findingCodes.includes('page-horizontal-overflow'));
  assert.ok(!classifyAutomatedCaseOutcome({
    horizontalOverflowPx: 1,
  }).findingCodes.includes('page-horizontal-overflow'));
  assert.ok(classifyAutomatedCaseOutcome({
    horizontalOverflowPx: 1.01,
  }).findingCodes.includes('page-horizontal-overflow'));

  const unstableSamples = [geometry(324), geometry(321), geometry(324), geometry(321)];
  let unstableIndex = 0;
  const unstable = await observeStableResponsiveGeometry({
    readSample: async () => unstableSamples[unstableIndex++],
    advanceFrame: async () => undefined,
    requiredConsecutiveSamples: 3,
    maxSamples: unstableSamples.length,
  });
  assert.equal(unstable.status, 'unstable-after-bounded-sampling');
  assert.deepEqual(classifyAutomatedCaseOutcome({ responsiveGeometryStable: false }), {
    status: 'invalid-run',
    outcome: 'automated-observation-invalid',
    findingCodes: ['responsive-geometry-not-stable'],
  });
});

test('visual readiness requires a bounded delivery window and stable privacy-safe state before axe', async () => {
  const sample = (motionStyleHash, overrides = {}) => ({
    motionStyleHash,
    motionElementCount: 2,
    activeAnimationCount: 0,
    busyElementCount: 0,
    documentTitlePresent: true,
    ...overrides,
  });
  const hashes = [
    'a'.repeat(64),
    'a'.repeat(64),
    'a'.repeat(64),
    'b'.repeat(64),
    'b'.repeat(64),
    'b'.repeat(64),
  ];
  let index = 0;
  let advances = 0;
  const stable = await observeStableVisualReadiness({
    readSample: async () => sample(hashes[index++]),
    advanceFrame: async () => { advances += 1; },
    minimumSamples: 4,
    requiredConsecutiveSamples: 3,
    maxSamples: hashes.length,
  });
  assert.deepEqual(stable, {
    status: 'ready',
    sampleCount: 6,
    consecutiveStableSamples: 3,
  });
  assert.equal(advances, 5);
  assert.doesNotMatch(JSON.stringify(stable), /motionStyleHash|rawText|selector|locator|path/i);

  for (const blockedField of ['activeAnimationCount', 'busyElementCount']) {
    const blocked = await observeStableVisualReadiness({
      readSample: async () => sample('c'.repeat(64), { [blockedField]: 1 }),
      advanceFrame: async () => {},
      minimumSamples: 2,
      requiredConsecutiveSamples: 2,
      maxSamples: 3,
    });
    assert.equal(blocked.status, 'not-ready-after-bounded-sampling');
    assert.equal(blocked.sampleCount, 3);
  }

  const untitled = await observeStableVisualReadiness({
    readSample: async () => sample('d'.repeat(64), { documentTitlePresent: false }),
    advanceFrame: async () => {},
    minimumSamples: 2,
    requiredConsecutiveSamples: 2,
    maxSamples: 3,
  });
  assert.equal(untitled.status, 'not-ready-after-bounded-sampling');

  await assert.rejects(
    observeStableVisualReadiness({
      readSample: async () => sample('not-a-safe-hash'),
      advanceFrame: async () => {},
      minimumSamples: 2,
      requiredConsecutiveSamples: 2,
      maxSamples: 3,
    }),
    /visual readiness sample/i,
  );
});

test('state audit cancels motion before interaction and settles geometry before axe', () => {
  const stabilizationStart = runnerSource.indexOf('async function disableAnimations(page)');
  const stabilizationEnd = runnerSource.indexOf('\nasync function ', stabilizationStart + 1);
  const stabilizationSource = runnerSource.slice(stabilizationStart, stabilizationEnd);
  assert.ok(stabilizationStart >= 0 && stabilizationEnd > stabilizationStart);
  assert.match(stabilizationSource, /animation:\s*none !important/);
  assert.match(stabilizationSource, /transition:\s*none !important/);
  assert.doesNotMatch(stabilizationSource, /animation-duration:\s*0s/);
  assert.match(stabilizationSource, /document\.getAnimations\(\)/);
  assert.match(stabilizationSource, /animation\.finish\(\)/);
  assert.match(
    runnerSource,
    /async function waitForStandardDataTableAccessibilityReadiness[\s\S]*standard-data-table-scroll-region[\s\S]*getAttribute\('role'\) === 'region'[\s\S]*element\.tabIndex === 0/,
  );
  const visualSampleStart = runnerSource.indexOf('async function readVisualReadinessSample(page)');
  const visualSampleEnd = runnerSource.indexOf('\nasync function ', visualSampleStart + 1);
  const visualSampleSource = runnerSource.slice(visualSampleStart, visualSampleEnd);
  assert.ok(visualSampleStart >= 0 && visualSampleEnd > visualSampleStart);
  assert.match(visualSampleSource, /crypto\.subtle\.digest\('SHA-256'/);
  assert.match(visualSampleSource, /motionStyleHash/);
  assert.match(visualSampleSource, /activeAnimationCount/);
  assert.match(visualSampleSource, /busyElementCount/);
  assert.match(visualSampleSource, /documentTitlePresent/);
  assert.doesNotMatch(visualSampleSource, /textContent|innerText|outerHTML|className|getAttribute\(['"]style['"]\)/);

  const auditStart = runnerSource.indexOf('async function auditStateCase(');
  const auditEnd = runnerSource.indexOf('\nasync function ', auditStart + 1);
  const auditSource = runnerSource.slice(auditStart, auditEnd);
  assert.ok(auditStart >= 0 && auditEnd > auditStart);

  const firstStabilization = auditSource.indexOf("stage = 'pre-state-stabilization'");
  const firstDisable = auditSource.indexOf('await disableAnimations(page)', firstStabilization);
  const exercise = auditSource.indexOf('await exerciseState(page, stateCase, preparation,');
  const finalStabilization = auditSource.indexOf("stage = 'stabilization'", exercise);
  const finalDisable = auditSource.indexOf('await disableAnimations(page)', finalStabilization);
  const visualReadiness = auditSource.indexOf('await observeStableVisualReadiness', finalDisable);
  const responsive = auditSource.indexOf('await observeStableResponsiveGeometry', visualReadiness);
  const accessibilityReadiness = auditSource.indexOf(
    'await waitForStandardDataTableAccessibilityReadiness(page)',
    responsive,
  );
  const axe = auditSource.indexOf('new AxeBuilder({ page })', accessibilityReadiness);

  assert.ok(
    firstStabilization >= 0
      && firstStabilization < firstDisable
      && firstDisable < exercise
      && exercise < finalStabilization
      && finalStabilization < finalDisable
      && finalDisable < visualReadiness
      && finalDisable < responsive
      && visualReadiness < responsive
      && responsive < accessibilityReadiness
      && accessibilityReadiness < axe
      && responsive < axe,
    'motion suppression, bounded visual readiness, stable geometry and actual table semantics must all precede axe',
  );
  assert.equal(
    auditSource.match(/await disableAnimations\(page\)/g)?.length,
    2,
    'hard navigation and newly inserted state UI require a second bounded stabilization',
  );
  assert.match(baselineProtocolSource, /duration: 0s[^\n]*중간 transform/);
  assert.match(baselineProtocolSource, /StandardDataTable[^\n]*최대 12 frame[^\n]*2회 연속/);
  assert.match(baselineProtocolSource, /visual readiness[^\n]*최소 12 frame[^\n]*최대 24 frame[^\n]*3회 연속/i);
  assert.match(baselineProtocolSource, /axe보다 먼저 수행/);
});

test('invalid-login focus evidence waits for the bounded post-commit focus frame', () => {
  const runnerSource = readFileSync(
    new URL('../frontend/scripts/ui-quality-baseline-runner.mjs', import.meta.url),
    'utf8',
  );
  const invalidLoginStart = runnerSource.indexOf("case 'invalid-credentials':");
  const invalidLoginEnd = runnerSource.indexOf("case 'successful-login':", invalidLoginStart);
  assert.ok(invalidLoginStart >= 0 && invalidLoginEnd > invalidLoginStart);
  const invalidLoginSource = runnerSource.slice(invalidLoginStart, invalidLoginEnd);

  assert.match(invalidLoginSource, /const focusReturned\s*=\s*await pollForExpectedValue\(\{/);
  assert.match(invalidLoginSource, /readValue:\s*\(\)\s*=>\s*idInput\.evaluate/);
  assert.match(invalidLoginSource, /expectedValue:\s*true/);
  assert.match(invalidLoginSource, /maxAttempts:\s*12/);
  assert.match(invalidLoginSource, /wait:\s*\(\)\s*=>\s*advanceAnimationFrame\(page\)/);
  assert.doesNotMatch(
    invalidLoginSource,
    /const focusReturned\s*=\s*await idInput\.evaluate/,
  );
});

test('performance failure record exposes only bounded stage and reason without raw error material', () => {
  const failure = performanceFailureRecord('render-case', 'warm-navigation');
  assert.deepEqual(failure, {
    renderCaseId: 'render-case',
    status: 'invalid-run',
    invalidReasonCode: 'performance-probe-failed',
    failureStage: 'warm-navigation',
    conditionRuns: [],
    summary: null,
  });
  assert.deepEqual(
    performanceFailureRecord('render-case', 'https://unsafe.example/error?raw=payload'),
    { ...failure, failureStage: 'performance-execution' },
  );
  assert.ok(!('error' in failure));
  assert.ok(!('message' in failure));
  assert.ok(!('url' in failure));
});

test('dense log recovery binds the exact user-observed retry accessible name', () => {
  const serverErrorCase = runnerSource.match(/case 'server-error': \{([\s\S]*?)\n\s*break;\n\s*\}/);
  assert.ok(serverErrorCase, 'server-error runtime case must remain executable');
  assert.match(statusDisplaysSource, /aria-label="데이터 다시 불러오기"/);
  assert.match(
    serverErrorCase[1],
    /getByRole\('button', \{ name: '데이터 다시 불러오기', exact: true \}\)\.first\(\)/,
  );
  assert.doesNotMatch(serverErrorCase[1], /name: '다시 시도'|getByText\(/);
  assert.match(
    baselineProtocolSource,
    /accessible name `데이터 다시 불러오기`를 exact role locator로 사용한다/,
  );
});

test('package scripts bind the complete baseline runner and non-loopback execution turns red', () => {
  assert.equal(
    frontendPackage.scripts['ui-quality:plan'],
    'node scripts/ui-quality-baseline-runner.mjs --plan',
  );
  assert.equal(
    frontendPackage.scripts['ui-quality:baseline'],
    REQUIRED_BASELINE_SCRIPT,
  );
  assert.notEqual(BASELINE_EXECUTION_COMMAND, REQUIRED_BASELINE_SCRIPT);
  assert.notEqual(
    `${BASELINE_CONTRACT_COMMAND.replace(' ../scripts/ui-quality-baseline-runner-contract.test.mjs', '')} && ${BASELINE_EXECUTION_COMMAND}`,
    REQUIRED_BASELINE_SCRIPT,
    'removing either contract from the package path must turn the exact binding red',
  );

  const unsafe = spawnSync(process.execPath, [runnerPath, '--execute'], {
    cwd: join(repoRoot, 'frontend'),
    env: { ...process.env, UI_BASELINE_WEB_URL: 'https://example.com' },
    encoding: 'utf8',
  });
  assert.notEqual(unsafe.status, 0);
  assert.match(unsafe.stderr, /unsafe-or-missing-baseline-origin/);

  const incomplete = spawnSync(process.execPath, [runnerPath, '--execute', '--include-performance'], {
    cwd: join(repoRoot, 'frontend'),
    env: {
      ...process.env,
      UI_BASELINE_WEB_URL: 'http://127.0.0.1:3003',
      UI_BASELINE_STACK_CLASSIFICATION: '',
      UI_BASELINE_FRONTEND_BUILD_ID: '',
      UI_BASELINE_BACKEND_BUILD_ID: '',
      UI_BASELINE_SYNTHETIC_SEED_LABEL: '',
      UI_BASELINE_ADMIN_ID: '',
      UI_BASELINE_ADMIN_SECRET: '',
      UI_BASELINE_DIAGNOSTIC_LIMIT: '',
    },
    encoding: 'utf8',
  });
  assert.notEqual(incomplete.status, 0);
  assert.match(incomplete.stderr, /baseline-preflight-incomplete/);
});

test('pnpm version probe uses a fixed Windows command boundary without widening POSIX execution', () => {
  assert.deepEqual(packageManagerVersionCommand('win32'), {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', 'pnpm --version'],
  });
  assert.deepEqual(packageManagerVersionCommand('linux'), {
    command: 'pnpm',
    args: ['--version'],
  });
  assert.deepEqual(
    packageManagerVersionCommand('win32 & injected-command'),
    { command: 'pnpm', args: ['--version'] },
    'untrusted platform-like text must never enter the executable or argv',
  );
  assert.doesNotMatch(runnerSource, /shell\s*:\s*true/);
});

test('browser recorder keeps deterministic axe enabled and forbids raw browser artifacts', () => {
  assert.match(runnerSource, /\.withTags\(manifest\.automation\.axe\.runOnlyTags\)/);
  assert.doesNotMatch(runnerSource, /\.disableRules\s*\(/);
  assert.doesNotMatch(runnerSource, /\brecordHar\b|\brecordVideo\b|\.screenshot\s*\(/);
  assert.doesNotMatch(
    runnerSource,
    /\.isVisible\(\{\s*timeout/,
    'Playwright locator.isVisible ignores timeout; readiness must use waitFor',
  );
  assert.match(runnerSource, /\/api\\\/v1\\\/admin\\\/system\\\/logs\\\/user/);
  assert.doesNotMatch(runnerSource, /not-measured-auth-interaction/);
  assert.match(runnerSource, /warmContext\.clearCookies\(\)/);
  assert.match(runnerSource, /window\.__uiqObservers/);
  assert.match(runnerSource, /\.takeRecords\(\)/);
  assert.match(runnerSource, /observeLcpWithinBoundedFrames/);
  assert.match(runnerSource, /observeStableResponsiveGeometry/);
  assert.match(runnerSource, /classifyClientErrorResponse/);
  assert.match(runnerSource, /responseCategoryCounts/);
  assert.doesNotMatch(
    runnerSource,
    /passed\s*:\s*false/,
    'unexecuted work must be recorded as bounded task evidence, not a failed assertion',
  );
  assert.match(runnerSource, /taskEvidence/);
  assert.ok(
    runnerSource.includes('[data-testid="empty-state-display"]:visible'),
    'duplicate desktop/mobile empty states must resolve through the currently visible instance',
  );
  assert.match(runnerSource, /pollForExpectedValue/);
  assert.match(runnerSource, /const ONBOARDING_STEP_ID = 'onboarding-first-use'/);
  assert.match(runnerSource, /const ONBOARDING_STORAGE_KEY = 'egov_smart_tour_v1'/);
  assert.match(runnerSource, /localStorage\.setItem\(onboardingStorageKey, 'true'\)/);
  assert.match(runnerSource, /localStorage\.removeItem\(onboardingStorageKey\)/);
  assert.match(runnerSource, /getByRole\('dialog', \{ name: '업무 포털 둘러보기', exact: true \}\)/);
  assert.match(runnerSource, /first-use-onboarding-open-prepared/);
});
