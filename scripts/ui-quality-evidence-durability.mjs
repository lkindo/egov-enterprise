import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  assertArtifactSafe,
  buildExecutionPlan,
  classifyPerformanceObservation,
  createProductionBuildInputTreeHash,
  PRODUCTION_BUILD_INPUT_PATHS,
  stableJson,
} from '../frontend/scripts/ui-quality-baseline-core.mjs';

const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const CASE_ID = /^uiq-[0-9a-f]{20}$/u;
const RENDER_CASE_ID = /^[a-z0-9][a-z0-9-]*(?:--[a-z0-9][a-z0-9-]*){3}$/u;
const SAFE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/u;
const ISSUE_CODE = /^UIQ-MANUAL-[A-Z0-9-]{3,64}$/u;
const CREDENTIAL_LIKE = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\bBearer\s+[^\s]+/iu,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/u,
  /https?:\/\//iu,
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/u,
  /(?:^|[^A-Za-z0-9])[A-Za-z]:[\\/]/u,
];
const GIT_LOCAL_ENVIRONMENT_KEYS = Object.freeze([
  'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG', 'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT', 'GIT_OBJECT_DIRECTORY', 'GIT_DIR', 'GIT_WORK_TREE',
  'GIT_IMPLICIT_WORK_TREE', 'GIT_GRAFT_FILE', 'GIT_INDEX_FILE',
  'GIT_NO_REPLACE_OBJECTS', 'GIT_REPLACE_REF_BASE', 'GIT_PREFIX',
  'GIT_SHALLOW_FILE', 'GIT_COMMON_DIR',
]);
const R12_SCENARIO_STATE_COUNTS = Object.freeze({
  'auth-login': 12,
  'admin-shell-hub': 6,
  'dense-user-logs': 18,
  'user-management-hub': 12,
  'board-article-composer': 12,
  'faq-admin-user-lifecycle': 18,
  'board-maker-wizard': 12,
  'first-use-onboarding': 6,
});
const R12_TASK_EVIDENCE_COUNTS = Object.freeze({
  'role-status-mutation-readback-executed': 6,
  'synthetic-role-status-rollback-complete': 6,
  'faq-authoritative-save-readback': 6,
  'admin-created-faq-readback': 6,
  'cross-role-created-answer-readback': 6,
  'single-deploy-authoritative-readback': 6,
});
const R12_TOOLING_HASHES = Object.freeze({
  runnerHash: '66092706a07b4903fadcd6c26be34166434f3d21389956e807ada66679dcc712',
  coreHash: 'ec41b33fdfef10f927bbd7c3f37b413144a7d8a9fcb3ce729dc6134d5dae196a',
  runnerContractHash: '704e2bab956995a8b7ba9b36be8ac5830636cae30d658ea59f9a381a5c16e173',
  scenarioContractHash: '5c6ce3b5997e6dab2d06749393659bd634f6546828ba34106f87b0dbe65c0a13',
});
const R12_EXECUTION_PROVENANCE = Object.freeze({
  protocolVersion: 1,
  runnerVersion: 1,
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
});
const R12_SOURCE_INVENTORY = Object.freeze({
  inventoryDigest: '2a4f890de0f5ff79e0f66cb3dbc042982a25e2eed7c330fe81104d1a46d91328',
  automatedInventoryDigest: '071bcd42f36e5bdf79110c3a954a9fcb2a38d270fd92d02162e9540fac230d39',
  diagnosticInventoryDigest: '1cf2b8bf1059248dad0df29a6101196766aa34cdb13d04b75db44b8b7fc8dfb6',
  totalBytes: 4_727_118,
});
const R12_PUBLISHED_DIGEST = 'e7822b6a31dcf9ff5e129238e42cce7be29d5f126554e8ea400cf249c69af8e4';
const COMBINED_V2_BASELINE_RUN_ID = 'r13';
const COMBINED_V2_RUNNER_VERSION = 2;
const COMBINED_V2_PROTOCOL_PATH = 'docs/04-operations/ui-ux-baseline-protocol.md';
const MANUAL_ENVIRONMENT_BY_CHECK = Object.freeze({
  'keyboard-only': 'keyboard-only-manual',
  'nvda-chrome': 'nvda-chrome-manual',
  'text-200-percent': 'chrome-text-200-percent-manual',
  'zoom-400-reflow-320': 'chrome-zoom-400-reflow-320-css-px-manual',
  'forced-colors': 'windows-forced-colors-manual',
  'reduced-motion': 'os-reduced-motion-manual',
});
const MANUAL_REVIEWER_ROLES = Object.freeze(['accessibility-reviewer', 'quality-engineering']);
const REDACTION_REVIEWER_ROLES = Object.freeze(['quality-engineering', 'repository-governance']);
const R12_PRIVACY_POLICY = Object.freeze({
  syntheticDataOnly: true,
  rawTraceRepositoryStorage: 'forbidden',
  forbiddenArtifactKeys: Object.freeze([
    'authorization', 'cookie', 'password', 'accessToken', 'refreshToken',
    'userId', 'email', 'phone', 'ipAddress', 'residentRegistrationNumber',
    'rawInput', 'freeText', 'searchKeyword', 'responseBody',
  ]),
  redactionProcedureRef: 'docs/04-operations/ui-ux-baseline-protocol.md#9-privacy-redaction-and-artifact-handling',
});
const R12_PRIVACY_RULE_HASH = sha256Hex(canonicalJsonBytes(R12_PRIVACY_POLICY));
const COMBINED_V2_MANIFEST = JSON.parse(fs.readFileSync(
  new URL('../config/ui-quality-scenarios.json', import.meta.url),
  'utf8',
));
const COMBINED_V2_PLAN = buildExecutionPlan(COMBINED_V2_MANIFEST);
const COMBINED_V2_MANIFEST_HASH = sha256Hex(Buffer.from(stableJson(COMBINED_V2_MANIFEST), 'utf8'));
const COMBINED_V2_PLAN_HASH = sha256Hex(Buffer.from(stableJson(COMBINED_V2_PLAN), 'utf8'));
const COMBINED_V2_PROTOCOL_HASH = sha256Hex(fs.readFileSync(
  new URL(`../${COMBINED_V2_PROTOCOL_PATH}`, import.meta.url),
));
const R12_PUBLISHED_SUMMARY = JSON.parse(fs.readFileSync(
  new URL(`../config/ui-quality-baseline/summaries/sha256-${R12_PUBLISHED_DIGEST}.json`, import.meta.url),
  'utf8',
));
const R12_AUTOMATED_PAYLOAD_DIGEST = sha256Hex(canonicalJsonBytes(R12_PUBLISHED_SUMMARY.automated));
const COMBINED_V2_STATE_CASE_BY_ID = new Map(
  COMBINED_V2_PLAN.stateCases.map((stateCase) => [stateCase.caseId, stateCase]),
);
const COMBINED_V2_PERFORMANCE_BY_ID = new Map(
  COMBINED_V2_PLAN.performanceCases.map((performanceCase) => [performanceCase.renderCaseId, performanceCase]),
);
const TOOLING_PATHS = Object.freeze({
  runnerHash: 'frontend/scripts/ui-quality-baseline-runner.mjs',
  coreHash: 'frontend/scripts/ui-quality-baseline-core.mjs',
  runnerContractHash: 'scripts/ui-quality-baseline-runner-contract.test.mjs',
  scenarioContractHash: 'scripts/ui-quality-scenarios-contract.test.mjs',
});

const SUMMARY_KEYS = [
  'schemaVersion', 'evidenceKind', 'baselineRunId', 'evidenceScope',
  'provenance', 'sourceInventory', 'automated', 'diagnostics', 'manual',
  'redaction', 'limitations', 'promotion',
];
const COMBINED_SUMMARY_KEYS = [...SUMMARY_KEYS, 'sourceRun'];
const PROVENANCE_KEYS = [
  'protocolVersion', 'protocolHash', 'protocolHashStatus', 'runnerVersion',
  'buildSha', 'executionScenarioManifestHash', 'executionPlanHash',
  'executionPlanHashStatus',
  'routeTruthHash', 'privacyRuleHash', 'buildInputTreeHash', 'dirtyBuildInputDiffHash',
  'runnerHash', 'coreHash', 'runnerContractHash', 'scenarioContractHash',
  'toolingHashStatus', 'startedAt', 'finishedAt',
  'frontendBuildId', 'backendBuildId', 'finishVerificationScenarioCount',
];
const INVENTORY_KEYS = [
  'aggregateAlgorithm', 'inventoryDigest', 'automatedInventoryDigest',
  'diagnosticInventoryDigest', 'jsonFileCount', 'automatedJsonFileCount',
  'diagnosticJsonFileCount', 'totalBytes', 'nonJsonFileCount', 'symlinkCount',
];
const COMBINED_INVENTORY_KEYS = [
  ...INVENTORY_KEYS,
  'automatedEvidenceJsonFileCount', 'automatedEvidenceInventoryDigest',
  'automatedRunSealFileDigest',
];
const AUTOMATED_KEYS = [
  'scenarioCount', 'renderCaseCount', 'plannedStateCaseCount',
  'observedStateCaseCount', 'invalidStateCaseCount',
  'plannedPerformanceCaseCount', 'observedPerformanceCaseCount',
  'invalidPerformanceCaseCount', 'performanceConditionRunCount',
  'assertionCount', 'passedAssertionCount', 'failedAssertionCount',
  'mutationRequiredCaseCount', 'mutationExecutedCaseCount',
  'mutationReadbackCaseCount', 'mutationRollbackCaseCount',
  'mutationCleanupCaseCount', 'activeMutationResidueCount',
  'nonMutationEmptyEvidenceCaseCount', 'axeViolationCaseCount',
  'axeViolationNodeCount', 'horizontalOverflowCaseCount', 'findingCount',
  'stateCases', 'scenarios', 'performance',
];
const STATE_CASE_KEYS = [
  'caseId', 'scenarioId', 'status', 'automatedOutcome', 'assertionCount',
  'passedAssertionCount', 'failedAssertionCount', 'axeViolationCount',
  'horizontalOverflowPx', 'findingCount', 'requiredTaskEvidenceId',
  'taskEvidenceComplete',
];
const SCENARIO_KEYS = [
  'scenarioId', 'plannedStateCaseCount', 'observedStateCaseCount',
  'invalidStateCaseCount', 'plannedPerformanceCaseCount',
  'observedPerformanceCaseCount', 'invalidPerformanceCaseCount',
  'axeViolationCaseCount', 'failedAssertionCaseCount', 'status',
];
const PERFORMANCE_KEYS = ['renderCaseId', 'scenarioId', 'status', 'cold', 'warm'];
const CONDITION_KEYS = [
  'routeJsTransferBytes', 'lcpMs', 'cls', 'readinessLatencyProxyMs',
];
const STAT_KEYS = ['minimum', 'median', 'maximum', 'medianAbsoluteDeviation'];
const DIAGNOSTIC_KEYS = [
  'evidenceKind', 'plannedCaseCount', 'completedCaseCount', 'invalidCaseCount',
  'mutationEvidenceCount', 'activeMutationResidueCount',
];
const MANUAL_KEYS = [
  'requiredEvidenceCount', 'completedEvidenceCount', 'reviewRequiredCount',
  'blockedExternalCount', 'status',
];
const REDACTION_KEYS = [
  'automatedGuardStatus', 'scannedJsonFileCount', 'unsafeFileCount',
  'rawTraceStoredCount', 'responsePayloadStoredCount',
  'humanReviewCompletedCount', 'humanReviewPendingCount', 'reviewQuorum',
  'approvedByRoles', 'status',
];
const PROMOTION_KEYS = ['status', 'eligible', 'blockerCodes'];
const COMBINED_PROVENANCE_KEYS = [
  'protocolVersion', 'protocolHash', 'protocolHashStatus', 'protocolHashVerifiedAtFinish',
  'runnerVersion', 'executionId', 'buildSha',
  'executionScenarioManifestHash', 'executionPlanHash',
  'executionPlanHashStatus',
  'routeTruthHash', 'privacyRuleHash', 'buildInputTreeHash', 'dirtyBuildInputDiffHash',
  'runnerHash', 'coreHash', 'runnerContractHash', 'scenarioContractHash',
  'toolingHashStatus',
  'startedAt', 'finishedAt', 'frontendBuildId', 'backendBuildId',
  'finishVerificationScenarioCount',
];
const COMBINED_MANUAL_KEYS = [
  'requiredEvidenceCount', 'completedEvidenceCount', 'findingCount',
  'automatedEvidenceDigest', 'evidenceDigest', 'status', 'observations',
];
const MANUAL_OBSERVATION_KEYS = [
  'evidenceKind', 'scenarioId', 'checkId', 'status', 'environment',
  'coverage', 'reviewerRole', 'executionId', 'startedAt', 'finishedAt', 'buildSha',
  'executionScenarioManifestHash', 'executionPlanHash',
  'automatedEvidenceDigest', 'protocolHash', 'protocolHashVerifiedAtStart',
  'protocolHashVerifiedAtFinish', 'finding', 'evidenceDigest', 'redaction',
];
const MANUAL_REDACTION_KEYS = ['status', 'reviewedByRole'];
const MANUAL_ENVIRONMENT_KEYS = [
  'kind', 'evidenceMode', 'osFamily', 'osVersion', 'browserFamily',
  'browserVersion', 'assistiveTechnology', 'assistiveTechnologyVersion',
  'brandTheme', 'colorModes', 'viewportIds',
];
const MANUAL_COVERAGE_KEYS = ['stepIds'];
const MANUAL_FINDING_KEYS = ['issueCodes', 'impactCodes', 'severity'];
const COMBINED_REDACTION_KEYS = [
  'automatedGuardStatus', 'manualGuardStatus', 'unsafeFileCount',
  'rawTraceStoredCount', 'responsePayloadStoredCount', 'reviewQuorum',
  'approvedByRoles', 'status',
];
const SOURCE_RUN_KEYS = [
  'evidenceKind', 'baselineRunId', 'executionId', 'status', 'final',
  'runnerVersion', 'startedAt', 'finishedAt',
  'runSummaryDigest', 'runProgressDigest', 'environmentDigest',
  'protocolHash', 'protocolHashVerifiedAtFinish', 'buildSha',
  'buildInputTreeHash', 'dirtyBuildInputDiffHash',
  'executionScenarioManifestHash', 'executionPlanHash',
  'routeTruthHash', 'privacyRuleHash', 'runnerHash', 'coreHash',
  'runnerContractHash', 'scenarioContractHash', 'frontendBuildId', 'backendBuildId',
  'automatedInventoryDigest', 'automatedProjectionDigest',
  'plannedStateCaseCount', 'completedStateCaseCount', 'invalidStateCaseCount',
  'plannedPerformanceCaseCount', 'completedPerformanceCaseCount',
  'invalidPerformanceCaseCount', 'sealDigest',
];
const COMBINED_AUTOMATED_EVIDENCE_KEYS = [
  'baselineRunId', 'sourceRun', 'provenance', 'sourceInventory',
  'automated', 'diagnostics', 'automatedEvidenceDigest',
];
const INDEX_KEYS = ['schemaVersion', 'decisionId', 'storeMode', 'currentDigest', 'entries'];
const ENTRY_KEYS = [
  'schemaVersion', 'baselineRunId', 'evidenceScope', 'buildSha',
  'protocolVersion', 'protocolHash', 'protocolHashStatus', 'buildInputTreeHash',
  'dirtyBuildInputDiffHash', 'executionScenarioManifestHash',
  'executionPlanHash', 'runnerHash', 'coreHash', 'runnerContractHash',
  'scenarioContractHash', 'routeTruthHash', 'sourceArtifactAggregateDigest',
  'privacyRuleHash',
  'artifactDigest', 'jsonFileCount', 'automatedJsonFileCount',
  'diagnosticJsonFileCount', 'manualEvidenceCount', 'mediaType',
  'immutableObjectIdentity', 'createdAt', 'retentionExpiry',
  'redactionStatus', 'status', 'supersedes',
];

function stableValue(value, label = 'value') {
  if (Array.isArray(value)) return value.map((item, index) => stableValue(item, `${label}[${index}]`));
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
    return value;
  }
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${label} contains an unsupported value`);
  }
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableValue(value[key], `${label}.${key}`)]),
  );
}

export function canonicalJsonBytes(value) {
  return Buffer.from(`${JSON.stringify(stableValue(value))}\n`, 'utf8');
}

export function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function isUtcInstant(value) {
  if (typeof value !== 'string' || !ISO_INSTANT.test(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  const normalizedInput = value.includes('.') ? value : value.replace(/Z$/u, '.000Z');
  return new Date(parsed).toISOString() === normalizedInput;
}

export function assertCanonicalJsonBytes(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    throw new Error('canonical JSON must not contain a BOM');
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('canonical JSON must be valid UTF-8');
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('canonical JSON must parse exactly once');
  }
  if (!bytes.equals(canonicalJsonBytes(parsed))) {
    throw new Error('canonical JSON bytes must be sorted compact UTF-8 with exactly one LF');
  }
  return parsed;
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertExactKeys(value, expected, label) {
  assertObject(value, label);
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (actual.length !== required.length || actual.some((key, index) => key !== required[index])) {
    throw new Error(`${label} must use the closed key set`);
  }
}

function assertInteger(value, label, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum) throw new Error(`${label} must be an integer >= ${minimum}`);
}

function assertFiniteNonnegative(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite and nonnegative`);
}

function assertHex(value, pattern, label) {
  if (typeof value !== 'string' || !pattern.test(value)) throw new Error(`${label} must use the required lowercase hex format`);
}

function assertEnum(value, allowed, label) {
  if (!allowed.includes(value)) throw new Error(`${label} must use the closed enum`);
}

function assertNoCredentialLikeValue(value, label = 'summary') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoCredentialLikeValue(item, `${label}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => assertNoCredentialLikeValue(item, `${label}.${key}`));
    return;
  }
  if (typeof value === 'string' && CREDENTIAL_LIKE.some((pattern) => pattern.test(value))) {
    throw new Error(`${label} contains a forbidden credential-like value`);
  }
}

function assertStats(value, label) {
  assertExactKeys(value, STAT_KEYS, label);
  for (const key of STAT_KEYS) assertFiniteNonnegative(value[key], `${label}.${key}`);
  if (value.minimum > value.median || value.median > value.maximum) {
    throw new Error(`${label} minimum/median/maximum ordering is invalid`);
  }
}

function assertCondition(value, label) {
  assertExactKeys(value, CONDITION_KEYS, label);
  for (const key of CONDITION_KEYS) assertStats(value[key], `${label}.${key}`);
}

function assertStateCases(automated) {
  if (!Array.isArray(automated.stateCases) || automated.stateCases.length !== automated.plannedStateCaseCount) {
    throw new Error('stateCases must preserve the exact planned state population');
  }
  const caseIds = new Set();
  let assertions = 0;
  let passed = 0;
  let failed = 0;
  let required = 0;
  let complete = 0;
  let axeCases = 0;
  let axeNodes = 0;
  let overflowCases = 0;
  let findings = 0;
  const scenarioCounts = new Map();
  const evidenceCounts = new Map();
  for (const [index, stateCase] of automated.stateCases.entries()) {
    const label = `automated.stateCases[${index}]`;
    assertExactKeys(stateCase, STATE_CASE_KEYS, label);
    if (typeof stateCase.caseId !== 'string' || !CASE_ID.test(stateCase.caseId) || caseIds.has(stateCase.caseId)) {
      throw new Error(`${label}.caseId must be a unique privacy-safe case ID`);
    }
    if (index > 0 && automated.stateCases[index - 1].caseId.localeCompare(stateCase.caseId) >= 0) {
      throw new Error('stateCases must be in strict ascending caseId order');
    }
    caseIds.add(stateCase.caseId);
    if (typeof stateCase.scenarioId !== 'string' || stateCase.scenarioId.length === 0) throw new Error(`${label}.scenarioId is required`);
    if (!Object.hasOwn(R12_SCENARIO_STATE_COUNTS, stateCase.scenarioId)) {
      throw new Error(`${label}.scenarioId is not in the closed r12 population`);
    }
    scenarioCounts.set(stateCase.scenarioId, (scenarioCounts.get(stateCase.scenarioId) ?? 0) + 1);
    assertEnum(stateCase.status, ['automated-state-observed'], `${label}.status`);
    assertEnum(stateCase.automatedOutcome, ['no-automated-finding-observed'], `${label}.automatedOutcome`);
    for (const key of ['assertionCount', 'passedAssertionCount', 'failedAssertionCount', 'axeViolationCount', 'findingCount']) {
      assertInteger(stateCase[key], `${label}.${key}`);
    }
    assertFiniteNonnegative(stateCase.horizontalOverflowPx, `${label}.horizontalOverflowPx`);
    if (stateCase.passedAssertionCount + stateCase.failedAssertionCount !== stateCase.assertionCount) {
      throw new Error(`${label} assertion counts are inconsistent`);
    }
    const evidenceRequired = stateCase.requiredTaskEvidenceId !== null;
    if (evidenceRequired && (typeof stateCase.requiredTaskEvidenceId !== 'string' || stateCase.requiredTaskEvidenceId.length === 0)) {
      throw new Error(`${label}.requiredTaskEvidenceId must be null or a nonempty closed ID`);
    }
    if (evidenceRequired && !Object.hasOwn(R12_TASK_EVIDENCE_COUNTS, stateCase.requiredTaskEvidenceId)) {
      throw new Error(`${label}.requiredTaskEvidenceId is not in the closed r12 task population`);
    }
    if (evidenceRequired) {
      evidenceCounts.set(
        stateCase.requiredTaskEvidenceId,
        (evidenceCounts.get(stateCase.requiredTaskEvidenceId) ?? 0) + 1,
      );
    }
    if (stateCase.taskEvidenceComplete !== evidenceRequired) {
      throw new Error(`${label} task evidence completeness must match the declared requirement`);
    }
    assertions += stateCase.assertionCount;
    passed += stateCase.passedAssertionCount;
    failed += stateCase.failedAssertionCount;
    required += Number(evidenceRequired);
    complete += Number(stateCase.taskEvidenceComplete);
    axeCases += Number(stateCase.axeViolationCount > 0);
    axeNodes += stateCase.axeViolationCount;
    overflowCases += Number(stateCase.horizontalOverflowPx > 1);
    findings += stateCase.findingCount;
  }
  for (const [scenarioId, expectedCount] of Object.entries(R12_SCENARIO_STATE_COUNTS)) {
    if (scenarioCounts.get(scenarioId) !== expectedCount) {
      throw new Error(`stateCases do not preserve the exact ${scenarioId} population`);
    }
  }
  for (const [evidenceId, expectedCount] of Object.entries(R12_TASK_EVIDENCE_COUNTS)) {
    if (evidenceCounts.get(evidenceId) !== expectedCount) {
      throw new Error(`stateCases do not preserve the exact ${evidenceId} population`);
    }
  }
  const expected = {
    assertionCount: assertions,
    passedAssertionCount: passed,
    failedAssertionCount: failed,
    mutationRequiredCaseCount: required,
    mutationExecutedCaseCount: complete,
    mutationReadbackCaseCount: complete,
    mutationRollbackCaseCount: complete,
    mutationCleanupCaseCount: complete,
    axeViolationCaseCount: axeCases,
    axeViolationNodeCount: axeNodes,
    horizontalOverflowCaseCount: overflowCases,
    findingCount: findings,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (automated[key] !== value) throw new Error(`automated.${key} does not match stateCases recomputation`);
  }
  if (automated.activeMutationResidueCount !== 0) throw new Error('automated mutation residue must be zero');
  if (automated.nonMutationEmptyEvidenceCaseCount !== automated.plannedStateCaseCount - required) {
    throw new Error('non-mutation empty evidence count is inconsistent');
  }
  return caseIds;
}

function assertPerformance(automated) {
  if (!Array.isArray(automated.performance)
    || automated.performance.length !== automated.plannedPerformanceCaseCount) {
    throw new Error('performance must preserve the exact planned performance population');
  }
  const ids = new Set();
  const scenarioCounts = new Map();
  for (const [index, performance] of automated.performance.entries()) {
    const label = `automated.performance[${index}]`;
    assertExactKeys(performance, PERFORMANCE_KEYS, label);
    if (typeof performance.renderCaseId !== 'string' || !RENDER_CASE_ID.test(performance.renderCaseId)
      || ids.has(performance.renderCaseId)) {
      throw new Error(`${label}.renderCaseId must be a unique privacy-safe case ID`);
    }
    if (index > 0 && automated.performance[index - 1].renderCaseId.localeCompare(performance.renderCaseId) >= 0) {
      throw new Error('performance must be in strict ascending renderCaseId order');
    }
    ids.add(performance.renderCaseId);
    if (typeof performance.scenarioId !== 'string' || performance.scenarioId.length === 0) {
      throw new Error(`${label}.scenarioId is required`);
    }
    if (!Object.hasOwn(R12_SCENARIO_STATE_COUNTS, performance.scenarioId)) {
      throw new Error(`${label}.scenarioId is not in the closed r12 population`);
    }
    scenarioCounts.set(performance.scenarioId, (scenarioCounts.get(performance.scenarioId) ?? 0) + 1);
    if (!performance.renderCaseId.startsWith(`${performance.scenarioId}--`)) {
      throw new Error(`${label}.renderCaseId must remain bound to its scenario`);
    }
    assertEnum(performance.status, ['lab-performance-observed'], `${label}.status`);
    assertCondition(performance.cold, `${label}.cold`);
    assertCondition(performance.warm, `${label}.warm`);
  }
  for (const scenarioId of Object.keys(R12_SCENARIO_STATE_COUNTS)) {
    if (scenarioCounts.get(scenarioId) !== 6) {
      throw new Error(`performance does not preserve the exact ${scenarioId} population`);
    }
  }
  if (automated.observedPerformanceCaseCount !== automated.performance.length
    || automated.invalidPerformanceCaseCount !== 0
    || automated.performanceConditionRunCount !== automated.performance.length * 6) {
    throw new Error('performance completion counters are inconsistent');
  }
}

function assertScenarioBreakdown(automated) {
  if (!Array.isArray(automated.scenarios) || automated.scenarios.length !== automated.scenarioCount) {
    throw new Error('scenarios must preserve the exact scenario population');
  }
  const ids = new Set();
  for (const [index, scenario] of automated.scenarios.entries()) {
    const label = `automated.scenarios[${index}]`;
    assertExactKeys(scenario, SCENARIO_KEYS, label);
    if (index > 0 && automated.scenarios[index - 1].scenarioId.localeCompare(scenario.scenarioId) >= 0) {
      throw new Error('scenarios must be in strict ascending scenarioId order');
    }
    if (typeof scenario.scenarioId !== 'string' || scenario.scenarioId.length === 0 || ids.has(scenario.scenarioId)) {
      throw new Error(`${label}.scenarioId must be unique`);
    }
    if (!Object.hasOwn(R12_SCENARIO_STATE_COUNTS, scenario.scenarioId)
      || scenario.plannedStateCaseCount !== R12_SCENARIO_STATE_COUNTS[scenario.scenarioId]) {
      throw new Error(`${label} is not in the exact r12 scenario population`);
    }
    ids.add(scenario.scenarioId);
    for (const key of SCENARIO_KEYS.filter((key) => key.endsWith('Count'))) assertInteger(scenario[key], `${label}.${key}`);
    assertEnum(scenario.status, ['partial-automated-evidence'], `${label}.status`);
    const states = automated.stateCases.filter(({ scenarioId }) => scenarioId === scenario.scenarioId);
    const performance = automated.performance.filter(({ scenarioId }) => scenarioId === scenario.scenarioId);
    if (states.length !== scenario.plannedStateCaseCount
      || states.length !== scenario.observedStateCaseCount
      || scenario.invalidStateCaseCount !== 0
      || scenario.plannedPerformanceCaseCount !== performance.length
      || scenario.observedPerformanceCaseCount !== performance.length
      || scenario.invalidPerformanceCaseCount !== 0
      || scenario.axeViolationCaseCount !== states.filter(({ axeViolationCount }) => axeViolationCount > 0).length
      || scenario.failedAssertionCaseCount !== states.filter(({ failedAssertionCount }) => failedAssertionCount > 0).length) {
      throw new Error(`${label} counters do not match the bounded case population`);
    }
  }
  const plannedStates = automated.scenarios.reduce((sum, value) => sum + value.plannedStateCaseCount, 0);
  const plannedPerformance = automated.scenarios.reduce((sum, value) => sum + value.plannedPerformanceCaseCount, 0);
  if (plannedStates !== automated.plannedStateCaseCount || plannedPerformance !== automated.plannedPerformanceCaseCount) {
    throw new Error('scenario totals do not match the declared population');
  }
}

export function assertCompactSummary(summary) {
  assertExactKeys(summary, SUMMARY_KEYS, 'compact summary');
  if (summary.schemaVersion !== 1
    || summary.evidenceKind !== 'ui-quality-baseline-compact-summary'
    || summary.evidenceScope !== 'automated-only'
    || summary.baselineRunId !== 'r12') {
    throw new Error('compact summary identity is invalid');
  }
  assertExactKeys(summary.provenance, PROVENANCE_KEYS, 'summary.provenance');
  const provenance = summary.provenance;
  if (provenance.protocolVersion !== R12_EXECUTION_PROVENANCE.protocolVersion
    || provenance.runnerVersion !== R12_EXECUTION_PROVENANCE.runnerVersion) {
    throw new Error('r12 protocol and runner versions must match execution-captured provenance');
  }
  assertHex(provenance.buildSha, HEX40, 'provenance.buildSha');
  for (const key of [
    'executionScenarioManifestHash', 'executionPlanHash', 'routeTruthHash', 'privacyRuleHash',
    'buildInputTreeHash', 'dirtyBuildInputDiffHash', 'runnerHash', 'coreHash',
    'runnerContractHash', 'scenarioContractHash',
  ]) assertHex(provenance[key], HEX64, `provenance.${key}`);
  if (provenance.privacyRuleHash !== R12_PRIVACY_RULE_HASH) {
    throw new Error('provenance privacy rule hash is not the approved r12 publication policy');
  }
  for (const key of [
    'buildSha', 'executionScenarioManifestHash', 'executionPlanHash', 'routeTruthHash',
    'buildInputTreeHash', 'dirtyBuildInputDiffHash', 'startedAt', 'finishedAt',
    'frontendBuildId', 'backendBuildId',
  ]) {
    if (provenance[key] !== R12_EXECUTION_PROVENANCE[key]) {
      throw new Error(`provenance.${key} does not match the trusted r12 execution record`);
    }
  }
  for (const [key, expected] of Object.entries(R12_TOOLING_HASHES)) {
    if (provenance[key] !== expected) {
      throw new Error(`provenance.${key} does not match the trusted r12 protocol record`);
    }
  }
  for (const key of ['frontendBuildId', 'backendBuildId']) {
    if (typeof provenance[key] !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(provenance[key])) {
      throw new Error(`provenance.${key} must be a SHA-256 image ID`);
    }
  }
  assertInteger(provenance.finishVerificationScenarioCount, 'provenance.finishVerificationScenarioCount');
  if (provenance.finishVerificationScenarioCount !== 8) {
    throw new Error('r12 finish verification must cover exactly eight scenarios');
  }
  assertEnum(
    provenance.executionPlanHashStatus,
    ['retrospective-current-plan-matched-r12-snapshots'],
    'provenance.executionPlanHashStatus',
  );
  assertEnum(
    provenance.toolingHashStatus,
    ['retrospective-protocol-record-current-bytes-drifted'],
    'provenance.toolingHashStatus',
  );
  const startedAtMs = Date.parse(provenance.startedAt);
  const finishedAtMs = Date.parse(provenance.finishedAt);
  if (!isUtcInstant(provenance.startedAt) || !isUtcInstant(provenance.finishedAt)
    || finishedAtMs <= startedAtMs) {
    throw new Error('provenance run timestamps are invalid');
  }
  if (provenance.protocolHashStatus !== 'not-recorded-in-r12' || provenance.protocolHash !== null) {
    throw new Error('r12 protocol hash was not execution-captured and must remain null');
  }

  assertExactKeys(summary.sourceInventory, INVENTORY_KEYS, 'summary.sourceInventory');
  const inventory = summary.sourceInventory;
  if (inventory.aggregateAlgorithm !== 'sha256-json-sorted-content-digests-v1') {
    throw new Error('source inventory algorithm is not the closed algorithm');
  }
  for (const key of ['inventoryDigest', 'automatedInventoryDigest', 'diagnosticInventoryDigest']) {
    assertHex(inventory[key], HEX64, `sourceInventory.${key}`);
  }
  for (const key of ['jsonFileCount', 'automatedJsonFileCount', 'diagnosticJsonFileCount', 'totalBytes', 'nonJsonFileCount', 'symlinkCount']) {
    assertInteger(inventory[key], `sourceInventory.${key}`);
  }
  if (inventory.jsonFileCount !== 290
    || inventory.automatedJsonFileCount !== 282
    || inventory.diagnosticJsonFileCount !== 8
    || inventory.jsonFileCount !== inventory.automatedJsonFileCount + inventory.diagnosticJsonFileCount
    || inventory.nonJsonFileCount !== 0
    || inventory.symlinkCount !== 0
    || inventory.totalBytes !== R12_SOURCE_INVENTORY.totalBytes
    || inventory.inventoryDigest !== R12_SOURCE_INVENTORY.inventoryDigest
    || inventory.automatedInventoryDigest !== R12_SOURCE_INVENTORY.automatedInventoryDigest
    || inventory.diagnosticInventoryDigest !== R12_SOURCE_INVENTORY.diagnosticInventoryDigest) {
    throw new Error('source inventory must preserve the exact r12 JSON-only population');
  }

  assertExactKeys(summary.automated, AUTOMATED_KEYS, 'summary.automated');
  const automated = summary.automated;
  for (const key of AUTOMATED_KEYS.filter((key) => key.endsWith('Count'))) assertInteger(automated[key], `automated.${key}`);
  if (automated.scenarioCount !== 8
    || automated.renderCaseCount !== 48
    || automated.plannedStateCaseCount !== 96
    || automated.observedStateCaseCount !== 96
    || automated.invalidStateCaseCount !== 0
    || automated.plannedPerformanceCaseCount !== 48
    || automated.failedAssertionCount !== 0
    || automated.findingCount !== 0) {
    throw new Error('automated population is not the exact r12 population');
  }
  assertStateCases(automated);
  assertPerformance(automated);
  assertScenarioBreakdown(automated);

  assertExactKeys(summary.diagnostics, DIAGNOSTIC_KEYS, 'summary.diagnostics');
  const diagnostics = summary.diagnostics;
  if (diagnostics.evidenceKind !== 'diagnostic-not-baseline-evidence'
    || diagnostics.plannedCaseCount !== 6
    || diagnostics.completedCaseCount !== 6
    || diagnostics.invalidCaseCount !== 0
    || diagnostics.mutationEvidenceCount !== 6
    || diagnostics.activeMutationResidueCount !== 0) {
    throw new Error('diagnostic evidence must stay separate from baseline completion');
  }

  assertExactKeys(summary.manual, MANUAL_KEYS, 'summary.manual');
  if (summary.manual.requiredEvidenceCount !== 48
    || summary.manual.completedEvidenceCount !== 0
    || summary.manual.reviewRequiredCount !== 40
    || summary.manual.blockedExternalCount !== 8
    || summary.manual.status !== 'not-collected') {
    throw new Error('manual placeholders are not collected manual evidence');
  }

  assertExactKeys(summary.redaction, REDACTION_KEYS, 'summary.redaction');
  const redaction = summary.redaction;
  for (const key of REDACTION_KEYS.filter((key) => key.endsWith('Count'))) assertInteger(redaction[key], `redaction.${key}`);
  if (redaction.automatedGuardStatus !== 'passed'
    || redaction.scannedJsonFileCount !== 290
    || redaction.unsafeFileCount !== 0
    || redaction.rawTraceStoredCount !== 0
    || redaction.responsePayloadStoredCount !== 0) {
    throw new Error('redaction automated guard evidence is incomplete');
  }
  const reviewPending = redaction.status === 'automated-privacy-guard-passed-human-review-pending';
  const reviewApproved = redaction.status === 'approved';
  const approvedRoles = ['quality-engineering', 'repository-governance'];
  const roleAttestationsValid = Array.isArray(redaction.approvedByRoles)
    && new Set(redaction.approvedByRoles).size === redaction.approvedByRoles.length
    && redaction.approvedByRoles.every((role) => approvedRoles.includes(role))
    && redaction.approvedByRoles.every((role, index) => index === 0
      || approvedRoles.indexOf(redaction.approvedByRoles[index - 1]) < approvedRoles.indexOf(role));
  if (redaction.reviewQuorum !== 1 || !roleAttestationsValid
    || (reviewPending && redaction.approvedByRoles.length !== 0)
    || (reviewApproved && redaction.approvedByRoles.length < redaction.reviewQuorum)) {
    throw new Error('human redaction approval requires the closed reviewer role attestation and quorum');
  }
  if ((!reviewPending && !reviewApproved)
    || (reviewPending && (redaction.humanReviewCompletedCount !== 0 || redaction.humanReviewPendingCount !== 8))
    || (reviewApproved && (redaction.humanReviewCompletedCount !== 8 || redaction.humanReviewPendingCount !== 0))) {
    throw new Error('human review and redaction status are inconsistent');
  }

  if (!Array.isArray(summary.limitations) || new Set(summary.limitations).size !== summary.limitations.length) {
    throw new Error('limitations must be a unique closed list');
  }
  const requiredLimitations = [
    'raw-artifact-was-unversioned-before-compaction',
    'protocol-hash-not-captured-at-run',
    'tooling-hashes-not-recorded-in-raw-artifact',
  ];
  if (provenance.toolingHashStatus === 'retrospective-protocol-record-current-bytes-drifted') {
    requiredLimitations.push('current-tooling-drifted-after-r12');
  }
  if (reviewPending) requiredLimitations.push('human-redaction-review-pending');
  requiredLimitations.push('manual-evidence-not-collected');
  if (summary.limitations.length !== requiredLimitations.length
    || summary.limitations.some((value, index) => value !== requiredLimitations[index])) {
    throw new Error('limitations must preserve the exact bounded provenance gaps');
  }

  assertExactKeys(summary.promotion, PROMOTION_KEYS, 'summary.promotion');
  if (summary.promotion.status !== 'partial-automated-evidence' || summary.promotion.eligible !== false) {
    throw new Error('automated-only summary cannot claim promotion eligibility');
  }
  const expectedBlockers = reviewPending ? ['manual-at-evidence', 'redaction-review'] : ['manual-at-evidence'];
  if (!Array.isArray(summary.promotion.blockerCodes)
    || summary.promotion.blockerCodes.length !== expectedBlockers.length
    || summary.promotion.blockerCodes.some((value, index) => value !== expectedBlockers[index])) {
    throw new Error('promotion blocker codes are inconsistent');
  }
  assertNoCredentialLikeValue(summary);
  return summary;
}

function assertCombinedStateCases(automated) {
  if (!Array.isArray(automated.stateCases)
    || automated.stateCases.length !== 96
    || automated.stateCases.length !== automated.plannedStateCaseCount) {
    throw new Error('combined stateCases must preserve the exact 96-case population');
  }
  const caseIds = new Set();
  const scenarioCounts = new Map();
  const evidenceCounts = new Map();
  const totals = {
    assertionCount: 0,
    passedAssertionCount: 0,
    failedAssertionCount: 0,
    mutationRequiredCaseCount: 0,
    mutationExecutedCaseCount: 0,
    mutationReadbackCaseCount: 0,
    mutationRollbackCaseCount: 0,
    mutationCleanupCaseCount: 0,
    axeViolationCaseCount: 0,
    axeViolationNodeCount: 0,
    horizontalOverflowCaseCount: 0,
    findingCount: 0,
  };
  for (const [index, stateCase] of automated.stateCases.entries()) {
    const label = `automated.stateCases[${index}]`;
    assertExactKeys(stateCase, STATE_CASE_KEYS, label);
    if (typeof stateCase.caseId !== 'string' || !CASE_ID.test(stateCase.caseId)
      || caseIds.has(stateCase.caseId)) {
      throw new Error(`${label}.caseId must be a unique privacy-safe case ID`);
    }
    if (index > 0 && automated.stateCases[index - 1].caseId.localeCompare(stateCase.caseId) >= 0) {
      throw new Error('combined stateCases must be in strict ascending caseId order');
    }
    caseIds.add(stateCase.caseId);
    if (!Object.hasOwn(R12_SCENARIO_STATE_COUNTS, stateCase.scenarioId)) {
      throw new Error(`${label}.scenarioId is not in the closed eight-scenario population`);
    }
    const plannedStateCase = COMBINED_V2_STATE_CASE_BY_ID.get(stateCase.caseId);
    if (!plannedStateCase
      || plannedStateCase.scenarioId !== stateCase.scenarioId
      || plannedStateCase.requiredTaskEvidenceId !== stateCase.requiredTaskEvidenceId) {
      throw new Error(`${label} is substituted or relocated from the exact r13 execution plan`);
    }
    scenarioCounts.set(stateCase.scenarioId, (scenarioCounts.get(stateCase.scenarioId) ?? 0) + 1);
    assertEnum(stateCase.status, ['automated-state-observed'], `${label}.status`);
    assertEnum(
      stateCase.automatedOutcome,
      ['no-automated-finding-observed', 'automated-findings-observed'],
      `${label}.automatedOutcome`,
    );
    for (const key of [
      'assertionCount', 'passedAssertionCount', 'failedAssertionCount',
      'axeViolationCount', 'findingCount',
    ]) assertInteger(stateCase[key], `${label}.${key}`);
    assertFiniteNonnegative(stateCase.horizontalOverflowPx, `${label}.horizontalOverflowPx`);
    if (stateCase.passedAssertionCount + stateCase.failedAssertionCount !== stateCase.assertionCount) {
      throw new Error(`${label} assertion counts are inconsistent`);
    }
    const hasFinding = stateCase.failedAssertionCount > 0
      || stateCase.axeViolationCount > 0
      || stateCase.horizontalOverflowPx > 1
      || stateCase.findingCount > 0;
    const expectedOutcome = hasFinding
      ? 'automated-findings-observed'
      : 'no-automated-finding-observed';
    if (stateCase.automatedOutcome !== expectedOutcome) {
      throw new Error(`${label} must preserve its automated finding outcome`);
    }
    const evidenceRequired = stateCase.requiredTaskEvidenceId !== null;
    if (evidenceRequired
      && (typeof stateCase.requiredTaskEvidenceId !== 'string'
        || !Object.hasOwn(R12_TASK_EVIDENCE_COUNTS, stateCase.requiredTaskEvidenceId))) {
      throw new Error(`${label}.requiredTaskEvidenceId is not in the closed task population`);
    }
    if (stateCase.taskEvidenceComplete !== evidenceRequired) {
      throw new Error(`${label} task evidence completeness must match the declared requirement`);
    }
    if (evidenceRequired) {
      evidenceCounts.set(
        stateCase.requiredTaskEvidenceId,
        (evidenceCounts.get(stateCase.requiredTaskEvidenceId) ?? 0) + 1,
      );
    }
    totals.assertionCount += stateCase.assertionCount;
    totals.passedAssertionCount += stateCase.passedAssertionCount;
    totals.failedAssertionCount += stateCase.failedAssertionCount;
    totals.mutationRequiredCaseCount += Number(evidenceRequired);
    totals.mutationExecutedCaseCount += Number(stateCase.taskEvidenceComplete);
    totals.mutationReadbackCaseCount += Number(stateCase.taskEvidenceComplete);
    totals.mutationRollbackCaseCount += Number(stateCase.taskEvidenceComplete);
    totals.mutationCleanupCaseCount += Number(stateCase.taskEvidenceComplete);
    totals.axeViolationCaseCount += Number(stateCase.axeViolationCount > 0);
    totals.axeViolationNodeCount += stateCase.axeViolationCount;
    totals.horizontalOverflowCaseCount += Number(stateCase.horizontalOverflowPx > 1);
    totals.findingCount += stateCase.findingCount;
  }
  for (const [scenarioId, expectedCount] of Object.entries(R12_SCENARIO_STATE_COUNTS)) {
    if (scenarioCounts.get(scenarioId) !== expectedCount) {
      throw new Error(`combined stateCases do not preserve the exact ${scenarioId} population`);
    }
  }
  for (const [evidenceId, expectedCount] of Object.entries(R12_TASK_EVIDENCE_COUNTS)) {
    if (evidenceCounts.get(evidenceId) !== expectedCount) {
      throw new Error(`combined stateCases do not preserve the exact ${evidenceId} population`);
    }
  }
  for (const [key, expected] of Object.entries(totals)) {
    if (automated[key] !== expected) {
      throw new Error(`automated.${key} does not match combined stateCases recomputation`);
    }
  }
  if (automated.activeMutationResidueCount !== 0
    || automated.nonMutationEmptyEvidenceCaseCount !== 60) {
    throw new Error('combined automated mutation completion is inconsistent');
  }
}

function assertCombinedScenarioBreakdown(automated) {
  if (!Array.isArray(automated.scenarios) || automated.scenarios.length !== 8) {
    throw new Error('combined scenarios must preserve the exact eight-scenario population');
  }
  const expectedIds = Object.keys(R12_SCENARIO_STATE_COUNTS).sort();
  for (const [index, scenario] of automated.scenarios.entries()) {
    const label = `automated.scenarios[${index}]`;
    assertExactKeys(scenario, SCENARIO_KEYS, label);
    if (scenario.scenarioId !== expectedIds[index]) {
      throw new Error('combined scenarios must be in the exact ascending eight-scenario order');
    }
    for (const key of SCENARIO_KEYS.filter((key) => key.endsWith('Count'))) {
      assertInteger(scenario[key], `${label}.${key}`);
    }
    if (scenario.status !== 'measured'
      || scenario.plannedStateCaseCount !== R12_SCENARIO_STATE_COUNTS[scenario.scenarioId]
      || scenario.observedStateCaseCount !== scenario.plannedStateCaseCount
      || scenario.invalidStateCaseCount !== 0
      || scenario.plannedPerformanceCaseCount !== 6
      || scenario.observedPerformanceCaseCount !== 6
      || scenario.invalidPerformanceCaseCount !== 0) {
      throw new Error(`${label} is not an exact measured automated population`);
    }
    const stateCases = automated.stateCases.filter(({ scenarioId }) => scenarioId === scenario.scenarioId);
    if (scenario.axeViolationCaseCount
        !== stateCases.filter(({ axeViolationCount }) => axeViolationCount > 0).length
      || scenario.failedAssertionCaseCount
        !== stateCases.filter(({ failedAssertionCount }) => failedAssertionCount > 0).length) {
      throw new Error(`${label} finding counters do not match the bounded state population`);
    }
  }
}

function automatedEvidenceDigest(summary) {
  return sha256Hex(canonicalJsonBytes({
    baselineRunId: summary.baselineRunId,
    sourceRun: summary.sourceRun,
    provenance: summary.provenance,
    sourceInventory: summary.sourceInventory,
    automated: summary.automated,
    diagnostics: summary.diagnostics,
  }));
}

export function getCombinedV2ExecutionContract() {
  return {
    baselineRunId: COMBINED_V2_BASELINE_RUN_ID,
    executionScenarioManifestHash: COMBINED_V2_MANIFEST_HASH,
    executionPlanHash: COMBINED_V2_PLAN_HASH,
    protocolHash: COMBINED_V2_PROTOCOL_HASH,
    stateCaseBindings: COMBINED_V2_PLAN.stateCases.map((stateCase) => ({
      caseId: stateCase.caseId,
      scenarioId: stateCase.scenarioId,
      requiredTaskEvidenceId: stateCase.requiredTaskEvidenceId,
    })),
    performanceCaseBindings: COMBINED_V2_PLAN.performanceCases.map((performanceCase) => ({
      renderCaseId: performanceCase.renderCaseId,
      scenarioId: performanceCase.scenarioId,
    })),
    scenarioStepIds: Object.fromEntries(COMBINED_V2_MANIFEST.scenarios.map((scenario) => [
      scenario.id,
      scenario.journeySteps.map(({ id }) => id).sort(),
    ])),
  };
}

function manualObservationDigest(observation) {
  const projection = Object.fromEntries(
    MANUAL_OBSERVATION_KEYS
      .filter((key) => key !== 'evidenceDigest')
      .map((key) => [key, observation[key]]),
  );
  return sha256Hex(canonicalJsonBytes(projection));
}

function sourceRunSealDigest(sourceRun) {
  return sha256Hex(canonicalJsonBytes(Object.fromEntries(
    SOURCE_RUN_KEYS
      .filter((key) => key !== 'sealDigest')
      .map((key) => [key, sourceRun[key]]),
  )));
}

function assertCombinedSourceRun(summary) {
  const sourceRun = summary.sourceRun;
  assertExactKeys(sourceRun, SOURCE_RUN_KEYS, 'summary.sourceRun');
  for (const key of [
    'runSummaryDigest', 'runProgressDigest', 'environmentDigest', 'protocolHash',
    'buildInputTreeHash', 'executionScenarioManifestHash', 'executionPlanHash',
    'routeTruthHash', 'privacyRuleHash', 'runnerHash', 'coreHash',
    'runnerContractHash', 'scenarioContractHash', 'automatedInventoryDigest',
    'automatedProjectionDigest', 'sealDigest',
  ]) assertHex(sourceRun[key], HEX64, `sourceRun.${key}`);
  assertHex(sourceRun.buildSha, HEX40, 'sourceRun.buildSha');
  assertInteger(sourceRun.runnerVersion, 'sourceRun.runnerVersion', COMBINED_V2_RUNNER_VERSION);
  if (sourceRun.runnerVersion !== COMBINED_V2_RUNNER_VERSION) {
    throw new Error('combined source run seal uses an unsupported runner version');
  }
  for (const key of [
    'plannedStateCaseCount', 'completedStateCaseCount', 'invalidStateCaseCount',
    'plannedPerformanceCaseCount', 'completedPerformanceCaseCount',
    'invalidPerformanceCaseCount',
  ]) assertInteger(sourceRun[key], `sourceRun.${key}`);
  if (sourceRun.evidenceKind !== 'automated-run-seal-v2'
    || sourceRun.baselineRunId !== COMBINED_V2_BASELINE_RUN_ID
    || !UUID_V4.test(sourceRun.executionId)
    || sourceRun.status !== 'automated-run-complete'
    || sourceRun.final !== true
    || sourceRun.protocolHashVerifiedAtFinish !== true
    || !isUtcInstant(sourceRun.startedAt)
    || !isUtcInstant(sourceRun.finishedAt)
    || sourceRun.dirtyBuildInputDiffHash !== null
    || !/^sha256:[0-9a-f]{64}$/u.test(sourceRun.frontendBuildId)
    || !/^sha256:[0-9a-f]{64}$/u.test(sourceRun.backendBuildId)
    || sourceRun.automatedInventoryDigest !== summary.sourceInventory.automatedEvidenceInventoryDigest
    || sourceRun.plannedStateCaseCount !== 96
    || sourceRun.completedStateCaseCount !== 96
    || sourceRun.invalidStateCaseCount !== 0
    || sourceRun.plannedPerformanceCaseCount !== 48
    || sourceRun.completedPerformanceCaseCount !== 48
    || sourceRun.invalidPerformanceCaseCount !== 0
    || sourceRun.sealDigest !== sourceRunSealDigest(sourceRun)) {
    throw new Error('combined source run seal is incomplete or has mixed provenance');
  }
  for (const key of [
    'executionId', 'runnerVersion', 'startedAt', 'finishedAt', 'protocolHash', 'buildSha',
    'buildInputTreeHash', 'dirtyBuildInputDiffHash', 'executionScenarioManifestHash',
    'executionPlanHash', 'routeTruthHash', 'privacyRuleHash', 'runnerHash', 'coreHash',
    'runnerContractHash', 'scenarioContractHash', 'frontendBuildId', 'backendBuildId',
  ]) {
    if (sourceRun[key] !== summary.provenance[key]) {
      throw new Error(`combined source run ${key} has mixed provenance`);
    }
  }
}

function assertCombinedManualEvidence(summary) {
  const manual = summary.manual;
  assertExactKeys(manual, COMBINED_MANUAL_KEYS, 'summary.manual');
  if (manual.requiredEvidenceCount !== 48
    || manual.completedEvidenceCount !== 48
    || manual.status !== 'collected'
    || !Array.isArray(manual.observations)
    || manual.observations.length !== 48) {
    throw new Error('combined manual evidence must preserve the exact 48-item 8x6 population');
  }
  const expectedAutomatedDigest = automatedEvidenceDigest(summary);
  if (manual.automatedEvidenceDigest !== expectedAutomatedDigest) {
    throw new Error('combined manual automated evidence digest is invalid');
  }
  const expectedPairs = Object.keys(R12_SCENARIO_STATE_COUNTS).sort().flatMap(
    (scenarioId) => Object.keys(MANUAL_ENVIRONMENT_BY_CHECK).sort().map(
      (checkId) => `${scenarioId}\u0000${checkId}`,
    ),
  );
  const observedPairs = new Set();
  let findingCount = 0;
  for (const [index, observation] of manual.observations.entries()) {
    const label = `manual.observations[${index}]`;
    assertExactKeys(observation, MANUAL_OBSERVATION_KEYS, label);
    if (observation.evidenceKind !== 'manual-observation-v2') {
      throw new Error(`${label}.evidenceKind is invalid`);
    }
    const pair = `${observation.scenarioId}\u0000${observation.checkId}`;
    if (pair !== expectedPairs[index] || observedPairs.has(pair)) {
      throw new Error('combined manual evidence requires each unique scenarioId/checkId in exact 8x6 order');
    }
    observedPairs.add(pair);
    assertEnum(observation.status, ['pass', 'fail'], `${label}.status`);
    const expectedEnvironment = MANUAL_ENVIRONMENT_BY_CHECK[observation.checkId];
    assertExactKeys(observation.environment, MANUAL_ENVIRONMENT_KEYS, `${label}.environment`);
    const environment = observation.environment;
    if (!expectedEnvironment || environment.kind !== expectedEnvironment) {
      throw new Error(`${label}.environment is not the closed check environment`);
    }
    assertEnum(environment.evidenceMode, ['expert-manual', 'user-at'], `${label}.environment.evidenceMode`);
    assertEnum(environment.osFamily, ['windows', 'macos', 'linux'], `${label}.environment.osFamily`);
    if (!SAFE_VERSION.test(environment.osVersion)
      || environment.browserFamily !== 'chrome'
      || !SAFE_VERSION.test(environment.browserVersion)
      || environment.brandTheme !== 'current-default') {
      throw new Error(`${label}.environment has invalid bounded runtime metadata`);
    }
    const expectedAt = observation.checkId === 'nvda-chrome' ? 'nvda' : 'none';
    if (environment.assistiveTechnology !== expectedAt
      || (expectedAt === 'nvda' && (!SAFE_VERSION.test(environment.assistiveTechnologyVersion)
        || environment.osFamily !== 'windows'))
      || (expectedAt === 'none' && environment.assistiveTechnologyVersion !== null)
      || (observation.checkId === 'forced-colors' && environment.osFamily !== 'windows')) {
      throw new Error(`${label}.environment is inconsistent with the manual check`);
    }
    for (const [key, allowed] of [
      ['colorModes', ['light', 'dark']],
      ['viewportIds', ['mobile-320', 'tablet-768', 'desktop-1280']],
    ]) {
      const values = environment[key];
      if (!Array.isArray(values) || values.length === 0
        || new Set(values).size !== values.length
        || values.some((value) => !allowed.includes(value))
        || values.some((value, valueIndex) => valueIndex > 0
          && allowed.indexOf(values[valueIndex - 1]) >= allowed.indexOf(value))) {
        throw new Error(`${label}.environment.${key} must use the ordered closed population`);
      }
    }
    assertExactKeys(observation.coverage, MANUAL_COVERAGE_KEYS, `${label}.coverage`);
    const expectedStepIds = COMBINED_V2_MANIFEST.scenarios
      .find(({ id }) => id === observation.scenarioId)?.journeySteps
      .map(({ id }) => id).sort();
    if (!expectedStepIds || !Array.isArray(observation.coverage.stepIds)
      || stableJson(observation.coverage.stepIds) !== stableJson(expectedStepIds)) {
      throw new Error(`${label}.coverage must preserve every frozen scenario step`);
    }
    assertEnum(observation.reviewerRole, MANUAL_REVIEWER_ROLES, `${label}.reviewer role`);
    if (!UUID_V4.test(observation.executionId)
      || observation.executionId !== summary.provenance.executionId) {
      throw new Error(`${label} has mixed automated execution identity`);
    }
    if (!isUtcInstant(observation.startedAt) || !isUtcInstant(observation.finishedAt)
      || Date.parse(observation.startedAt) < Date.parse(summary.provenance.finishedAt)
      || Date.parse(observation.finishedAt) < Date.parse(observation.startedAt)) {
      throw new Error(`${label} manual session timestamps are invalid`);
    }
    if (observation.buildSha !== summary.provenance.buildSha
      || observation.executionScenarioManifestHash !== summary.provenance.executionScenarioManifestHash
      || observation.executionPlanHash !== summary.provenance.executionPlanHash) {
      throw new Error(`${label} has mixed automated build or plan provenance`);
    }
    if (observation.automatedEvidenceDigest !== expectedAutomatedDigest) {
      throw new Error(`${label} has a mixed automated evidence digest`);
    }
    if (observation.protocolHash !== summary.provenance.protocolHash
      || observation.protocolHashVerifiedAtStart !== true
      || observation.protocolHashVerifiedAtFinish !== true) {
      throw new Error(`${label} protocol hash must use the same automated provenance`);
    }
    assertExactKeys(observation.finding, MANUAL_FINDING_KEYS, `${label}.finding`);
    const finding = observation.finding;
    const allowedImpacts = [
      'task-blocked', 'task-error-risk', 'task-understanding-risk',
      'task-recovery-risk', 'no-adverse-impact-observed',
    ];
    if (!Array.isArray(finding.issueCodes)
      || new Set(finding.issueCodes).size !== finding.issueCodes.length
      || finding.issueCodes.some((code) => !ISSUE_CODE.test(code))
      || !Array.isArray(finding.impactCodes)
      || new Set(finding.impactCodes).size !== finding.impactCodes.length
      || finding.impactCodes.some((code) => !allowedImpacts.includes(code))) {
      throw new Error(`${label}.finding must use closed privacy-safe issue and impact codes`);
    }
    if ((observation.status === 'pass'
      && (finding.issueCodes.length !== 0
        || stableJson(finding.impactCodes) !== stableJson(['no-adverse-impact-observed'])
        || finding.severity !== null))
      || (observation.status === 'fail'
        && (finding.issueCodes.length === 0
          || finding.impactCodes.length === 0
          || finding.impactCodes.includes('no-adverse-impact-observed')
          || !['P0', 'P1', 'P2', 'P3'].includes(finding.severity)))) {
      throw new Error(`${label}.finding must preserve pass or fail meaning without hiding findings`);
    }
    findingCount += finding.issueCodes.length;
    assertHex(observation.evidenceDigest, HEX64, `${label}.evidenceDigest`);
    if (observation.evidenceDigest !== manualObservationDigest(observation)) {
      throw new Error(`${label}.evidenceDigest is not bound to the closed manual observation`);
    }
    assertExactKeys(observation.redaction, MANUAL_REDACTION_KEYS, `${label}.redaction`);
    if (observation.redaction.status !== 'approved') {
      throw new Error(`${label}.redaction must be approved`);
    }
    assertEnum(
      observation.redaction.reviewedByRole,
      REDACTION_REVIEWER_ROLES,
      `${label}.redaction reviewer role`,
    );
    if (!summary.redaction.approvedByRoles.includes(observation.redaction.reviewedByRole)) {
      throw new Error(`${label}.redaction reviewer role is not attested by the combined summary`);
    }
  }
  if (manual.findingCount !== findingCount) {
    throw new Error('combined manual finding count must preserve every fail observation');
  }
  const expectedManualDigest = sha256Hex(canonicalJsonBytes(manual.observations));
  if (manual.evidenceDigest !== expectedManualDigest) {
    throw new Error('combined manual evidence digest is invalid');
  }
}

export function assertCombinedCompactSummary(summary) {
  assertExactKeys(summary, COMBINED_SUMMARY_KEYS, 'combined compact summary');
  if (summary.schemaVersion !== 2
    || summary.evidenceKind !== 'ui-quality-baseline-combined-summary'
    || summary.evidenceScope !== 'combined'
    || summary.baselineRunId !== COMBINED_V2_BASELINE_RUN_ID) {
    throw new Error('combined summary identity must describe the exact new r13 run after r12');
  }

  assertExactKeys(summary.provenance, COMBINED_PROVENANCE_KEYS, 'summary.provenance');
  const provenance = summary.provenance;
  assertInteger(provenance.protocolVersion, 'provenance.protocolVersion', 1);
  assertInteger(provenance.runnerVersion, 'provenance.runnerVersion', COMBINED_V2_RUNNER_VERSION);
  if (provenance.runnerVersion !== COMBINED_V2_RUNNER_VERSION) {
    throw new Error('combined provenance requires the exact r13 runner version');
  }
  if (!UUID_V4.test(provenance.executionId)) {
    throw new Error('combined provenance requires a lowercase UUID-v4 execution identity');
  }
  assertHex(provenance.protocolHash, HEX64, 'provenance.protocolHash');
  if (provenance.protocolHashStatus !== 'recorded'
    || provenance.protocolHashVerifiedAtFinish !== true
    || provenance.protocolHash !== COMBINED_V2_PROTOCOL_HASH) {
    throw new Error('combined provenance requires a nonzero execution-recorded protocol hash verified at finish');
  }
  if (provenance.executionPlanHashStatus !== 'recomputed-from-run-snapshot'
    || provenance.toolingHashStatus !== 'resolved-from-clean-build-commit') {
    throw new Error('combined derived provenance must declare its bounded non-retrospective source');
  }
  if (provenance.executionScenarioManifestHash !== COMBINED_V2_MANIFEST_HASH
    || provenance.executionPlanHash !== COMBINED_V2_PLAN_HASH) {
    throw new Error('combined provenance does not match the exact frozen r13 manifest and execution plan');
  }
  assertHex(provenance.buildSha, HEX40, 'provenance.buildSha');
  if (/^0+$/u.test(provenance.buildSha)) throw new Error('combined build SHA must be nonzero');
  for (const key of [
    'executionScenarioManifestHash', 'executionPlanHash', 'routeTruthHash',
    'privacyRuleHash', 'buildInputTreeHash', 'runnerHash', 'coreHash',
    'runnerContractHash', 'scenarioContractHash',
  ]) assertHex(provenance[key], HEX64, `provenance.${key}`);
  if (provenance.dirtyBuildInputDiffHash !== null) {
    throw new Error('combined evidence requires a clean build commit for tooling provenance readback');
  }
  if (provenance.privacyRuleHash !== R12_PRIVACY_RULE_HASH) {
    throw new Error('combined provenance privacy rule hash is not the approved publication policy');
  }
  if (!isUtcInstant(provenance.startedAt) || !isUtcInstant(provenance.finishedAt)
    || Date.parse(provenance.finishedAt) <= Date.parse(provenance.startedAt)
    || Date.parse(provenance.startedAt) <= Date.parse(R12_EXECUTION_PROVENANCE.finishedAt)) {
    throw new Error('combined provenance must be a later valid UTC execution interval');
  }
  for (const key of ['frontendBuildId', 'backendBuildId']) {
    if (typeof provenance[key] !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(provenance[key])) {
      throw new Error(`provenance.${key} must be a SHA-256 image ID`);
    }
  }
  if (provenance.finishVerificationScenarioCount !== 8) {
    throw new Error('combined finish verification must cover exactly eight scenarios');
  }

  assertExactKeys(summary.sourceInventory, COMBINED_INVENTORY_KEYS, 'summary.sourceInventory');
  const inventory = summary.sourceInventory;
  if (inventory.aggregateAlgorithm !== 'sha256-json-sorted-path-content-digests-v2') {
    throw new Error('combined source inventory algorithm is invalid');
  }
  for (const key of [
    'inventoryDigest', 'automatedInventoryDigest', 'diagnosticInventoryDigest',
    'automatedEvidenceInventoryDigest', 'automatedRunSealFileDigest',
  ]) {
    assertHex(inventory[key], HEX64, `sourceInventory.${key}`);
  }
  for (const key of [
    'jsonFileCount', 'automatedJsonFileCount', 'diagnosticJsonFileCount',
    'automatedEvidenceJsonFileCount',
    'totalBytes', 'nonJsonFileCount', 'symlinkCount',
  ]) assertInteger(inventory[key], `sourceInventory.${key}`);
  if (inventory.automatedJsonFileCount !== 283
    || inventory.automatedEvidenceJsonFileCount !== 282
    || inventory.diagnosticJsonFileCount !== 0
    || inventory.jsonFileCount !== inventory.automatedJsonFileCount + inventory.diagnosticJsonFileCount
    || inventory.totalBytes <= 0
      || inventory.nonJsonFileCount !== 0
      || inventory.symlinkCount !== 0) {
    throw new Error('combined source inventory must preserve the exact automated JSON population');
  }
  assertCombinedSourceRun(summary);
  if (inventory.inventoryDigest !== inventory.automatedInventoryDigest
    || inventory.diagnosticInventoryDigest !== aggregatePathBoundContentDigest([])
    || inventory.automatedRunSealFileDigest
      !== sha256Hex(canonicalJsonBytes(summary.sourceRun))) {
    throw new Error('combined source inventory does not bind the canonical runner seal and empty diagnostics');
  }

  assertExactKeys(summary.automated, AUTOMATED_KEYS, 'summary.automated');
  const automated = summary.automated;
  if (sha256Hex(canonicalJsonBytes(automated)) === R12_AUTOMATED_PAYLOAD_DIGEST) {
    throw new Error('historical r12 automated payload cannot seed r13 combined evidence');
  }
  for (const key of AUTOMATED_KEYS.filter((key) => key.endsWith('Count'))) {
    assertInteger(automated[key], `automated.${key}`);
  }
  if (automated.scenarioCount !== 8
    || automated.renderCaseCount !== 48
    || automated.plannedStateCaseCount !== 96
    || automated.observedStateCaseCount !== 96
    || automated.invalidStateCaseCount !== 0
    || automated.plannedPerformanceCaseCount !== 48
    || automated.observedPerformanceCaseCount !== 48
    || automated.invalidPerformanceCaseCount !== 0) {
    throw new Error('combined automated evidence must preserve exact 96 state and 48 performance completion');
  }
  if (sha256Hex(canonicalJsonBytes(automated)) === R12_AUTOMATED_PAYLOAD_DIGEST
    || inventory.automatedInventoryDigest === R12_SOURCE_INVENTORY.automatedInventoryDigest) {
    throw new Error('historical r12 automated evidence cannot be relabeled as the fresh r13 run');
  }
  assertCombinedStateCases(automated);
  assertPerformance(automated);
  const expectedPerformanceIds = [...COMBINED_V2_PERFORMANCE_BY_ID.keys()].sort();
  for (const [index, performance] of automated.performance.entries()) {
    const planned = COMBINED_V2_PERFORMANCE_BY_ID.get(performance.renderCaseId);
    if (performance.renderCaseId !== expectedPerformanceIds[index]
      || !planned
      || planned.scenarioId !== performance.scenarioId) {
      throw new Error('combined performance evidence is substituted from the exact r13 execution plan');
    }
  }
  assertCombinedScenarioBreakdown(automated);
  if (summary.sourceRun.automatedProjectionDigest
    !== sha256Hex(canonicalJsonBytes(automated))) {
    throw new Error('combined automated projection digest does not match the runner seal');
  }

  assertExactKeys(summary.diagnostics, DIAGNOSTIC_KEYS, 'summary.diagnostics');
  const diagnostics = summary.diagnostics;
  for (const key of DIAGNOSTIC_KEYS.filter((key) => key.endsWith('Count'))) {
    assertInteger(diagnostics[key], `diagnostics.${key}`);
  }
  const expectedDiagnosticCases = inventory.diagnosticJsonFileCount === 8 ? 6 : 0;
  if (diagnostics.evidenceKind !== 'diagnostic-not-baseline-evidence'
    || diagnostics.plannedCaseCount !== expectedDiagnosticCases
    || diagnostics.completedCaseCount !== expectedDiagnosticCases
    || diagnostics.invalidCaseCount !== 0
    || diagnostics.mutationEvidenceCount !== expectedDiagnosticCases
    || diagnostics.activeMutationResidueCount !== 0) {
    throw new Error('combined diagnostics must stay complete and separate from baseline evidence');
  }

  assertExactKeys(summary.redaction, COMBINED_REDACTION_KEYS, 'summary.redaction');
  const redaction = summary.redaction;
  for (const key of ['unsafeFileCount', 'rawTraceStoredCount', 'responsePayloadStoredCount', 'reviewQuorum']) {
    assertInteger(redaction[key], `redaction.${key}`);
  }
  const rolesValid = Array.isArray(redaction.approvedByRoles)
    && redaction.approvedByRoles.length >= redaction.reviewQuorum
    && new Set(redaction.approvedByRoles).size === redaction.approvedByRoles.length
    && redaction.approvedByRoles.every((role) => REDACTION_REVIEWER_ROLES.includes(role))
    && redaction.approvedByRoles.every((role, index) => index === 0
      || REDACTION_REVIEWER_ROLES.indexOf(redaction.approvedByRoles[index - 1])
        < REDACTION_REVIEWER_ROLES.indexOf(role));
  if (redaction.automatedGuardStatus !== 'passed'
    || redaction.manualGuardStatus !== 'passed'
    || redaction.unsafeFileCount !== 0
    || redaction.rawTraceStoredCount !== 0
    || redaction.responsePayloadStoredCount !== 0
    || redaction.reviewQuorum !== 1
    || redaction.status !== 'approved'
    || !rolesValid) {
    throw new Error('combined redaction requires closed role-only approval and zero unsafe artifacts');
  }

  assertCombinedManualEvidence(summary);
  if (!Array.isArray(summary.limitations) || summary.limitations.length !== 0) {
    throw new Error('measured combined evidence cannot retain unresolved evidence limitations');
  }
  assertExactKeys(summary.promotion, PROMOTION_KEYS, 'summary.promotion');
  if (summary.promotion.status !== 'measured'
    || summary.promotion.eligible !== true
    || !Array.isArray(summary.promotion.blockerCodes)
    || summary.promotion.blockerCodes.length !== 0) {
    throw new Error('combined promotion must be exact measured eligibility without hidden blockers');
  }
  assertNoCredentialLikeValue(summary, 'combined summary');
  return summary;
}

function rawArtifactBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function assertJsonArtifactBufferPopulation(values, expectedCount, label) {
  if (!Array.isArray(values) || values.length !== expectedCount
    || values.some((value) => !Buffer.isBuffer(value))) {
    throw new Error(`${label} must contain the exact JSON artifact buffer population`);
  }
  return values.map((bytes, index) => {
    let value;
    try {
      value = JSON.parse(bytes.toString('utf8'));
    } catch {
      throw new Error(`${label}[${index}] must be valid JSON bytes`);
    }
    if (!bytes.equals(rawArtifactBytes(value))) {
      throw new Error(`${label}[${index}] must use canonical JSON artifact bytes`);
    }
    assertArtifactSafe(value, R12_PRIVACY_POLICY.forbiddenArtifactKeys, `${label}[${index}]`);
    return value;
  });
}

function assertJsonArtifactEntryPopulation(entries, expectedCount, label) {
  if (!Array.isArray(entries) || entries.length !== expectedCount) {
    throw new Error(`${label} must contain the exact path-bound JSON artifact population`);
  }
  const parsed = entries.map((entry, index) => {
    if (!entry || typeof entry.relativePath !== 'string' || !Buffer.isBuffer(entry.bytes)) {
      throw new Error(`${label}[${index}] must contain a relative path and raw bytes`);
    }
    const relativePath = entry.relativePath.replaceAll('\\', '/');
    if (relativePath !== entry.relativePath
      || relativePath.startsWith('/')
      || relativePath.split('/').some((segment) => !segment || segment === '.' || segment === '..')
      || !relativePath.endsWith('.json')) {
      throw new Error(`${label}[${index}] has an unsafe or noncanonical relative path`);
    }
    const [value] = assertJsonArtifactBufferPopulation([entry.bytes], 1, `${label}[${index}]`);
    return { relativePath, bytes: entry.bytes, value };
  });
  if (new Set(parsed.map(({ relativePath }) => relativePath)).size !== parsed.length) {
    throw new Error(`${label} has duplicate artifact paths`);
  }
  return parsed;
}

function combinedAutomatedEvidencePaths() {
  const expected = new Set(['run-summary.json', 'run-progress.json']);
  for (const scenarioId of Object.keys(R12_SCENARIO_STATE_COUNTS)) {
    for (const relativePath of [
      `${scenarioId}/environment.json`,
      `${scenarioId}/manifest-snapshot.json`,
      `${scenarioId}/task-observations.json`,
      `${scenarioId}/manual/manual-checks.json`,
      `${scenarioId}/baseline-result.json`,
    ]) expected.add(relativePath);
  }
  for (const stateCase of COMBINED_V2_PLAN.stateCases) {
    expected.add(`checkpoints/${stateCase.caseId}.json`);
    expected.add(`${stateCase.scenarioId}/axe/${stateCase.caseId}.json`);
  }
  for (const performance of COMBINED_V2_PLAN.performanceCases) {
    expected.add(`${performance.scenarioId}/performance/${performance.renderCaseId}.json`);
  }
  if (expected.size !== 282) throw new Error('combined execution plan artifact population is invalid');
  return expected;
}

function assertCombinedAutomatedRawProjection(automated, artifactsByPath) {
  const compactStateById = new Map(automated.stateCases.map((stateCase) => [stateCase.caseId, stateCase]));
  for (const planned of COMBINED_V2_PLAN.stateCases) {
    const checkpoint = artifactsByPath.get(`checkpoints/${planned.caseId}.json`);
    const axe = artifactsByPath.get(`${planned.scenarioId}/axe/${planned.caseId}.json`);
    if (!checkpoint || !axe || checkpoint.caseId !== planned.caseId || axe.caseId !== planned.caseId
      || !Array.isArray(axe.violations) || !Array.isArray(checkpoint.assertions)
      || !Array.isArray(checkpoint.automatedFindingCodes)) {
      throw new Error('combined raw state or axe evidence is missing or substituted');
    }
    const axeCounts = summarizeRedactedAxe(axe.violations);
    const passed = checkpoint.assertions.filter(({ passed: value }) => value === true).length;
    const failed = checkpoint.assertions.filter(({ passed: value }) => value === false).length;
    if (passed + failed !== checkpoint.assertions.length
      || checkpoint.axeViolationCount !== axeCounts.violationCount
      || checkpoint.invalidReasonCode !== null) {
      throw new Error('combined raw state evidence has inconsistent counters or invalid status');
    }
    const taskEvidenceComplete = assertExecutedTaskEvidence(
      checkpoint.taskEvidence,
      planned.requiredTaskEvidenceId,
      planned.caseId,
    );
    const projection = {
      caseId: planned.caseId,
      scenarioId: planned.scenarioId,
      status: checkpoint.status,
      automatedOutcome: checkpoint.automatedOutcome,
      assertionCount: checkpoint.assertions.length,
      passedAssertionCount: passed,
      failedAssertionCount: failed,
      axeViolationCount: axeCounts.violationCount,
      horizontalOverflowPx: checkpoint.responsive?.horizontalOverflowPx ?? 0,
      findingCount: checkpoint.automatedFindingCodes.length,
      requiredTaskEvidenceId: planned.requiredTaskEvidenceId,
      taskEvidenceComplete,
    };
    assertStableEqual(compactStateById.get(planned.caseId), projection, 'combined raw state projection');
  }

  const compactPerformanceById = new Map(
    automated.performance.map((performance) => [performance.renderCaseId, performance]),
  );
  for (const planned of COMBINED_V2_PLAN.performanceCases) {
    const observation = artifactsByPath.get(
      `${planned.scenarioId}/performance/${planned.renderCaseId}.json`,
    );
    if (!observation || observation.renderCaseId !== planned.renderCaseId
      || classifyPerformanceObservation(
        observation.conditionRuns,
        COMBINED_V2_MANIFEST.repeatPolicy,
      ).status !== 'lab-performance-observed'
      || observation.status !== 'lab-performance-observed'
      || observation.invalidReasonCode !== null
      || observation.failureStage !== null) {
      throw new Error('combined raw performance evidence is missing, substituted, or invalid');
    }
    const projection = {
      renderCaseId: planned.renderCaseId,
      scenarioId: planned.scenarioId,
      status: observation.status,
      cold: summarizePerformanceRuns(observation.conditionRuns, 'cold'),
      warm: summarizePerformanceRuns(observation.conditionRuns, 'warm'),
    };
    assertStableEqual(
      compactPerformanceById.get(planned.renderCaseId),
      projection,
      'combined raw performance projection',
    );
  }

  const snapshots = Object.keys(R12_SCENARIO_STATE_COUNTS).flatMap((scenarioId) => {
    const snapshot = artifactsByPath.get(`${scenarioId}/manifest-snapshot.json`);
    if (!snapshot || snapshot.scenarioId !== scenarioId
      || snapshot.manifestHash !== COMBINED_V2_MANIFEST_HASH
      || snapshot.executionPlanHash !== COMBINED_V2_PLAN_HASH
      || !Array.isArray(snapshot.cases)) {
      throw new Error('combined raw execution plan snapshot is missing or substituted');
    }
    return snapshot.cases;
  }).sort((left, right) => left.caseId.localeCompare(right.caseId));
  const expectedStateCases = [...COMBINED_V2_PLAN.stateCases]
    .sort((left, right) => left.caseId.localeCompare(right.caseId));
  assertStableEqual(snapshots, expectedStateCases, 'combined raw execution plan snapshots');
}

export function prepareCombinedAutomatedEvidence({
  baselineRunId,
  provenance,
  automated,
  diagnostics,
  automatedArtifactEntries,
  diagnosticArtifactBytes,
  automatedRunSeal,
  runSummary,
  runProgress,
  environmentRecords,
} = {}) {
  if (baselineRunId !== COMBINED_V2_BASELINE_RUN_ID) {
    throw new Error('combined automated evidence is reserved for the exact r13 run');
  }
  const parsedAutomatedEntries = assertJsonArtifactEntryPopulation(
    automatedArtifactEntries,
    283,
    'automated artifacts',
  );
  const automatedArtifactBytes = parsedAutomatedEntries.map(({ bytes }) => bytes);
  if (!Array.isArray(diagnosticArtifactBytes) || diagnosticArtifactBytes.length !== 0) {
    throw new Error('diagnostic artifacts must remain separate from authoritative combined evidence');
  }
  assertJsonArtifactBufferPopulation(
    diagnosticArtifactBytes,
    diagnosticArtifactBytes.length,
    'diagnostic artifacts',
  );
  if (!Array.isArray(environmentRecords) || environmentRecords.length !== 8) {
    throw new Error('combined automated evidence requires exactly eight environment records');
  }
  assertExactKeys(automatedRunSeal, SOURCE_RUN_KEYS, 'runner-emitted automated run seal');
  const sealEntry = parsedAutomatedEntries.find(
    ({ relativePath }) => relativePath === 'automated-run-seal.json',
  );
  if (!sealEntry || !sealEntry.bytes.equals(rawArtifactBytes(automatedRunSeal))) {
    throw new Error('runner-emitted automated run seal is not the direct final marker file');
  }
  const evidenceEntries = parsedAutomatedEntries.filter(
    ({ relativePath }) => relativePath !== 'automated-run-seal.json',
  );
  const evidenceArtifactBytes = evidenceEntries.map(({ bytes }) => bytes);
  const automatedRunSealBytes = sealEntry.bytes;
  if (evidenceEntries.length !== 282) {
    throw new Error('runner-emitted seal must be the separate 283rd automated JSON artifact');
  }
  const expectedPaths = [...combinedAutomatedEvidencePaths()].sort();
  const observedPaths = evidenceEntries.map(({ relativePath }) => relativePath).sort();
  if (observedPaths.some((relativePath, index) => relativePath !== expectedPaths[index])) {
    throw new Error('sealed automated evidence has a missing, extra, or substituted artifact path');
  }
  for (const [index, { value }] of evidenceEntries.entries()) {
    if (value?.baselineRunId !== baselineRunId || value?.executionId !== provenance?.executionId) {
      throw new Error(`sealed automated evidence artifact ${index} has mixed execution identity`);
    }
  }
  const artifactsByPath = new Map(evidenceEntries.map(
    ({ relativePath, value }) => [relativePath, value],
  ));
  const artifactEntriesByPath = new Map(evidenceEntries.map(
    (entry) => [entry.relativePath, entry],
  ));
  const requireExactPathRecord = (relativePath, record, label) => {
    const entry = artifactEntriesByPath.get(relativePath);
    if (!entry || !entry.bytes.equals(rawArtifactBytes(record))) {
      throw new Error(`${label} is not bound to its designated path`);
    }
    return entry.bytes;
  };
  const runSummaryBytes = requireExactPathRecord(
    'run-summary.json',
    runSummary,
    'run summary final marker',
  );
  const runProgressBytes = requireExactPathRecord(
    'run-progress.json',
    runProgress,
    'run progress final marker',
  );
  const environmentBytes = Object.keys(R12_SCENARIO_STATE_COUNTS).map(
    (scenarioId, index) => requireExactPathRecord(
      `${scenarioId}/environment.json`,
      environmentRecords[index],
      `environment record ${index}`,
    ),
  );
  if (!runSummary || runSummary.baselineRunId !== baselineRunId
    || runSummary.executionId !== provenance?.executionId
    || runSummary.runnerVersion !== provenance.runnerVersion
    || runSummary.startedAt !== provenance.startedAt
    || runSummary.finishedAt !== provenance.finishedAt
    || runSummary.buildSha !== provenance.buildSha
    || runSummary.manifestHash !== provenance.executionScenarioManifestHash
    || runSummary.executionPlanHash !== provenance.executionPlanHash
    || runSummary.protocolHash !== provenance.protocolHash
    || runSummary.scenarioCount !== 8
    || runSummary.plannedRenderCaseCount !== 48
    || runSummary.plannedStateCaseCount !== 96
    || runSummary.includePerformance !== true
    || !Array.isArray(runSummary.scenarios)
    || runSummary.scenarios.length !== 8) {
    throw new Error('combined run summary final marker is incomplete or has mixed provenance');
  }
  for (const scenario of runSummary.scenarios) {
    if (!Object.hasOwn(R12_SCENARIO_STATE_COUNTS, scenario.scenarioId)
      || scenario.plannedCaseCount !== R12_SCENARIO_STATE_COUNTS[scenario.scenarioId]
      || scenario.invalidCaseCount !== 0
      || scenario.plannedPerformanceCaseCount !== 6
      || scenario.completedPerformanceCaseCount !== 6
      || scenario.invalidPerformanceCaseCount !== 0) {
      throw new Error('combined run summary scenario population is incomplete');
    }
  }
  if (!runProgress || runProgress.baselineRunId !== baselineRunId
    || runProgress.executionId !== provenance.executionId
    || runProgress.runnerVersion !== provenance.runnerVersion
    || runProgress.startedAt !== provenance.startedAt
    || runProgress.phase !== 'complete'
    || runProgress.plannedStateCaseCount !== 96
    || runProgress.completedStateCaseCount !== 96
    || runProgress.invalidStateCaseCount !== 0
    || runProgress.plannedPerformanceCaseCount !== 48
    || runProgress.completedPerformanceCaseCount !== 48
    || runProgress.invalidPerformanceCaseCount !== 0
    || runProgress.final !== true) {
    throw new Error('combined run progress is not an exact final 96/48 marker');
  }
  for (const environment of environmentRecords) {
    if (environment.baselineRunId !== baselineRunId
      || environment.executionId !== provenance.executionId
      || environment.protocolHash !== provenance.protocolHash
      || environment.protocolHashVerifiedAtFinish !== true
      || environment.buildSha !== provenance.buildSha
      || environment.manifestHash !== provenance.executionScenarioManifestHash
      || environment.executionPlanHash !== provenance.executionPlanHash
      || environment.runnerVersion !== provenance.runnerVersion
      || environment.startedAt !== provenance.startedAt
      || environment.buildInputTreeHash !== provenance.buildInputTreeHash
      || environment.dirtyBuildInputDiffHash !== provenance.dirtyBuildInputDiffHash) {
      throw new Error('combined environment records have mixed or unverified provenance');
    }
  }

  assertExactKeys(automated, AUTOMATED_KEYS, 'combined automated evidence');
  if (sha256Hex(canonicalJsonBytes(automated)) === R12_AUTOMATED_PAYLOAD_DIGEST) {
    throw new Error('historical r12 automated payload cannot seed r13 combined evidence');
  }
  assertCombinedStateCases(automated);
  assertPerformance(automated);
  assertCombinedScenarioBreakdown(automated);
  for (const performance of automated.performance) {
    const planned = COMBINED_V2_PERFORMANCE_BY_ID.get(performance.renderCaseId);
    if (!planned || planned.scenarioId !== performance.scenarioId) {
      throw new Error('combined performance evidence is not in the exact r13 execution plan');
    }
  }
  assertCombinedAutomatedRawProjection(automated, artifactsByPath);

  const allArtifactBytes = [...automatedArtifactBytes, ...diagnosticArtifactBytes];
  const automatedInventoryDigest = aggregatePathBoundContentDigest(parsedAutomatedEntries);
  const automatedEvidenceInventoryDigest = aggregatePathBoundContentDigest(evidenceEntries);
  const diagnosticInventoryDigest = aggregatePathBoundContentDigest([]);
  const sourceInventory = {
    aggregateAlgorithm: 'sha256-json-sorted-path-content-digests-v2',
    inventoryDigest: automatedInventoryDigest,
    automatedInventoryDigest,
    diagnosticInventoryDigest,
    jsonFileCount: allArtifactBytes.length,
    automatedJsonFileCount: automatedArtifactBytes.length,
    diagnosticJsonFileCount: diagnosticArtifactBytes.length,
    totalBytes: allArtifactBytes.reduce((sum, bytes) => sum + bytes.length, 0),
    nonJsonFileCount: 0,
    symlinkCount: 0,
    automatedEvidenceJsonFileCount: evidenceArtifactBytes.length,
    automatedEvidenceInventoryDigest,
    automatedRunSealFileDigest: sha256Hex(canonicalJsonBytes(automatedRunSeal)),
  };
  if (sourceInventory.automatedEvidenceInventoryDigest === R12_SOURCE_INVENTORY.automatedInventoryDigest) {
    throw new Error('historical r12 automated inventory cannot seed r13 combined evidence');
  }
  const sourceRun = structuredClone(automatedRunSeal);
  if (sourceRun.runSummaryDigest !== sha256Hex(runSummaryBytes)
    || sourceRun.runProgressDigest !== sha256Hex(runProgressBytes)
    || sourceRun.environmentDigest !== aggregateContentDigest(environmentBytes)
    || sourceRun.automatedInventoryDigest !== sourceInventory.automatedEvidenceInventoryDigest) {
    throw new Error('runner-emitted automated run seal does not bind the exact raw artifact inventory');
  }
  if (sourceRun.automatedProjectionDigest !== sha256Hex(canonicalJsonBytes(automated))) {
    throw new Error('runner-emitted automated projection digest does not match the raw-derived compact evidence');
  }
  assertCombinedSourceRun({ sourceRun, provenance, sourceInventory });
  const evidence = {
    baselineRunId,
    sourceRun,
    provenance: structuredClone(provenance),
    sourceInventory,
    automated: structuredClone(automated),
    diagnostics: structuredClone(diagnostics),
    automatedEvidenceDigest: null,
  };
  evidence.automatedEvidenceDigest = automatedEvidenceDigest(evidence);
  return evidence;
}

export function sealCombinedManualObservation(observation) {
  const sealed = structuredClone(observation);
  sealed.evidenceDigest = manualObservationDigest(sealed);
  return sealed;
}

export function buildCombinedCompactSummary({
  automatedEvidence,
  manualObservations,
  redaction,
} = {}) {
  assertExactKeys(
    automatedEvidence,
    COMBINED_AUTOMATED_EVIDENCE_KEYS,
    'combined automated evidence envelope',
  );
  if (!Array.isArray(manualObservations)) throw new Error('manual observations must be an array');
  const summary = {
    schemaVersion: 2,
    evidenceKind: 'ui-quality-baseline-combined-summary',
    baselineRunId: automatedEvidence.baselineRunId,
    evidenceScope: 'combined',
    sourceRun: structuredClone(automatedEvidence.sourceRun),
    provenance: structuredClone(automatedEvidence.provenance),
    sourceInventory: structuredClone(automatedEvidence.sourceInventory),
    automated: structuredClone(automatedEvidence.automated),
    diagnostics: structuredClone(automatedEvidence.diagnostics),
    manual: null,
    redaction: structuredClone(redaction),
    limitations: [],
    promotion: {
      status: 'measured',
      eligible: true,
      blockerCodes: [],
    },
  };
  const digest = automatedEvidenceDigest(summary);
  if (automatedEvidence.automatedEvidenceDigest !== digest) {
    throw new Error('combined automated evidence envelope digest is invalid');
  }
  for (const [index, observation] of manualObservations.entries()) {
    if (observation?.automatedEvidenceDigest !== digest) {
      throw new Error(`manual observation ${index} has missing or mixed automated evidence provenance`);
    }
  }
  const checkOrder = Object.keys(MANUAL_ENVIRONMENT_BY_CHECK).sort();
  const observations = structuredClone(manualObservations)
    .sort((left, right) => left.scenarioId.localeCompare(right.scenarioId)
      || checkOrder.indexOf(left.checkId) - checkOrder.indexOf(right.checkId));
  summary.manual = {
    requiredEvidenceCount: 48,
    completedEvidenceCount: observations.filter(({ status }) => ['pass', 'fail'].includes(status)).length,
    findingCount: observations.reduce(
      (count, observation) => count + observation.finding.issueCodes.length,
      0,
    ),
    automatedEvidenceDigest: digest,
    evidenceDigest: sha256Hex(canonicalJsonBytes(observations)),
    status: 'collected',
    observations,
  };
  return assertCombinedCompactSummary(summary);
}

function assertPublishedSummary(summary) {
  if (summary?.schemaVersion === 1) return assertCompactSummary(summary);
  if (summary?.schemaVersion === 2) return assertCombinedCompactSummary(summary);
  throw new Error('published summary schema version is unsupported');
}

export function approveR12CompactSummary(summary, { reviewerRole } = {}) {
  assertCompactSummary(summary);
  if (summary.redaction.status !== 'automated-privacy-guard-passed-human-review-pending') {
    throw new Error('only the pending summary can receive a human redaction approval');
  }
  if (!['quality-engineering', 'repository-governance'].includes(reviewerRole)) {
    throw new Error('reviewer role is not in the approved redaction role set');
  }
  const approved = structuredClone(summary);
  approved.redaction.humanReviewCompletedCount = 8;
  approved.redaction.humanReviewPendingCount = 0;
  approved.redaction.approvedByRoles = [reviewerRole];
  approved.redaction.status = 'approved';
  approved.limitations = approved.limitations.filter(
    (value) => value !== 'human-redaction-review-pending',
  );
  approved.promotion.blockerCodes = ['manual-at-evidence'];
  return assertCompactSummary(approved);
}

function assertEntry(entry, summary, index) {
  assertExactKeys(entry, ENTRY_KEYS, 'baseline index entry');
  if (entry.schemaVersion !== summary?.schemaVersion || entry.status !== 'published') {
    throw new Error('entry status and schema version must match the immutable published summary');
  }
  assertPublishedSummary(summary);
  const digest = sha256Hex(canonicalJsonBytes(summary));
  if (entry.artifactDigest !== digest) throw new Error('entry artifact digest does not match canonical summary bytes');
  assertHex(entry.artifactDigest, HEX64, 'entry.artifactDigest');
  if (!/^git-blob-sha1:[0-9a-f]{40}$/u.test(entry.immutableObjectIdentity)) throw new Error('entry immutable object identity must be git-blob-sha1');
  const createdAtMs = Date.parse(entry.createdAt);
  const retentionExpiryMs = Date.parse(entry.retentionExpiry);
  if (!isUtcInstant(entry.createdAt) || !isUtcInstant(entry.retentionExpiry)) {
    throw new Error('entry timestamps must be valid UTC instants');
  }
  if (retentionExpiryMs - createdAtMs !== 3650 * 24 * 60 * 60 * 1000) {
    throw new Error('entry retention expiry must be exactly 3650 days after creation');
  }
  const mappings = {
    baselineRunId: summary.baselineRunId,
    evidenceScope: summary.evidenceScope,
    buildSha: summary.provenance.buildSha,
    protocolVersion: summary.provenance.protocolVersion,
    protocolHash: summary.provenance.protocolHash,
    protocolHashStatus: summary.provenance.protocolHashStatus,
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
    automatedJsonFileCount: summary.sourceInventory.automatedJsonFileCount,
    diagnosticJsonFileCount: summary.sourceInventory.diagnosticJsonFileCount,
    manualEvidenceCount: summary.manual.completedEvidenceCount,
    redactionStatus: summary.redaction.status,
  };
  for (const [key, expected] of Object.entries(mappings)) {
    if (entry[key] !== expected) throw new Error(`entry.${key} does not match the compact summary`);
  }
  const expectedMediaType = summary.schemaVersion === 2
    ? 'application/vnd.egov.ui-quality-baseline-combined-summary.v2+json'
    : 'application/vnd.egov.ui-quality-baseline-summary+json';
  if (entry.jsonFileCount !== 1 || entry.mediaType !== expectedMediaType) {
    throw new Error('entry media inventory is invalid');
  }
  if (entry.redactionStatus !== 'approved' || summary.redaction.status !== 'approved') {
    throw new Error('every published index entry requires approved human redaction review');
  }
  if (summary.schemaVersion === 2
    && (entry.baselineRunId !== COMBINED_V2_BASELINE_RUN_ID
      || entry.evidenceScope !== 'combined'
      || entry.protocolHashStatus !== 'recorded'
      || entry.manualEvidenceCount !== 48
      || entry.supersedes !== R12_PUBLISHED_DIGEST)) {
    throw new Error('combined v2 entry must supersede the exact published r12 digest');
  }
}

export function buildPublishedIndexEntry({
  summary,
  immutableObjectIdentity,
  createdAt,
  supersedes,
} = {}) {
  assertPublishedSummary(summary);
  if (summary.redaction.status !== 'approved') {
    throw new Error('published index entry requires an approved compact summary');
  }
  if (!isUtcInstant(createdAt)) throw new Error('published entry creation time is invalid');
  if (supersedes !== null) assertHex(supersedes, HEX64, 'entry.supersedes');
  if (summary.schemaVersion === 2 && supersedes !== R12_PUBLISHED_DIGEST) {
    throw new Error('combined v2 entry must supersede the exact published r12 digest');
  }
  const retentionExpiry = new Date(
    Date.parse(createdAt) + (3650 * 24 * 60 * 60 * 1000),
  ).toISOString();
  const entry = {
    schemaVersion: summary.schemaVersion,
    baselineRunId: summary.baselineRunId,
    evidenceScope: summary.evidenceScope,
    buildSha: summary.provenance.buildSha,
    protocolVersion: summary.provenance.protocolVersion,
    protocolHash: summary.provenance.protocolHash,
    protocolHashStatus: summary.provenance.protocolHashStatus,
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
    artifactDigest: sha256Hex(canonicalJsonBytes(summary)),
    jsonFileCount: 1,
    automatedJsonFileCount: summary.sourceInventory.automatedJsonFileCount,
    diagnosticJsonFileCount: summary.sourceInventory.diagnosticJsonFileCount,
    manualEvidenceCount: summary.manual.completedEvidenceCount,
    mediaType: summary.schemaVersion === 2
      ? 'application/vnd.egov.ui-quality-baseline-combined-summary.v2+json'
      : 'application/vnd.egov.ui-quality-baseline-summary+json',
    immutableObjectIdentity,
    createdAt,
    retentionExpiry,
    redactionStatus: summary.redaction.status,
    status: 'published',
    supersedes,
  };
  assertEntry(entry, summary);
  return entry;
}

export function assertBaselineIndex(index, summariesByDigest = new Map()) {
  assertExactKeys(index, INDEX_KEYS, 'baseline index');
  if (index.schemaVersion !== 1
    || index.decisionId !== 'PD-UIQ-001'
    || index.storeMode !== 'versioned-compact-summary'
    || !Array.isArray(index.entries)) {
    throw new Error('baseline index identity is invalid');
  }
  if (index.entries.length === 0) {
    if (index.currentDigest !== null) throw new Error('current digest must remain null without a published entry');
    return index;
  }
  if (typeof index.currentDigest !== 'string' || !HEX64.test(index.currentDigest)) {
    throw new Error('current digest must identify the last published entry');
  }
  const digests = new Set();
  const identities = new Set();
  for (const [position, entry] of index.entries.entries()) {
    const summary = summariesByDigest.get(entry?.artifactDigest);
    if (!summary) throw new Error('index entry summary is missing');
    assertEntry(entry, summary, index);
    if (digests.has(entry.artifactDigest) || identities.has(entry.immutableObjectIdentity)) {
      throw new Error('index digest and immutable identity must be unique');
    }
    digests.add(entry.artifactDigest);
    identities.add(entry.immutableObjectIdentity);
    const expectedPredecessor = position === 0 ? null : index.entries[position - 1].artifactDigest;
    if (entry.supersedes !== expectedPredecessor) throw new Error('index supersedes chain is not append-only');
    if (entry.schemaVersion === 1 && position !== 0) {
      throw new Error('historical r12 entry must remain the first published entry');
    }
    if (entry.schemaVersion === 2
      && (position !== 1 || expectedPredecessor !== R12_PUBLISHED_DIGEST)) {
      throw new Error('combined r13 entry must be the exact successor of published r12');
    }
  }
  if (index.currentDigest !== index.entries.at(-1).artifactDigest) {
    throw new Error('current digest must be the last append-only entry');
  }
  return index;
}

export function assertAppendOnlyIndexTransition(previousIndex, nextIndex) {
  assertExactKeys(nextIndex, INDEX_KEYS, 'next baseline index');
  if (!Array.isArray(nextIndex.entries)) throw new Error('next baseline index entries are invalid');
  const previous = previousIndex ?? {
    schemaVersion: 1,
    decisionId: 'PD-UIQ-001',
    storeMode: 'versioned-compact-summary',
    currentDigest: null,
    entries: [],
  };
  assertExactKeys(previous, INDEX_KEYS, 'previous baseline index');
  if (!Array.isArray(previous.entries)) throw new Error('previous baseline index entries are invalid');
  for (const key of ['schemaVersion', 'decisionId', 'storeMode']) {
    if (nextIndex[key] !== previous[key]) throw new Error(`baseline index ${key} cannot change in an append transition`);
  }
  if (nextIndex.entries.length < previous.entries.length
    || nextIndex.entries.length > previous.entries.length + 1) {
    throw new Error('baseline index transition must preserve history and append at most one entry');
  }
  for (const [index, entry] of previous.entries.entries()) {
    if (stableJson(nextIndex.entries[index]) !== stableJson(entry)) {
      throw new Error('baseline index transition must preserve the exact historical entry prefix');
    }
  }
  if (nextIndex.entries.length === previous.entries.length) {
    if (nextIndex.currentDigest !== previous.currentDigest) {
      throw new Error('baseline index current digest cannot change without one appended entry');
    }
    return nextIndex;
  }
  const appended = nextIndex.entries.at(-1);
  if (appended?.supersedes !== previous.currentDigest || nextIndex.currentDigest !== appended?.artifactDigest) {
    throw new Error('appended baseline index entry must supersede the exact prior current digest');
  }
  return nextIndex;
}

export function evaluateDurableEvidence({
  index,
  summariesByDigest = new Map(),
  trackedBlobIdentityByDigest = new Map(),
} = {}) {
  if (!index || index.currentDigest === null) {
    return { verified: false, reasonCode: 'durable-current-summary-not-published' };
  }
  try {
    assertBaselineIndex(index, summariesByDigest);
  } catch {
    return { verified: false, reasonCode: 'durable-index-or-summary-invalid' };
  }
  const entry = index.entries.at(-1);
  if (trackedBlobIdentityByDigest.get(index.currentDigest) !== entry.immutableObjectIdentity) {
    return { verified: false, reasonCode: 'durable-current-summary-not-tracked' };
  }
  const currentSummary = summariesByDigest.get(index.currentDigest);
  if (entry.schemaVersion === 2
    && currentSummary?.evidenceScope === 'combined'
    && currentSummary?.promotion?.status === 'measured'
    && currentSummary?.promotion?.eligible === true) {
    const automatedFindings = new Map(Object.keys(R12_SCENARIO_STATE_COUNTS).map(
      (scenarioId) => [scenarioId, 0],
    ));
    for (const stateCase of currentSummary.automated.stateCases) {
      automatedFindings.set(
        stateCase.scenarioId,
        automatedFindings.get(stateCase.scenarioId) + stateCase.findingCount,
      );
    }
    const manualFindings = new Map(Object.keys(R12_SCENARIO_STATE_COUNTS).map(
      (scenarioId) => [scenarioId, 0],
    ));
    for (const observation of currentSummary.manual.observations) {
      manualFindings.set(
        observation.scenarioId,
        manualFindings.get(observation.scenarioId) + observation.finding.issueCodes.length,
      );
    }
    return {
      verified: true,
      reasonCode: 'durable-combined-summary-measured-eligible',
      baselineRunId: currentSummary.baselineRunId,
      executionId: currentSummary.provenance.executionId,
      currentDigest: index.currentDigest,
      scenarioEvidence: currentSummary.automated.scenarios.map((scenario) => ({
        scenarioId: scenario.scenarioId,
        status: scenario.status,
        plannedStateCaseCount: scenario.plannedStateCaseCount,
        observedStateCaseCount: scenario.observedStateCaseCount,
        invalidStateCaseCount: scenario.invalidStateCaseCount,
        plannedPerformanceCaseCount: scenario.plannedPerformanceCaseCount,
        observedPerformanceCaseCount: scenario.observedPerformanceCaseCount,
        invalidPerformanceCaseCount: scenario.invalidPerformanceCaseCount,
        automatedFindingCount: automatedFindings.get(scenario.scenarioId),
        manualFindingCount: manualFindings.get(scenario.scenarioId),
        findingCount: automatedFindings.get(scenario.scenarioId)
          + manualFindings.get(scenario.scenarioId),
      })),
    };
  }
  return { verified: false, reasonCode: 'durable-r12-automated-summary-not-measured-eligible' };
}

function gitOutput(repoRoot, args, encoding = 'utf8') {
  const environment = { ...process.env };
  for (const key of GIT_LOCAL_ENVIRONMENT_KEYS) delete environment[key];
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding,
    env: environment,
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  });
}

function assertResolvableCommit(root, revision, label) {
  try {
    gitOutput(root, ['cat-file', '-e', `${revision}^{commit}`]);
  } catch {
    throw new Error(`${label} is not a resolvable Git commit`);
  }
  return revision;
}

export function assertRepositoryIndexAppendOnly({
  repoRoot = process.cwd(),
  previousRevision,
  githubActions = process.env.GITHUB_ACTIONS === 'true',
  eventName = process.env.GITHUB_EVENT_NAME ?? '',
  eventBaseRevision = process.env.UI_QUALITY_INDEX_BASE_SHA ?? '',
} = {}) {
  const root = path.resolve(repoRoot);
  const relativePath = 'config/ui-quality-baseline-index.json';
  const current = assertCanonicalJsonBytes(fs.readFileSync(path.join(root, ...relativePath.split('/'))));
  let revision = previousRevision;
  if (!revision) {
    if (githubActions) {
      if (eventName === 'workflow_dispatch') {
        throw new Error('workflow_dispatch cannot establish an immutable event base revision');
      }
      if (!['pull_request', 'push'].includes(eventName)) {
        throw new Error('required CI event is not authorized for append-only evidence validation');
      }
      revision = typeof eventBaseRevision === 'string' ? eventBaseRevision.trim() : '';
      if (!HEX40.test(revision) || /^0+$/u.test(revision)) {
        throw new Error('required CI event base revision must be a non-zero full Git SHA');
      }
    } else {
      revision = 'HEAD';
    }
  }
  assertResolvableCommit(root, revision, 'event base revision');
  const previousPath = gitOutput(root, ['ls-tree', '--name-only', revision, '--', relativePath]).trim();
  const previous = previousPath === ''
    ? null
    : assertCanonicalJsonBytes(gitOutput(root, ['show', `${revision}:${relativePath}`], null));
  return assertAppendOnlyIndexTransition(previous, current);
}

function committedBytesAt(root, revision, relativePath, label) {
  assertResolvableCommit(root, revision, `${label} revision`);
  const tracked = gitOutput(root, ['ls-tree', '--name-only', revision, '--', relativePath]).trim();
  if (tracked.replaceAll('\\', '/') !== relativePath) {
    throw new Error(`${label} is not tracked at the bound revision`);
  }
  return gitOutput(root, ['show', `${revision}:${relativePath}`], null);
}

export function assertCombinedRepositoryProvenance(root, summary) {
  const { buildSha } = summary.provenance;
  const protocolBytes = committedBytesAt(
    root,
    buildSha,
    COMBINED_V2_PROTOCOL_PATH,
    'combined protocol',
  );
  if (sha256Hex(protocolBytes) !== summary.provenance.protocolHash) {
    throw new Error('combined protocol committed bytes do not match the execution-captured hash');
  }

  const trackedBuildInputs = gitOutput(root, [
    'ls-tree', '-r', '--name-only', '-z', buildSha, '--', ...PRODUCTION_BUILD_INPUT_PATHS,
  ], null).toString('utf8').split('\0').filter(Boolean);
  const committedBuildInputTreeHash = createProductionBuildInputTreeHash({
    trackedPaths: trackedBuildInputs,
    readCommittedFile: (relativePath) => committedBytesAt(
      root,
      buildSha,
      relativePath,
      'combined build input',
    ),
  });
  if (committedBuildInputTreeHash !== summary.provenance.buildInputTreeHash) {
    throw new Error('combined committed production build inputs do not match provenance');
  }
  const currentProtocolBytes = committedBytesAt(
    root,
    'HEAD',
    COMBINED_V2_PROTOCOL_PATH,
    'current combined protocol',
  );
  if (!currentProtocolBytes.equals(protocolBytes)
    || !fs.readFileSync(path.join(root, ...COMBINED_V2_PROTOCOL_PATH.split('/'))).equals(currentProtocolBytes)) {
    throw new Error('combined protocol changed after the r13 execution or differs from committed readback');
  }

  const manifestPath = 'config/ui-quality-scenarios.json';
  const manifestBytes = committedBytesAt(root, buildSha, manifestPath, 'combined scenario manifest');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (sha256Hex(Buffer.from(stableJson(manifest), 'utf8'))
      !== summary.provenance.executionScenarioManifestHash
    || sha256Hex(Buffer.from(stableJson(buildExecutionPlan(manifest)), 'utf8'))
      !== summary.provenance.executionPlanHash
    || sha256Hex(canonicalJsonBytes(manifest.privacy)) !== summary.provenance.privacyRuleHash) {
    throw new Error('combined committed manifest and execution plan do not match provenance');
  }
  for (const [hashKey, relativePath] of Object.entries(TOOLING_PATHS)) {
    const bytes = committedBytesAt(root, buildSha, relativePath, `combined ${hashKey}`);
    if (sha256Hex(bytes) !== summary.provenance[hashKey]) {
      throw new Error(`combined ${hashKey} does not match the clean build commit`);
    }
  }
  const routeTruthPath = 'config/ui-route-capabilities.json';
  const routeTruthBytes = committedBytesAt(root, buildSha, routeTruthPath, 'combined route truth');
  const routeTruth = JSON.parse(routeTruthBytes.toString('utf8'));
  if (sha256Hex(Buffer.from(stableJson(routeTruth), 'utf8')) !== summary.provenance.routeTruthHash) {
    throw new Error('combined route truth does not match the clean build commit');
  }
}

export function verifyDurableEvidenceFromRepository({ repoRoot = process.cwd() } = {}) {
  const root = path.resolve(repoRoot);
  const indexRelativePath = 'config/ui-quality-baseline-index.json';
  try {
    const indexPath = path.join(root, ...indexRelativePath.split('/'));
    const indexStat = fs.lstatSync(indexPath);
    if (!indexStat.isFile() || indexStat.isSymbolicLink()) throw new Error('index is not a regular file');
    const indexBytes = fs.readFileSync(indexPath);
    const index = assertCanonicalJsonBytes(indexBytes);
    if (index.currentDigest === null) {
      assertBaselineIndex(index, new Map());
      return { verified: false, reasonCode: 'durable-current-summary-not-published' };
    }

    const trackedIndexPath = gitOutput(root, ['ls-files', '--error-unmatch', '--', indexRelativePath]).trim();
    if (trackedIndexPath.replaceAll('\\', '/') !== indexRelativePath) throw new Error('index is not tracked');
    const committedIndexBytes = gitOutput(root, ['show', `HEAD:${indexRelativePath}`], null);
    if (!Buffer.isBuffer(committedIndexBytes) || !committedIndexBytes.equals(indexBytes)) {
      throw new Error('index worktree bytes differ from the committed object');
    }

    const summariesByDigest = new Map();
    const trackedBlobIdentityByDigest = new Map();
    const summaryDirectory = path.join(root, 'config', 'ui-quality-baseline', 'summaries');
    const expectedSummaryNames = index.entries
      .map(({ artifactDigest }) => `sha256-${artifactDigest}.json`)
      .sort();
    const actualSummaryNames = fs.readdirSync(summaryDirectory, { withFileTypes: true })
      .map((entry) => {
        if (!entry.isFile() || entry.isSymbolicLink()) throw new Error('summary directory must contain regular files only');
        return entry.name;
      })
      .sort();
    if (actualSummaryNames.length !== expectedSummaryNames.length
      || actualSummaryNames.some((name, indexPosition) => name !== expectedSummaryNames[indexPosition])) {
      throw new Error('summary directory must exactly match the append-only index inventory');
    }
    for (const entry of index.entries) {
      const relativePath = `config/ui-quality-baseline/summaries/sha256-${entry.artifactDigest}.json`;
      const absolutePath = path.join(root, ...relativePath.split('/'));
      const stat = fs.lstatSync(absolutePath);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('summary is not a regular file');
      const bytes = fs.readFileSync(absolutePath);
      const summary = assertCanonicalJsonBytes(bytes);
      if (sha256Hex(bytes) !== entry.artifactDigest) throw new Error('summary filename digest does not match its bytes');
      const trackedPath = gitOutput(root, ['ls-files', '--error-unmatch', '--', relativePath]).trim();
      if (trackedPath.replaceAll('\\', '/') !== relativePath) throw new Error('summary is not tracked');
      const objectId = gitOutput(root, ['rev-parse', `HEAD:${relativePath}`]).trim();
      if (!HEX40.test(objectId)) throw new Error('summary committed object identity is invalid');
      const committedBytes = gitOutput(root, ['show', `HEAD:${relativePath}`], null);
      if (!Buffer.isBuffer(committedBytes) || !committedBytes.equals(bytes)) {
        throw new Error('summary worktree bytes differ from the committed object');
      }
      if (summary.schemaVersion === 2) assertCombinedRepositoryProvenance(root, summary);
      summariesByDigest.set(entry.artifactDigest, summary);
      trackedBlobIdentityByDigest.set(entry.artifactDigest, `git-blob-sha1:${objectId}`);
    }
    return evaluateDurableEvidence({ index, summariesByDigest, trackedBlobIdentityByDigest });
  } catch {
    return { verified: false, reasonCode: 'durable-repository-readback-invalid' };
  }
}

export function aggregateContentDigest(values) {
  if (!Array.isArray(values) || values.some((value) => !Buffer.isBuffer(value))) {
    throw new Error('aggregate content digest requires an array of buffers');
  }
  const contentDigests = values.map((value) => sha256Hex(value)).sort();
  return sha256Hex(Buffer.from(JSON.stringify(contentDigests), 'utf8'));
}

export function aggregatePathBoundContentDigest(entries) {
  if (!Array.isArray(entries) || entries.some((entry) => (
    !entry || typeof entry.relativePath !== 'string' || !Buffer.isBuffer(entry.bytes)
  ))) {
    throw new Error('path-bound aggregate digest requires relative paths and canonical buffers');
  }
  const records = entries.map(({ relativePath, bytes }) => ({
    relativePath,
    contentDigest: sha256Hex(bytes),
  })).sort((left, right) => (
    left.relativePath < right.relativePath ? -1 : Number(left.relativePath > right.relativePath)
  ));
  if (new Set(records.map(({ relativePath }) => relativePath)).size !== records.length) {
    throw new Error('path-bound aggregate digest requires unique relative paths');
  }
  return sha256Hex(canonicalJsonBytes(records));
}

export function countCollectedManualEvidence(values) {
  if (!Array.isArray(values)) throw new Error('manual evidence must be an array');
  return values.filter((value) => value?.evidenceKind === 'manual-observation-v1'
    && ['pass', 'fail'].includes(value?.status)
    && typeof value?.scenarioId === 'string'
    && typeof value?.checkId === 'string'
    && typeof value?.evidenceDigest === 'string'
    && HEX64.test(value.evidenceDigest)).length;
}

function readArtifactMap(artifactRoot, forbiddenArtifactKeys) {
  const root = path.resolve(artifactRoot);
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('artifact root must be a regular directory');
  const files = new Map();
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink()) throw new Error('artifact symlink is forbidden');
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      if (!stat.isFile()) throw new Error('artifact must be a regular file');
      const relativePath = path.relative(root, absolutePath).replaceAll('\\', '/');
      if (relativePath.startsWith('../') || path.posix.extname(relativePath).toLowerCase() !== '.json') {
        throw new Error('artifact inventory must be JSON-only and contained');
      }
      const bytes = fs.readFileSync(absolutePath);
      let parsed;
      try {
        parsed = JSON.parse(bytes.toString('utf8'));
      } catch {
        throw new Error('artifact JSON parse failed');
      }
      assertArtifactSafe(parsed, forbiddenArtifactKeys, 'artifact');
      files.set(relativePath, { bytes, parsed });
    }
  };
  walk(root);
  return files;
}

function requireArtifact(files, relativePath) {
  const value = files.get(relativePath);
  if (!value) throw new Error('required artifact file is missing');
  return value.parsed;
}

function assertStableEqual(actual, expected, label) {
  if (stableJson(actual) !== stableJson(expected)) throw new Error(`${label} does not match its authoritative source`);
}

export function assertPublicationPrivacyPolicy(privacy) {
  assertExactKeys(
    privacy,
    ['syntheticDataOnly', 'rawTraceRepositoryStorage', 'forbiddenArtifactKeys', 'redactionProcedureRef'],
    'publication privacy policy',
  );
  assertStableEqual(privacy, R12_PRIVACY_POLICY, 'publication privacy policy');
  return R12_PRIVACY_RULE_HASH;
}

export function assertR12ProvenanceAgreement({ runSummary, runProgress, environmentValues } = {}) {
  if (!runSummary || !runProgress || !Array.isArray(environmentValues) || environmentValues.length !== 8) {
    throw new Error('r12 provenance requires the run records and eight scenario environments');
  }
  const common = (key) => {
    const values = new Set(environmentValues.map((value) => value?.[key]));
    if (values.size !== 1 || values.has(undefined) || values.has(null)) {
      throw new Error(`scenario environments disagree on ${key}`);
    }
    return environmentValues[0][key];
  };
  const environment = Object.fromEntries([
    'protocolVersion', 'manifestHash', 'buildSha', 'runnerVersion', 'startedAt', 'routeTruthHash',
    'buildInputTreeHash', 'dirtyBuildInputDiffHash', 'frontendBuildId', 'backendBuildId',
  ].map((key) => [key, common(key)]));
  const expectedEnvironment = {
    protocolVersion: R12_EXECUTION_PROVENANCE.protocolVersion,
    manifestHash: R12_EXECUTION_PROVENANCE.executionScenarioManifestHash,
    buildSha: R12_EXECUTION_PROVENANCE.buildSha,
    runnerVersion: R12_EXECUTION_PROVENANCE.runnerVersion,
    startedAt: R12_EXECUTION_PROVENANCE.startedAt,
    routeTruthHash: R12_EXECUTION_PROVENANCE.routeTruthHash,
    buildInputTreeHash: R12_EXECUTION_PROVENANCE.buildInputTreeHash,
    dirtyBuildInputDiffHash: R12_EXECUTION_PROVENANCE.dirtyBuildInputDiffHash,
    frontendBuildId: R12_EXECUTION_PROVENANCE.frontendBuildId,
    backendBuildId: R12_EXECUTION_PROVENANCE.backendBuildId,
  };
  for (const [key, expected] of Object.entries(expectedEnvironment)) {
    if (environment[key] !== expected) throw new Error(`scenario environment provenance mismatch for ${key}`);
  }
  for (const key of ['manifestHash', 'buildSha', 'runnerVersion', 'startedAt']) {
    if (runSummary[key] !== environment[key]) throw new Error(`run summary provenance mismatch for ${key}`);
  }
  for (const key of ['runnerVersion', 'startedAt']) {
    if (runProgress[key] !== environment[key]) throw new Error(`run progress provenance mismatch for ${key}`);
  }
  return environment;
}

export function summarizeRedactedAxe(violations) {
  if (!Array.isArray(violations)) throw new Error('axe violations must be an array');
  let nodeCount = 0;
  for (const violation of violations) {
    if (!violation || typeof violation !== 'object' || !Array.isArray(violation.nodes)) {
      throw new Error('axe violation must contain the redacted node inventory');
    }
    assertInteger(violation.nodeCount, 'axe violation nodeCount');
    if (violation.nodeCount !== violation.nodes.length) {
      throw new Error('axe violation node count does not match its redacted node inventory');
    }
    nodeCount += violation.nodeCount;
  }
  return { violationCount: violations.length, nodeCount };
}

function summarizeNumbers(values) {
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('performance summary requires finite nonnegative observations');
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
  const deviations = sorted.map((value) => Math.abs(value - median)).sort((left, right) => left - right);
  const deviationMiddle = Math.floor(deviations.length / 2);
  const medianAbsoluteDeviation = deviations.length % 2 === 1
    ? deviations[deviationMiddle]
    : (deviations[deviationMiddle - 1] + deviations[deviationMiddle]) / 2;
  return {
    minimum: sorted[0],
    median,
    maximum: sorted.at(-1),
    medianAbsoluteDeviation,
  };
}

function summarizePerformanceRuns(conditionRuns, condition) {
  const runs = conditionRuns.filter((run) => run.condition === condition);
  return Object.fromEntries(CONDITION_KEYS.map((metric) => [
    metric,
    summarizeNumbers(runs.map((run) => run.metrics?.[metric])),
  ]));
}

function compareExpectedPaths(files, expectedPaths) {
  const actual = [...files.keys()].sort();
  const expected = [...expectedPaths].sort();
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error('artifact inventory has missing, extra, or substituted files');
  }
}

function assertExecutedTaskEvidence(taskEvidence, requiredTaskEvidenceId, caseId) {
  if (requiredTaskEvidenceId === null) {
    if (!Array.isArray(taskEvidence) || taskEvidence.length !== 0) {
      throw new Error('non-mutation state case must have empty task evidence');
    }
    return false;
  }
  if (!Array.isArray(taskEvidence) || taskEvidence.length !== 1) throw new Error('mutation state case requires exactly one task evidence record');
  const evidence = taskEvidence[0];
  const exact = evidence.id === requiredTaskEvidenceId
    && evidence.caseId === caseId
    && evidence.syntheticNamespace === 'uiq-baseline-mutation-v1'
    && evidence.mutationObserved === 'observed'
    && evidence.authoritativeReadback === 'observed'
    && evidence.rollbackReadback === 'observed'
    && evidence.cleanupReadback === 'zero-active-residue'
    && evidence.activeResidueCount === 0
    && evidence.status === 'executed';
  if (!exact) throw new Error('mutation task evidence is incomplete or bound to another case');
  return true;
}

function toolingProvenance(repoRoot) {
  const currentBytesMatch = Object.entries(TOOLING_PATHS).every(([key, relativePath]) => {
    const actual = sha256Hex(fs.readFileSync(path.join(repoRoot, ...relativePath.split('/'))));
    return actual === R12_TOOLING_HASHES[key];
  });
  return {
    hashes: { ...R12_TOOLING_HASHES },
    status: currentBytesMatch
      ? 'retrospective-protocol-record-current-bytes-match'
      : 'retrospective-protocol-record-current-bytes-drifted',
  };
}

export function collectR12CompactSummary({ artifactRoot, manifestPath, repoRoot = process.cwd() } = {}) {
  if (!artifactRoot || !manifestPath) throw new Error('artifactRoot and manifestPath are required');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const privacyRuleHash = assertPublicationPrivacyPolicy(manifest.privacy);
  const files = readArtifactMap(artifactRoot, R12_PRIVACY_POLICY.forbiddenArtifactKeys);
  if (files.size !== 290) throw new Error('r12 publication requires exactly 290 JSON artifacts');
  const automatedFiles = [...files.entries()].filter(([relativePath]) => !relativePath.startsWith('diagnostics/'));
  const diagnosticFiles = [...files.entries()].filter(([relativePath]) => relativePath.startsWith('diagnostics/'));
  if (automatedFiles.length !== 282 || diagnosticFiles.length !== 8) {
    throw new Error('r12 full and diagnostic artifact populations are incomplete');
  }

  const runSummary = requireArtifact(files, 'run-summary.json');
  const runProgress = requireArtifact(files, 'run-progress.json');
  const plan = buildExecutionPlan(manifest);
  if (plan.scenarioCount !== 8 || plan.renderCases.length !== 48
    || plan.stateCases.length !== 96 || plan.performanceCases.length !== 48) {
    throw new Error('current execution plan is not the exact r12 8/48/96/48 population');
  }
  if (runSummary.scenarioCount !== 8
    || runSummary.plannedRenderCaseCount !== 48
    || runSummary.plannedStateCaseCount !== 96
    || runProgress.plannedStateCaseCount !== 96
    || runProgress.completedStateCaseCount !== 96
    || runProgress.plannedPerformanceCaseCount !== 48
    || runProgress.completedPerformanceCaseCount !== 48
    || runProgress.invalidStateCaseCount !== 0
    || runProgress.invalidPerformanceCaseCount !== 0
    || runProgress.final !== true) {
    throw new Error('r12 run population or finish status is incomplete');
  }

  const expectedPaths = new Set(['run-summary.json', 'run-progress.json']);
  const stateCases = [];
  const performance = [];
  const scenarios = [];
  const snapshotCases = [];
  const environmentValues = [];
  const manualPlaceholders = [];
  let assertionCount = 0;
  let passedAssertionCount = 0;
  let failedAssertionCount = 0;
  let mutationRequiredCaseCount = 0;
  let mutationExecutedCaseCount = 0;
  let axeViolationCaseCount = 0;
  let axeViolationNodeCount = 0;
  let horizontalOverflowCaseCount = 0;
  let findingCount = 0;

  const scenarioIds = plan.stateCases.map(({ scenarioId }) => scenarioId)
    .filter((value, index, values) => values.indexOf(value) === index);
  if (scenarioIds.length !== 8) throw new Error('scenario identities are incomplete');
  for (const scenarioId of scenarioIds) {
    const baselinePath = `${scenarioId}/baseline-result.json`;
    const environmentPath = `${scenarioId}/environment.json`;
    const snapshotPath = `${scenarioId}/manifest-snapshot.json`;
    const taskPath = `${scenarioId}/task-observations.json`;
    const manualPath = `${scenarioId}/manual/manual-checks.json`;
    [baselinePath, environmentPath, snapshotPath, taskPath, manualPath].forEach((value) => expectedPaths.add(value));
    const baseline = requireArtifact(files, baselinePath);
    const environment = requireArtifact(files, environmentPath);
    const snapshot = requireArtifact(files, snapshotPath);
    const taskObservation = requireArtifact(files, taskPath);
    const manual = requireArtifact(files, manualPath);
    environmentValues.push(environment);
    if (baseline.scenarioId !== scenarioId || snapshot.scenarioId !== scenarioId) throw new Error('scenario artifact identity mismatch');
    if (environment.buildInputTreeHashVerifiedAtFinish !== true
      || environment.dirtyBuildInputDiffHashVerifiedAtFinish !== true) {
      throw new Error('scenario source fingerprint finish verification failed');
    }
    snapshotCases.push(...snapshot.cases);
    assertStableEqual(baseline.manual, manual, 'manual placeholders');
    if (!Array.isArray(baseline.taskMetrics) || baseline.taskMetrics.length !== 1) throw new Error('scenario task metric summary is missing');
    assertStableEqual(baseline.taskMetrics[0], taskObservation, 'task observation');
    if (taskObservation.authoritativeTaskReadbackComplete !== true) throw new Error('scenario authoritative task readback is incomplete');
    manualPlaceholders.push(...manual);

    const plannedStateCases = plan.stateCases.filter((value) => value.scenarioId === scenarioId);
    if (!Array.isArray(baseline.cases) || baseline.cases.length !== plannedStateCases.length) {
      throw new Error('scenario state population mismatch');
    }
    const snapshotById = new Map(snapshot.cases.map((value) => [value.caseId, value]));
    for (const stateCase of baseline.cases) {
      const planned = snapshotById.get(stateCase.caseId);
      if (!planned || planned.scenarioId !== scenarioId) throw new Error('state case is missing from the execution snapshot');
      const checkpointPath = `checkpoints/${stateCase.caseId}.json`;
      const axePath = `${scenarioId}/axe/${stateCase.caseId}.json`;
      expectedPaths.add(checkpointPath);
      expectedPaths.add(axePath);
      assertStableEqual(requireArtifact(files, checkpointPath), stateCase, 'state checkpoint');
      const axe = requireArtifact(files, axePath);
      if (axe.caseId !== stateCase.caseId || !Array.isArray(axe.violations)) throw new Error('axe case identity is invalid');
      assertStableEqual(axe.violations, stateCase.axe, 'axe case result');
      const axeCounts = summarizeRedactedAxe(axe.violations);
      if (stateCase.axeViolationCount !== axeCounts.violationCount) {
        throw new Error('state axe violation count does not match the authoritative axe array');
      }
      if (stateCase.status !== 'automated-state-observed'
        || stateCase.automatedOutcome !== 'no-automated-finding-observed'
        || stateCase.invalidReasonCode !== null) {
        throw new Error('state case is not a valid r12 automated observation');
      }
      const assertions = Array.isArray(stateCase.assertions) ? stateCase.assertions : [];
      const passed = assertions.filter(({ passed: value }) => value === true).length;
      const failed = assertions.filter(({ passed: value }) => value === false).length;
      if (passed + failed !== assertions.length || failed !== stateCase.failedAssertionCount) {
        throw new Error('state assertion counters are inconsistent');
      }
      const taskComplete = assertExecutedTaskEvidence(
        stateCase.taskEvidence,
        planned.requiredTaskEvidenceId,
        stateCase.caseId,
      );
      assertionCount += assertions.length;
      passedAssertionCount += passed;
      failedAssertionCount += failed;
      mutationRequiredCaseCount += Number(planned.requiredTaskEvidenceId !== null);
      mutationExecutedCaseCount += Number(taskComplete);
      axeViolationCaseCount += Number(axeCounts.violationCount > 0);
      axeViolationNodeCount += axeCounts.nodeCount;
      horizontalOverflowCaseCount += Number(stateCase.responsive?.horizontalOverflowPx > 1);
      findingCount += stateCase.automatedFindingCodes.length;
      stateCases.push({
        caseId: stateCase.caseId,
        scenarioId,
        status: stateCase.status,
        automatedOutcome: stateCase.automatedOutcome,
        assertionCount: assertions.length,
        passedAssertionCount: passed,
        failedAssertionCount: failed,
        axeViolationCount: stateCase.axeViolationCount,
        horizontalOverflowPx: stateCase.responsive?.horizontalOverflowPx ?? 0,
        findingCount: stateCase.automatedFindingCodes.length,
        requiredTaskEvidenceId: planned.requiredTaskEvidenceId,
        taskEvidenceComplete: taskComplete,
      });
    }

    const plannedPerformance = plan.performanceCases.filter((value) => value.scenarioId === scenarioId);
    if (!Array.isArray(baseline.performanceMetrics) || baseline.performanceMetrics.length !== plannedPerformance.length) {
      throw new Error('scenario performance population mismatch');
    }
    for (const observation of baseline.performanceMetrics) {
      const planned = plannedPerformance.find(({ renderCaseId }) => renderCaseId === observation.renderCaseId);
      if (!planned) throw new Error('performance case is missing from the execution plan');
      const performancePath = `${scenarioId}/performance/${observation.renderCaseId}.json`;
      expectedPaths.add(performancePath);
      assertStableEqual(requireArtifact(files, performancePath), observation, 'performance case result');
      const classification = classifyPerformanceObservation(observation.conditionRuns, manifest.repeatPolicy);
      if (classification.status !== 'lab-performance-observed'
        || observation.status !== 'lab-performance-observed'
        || observation.invalidReasonCode !== null
        || observation.failureStage !== null) {
        throw new Error('performance observation is invalid');
      }
      const cold = summarizePerformanceRuns(observation.conditionRuns, 'cold');
      const warm = summarizePerformanceRuns(observation.conditionRuns, 'warm');
      assertStableEqual(observation.summary, { cold, warm }, 'performance summary');
      performance.push({
        renderCaseId: observation.renderCaseId,
        scenarioId,
        status: observation.status,
        cold,
        warm,
      });
    }

    const runScenario = runSummary.scenarios.find((value) => value.scenarioId === scenarioId);
    if (!runScenario
      || runScenario.plannedCaseCount !== baseline.cases.length
      || runScenario.invalidCaseCount !== 0
      || runScenario.plannedPerformanceCaseCount !== baseline.performanceMetrics.length
      || runScenario.completedPerformanceCaseCount !== baseline.performanceMetrics.length
      || runScenario.invalidPerformanceCaseCount !== 0
      || runScenario.axeViolationCaseCount !== baseline.cases.filter((value) => value.axeViolationCount > 0).length
      || runScenario.failedAssertionCaseCount !== baseline.cases.filter((value) => value.failedAssertionCount > 0).length
      || runScenario.status !== 'partial-automated-evidence') {
      throw new Error('run summary scenario aggregate does not match recomputed evidence');
    }
    scenarios.push({
      scenarioId,
      plannedStateCaseCount: baseline.cases.length,
      observedStateCaseCount: baseline.cases.length,
      invalidStateCaseCount: 0,
      plannedPerformanceCaseCount: baseline.performanceMetrics.length,
      observedPerformanceCaseCount: baseline.performanceMetrics.length,
      invalidPerformanceCaseCount: 0,
      axeViolationCaseCount: baseline.cases.filter((value) => value.axeViolationCount > 0).length,
      failedAssertionCaseCount: baseline.cases.filter((value) => value.failedAssertionCount > 0).length,
      status: runScenario.status,
    });
  }

  const expectedPlanCases = [...plan.stateCases].sort((left, right) => left.caseId.localeCompare(right.caseId));
  const actualSnapshotCases = [...snapshotCases].sort((left, right) => left.caseId.localeCompare(right.caseId));
  assertStableEqual(actualSnapshotCases, expectedPlanCases, 'execution plan snapshot');

  const diagnosticRoot = 'diagnostics/synthetic-mutation-v1';
  const diagnosticSummaryPath = `${diagnosticRoot}/diagnostic-summary.json`;
  const diagnosticProgressPath = `${diagnosticRoot}/run-progress.json`;
  expectedPaths.add(diagnosticSummaryPath);
  expectedPaths.add(diagnosticProgressPath);
  const diagnosticSummary = requireArtifact(files, diagnosticSummaryPath);
  requireArtifact(files, diagnosticProgressPath);
  if (diagnosticSummary.diagnosticKind !== 'synthetic-mutation-v1'
    || diagnosticSummary.status !== 'diagnostic-not-baseline-evidence'
    || diagnosticSummary.diagnosticStateCaseCount !== 6
    || diagnosticSummary.completedStateCaseCount !== 6
    || diagnosticSummary.invalidStateCaseCount !== 0
    || diagnosticSummary.fullPlannedStateCaseCount !== 96
    || diagnosticSummary.buildInputTreeHashVerifiedAtFinish !== true
    || diagnosticSummary.dirtyBuildInputDiffHashVerifiedAtFinish !== true) {
    throw new Error('diagnostic summary is incomplete');
  }
  let diagnosticMutationEvidenceCount = 0;
  let diagnosticResidue = 0;
  for (const diagnosticCase of diagnosticSummary.cases) {
    const checkpointPath = `${diagnosticRoot}/checkpoints/${diagnosticCase.caseId}.json`;
    expectedPaths.add(checkpointPath);
    assertExactKeys(
      diagnosticCase,
      ['caseId', 'invalidReasonCode', 'status', 'taskEvidence'],
      'diagnostic summary case',
    );
    const checkpoint = requireArtifact(files, checkpointPath);
    assertStableEqual({
      caseId: checkpoint.caseId,
      invalidReasonCode: checkpoint.invalidReasonCode,
      status: checkpoint.status,
      taskEvidence: checkpoint.taskEvidence,
    }, diagnosticCase, 'diagnostic checkpoint projection');
    if (diagnosticCase.status !== 'automated-state-observed' || diagnosticCase.invalidReasonCode !== null
      || !Array.isArray(diagnosticCase.taskEvidence) || diagnosticCase.taskEvidence.length !== 1) {
      throw new Error('diagnostic case is incomplete');
    }
    const evidence = diagnosticCase.taskEvidence[0];
    assertExecutedTaskEvidence(diagnosticCase.taskEvidence, evidence.id, diagnosticCase.caseId);
    diagnosticMutationEvidenceCount += 1;
    diagnosticResidue += evidence.activeResidueCount;
  }
  compareExpectedPaths(files, expectedPaths);

  const executionProvenance = assertR12ProvenanceAgreement({ runSummary, runProgress, environmentValues });
  const executionScenarioManifestHash = executionProvenance.manifestHash;
  const executionPlanHash = sha256Hex(Buffer.from(stableJson(plan), 'utf8'));
  const tooling = toolingProvenance(path.resolve(repoRoot));
  const allBuffers = [...files.values()].map(({ bytes }) => bytes);
  const automatedBuffers = automatedFiles.map(([, { bytes }]) => bytes);
  const diagnosticBuffers = diagnosticFiles.map(([, { bytes }]) => bytes);
  const reviewRequiredCount = manualPlaceholders.filter(({ evidenceKind, status }) => evidenceKind === 'none'
    && status === 'not-run-manual-review-required').length;
  const blockedExternalCount = manualPlaceholders.filter(({ evidenceKind, status }) => evidenceKind === 'none'
    && status === 'blocked-external').length;
  const completedManualCount = countCollectedManualEvidence(manualPlaceholders);
  if (manualPlaceholders.length !== 48 || reviewRequiredCount !== 40
    || blockedExternalCount !== 8 || completedManualCount !== 0) {
    throw new Error('manual placeholders must not impersonate collected evidence');
  }
  const pendingReviewCount = environmentValues.filter((value) => value.redactionReviewer === 'unassigned').length;
  if (pendingReviewCount !== 8) throw new Error('human redaction review state is not the expected pending population');
  if (assertionCount !== 156 || passedAssertionCount !== 156 || failedAssertionCount !== 0
    || mutationRequiredCaseCount !== 36 || mutationExecutedCaseCount !== 36
    || axeViolationCaseCount !== 0 || axeViolationNodeCount !== 0
    || horizontalOverflowCaseCount !== 0 || findingCount !== 0) {
    throw new Error('recomputed r12 automated aggregate is inconsistent');
  }

  const summary = {
    schemaVersion: 1,
    evidenceKind: 'ui-quality-baseline-compact-summary',
    baselineRunId: 'r12',
    evidenceScope: 'automated-only',
    provenance: {
      protocolVersion: executionProvenance.protocolVersion,
      protocolHash: null,
      protocolHashStatus: 'not-recorded-in-r12',
      runnerVersion: executionProvenance.runnerVersion,
      buildSha: executionProvenance.buildSha,
      executionScenarioManifestHash,
      executionPlanHash,
      executionPlanHashStatus: 'retrospective-current-plan-matched-r12-snapshots',
      routeTruthHash: executionProvenance.routeTruthHash,
      privacyRuleHash,
      buildInputTreeHash: executionProvenance.buildInputTreeHash,
      dirtyBuildInputDiffHash: executionProvenance.dirtyBuildInputDiffHash,
      ...tooling.hashes,
      toolingHashStatus: tooling.status,
      startedAt: executionProvenance.startedAt,
      finishedAt: runSummary.finishedAt,
      frontendBuildId: executionProvenance.frontendBuildId,
      backendBuildId: executionProvenance.backendBuildId,
      finishVerificationScenarioCount: environmentValues.length,
    },
    sourceInventory: {
      aggregateAlgorithm: 'sha256-json-sorted-content-digests-v1',
      inventoryDigest: aggregateContentDigest(allBuffers),
      automatedInventoryDigest: aggregateContentDigest(automatedBuffers),
      diagnosticInventoryDigest: aggregateContentDigest(diagnosticBuffers),
      jsonFileCount: files.size,
      automatedJsonFileCount: automatedFiles.length,
      diagnosticJsonFileCount: diagnosticFiles.length,
      totalBytes: allBuffers.reduce((sum, value) => sum + value.length, 0),
      nonJsonFileCount: 0,
      symlinkCount: 0,
    },
    automated: {
      scenarioCount: scenarios.length,
      renderCaseCount: plan.renderCases.length,
      plannedStateCaseCount: plan.stateCases.length,
      observedStateCaseCount: stateCases.length,
      invalidStateCaseCount: 0,
      plannedPerformanceCaseCount: plan.performanceCases.length,
      observedPerformanceCaseCount: performance.length,
      invalidPerformanceCaseCount: 0,
      performanceConditionRunCount: performance.length * 6,
      assertionCount,
      passedAssertionCount,
      failedAssertionCount,
      mutationRequiredCaseCount,
      mutationExecutedCaseCount,
      mutationReadbackCaseCount: mutationExecutedCaseCount,
      mutationRollbackCaseCount: mutationExecutedCaseCount,
      mutationCleanupCaseCount: mutationExecutedCaseCount,
      activeMutationResidueCount: 0,
      nonMutationEmptyEvidenceCaseCount: stateCases.length - mutationRequiredCaseCount,
      axeViolationCaseCount,
      axeViolationNodeCount,
      horizontalOverflowCaseCount,
      findingCount,
      stateCases: stateCases.sort((left, right) => left.caseId.localeCompare(right.caseId)),
      scenarios: scenarios.sort((left, right) => left.scenarioId.localeCompare(right.scenarioId)),
      performance: performance.sort((left, right) => left.renderCaseId.localeCompare(right.renderCaseId)),
    },
    diagnostics: {
      evidenceKind: 'diagnostic-not-baseline-evidence',
      plannedCaseCount: 6,
      completedCaseCount: 6,
      invalidCaseCount: 0,
      mutationEvidenceCount: diagnosticMutationEvidenceCount,
      activeMutationResidueCount: diagnosticResidue,
    },
    manual: {
      requiredEvidenceCount: 48,
      completedEvidenceCount: completedManualCount,
      reviewRequiredCount,
      blockedExternalCount,
      status: 'not-collected',
    },
    redaction: {
      automatedGuardStatus: 'passed',
      scannedJsonFileCount: files.size,
      unsafeFileCount: 0,
      rawTraceStoredCount: 0,
      responsePayloadStoredCount: 0,
      humanReviewCompletedCount: 0,
      humanReviewPendingCount: pendingReviewCount,
      reviewQuorum: 1,
      approvedByRoles: [],
      status: 'automated-privacy-guard-passed-human-review-pending',
    },
    limitations: [
      'raw-artifact-was-unversioned-before-compaction',
      'protocol-hash-not-captured-at-run',
      'tooling-hashes-not-recorded-in-raw-artifact',
      ...(tooling.status === 'retrospective-protocol-record-current-bytes-drifted'
        ? ['current-tooling-drifted-after-r12']
        : []),
      'human-redaction-review-pending',
      'manual-evidence-not-collected',
    ],
    promotion: {
      status: 'partial-automated-evidence',
      eligible: false,
      blockerCodes: ['manual-at-evidence', 'redaction-review'],
    },
  };
  assertCompactSummary(summary);
  return summary;
}

function parseCli(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag?.startsWith('--') || value === undefined) throw new Error('bounded CLI arguments are incomplete');
    values[flag.slice(2)] = value;
  }
  const allowed = [
    'artifact-root', 'manifest', 'repo-root', 'output',
    'candidate', 'reviewer-role', 'created-at',
  ];
  if (Object.keys(values).some((key) => !allowed.includes(key))) {
    throw new Error('bounded CLI arguments are invalid');
  }
  const publicationMode = values.candidate !== undefined;
  if (publicationMode) {
    if (!values.candidate || !values['reviewer-role'] || !values['created-at']
      || values['artifact-root'] || values.manifest || values.output) {
      throw new Error('bounded publication CLI arguments are invalid');
    }
    return { ...values, mode: 'publish' };
  }
  if (!values['artifact-root'] || !values.manifest || !values.output
    || values['reviewer-role'] || values['created-at']) {
    throw new Error('bounded candidate CLI arguments are invalid');
  }
  return { ...values, mode: 'candidate' };
}

function runCli() {
  const args = parseCli(process.argv.slice(2));
  const repoRoot = path.resolve(args['repo-root'] ?? process.cwd());
  if (args.mode === 'publish') {
    const candidate = path.resolve(args.candidate);
    const allowedCandidateRoot = path.resolve(
      repoRoot,
      'build/reports/ui-quality-baseline-publication',
    );
    if (candidate !== allowedCandidateRoot
      && !candidate.startsWith(`${allowedCandidateRoot}${path.sep}`)) {
      throw new Error('publication candidate must stay in the ignored staging root');
    }
    assertRepositoryIndexAppendOnly({ repoRoot });
    const pending = assertCanonicalJsonBytes(fs.readFileSync(candidate));
    const approved = approveR12CompactSummary(pending, {
      reviewerRole: args['reviewer-role'],
    });
    const summaryBytes = canonicalJsonBytes(approved);
    const artifactDigest = sha256Hex(summaryBytes);
    const summaryRelativePath = `config/ui-quality-baseline/summaries/sha256-${artifactDigest}.json`;
    const summaryPath = path.join(repoRoot, ...summaryRelativePath.split('/'));
    const indexPath = path.join(repoRoot, 'config', 'ui-quality-baseline-index.json');
    const originalIndexBytes = fs.readFileSync(indexPath);
    const index = assertCanonicalJsonBytes(originalIndexBytes);
    const summariesByDigest = new Map();
    for (const existing of index.entries) {
      const existingPath = path.join(
        repoRoot,
        'config',
        'ui-quality-baseline',
        'summaries',
        `sha256-${existing.artifactDigest}.json`,
      );
      summariesByDigest.set(
        existing.artifactDigest,
        assertCanonicalJsonBytes(fs.readFileSync(existingPath)),
      );
    }
    assertBaselineIndex(index, summariesByDigest);
    fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
    fs.writeFileSync(summaryPath, summaryBytes, { flag: 'wx' });
    try {
      const blobHash = gitOutput(repoRoot, [
        'hash-object', `--path=${summaryRelativePath}`, '--', summaryRelativePath,
      ]).trim();
      if (!HEX40.test(blobHash)) throw new Error('published summary Git blob identity is invalid');
      const entry = buildPublishedIndexEntry({
        summary: approved,
        immutableObjectIdentity: `git-blob-sha1:${blobHash}`,
        createdAt: args['created-at'],
        supersedes: index.currentDigest,
      });
      const nextIndex = {
        ...index,
        currentDigest: artifactDigest,
        entries: [...index.entries, entry],
      };
      summariesByDigest.set(artifactDigest, approved);
      assertAppendOnlyIndexTransition(index, nextIndex);
      assertBaselineIndex(nextIndex, summariesByDigest);
      fs.writeFileSync(indexPath, canonicalJsonBytes(nextIndex));
      assertCanonicalJsonBytes(fs.readFileSync(summaryPath));
      assertCanonicalJsonBytes(fs.readFileSync(indexPath));
      process.stdout.write(JSON.stringify({
        baselineRunId: approved.baselineRunId,
        artifactDigest,
        immutableObjectIdentity: entry.immutableObjectIdentity,
        evidenceScope: approved.evidenceScope,
        manualEvidenceCount: approved.manual.completedEvidenceCount,
        redactionStatus: approved.redaction.status,
        promotionEligible: approved.promotion.eligible,
      }));
      return;
    } catch (error) {
      fs.writeFileSync(indexPath, originalIndexBytes);
      fs.rmSync(summaryPath, { force: true });
      throw error;
    }
  }
  const output = path.resolve(args.output);
  const allowedOutputRoot = path.resolve(repoRoot, 'build/reports/ui-quality-baseline-publication');
  if (output !== allowedOutputRoot && !output.startsWith(`${allowedOutputRoot}${path.sep}`)) {
    throw new Error('candidate output must stay in the ignored publication staging root');
  }
  const summary = collectR12CompactSummary({
    artifactRoot: path.resolve(args['artifact-root']),
    manifestPath: path.resolve(args.manifest),
    repoRoot,
  });
  const bytes = canonicalJsonBytes(summary);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, bytes, { flag: 'wx' });
  process.stdout.write(JSON.stringify({
    baselineRunId: summary.baselineRunId,
    artifactDigest: sha256Hex(bytes),
    jsonFileCount: summary.sourceInventory.jsonFileCount,
    manualEvidenceCount: summary.manual.completedEvidenceCount,
    redactionStatus: summary.redaction.status,
    promotionEligible: summary.promotion.eligible,
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    runCli();
  } catch {
    process.stderr.write('ui-quality evidence preparation failed\n');
    process.exitCode = 1;
  }
}
