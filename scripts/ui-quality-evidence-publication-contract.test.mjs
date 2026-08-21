import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

import {
  aggregateContentDigest,
  approveR12CompactSummary,
  assertAppendOnlyIndexTransition,
  assertBaselineIndex,
  assertCanonicalJsonBytes,
  assertCompactSummary,
  assertPublicationPrivacyPolicy,
  assertRepositoryIndexAppendOnly,
  assertR12ProvenanceAgreement,
  buildPublishedIndexEntry,
  canonicalJsonBytes,
  countCollectedManualEvidence,
  evaluateDurableEvidence,
  isUtcInstant,
  sha256Hex,
  summarizeRedactedAxe,
  verifyDurableEvidenceFromRepository,
} from './ui-quality-evidence-durability.mjs';

function runGit(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function writeCanonicalIndex(root, value) {
  const target = join(root, 'config', 'ui-quality-baseline-index.json');
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(target, canonicalJsonBytes(value));
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
  const policy = JSON.parse(readFileSync(
    new URL('../config/ui-quality-evidence-policy.json', import.meta.url),
    'utf8',
  ));
  const index = JSON.parse(readFileSync(
    new URL('../config/ui-quality-baseline-index.json', import.meta.url),
    'utf8',
  ));
  const summary = sampleSummary();

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
  const validateIndex = ajv.compile(indexSchema);
  assert.equal(validateSummary(summary), true, JSON.stringify(validateSummary.errors));
  assert.equal(validateIndex(index), true, JSON.stringify(validateIndex.errors));

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
});
