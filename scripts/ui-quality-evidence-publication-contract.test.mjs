import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

import {
  buildExecutionPlan,
  createProductionBuildInputTreeHash,
  PRODUCTION_BUILD_INPUT_PATHS,
  REQUIRED_PRODUCTION_BUILD_INPUT_FILES,
  selectProductionBuildInputPaths,
  stableJson,
} from '../frontend/scripts/ui-quality-baseline-core.mjs';

import {
  aggregateContentDigest,
  aggregatePathBoundContentDigest,
  approveR12CompactSummary,
  assertAppendOnlyIndexTransition,
  assertBaselineIndex,
  assertCanonicalJsonBytes,
  assertCombinedCompactSummary,
  assertCompactSummary,
  assertPublicationPrivacyPolicy,
  assertCombinedRepositoryProvenance,
  assertRepositoryIndexAppendOnly,
  assertR12ProvenanceAgreement,
  buildCombinedCompactSummary,
  buildPublishedIndexEntry,
  canonicalJsonBytes,
  countCollectedManualEvidence,
  evaluateDurableEvidence,
  getCombinedV2ExecutionContract,
  isUtcInstant,
  prepareCombinedAutomatedEvidence,
  sealCombinedManualObservation,
  sha256Hex,
  summarizeRedactedAxe,
  verifyDurableEvidenceFromRepository,
} from './ui-quality-evidence-durability.mjs';

const GIT_LOCAL_ENVIRONMENT_KEYS = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG', 'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT', 'GIT_OBJECT_DIRECTORY', 'GIT_DIR', 'GIT_WORK_TREE',
  'GIT_IMPLICIT_WORK_TREE', 'GIT_GRAFT_FILE', 'GIT_INDEX_FILE',
  'GIT_NO_REPLACE_OBJECTS', 'GIT_REPLACE_REF_BASE', 'GIT_PREFIX',
  'GIT_SHALLOW_FILE', 'GIT_COMMON_DIR',
];

function runGit(root, args) {
  const environment = { ...process.env };
  for (const key of GIT_LOCAL_ENVIRONMENT_KEYS) delete environment[key];
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: environment,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function runGitBuffer(root, args) {
  const environment = { ...process.env };
  for (const key of GIT_LOCAL_ENVIRONMENT_KEYS) delete environment[key];
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'buffer',
    env: environment,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function writeCanonicalIndex(root, value) {
  const target = join(root, 'config', 'ui-quality-baseline-index.json');
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(target, canonicalJsonBytes(value));
}

function writeRepositoryFile(root, relativePath, bytes) {
  const target = join(root, ...relativePath.split('/'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  return target;
}

function fixtureIndex(entries) {
  return {
    currentDigest: entries.at(-1)?.artifactDigest ?? null,
    decisionId: 'PD-UIQ-001',
    entries,
    schemaVersion: 1,
    storeMode: 'versioned-compact-summary',
  };
}

const HEX64 = 'a'.repeat(64);
const HEX40 = 'b'.repeat(40);
const R12_PUBLISHED_DIGEST = 'e7822b6a31dcf9ff5e129238e42cce7be29d5f126554e8ea400cf249c69af8e4';
const TEST_EXECUTION_PLAN = buildExecutionPlan(JSON.parse(readFileSync(
  new URL('../config/ui-quality-scenarios.json', import.meta.url),
  'utf8',
)));
const PRIVACY_POLICY = {
  syntheticDataOnly: true,
  rawTraceRepositoryStorage: 'forbidden',
  forbiddenArtifactKeys: [
    'authorization', 'cookie', 'password', 'accessToken', 'refreshToken',
    'userId', 'email', 'phone', 'ipAddress', 'residentRegistrationNumber',
    'rawInput', 'freeText', 'searchKeyword', 'responseBody',
  ],
  redactionProcedureRef: 'docs/04-operations/ui-ux-baseline-protocol.md#9-privacy-redaction-and-artifact-handling',
};
const PRIVACY_RULE_HASH = assertPublicationPrivacyPolicy(PRIVACY_POLICY);
assert.equal(PRIVACY_RULE_HASH, 'efd981ddde3b84363c15893d333810821e1be79cc239c23af852c359c8e2ed86');
const R12_PROVENANCE = {
  buildSha: 'c9d07f260a3c41161362ceef444188fddeaa11bf',
  executionScenarioManifestHash: 'c4e6142f1dafe66cdcc274e36048d2e20b1461e657b40f4a27c5e0b7a1f301ff',
  executionPlanHash: '573ad03186dd630e3ab86dcd6f125b2578628a475dad36ebaad591d61ead6927',
  routeTruthHash: '8956fb5dee0d42b4eaf704e145cb51db4703fc69ebca3e9436ad2085fd263b6e',
  buildInputTreeHash: '5ebb43f59773661c65df645f9da3c0ebe0a9af1cef93b046a3a56c4707cd9c05',
  dirtyBuildInputDiffHash: '929b3b571c10dfc7f8f5d5606a441e7da478e21e9b04ebd417b72037cdc14a0e',
  startedAt: '2026-08-21T08:03:03.803Z',
  finishedAt: '2026-08-21T08:13:41.730Z',
  frontendBuildId: 'sha256:999534250148a783f17ea98041d040df8e36931eb128d2b1b386a278a2fdd804',
  backendBuildId: 'sha256:70f8042a67c61db857a8524ddf5e8919d5c821e312f1db37adfb269c8729fd59',
};
const R12_INVENTORY = {
  inventoryDigest: '2a4f890de0f5ff79e0f66cb3dbc042982a25e2eed7c330fe81104d1a46d91328',
  automatedInventoryDigest: '071bcd42f36e5bdf79110c3a954a9fcb2a38d270fd92d02162e9540fac230d39',
  diagnosticInventoryDigest: '1cf2b8bf1059248dad0df29a6101196766aa34cdb13d04b75db44b8b7fc8dfb6',
};
const R12_TOOLING = {
  runnerHash: '66092706a07b4903fadcd6c26be34166434f3d21389956e807ada66679dcc712',
  coreHash: 'ec41b33fdfef10f927bbd7c3f37b413144a7d8a9fcb3ce729dc6134d5dae196a',
  runnerContractHash: '704e2bab956995a8b7ba9b36be8ac5830636cae30d658ea59f9a381a5c16e173',
  scenarioContractHash: '5c6ce3b5997e6dab2d06749393659bd634f6546828ba34106f87b0dbe65c0a13',
};
const SCENARIOS = [
  ['auth-login', 12],
  ['admin-shell-hub', 6],
  ['dense-user-logs', 18],
  ['user-management-hub', 12],
  ['board-article-composer', 12],
  ['faq-admin-user-lifecycle', 18],
  ['board-maker-wizard', 12],
  ['first-use-onboarding', 6],
];

function metricStats(value) {
  return {
    minimum: value,
    median: value,
    maximum: value,
    medianAbsoluteDeviation: 0,
  };
}

function conditionSummary(value) {
  return {
    routeJsTransferBytes: metricStats(value),
    lcpMs: metricStats(value),
    cls: metricStats(0),
    readinessLatencyProxyMs: metricStats(value),
  };
}

const RENDER_DIMENSIONS = [
  ['light', 'mobile-320'],
  ['light', 'tablet-768'],
  ['light', 'desktop-1280'],
  ['dark', 'mobile-320'],
  ['dark', 'tablet-768'],
  ['dark', 'desktop-1280'],
];

function sampleStateCases() {
  const requiredIds = {
    'user-management-hub': [
      'role-status-mutation-readback-executed',
      'synthetic-role-status-rollback-complete',
    ],
    'faq-admin-user-lifecycle': [
      'faq-authoritative-save-readback',
      'admin-created-faq-readback',
      'cross-role-created-answer-readback',
    ],
    'board-maker-wizard': ['single-deploy-authoritative-readback'],
  };
  let sequence = 0;
  return SCENARIOS.flatMap(([scenarioId, stateCaseCount]) => Array.from(
    { length: stateCaseCount },
    (_, scenarioIndex) => {
      const evidenceIds = requiredIds[scenarioId] ?? [];
      const requiredTaskEvidenceId = evidenceIds.length > 0
        && !(scenarioId === 'board-maker-wizard' && scenarioIndex >= 6)
        ? evidenceIds[Math.min(Math.floor(scenarioIndex / 6), evidenceIds.length - 1)]
        : null;
      const caseId = `uiq-${sequence.toString(16).padStart(20, '0')}`;
      sequence += 1;
      return {
        caseId,
        scenarioId,
        status: 'automated-state-observed',
        automatedOutcome: 'no-automated-finding-observed',
        assertionCount: sequence <= 60 ? 2 : 1,
        passedAssertionCount: sequence <= 60 ? 2 : 1,
        failedAssertionCount: 0,
        axeViolationCount: 0,
        horizontalOverflowPx: 0,
        findingCount: 0,
        requiredTaskEvidenceId,
        taskEvidenceComplete: requiredTaskEvidenceId !== null,
      };
    },
  ));
}

function sampleSummary(overrides = {}) {
  return {
    schemaVersion: 1,
    evidenceKind: 'ui-quality-baseline-compact-summary',
    baselineRunId: 'r12',
    evidenceScope: 'automated-only',
    provenance: {
      protocolVersion: 1,
      protocolHash: null,
      protocolHashStatus: 'not-recorded-in-r12',
      runnerVersion: 1,
      buildSha: R12_PROVENANCE.buildSha,
      executionScenarioManifestHash: R12_PROVENANCE.executionScenarioManifestHash,
      executionPlanHash: R12_PROVENANCE.executionPlanHash,
      executionPlanHashStatus: 'retrospective-current-plan-matched-r12-snapshots',
      routeTruthHash: R12_PROVENANCE.routeTruthHash,
      privacyRuleHash: PRIVACY_RULE_HASH,
      buildInputTreeHash: R12_PROVENANCE.buildInputTreeHash,
      dirtyBuildInputDiffHash: R12_PROVENANCE.dirtyBuildInputDiffHash,
      runnerHash: R12_TOOLING.runnerHash,
      coreHash: R12_TOOLING.coreHash,
      runnerContractHash: R12_TOOLING.runnerContractHash,
      scenarioContractHash: R12_TOOLING.scenarioContractHash,
      toolingHashStatus: 'retrospective-protocol-record-current-bytes-drifted',
      startedAt: R12_PROVENANCE.startedAt,
      finishedAt: R12_PROVENANCE.finishedAt,
      frontendBuildId: R12_PROVENANCE.frontendBuildId,
      backendBuildId: R12_PROVENANCE.backendBuildId,
      finishVerificationScenarioCount: 8,
    },
    sourceInventory: {
      aggregateAlgorithm: 'sha256-json-sorted-content-digests-v1',
      inventoryDigest: R12_INVENTORY.inventoryDigest,
      automatedInventoryDigest: R12_INVENTORY.automatedInventoryDigest,
      diagnosticInventoryDigest: R12_INVENTORY.diagnosticInventoryDigest,
      jsonFileCount: 290,
      automatedJsonFileCount: 282,
      diagnosticJsonFileCount: 8,
      totalBytes: 4_727_118,
      nonJsonFileCount: 0,
      symlinkCount: 0,
    },
    automated: {
      scenarioCount: 8,
      renderCaseCount: 48,
      plannedStateCaseCount: 96,
      observedStateCaseCount: 96,
      invalidStateCaseCount: 0,
      plannedPerformanceCaseCount: 48,
      observedPerformanceCaseCount: 48,
      invalidPerformanceCaseCount: 0,
      performanceConditionRunCount: 288,
      assertionCount: 156,
      passedAssertionCount: 156,
      failedAssertionCount: 0,
      mutationRequiredCaseCount: 36,
      mutationExecutedCaseCount: 36,
      mutationReadbackCaseCount: 36,
      mutationRollbackCaseCount: 36,
      mutationCleanupCaseCount: 36,
      activeMutationResidueCount: 0,
      nonMutationEmptyEvidenceCaseCount: 60,
      axeViolationCaseCount: 0,
      axeViolationNodeCount: 0,
      horizontalOverflowCaseCount: 0,
      findingCount: 0,
      stateCases: sampleStateCases().sort((left, right) => left.caseId.localeCompare(right.caseId)),
      scenarios: SCENARIOS.map(([scenarioId, stateCaseCount]) => ({
        scenarioId,
        plannedStateCaseCount: stateCaseCount,
        observedStateCaseCount: stateCaseCount,
        invalidStateCaseCount: 0,
        plannedPerformanceCaseCount: 6,
        observedPerformanceCaseCount: 6,
        invalidPerformanceCaseCount: 0,
        axeViolationCaseCount: 0,
        failedAssertionCaseCount: 0,
        status: 'partial-automated-evidence',
      })).sort((left, right) => left.scenarioId.localeCompare(right.scenarioId)),
      performance: Array.from({ length: 48 }, (_, index) => ({
        renderCaseId: `${SCENARIOS[Math.floor(index / 6)][0]}--current-default--${RENDER_DIMENSIONS[index % 6][0]}--${RENDER_DIMENSIONS[index % 6][1]}`,
        scenarioId: SCENARIOS[Math.floor(index / 6)][0],
        status: 'lab-performance-observed',
        cold: conditionSummary(index + 1),
        warm: conditionSummary(index + 1),
      })).sort((left, right) => left.renderCaseId.localeCompare(right.renderCaseId)),
    },
    diagnostics: {
      evidenceKind: 'diagnostic-not-baseline-evidence',
      plannedCaseCount: 6,
      completedCaseCount: 6,
      invalidCaseCount: 0,
      mutationEvidenceCount: 6,
      activeMutationResidueCount: 0,
    },
    manual: {
      requiredEvidenceCount: 48,
      completedEvidenceCount: 0,
      reviewRequiredCount: 40,
      blockedExternalCount: 8,
      status: 'not-collected',
    },
    redaction: {
      automatedGuardStatus: 'passed',
      scannedJsonFileCount: 290,
      unsafeFileCount: 0,
      rawTraceStoredCount: 0,
      responsePayloadStoredCount: 0,
      humanReviewCompletedCount: 0,
      humanReviewPendingCount: 8,
      reviewQuorum: 1,
      approvedByRoles: [],
      status: 'automated-privacy-guard-passed-human-review-pending',
    },
    limitations: [
      'raw-artifact-was-unversioned-before-compaction',
      'protocol-hash-not-captured-at-run',
      'tooling-hashes-not-recorded-in-raw-artifact',
      'current-tooling-drifted-after-r12',
      'human-redaction-review-pending',
      'manual-evidence-not-collected',
    ],
    promotion: {
      status: 'partial-automated-evidence',
      eligible: false,
      blockerCodes: ['manual-at-evidence', 'redaction-review'],
    },
    ...overrides,
  };
}

const MANUAL_ENVIRONMENTS = Object.freeze({
  'keyboard-only': 'keyboard-only-manual',
  'nvda-chrome': 'nvda-chrome-manual',
  'text-200-percent': 'chrome-text-200-percent-manual',
  'zoom-400-reflow-320': 'chrome-zoom-400-reflow-320-css-px-manual',
  'forced-colors': 'windows-forced-colors-manual',
  'reduced-motion': 'os-reduced-motion-manual',
});

function sampleManualObservations(automatedEvidence) {
  const execution = getCombinedV2ExecutionContract();
  let sequence = 0;
  return SCENARIOS.flatMap(([scenarioId]) => Object.entries(MANUAL_ENVIRONMENTS).map(
    ([checkId, environmentKind], checkIndex) => {
      sequence += 1;
      const status = checkIndex % 2 === 0 ? 'pass' : 'fail';
      return sealCombinedManualObservation({
        evidenceKind: 'manual-observation-v2',
        scenarioId,
        checkId,
        status,
        environment: {
          kind: environmentKind,
          evidenceMode: 'expert-manual',
          osFamily: 'windows',
          osVersion: '11-test-fixture',
          browserFamily: 'chrome',
          browserVersion: '140.0-test-fixture',
          assistiveTechnology: checkId === 'nvda-chrome' ? 'nvda' : 'none',
          assistiveTechnologyVersion: checkId === 'nvda-chrome' ? '2026.1-test-fixture' : null,
          brandTheme: 'current-default',
          colorModes: ['light', 'dark'],
          viewportIds: ['mobile-320', 'tablet-768', 'desktop-1280'],
        },
        coverage: { stepIds: execution.scenarioStepIds[scenarioId] },
        reviewerRole: 'accessibility-reviewer',
        executionId: automatedEvidence.provenance.executionId,
        startedAt: '2026-08-22T01:30:00.000Z',
        finishedAt: '2026-08-22T01:31:00.000Z',
        buildSha: automatedEvidence.provenance.buildSha,
        executionScenarioManifestHash: automatedEvidence.provenance.executionScenarioManifestHash,
        executionPlanHash: automatedEvidence.provenance.executionPlanHash,
        automatedEvidenceDigest: automatedEvidence.automatedEvidenceDigest,
        protocolHash: automatedEvidence.provenance.protocolHash,
        protocolHashVerifiedAtStart: true,
        protocolHashVerifiedAtFinish: true,
        finding: status === 'pass'
          ? { issueCodes: [], impactCodes: ['no-adverse-impact-observed'], severity: null }
          : {
            issueCodes: [`UIQ-MANUAL-FIXTURE-${sequence.toString().padStart(3, '0')}`],
            impactCodes: ['task-understanding-risk'],
            severity: 'P2',
          },
        redaction: {
          status: 'approved',
          reviewedByRole: 'repository-governance',
        },
      });
    },
  ));
}

function sampleCombinedAutomatedEvidence(mutate = () => {}, provenanceOverrides = {}) {
  const execution = getCombinedV2ExecutionContract();
  const executionId = '018f3f5e-7b21-4b6a-8c9d-0123456789ab';
  const provenance = {
    protocolVersion: 1,
    protocolHash: execution.protocolHash,
    protocolHashStatus: 'recorded',
    protocolHashVerifiedAtFinish: true,
    runnerVersion: 2,
    executionId,
    buildSha: 'd'.repeat(40),
    executionScenarioManifestHash: execution.executionScenarioManifestHash,
    executionPlanHash: execution.executionPlanHash,
    executionPlanHashStatus: 'recomputed-from-run-snapshot',
    routeTruthHash: '3'.repeat(64),
    privacyRuleHash: PRIVACY_RULE_HASH,
    buildInputTreeHash: '4'.repeat(64),
    dirtyBuildInputDiffHash: null,
    runnerHash: '5'.repeat(64),
    coreHash: '6'.repeat(64),
    runnerContractHash: '7'.repeat(64),
    scenarioContractHash: '8'.repeat(64),
    toolingHashStatus: 'resolved-from-clean-build-commit',
    startedAt: '2026-08-22T01:00:00.000Z',
    finishedAt: '2026-08-22T01:20:00.000Z',
    frontendBuildId: `sha256:${'9'.repeat(64)}`,
    backendBuildId: `sha256:${'a'.repeat(64)}`,
    finishVerificationScenarioCount: 8,
    ...provenanceOverrides,
  };
  const stateCases = execution.stateCaseBindings.map((binding, index) => ({
    ...binding,
    status: 'automated-state-observed',
    automatedOutcome: 'no-automated-finding-observed',
    assertionCount: index < 60 ? 2 : 1,
    passedAssertionCount: index < 60 ? 2 : 1,
    failedAssertionCount: 0,
    axeViolationCount: 0,
    horizontalOverflowPx: 0,
    findingCount: 0,
    taskEvidenceComplete: binding.requiredTaskEvidenceId !== null,
  })).sort((left, right) => left.caseId.localeCompare(right.caseId));
  const automated = {
    ...structuredClone(sampleSummary().automated),
    stateCases,
    performance: execution.performanceCaseBindings.map((binding, index) => ({
      ...binding,
      status: 'lab-performance-observed',
      cold: conditionSummary(index + 1000),
      warm: conditionSummary(index + 900),
    })).sort((left, right) => left.renderCaseId.localeCompare(right.renderCaseId)),
  };
  automated.scenarios.forEach((scenario) => { scenario.status = 'measured'; });
  const runSummary = {
    baselineRunId: 'r13',
    executionId,
    runnerVersion: provenance.runnerVersion,
    startedAt: provenance.startedAt,
    finishedAt: provenance.finishedAt,
    buildSha: provenance.buildSha,
    manifestHash: provenance.executionScenarioManifestHash,
    executionPlanHash: provenance.executionPlanHash,
    protocolHash: provenance.protocolHash,
    evidenceDurability: {
      status: 'ephemeral-ignored',
      eligibleForMeasuredPromotion: false,
      reasonCode: 'ignored-artifact-not-durable',
    },
    scenarioCount: 8,
    plannedRenderCaseCount: 48,
    plannedStateCaseCount: 96,
    includePerformance: true,
    scenarios: SCENARIOS.map(([scenarioId, stateCount]) => ({
      scenarioId,
      plannedCaseCount: stateCount,
      invalidCaseCount: 0,
      plannedPerformanceCaseCount: 6,
      completedPerformanceCaseCount: 6,
      invalidPerformanceCaseCount: 0,
    })),
  };
  const runProgress = {
    baselineRunId: 'r13',
    executionId,
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
    baselineRunId: 'r13',
    executionId,
    protocolHash: provenance.protocolHash,
    protocolHashVerifiedAtFinish: true,
    buildSha: provenance.buildSha,
    manifestHash: provenance.executionScenarioManifestHash,
    executionPlanHash: provenance.executionPlanHash,
    runnerVersion: provenance.runnerVersion,
    startedAt: provenance.startedAt,
    buildInputTreeHash: provenance.buildInputTreeHash,
    dirtyBuildInputDiffHash: provenance.dirtyBuildInputDiffHash,
  };
  const environmentRecords = Array.from({ length: 8 }, () => ({ ...environment }));
  const rawRecords = [runSummary, runProgress, ...environmentRecords];
  const identity = { baselineRunId: 'r13', executionId };
  const bindIdentity = (value) => ({ ...value, ...identity });
  const artifactEntry = (relativePath, value) => ({
    relativePath,
    bytes: Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'),
  });
  const automatedEvidenceArtifactEntries = [
    artifactEntry('run-summary.json', runSummary),
    artifactEntry('run-progress.json', runProgress),
  ];
  const rawStateById = new Map();
  for (const stateCase of automated.stateCases) {
    const assertions = Array.from({ length: stateCase.assertionCount }, (_, index) => ({
      passed: index < stateCase.passedAssertionCount,
    }));
    const taskEvidence = stateCase.requiredTaskEvidenceId === null ? [] : [{
      id: stateCase.requiredTaskEvidenceId,
      caseId: stateCase.caseId,
      syntheticNamespace: 'uiq-baseline-mutation-v1',
      mutationObserved: 'observed',
      authoritativeReadback: 'observed',
      rollbackReadback: 'observed',
      cleanupReadback: 'zero-active-residue',
      activeResidueCount: 0,
      status: 'executed',
    }];
    const checkpoint = bindIdentity({
      caseId: stateCase.caseId,
      status: stateCase.status,
      automatedOutcome: stateCase.automatedOutcome,
      automatedFindingCodes: [],
      assertions,
      taskEvidence,
      failedAssertionCount: stateCase.failedAssertionCount,
      responsive: { horizontalOverflowPx: stateCase.horizontalOverflowPx },
      axe: [],
      axeViolationCount: stateCase.axeViolationCount,
      invalidReasonCode: null,
    });
    rawStateById.set(stateCase.caseId, checkpoint);
    automatedEvidenceArtifactEntries.push(
      artifactEntry(`checkpoints/${stateCase.caseId}.json`, checkpoint),
      artifactEntry(`${stateCase.scenarioId}/axe/${stateCase.caseId}.json`, bindIdentity({
        caseId: stateCase.caseId,
        violations: [],
      })),
    );
  }
  const rawPerformanceById = new Map();
  for (const performance of automated.performance) {
    const conditionRuns = ['cold', 'warm'].flatMap((condition) => (
      Array.from({ length: 3 }, (_, index) => ({
        condition,
        repetition: index + 1,
        metrics: Object.fromEntries(Object.entries(performance[condition]).map(
          ([metric, stats]) => [metric, stats.median],
        )),
      }))
    ));
    const rawPerformance = bindIdentity({
      renderCaseId: performance.renderCaseId,
      status: performance.status,
      invalidReasonCode: null,
      failureStage: null,
      conditionRuns,
      summary: { cold: performance.cold, warm: performance.warm },
    });
    rawPerformanceById.set(performance.renderCaseId, rawPerformance);
    automatedEvidenceArtifactEntries.push(artifactEntry(
      `${performance.scenarioId}/performance/${performance.renderCaseId}.json`,
      rawPerformance,
    ));
  }
  SCENARIOS.forEach(([scenarioId], index) => {
    const cases = automated.stateCases
      .filter((stateCase) => stateCase.scenarioId === scenarioId)
      .map((stateCase) => rawStateById.get(stateCase.caseId));
    const performanceMetrics = automated.performance
      .filter((performance) => performance.scenarioId === scenarioId)
      .map((performance) => rawPerformanceById.get(performance.renderCaseId));
    const manualChecks = [];
    const taskObservation = bindIdentity({ authoritativeTaskReadbackComplete: true });
    automatedEvidenceArtifactEntries.push(
      artifactEntry(`${scenarioId}/environment.json`, environmentRecords[index]),
      artifactEntry(`${scenarioId}/manifest-snapshot.json`, bindIdentity({
        scenarioId,
        manifestHash: provenance.executionScenarioManifestHash,
        executionPlanHash: provenance.executionPlanHash,
        routeTruthHash: provenance.routeTruthHash,
        cases: TEST_EXECUTION_PLAN.stateCases.filter(
          (stateCase) => stateCase.scenarioId === scenarioId,
        ),
      })),
      artifactEntry(`${scenarioId}/task-observations.json`, taskObservation),
      artifactEntry(`${scenarioId}/manual/manual-checks.json`, bindIdentity({ checks: manualChecks })),
      artifactEntry(`${scenarioId}/baseline-result.json`, bindIdentity({
        scenarioId,
        cases,
        performanceMetrics,
        manual: manualChecks,
        taskMetrics: [taskObservation],
      })),
    );
  });
  assert.equal(automatedEvidenceArtifactEntries.length, 282);
  const diagnosticArtifactBytes = [];
  const automatedRunSeal = {
    evidenceKind: 'automated-run-seal-v2',
    baselineRunId: 'r13',
    executionId,
    status: 'automated-run-complete',
    final: true,
    runnerVersion: provenance.runnerVersion,
    startedAt: provenance.startedAt,
    finishedAt: provenance.finishedAt,
    runSummaryDigest: sha256Hex(Buffer.from(`${JSON.stringify(runSummary, null, 2)}\n`, 'utf8')),
    runProgressDigest: sha256Hex(Buffer.from(`${JSON.stringify(runProgress, null, 2)}\n`, 'utf8')),
    environmentDigest: aggregateContentDigest(rawRecords.slice(2).map(
      (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'),
    )),
    protocolHash: provenance.protocolHash,
    protocolHashVerifiedAtFinish: true,
    buildSha: provenance.buildSha,
    buildInputTreeHash: provenance.buildInputTreeHash,
    dirtyBuildInputDiffHash: provenance.dirtyBuildInputDiffHash,
    executionScenarioManifestHash: provenance.executionScenarioManifestHash,
    executionPlanHash: provenance.executionPlanHash,
    routeTruthHash: provenance.routeTruthHash,
    privacyRuleHash: provenance.privacyRuleHash,
    runnerHash: provenance.runnerHash,
    coreHash: provenance.coreHash,
    runnerContractHash: provenance.runnerContractHash,
    scenarioContractHash: provenance.scenarioContractHash,
    frontendBuildId: provenance.frontendBuildId,
    backendBuildId: provenance.backendBuildId,
    automatedInventoryDigest: aggregatePathBoundContentDigest(automatedEvidenceArtifactEntries),
    automatedProjectionDigest: sha256Hex(canonicalJsonBytes(automated)),
    plannedStateCaseCount: 96,
    completedStateCaseCount: 96,
    invalidStateCaseCount: 0,
    plannedPerformanceCaseCount: 48,
    completedPerformanceCaseCount: 48,
    invalidPerformanceCaseCount: 0,
    sealDigest: null,
  };
  automatedRunSeal.sealDigest = sha256Hex(canonicalJsonBytes(Object.fromEntries(
    Object.entries(automatedRunSeal).filter(([key]) => key !== 'sealDigest'),
  )));
  const automatedRunSealBytes = Buffer.from(`${JSON.stringify(automatedRunSeal, null, 2)}\n`, 'utf8');
  const automatedArtifactEntries = [
    ...automatedEvidenceArtifactEntries,
    { relativePath: 'automated-run-seal.json', bytes: automatedRunSealBytes },
  ];
  const inputs = {
    baselineRunId: 'r13',
    provenance,
    automated,
    diagnostics: {
      evidenceKind: 'diagnostic-not-baseline-evidence',
      plannedCaseCount: 0,
      completedCaseCount: 0,
      invalidCaseCount: 0,
      mutationEvidenceCount: 0,
      activeMutationResidueCount: 0,
    },
    automatedArtifactEntries,
    diagnosticArtifactBytes,
    automatedRunSeal,
    runSummary,
    runProgress,
    environmentRecords,
  };
  mutate(inputs);
  return prepareCombinedAutomatedEvidence(inputs);
}

function sampleCombinedSummary({ provenanceOverrides = {} } = {}) {
  const automatedEvidence = sampleCombinedAutomatedEvidence(() => {}, provenanceOverrides);
  return buildCombinedCompactSummary({
    automatedEvidence,
    manualObservations: sampleManualObservations(automatedEvidence),
    redaction: {
      automatedGuardStatus: 'passed',
      manualGuardStatus: 'passed',
      unsafeFileCount: 0,
      rawTraceStoredCount: 0,
      responsePayloadStoredCount: 0,
      reviewQuorum: 1,
      approvedByRoles: ['repository-governance'],
      status: 'approved',
    },
  });
}

function recomputeManualDigest(summary) {
  summary.manual.observations = summary.manual.observations.map(
    (observation) => sealCombinedManualObservation(observation),
  );
  summary.manual.evidenceDigest = sha256Hex(canonicalJsonBytes(summary.manual.observations));
  return summary;
}

function rebindManualToAutomatedProjection(summary) {
  const automatedEvidenceDigest = sha256Hex(canonicalJsonBytes({
    baselineRunId: summary.baselineRunId,
    sourceRun: summary.sourceRun,
    provenance: summary.provenance,
    sourceInventory: summary.sourceInventory,
    automated: summary.automated,
    diagnostics: summary.diagnostics,
  }));
  summary.manual.automatedEvidenceDigest = automatedEvidenceDigest;
  for (const observation of summary.manual.observations) {
    observation.automatedEvidenceDigest = automatedEvidenceDigest;
  }
  return recomputeManualDigest(summary);
}

test('canonical summary bytes are cross-platform deterministic and strictly read back', () => {
  const summary = sampleSummary();
  const canonical = canonicalJsonBytes(summary);
  assert.equal(canonical.at(-1), 0x0a);
  assert.equal(canonical.includes(0x0d), false);
  assert.equal(canonical.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false);
  assert.equal(sha256Hex(canonical).length, 64);
  assert.doesNotThrow(() => assertCanonicalJsonBytes(canonical));
  assert.throws(() => assertCanonicalJsonBytes(Buffer.from(`\ufeff${canonical.toString('utf8')}`)), /canonical/u);
  assert.throws(() => assertCanonicalJsonBytes(Buffer.from(canonical.toString('utf8').replaceAll('\n', '\r\n'))), /canonical/u);
  assert.throws(() => assertCanonicalJsonBytes(Buffer.from(`${JSON.stringify(summary, null, 2)}\n`)), /canonical/u);
});

test('compact summary is closed, privacy-safe, and keeps the r12 protocol gap fail closed', () => {
  const summary = sampleSummary();
  assert.doesNotThrow(() => assertCompactSummary(summary));
  assert.throws(() => assertCompactSummary({ ...summary, rawPath: 'forbidden' }), /closed key set|forbidden/u);
  assert.throws(() => assertCompactSummary({
    ...summary,
    provenance: { ...summary.provenance, endpoint: 'forbidden' },
  }), /closed key set|forbidden/u);
  assert.throws(() => assertCompactSummary({
    ...summary,
    baselineRunId: 'r13',
  }), /identity|protocol hash/u);
  assert.throws(() => assertCompactSummary({
    ...summary,
    promotion: { ...summary.promotion, eligible: true },
  }), /automated-only|promotion|protocol hash/u);
  assert.throws(() => assertCompactSummary({
    ...summary,
    provenance: {
      ...summary.provenance,
      protocolHash: HEX64,
      protocolHashStatus: 'recorded',
    },
  }), /not execution-captured|must remain null/u);
  assert.throws(() => assertCompactSummary({
    ...summary,
    provenance: { ...summary.provenance, privacyRuleHash: HEX64 },
  }), /privacy rule hash/u);
  for (const invalidStartedAt of [
    '2026-99-99T08:03:03.803Z',
    '2026-02-31T08:03:03.803Z',
    '2025-02-29T08:03:03.803Z',
    '2026-04-31T08:03:03.803Z',
  ]) {
    assert.equal(isUtcInstant(invalidStartedAt), false);
    assert.throws(() => assertCompactSummary({
      ...summary,
      provenance: { ...summary.provenance, startedAt: invalidStartedAt },
    }), /trusted r12 execution record|timestamps/u);
  }
  assert.throws(() => assertCompactSummary({
    ...summary,
    redaction: { ...summary.redaction, status: 'approved' },
  }), /human review|redaction/u);
  assert.throws(() => assertCompactSummary({
    ...summary,
    provenance: { ...summary.provenance, endpoint: 'https://example.invalid/api/v1' },
  }), /closed key set|forbidden/u);
  assert.throws(() => assertCompactSummary({
    ...summary,
    limitations: [...summary.limitations, '192.0.2.1'],
  }), /limitations|forbidden/u);

  const forgedToolingMatch = structuredClone(summary);
  forgedToolingMatch.provenance.toolingHashStatus = 'retrospective-protocol-record-current-bytes-match';
  forgedToolingMatch.limitations = forgedToolingMatch.limitations.filter(
    (value) => value !== 'current-tooling-drifted-after-r12',
  );
  assert.throws(() => assertCompactSummary(forgedToolingMatch), /toolingHashStatus/u);

  const falseFinishCount = structuredClone(summary);
  falseFinishCount.provenance.finishVerificationScenarioCount = 999;
  assert.throws(() => assertCompactSummary(falseFinishCount), /exactly eight scenarios/u);

  const forgedApproval = structuredClone(summary);
  forgedApproval.redaction.humanReviewCompletedCount = 8;
  forgedApproval.redaction.humanReviewPendingCount = 0;
  forgedApproval.redaction.status = 'approved';
  forgedApproval.limitations = forgedApproval.limitations.filter(
    (value) => value !== 'human-redaction-review-pending',
  );
  forgedApproval.promotion.blockerCodes = ['manual-at-evidence'];
  assert.throws(() => assertCompactSummary(forgedApproval), /reviewer role attestation/u);

  const twoRoleApproval = structuredClone(forgedApproval);
  twoRoleApproval.redaction.approvedByRoles = ['quality-engineering', 'repository-governance'];
  assert.doesNotThrow(() => assertCompactSummary(twoRoleApproval));
  twoRoleApproval.redaction.approvedByRoles.reverse();
  assert.throws(() => assertCompactSummary(twoRoleApproval), /reviewer role attestation/u);
});

test('publication privacy policy, raw provenance, and axe counters are fail closed', () => {
  assert.equal(assertPublicationPrivacyPolicy(PRIVACY_POLICY), PRIVACY_RULE_HASH);
  const weakenedPrivacy = structuredClone(PRIVACY_POLICY);
  weakenedPrivacy.forbiddenArtifactKeys = [];
  assert.throws(() => assertPublicationPrivacyPolicy(weakenedPrivacy), /privacy policy/u);
  assert.throws(() => assertPublicationPrivacyPolicy({ ...PRIVACY_POLICY, allowRaw: true }), /closed key set/u);

  const environment = {
    protocolVersion: 1,
    manifestHash: R12_PROVENANCE.executionScenarioManifestHash,
    buildSha: R12_PROVENANCE.buildSha,
    runnerVersion: 1,
    startedAt: R12_PROVENANCE.startedAt,
    routeTruthHash: R12_PROVENANCE.routeTruthHash,
    buildInputTreeHash: R12_PROVENANCE.buildInputTreeHash,
    dirtyBuildInputDiffHash: R12_PROVENANCE.dirtyBuildInputDiffHash,
    frontendBuildId: R12_PROVENANCE.frontendBuildId,
    backendBuildId: R12_PROVENANCE.backendBuildId,
  };
  const runSummary = {
    manifestHash: environment.manifestHash,
    buildSha: environment.buildSha,
    runnerVersion: environment.runnerVersion,
    startedAt: environment.startedAt,
  };
  const runProgress = {
    runnerVersion: environment.runnerVersion,
    startedAt: environment.startedAt,
  };
  const environments = Array.from({ length: 8 }, () => ({ ...environment }));
  assert.deepEqual(
    assertR12ProvenanceAgreement({ runSummary, runProgress, environmentValues: environments }),
    environment,
  );
  for (const key of ['manifestHash', 'buildSha', 'runnerVersion', 'startedAt']) {
    const tampered = { ...runSummary, [key]: key === 'runnerVersion' ? 999 : 'tampered' };
    assert.throws(
      () => assertR12ProvenanceAgreement({ runSummary: tampered, runProgress, environmentValues: environments }),
      /provenance mismatch/u,
    );
  }
  assert.throws(
    () => assertR12ProvenanceAgreement({
      runSummary,
      runProgress: { ...runProgress, runnerVersion: 999 },
      environmentValues: environments,
    }),
    /provenance mismatch/u,
  );
  assert.throws(
    () => assertR12ProvenanceAgreement({
      runSummary,
      runProgress,
      environmentValues: environments.map((value) => ({ ...value, protocolVersion: 2 })),
    }),
    /protocolVersion/u,
  );

  assert.deepEqual(summarizeRedactedAxe([]), { violationCount: 0, nodeCount: 0 });
  assert.deepEqual(summarizeRedactedAxe([{
    nodeCount: 2,
    nodes: [{ locator: 'redacted-node-1' }, { locator: 'redacted-node-2' }],
  }]), { violationCount: 1, nodeCount: 2 });
  assert.throws(() => summarizeRedactedAxe([{ nodeCount: 0, nodes: [{}] }]), /node count/u);
});

test('compact summary rejects state, task, performance, and scenario substitution', () => {
  const summary = sampleSummary();
  const duplicateState = structuredClone(summary);
  duplicateState.automated.stateCases[1].caseId = duplicateState.automated.stateCases[0].caseId;
  assert.throws(() => assertCompactSummary(duplicateState), /unique privacy-safe case ID/u);

  const permutedStates = structuredClone(summary);
  [permutedStates.automated.stateCases[0], permutedStates.automated.stateCases[1]] = [
    permutedStates.automated.stateCases[1], permutedStates.automated.stateCases[0],
  ];
  assert.throws(() => assertCompactSummary(permutedStates), /ascending caseId order/u);

  const wrongScenario = structuredClone(summary);
  wrongScenario.automated.stateCases[0].scenarioId = 'undeclared-scenario';
  assert.throws(() => assertCompactSummary(wrongScenario), /closed r12 population/u);

  const wrongEvidence = structuredClone(summary);
  const evidenceCase = wrongEvidence.automated.stateCases.find((value) => value.requiredTaskEvidenceId !== null);
  evidenceCase.requiredTaskEvidenceId = 'undeclared-task-evidence';
  assert.throws(() => assertCompactSummary(wrongEvidence), /closed r12 task population/u);

  const duplicatePerformance = structuredClone(summary);
  duplicatePerformance.automated.performance[1].renderCaseId = duplicatePerformance.automated.performance[0].renderCaseId;
  assert.throws(() => assertCompactSummary(duplicatePerformance), /unique privacy-safe case ID/u);

  const permutedPerformance = structuredClone(summary);
  [permutedPerformance.automated.performance[0], permutedPerformance.automated.performance[1]] = [
    permutedPerformance.automated.performance[1], permutedPerformance.automated.performance[0],
  ];
  assert.throws(() => assertCompactSummary(permutedPerformance), /ascending renderCaseId order/u);

  const permutedScenarios = structuredClone(summary);
  [permutedScenarios.automated.scenarios[0], permutedScenarios.automated.scenarios[1]] = [
    permutedScenarios.automated.scenarios[1], permutedScenarios.automated.scenarios[0],
  ];
  assert.throws(() => assertCompactSummary(permutedScenarios), /ascending scenarioId order/u);

  const wrongBreakdown = structuredClone(summary);
  wrongBreakdown.automated.scenarios[0].plannedStateCaseCount += 1;
  assert.throws(() => assertCompactSummary(wrongBreakdown), /exact r12 scenario population/u);
});

test('content inventory digest is order independent and changes with content', () => {
  const first = Buffer.from('first', 'utf8');
  const second = Buffer.from('second', 'utf8');
  assert.equal(aggregateContentDigest([first, second]), aggregateContentDigest([second, first]));
  assert.notEqual(aggregateContentDigest([first, second]), aggregateContentDigest([first, Buffer.from('changed')]));
  assert.throws(() => aggregateContentDigest([first, 'not-a-buffer']), /array of buffers/u);

  const pathBound = [
    { relativePath: 'a.json', bytes: first },
    { relativePath: 'b.json', bytes: second },
  ];
  assert.equal(
    aggregatePathBoundContentDigest(pathBound),
    aggregatePathBoundContentDigest([...pathBound].reverse()),
  );
  assert.notEqual(
    aggregatePathBoundContentDigest(pathBound),
    aggregatePathBoundContentDigest([
      { relativePath: 'a.json', bytes: second },
      { relativePath: 'b.json', bytes: first },
    ]),
    'the same byte multiset in different canonical slots must not preserve the digest',
  );
});

test('48 runner placeholders never impersonate collected manual evidence', () => {
  const placeholders = Array.from({ length: 48 }, (_, index) => ({
    evidenceKind: 'none',
    status: index < 40 ? 'not-run-manual-review-required' : 'blocked-external',
  }));
  assert.equal(countCollectedManualEvidence(placeholders), 0);
  assert.equal(countCollectedManualEvidence([
    ...placeholders,
    {
      evidenceKind: 'manual-observation-v1',
      status: 'pass',
      scenarioId: 'auth-login',
      checkId: 'keyboard-only',
      evidenceDigest: HEX64,
    },
  ]), 1);
  assert.equal(countCollectedManualEvidence([
    ...placeholders,
    { evidenceKind: 'none', status: 'pass' },
  ]), 0);
});

test('empty prepared index is valid but cannot become durable evidence', () => {
  const index = {
    schemaVersion: 1,
    decisionId: 'PD-UIQ-001',
    storeMode: 'versioned-compact-summary',
    currentDigest: null,
    entries: [],
  };
  assert.doesNotThrow(() => assertBaselineIndex(index, new Map()));
  assert.deepEqual(evaluateDurableEvidence({ index, summariesByDigest: new Map() }), {
    verified: false,
    reasonCode: 'durable-current-summary-not-published',
  });
  assert.throws(() => assertBaselineIndex({ ...index, currentDigest: HEX64 }, new Map()), /current digest/u);
  assert.throws(() => assertBaselineIndex({ ...index, entries: [{}] }, new Map()), /current digest|entry/u);
});

test('repository publication is durable only after committed readback and never measures r12', () => {
  const repoRoot = fileURLToPath(new URL('..', import.meta.url));
  const indexBytes = readFileSync(new URL('../config/ui-quality-baseline-index.json', import.meta.url));
  const index = assertCanonicalJsonBytes(indexBytes);
  const summaryRelativePath = `config/ui-quality-baseline/summaries/sha256-${index.currentDigest}.json`;
  const summaryBytes = readFileSync(new URL(`../${summaryRelativePath}`, import.meta.url));
  const summary = assertCanonicalJsonBytes(summaryBytes);
  assertBaselineIndex(index, new Map([[index.currentDigest, summary]]));

  let committedBytesMatch = false;
  try {
    const committedIndex = execFileSync('git', ['show', 'HEAD:config/ui-quality-baseline-index.json'], {
      cwd: repoRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
    });
    const committedSummary = execFileSync('git', ['show', `HEAD:${summaryRelativePath}`], {
      cwd: repoRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
    });
    committedBytesMatch = committedIndex.equals(indexBytes) && committedSummary.equals(summaryBytes);
  } catch {
    committedBytesMatch = false;
  }
  assert.deepEqual(verifyDurableEvidenceFromRepository({ repoRoot }), {
    verified: false,
    reasonCode: committedBytesMatch
      ? 'durable-r12-automated-summary-not-measured-eligible'
      : 'durable-repository-readback-invalid',
  });
});

test('current repository enforces the append-only index against the CI event base', () => {
  const repoRoot = fileURLToPath(new URL('..', import.meta.url));
  assert.doesNotThrow(() => assertRepositoryIndexAppendOnly({ repoRoot }));
});

test('an explicit repository root ignores inherited Git hook repository state', () => {
  const root = mkdtempSync(join(tmpdir(), 'ui-quality-publication-git-env-'));
  const inherited = new Map([
    ['GIT_DIR', process.env.GIT_DIR],
    ['GIT_WORK_TREE', process.env.GIT_WORK_TREE],
  ]);
  try {
    runGit(root, ['init']);
    runGit(root, ['config', 'core.autocrlf', 'false']);
    runGit(root, ['config', 'user.email', 'ui-quality-contract@example.invalid']);
    runGit(root, ['config', 'user.name', 'UI Quality Contract']);
    writeCanonicalIndex(root, fixtureIndex([]));
    runGit(root, ['add', 'config/ui-quality-baseline-index.json']);
    runGit(root, ['commit', '-m', 'prepared isolated index']);

    const outerRoot = fileURLToPath(new URL('..', import.meta.url));
    process.env.GIT_DIR = execFileSync('git', ['rev-parse', '--absolute-git-dir'], {
      cwd: outerRoot,
      encoding: 'utf8',
      windowsHide: true,
    }).trim();
    process.env.GIT_WORK_TREE = outerRoot;
    assert.doesNotThrow(() => assertRepositoryIndexAppendOnly({
      repoRoot: root,
      previousRevision: 'HEAD',
    }));
  } finally {
    for (const [key, value] of inherited) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(root, { recursive: true, force: true });
  }
});

test('baseline index history is an exact append-only prefix', () => {
  const empty = {
    schemaVersion: 1,
    decisionId: 'PD-UIQ-001',
    storeMode: 'versioned-compact-summary',
    currentDigest: null,
    entries: [],
  };
  const firstEntry = { artifactDigest: 'a'.repeat(64), supersedes: null, bounded: true };
  const first = { ...empty, currentDigest: firstEntry.artifactDigest, entries: [firstEntry] };
  assert.doesNotThrow(() => assertAppendOnlyIndexTransition(empty, first));
  const secondEntry = {
    artifactDigest: 'b'.repeat(64),
    supersedes: firstEntry.artifactDigest,
    bounded: true,
  };
  const second = { ...first, currentDigest: secondEntry.artifactDigest, entries: [firstEntry, secondEntry] };
  assert.doesNotThrow(() => assertAppendOnlyIndexTransition(first, second));
  assert.throws(() => assertAppendOnlyIndexTransition(first, empty), /preserve history/u);
  assert.throws(() => assertAppendOnlyIndexTransition(second, first), /preserve history/u);
  const mutatedPrefix = structuredClone(second);
  mutatedPrefix.entries[0].bounded = false;
  assert.throws(() => assertAppendOnlyIndexTransition(first, mutatedPrefix), /historical entry prefix/u);
  const reordered = { ...second, entries: [secondEntry, firstEntry] };
  assert.throws(() => assertAppendOnlyIndexTransition(first, reordered), /historical entry prefix/u);
  const forked = structuredClone(second);
  forked.entries[1].supersedes = null;
  assert.throws(() => assertAppendOnlyIndexTransition(first, forked), /supersede/u);
});

test('required CI compares the full event range and rejects hidden history truncation', () => {
  const root = mkdtempSync(join(tmpdir(), 'ui-quality-publication-range-'));
  try {
    runGit(root, ['init']);
    runGit(root, ['config', 'user.email', 'ui-quality-contract@example.invalid']);
    runGit(root, ['config', 'user.name', 'UI Quality Contract']);
    const first = { artifactDigest: 'a'.repeat(64), supersedes: null };
    const second = { artifactDigest: 'b'.repeat(64), supersedes: first.artifactDigest };
    writeCanonicalIndex(root, fixtureIndex([first, second]));
    runGit(root, ['add', 'config/ui-quality-baseline-index.json']);
    runGit(root, ['commit', '-m', 'valid evidence history']);
    const eventBase = runGit(root, ['rev-parse', 'HEAD']);

    writeCanonicalIndex(root, fixtureIndex([{ ...second, supersedes: null }]));
    runGit(root, ['add', 'config/ui-quality-baseline-index.json']);
    runGit(root, ['commit', '-m', 'truncate evidence history']);
    writeFileSync(join(root, 'unrelated.txt'), 'no-op evidence change\n', 'utf8');
    runGit(root, ['add', 'unrelated.txt']);
    runGit(root, ['commit', '-m', 'unrelated follow-up']);

    assert.doesNotThrow(() => assertRepositoryIndexAppendOnly({
      repoRoot: root,
      previousRevision: 'HEAD^',
    }), 'the former last-parent comparison reproduces the false green');
    assert.throws(() => assertRepositoryIndexAppendOnly({
      repoRoot: root,
      githubActions: true,
      eventName: 'push',
      eventBaseRevision: eventBase,
    }), /preserve history/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('required CI fails closed without an immutable event base', () => {
  const root = mkdtempSync(join(tmpdir(), 'ui-quality-publication-base-'));
  try {
    runGit(root, ['init']);
    runGit(root, ['config', 'user.email', 'ui-quality-contract@example.invalid']);
    runGit(root, ['config', 'user.name', 'UI Quality Contract']);
    writeCanonicalIndex(root, fixtureIndex([]));
    runGit(root, ['add', 'config/ui-quality-baseline-index.json']);
    runGit(root, ['commit', '-m', 'prepared evidence index']);

    for (const eventBaseRevision of ['', '0'.repeat(40), 'f'.repeat(40)]) {
      assert.throws(() => assertRepositoryIndexAppendOnly({
        repoRoot: root,
        githubActions: true,
        eventName: 'push',
        eventBaseRevision,
      }), /event base revision/u);
    }
    assert.throws(() => assertRepositoryIndexAppendOnly({
      repoRoot: root,
      githubActions: true,
      eventName: 'workflow_dispatch',
      eventBaseRevision: runGit(root, ['rev-parse', 'HEAD']),
    }), /workflow_dispatch/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('required operational CI passes the immutable event base to publication validation', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(
    workflow,
    /UI_QUALITY_INDEX_BASE_SHA:\s*\$\{\{ github\.event\.pull_request\.base\.sha \|\| github\.event\.before \}\}/u,
  );
});

test('automated-only or pending-redaction summary can never satisfy measured promotion', () => {
  const summary = sampleSummary();
  const bytes = canonicalJsonBytes(summary);
  const digest = sha256Hex(bytes);
  const entry = {
    schemaVersion: 1,
    baselineRunId: 'r12',
    evidenceScope: 'automated-only',
    protocolVersion: 1,
    protocolHash: null,
    protocolHashStatus: 'not-recorded-in-r12',
    buildSha: summary.provenance.buildSha,
    buildInputTreeHash: summary.provenance.buildInputTreeHash,
    dirtyBuildInputDiffHash: summary.provenance.dirtyBuildInputDiffHash,
    executionScenarioManifestHash: summary.provenance.executionScenarioManifestHash,
    executionPlanHash: summary.provenance.executionPlanHash,
    runnerHash: summary.provenance.runnerHash,
    coreHash: summary.provenance.coreHash,
    runnerContractHash: summary.provenance.runnerContractHash,
    scenarioContractHash: summary.provenance.scenarioContractHash,
    routeTruthHash: summary.provenance.routeTruthHash,
    privacyRuleHash: summary.provenance.privacyRuleHash,
    sourceArtifactAggregateDigest: summary.sourceInventory.inventoryDigest,
    artifactDigest: digest,
    jsonFileCount: 1,
    automatedJsonFileCount: 282,
    diagnosticJsonFileCount: 8,
    manualEvidenceCount: 0,
    mediaType: 'application/vnd.egov.ui-quality-baseline-summary+json',
    immutableObjectIdentity: `git-blob-sha1:${HEX40}`,
    createdAt: '2026-08-21T08:13:41.730Z',
    retentionExpiry: '2036-08-18T08:13:41.730Z',
    redactionStatus: 'automated-privacy-guard-passed-human-review-pending',
    status: 'published',
    supersedes: null,
  };
  const index = {
    schemaVersion: 1,
    decisionId: 'PD-UIQ-001',
    storeMode: 'versioned-compact-summary',
    currentDigest: digest,
    entries: [entry],
  };
  assert.throws(() => assertBaselineIndex(index, new Map([[digest, summary]])), /redaction/u);
  const approvedSummary = {
    ...summary,
    redaction: {
      ...summary.redaction,
      humanReviewCompletedCount: 8,
      humanReviewPendingCount: 0,
      approvedByRoles: ['quality-engineering'],
      status: 'approved',
    },
    limitations: summary.limitations.filter((code) => code !== 'human-redaction-review-pending'),
    promotion: {
      ...summary.promotion,
      blockerCodes: ['manual-at-evidence'],
    },
  };
  const approvedDigest = sha256Hex(canonicalJsonBytes(approvedSummary));
  const approvedEntry = {
    ...entry,
    artifactDigest: approvedDigest,
    redactionStatus: 'approved',
  };
  const approvedIndex = {
    ...index,
    currentDigest: approvedDigest,
    entries: [approvedEntry],
  };
  assert.doesNotThrow(() => assertBaselineIndex(
    approvedIndex,
    new Map([[approvedDigest, approvedSummary]]),
  ));
  assert.deepEqual(evaluateDurableEvidence({
    index: approvedIndex,
    summariesByDigest: new Map([[approvedDigest, approvedSummary]]),
    trackedBlobIdentityByDigest: new Map([[approvedDigest, approvedEntry.immutableObjectIdentity]]),
  }), {
    verified: false,
    reasonCode: 'durable-r12-automated-summary-not-measured-eligible',
  });

  const pendingPredecessor = {
    ...entry,
    immutableObjectIdentity: `git-blob-sha1:${'c'.repeat(40)}`,
  };
  const approvedSuccessor = {
    ...approvedEntry,
    supersedes: digest,
  };
  assert.throws(() => assertBaselineIndex({
    ...index,
    currentDigest: approvedDigest,
    entries: [pendingPredecessor, approvedSuccessor],
  }, new Map([
    [digest, summary],
    [approvedDigest, approvedSummary],
  ])), /every published index entry requires approved/u);
});

test('a protocol-captured combined v2 summary binds exact 96/48 automation to finding-preserving 8x6 manual evidence', () => {
  const combined = sampleCombinedSummary();
  assert.doesNotThrow(() => assertCombinedCompactSummary(combined));
  assert.equal(combined.schemaVersion, 2);
  assert.equal(combined.baselineRunId, 'r13');
  assert.equal(combined.provenance.protocolHashStatus, 'recorded');
  assert.equal(combined.provenance.protocolHashVerifiedAtFinish, true);
  assert.equal(
    combined.sourceInventory.aggregateAlgorithm,
    'sha256-json-sorted-path-content-digests-v2',
  );
  assert.equal(
    combined.sourceRun.automatedProjectionDigest,
    sha256Hex(canonicalJsonBytes(combined.automated)),
  );
  assert.equal(
    combined.sourceInventory.automatedRunSealFileDigest,
    sha256Hex(canonicalJsonBytes(combined.sourceRun)),
  );
  assert.equal(combined.automated.plannedStateCaseCount, 96);
  assert.equal(combined.automated.observedStateCaseCount, 96);
  assert.equal(combined.automated.plannedPerformanceCaseCount, 48);
  assert.equal(combined.automated.observedPerformanceCaseCount, 48);
  assert.equal(combined.manual.requiredEvidenceCount, 48);
  assert.equal(combined.manual.completedEvidenceCount, 48);
  assert.equal(combined.manual.findingCount, 24, 'manual fail findings must be preserved, not hidden');
  assert.deepEqual(combined.promotion, {
    status: 'measured',
    eligible: true,
    blockerCodes: [],
  });

  const r12 = assertCanonicalJsonBytes(readFileSync(new URL(
    `../config/ui-quality-baseline/summaries/sha256-${R12_PUBLISHED_DIGEST}.json`,
    import.meta.url,
  )));
  assert.equal(sha256Hex(canonicalJsonBytes(r12)), R12_PUBLISHED_DIGEST);
  const r12Entry = buildPublishedIndexEntry({
    summary: r12,
    immutableObjectIdentity: `git-blob-sha1:${HEX40}`,
    createdAt: '2026-08-21T14:45:54.299Z',
    supersedes: null,
  });
  const combinedEntry = buildPublishedIndexEntry({
    summary: combined,
    immutableObjectIdentity: `git-blob-sha1:${'c'.repeat(40)}`,
    createdAt: '2026-08-22T02:00:00.000Z',
    supersedes: R12_PUBLISHED_DIGEST,
  });
  const index = fixtureIndex([r12Entry, combinedEntry]);
  const summariesByDigest = new Map([
    [r12Entry.artifactDigest, r12],
    [combinedEntry.artifactDigest, combined],
  ]);
  assert.doesNotThrow(() => assertBaselineIndex(index, summariesByDigest));
  const verified = evaluateDurableEvidence({
    index,
    summariesByDigest,
    trackedBlobIdentityByDigest: new Map([
      [r12Entry.artifactDigest, r12Entry.immutableObjectIdentity],
      [combinedEntry.artifactDigest, combinedEntry.immutableObjectIdentity],
    ]),
  });
  assert.equal(verified.verified, true);
  assert.equal(verified.reasonCode, 'durable-combined-summary-measured-eligible');
  assert.equal(verified.baselineRunId, 'r13');
  assert.equal(verified.executionId, combined.provenance.executionId);
  assert.equal(verified.currentDigest, combinedEntry.artifactDigest);
  assert.equal(verified.scenarioEvidence.length, 8);
  assert.deepEqual(verified.scenarioEvidence.map(({ scenarioId }) => scenarioId),
    combined.automated.scenarios.map(({ scenarioId }) => scenarioId));
  assert.equal(verified.scenarioEvidence.reduce(
    (count, scenario) => count + scenario.manualFindingCount,
    0,
  ), 24);
});

test('combined v2 becomes measured only after clean committed protocol, build-input, tooling, and blob readback', () => {
  const root = mkdtempSync(join(tmpdir(), 'uiq-combined-readback-'));
  try {
    runGit(root, ['init']);
    runGit(root, ['config', 'user.name', 'Repository Governance']);
    runGit(root, ['config', 'user.email', 'repository-governance@example.invalid']);
    const protocolPath = 'docs/04-operations/ui-ux-baseline-protocol.md';
    const manifestPath = 'config/ui-quality-scenarios.json';
    const routeTruthPath = 'config/ui-route-capabilities.json';
    const toolingPaths = {
      runnerHash: 'frontend/scripts/ui-quality-baseline-runner.mjs',
      coreHash: 'frontend/scripts/ui-quality-baseline-core.mjs',
      runnerContractHash: 'scripts/ui-quality-baseline-runner-contract.test.mjs',
      scenarioContractHash: 'scripts/ui-quality-scenarios-contract.test.mjs',
    };
    const buildPaths = new Set([
      ...REQUIRED_PRODUCTION_BUILD_INPUT_FILES,
      protocolPath,
      manifestPath,
      routeTruthPath,
      ...Object.values(toolingPaths),
    ]);
    for (const relativePath of buildPaths) {
      writeRepositoryFile(root, relativePath, readFileSync(new URL(`../${relativePath}`, import.meta.url)));
    }
    runGit(root, ['add', '--', '.']);
    runGit(root, ['commit', '-m', 'fixture: freeze r13 execution inputs']);
    const buildSha = runGit(root, ['rev-parse', 'HEAD']);
    const selectedBuildInputs = selectProductionBuildInputPaths(runGitBuffer(root, [
      'ls-tree', '-r', '--name-only', '-z', buildSha, '--', ...PRODUCTION_BUILD_INPUT_PATHS,
    ]).toString('utf8').split('\0').filter(Boolean));
    for (const requiredPath of REQUIRED_PRODUCTION_BUILD_INPUT_FILES) {
      assert.equal(selectedBuildInputs.includes(requiredPath), true);
    }
    const buildInputTreeHash = createProductionBuildInputTreeHash({
      trackedPaths: selectedBuildInputs,
      readCommittedFile: (relativePath) => runGitBuffer(
        root,
        ['show', `${buildSha}:${relativePath}`],
      ),
    });
    const manifest = JSON.parse(readFileSync(join(root, ...manifestPath.split('/')), 'utf8'));
    const routeTruth = JSON.parse(readFileSync(join(root, ...routeTruthPath.split('/')), 'utf8'));
    const provenanceOverrides = {
      buildSha,
      protocolHash: sha256Hex(readFileSync(join(root, ...protocolPath.split('/')))),
      executionScenarioManifestHash: sha256Hex(Buffer.from(stableJson(manifest), 'utf8')),
      executionPlanHash: sha256Hex(Buffer.from(stableJson(buildExecutionPlan(manifest)), 'utf8')),
      routeTruthHash: sha256Hex(Buffer.from(stableJson(routeTruth), 'utf8')),
      privacyRuleHash: sha256Hex(canonicalJsonBytes(manifest.privacy)),
      buildInputTreeHash,
      ...Object.fromEntries(Object.entries(toolingPaths).map(([key, relativePath]) => [
        key,
        sha256Hex(readFileSync(join(root, ...relativePath.split('/')))),
      ])),
    };
    const combined = sampleCombinedSummary({ provenanceOverrides });
    assert.doesNotThrow(() => assertCombinedRepositoryProvenance(root, combined));
    const r12 = assertCanonicalJsonBytes(readFileSync(new URL(
      `../config/ui-quality-baseline/summaries/sha256-${R12_PUBLISHED_DIGEST}.json`,
      import.meta.url,
    )));
    const summaryDirectory = join(root, 'config', 'ui-quality-baseline', 'summaries');
    mkdirSync(summaryDirectory, { recursive: true });
    const r12RelativePath = `config/ui-quality-baseline/summaries/sha256-${R12_PUBLISHED_DIGEST}.json`;
    const combinedDigest = sha256Hex(canonicalJsonBytes(combined));
    const combinedRelativePath = `config/ui-quality-baseline/summaries/sha256-${combinedDigest}.json`;
    writeRepositoryFile(root, r12RelativePath, canonicalJsonBytes(r12));
    writeRepositoryFile(root, combinedRelativePath, canonicalJsonBytes(combined));
    const r12Entry = buildPublishedIndexEntry({
      summary: r12,
      immutableObjectIdentity: `git-blob-sha1:${runGit(root, ['hash-object', r12RelativePath])}`,
      createdAt: '2026-08-21T14:45:54.299Z',
      supersedes: null,
    });
    const combinedEntry = buildPublishedIndexEntry({
      summary: combined,
      immutableObjectIdentity: `git-blob-sha1:${runGit(root, ['hash-object', combinedRelativePath])}`,
      createdAt: '2026-08-22T02:00:00.000Z',
      supersedes: R12_PUBLISHED_DIGEST,
    });
    writeCanonicalIndex(root, fixtureIndex([r12Entry, combinedEntry]));
    runGit(root, ['add', '--', 'config/ui-quality-baseline-index.json', 'config/ui-quality-baseline']);
    runGit(root, ['commit', '-m', 'fixture: publish combined durable evidence']);

    const verified = verifyDurableEvidenceFromRepository({ repoRoot: root });
    assert.equal(verified.verified, true);
    assert.equal(verified.baselineRunId, 'r13');
    assert.equal(verified.currentDigest, combinedDigest);
    assert.equal(verified.scenarioEvidence.length, 8);

    writeRepositoryFile(
      root,
      protocolPath,
      Buffer.concat([readFileSync(join(root, ...protocolPath.split('/'))), Buffer.from('\n')]),
    );
    assert.deepEqual(verifyDurableEvidenceFromRepository({ repoRoot: root }), {
      verified: false,
      reasonCode: 'durable-repository-readback-invalid',
    });

    writeRepositoryFile(
      root,
      protocolPath,
      runGitBuffer(root, ['show', `HEAD:${protocolPath}`]),
    );
    assert.equal(verifyDurableEvidenceFromRepository({ repoRoot: root }).verified, true);

    const tampered = structuredClone(combined);
    for (const key of ['minimum', 'median', 'maximum']) {
      tampered.automated.performance[0].cold.lcpMs[key] += 777;
    }
    rebindManualToAutomatedProjection(tampered);
    const tamperedDigest = sha256Hex(canonicalJsonBytes(tampered));
    const tamperedRelativePath = `config/ui-quality-baseline/summaries/sha256-${tamperedDigest}.json`;
    rmSync(join(root, ...combinedRelativePath.split('/')));
    writeRepositoryFile(root, tamperedRelativePath, canonicalJsonBytes(tampered));
    const tamperedEntry = {
      ...combinedEntry,
      artifactDigest: tamperedDigest,
      immutableObjectIdentity: `git-blob-sha1:${runGit(root, ['hash-object', tamperedRelativePath])}`,
    };
    writeCanonicalIndex(root, fixtureIndex([r12Entry, tamperedEntry]));
    runGit(root, ['add', '-A', '--', 'config/ui-quality-baseline-index.json', 'config/ui-quality-baseline']);
    runGit(root, ['commit', '-m', 'fixture: attempt sealed projection rewrite']);
    assert.deepEqual(verifyDurableEvidenceFromRepository({ repoRoot: root }), {
      verified: false,
      reasonCode: 'durable-index-or-summary-invalid',
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('combined v2 consumes one direct finalized runner seal and rejects cross-attempt raw artifacts', () => {
  assert.throws(() => sampleCombinedAutomatedEvidence((inputs) => {
    inputs.automatedRunSeal.final = false;
  }), /runner-emitted.*seal|sealed automated artifact inventory/u);

  assert.throws(() => sampleCombinedAutomatedEvidence((inputs) => {
    const mixed = JSON.parse(inputs.automatedArtifactEntries[20].bytes.toString('utf8'));
    mixed.executionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    inputs.automatedArtifactEntries[20].bytes = Buffer.from(
      `${JSON.stringify(mixed, null, 2)}\n`,
      'utf8',
    );
  }), /mixed execution identity/u);

  assert.throws(() => sampleCombinedAutomatedEvidence((inputs) => {
    const entry = inputs.automatedArtifactEntries[20];
    entry.bytes = Buffer.from(`${JSON.stringify(JSON.parse(entry.bytes.toString('utf8')))}\n`, 'utf8');
  }), /canonical JSON artifact bytes/u);

  assert.throws(() => sampleCombinedAutomatedEvidence((inputs) => {
    const checkpoint = inputs.automatedArtifactEntries.find(
      ({ relativePath }) => relativePath.startsWith('checkpoints/'),
    );
    checkpoint.relativePath = 'checkpoints/uiq-ffffffffffffffffffff.json';
  }), /missing, extra, or substituted artifact path/u);

  assert.throws(() => sampleCombinedAutomatedEvidence((inputs) => {
    const checkpoint = inputs.automatedArtifactEntries.find(
      ({ relativePath }) => relativePath.startsWith('checkpoints/'),
    );
    const raw = JSON.parse(checkpoint.bytes.toString('utf8'));
    raw.automatedFindingCodes = ['raw-finding-must-not-be-hidden'];
    raw.automatedOutcome = 'automated-findings-observed';
    checkpoint.bytes = Buffer.from(`${JSON.stringify(raw, null, 2)}\n`, 'utf8');
  }), /raw state projection/u);

  assert.throws(() => sampleCombinedAutomatedEvidence((inputs) => {
    const runSummary = inputs.automatedArtifactEntries.find(
      ({ relativePath }) => relativePath === 'run-summary.json',
    );
    const manualPlaceholder = inputs.automatedArtifactEntries.find(
      ({ relativePath }) => relativePath === 'auth-login/manual/manual-checks.json',
    );
    [runSummary.bytes, manualPlaceholder.bytes] = [manualPlaceholder.bytes, runSummary.bytes];
  }), /path-bound|run summary.*path|final marker.*path/u);

  assert.throws(() => sampleCombinedAutomatedEvidence((inputs) => {
    const manualPlaceholder = inputs.automatedArtifactEntries.find(
      ({ relativePath }) => relativePath === 'auth-login/manual/manual-checks.json',
    );
    const taskObservation = inputs.automatedArtifactEntries.find(
      ({ relativePath }) => relativePath === 'auth-login/task-observations.json',
    );
    [manualPlaceholder.bytes, taskObservation.bytes] = [taskObservation.bytes, manualPlaceholder.bytes];
  }), /path-bound|raw artifact inventory|mixed provenance/u);

  const mixedManualAttempt = sampleCombinedSummary();
  mixedManualAttempt.manual.observations[0].executionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  recomputeManualDigest(mixedManualAttempt);
  assert.throws(() => assertCombinedCompactSummary(mixedManualAttempt), /mixed automated execution identity/u);
});

test('combined v2 builder rejects missing or caller-substituted manual automation bindings', () => {
  const automatedEvidence = sampleCombinedAutomatedEvidence();
  const missing = sampleManualObservations(automatedEvidence);
  delete missing[0].automatedEvidenceDigest;
  assert.throws(() => buildCombinedCompactSummary({
    automatedEvidence,
    manualObservations: missing,
    redaction: sampleCombinedSummary().redaction,
  }), /missing or mixed automated evidence provenance/u);

  const wrong = sampleManualObservations(automatedEvidence);
  wrong[0].automatedEvidenceDigest = 'f'.repeat(64);
  assert.throws(() => buildCombinedCompactSummary({
    automatedEvidence,
    manualObservations: wrong,
    redaction: sampleCombinedSummary().redaction,
  }), /missing or mixed automated evidence provenance/u);
});

test('combined v2 seal commits the exact raw-derived automated projection', () => {
  const tampered = sampleCombinedSummary();
  for (const key of ['minimum', 'median', 'maximum']) {
    tampered.automated.performance[0].cold.lcpMs[key] += 777;
  }
  rebindManualToAutomatedProjection(tampered);
  assert.throws(
    () => assertCombinedCompactSummary(tampered),
    /automated projection digest/u,
  );
});

test('combined v2 rejects substituted plans, relocated task evidence, and relabeled r12 automation', () => {
  const substitutedState = sampleCombinedSummary();
  substitutedState.automated.stateCases[0].caseId = `uiq-${'f'.repeat(20)}`;
  assert.throws(() => assertCombinedCompactSummary(substitutedState), /exact r13 execution plan/u);

  const relocatedTask = sampleCombinedSummary();
  const taskCases = relocatedTask.automated.stateCases.filter(
    ({ requiredTaskEvidenceId }) => requiredTaskEvidenceId !== null,
  );
  [taskCases[0].requiredTaskEvidenceId, taskCases[1].requiredTaskEvidenceId] = [
    taskCases[1].requiredTaskEvidenceId,
    taskCases[0].requiredTaskEvidenceId,
  ];
  assert.throws(() => assertCombinedCompactSummary(relocatedTask), /exact r13 execution plan/u);

  const wrongPlanHash = sampleCombinedSummary();
  wrongPlanHash.provenance.executionPlanHash = 'f'.repeat(64);
  assert.throws(() => assertCombinedCompactSummary(wrongPlanHash), /frozen r13 manifest and execution plan/u);

  const relabeledR12 = sampleCombinedSummary();
  relabeledR12.automated = assertCanonicalJsonBytes(readFileSync(new URL(
    `../config/ui-quality-baseline/summaries/sha256-${R12_PUBLISHED_DIGEST}.json`,
    import.meta.url,
  ))).automated;
  assert.throws(() => assertCombinedCompactSummary(relabeledR12), /historical r12 automated payload/u);

  const relabeledAttempt = sampleCombinedSummary();
  relabeledAttempt.baselineRunId = 'r999';
  assert.throws(() => assertCombinedCompactSummary(relabeledAttempt), /exact new r13|identity/u);
});

test('combined v2 rejects 47/48, extra, and duplicate manual scenario/check populations', () => {
  const missing = sampleCombinedSummary();
  missing.manual.observations.pop();
  missing.manual.completedEvidenceCount = 47;
  recomputeManualDigest(missing);
  assert.throws(() => assertCombinedCompactSummary(missing), /exact 48|8x6|manual population/u);

  const extra = sampleCombinedSummary();
  extra.manual.observations.push(structuredClone(extra.manual.observations[0]));
  extra.manual.completedEvidenceCount = 49;
  recomputeManualDigest(extra);
  assert.throws(() => assertCombinedCompactSummary(extra), /exact 48|8x6|manual population/u);

  const duplicate = sampleCombinedSummary();
  duplicate.manual.observations.at(-1).scenarioId = duplicate.manual.observations[0].scenarioId;
  duplicate.manual.observations.at(-1).checkId = duplicate.manual.observations[0].checkId;
  duplicate.manual.observations.at(-1).environment = duplicate.manual.observations[0].environment;
  recomputeManualDigest(duplicate);
  assert.throws(() => assertCombinedCompactSummary(duplicate), /unique scenarioId.*checkId|8x6/u);
});

test('combined v2 rejects mixed provenance, wrong binding digests, and incomplete manual statuses', () => {
  const mixed = sampleCombinedSummary();
  mixed.manual.observations[0].protocolHash = 'e'.repeat(64);
  recomputeManualDigest(mixed);
  assert.throws(() => assertCombinedCompactSummary(mixed), /protocol.*same|mixed provenance/u);

  for (const verificationField of [
    'protocolHashVerifiedAtStart',
    'protocolHashVerifiedAtFinish',
  ]) {
    const unverifiedSession = sampleCombinedSummary();
    unverifiedSession.manual.observations[0][verificationField] = false;
    recomputeManualDigest(unverifiedSession);
    assert.throws(
      () => assertCombinedCompactSummary(unverifiedSession),
      /protocol hash must use the same automated provenance/u,
    );
  }

  const wrongAutomatedDigest = sampleCombinedSummary();
  wrongAutomatedDigest.manual.automatedEvidenceDigest = 'f'.repeat(64);
  assert.throws(() => assertCombinedCompactSummary(wrongAutomatedDigest), /automated evidence digest/u);

  const wrongManualDigest = sampleCombinedSummary();
  wrongManualDigest.manual.evidenceDigest = 'f'.repeat(64);
  assert.throws(() => assertCombinedCompactSummary(wrongManualDigest), /manual evidence digest/u);

  const wrongObservationDigest = sampleCombinedSummary();
  wrongObservationDigest.manual.observations[0].evidenceDigest = 'f'.repeat(64);
  wrongObservationDigest.manual.evidenceDigest = sha256Hex(canonicalJsonBytes(
    wrongObservationDigest.manual.observations,
  ));
  assert.throws(() => assertCombinedCompactSummary(wrongObservationDigest), /evidenceDigest.*bound/u);

  for (const status of ['blocked', 'not-run', 'invalid']) {
    const incomplete = sampleCombinedSummary();
    incomplete.manual.observations[0].status = status;
    recomputeManualDigest(incomplete);
    assert.throws(
      () => assertCombinedCompactSummary(incomplete),
      /manual.*status|pass.*fail|complete/u,
      `${status} must never count as completed manual evidence`,
    );
  }
});

test('combined v2 closes environment, reviewer-role, redaction, and privacy-safe field vocabularies', () => {
  const invalidEnvironment = sampleCombinedSummary();
  invalidEnvironment.manual.observations[0].environment = 'simulation';
  recomputeManualDigest(invalidEnvironment);
  assert.throws(() => assertCombinedCompactSummary(invalidEnvironment), /environment/u);

  const namedReviewer = sampleCombinedSummary();
  namedReviewer.manual.observations[0].reviewerRole = 'named-person';
  recomputeManualDigest(namedReviewer);
  assert.throws(() => assertCombinedCompactSummary(namedReviewer), /reviewer role/u);

  const pendingRedaction = sampleCombinedSummary();
  pendingRedaction.manual.observations[0].redaction.status = 'pending';
  recomputeManualDigest(pendingRedaction);
  assert.throws(() => assertCombinedCompactSummary(pendingRedaction), /redaction/u);

  for (const forbiddenField of [
    'rawPath', 'url', 'locator', 'dom', 'request', 'response',
    'authorization', 'ipAddress', 'reviewerName',
  ]) {
    const unsafe = sampleCombinedSummary();
    unsafe.manual.observations[0][forbiddenField] = 'forbidden';
    recomputeManualDigest(unsafe);
    assert.throws(
      () => assertCombinedCompactSummary(unsafe),
      /closed key set|forbidden|privacy/u,
      `${forbiddenField} must not enter durable evidence`,
    );
  }
});

test('combined v2 cannot retrofit r12 protocol provenance or supersede any digest except published r12', () => {
  const retrospective = sampleCombinedSummary();
  retrospective.baselineRunId = 'r12';
  assert.throws(() => assertCombinedCompactSummary(retrospective), /new run|r12|identity/u);

  const forgedR12 = sampleSummary();
  forgedR12.provenance.protocolHash = 'c'.repeat(64);
  forgedR12.provenance.protocolHashStatus = 'recorded';
  assert.throws(() => assertCompactSummary(forgedR12), /not execution-captured|must remain null/u);

  assert.throws(() => buildPublishedIndexEntry({
    summary: sampleCombinedSummary(),
    immutableObjectIdentity: `git-blob-sha1:${'c'.repeat(40)}`,
    createdAt: '2026-08-22T02:00:00.000Z',
    supersedes: 'f'.repeat(64),
  }), /exact published r12|supersede/u);
});

test('a human role attestation produces one approved historical summary and exact index entry', () => {
  const pending = sampleSummary();
  const approved = approveR12CompactSummary(pending, {
    reviewerRole: 'repository-governance',
  });
  assert.equal(approved.redaction.status, 'approved');
  assert.equal(approved.redaction.humanReviewCompletedCount, 8);
  assert.equal(approved.redaction.humanReviewPendingCount, 0);
  assert.deepEqual(approved.redaction.approvedByRoles, ['repository-governance']);
  assert.doesNotMatch(approved.limitations.join(','), /human-redaction-review-pending/u);
  assert.deepEqual(approved.promotion, {
    status: 'partial-automated-evidence',
    eligible: false,
    blockerCodes: ['manual-at-evidence'],
  });
  assertCompactSummary(approved);

  const createdAt = '2026-08-21T12:00:00.000Z';
  const entry = buildPublishedIndexEntry({
    summary: approved,
    immutableObjectIdentity: `git-blob-sha1:${HEX40}`,
    createdAt,
    supersedes: null,
  });
  assert.equal(entry.artifactDigest, sha256Hex(canonicalJsonBytes(approved)));
  assert.equal(entry.createdAt, createdAt);
  assert.equal(entry.retentionExpiry, '2036-08-18T12:00:00.000Z');
  assert.equal(entry.redactionStatus, 'approved');
  assert.equal(entry.manualEvidenceCount, 0);
  assert.equal(entry.status, 'published');
  assert.equal(entry.supersedes, null);

  assert.throws(() => approveR12CompactSummary(pending, { reviewerRole: 'unknown-role' }), /reviewer role/u);
  assert.throws(() => approveR12CompactSummary(approved, {
    reviewerRole: 'repository-governance',
  }), /pending summary/u);
  assert.throws(() => buildPublishedIndexEntry({
    summary: pending,
    immutableObjectIdentity: `git-blob-sha1:${HEX40}`,
    createdAt,
    supersedes: null,
  }), /approved/u);
});

test('Git attributes force canonical LF for tracked summary and index paths', () => {
  const attributes = readFileSync(new URL('../.gitattributes', import.meta.url), 'utf8');
  assert.match(attributes, /^config\/ui-quality-baseline\/\*\* text working-tree-encoding=UTF-8 eol=lf$/mu);
  assert.match(attributes, /^config\/ui-quality-baseline-index\.json text working-tree-encoding=UTF-8 eol=lf$/mu);
});

test('JSON schemas mirror the executable closed summary and index contracts', () => {
  const summarySchema = JSON.parse(readFileSync(
    new URL('../config/ui-quality-baseline-summary.schema.json', import.meta.url),
    'utf8',
  ));
  const indexSchema = JSON.parse(readFileSync(
    new URL('../config/ui-quality-baseline-index.schema.json', import.meta.url),
    'utf8',
  ));
  const combinedSchema = JSON.parse(readFileSync(
    new URL('../config/ui-quality-baseline-combined-summary-v2.schema.json', import.meta.url),
    'utf8',
  ));
  const policy = JSON.parse(readFileSync(
    new URL('../config/ui-quality-evidence-policy.json', import.meta.url),
    'utf8',
  ));
  const index = JSON.parse(readFileSync(
    new URL('../config/ui-quality-baseline-index.json', import.meta.url),
    'utf8',
  ));
  const summary = sampleSummary();
  const combined = sampleCombinedSummary();

  assert.equal(summarySchema.additionalProperties, false);
  assert.deepEqual([...summarySchema.required].sort(), Object.keys(summary).sort());
  assert.deepEqual([...summarySchema.$defs.provenance.required].sort(), Object.keys(summary.provenance).sort());
  assert.deepEqual([...summarySchema.$defs.sourceInventory.required].sort(), Object.keys(summary.sourceInventory).sort());
  assert.deepEqual([...summarySchema.$defs.automated.required].sort(), Object.keys(summary.automated).sort());
  assert.deepEqual([...summarySchema.$defs.stateCase.required].sort(), Object.keys(summary.automated.stateCases[0]).sort());
  assert.deepEqual([...summarySchema.$defs.scenario.required].sort(), Object.keys(summary.automated.scenarios[0]).sort());
  assert.deepEqual([...summarySchema.$defs.performanceCase.required].sort(), Object.keys(summary.automated.performance[0]).sort());

  assert.equal(indexSchema.additionalProperties, false);
  assert.deepEqual([...indexSchema.required].sort(), Object.keys(index).sort());
  assert.deepEqual(indexSchema.$defs.indexEntry.required, policy.indexSchema.requiredFields);
  assert.equal(
    indexSchema.$defs.indexEntry.properties.immutableObjectIdentity.pattern,
    '^git-blob-sha1:[0-9a-f]{40}$',
  );
  assert.equal(indexSchema.$defs.indexEntry.properties.status.const, 'published');
  assert.equal(combinedSchema.additionalProperties, false);
  assert.deepEqual([...combinedSchema.required].sort(), Object.keys(combined).sort());
  assert.deepEqual([...combinedSchema.$defs.provenance.required].sort(),
    Object.keys(combined.provenance).sort());
  assert.deepEqual([...combinedSchema.$defs.sourceRun.required].sort(),
    Object.keys(combined.sourceRun).sort());
  assert.deepEqual([...combinedSchema.$defs.sourceInventory.required].sort(),
    Object.keys(combined.sourceInventory).sort());
  assert.deepEqual([...combinedSchema.$defs.manual.required].sort(),
    Object.keys(combined.manual).sort());
  assert.deepEqual([...combinedSchema.$defs.manualObservation.required].sort(),
    Object.keys(combined.manual.observations[0]).sort());

  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictTypes: false,
    formats: {
      'date-time': {
        type: 'string',
        validate: isUtcInstant,
      },
    },
  });
  const validateSummary = ajv.compile(summarySchema);
  const validateCombined = ajv.compile(combinedSchema);
  const validateIndex = ajv.compile(indexSchema);
  assert.equal(validateSummary(summary), true, JSON.stringify(validateSummary.errors));
  assert.equal(validateCombined(combined), true, JSON.stringify(validateCombined.errors));
  assert.equal(validateIndex(index), true, JSON.stringify(validateIndex.errors));

  const combinedMissing = structuredClone(combined);
  combinedMissing.manual.observations.pop();
  combinedMissing.manual.completedEvidenceCount = 47;
  assert.equal(validateCombined(combinedMissing), false, 'combined schema must reject 47/48 manual evidence');
  const combinedIncomplete = structuredClone(combined);
  combinedIncomplete.manual.observations[0].status = 'blocked';
  assert.equal(validateCombined(combinedIncomplete), false, 'combined schema must reject blocked manual evidence');
  const combinedUnsafe = structuredClone(combined);
  combinedUnsafe.manual.observations[0].rawPath = 'forbidden';
  assert.equal(validateCombined(combinedUnsafe), false, 'combined schema must reject raw forbidden fields');
  const combinedMixedAttempt = structuredClone(combined);
  combinedMixedAttempt.manual.observations[0].executionId = 'not-an-execution-id';
  assert.equal(validateCombined(combinedMixedAttempt), false, 'combined schema must reject invalid execution identity');
  const combinedWrongEnvironmentKind = structuredClone(combined);
  const keyboardObservation = combinedWrongEnvironmentKind.manual.observations.find(
    ({ checkId }) => checkId === 'keyboard-only',
  );
  keyboardObservation.environment.kind = 'nvda-chrome-manual';
  recomputeManualDigest(combinedWrongEnvironmentKind);
  assert.equal(
    validateCombined(combinedWrongEnvironmentKind),
    false,
    'combined schema must bind every manual check ID to its exact environment kind',
  );

  const manualExtra = structuredClone(summary);
  manualExtra.manual.unexpected = true;
  assert.equal(validateSummary(manualExtra), false, 'summary schema must reject nested extra fields');
  const falseManualCompletion = structuredClone(summary);
  falseManualCompletion.manual.completedEvidenceCount = 48;
  assert.equal(validateSummary(falseManualCompletion), false, 'automated-only schema must reject manual completion');
  const falseCombined = structuredClone(summary);
  falseCombined.evidenceScope = 'combined';
  assert.equal(validateSummary(falseCombined), false, 'r12 schema must reject a fabricated combined scope');
  const falseProtocolCapture = structuredClone(summary);
  falseProtocolCapture.provenance.protocolHash = HEX64;
  falseProtocolCapture.provenance.protocolHashStatus = 'recorded';
  assert.equal(validateSummary(falseProtocolCapture), false, 'r12 schema must reject a retrospective protocol hash');
  for (const [key, value] of [
    ['protocolVersion', 2],
    ['runnerVersion', 999],
    ['buildSha', '0'.repeat(40)],
  ]) {
    const forgedProvenance = structuredClone(summary);
    forgedProvenance.provenance[key] = value;
    assert.equal(validateSummary(forgedProvenance), false, `schema must reject forged ${key}`);
  }
  const invalidCalendar = structuredClone(summary);
  invalidCalendar.provenance.startedAt = '2026-02-31T08:03:03.803Z';
  assert.equal(validateSummary(invalidCalendar), false, 'schema date-time validation must reject invalid calendar dates');

  const approvedSummary = structuredClone(summary);
  approvedSummary.redaction.humanReviewCompletedCount = 8;
  approvedSummary.redaction.humanReviewPendingCount = 0;
  approvedSummary.redaction.approvedByRoles = ['quality-engineering'];
  approvedSummary.redaction.status = 'approved';
  approvedSummary.limitations = approvedSummary.limitations.filter(
    (value) => value !== 'human-redaction-review-pending',
  );
  approvedSummary.promotion.blockerCodes = ['manual-at-evidence'];
  assert.equal(validateSummary(approvedSummary), true, JSON.stringify(validateSummary.errors));
  const digest = sha256Hex(canonicalJsonBytes(approvedSummary));
  const entry = {
    schemaVersion: 1,
    baselineRunId: 'r12',
    evidenceScope: 'automated-only',
    buildSha: approvedSummary.provenance.buildSha,
    protocolVersion: 1,
    protocolHash: null,
    protocolHashStatus: 'not-recorded-in-r12',
    buildInputTreeHash: approvedSummary.provenance.buildInputTreeHash,
    dirtyBuildInputDiffHash: approvedSummary.provenance.dirtyBuildInputDiffHash,
    executionScenarioManifestHash: approvedSummary.provenance.executionScenarioManifestHash,
    executionPlanHash: approvedSummary.provenance.executionPlanHash,
    runnerHash: approvedSummary.provenance.runnerHash,
    coreHash: approvedSummary.provenance.coreHash,
    runnerContractHash: approvedSummary.provenance.runnerContractHash,
    scenarioContractHash: approvedSummary.provenance.scenarioContractHash,
    routeTruthHash: approvedSummary.provenance.routeTruthHash,
    privacyRuleHash: approvedSummary.provenance.privacyRuleHash,
    sourceArtifactAggregateDigest: approvedSummary.sourceInventory.inventoryDigest,
    artifactDigest: digest,
    jsonFileCount: 1,
    automatedJsonFileCount: 282,
    diagnosticJsonFileCount: 8,
    manualEvidenceCount: 0,
    mediaType: 'application/vnd.egov.ui-quality-baseline-summary+json',
    immutableObjectIdentity: `git-blob-sha1:${HEX40}`,
    createdAt: '2026-08-21T08:13:41.730Z',
    retentionExpiry: '2036-08-18T08:13:41.730Z',
    redactionStatus: 'approved',
    status: 'published',
    supersedes: null,
  };
  const activeIndex = { ...index, currentDigest: digest, entries: [entry] };
  assert.equal(validateIndex(activeIndex), true, JSON.stringify(validateIndex.errors));
  const pendingEntry = structuredClone(activeIndex);
  pendingEntry.entries[0].redactionStatus = 'automated-privacy-guard-passed-human-review-pending';
  assert.equal(validateIndex(pendingEntry), false, 'published index entries must reject pending redaction');

  const publishedR12 = assertCanonicalJsonBytes(readFileSync(new URL(
    `../config/ui-quality-baseline/summaries/sha256-${R12_PUBLISHED_DIGEST}.json`,
    import.meta.url,
  )));
  const r12Entry = buildPublishedIndexEntry({
    summary: publishedR12,
    immutableObjectIdentity: `git-blob-sha1:${HEX40}`,
    createdAt: '2026-08-21T14:45:54.299Z',
    supersedes: null,
  });
  const combinedEntry = buildPublishedIndexEntry({
    summary: combined,
    immutableObjectIdentity: `git-blob-sha1:${'c'.repeat(40)}`,
    createdAt: '2026-08-22T02:00:00.000Z',
    supersedes: R12_PUBLISHED_DIGEST,
  });
  const combinedIndex = fixtureIndex([r12Entry, combinedEntry]);
  assert.equal(validateIndex(combinedIndex), true, JSON.stringify(validateIndex.errors));
  const wrongPredecessor = structuredClone(combinedIndex);
  wrongPredecessor.entries[1].supersedes = 'f'.repeat(64);
  assert.equal(validateIndex(wrongPredecessor), false, 'combined index schema must freeze the r12 predecessor');
});
