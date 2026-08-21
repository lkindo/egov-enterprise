import { createHash } from 'node:crypto';

function normalizeKey(value) {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

export function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

export function packageManagerVersionCommand(platform = process.platform) {
  if (platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'pnpm --version'],
    };
  }
  return { command: 'pnpm', args: ['--version'] };
}

export const PRODUCTION_BUILD_INPUT_PATHS = Object.freeze([
  '.dockerignore',
  'build.gradle',
  'settings.gradle',
  'gradle.properties',
  'gradlew',
  'gradle',
  'api-server/Dockerfile',
  'api-server/build.gradle',
  'api-server/src/main',
  'business-app/build.gradle',
  'business-app/src/main',
  'business-core/build.gradle',
  'business-core/src/main',
  'foundation/build.gradle',
  'foundation/src/main',
  'migration-tool/build.gradle',
  'frontend/Dockerfile',
  'frontend/.dockerignore',
  'frontend/package.json',
  'frontend/pnpm-lock.yaml',
  'frontend/next-env.d.ts',
  'frontend/next.config.ts',
  'frontend/postcss.config.mjs',
  'frontend/tsconfig.json',
  'frontend/src',
  'frontend/public',
  'frontend/scripts/ui-quality-baseline-core.mjs',
  'frontend/scripts/ui-quality-baseline-runner.mjs',
  'config/ui-quality-scenarios.json',
  'config/ui-route-capabilities.json',
]);

export const REQUIRED_PRODUCTION_BUILD_INPUT_FILES = Object.freeze([
  '.dockerignore',
  'build.gradle',
  'settings.gradle',
  'gradle.properties',
  'gradlew',
  'gradle/libs.versions.toml',
  'gradle/wrapper/gradle-wrapper.jar',
  'gradle/wrapper/gradle-wrapper.properties',
  'api-server/Dockerfile',
  'api-server/build.gradle',
  'business-app/build.gradle',
  'business-core/build.gradle',
  'foundation/build.gradle',
  'migration-tool/build.gradle',
  'frontend/Dockerfile',
  'frontend/.dockerignore',
  'frontend/package.json',
  'frontend/pnpm-lock.yaml',
  'frontend/next.config.ts',
  'frontend/tsconfig.json',
  'frontend/scripts/ui-quality-baseline-core.mjs',
  'frontend/scripts/ui-quality-baseline-runner.mjs',
  'config/ui-quality-scenarios.json',
  'config/ui-route-capabilities.json',
]);

const PRODUCTION_BUILD_INPUT_EXACT_FILES = new Set(
  PRODUCTION_BUILD_INPUT_PATHS.filter((entry) => ![
    'gradle',
    'api-server/src/main',
    'business-app/src/main',
    'business-core/src/main',
    'foundation/src/main',
    'frontend/src',
    'frontend/public',
  ].includes(entry)),
);
const PRODUCTION_BUILD_INPUT_PREFIXES = Object.freeze([
  'gradle/',
  'api-server/src/main/',
  'business-app/src/main/',
  'business-core/src/main/',
  'foundation/src/main/',
  'frontend/src/',
  'frontend/public/',
]);
const PRIVATE_BUILD_INPUT_SEGMENTS = new Set([
  '.auth',
  '.aws',
  '.git',
  '.gnupg',
  '.gradle',
  '.kube',
  '.next',
  '.ssh',
  'build',
  'coverage',
  'logs',
  'node_modules',
  'playwright-report',
  'storage',
  'test-results',
  'test-uploads',
  'tmp',
]);
const PRIVATE_BUILD_INPUT_FILE = /(?:^|\/)\.env(?:\.|$)|\.(?:key|pem|p12|pfx|jks|keystore)$/i;
const PRIVATE_LOCAL_SPRING_CONFIG_FILE = /(?:^|\/)application-local\.(?:properties|ya?ml)$/i;

function normalizeBuildInputPath(value) {
  if (typeof value !== 'string' || value.length === 0) throw new Error('unsafe build input path');
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
  const segments = normalized.split('/');
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)
    || segments.some((segment) => segment === '' || segment === '..')) {
    throw new Error(`unsafe build input path '${value}'`);
  }
  return normalized;
}

export function selectProductionBuildInputPaths(candidates) {
  if (!Array.isArray(candidates)) throw new Error('build input candidates must be an array');
  const selected = new Set();
  for (const candidate of candidates) {
    const normalized = normalizeBuildInputPath(candidate);
    const segments = normalized.split('/');
    if (segments.some((segment) => PRIVATE_BUILD_INPUT_SEGMENTS.has(segment))) continue;
    if (PRIVATE_BUILD_INPUT_FILE.test(normalized)
      || PRIVATE_LOCAL_SPRING_CONFIG_FILE.test(normalized)) continue;
    if (PRODUCTION_BUILD_INPUT_EXACT_FILES.has(normalized)
      || PRODUCTION_BUILD_INPUT_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
      selected.add(normalized);
    }
  }
  return [...selected].sort();
}

const DIRTY_BUILD_INPUT_STATUSES = new Set(['A', 'D', 'M', 'T', 'U']);
const SHA256_HEX = /^[a-f0-9]{64}$/;

function selectedFileHash(readSelectedFile, relativePath) {
  const value = readSelectedFile(relativePath);
  if (typeof value !== 'string' && !Buffer.isBuffer(value)) {
    throw new Error('dirty build input reader must return a string or Buffer');
  }
  return sha256(value);
}

function trackedDirtyBuildInputRecords(trackedChanges, readSelectedFile) {
  const selectedPaths = new Set(selectProductionBuildInputPaths(
    trackedChanges.map((change) => change?.path),
  ));
  return trackedChanges.flatMap((change) => {
    const relativePath = normalizeBuildInputPath(change?.path);
    if (!selectedPaths.has(relativePath)) return [];
    const status = change?.status;
    if (!DIRTY_BUILD_INPUT_STATUSES.has(status)) {
      throw new Error(`unsupported dirty build input status '${status}'`);
    }
    return [{
      kind: 'tracked',
      path: relativePath,
      status,
      contentSha256: status === 'D' ? null : selectedFileHash(readSelectedFile, relativePath),
    }];
  });
}

function untrackedDirtyBuildInputRecords(untrackedPaths, readSelectedFile) {
  return selectProductionBuildInputPaths(untrackedPaths).map((relativePath) => ({
    kind: 'untracked',
    path: relativePath,
    status: 'A',
    contentSha256: selectedFileHash(readSelectedFile, relativePath),
  }));
}

function compareDirtyBuildInputRecords(left, right) {
  const leftKey = `${left.path}\0${left.kind}`;
  const rightKey = `${right.path}\0${right.kind}`;
  if (leftKey < rightKey) return -1;
  if (leftKey > rightKey) return 1;
  return 0;
}

function assertDirtyBuildInputArguments(trackedChanges, untrackedPaths, readSelectedFile) {
  if (!Array.isArray(trackedChanges) || !Array.isArray(untrackedPaths)) {
    throw new Error('dirty build input candidates must be arrays');
  }
  if (typeof readSelectedFile !== 'function') {
    throw new Error('dirty build input reader is required');
  }
}

export function createDirtyBuildInputFingerprint({
  trackedChanges,
  untrackedPaths,
  readSelectedFile,
}) {
  assertDirtyBuildInputArguments(trackedChanges, untrackedPaths, readSelectedFile);
  const records = [
    ...trackedDirtyBuildInputRecords(trackedChanges, readSelectedFile),
    ...untrackedDirtyBuildInputRecords(untrackedPaths, readSelectedFile),
  ];
  const paths = new Set(records.map(({ path: relativePath }) => relativePath));
  if (paths.size !== records.length) throw new Error('duplicate dirty build input path');
  if (records.length === 0) return null;
  records.sort(compareDirtyBuildInputRecords);
  return sha256(stableJson(records));
}

export function requireDirtyBuildInputFingerprint(calculate) {
  try {
    const fingerprint = calculate();
    if (fingerprint !== null && !SHA256_HEX.test(fingerprint)) throw new Error('invalid fingerprint');
    return fingerprint;
  } catch {
    throw new Error('baseline execution preflight could not fingerprint dirty production build inputs');
  }
}

export function assertStableDirtyBuildInputFingerprint(startFingerprint, endFingerprint) {
  const isFingerprint = (value) => value === null || (
    typeof value === 'string' && SHA256_HEX.test(value)
  );
  if (!isFingerprint(startFingerprint)
    || !isFingerprint(endFingerprint)
    || startFingerprint !== endFingerprint) {
    throw new Error('dirty production build inputs changed during baseline execution');
  }
}

export function assertStableBuildInputSnapshot(startHash, endHash) {
  if (typeof startHash !== 'string' || startHash.length === 0
    || typeof endHash !== 'string' || endHash.length === 0
    || startHash !== endHash) {
    throw new Error('production build inputs changed during baseline execution');
  }
}

export function sha256(value) {
  const source = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'utf8');
  return createHash('sha256').update(source).digest('hex');
}

/**
 * Privacy-safe categories for browser-side 4xx diagnostics.
 *
 * The classifier may inspect a canonical pathname in memory, but artifacts keep
 * only these closed values and counts. Query strings, response bodies and raw
 * URLs never cross the recorder boundary.
 */
export const SAFE_REQUEST_CATEGORIES = Object.freeze({
  AUTH_ME_BOOTSTRAP_401: 'auth-me-bootstrap-401',
  INVALID_CREDENTIALS_401: 'invalid-credentials-401',
  UNEXPECTED_HTTP_4XX: 'unexpected-http-4xx',
});

const AUTH_LOGIN_STEP_IDS = new Set(['invalid-credentials', 'successful-login']);

export function classifyClientErrorResponse({
  scenarioId,
  stepId,
  method,
  pathname,
  status,
} = {}) {
  if (!Number.isInteger(status) || status < 400 || status >= 500) return null;

  if (scenarioId === 'auth-login'
    && AUTH_LOGIN_STEP_IDS.has(stepId)
    && method === 'GET'
    && pathname === '/api/v1/auth/me'
    && status === 401) {
    return SAFE_REQUEST_CATEGORIES.AUTH_ME_BOOTSTRAP_401;
  }

  if (scenarioId === 'auth-login'
    && stepId === 'invalid-credentials'
    && method === 'POST'
    && pathname === '/api/auth/login'
    && status === 401) {
    return SAFE_REQUEST_CATEGORIES.INVALID_CREDENTIALS_401;
  }

  return SAFE_REQUEST_CATEGORIES.UNEXPECTED_HTTP_4XX;
}

export function createSafeRequestCategoryCounts() {
  return Object.fromEntries(
    Object.values(SAFE_REQUEST_CATEGORIES).map((category) => [category, 0]),
  );
}

/**
 * Keeps the synthetic negative-login probe inside the public login request
 * contract so the server reaches authentication semantics (401) instead of
 * short-circuiting on request validation (400).
 */
export function validateInvalidCredentialsProbeFixture({ actorValue, secretValue } = {}) {
  const actorValid = typeof actorValue === 'string'
    && actorValue.length >= 5
    && actorValue.length <= 20
    && /^[A-Za-z0-9]+$/.test(actorValue);
  const secretValid = typeof secretValue === 'string'
    && secretValue.length >= 8
    && secretValue.length <= 20
    && /[A-Za-z]/.test(secretValue)
    && /[0-9]/.test(secretValue)
    && /[!@#$%^*+=-]/.test(secretValue);
  if (!actorValid || !secretValid) {
    throw new Error('invalid-credentials probe fixture violates the login request contract');
  }
  return { actorValue, secretValue };
}

/**
 * Orders first-use preference preparation without inspecting private auth
 * storage. The adapter must first establish the target origin, then remove
 * only the non-sensitive onboarding preference from that origin.
 */
export async function prepareFirstUseOnboardingPreference({
  establishSameOriginStorage,
  clearSeenPreference,
} = {}) {
  if (typeof establishSameOriginStorage !== 'function' || typeof clearSeenPreference !== 'function') {
    throw new Error('first-use onboarding preference preparation is incomplete');
  }
  await establishSameOriginStorage();
  await clearSeenPreference();
}

const NOT_EXECUTED_TASK_REASON_BY_ID = Object.freeze({
  'successful-login-executed': 'ephemeral-login-credentials-required',
  'role-status-mutation-readback-executed': 'approved-synthetic-user-mutation-target-required',
  'synthetic-role-status-rollback-complete': 'approved-synthetic-user-mutation-target-required',
  'cross-role-created-answer-readback': 'approved-synthetic-faq-mutation-target-required',
  'faq-authoritative-save-readback': 'approved-synthetic-faq-mutation-target-required',
  'admin-created-faq-readback': 'approved-synthetic-faq-mutation-target-required',
  'single-deploy-authoritative-readback': 'approved-synthetic-board-deploy-target-required',
});

export function createNotExecutedTaskEvidence({ id, reasonCode } = {}) {
  if (!Object.hasOwn(NOT_EXECUTED_TASK_REASON_BY_ID, id)
    || NOT_EXECUTED_TASK_REASON_BY_ID[id] !== reasonCode) {
    throw new Error('unsupported not-executed task evidence');
  }
  return { id, status: 'not-executed', reasonCode };
}

export const SYNTHETIC_MUTATION_NAMESPACE = 'uiq-baseline-mutation-v1';

const SAFE_SYNTHETIC_MUTATION_FAILURE_REASONS = new Set([
  'synthetic-board-cleanup-failed',
  'synthetic-board-deploy-readback-failed',
  'synthetic-board-menu-readback-failed',
  'synthetic-board-readback-failed',
  'synthetic-faq-admin-readback-failed',
  'synthetic-faq-authoritative-readback-failed',
  'synthetic-faq-cleanup-failed',
  'synthetic-faq-create-failed',
  'synthetic-faq-create-readback-mismatch',
  'synthetic-faq-detail-readback-failed',
  'synthetic-faq-detail-readback-mismatch',
  'synthetic-faq-list-readback-failed',
  'synthetic-faq-user-answer-readback-failed',
  'synthetic-faq-user-readback-failed',
  'synthetic-mutation-api-failed',
  'synthetic-mutation-cleanup-failed',
  'synthetic-mutation-ui-readback-failed',
  'synthetic-user-cleanup-failed',
  'synthetic-user-create-failed',
  'synthetic-user-create-readback-mismatch',
  'synthetic-user-error-feedback-not-observed',
  'synthetic-user-error-injection-count-mismatch',
  'synthetic-user-readback-failed',
  'synthetic-user-status-readback-failed',
]);

export function classifySyntheticMutationFailureReason(error, fallbackReasonCode) {
  return SAFE_SYNTHETIC_MUTATION_FAILURE_REASONS.has(error?.code)
    ? error.code
    : fallbackReasonCode;
}

export function classifySyntheticRichTextReadback(input = {}) {
  const keys = input && typeof input === 'object' ? Object.keys(input).sort() : [];
  if (!exactMembers(keys, ['expectedPlainText', 'observedValue'])
    || typeof input.expectedPlainText !== 'string'
    || typeof input.observedValue !== 'string'
    || input.expectedPlainText.length === 0
    || input.expectedPlainText.length > 512
    || input.observedValue.length > 4_000) {
    return 'not-matched';
  }
  if (input.observedValue === input.expectedPlainText) return 'semantic-plain-text';
  const canonicalText = input.expectedPlainText
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  return input.observedValue === `<p>${canonicalText}</p>`
    ? 'canonical-tiptap-html'
    : 'not-matched';
}

const EXECUTED_SYNTHETIC_MUTATION_TASK_IDS = new Set([
  'role-status-mutation-readback-executed',
  'synthetic-role-status-rollback-complete',
  'cross-role-created-answer-readback',
  'faq-authoritative-save-readback',
  'admin-created-faq-readback',
  'single-deploy-authoritative-readback',
]);
const EXECUTED_SYNTHETIC_MUTATION_INPUT_KEYS = Object.freeze([
  'activeResidueCount',
  'authoritativeReadback',
  'caseId',
  'cleanupReadback',
  'id',
  'mutationObserved',
  'rollbackReadback',
  'syntheticNamespace',
]);
const EXECUTED_SYNTHETIC_MUTATION_EVIDENCE_KEYS = Object.freeze([
  'activeResidueCount',
  'authoritativeReadback',
  'caseId',
  'cleanupReadback',
  'id',
  'mutationObserved',
  'rollbackReadback',
  'status',
  'syntheticNamespace',
]);

function isExecutedSyntheticMutationEvidence(entry) {
  const keys = entry && typeof entry === 'object' ? Object.keys(entry).sort() : [];
  return exactMembers(keys, EXECUTED_SYNTHETIC_MUTATION_EVIDENCE_KEYS)
    && EXECUTED_SYNTHETIC_MUTATION_TASK_IDS.has(entry.id)
    && /^uiq-[a-f0-9]{20}$/.test(entry.caseId)
    && entry.status === 'executed'
    && entry.syntheticNamespace === SYNTHETIC_MUTATION_NAMESPACE
    && entry.mutationObserved === 'observed'
    && entry.authoritativeReadback === 'observed'
    && entry.rollbackReadback === 'observed'
    && entry.cleanupReadback === 'zero-active-residue'
    && entry.activeResidueCount === 0;
}

/**
 * Creates a closed, privacy-safe record only after the real product mutation,
 * authoritative readback and cleanup have all completed. Actual synthetic
 * identifiers and values deliberately have no field in this schema.
 */
export function createExecutedSyntheticMutationEvidence(input = {}) {
  const keys = input && typeof input === 'object' ? Object.keys(input).sort() : [];
  if (!exactMembers(keys, EXECUTED_SYNTHETIC_MUTATION_INPUT_KEYS)
    || !EXECUTED_SYNTHETIC_MUTATION_TASK_IDS.has(input.id)
    || !/^uiq-[a-f0-9]{20}$/.test(input.caseId)
    || input.syntheticNamespace !== SYNTHETIC_MUTATION_NAMESPACE
    || input.mutationObserved !== 'observed'
    || input.authoritativeReadback !== 'observed'
    || input.rollbackReadback !== 'observed'
    || input.cleanupReadback !== 'zero-active-residue'
    || input.activeResidueCount !== 0) {
    throw new Error('unsupported synthetic mutation evidence');
  }
  return { ...input, status: 'executed' };
}

/**
 * Ensures cleanup and its authoritative residue readback run even when the
 * product exercise fails. Cleanup failure takes precedence because a leaked
 * mutation makes the isolated test environment unsafe for subsequent cases.
 */
export async function runSyntheticMutationLifecycle({
  execute,
  cleanup,
  readActiveResidueCount,
} = {}) {
  if (typeof execute !== 'function'
    || typeof cleanup !== 'function'
    || typeof readActiveResidueCount !== 'function') {
    throw new TypeError('synthetic mutation lifecycle is incomplete');
  }

  let result;
  let executionFailure;
  try {
    result = await execute();
  } catch (error) {
    executionFailure = error;
  }

  try {
    await cleanup();
    const activeResidueCount = await readActiveResidueCount();
    if (activeResidueCount !== 0) throw new Error('non-zero active residue');
  } catch {
    const cleanupFailure = new Error('synthetic mutation cleanup did not reach zero active residue');
    cleanupFailure.code = 'synthetic-mutation-cleanup-failed';
    throw cleanupFailure;
  }

  if (executionFailure) throw executionFailure;
  return result;
}

function exactMutationStatePlan(scenarioId, expectedStateCases) {
  const expectedJourney = EXPECTED_SCENARIO_JOURNEYS.get(scenarioId);
  if (!expectedJourney
    || !Array.isArray(expectedStateCases)
    || expectedStateCases.length !== expectedJourney.steps.length * 6
    || expectedStateCases.some((stateCase) => stateCase?.scenarioId !== scenarioId)) {
    return false;
  }

  const expectedDimensions = EXPECTED_BRAND_THEMES.flatMap((brandTheme) => (
    EXPECTED_COLOR_MODES.flatMap((colorMode) => (
      EXPECTED_VIEWPORTS.map((viewportId) => `${brandTheme}--${colorMode}--${viewportId}`)
    ))
  ));
  const caseIds = expectedStateCases.map(({ caseId }) => caseId);
  if (caseIds.some((caseId) => typeof caseId !== 'string' || caseId.length === 0)
    || new Set(caseIds).size !== caseIds.length) {
    return false;
  }

  return expectedJourney.steps.every((stepId) => {
    const stepCases = expectedStateCases.filter((stateCase) => stateCase?.stepId === stepId);
    const dimensions = stepCases.map(({ identity }) => (
      `${identity?.brandTheme}--${identity?.colorMode}--${identity?.viewport}`
    ));
    return stepCases.length === 6
      && exactMembers(dimensions, expectedDimensions)
      && stepCases.every((stateCase) => {
        const { identity } = stateCase;
        if (!identity || typeof identity !== 'object') return false;
        const expectedRenderCaseId = `${scenarioId}--${identity.brandTheme}--${identity.colorMode}--${identity.viewport}`;
        return stateCase.renderCaseId === expectedRenderCaseId
          && stateCase.viewport?.id === identity.viewport
          && (stateCase.requiredTaskEvidenceId === null
            || EXECUTED_SYNTHETIC_MUTATION_TASK_IDS.has(stateCase.requiredTaskEvidenceId))
          && stateCase.caseId === `uiq-${sha256(stableJson(identity)).slice(0, 20)}`;
      });
  });
}

export function summarizeAuthoritativeTaskEvidence({
  scenarioId,
  caseResults,
  expectedStateCases,
} = {}) {
  if (!Array.isArray(caseResults)
    || !exactMutationStatePlan(scenarioId, expectedStateCases)
    || caseResults.length !== expectedStateCases.length) {
    return false;
  }

  const resultByCaseId = new Map();
  for (const result of caseResults) {
    if (typeof result?.caseId !== 'string'
      || resultByCaseId.has(result.caseId)
      || !Array.isArray(result.taskEvidence)) {
      return false;
    }
    resultByCaseId.set(result.caseId, result);
  }

  return expectedStateCases.every((stateCase) => {
    const result = resultByCaseId.get(stateCase.caseId);
    if (!result || stableJson(result.identity) !== stableJson(stateCase.identity)) return false;
    const expectedTaskId = stateCase.requiredTaskEvidenceId;
    if (!expectedTaskId) return result.taskEvidence.length === 0;
    return result.taskEvidence.length === 1
      && result.taskEvidence[0].id === expectedTaskId
      && result.taskEvidence[0].caseId === stateCase.caseId
      && isExecutedSyntheticMutationEvidence(result.taskEvidence[0]);
  });
}

export function selectSyntheticMutationDiagnosticCases(stateCases) {
  if (!Array.isArray(stateCases)) {
    throw new Error('synthetic mutation diagnostic population is incomplete');
  }
  return [...EXECUTED_SYNTHETIC_MUTATION_TASK_IDS].map((requiredTaskEvidenceId) => {
    const matches = stateCases.filter((stateCase) => (
      stateCase?.requiredTaskEvidenceId === requiredTaskEvidenceId
    ));
    if (matches.length !== 6) {
      throw new Error('synthetic mutation diagnostic population is incomplete');
    }
    return matches[0];
  });
}

export async function pollForExpectedValue({
  readValue,
  expectedValue,
  maxAttempts = 100,
  intervalMs = 100,
  wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
} = {}) {
  if (typeof readValue !== 'function' || typeof wait !== 'function') {
    throw new TypeError('bounded value polling requires readValue and wait functions');
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
    throw new RangeError('maxAttempts must be a positive integer');
  }
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new RangeError('intervalMs must be a finite non-negative number');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (Object.is(await readValue(), expectedValue)) return true;
    } catch {
      // A hydration/effect race may make an individual locator read transiently fail.
      // The bounded attempt count still guarantees deterministic termination.
    }
    if (attempt < maxAttempts) await wait(intervalMs);
  }
  return false;
}

function exactMembers(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && new Set(actual).size === actual.length
    && expected.every((entry) => actual.includes(entry));
}

function requireNonEmptyArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
}

const EXPECTED_UI_QUALITY_POPULATION = Object.freeze({
  scenarios: 8,
  renderCases: 48,
  stateCases: 96,
  performanceCases: 48,
});
const EXPECTED_BRAND_THEMES = Object.freeze(['current-default']);
const EXPECTED_COLOR_MODES = Object.freeze(['light', 'dark']);
const EXPECTED_VIEWPORTS = Object.freeze(['mobile-320', 'tablet-768', 'desktop-1280']);
const EXPECTED_SCENARIO_JOURNEYS = new Map([
  ['auth-login', {
    steps: ['invalid-credentials', 'successful-login'],
    performanceTargetStepId: 'successful-login',
  }],
  ['admin-shell-hub', {
    steps: ['hub-ready'],
    performanceTargetStepId: 'hub-ready',
  }],
  ['dense-user-logs', {
    steps: ['dense-list-ready', 'filtered-zero', 'server-error'],
    performanceTargetStepId: 'dense-list-ready',
  }],
  ['user-management-hub', {
    steps: ['user-hub-ready', 'mutation-error'],
    performanceTargetStepId: 'user-hub-ready',
  }],
  ['board-article-composer', {
    steps: ['composer-ready', 'draft-restoration'],
    performanceTargetStepId: 'composer-ready',
  }],
  ['faq-admin-user-lifecycle', {
    steps: ['admin-compose-faq', 'admin-faq-readback', 'user-faq-search'],
    performanceTargetStepId: 'user-faq-search',
  }],
  ['board-maker-wizard', {
    steps: ['wizard-ready', 'wizard-validation'],
    performanceTargetStepId: 'wizard-ready',
  }],
  ['first-use-onboarding', {
    steps: ['onboarding-first-use'],
    performanceTargetStepId: 'onboarding-first-use',
  }],
]);

/**
 * Converts the manifest into an executable, closed population.
 *
 * A render case is one scenario × theme × mode × viewport. A state case expands
 * each render case by every declared journey step. The latter is the actual axe
 * and state-preparation population; silently visiting only one step would turn a
 * 48-case route smoke into a false baseline instead of the current 96 state cases.
 */
export function buildExecutionPlan(manifest) {
  if (!manifest || typeof manifest !== 'object') throw new Error('manifest is required');
  requireNonEmptyArray(manifest.scenarios, 'manifest.scenarios');
  if (manifest.scenarios.length !== EXPECTED_UI_QUALITY_POPULATION.scenarios) {
    throw new Error(`scenario population must contain exactly ${EXPECTED_UI_QUALITY_POPULATION.scenarios} entries; received ${manifest.scenarios.length}`);
  }

  const globalThemes = (manifest.dimensions?.brandThemes ?? []).map(({ id }) => id);
  const globalModes = manifest.dimensions?.colorModes ?? [];
  const globalViewports = (manifest.dimensions?.viewports ?? []).map(({ id }) => id);
  requireNonEmptyArray(globalThemes, 'brand theme population for the exact frozen baseline');
  requireNonEmptyArray(globalModes, 'color mode population for the exact frozen baseline');
  requireNonEmptyArray(globalViewports, 'viewport population for the exact frozen baseline');
  if (!exactMembers(globalThemes, EXPECTED_BRAND_THEMES)) {
    throw new Error('brand theme population must exactly match the frozen baseline');
  }
  if (!exactMembers(globalModes, EXPECTED_COLOR_MODES)) {
    throw new Error('color mode population must exactly match the frozen baseline');
  }
  if (!exactMembers(globalViewports, EXPECTED_VIEWPORTS)) {
    throw new Error('viewport population must exactly match the frozen baseline');
  }

  const viewportById = new Map(
    (manifest.dimensions?.viewports ?? []).map((viewport) => [viewport.id, viewport]),
  );
  const scenarioIds = new Set();
  const declaredMutationTaskEvidenceIds = new Set();
  const renderCases = [];
  const stateCases = [];

  for (const scenario of manifest.scenarios) {
    if (scenarioIds.has(scenario.id)) throw new Error(`duplicate scenario '${scenario.id}'`);
    scenarioIds.add(scenario.id);
    requireNonEmptyArray(scenario.journeySteps, `scenario '${scenario.id}' journeySteps`);
    const expectedJourney = EXPECTED_SCENARIO_JOURNEYS.get(scenario.id);
    if (!expectedJourney) throw new Error(`scenario '${scenario.id}' is outside the frozen population`);
    const journeyStepIds = scenario.journeySteps.map(({ id }) => id);
    if (new Set(journeyStepIds).size !== journeyStepIds.length) {
      throw new Error(`duplicate journey step in scenario '${scenario.id}'`);
    }
    if (!exactMembers(journeyStepIds, expectedJourney.steps)) {
      throw new Error(`scenario '${scenario.id}' journey population must exactly match the frozen baseline`);
    }
    if (scenario.performanceTargetStepId !== expectedJourney.performanceTargetStepId) {
      throw new Error(`scenario '${scenario.id}' performance target must exactly match the frozen baseline`);
    }
    for (const step of scenario.journeySteps) {
      const requiredTaskEvidenceId = step.requiredTaskEvidenceId ?? null;
      if (requiredTaskEvidenceId !== null) {
        if (!EXECUTED_SYNTHETIC_MUTATION_TASK_IDS.has(requiredTaskEvidenceId)) {
          throw new Error(`scenario '${scenario.id}' has an unsupported mutation task evidence requirement`);
        }
        if (declaredMutationTaskEvidenceIds.has(requiredTaskEvidenceId)) {
          throw new Error(`scenario '${scenario.id}' duplicates a mutation task evidence requirement`);
        }
        declaredMutationTaskEvidenceIds.add(requiredTaskEvidenceId);
      }
    }

    if (!exactMembers(scenario.renderMatrix?.brandThemes, globalThemes)
      || !exactMembers(scenario.renderMatrix?.colorModes, globalModes)
      || !exactMembers(scenario.renderMatrix?.viewports, globalViewports)) {
      throw new Error(`scenario '${scenario.id}' render matrix must exactly match global dimensions`);
    }

    for (const brandTheme of scenario.renderMatrix.brandThemes) {
      for (const colorMode of scenario.renderMatrix.colorModes) {
        for (const viewportId of scenario.renderMatrix.viewports) {
          const viewport = viewportById.get(viewportId);
          if (!viewport) throw new Error(`unknown viewport '${viewportId}'`);
          const renderCase = {
            renderCaseId: `${scenario.id}--${brandTheme}--${colorMode}--${viewportId}`,
            scenarioId: scenario.id,
            brandTheme,
            colorMode,
            viewport: { id: viewport.id, width: viewport.width, height: viewport.height },
          };
          renderCases.push(renderCase);

          for (const step of scenario.journeySteps) {
            const identity = {
              route: step.route,
              role: step.role,
              state: {
                data: step.state.data,
                interaction: step.state.interaction,
                network: step.state.network,
              },
              brandTheme,
              colorMode,
              viewport: viewport.id,
            };
            stateCases.push({
              caseId: `uiq-${sha256(stableJson(identity)).slice(0, 20)}`,
              renderCaseId: renderCase.renderCaseId,
              scenarioId: scenario.id,
              stepId: step.id,
              requiredTaskEvidenceId: step.requiredTaskEvidenceId ?? null,
              queryTemplate: step.queryTemplate ?? null,
              identity,
              viewport: { id: viewport.id, width: viewport.width, height: viewport.height },
            });
          }
        }
      }
    }
  }

  const duplicateCaseIds = stateCases.length - new Set(stateCases.map(({ caseId }) => caseId)).size;
  if (duplicateCaseIds > 0) throw new Error(`execution plan contains ${duplicateCaseIds} duplicate case IDs`);
  if (!exactMembers([...scenarioIds], [...EXPECTED_SCENARIO_JOURNEYS.keys()])) {
    throw new Error('scenario population must exactly match the frozen baseline archetypes');
  }
  if (!exactMembers(
    [...declaredMutationTaskEvidenceIds],
    [...EXECUTED_SYNTHETIC_MUTATION_TASK_IDS],
  )) {
    throw new Error('mutation task evidence population must exactly match the closed baseline contract');
  }
  if (renderCases.length !== EXPECTED_UI_QUALITY_POPULATION.renderCases) {
    throw new Error(`render case population must contain exactly ${EXPECTED_UI_QUALITY_POPULATION.renderCases} entries`);
  }
  if (stateCases.length !== EXPECTED_UI_QUALITY_POPULATION.stateCases) {
    throw new Error(`state case population must contain exactly ${EXPECTED_UI_QUALITY_POPULATION.stateCases} entries`);
  }
  const performanceCases = renderCases.map((renderCase) => {
    const scenario = manifest.scenarios.find(({ id }) => id === renderCase.scenarioId);
    const target = stateCases.find((stateCase) => (
      stateCase.renderCaseId === renderCase.renderCaseId
      && stateCase.stepId === scenario.performanceTargetStepId
    ));
    if (!target) throw new Error(`missing performance case for '${renderCase.renderCaseId}'`);
    return target;
  });
  if (performanceCases.length !== EXPECTED_UI_QUALITY_POPULATION.performanceCases
    || new Set(performanceCases.map(({ renderCaseId }) => renderCaseId)).size
      !== EXPECTED_UI_QUALITY_POPULATION.performanceCases) {
    throw new Error(`performance case population must contain exactly ${EXPECTED_UI_QUALITY_POPULATION.performanceCases} entries`);
  }

  return {
    scenarioCount: manifest.scenarios.length,
    renderCases,
    stateCases,
    performanceCases,
  };
}

const SAFE_LCP_TAGS = new Set([
  'a',
  'article',
  'blockquote',
  'button',
  'canvas',
  'div',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'img',
  'li',
  'main',
  'p',
  'picture',
  'section',
  'span',
  'svg',
  'video',
]);
const SAFE_LCP_ROLES = new Set([
  'article',
  'banner',
  'button',
  'heading',
  'img',
  'link',
  'main',
  'none',
  'presentation',
  'region',
  'status',
]);
const SAFE_LCP_RESOURCE_SHAPES = Object.freeze({
  none: Object.freeze({ resourceOrigin: 'none', resourceRouteTemplate: null }),
  'framework-static': Object.freeze({ resourceOrigin: 'same-origin', resourceRouteTemplate: '/_next/static/:asset' }),
  'framework-image': Object.freeze({ resourceOrigin: 'same-origin', resourceRouteTemplate: '/_next/image' }),
  'public-static': Object.freeze({ resourceOrigin: 'same-origin', resourceRouteTemplate: '/:public-asset' }),
  'api-resource': Object.freeze({ resourceOrigin: 'same-origin', resourceRouteTemplate: '/api/:resource' }),
  'application-resource': Object.freeze({ resourceOrigin: 'same-origin', resourceRouteTemplate: '/:resource' }),
  'external-resource': Object.freeze({ resourceOrigin: 'cross-origin', resourceRouteTemplate: null }),
  'embedded-resource': Object.freeze({ resourceOrigin: 'non-http', resourceRouteTemplate: null }),
  'invalid-resource': Object.freeze({ resourceOrigin: 'invalid', resourceRouteTemplate: null }),
});
const SAFE_LCP_ARTIFACT_KEYS = new Set([
  'tag',
  'role',
  'resourceOrigin',
  'resourceCategory',
  'resourceRouteTemplate',
  'size',
]);
const FORBIDDEN_RAW_LCP_ARTIFACT_KEYS = new Set([
  'lcpelement',
  'lcpelementhtml',
  'lcpelementrole',
  'lcpelementtag',
  'lcpelementtext',
  'lcpfilename',
  'lcphostname',
  'lcplocator',
  'lcppath',
  'lcpresource',
  'lcpresourcepath',
  'lcpresourceurl',
  'lcpselector',
  'lcpurl',
]);

function sameOriginResourceCategory(pathname) {
  if (/^\/_next\/static(?:\/|$)/.test(pathname)) return 'framework-static';
  if (pathname === '/_next/image') return 'framework-image';
  if (/^\/(?:assets?|images?|img|fonts?|icons?|media|public)(?:\/|$)/.test(pathname)) return 'public-static';
  if (/^\/api(?:\/|$)/.test(pathname)) return 'api-resource';
  return 'application-resource';
}

/**
 * Reduce transient LCP DOM/resource data to a closed, non-identifying artifact shape.
 * The raw URL is used only for same-origin/category classification and is never returned.
 */
export function sanitizeLcpObservation(value, baseOrigin) {
  if (!value || typeof value !== 'object') return null;

  let base;
  try {
    base = new URL(baseOrigin);
  } catch {
    throw new TypeError('LCP sanitization requires a valid base origin');
  }
  if (!['http:', 'https:'].includes(base.protocol)) {
    throw new TypeError('LCP sanitization base origin must use http or https');
  }

  const rawTag = typeof value.tag === 'string' ? value.tag.trim().toLowerCase() : '';
  const rawRole = typeof value.role === 'string' ? value.role.trim().toLowerCase() : '';
  let resourceCategory = 'none';

  if (typeof value.resourceUrl === 'string' && value.resourceUrl.trim() !== '') {
    try {
      const resource = new URL(value.resourceUrl, base);
      if (!['http:', 'https:'].includes(resource.protocol)) {
        resourceCategory = 'embedded-resource';
      } else if (resource.origin !== base.origin) {
        resourceCategory = 'external-resource';
      } else {
        resourceCategory = sameOriginResourceCategory(resource.pathname);
      }
    } catch {
      resourceCategory = 'invalid-resource';
    }
  }

  const resourceShape = SAFE_LCP_RESOURCE_SHAPES[resourceCategory];
  return {
    tag: SAFE_LCP_TAGS.has(rawTag) ? rawTag : 'unknown',
    role: SAFE_LCP_ROLES.has(rawRole) ? rawRole : null,
    resourceOrigin: resourceShape.resourceOrigin,
    resourceCategory,
    resourceRouteTemplate: resourceShape.resourceRouteTemplate,
    size: Number.isFinite(value.size) && value.size >= 0 ? Math.round(value.size) : null,
  };
}

function assertSafeLcpArtifact(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`unsafe LCP artifact shape at ${path}`);
  }
  for (const key of Object.keys(value)) {
    if (!SAFE_LCP_ARTIFACT_KEYS.has(key)) {
      throw new Error(`unsafe LCP artifact field at ${path}.${key}`);
    }
  }
  for (const key of SAFE_LCP_ARTIFACT_KEYS) {
    if (!(key in value)) throw new Error(`unsafe LCP artifact shape at ${path}.${key}`);
  }
  if (value.tag !== 'unknown' && !SAFE_LCP_TAGS.has(value.tag)) {
    throw new Error(`unsafe LCP artifact tag at ${path}.tag`);
  }
  if (value.role !== null && !SAFE_LCP_ROLES.has(value.role)) {
    throw new Error(`unsafe LCP artifact role at ${path}.role`);
  }
  const expectedResourceShape = SAFE_LCP_RESOURCE_SHAPES[value.resourceCategory];
  if (!expectedResourceShape
    || value.resourceOrigin !== expectedResourceShape.resourceOrigin
    || value.resourceRouteTemplate !== expectedResourceShape.resourceRouteTemplate) {
    throw new Error(`unsafe LCP artifact resource classification at ${path}`);
  }
  if (value.size !== null
    && (!Number.isSafeInteger(value.size) || value.size < 0)) {
    throw new Error(`unsafe LCP artifact size at ${path}.size`);
  }
}

const CREDENTIAL_VALUE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/i,
  /\bBasic\s+[A-Za-z0-9+/=]+/i,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/,
  /\b(?:password|passwd|pwd|token|cookie|authorization)\s*[:=]\s*[^\s,;]+/i,
];

/** Fail closed before any JSON artifact reaches disk. */
export function assertArtifactSafe(value, forbiddenArtifactKeys, label = 'artifact') {
  const forbiddenKeys = new Set((forbiddenArtifactKeys ?? []).map(normalizeKey));

  function visit(current, path) {
    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    if (current && typeof current === 'object') {
      for (const [key, child] of Object.entries(current)) {
        const normalizedKey = normalizeKey(key);
        if (FORBIDDEN_RAW_LCP_ARTIFACT_KEYS.has(normalizedKey)) {
          throw new Error(`unsafe LCP artifact field at ${path}.${key}`);
        }
        if (forbiddenKeys.has(normalizedKey)) {
          throw new Error(`forbidden artifact key at ${path}.${key}`);
        }
        if (normalizedKey === 'lcp' && child !== null) {
          assertSafeLcpArtifact(child, `${path}.${key}`);
        }
        visit(child, `${path}.${key}`);
      }
      return;
    }
    if (typeof current === 'string' && CREDENTIAL_VALUE_PATTERNS.some((pattern) => pattern.test(current))) {
      throw new Error(`credential-like artifact value at ${path}`);
    }
  }

  visit(value, label);
  return value;
}

export function classifyEvidenceDurability({ ignored, repositoryTracked }) {
  if (ignored) {
    return {
      status: 'ephemeral-ignored',
      eligibleForMeasuredPromotion: false,
      reasonCode: 'ignored-artifact-not-durable',
    };
  }
  if (!repositoryTracked) {
    return {
      status: 'untracked-not-durable',
      eligibleForMeasuredPromotion: false,
      reasonCode: 'artifact-not-versioned',
    };
  }
  return {
    status: 'repository-tracked',
    eligibleForMeasuredPromotion: true,
    reasonCode: 'durable-versioned-artifact',
  };
}

export function classifyAutomatedCaseOutcome({
  blockedPrerequisite = false,
  runtimeInvalid = false,
  responsiveGeometryStable = true,
  notExecutedTaskCount = 0,
  failedAssertionCount = 0,
  expectedRouteReached = true,
  axeViolationCount = 0,
  horizontalOverflowPx = 0,
  colorModeApplied = true,
} = {}) {
  if (runtimeInvalid) {
    return {
      status: 'invalid-run',
      outcome: 'automated-observation-invalid',
      findingCodes: ['unexpected-runtime-signal'],
    };
  }
  if (!responsiveGeometryStable) {
    return {
      status: 'invalid-run',
      outcome: 'automated-observation-invalid',
      findingCodes: ['responsive-geometry-not-stable'],
    };
  }
  if (blockedPrerequisite || notExecutedTaskCount > 0) {
    return {
      status: 'blocked-prerequisite',
      outcome: 'automated-observation-incomplete',
      findingCodes: ['blocked-prerequisite'],
    };
  }

  const findingCodes = [];
  if (axeViolationCount > 0) findingCodes.push('automated-axe-violation');
  if (failedAssertionCount > 0) findingCodes.push('automated-state-contract-failed');
  if (!colorModeApplied) findingCodes.push('color-mode-not-applied');
  if (horizontalOverflowPx > 1) findingCodes.push('page-horizontal-overflow');
  if (!expectedRouteReached) findingCodes.push('unexpected-final-route');

  return {
    status: 'automated-state-observed',
    outcome: findingCodes.length > 0
      ? 'automated-findings-observed'
      : 'no-automated-finding-observed',
    findingCodes,
  };
}

export async function observeLcpWithinBoundedFrames({
  readObserved,
  advanceFrame,
  maxFrames = 60,
}) {
  if (typeof readObserved !== 'function' || typeof advanceFrame !== 'function') {
    throw new TypeError('bounded LCP observation requires readObserved and advanceFrame functions');
  }
  if (!Number.isInteger(maxFrames) || maxFrames < 0) {
    throw new RangeError('maxFrames must be a non-negative integer');
  }

  for (let framesWaited = 0; framesWaited <= maxFrames; framesWaited += 1) {
    const polls = framesWaited + 1;
    if (await readObserved() === true) {
      return { status: 'observed', polls, framesWaited };
    }
    if (framesWaited < maxFrames) await advanceFrame();
  }

  return {
    status: 'not-observed-after-bounded-wait',
    polls: maxFrames + 1,
    framesWaited: maxFrames,
  };
}

const SAFE_RESPONSIVE_ROLES = new Set([
  'alert',
  'button',
  'dialog',
  'form',
  'grid',
  'link',
  'list',
  'listbox',
  'main',
  'menu',
  'navigation',
  'region',
  'status',
  'table',
  'toolbar',
]);
const SAFE_RESPONSIVE_SIDES = new Set(['inline-start', 'inline-end', 'both']);

function safeResponsiveOffenders(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).map((entry) => {
    const rawTag = typeof entry?.tag === 'string' ? entry.tag.toLowerCase() : '';
    const rawRole = typeof entry?.role === 'string' ? entry.role.toLowerCase() : '';
    const rawSide = typeof entry?.side === 'string' ? entry.side : '';
    const rawOverflow = Number.isFinite(entry?.overflowPx) ? entry.overflowPx : 0;
    return {
      tag: /^[a-z][a-z0-9-]{0,31}$/.test(rawTag) ? rawTag : 'unknown',
      role: SAFE_RESPONSIVE_ROLES.has(rawRole) ? rawRole : null,
      side: SAFE_RESPONSIVE_SIDES.has(rawSide) ? rawSide : 'inline-end',
      overflowPx: Math.max(0, Math.ceil(rawOverflow)),
    };
  });
}

function normalizeResponsiveGeometrySample(value) {
  if (!value || typeof value !== 'object') throw new TypeError('responsive geometry sample is required');
  const dimensions = ['scrollWidth', 'clientWidth', 'viewportWidth'];
  for (const field of dimensions) {
    if (!Number.isFinite(value[field]) || value[field] < 0) {
      throw new TypeError(`responsive geometry ${field} must be a finite non-negative number`);
    }
  }
  return {
    scrollWidth: value.scrollWidth,
    clientWidth: value.clientWidth,
    viewportWidth: value.viewportWidth,
    themeClassMatchesPreference: value.themeClassMatchesPreference === true,
    horizontalOverflowPx: Math.max(0, value.scrollWidth - value.clientWidth),
    offenders: safeResponsiveOffenders(value.offenders),
  };
}

function sameResponsiveGeometry(left, right) {
  return left.scrollWidth === right.scrollWidth
    && left.clientWidth === right.clientWidth
    && left.viewportWidth === right.viewportWidth
    && left.themeClassMatchesPreference === right.themeClassMatchesPreference;
}

export async function observeStableResponsiveGeometry({
  readSample,
  advanceFrame,
  requiredConsecutiveSamples = 3,
  maxSamples = 12,
}) {
  if (typeof readSample !== 'function' || typeof advanceFrame !== 'function') {
    throw new TypeError('responsive geometry observation requires readSample and advanceFrame functions');
  }
  if (!Number.isInteger(requiredConsecutiveSamples) || requiredConsecutiveSamples < 2) {
    throw new RangeError('requiredConsecutiveSamples must be an integer of at least two');
  }
  if (!Number.isInteger(maxSamples) || maxSamples < requiredConsecutiveSamples) {
    throw new RangeError('maxSamples must cover the required consecutive samples');
  }

  let previous = null;
  let consecutiveStableSamples = 0;
  let maxHorizontalOverflowPxObserved = 0;
  let sample = null;

  for (let sampleCount = 1; sampleCount <= maxSamples; sampleCount += 1) {
    sample = normalizeResponsiveGeometrySample(await readSample());
    maxHorizontalOverflowPxObserved = Math.max(
      maxHorizontalOverflowPxObserved,
      sample.horizontalOverflowPx,
    );
    consecutiveStableSamples = previous && sameResponsiveGeometry(previous, sample)
      ? consecutiveStableSamples + 1
      : 1;
    previous = sample;

    if (consecutiveStableSamples >= requiredConsecutiveSamples) {
      return {
        status: 'stable',
        sample,
        sampleCount,
        consecutiveStableSamples,
        maxHorizontalOverflowPxObserved,
      };
    }
    if (sampleCount < maxSamples) await advanceFrame();
  }

  return {
    status: 'unstable-after-bounded-sampling',
    sample,
    sampleCount: maxSamples,
    consecutiveStableSamples,
    maxHorizontalOverflowPxObserved,
  };
}

function normalizeVisualReadinessSample(value) {
  if (!value || typeof value !== 'object'
    || !/^[0-9a-f]{64}$/.test(value.motionStyleHash)
    || !Number.isInteger(value.motionElementCount) || value.motionElementCount < 0
    || !Number.isInteger(value.activeAnimationCount) || value.activeAnimationCount < 0
    || !Number.isInteger(value.busyElementCount) || value.busyElementCount < 0
    || typeof value.documentTitlePresent !== 'boolean') {
    throw new TypeError('visual readiness sample must contain only bounded aggregate state');
  }
  return {
    motionStyleHash: value.motionStyleHash,
    motionElementCount: value.motionElementCount,
    activeAnimationCount: value.activeAnimationCount,
    busyElementCount: value.busyElementCount,
    documentTitlePresent: value.documentTitlePresent,
  };
}

function sameVisualReadinessSample(left, right) {
  return left.motionStyleHash === right.motionStyleHash
    && left.motionElementCount === right.motionElementCount
    && left.activeAnimationCount === right.activeAnimationCount
    && left.busyElementCount === right.busyElementCount
    && left.documentTitlePresent === right.documentTitlePresent;
}

/**
 * Absorbs delayed browser/React motion delivery without turning an arbitrary timeout into
 * accessibility success. The opaque motion hash is used only for in-memory comparison and
 * is deliberately omitted from the returned observation and persisted artifacts.
 */
export async function observeStableVisualReadiness({
  readSample,
  advanceFrame,
  minimumSamples = 12,
  requiredConsecutiveSamples = 3,
  maxSamples = 24,
} = {}) {
  if (typeof readSample !== 'function' || typeof advanceFrame !== 'function') {
    throw new TypeError('visual readiness observation requires readSample and advanceFrame functions');
  }
  if (!Number.isInteger(requiredConsecutiveSamples) || requiredConsecutiveSamples < 2) {
    throw new RangeError('requiredConsecutiveSamples must be an integer of at least two');
  }
  if (!Number.isInteger(minimumSamples) || minimumSamples < requiredConsecutiveSamples) {
    throw new RangeError('minimumSamples must cover the required consecutive samples');
  }
  if (!Number.isInteger(maxSamples) || maxSamples < minimumSamples) {
    throw new RangeError('maxSamples must cover the minimum delivery window');
  }

  let previous = null;
  let consecutiveStableSamples = 0;
  for (let sampleCount = 1; sampleCount <= maxSamples; sampleCount += 1) {
    const sample = normalizeVisualReadinessSample(await readSample());
    consecutiveStableSamples = previous && sameVisualReadinessSample(previous, sample)
      ? consecutiveStableSamples + 1
      : 1;
    previous = sample;

    const prerequisitesReady = sample.activeAnimationCount === 0
      && sample.busyElementCount === 0
      && sample.documentTitlePresent;
    if (sampleCount >= minimumSamples
      && consecutiveStableSamples >= requiredConsecutiveSamples
      && prerequisitesReady) {
      return {
        status: 'ready',
        sampleCount,
        consecutiveStableSamples,
      };
    }
    if (sampleCount < maxSamples) await advanceFrame();
  }

  return {
    status: 'not-ready-after-bounded-sampling',
    sampleCount: maxSamples,
    consecutiveStableSamples,
  };
}

export function summarizeAutomatedOutcome(caseResults) {
  if (!Array.isArray(caseResults) || caseResults.length === 0) {
    return 'automated-observation-invalid';
  }
  if (caseResults.some(({ status }) => status === 'invalid-run')) {
    return 'automated-observation-invalid';
  }
  if (caseResults.some(({ status }) => status === 'blocked-prerequisite')) {
    return 'automated-observation-incomplete';
  }
  if (caseResults.some(({ status }) => status !== 'automated-state-observed')) {
    return 'automated-observation-invalid';
  }
  if (caseResults.some(({ automatedOutcome }) => automatedOutcome === 'automated-findings-observed')) {
    return 'automated-findings-observed';
  }
  return 'no-automated-finding-observed';
}

const REQUIRED_PERFORMANCE_METRICS = Object.freeze([
  'routeJsTransferBytes',
  'lcpMs',
  'cls',
  'readinessLatencyProxyMs',
]);
const PERFORMANCE_FAILURE_STAGES = new Set([
  'cold-context',
  'cold-navigation',
  'cold-metrics',
  'cold-cleanup',
  'warm-context',
  'warm-prime-navigation',
  'warm-navigation',
  'warm-metrics',
  'warm-cleanup',
  'performance-execution',
]);

export function classifyPerformanceObservation(conditionRuns, repeatPolicy) {
  const conditions = ['cold', 'warm'];
  const expectedRuns = conditions.map((condition) => repeatPolicy?.[condition]?.repetitions);
  if (!Array.isArray(conditionRuns)
    || expectedRuns.some((expected) => !Number.isInteger(expected) || expected <= 0)
    || conditionRuns.length !== expectedRuns.reduce((sum, expected) => sum + expected, 0)
    || conditionRuns.some(({ condition } = {}) => !conditions.includes(condition))) {
    return {
      status: 'invalid-run',
      invalidReasonCode: 'performance-repetition-incomplete',
      failureStage: 'repeat-validation',
    };
  }
  for (const condition of conditions) {
    const expected = repeatPolicy?.[condition]?.repetitions;
    const runs = Array.isArray(conditionRuns)
      ? conditionRuns.filter((run) => run?.condition === condition)
      : [];
    if (!Number.isInteger(expected) || expected <= 0
      || runs.length !== expected
      || new Set(runs.map(({ repetition }) => repetition)).size !== expected
      || !Array.from({ length: expected }, (_, index) => index + 1)
        .every((repetition) => runs.some((run) => run.repetition === repetition))) {
      return {
        status: 'invalid-run',
        invalidReasonCode: 'performance-repetition-incomplete',
        failureStage: 'repeat-validation',
      };
    }
    for (const metric of REQUIRED_PERFORMANCE_METRICS) {
      if (!runs.every((run) => Number.isFinite(run?.metrics?.[metric]))) {
        return {
          status: 'invalid-run',
          invalidReasonCode: 'required-performance-metric-not-observed',
          failureStage: 'metric-validation',
        };
      }
    }
  }
  return {
    status: 'lab-performance-observed',
    invalidReasonCode: null,
    failureStage: null,
  };
}

export function performanceFailureRecord(renderCaseId, failureStage) {
  return {
    renderCaseId,
    status: 'invalid-run',
    invalidReasonCode: 'performance-probe-failed',
    failureStage: PERFORMANCE_FAILURE_STAGES.has(failureStage)
      ? failureStage
      : 'performance-execution',
    conditionRuns: [],
    summary: null,
  };
}

export function summarizeRunStatus({
  plannedCases,
  completedCases,
  invalidCases,
  plannedPerformanceCases,
  completedPerformanceCases,
  invalidPerformanceCases,
  functionalTasksComplete,
  manualChecksComplete,
  evidenceDurable,
}) {
  if (!Number.isInteger(plannedCases) || plannedCases <= 0) return 'invalid-run';
  if (!Number.isInteger(plannedPerformanceCases) || plannedPerformanceCases <= 0) return 'invalid-run';
  if (!Number.isInteger(invalidCases) || invalidCases < 0
    || !Number.isInteger(invalidPerformanceCases) || invalidPerformanceCases < 0
    || invalidCases > 0 || invalidPerformanceCases > 0) return 'invalid-run';
  if (completedCases !== plannedCases) return 'partial-automated-evidence';
  if (completedPerformanceCases !== plannedPerformanceCases) return 'partial-automated-evidence';
  if (functionalTasksComplete && manualChecksComplete && evidenceDurable) return 'measured';
  return 'partial-automated-evidence';
}

/**
 * Builds the runtime scenario aggregate from the immutable execution plan.
 * Observed results may never redefine the planned population: missing,
 * duplicated or substituted case identifiers remain partial evidence.
 */
export function aggregateScenarioExecution({
  scenarioId,
  plannedStateCases,
  stateResults,
  plannedPerformanceCases,
  performanceResults,
  manualChecksComplete,
  evidenceDurable,
} = {}) {
  if (typeof scenarioId !== 'string' || scenarioId.length === 0
    || !Array.isArray(plannedStateCases)
    || !Array.isArray(stateResults)
    || !Array.isArray(plannedPerformanceCases)
    || !Array.isArray(performanceResults)) {
    throw new TypeError('scenario execution aggregate input is incomplete');
  }

  const plannedStateCaseIds = new Set(plannedStateCases.map(({ caseId } = {}) => caseId));
  const allStateResultsDeclared = plannedStateCaseIds.size === plannedStateCases.length
    && stateResults.every(({ caseId } = {}) => plannedStateCaseIds.has(caseId));
  const expectedStateCases = plannedStateCases.filter((stateCase) => (
    stateCase?.scenarioId === scenarioId
  ));
  const expectedStateCaseIds = expectedStateCases.map(({ caseId }) => caseId);
  const expectedStateCaseIdSet = new Set(expectedStateCaseIds);
  const scenarioStateResults = stateResults.filter(({ caseId } = {}) => (
    expectedStateCaseIdSet.has(caseId)
  ));
  const observedStateCaseIds = scenarioStateResults.map(({ caseId }) => caseId);
  const observedStateResultByCaseId = new Map(scenarioStateResults.map((result) => (
    [result.caseId, result]
  )));
  const statePopulationExact = expectedStateCaseIds.length > 0
    && allStateResultsDeclared
    && expectedStateCaseIdSet.size === expectedStateCaseIds.length
    && scenarioStateResults.length === expectedStateCaseIds.length
    && new Set(observedStateCaseIds).size === observedStateCaseIds.length
    && expectedStateCases.every((stateCase) => (
      observedStateCaseIds.includes(stateCase.caseId)
      && stableJson(observedStateResultByCaseId.get(stateCase.caseId)?.identity) === stableJson(stateCase.identity)
    ));

  const plannedPerformanceCaseIds = new Set(plannedPerformanceCases.map(({
    renderCaseId,
  } = {}) => renderCaseId));
  const allPerformanceResultsDeclared = plannedPerformanceCaseIds.size === plannedPerformanceCases.length
    && performanceResults.every(({ renderCaseId } = {}) => plannedPerformanceCaseIds.has(renderCaseId));
  const expectedPerformanceCases = plannedPerformanceCases.filter((renderCase) => (
    renderCase?.scenarioId === scenarioId
  ));
  const expectedPerformanceCaseIds = expectedPerformanceCases.map(({ renderCaseId }) => renderCaseId);
  const expectedPerformanceCaseIdSet = new Set(expectedPerformanceCaseIds);
  const scenarioPerformanceResults = performanceResults.filter(({ renderCaseId } = {}) => (
    expectedPerformanceCaseIdSet.has(renderCaseId)
  ));
  const observedPerformanceCaseIds = scenarioPerformanceResults.map(({ renderCaseId }) => renderCaseId);
  const performancePopulationExact = expectedPerformanceCaseIds.length > 0
    && allPerformanceResultsDeclared
    && expectedPerformanceCaseIdSet.size === expectedPerformanceCaseIds.length
    && scenarioPerformanceResults.length === expectedPerformanceCaseIds.length
    && new Set(observedPerformanceCaseIds).size === observedPerformanceCaseIds.length
    && expectedPerformanceCaseIds.every((renderCaseId) => observedPerformanceCaseIds.includes(renderCaseId));

  const authoritativeTaskReadbackComplete = summarizeAuthoritativeTaskEvidence({
    scenarioId,
    caseResults: scenarioStateResults,
    expectedStateCases,
  });
  const mutationEvidenceRequired = expectedStateCases.some(({
    requiredTaskEvidenceId,
  }) => requiredTaskEvidenceId !== null);
  const automatedFailedAssertionCount = scenarioStateResults.reduce(
    (sum, result) => sum + result.failedAssertionCount,
    0,
  );
  const task = {
    scenarioId,
    evidenceKind: 'automated-state-probe-not-user-study',
    taskSuccess: 'not-measured',
    completionTimeMs: null,
    criticalErrorCount: null,
    noncriticalErrorCount: null,
    assistanceCount: null,
    firstClickCorrect: null,
    recoverySuccess: 'not-measured',
    automatedFailedAssertionCount,
    mutationEvidenceRequired,
    authoritativeTaskReadbackComplete,
  };
  const invalidStateCaseCount = scenarioStateResults.filter(({ status }) => (
    status === 'invalid-run'
  )).length;
  const invalidPerformanceCaseCount = scenarioPerformanceResults.filter(({ status }) => (
    status !== 'lab-performance-observed'
  )).length;
  const completedStateCaseCount = new Set(scenarioStateResults
    .filter(({ status }) => status === 'automated-state-observed')
    .map(({ caseId }) => caseId)).size;
  const completedPerformanceCaseCount = new Set(scenarioPerformanceResults
    .filter(({ status }) => status === 'lab-performance-observed')
    .map(({ renderCaseId }) => renderCaseId)).size;
  const summarizedStatus = summarizeRunStatus({
    plannedCases: expectedStateCases.length,
    completedCases: completedStateCaseCount,
    invalidCases: invalidStateCaseCount,
    plannedPerformanceCases: expectedPerformanceCases.length,
    completedPerformanceCases: completedPerformanceCaseCount,
    invalidPerformanceCases: invalidPerformanceCaseCount,
    functionalTasksComplete: authoritativeTaskReadbackComplete,
    manualChecksComplete,
    evidenceDurable,
  });

  return {
    expectedStateCases,
    stateCases: scenarioStateResults,
    performanceCases: scenarioPerformanceResults,
    task,
    mutationEvidenceRequired,
    authoritativeTaskReadbackComplete,
    statePopulationExact,
    performancePopulationExact,
    plannedStateCaseCount: expectedStateCases.length,
    completedStateCaseCount,
    invalidStateCaseCount,
    plannedPerformanceCaseCount: expectedPerformanceCases.length,
    completedPerformanceCaseCount,
    invalidPerformanceCaseCount,
    status: summarizedStatus === 'invalid-run'
      ? summarizedStatus
      : statePopulationExact && performancePopulationExact
        ? summarizedStatus
        : 'partial-automated-evidence',
  };
}
