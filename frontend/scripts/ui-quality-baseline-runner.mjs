import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  aggregateScenarioExecution,
  assertArtifactSafe,
  assertStableBaselineExecutionContract,
  assertStableDirtyBuildInputFingerprint,
  assertStableBuildInputSnapshot,
  assertStableProtocolFileHash,
  captureBaselineExecutionContract,
  captureCommittedWorktreeFileHash,
  classifyAutomatedCaseOutcome,
  classifyClientErrorResponse,
  classifyEvidenceDurability,
  classifyPerformanceObservation,
  classifySyntheticMutationFailureReason,
  classifySyntheticRichTextReadback,
  createExecutedSyntheticMutationEvidence,
  createDirtyBuildInputFingerprint,
  createAutomatedRunProjection,
  createAutomatedRunSeal,
  createBaselineExecutionId,
  createRunWorkspace,
  createBaselineDockerInspectInvocation,
  createBaselineDockerImageInspectInvocation,
  createProductionBuildInputTreeHash,
  createNotExecutedTaskEvidence,
  createSafeRequestCategoryCounts,
  observeLcpWithinBoundedFrames,
  observeStableResponsiveGeometry,
  observeStableVisualReadiness,
  packageManagerVersionCommand,
  performanceFailureRecord,
  pollForExpectedValue,
  prepareFirstUseOnboardingPreference,
  PRODUCTION_BUILD_INPUT_PATHS,
  requireDirtyBuildInputFingerprint,
  runSyntheticMutationLifecycle,
  SAFE_REQUEST_CATEGORIES,
  assertBoundedArtifactDirectory,
  ensureBoundedArtifactDirectory,
  finalizeStagedRunPublication,
  sanitizeLcpObservation,
  selectSyntheticMutationDiagnosticCases,
  selectProductionBuildInputPaths,
  sha256,
  stableJson,
  summarizeAutomatedOutcome,
  UI_QUALITY_BASELINE_RUN_ID,
  validateBaselineBuildAttestation,
  validateBaselineDockerStack,
  validateInvalidCredentialsProbeFixture,
} from './ui-quality-baseline-core.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..', '..');
const frontendRoot = path.join(repoRoot, 'frontend');
const manifestPath = path.join(repoRoot, 'config', 'ui-quality-scenarios.json');
const routeTruthPath = path.join(repoRoot, 'config', 'ui-route-capabilities.json');
const adminStatePath = path.join(frontendRoot, 'playwright', '.auth', 'admin.json');
const userStatePath = path.join(frontendRoot, 'playwright', '.auth', 'user.json');
const TOOLING_PATHS = Object.freeze({
  runnerHash: 'frontend/scripts/ui-quality-baseline-runner.mjs',
  coreHash: 'frontend/scripts/ui-quality-baseline-core.mjs',
  runnerContractHash: 'scripts/ui-quality-baseline-runner-contract.test.mjs',
  scenarioContractHash: 'scripts/ui-quality-scenarios-contract.test.mjs',
});

const RUNNER_VERSION = 2;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const IMAGE_ID = /^sha256:[a-f0-9]{64}$/;
const BUILD_ATTESTATION_MAX_BYTES = 4_096;
const ONBOARDING_STEP_ID = 'onboarding-first-use';
const ONBOARDING_STORAGE_KEY = 'egov_smart_tour_v1';
const ONBOARDING_PREPARATION_PATH = '/__uiq_first_use_preparation__';
const SYNTHETIC_MUTATION_DIAGNOSTIC = 'synthetic-mutation-v1';
const SYNTHETIC_MUTATION_NAMESPACE = 'uiq-baseline-mutation-v1';
const DEFAULT_SYNTHETIC_FAQ_BOARD_ID = 'BBSMSTR_AAAAAAAAAAAA';
const READY_HEADINGS = Object.freeze({
  'invalid-credentials': '엔터프라이즈',
  'successful-login': '관리자 업무 현황',
  'hub-ready': '관리자 업무 현황',
  'dense-list-ready': '사용자 로그',
  'filtered-zero': '사용자 로그',
  'server-error': '사용자 로그',
  'user-hub-ready': '조직 및 사용자 관리',
  'mutation-error': '조직 및 사용자 관리',
  'composer-ready': '새 게시글 작성',
  'draft-restoration': '새 게시글 작성',
  'admin-compose-faq': '새 게시글 작성',
  'admin-faq-readback': '지식 베이스',
  'user-faq-search': '도움말 커스터머 센터',
  'wizard-ready': '게시판 생성 마법사',
  'wizard-validation': '게시판 생성 마법사',
  [ONBOARDING_STEP_ID]: '관리자 업무 현황',
});

function readJson(targetPath) {
  return JSON.parse(readFileSync(targetPath, 'utf8'));
}

function commandOutput(command, args, cwd = repoRoot) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function packageManagerVersion() {
  const { command, args } = packageManagerVersionCommand();
  return commandOutput(command, args);
}

function parseArgs(argv) {
  const options = {
    mode: 'plan',
    includePerformance: false,
  };
  for (const argument of argv) {
    if (argument === '--plan') options.mode = 'plan';
    else if (argument === '--execute') options.mode = 'execute';
    else if (argument === '--include-performance') options.includePerformance = true;
    else throw new Error(`unsupported argument: ${argument}`);
  }
  return options;
}

function validateLoopbackOrigin(rawValue, variableName = 'UI_BASELINE_WEB_URL') {
  if (!rawValue) throw new Error(`${variableName} is required for --execute`);
  let url;
  try {
    url = new URL(rawValue);
  } catch {
    throw new Error('baseline origin is invalid');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('baseline origin must use HTTP(S)');
  if (!LOOPBACK_HOSTS.has(url.hostname)) throw new Error('baseline runner only permits loopback origins');
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('baseline origin must not contain credentials, query or fragment');
  }
  if (url.pathname !== '/' && url.pathname !== '') throw new Error('baseline origin must not contain a path');
  return url.origin;
}

function requireExecutionValue(name, environment = process.env) {
  const value = environment[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('baseline execution preflight is incomplete');
  }
  return value;
}

function inspectBaselineContainer(request) {
  const invocation = createBaselineDockerInspectInvocation(request);
  return execFileSync(invocation.command, invocation.args, {
    cwd: repoRoot,
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: invocation.timeoutMs,
    maxBuffer: invocation.maxOutputBytes,
  });
}

function inspectBaselineImage(request) {
  const invocation = createBaselineDockerImageInspectInvocation(request);
  return execFileSync(invocation.command, invocation.args, {
    cwd: repoRoot,
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: invocation.timeoutMs,
    maxBuffer: invocation.maxOutputBytes,
  });
}

function readBoundedBuildAttestationFile(targetPath) {
  let descriptor;
  try {
    descriptor = openSync(targetPath, 'r');
    const stats = fstatSync(descriptor);
    if (!stats.isFile()
      || !Number.isSafeInteger(stats.size)
      || stats.size < 1
      || stats.size > BUILD_ATTESTATION_MAX_BYTES) {
      throw new Error('invalid attestation size');
    }
    const bounded = Buffer.alloc(BUILD_ATTESTATION_MAX_BYTES + 1);
    const bytesRead = readSync(descriptor, bounded, 0, bounded.length, 0);
    if (bytesRead !== stats.size || bytesRead > BUILD_ATTESTATION_MAX_BYTES) {
      throw new Error('invalid attestation read');
    }
    return Buffer.from(bounded.subarray(0, bytesRead));
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

export function readBaselineBuildAttestationFile({
  attestationPath,
  repositoryRoot = repoRoot,
  lstatFile = lstatSync,
  readFile = readBoundedBuildAttestationFile,
  realpathFile = realpathSync,
} = {}) {
  const invalid = () => {
    throw new Error('baseline build attestation file is invalid');
  };
  if (typeof attestationPath !== 'string'
    || !path.isAbsolute(attestationPath)
    || path.resolve(attestationPath) !== attestationPath
    || typeof repositoryRoot !== 'string'
    || !path.isAbsolute(repositoryRoot)
    || typeof lstatFile !== 'function'
    || typeof readFile !== 'function'
    || typeof realpathFile !== 'function') invalid();
  const resolvedPath = path.resolve(attestationPath);
  const resolvedRepository = path.resolve(repositoryRoot);
  const isOutside = (root, candidate) => {
    const relative = path.relative(root, candidate);
    return relative === '..'
      || relative.startsWith(`..${path.sep}`)
      || path.isAbsolute(relative);
  };
  const isOutsideRepository = isOutside(resolvedRepository, resolvedPath);
  if (!isOutsideRepository) invalid();
  try {
    const realRepository = path.resolve(realpathFile(resolvedRepository));
    const realPathBefore = path.resolve(realpathFile(resolvedPath));
    if (realPathBefore !== resolvedPath || !isOutside(realRepository, realPathBefore)) invalid();
    const before = lstatFile(resolvedPath);
    if (!before.isFile()
      || before.isSymbolicLink()
      || !Number.isSafeInteger(before.size)
      || before.size < 1
      || before.size > BUILD_ATTESTATION_MAX_BYTES) invalid();
    const rawBytes = readFile(resolvedPath);
    const after = lstatFile(resolvedPath);
    const realPathAfter = path.resolve(realpathFile(resolvedPath));
    if (!Buffer.isBuffer(rawBytes)
      || rawBytes.length !== before.size
      || rawBytes.length > BUILD_ATTESTATION_MAX_BYTES
      || !after.isFile()
      || after.isSymbolicLink()
      || after.size !== before.size
      || realPathAfter !== realPathBefore) invalid();
    return rawBytes;
  } catch {
    invalid();
  }
}

function captureExecutionPreflightRequirements({
  genericDiagnostic,
  mutationDiagnostic,
  includePerformance,
  baseOrigin,
  environment = process.env,
  authStateExists = existsSync,
}) {
  if (requireExecutionValue('UI_BASELINE_STACK_CLASSIFICATION', environment) !== 'isolated-synthetic') {
    throw new Error('baseline execution preflight requires an isolated synthetic stack');
  }
  const frontendBuildId = requireExecutionValue('UI_BASELINE_FRONTEND_BUILD_ID', environment);
  const backendBuildId = requireExecutionValue('UI_BASELINE_BACKEND_BUILD_ID', environment);
  if (!IMAGE_ID.test(frontendBuildId) || !IMAGE_ID.test(backendBuildId)) {
    throw new Error('baseline execution preflight requires exact SHA-256 image IDs');
  }
  const requirements = Object.freeze({
    frontendContainerId: requireExecutionValue('UI_BASELINE_FRONTEND_CONTAINER_ID', environment),
    backendContainerId: requireExecutionValue('UI_BASELINE_BACKEND_CONTAINER_ID', environment),
    frontendContainerName: requireExecutionValue('UI_BASELINE_FRONTEND_CONTAINER_NAME', environment),
    backendContainerName: requireExecutionValue('UI_BASELINE_BACKEND_CONTAINER_NAME', environment),
    frontendBuildId,
    backendBuildId,
    frontendOrigin: baseOrigin,
    apiOrigin: validateLoopbackOrigin(
      requireExecutionValue('UI_BASELINE_API_URL', environment),
      'UI_BASELINE_API_URL',
    ),
    dockerProject: requireExecutionValue('UI_BASELINE_DOCKER_PROJECT', environment),
    dockerNetwork: requireExecutionValue('UI_BASELINE_DOCKER_NETWORK', environment),
    buildAttestationPath: requireExecutionValue(
      'UI_BASELINE_BUILD_ATTESTATION_PATH',
      environment,
    ),
    buildAttestationSha256: requireExecutionValue(
      'UI_BASELINE_BUILD_ATTESTATION_SHA256',
      environment,
    ),
  });
  if (!genericDiagnostic) {
    requireExecutionValue('UI_BASELINE_SYNTHETIC_SEED_LABEL', environment);
    if (!authStateExists(adminStatePath) || !authStateExists(userStatePath)) {
      throw new Error('baseline execution preflight requires both private auth states');
    }
    if (mutationDiagnostic) {
      if (includePerformance) {
        throw new Error('synthetic mutation diagnostic must not include performance coverage');
      }
    } else {
      if (!includePerformance) throw new Error('baseline execution preflight requires performance coverage');
      requireExecutionValue('UI_BASELINE_ADMIN_ID', environment);
      requireExecutionValue('UI_BASELINE_ADMIN_SECRET', environment);
    }
  }
  return requirements;
}

function attestExecutionStack({
  requirements,
  buildSha,
  buildInputTreeHash,
  commitTreeId,
  readBuildAttestation = readBaselineBuildAttestationFile,
  inspectContainer = inspectBaselineContainer,
  inspectImage = inspectBaselineImage,
}) {
  const stackBinding = Object.freeze({
    ...requirements,
    buildSha,
    buildInputTreeHash,
    inspectContainer,
    inspectImage,
  });
  const verify = () => {
    let rawBuildAttestation;
    try {
      rawBuildAttestation = readBuildAttestation({
        attestationPath: requirements.buildAttestationPath,
        repositoryRoot: repoRoot,
      });
    } catch {
      throw new Error('baseline build attestation file is invalid');
    }
    validateBaselineBuildAttestation({
      rawBytes: rawBuildAttestation,
      expectedRawSha256: requirements.buildAttestationSha256,
      buildSha,
      buildInputTreeHash,
      commitTreeId,
      frontendBuildId: requirements.frontendBuildId,
      backendBuildId: requirements.backendBuildId,
    });
    return validateBaselineDockerStack(stackBinding);
  };
  const attestation = verify();
  return Object.freeze({
    frontendBuildId: attestation.frontendBuildId,
    backendBuildId: attestation.backendBuildId,
    verifyAtFinish: verify,
  });
}

export function validateExecutionPreflight({
  genericDiagnostic,
  mutationDiagnostic,
  includePerformance,
  baseOrigin,
  buildSha,
  buildInputTreeHash,
  commitTreeId,
  environment = process.env,
  authStateExists = existsSync,
  readBuildAttestation = readBaselineBuildAttestationFile,
  inspectContainer = inspectBaselineContainer,
  inspectImage = inspectBaselineImage,
}) {
  const requirements = captureExecutionPreflightRequirements({
    genericDiagnostic,
    mutationDiagnostic,
    includePerformance,
    baseOrigin,
    environment,
    authStateExists,
  });
  return attestExecutionStack({
    requirements,
    buildSha,
    buildInputTreeHash,
    commitTreeId,
    readBuildAttestation,
    inspectContainer,
    inspectImage,
  });
}

function readCommittedFile(buildSha, relativePath) {
  if (!/^[a-f0-9]{40}$/.test(buildSha)) {
    throw new Error('committed source capture requires an exact build SHA');
  }
  const normalized = relativePath.replaceAll('\\', '/');
  if (normalized !== relativePath || normalized.startsWith('/')
    || normalized.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error('committed source capture received an unsafe path');
  }
  return execFileSync(
    'git',
    ['show', `${buildSha}:${relativePath}`],
    { cwd: repoRoot, encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'] },
  );
}

function boundSourceFileHash(buildSha, relativePath) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  const relative = path.relative(repoRoot, absolutePath).replaceAll('\\', '/');
  if (relative !== relativePath || !existsSync(absolutePath)) {
    throw new Error('bound source file is unavailable');
  }
  const stats = lstatSync(absolutePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error('bound source file is unavailable');
  }
  return captureCommittedWorktreeFileHash({
    readWorktreeFile: () => readFileSync(absolutePath),
    readCommittedFile: () => readCommittedFile(buildSha, relativePath),
  });
}

function sourceTreeHash(buildSha) {
  const raw = execFileSync('git', [
    'ls-tree', '-r', '--name-only', '-z', buildSha, '--', ...PRODUCTION_BUILD_INPUT_PATHS,
  ], { cwd: repoRoot, encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'] });
  return createProductionBuildInputTreeHash({
    trackedPaths: nullTerminatedFields(raw),
    readCommittedFile: (relativePath) => readCommittedFile(buildSha, relativePath),
  });
}

function baselineProtocolPath(contract) {
  const absolutePath = path.resolve(repoRoot, contract.protocolPointer);
  const relative = path.relative(repoRoot, absolutePath).replaceAll('\\', '/');
  if (relative !== contract.protocolPointer
    || !existsSync(absolutePath)
    || lstatSync(absolutePath).isSymbolicLink()
    || !lstatSync(absolutePath).isFile()) {
    throw new Error('canonical baseline protocol file is unavailable');
  }
  return absolutePath;
}

function baselineProtocolHash(contract, buildSha) {
  baselineProtocolPath(contract);
  return boundSourceFileHash(buildSha, contract.protocolPointer);
}

function nullTerminatedFields(raw) {
  const value = raw.toString('utf8');
  if (value.length === 0) return [];
  if (!value.endsWith('\0')) throw new Error('malformed NUL-terminated git output');
  return value.slice(0, -1).split('\0');
}

function boundedPathChunks(paths, maxCharacters = 12_000) {
  const chunks = [];
  let current = [];
  let currentCharacters = 0;
  for (const relativePath of paths) {
    const nextCharacters = relativePath.length + 1;
    if (current.length > 0 && currentCharacters + nextCharacters > maxCharacters) {
      chunks.push(current);
      current = [];
      currentCharacters = 0;
    }
    current.push(relativePath);
    currentCharacters += nextCharacters;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function gitNullTerminatedFields(args) {
  return nullTerminatedFields(execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'ignore'],
  }));
}

function selectedTrackedBuildInputPaths() {
  return selectProductionBuildInputPaths([
    ...gitNullTerminatedFields([
      'ls-tree', '-r', '--name-only', '-z', 'HEAD', '--', ...PRODUCTION_BUILD_INPUT_PATHS,
    ]),
    ...gitNullTerminatedFields([
      'ls-files', '--cached', '-z', '--', ...PRODUCTION_BUILD_INPUT_PATHS,
    ]),
  ]);
}

function trackedBuildInputChanges(selectedPaths) {
  const changes = [];
  for (const selectedPathChunk of boundedPathChunks(selectedPaths)) {
    const fields = gitNullTerminatedFields([
      'diff', '--name-status', '-z', '--no-renames', '--no-ext-diff', '--no-textconv',
      'HEAD', '--', ...selectedPathChunk,
    ]);
    if (fields.length % 2 !== 0) throw new Error('malformed dirty build input status');
    for (let index = 0; index < fields.length; index += 2) {
      changes.push({ status: fields[index], path: fields[index + 1] });
    }
  }
  return changes;
}

function untrackedBuildInputPaths() {
  return selectProductionBuildInputPaths(gitNullTerminatedFields([
    'ls-files', '--others', '--exclude-standard', '-z', '--', ...PRODUCTION_BUILD_INPUT_PATHS,
  ]));
}

function readSelectedBuildInput(relativePath) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  const relativeCheck = path.relative(repoRoot, absolutePath);
  if (relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) {
    throw new Error('dirty build input escapes repository');
  }
  return readFileSync(absolutePath);
}

function dirtyBuildInputFingerprint() {
  return requireDirtyBuildInputFingerprint(() => createDirtyBuildInputFingerprint({
    trackedChanges: trackedBuildInputChanges(selectedTrackedBuildInputPaths()),
    untrackedPaths: untrackedBuildInputPaths(),
    readSelectedFile: readSelectedBuildInput,
  }));
}

function toolingHashes(buildSha) {
  return {
    runnerHash: boundSourceFileHash(buildSha, TOOLING_PATHS.runnerHash),
    coreHash: boundSourceFileHash(buildSha, TOOLING_PATHS.coreHash),
    runnerContractHash: boundSourceFileHash(buildSha, TOOLING_PATHS.runnerContractHash),
    scenarioContractHash: boundSourceFileHash(buildSha, TOOLING_PATHS.scenarioContractHash),
  };
}

function assertStableToolingHashes(startHashes, finishHashes) {
  const keys = ['runnerHash', 'coreHash', 'runnerContractHash', 'scenarioContractHash'];
  if (keys.some((key) => startHashes?.[key] !== finishHashes?.[key])) {
    throw new Error('baseline tooling changed during baseline execution');
  }
}

function routeTruthHash() {
  return sha256(stableJson(readJson(routeTruthPath)));
}

function artifactIdentity(execution) {
  return {
    baselineRunId: execution.baselineRunId,
    executionId: execution.executionId,
  };
}

function bindArtifactIdentity(value, execution) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('baseline artifact must be an object');
  }
  return {
    ...value,
    ...artifactIdentity(execution),
  };
}

function writeRunArtifact(targetPath, value, forbiddenKeys, execution) {
  writeSafeJson(targetPath, bindArtifactIdentity(value, execution), forbiddenKeys);
}

function collectJsonArtifactEntries(root) {
  const entries = [];
  const visit = (directory, prefix = '') => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      const stats = lstatSync(absolutePath);
      if (stats.isSymbolicLink()) throw new Error('baseline staging contains a symbolic link');
      if (stats.isDirectory()) {
        visit(absolutePath, relativePath);
      } else if (stats.isFile() && entry.name.endsWith('.json')) {
        entries.push({ relativePath, bytes: readFileSync(absolutePath) });
      } else {
        throw new Error('baseline staging contains a non-JSON artifact');
      }
    }
  };
  visit(root);
  return entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function assertDiagnosticInventory(entries, execution, expectedCount) {
  if (entries.length !== expectedCount) {
    throw new Error('diagnostic staging artifact population is incomplete');
  }
  for (const { bytes } of entries) {
    let value;
    try {
      value = JSON.parse(bytes.toString('utf8'));
    } catch {
      throw new Error('diagnostic staging contains invalid JSON');
    }
    if (value?.baselineRunId !== execution.baselineRunId
      || value?.executionId !== execution.executionId) {
      throw new Error('diagnostic staging contains mixed execution identity');
    }
  }
  return entries;
}

function verifyFinalExecutionProvenance(contract, execution, verifyStackAtFinish) {
  if (typeof verifyStackAtFinish !== 'function') {
    throw new Error('baseline Docker finish verification is unavailable');
  }
  const buildShaAtFinish = commandOutput('git', ['rev-parse', 'HEAD']);
  const dirtyBuildInputDiffHashAtStart = execution.dirtyBuildInputDiffHash;
  const dirtyBuildInputDiffHashAtFinish = dirtyBuildInputFingerprint();
  const buildInputTreeHashAtFinish = sourceTreeHash(buildShaAtFinish);
  const toolingHashesAtFinish = toolingHashes(buildShaAtFinish);
  const routeTruthHashAtFinish = routeTruthHash();
  const finishContract = captureBaselineExecutionContract(() => readFileSync(manifestPath));
  const protocolHashAtFinish = baselineProtocolHash(finishContract, buildShaAtFinish);
  const buildShaVerifiedAtFinish = commandOutput('git', ['rev-parse', 'HEAD']);
  assertStableDirtyBuildInputFingerprint(
    dirtyBuildInputDiffHashAtStart,
    dirtyBuildInputDiffHashAtFinish,
  );
  assertStableBuildInputSnapshot(execution.buildInputTreeHash, buildInputTreeHashAtFinish);
  assertStableToolingHashes(execution, toolingHashesAtFinish);
  if (execution.routeTruthHash !== routeTruthHashAtFinish
    || execution.buildSha !== buildShaAtFinish
    || buildShaAtFinish !== buildShaVerifiedAtFinish) {
    throw new Error('baseline source provenance changed during baseline execution');
  }
  assertStableBaselineExecutionContract(contract, finishContract);
  assertStableProtocolFileHash(execution.protocolHash, protocolHashAtFinish);
  verifyStackAtFinish();
  return execution;
}

function safeVersion(packagePath) {
  try {
    return readJson(packagePath).version ?? 'not-observed';
  } catch {
    return 'not-observed';
  }
}

function sanitizeIdentifier(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  return value.replace(/[^A-Za-z0-9._:@/-]/g, '-').slice(0, 160);
}

function artifactRootFromManifest(manifest) {
  const absolute = path.resolve(repoRoot, manifest.artifactRoot);
  const relative = path.relative(repoRoot, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('artifact root escapes repository');
  assertBoundedArtifactDirectory({
    boundaryRoot: repoRoot,
    directoryPath: absolute,
    requireExisting: false,
  });
  return absolute;
}

function writeSafeJson(targetPath, value, forbiddenKeys) {
  assertArtifactSafe(value, forbiddenKeys, path.relative(repoRoot, targetPath).replaceAll('\\', '/'));
  const parentDirectory = path.dirname(targetPath);
  ensureBoundedArtifactDirectory({
    boundaryRoot: repoRoot,
    directoryPath: parentDirectory,
  });
  assertBoundedArtifactDirectory({
    boundaryRoot: repoRoot,
    directoryPath: parentDirectory,
  });
  writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  assertBoundedArtifactDirectory({
    boundaryRoot: repoRoot,
    directoryPath: parentDirectory,
  });
}

function roleStorageState(stateCase) {
  if (stateCase.stepId === 'invalid-credentials' || stateCase.stepId === 'successful-login') return undefined;
  if (stateCase.identity.role === 'ADMIN') return adminStatePath;
  if (stateCase.identity.role === 'USER') return userStatePath;
  return undefined;
}

function resolveQueryTemplate(stateCase) {
  if (!stateCase.queryTemplate) return '';
  const replacements = {
    safeRelativeRoute: '/admin',
    syntheticBoardId: process.env.UI_BASELINE_SYNTHETIC_BOARD_ID || 'BBSMSTR_AAAAAAAAAAAA',
    syntheticFaqBoardId: process.env.UI_BASELINE_SYNTHETIC_FAQ_BOARD_ID || 'BBSMSTR_AAAAAAAAAAAA',
  };
  return stateCase.queryTemplate.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_, key) => {
    const value = replacements[key];
    if (!value) throw new Error(`missing safe query replacement for ${key}`);
    return encodeURIComponent(value);
  });
}

function registerPerformanceObserversScript() {
  window.__uiqMetrics = { lcp: null, cls: 0, largestShiftTag: null };
  window.__uiqObservers = { lcp: null, cls: null };

  const absorbLcpEntries = (entries) => {
    window.__uiqMetrics.lcp = entries.at(-1) ?? window.__uiqMetrics.lcp;
  };
  const absorbClsEntries = (entries) => {
    for (const entry of entries) {
      if (!entry.hadRecentInput) {
        window.__uiqMetrics.cls += entry.value;
        const source = entry.sources?.[0]?.node;
        if (source instanceof Element) window.__uiqMetrics.largestShiftTag = source.tagName.toLowerCase();
      }
    }
  };

  try {
    const observer = new PerformanceObserver((list) => absorbLcpEntries(list.getEntries()));
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    window.__uiqObservers.lcp = observer;
  } catch {}
  try {
    const observer = new PerformanceObserver((list) => absorbClsEntries(list.getEntries()));
    observer.observe({ type: 'layout-shift', buffered: true });
    window.__uiqObservers.cls = observer;
  } catch {}

  window.__uiqFlushPerformanceEntries = () => {
    const lcpObserver = window.__uiqObservers.lcp;
    if (lcpObserver) absorbLcpEntries(lcpObserver.takeRecords());
    const clsObserver = window.__uiqObservers.cls;
    if (clsObserver) absorbClsEntries(clsObserver.takeRecords());
  };
}

async function createContext(browser, stateCase, baseOrigin, { cacheDisabled = false } = {}) {
  const storageState = roleStorageState(stateCase);
  if (storageState && !existsSync(storageState)) {
    const error = new Error('required auth state is missing');
    error.code = 'auth-state-missing';
    throw error;
  }
  const context = await browser.newContext({
    baseURL: baseOrigin,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    viewport: { width: stateCase.viewport.width, height: stateCase.viewport.height },
    colorScheme: stateCase.identity.colorMode,
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    storageState,
  });
  await context.addInitScript(registerPerformanceObserversScript);
  await context.addInitScript(({ colorMode, markOnboardingSeen, onboardingStorageKey }) => {
    try {
      localStorage.setItem('theme', colorMode);
      document.documentElement.style.setProperty('color-scheme', colorMode);
      if (markOnboardingSeen) localStorage.setItem(onboardingStorageKey, 'true');
    } catch {}
  }, {
    colorMode: stateCase.identity.colorMode,
    markOnboardingSeen: stateCase.stepId !== ONBOARDING_STEP_ID,
    onboardingStorageKey: ONBOARDING_STORAGE_KEY,
  });
  if (cacheDisabled) {
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.close();
  }
  return context;
}

async function prepareFirstUseOnboardingPage(page, stateCase, baseOrigin) {
  if (stateCase.stepId !== ONBOARDING_STEP_ID) return;
  const preparationUrl = new URL(ONBOARDING_PREPARATION_PATH, baseOrigin).toString();
  await prepareFirstUseOnboardingPreference({
    establishSameOriginStorage: async () => {
      await page.route(preparationUrl, (route) => route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>ui-quality-first-use-preparation</title>',
      }), { times: 1 });
      const response = await page.goto(preparationUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      });
      if (!response || response.status() !== 200) {
        throw new Error('first-use onboarding preference origin preparation failed');
      }
    },
    clearSeenPreference: () => page.evaluate(
      (onboardingStorageKey) => localStorage.removeItem(onboardingStorageKey),
      ONBOARDING_STORAGE_KEY,
    ),
  });
}

function createSafeDiagnosticsCounts() {
  return {
    consoleError: 0,
    consoleWarning: 0,
    pageException: 0,
    requestFailure: 0,
    websocketFailure: 0,
    navigationAbort: 0,
    apiRequestFailure: 0,
    otherRequestFailure: 0,
    http4xx: 0,
    http5xx: 0,
    responseCategoryCounts: createSafeRequestCategoryCounts(),
  };
}

function installSafeDiagnostics(page, stateCase) {
  const counts = createSafeDiagnosticsCounts();
  page.on('console', (message) => {
    if (message.type() === 'error') counts.consoleError += 1;
    if (message.type() === 'warning') counts.consoleWarning += 1;
  });
  page.on('pageerror', () => { counts.pageException += 1; });
  page.on('requestfailed', (request) => {
    counts.requestFailure += 1;
    const failureText = request.failure()?.errorText ?? '';
    const pathname = new URL(request.url()).pathname;
    if (request.resourceType() === 'websocket') counts.websocketFailure += 1;
    else if (failureText === 'net::ERR_ABORTED'
      && (request.resourceType() === 'document' || !pathname.includes('/api/') || request.url().includes('_rsc='))) {
      counts.navigationAbort += 1;
    } else if (pathname.includes('/api/')) counts.apiRequestFailure += 1;
    else counts.otherRequestFailure += 1;
  });
  page.on('response', (response) => {
    if (response.status() >= 500) counts.http5xx += 1;
    else if (response.status() >= 400) {
      counts.http4xx += 1;
      const category = classifyClientErrorResponse({
        scenarioId: stateCase.scenarioId,
        stepId: stateCase.stepId,
        method: response.request().method(),
        pathname: new URL(response.url()).pathname,
        status: response.status(),
      });
      counts.responseCategoryCounts[category] += 1;
    }
  });
  return counts;
}

async function disableAnimations(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.evaluate(async () => {
    for (const animation of document.getAnimations()) {
      try {
        const endTime = animation.effect?.getComputedTiming().endTime;
        if (typeof endTime === 'number' && Number.isFinite(endTime)) animation.finish();
        else animation.cancel();
      } catch {
        animation.cancel();
      }
    }
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  });
}

async function advanceAnimationFrame(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
}

async function readVisualReadinessSample(page) {
  return page.evaluate(async () => {
    const motionStyleVectors = [];
    for (const element of document.querySelectorAll('[style]')) {
      if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) continue;
      const values = [
        element.style.opacity,
        element.style.transform,
        element.style.translate,
        element.style.scale,
        element.style.rotate,
      ];
      if (values.every((value) => !value)) continue;
      motionStyleVectors.push(values.join('\u001f'));
    }
    const encoded = new TextEncoder().encode(motionStyleVectors.join('\u001e'));
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    const motionStyleHash = [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
    const activeAnimationCount = document.getAnimations()
      .filter(({ playState }) => playState === 'pending' || playState === 'running')
      .length;
    const busyElementCount = [...document.querySelectorAll('[aria-busy="true"]')]
      .filter((element) => {
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && bounds.width > 0
          && bounds.height > 0
          && !element.closest('[inert], [aria-hidden="true"]');
      })
      .length;
    return {
      motionStyleHash,
      motionElementCount: motionStyleVectors.length,
      activeAnimationCount,
      busyElementCount,
      documentTitlePresent: Boolean(document.title.trim()),
    };
  });
}

async function settleVisualReadinessFrame(page) {
  await page.evaluate(async () => {
    for (const animation of document.getAnimations()) {
      try {
        const endTime = animation.effect?.getComputedTiming().endTime;
        if (typeof endTime === 'number' && Number.isFinite(endTime)) animation.finish();
        else animation.cancel();
      } catch {
        animation.cancel();
      }
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

async function waitForStandardDataTableAccessibilityReadiness(
  page,
  { maxFrames = 12, requiredConsecutive = 2 } = {},
) {
  let consecutiveReadyFrames = 0;
  for (let sampleCount = 1; sampleCount <= maxFrames; sampleCount += 1) {
    const ready = await page.evaluate(() => {
      const regions = [...document.querySelectorAll('[data-slot="standard-data-table-scroll-region"]')];
      return regions.every((element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        const hidden = style.display === 'none'
          || style.visibility === 'hidden'
          || bounds.width === 0
          || bounds.height === 0
          || Boolean(element.closest('[inert], [aria-hidden="true"]'));
        if (hidden) return true;

        const horizontallyScrollable = /^(auto|scroll)$/.test(style.overflowX)
          && element.scrollWidth > element.clientWidth;
        const verticallyScrollable = /^(auto|scroll)$/.test(style.overflowY)
          && element.scrollHeight > element.clientHeight;
        if (!horizontallyScrollable && !verticallyScrollable) return true;

        return element.getAttribute('role') === 'region'
          && element.tabIndex === 0
          && Boolean(element.getAttribute('aria-label')?.trim());
      });
    });

    consecutiveReadyFrames = ready ? consecutiveReadyFrames + 1 : 0;
    if (consecutiveReadyFrames >= requiredConsecutive) {
      return {
        status: 'ready',
        sampleCount,
        consecutiveReadyFrames,
      };
    }
    if (sampleCount < maxFrames) await advanceAnimationFrame(page);
  }
  return {
    status: 'not-ready-after-bounded-wait',
    sampleCount: maxFrames,
    consecutiveReadyFrames,
  };
}

async function readResponsiveGeometry(page) {
  return page.evaluate(() => {
    const documentElement = document.documentElement;
    const clientWidth = documentElement.clientWidth;
    const rootDirection = getComputedStyle(documentElement).direction;
    const horizontalOverflowPx = Math.max(0, documentElement.scrollWidth - clientWidth);
    const offenders = horizontalOverflowPx > 0
      ? [...document.querySelectorAll('body *')]
        .flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const physicalStartOverflow = Math.max(0, -rect.left);
          const physicalEndOverflow = Math.max(0, rect.right - clientWidth);
          if (physicalStartOverflow <= 0.5 && physicalEndOverflow <= 0.5) return [];

          const startOverflow = rootDirection === 'rtl'
            ? physicalEndOverflow
            : physicalStartOverflow;
          const endOverflow = rootDirection === 'rtl'
            ? physicalStartOverflow
            : physicalEndOverflow;
          const side = startOverflow > 0.5 && endOverflow > 0.5
            ? 'both'
            : startOverflow > 0.5
              ? 'inline-start'
              : 'inline-end';
          return [{
            tag: element.tagName.toLowerCase(),
            role: element.getAttribute('role'),
            side,
            overflowPx: Math.ceil(Math.max(startOverflow, endOverflow)),
          }];
        })
        .sort((left, right) => right.overflowPx - left.overflowPx)
        .slice(0, 5)
      : [];

    return {
      scrollWidth: documentElement.scrollWidth,
      clientWidth,
      viewportWidth: window.innerWidth,
      themeClassMatchesPreference: documentElement.classList.contains('dark')
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : !window.matchMedia('(prefers-color-scheme: dark)').matches,
      offenders,
    };
  });
}

async function waitForReadyHeading(page, stateCase) {
  const heading = READY_HEADINGS[stateCase.stepId];
  if (!heading) throw new Error('missing readiness heading');
  const locator = page.getByRole('heading', { level: 1, name: heading, exact: true });
  await locator.waitFor({ state: 'visible', timeout: 30_000 });
  return heading;
}

async function waitForOnboardingDialog(page) {
  const dialog = page.getByRole('dialog', { name: '업무 포털 둘러보기', exact: true });
  await dialog.waitFor({ state: 'visible', timeout: 10_000 });
  return dialog;
}

async function visibleWithin(locator, timeout) {
  return locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
}

async function installStatePreparation(page, stateCase) {
  const preparation = { coverage: 'route-loaded-only', assertions: [], taskEvidence: [] };

  if (stateCase.stepId === 'filtered-zero') {
    let matchedRequestCount = 0;
    let servedFixtureCount = 0;
    preparation.zeroFixtureCounts = () => ({ matchedRequestCount, servedFixtureCount });
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === 'GET' && /\/api\/v1\/admin\/system\/logs\/user\/?$/.test(url.pathname)) {
        matchedRequestCount += 1;
      }
      if (request.method() === 'GET'
        && /\/api\/v1\/admin\/system\/logs\/user\/?$/.test(url.pathname)
        && Boolean(url.searchParams.get('searchKeyword'))) {
        servedFixtureCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            code: 'SUCCESS',
            message: 'Synthetic zero-result fixture',
            data: { list: [], total: 0, totalPage: 1, pageIndex: 1 },
          }),
        });
        return;
      }
      await route.continue();
    });
    preparation.coverage = 'synthetic-zero-result-fixture-installed';
  }

  if (stateCase.stepId === 'server-error') {
    let failureArmed = false;
    let injectedFailureCount = 0;
    preparation.armInjectedFailure = () => { failureArmed = true; };
    preparation.releaseInjectedFailure = () => { failureArmed = false; };
    preparation.injectedFailureCount = () => injectedFailureCount;
    await page.route('**/*', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (request.method() === 'GET' && /\/api\/v1\/admin\/system\/logs\/user\/?$/.test(pathname)) {
        if (failureArmed) {
          injectedFailureCount += 1;
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, code: 'UI_BASELINE_INJECTED_FAILURE' }),
          });
          return;
        }
      }
      await route.continue();
    });
    preparation.coverage = 'scoped-failure-fixture-installed';
  }

  if (stateCase.stepId === 'mutation-error') {
    let failureArmed = false;
    let injectedFailureCount = 0;
    preparation.armInjectedFailure = () => { failureArmed = true; };
    preparation.releaseInjectedFailure = () => { failureArmed = false; };
    preparation.injectedFailureCount = () => injectedFailureCount;
    await page.route('**/*', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const hasNextAction = await request.headerValue('next-action').then((value) => value !== null);
      if (failureArmed
        && request.method() === 'POST'
        && pathname === '/admin/user/manage'
        && hasNextAction) {
        injectedFailureCount += 1;
        await route.fulfill({
          status: 500,
          contentType: 'text/x-component',
          body: '',
        });
        return;
      }
      await route.continue();
    });
    preparation.coverage = 'scoped-user-mutation-failure-fixture-installed';
  }

  if (stateCase.stepId === 'draft-restoration') {
    const boardId = process.env.UI_BASELINE_SYNTHETIC_BOARD_ID || 'BBSMSTR_AAAAAAAAAAAA';
    await page.addInitScript(({ storageKey }) => {
      localStorage.setItem(storageKey, JSON.stringify({
        title: 'UI_BASELINE_DRAFT_TITLE',
        content: '<p>UI_BASELINE_DRAFT_CONTENT</p>',
        savedAt: '2026-08-21T00:00:00.000Z',
      }));
    }, { storageKey: `egov-draft-board_insert_${boardId}` });
    page.on('dialog', (dialog) => dialog.accept());
    preparation.coverage = 'synthetic-local-draft-installed';
  }

  return preparation;
}

function syntheticMutationFailure(reasonCode) {
  const error = new Error('synthetic mutation fixture failed');
  error.code = reasonCode;
  return error;
}

async function safeApiData(api, method, requestPath, {
  data,
  allowNotFound = false,
  reasonCode = 'synthetic-mutation-api-failed',
} = {}) {
  let response;
  try {
    response = await api.fetch(requestPath, {
      method,
      ...(data === undefined ? {} : { data }),
      failOnStatusCode: false,
    });
  } catch {
    throw syntheticMutationFailure(reasonCode);
  }
  if (allowNotFound && response.status() === 404) return null;
  if (response.status() < 200 || response.status() >= 300) {
    throw syntheticMutationFailure(reasonCode);
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw syntheticMutationFailure(reasonCode);
  }
  if (!payload || typeof payload !== 'object' || payload.success !== true) {
    throw syntheticMutationFailure(reasonCode);
  }
  return payload.data;
}

function withSafeQuery(requestPath, values) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) query.set(key, String(value));
  return `${requestPath}?${query.toString()}`;
}

async function firstVisibleLocator(locator, {
  maxAttempts = 100,
  intervalMs = 100,
  reasonCode = 'synthetic-mutation-ui-readback-failed',
} = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const count = await locator.count();
    for (let index = 0; index < count; index += 1) {
      const candidate = locator.nth(index);
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  throw syntheticMutationFailure(reasonCode);
}

function createSyntheticMutationFixture(stateCase, runNonce) {
  const suffix = sha256(`${runNonce}:${stateCase.caseId}`).slice(0, 12);
  return {
    userId: `uiqm${suffix}`,
    userName: `UIQ MUT ${suffix}`,
    secretValue: `Aa1!${randomBytes(16).toString('hex')}`,
    faqTitle: `UIQ MUT FAQ ${suffix}`,
    faqContent: `UIQ MUT ANSWER ${suffix}`,
    boardTitle: `UIQ MUT BOARD ${suffix}`,
    boardDescription: `UIQ MUT BOARD DESCRIPTION ${suffix}`,
    menuName: `UIQ MUT MENU ${suffix}`,
  };
}

function completedSyntheticMutationEvidence(id, stateCase) {
  if (stateCase?.requiredTaskEvidenceId !== id) {
    throw new Error('synthetic mutation evidence is not bound to the planned state case');
  }
  return createExecutedSyntheticMutationEvidence({
    id,
    caseId: stateCase.caseId,
    syntheticNamespace: SYNTHETIC_MUTATION_NAMESPACE,
    mutationObserved: 'observed',
    authoritativeReadback: 'observed',
    rollbackReadback: 'observed',
    cleanupReadback: 'zero-active-residue',
    activeResidueCount: 0,
  });
}

async function readSyntheticUser(api, userId, { allowNotFound = false } = {}) {
  return safeApiData(api, 'GET', `/api/v1/admin/system/users/${encodeURIComponent(userId)}`, {
    allowNotFound,
    reasonCode: 'synthetic-user-readback-failed',
  });
}

async function createSyntheticUser(api, fixture) {
  const createdId = await safeApiData(api, 'POST', '/api/v1/admin/system/users', {
    data: {
      userId: fixture.userId,
      userNm: fixture.userName,
      pswd: fixture.secretValue,
      role: 'USER',
      userSttsCd: 'P',
    },
    reasonCode: 'synthetic-user-create-failed',
  });
  if (createdId !== fixture.userId) throw syntheticMutationFailure('synthetic-user-create-readback-mismatch');
  const created = await readSyntheticUser(api, fixture.userId);
  if (created?.userId !== fixture.userId
    || created?.userNm !== fixture.userName
    || created?.userSttsCd !== 'P') {
    throw syntheticMutationFailure('synthetic-user-create-readback-mismatch');
  }
}

async function readSyntheticUserStatus(api, userId) {
  const user = await readSyntheticUser(api, userId);
  return user?.userSttsCd;
}

async function waitForSyntheticUserStatus(api, userId, expectedStatus) {
  const observed = await pollForExpectedValue({
    readValue: () => readSyntheticUserStatus(api, userId),
    expectedValue: expectedStatus,
    maxAttempts: 100,
    intervalMs: 100,
  });
  if (!observed) throw syntheticMutationFailure('synthetic-user-status-readback-failed');
}

async function cleanupSyntheticUser(api, fixture) {
  const existing = await readSyntheticUser(api, fixture.userId, { allowNotFound: true });
  if (existing !== null) {
    await safeApiData(api, 'DELETE', `/api/v1/admin/system/users/${encodeURIComponent(fixture.userId)}`, {
      reasonCode: 'synthetic-user-cleanup-failed',
    });
  }
}

async function syntheticUserResidueCount(api, fixture) {
  const existing = await readSyntheticUser(api, fixture.userId, { allowNotFound: true });
  return existing === null ? 0 : 1;
}

async function selectSyntheticUser(page, fixture) {
  const search = page.getByPlaceholder('검색어를 입력하세요...');
  await search.fill(fixture.userName);
  await firstVisibleLocator(page.getByText(fixture.userName, { exact: true }));
  const checkbox = await firstVisibleLocator(page.getByRole('checkbox', { name: '항목 선택', exact: true }));
  await checkbox.click();
}

async function openBulkStatusDialog(page, statusLabel) {
  const action = await firstVisibleLocator(page.getByRole('button', { name: '상태 변경', exact: true }));
  await action.click();
  const dialog = page.getByRole('dialog', { name: '사용자 상태 일괄 변경', exact: true });
  await dialog.waitFor({ state: 'visible', timeout: 10_000 });
  await dialog.getByRole('radio', { name: statusLabel, exact: true }).click();
  return dialog;
}

async function submitBulkStatus(page, statusLabel) {
  const dialog = await openBulkStatusDialog(page, statusLabel);
  await dialog.getByRole('button', { name: '상태 일괄 적용', exact: true }).click();
  return dialog;
}

async function listExactFaqPosts(api, fixture) {
  const boardId = process.env.UI_BASELINE_SYNTHETIC_FAQ_BOARD_ID || DEFAULT_SYNTHETIC_FAQ_BOARD_ID;
  const data = await safeApiData(api, 'GET', withSafeQuery(
    `/api/v1/boards/${encodeURIComponent(boardId)}`,
    { searchCnd: '0', searchWrd: fixture.faqTitle, page: 0, size: 100 },
  ), { reasonCode: 'synthetic-faq-list-readback-failed' });
  const list = Array.isArray(data?.list) ? data.list : [];
  return list.filter((item) => item?.pstTtl === fixture.faqTitle && item?.useYn !== 'N');
}

async function waitForExactFaqPost(api, fixture) {
  let matched;
  const observed = await pollForExpectedValue({
    readValue: async () => {
      const matches = await listExactFaqPosts(api, fixture);
      matched = matches.length === 1 ? matches[0] : undefined;
      return Boolean(matched);
    },
    expectedValue: true,
    maxAttempts: 100,
    intervalMs: 100,
  });
  if (!observed || !Number.isFinite(Number(matched?.pstSn))) {
    throw syntheticMutationFailure('synthetic-faq-authoritative-readback-failed');
  }
  return matched;
}

async function assertFaqDetail(api, fixture, pstSn, {
  expectedContentKind = 'semantic-plain-text',
} = {}) {
  const boardId = process.env.UI_BASELINE_SYNTHETIC_FAQ_BOARD_ID || DEFAULT_SYNTHETIC_FAQ_BOARD_ID;
  const detail = await safeApiData(
    api,
    'GET',
    `/api/v1/boards/${encodeURIComponent(boardId)}/posts/${encodeURIComponent(String(pstSn))}`,
    { reasonCode: 'synthetic-faq-detail-readback-failed' },
  );
  const contentKind = classifySyntheticRichTextReadback({
    expectedPlainText: fixture.faqContent,
    observedValue: detail?.pstCn,
  });
  if (detail?.pstTtl !== fixture.faqTitle || contentKind !== expectedContentKind) {
    throw syntheticMutationFailure('synthetic-faq-detail-readback-mismatch');
  }
}

async function seedSyntheticFaq(api, fixture) {
  const boardId = process.env.UI_BASELINE_SYNTHETIC_FAQ_BOARD_ID || DEFAULT_SYNTHETIC_FAQ_BOARD_ID;
  const pstSn = await safeApiData(api, 'POST', '/api/v1/boards/posts', {
    data: {
      bbsId: boardId,
      pstTtl: fixture.faqTitle,
      pstCn: fixture.faqContent,
      scrtYn: 'N',
      useYn: 'Y',
    },
    reasonCode: 'synthetic-faq-create-failed',
  });
  if (!Number.isFinite(Number(pstSn))) throw syntheticMutationFailure('synthetic-faq-create-readback-mismatch');
  await assertFaqDetail(api, fixture, pstSn);
  return Number(pstSn);
}

async function cleanupSyntheticFaq(api, fixture) {
  const boardId = process.env.UI_BASELINE_SYNTHETIC_FAQ_BOARD_ID || DEFAULT_SYNTHETIC_FAQ_BOARD_ID;
  const matches = await listExactFaqPosts(api, fixture);
  for (const match of matches) {
    if (!Number.isFinite(Number(match?.pstSn))) throw syntheticMutationFailure('synthetic-faq-cleanup-failed');
    await safeApiData(
      api,
      'DELETE',
      `/api/v1/boards/${encodeURIComponent(boardId)}/posts/${encodeURIComponent(String(match.pstSn))}`,
      { reasonCode: 'synthetic-faq-cleanup-failed' },
    );
  }
}

async function syntheticFaqResidueCount(api, fixture) {
  return (await listExactFaqPosts(api, fixture)).length;
}

async function createAdminMutationContext(browser, baseOrigin) {
  if (!existsSync(adminStatePath)) {
    const error = new Error('required auth state is missing');
    error.code = 'auth-state-missing';
    throw error;
  }
  return browser.newContext({
    baseURL: baseOrigin,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    storageState: adminStatePath,
  });
}

async function fillFaqComposer(page, fixture) {
  await page.getByRole('textbox', { name: '게시글 제목', exact: true }).fill(fixture.faqTitle);
  const editor = await firstVisibleLocator(page.getByRole('textbox', { name: '게시글 본문 내용', exact: true }));
  await editor.fill(fixture.faqContent);
  await page.getByRole('button', { name: '게시글 등록', exact: true }).click();
}

async function flattenMenus(items, output = []) {
  for (const item of Array.isArray(items) ? items : []) {
    output.push(item);
    if (Array.isArray(item?.children)) await flattenMenus(item.children, output);
  }
  return output;
}

async function exactSyntheticMenus(api, fixture) {
  const all = await safeApiData(api, 'GET', '/api/v1/admin/system/menus/all', {
    reasonCode: 'synthetic-board-menu-readback-failed',
  });
  return (await flattenMenus(all)).filter((menu) => menu?.menuNm === fixture.menuName);
}

async function exactSyntheticBoards(api, fixture) {
  const data = await safeApiData(api, 'GET', withSafeQuery(
    '/api/v1/admin/system/board-masters',
    { searchWrd: fixture.boardTitle, pageIndex: 1, recordCountPerPage: 100 },
  ), { reasonCode: 'synthetic-board-readback-failed' });
  const list = Array.isArray(data?.list) ? data.list : [];
  return list.filter((board) => board?.bbsTtl === fixture.boardTitle);
}

async function waitForSyntheticBoardDeploy(api, fixture) {
  let board;
  let menu;
  const observed = await pollForExpectedValue({
    readValue: async () => {
      const boards = await exactSyntheticBoards(api, fixture);
      const menus = await exactSyntheticMenus(api, fixture);
      board = boards.length === 1 ? boards[0] : undefined;
      menu = menus.length === 1 ? menus[0] : undefined;
      return Boolean(board && menu);
    },
    expectedValue: true,
    maxAttempts: 100,
    intervalMs: 100,
  });
  const expectedRoute = board?.bbsId
    ? `/admin/community/boards/select-board-list?bbsId=${board.bbsId}`
    : null;
  if (!observed
    || !board?.bbsId
    || board.useYn !== 'Y'
    || menu?.useYn !== 'N'
    || menu?.modernRoute !== expectedRoute) {
    throw syntheticMutationFailure('synthetic-board-deploy-readback-failed');
  }
}

async function cleanupSyntheticBoardDeploy(api, fixture) {
  const menus = await exactSyntheticMenus(api, fixture);
  for (const menu of menus) {
    if (!Number.isFinite(Number(menu?.menuNo))) throw syntheticMutationFailure('synthetic-board-cleanup-failed');
    await safeApiData(api, 'DELETE', `/api/v1/admin/system/menus/${encodeURIComponent(String(menu.menuNo))}`, {
      reasonCode: 'synthetic-board-cleanup-failed',
    });
  }
  const boards = await exactSyntheticBoards(api, fixture);
  for (const board of boards) {
    if (typeof board?.bbsId !== 'string' || board.bbsId.length === 0) {
      throw syntheticMutationFailure('synthetic-board-cleanup-failed');
    }
    if (board.useYn !== 'N') {
      await safeApiData(api, 'DELETE', `/api/v1/admin/system/board-masters/${encodeURIComponent(board.bbsId)}`, {
        reasonCode: 'synthetic-board-cleanup-failed',
      });
    }
    await safeApiData(
      api,
      'DELETE',
      `/api/v1/admin/system/board-masters/${encodeURIComponent(board.bbsId)}/physical`,
      { reasonCode: 'synthetic-board-cleanup-failed' },
    );
  }
}

async function syntheticBoardResidueCount(api, fixture) {
  const [boards, menus] = await Promise.all([
    exactSyntheticBoards(api, fixture),
    exactSyntheticMenus(api, fixture),
  ]);
  return boards.length + menus.length;
}

async function completeBoardWizard(page, fixture) {
  await page.locator('#bbsTtl').fill(fixture.boardTitle);
  await page.locator('#bbsExpln').fill(fixture.boardDescription);
  await page.getByRole('button', { name: /다음 단계로/ }).click();
  await page.getByRole('heading', { level: 3, name: '템플릿 선택', exact: true })
    .waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByRole('button', { name: /다음 단계로/ }).click();
  await page.getByRole('heading', { level: 3, name: '접근 권한 안내', exact: true })
    .waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByRole('button', { name: /다음 단계로/ }).click();
  await page.getByRole('heading', { level: 3, name: '메뉴 배포', exact: true })
    .waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByPlaceholder('메뉴에 표시될 이름을 입력하세요').fill(fixture.menuName);
  await page.getByRole('button', { name: '게시판 생성 및 메뉴 배포', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: '게시판 생성 완료', exact: true })
    .waitFor({ state: 'visible', timeout: 30_000 });
}

async function exerciseState(page, stateCase, preparation, { browser, baseOrigin, mutationRunNonce }) {
  switch (stateCase.stepId) {
    case 'invalid-credentials': {
      const idInput = page.locator('input[name="id"]');
      const secretInput = page.locator('input[name="password"]');
      const { actorValue, secretValue } = validateInvalidCredentialsProbeFixture({
        actorValue: 'UIQInvalidActor9',
        secretValue: 'UIQInvalid9!',
      });
      await idInput.fill(actorValue);
      await secretInput.fill(secretValue);
      await page.getByRole('button', { name: '로그인', exact: true }).click();
      const alertVisible = await visibleWithin(page.getByRole('alert'), 15_000);
      const focusReturned = await pollForExpectedValue({
        readValue: () => idInput.evaluate((element) => document.activeElement === element),
        expectedValue: true,
        maxAttempts: 12,
        intervalMs: 0,
        wait: () => advanceAnimationFrame(page),
      });
      preparation.coverage = 'invalid-login-state-prepared';
      preparation.assertions.push({ id: 'error-alert-visible', passed: alertVisible });
      preparation.assertions.push({ id: 'focus-returned-to-actor-field', passed: focusReturned });
      break;
    }
    case 'successful-login': {
      const actor = process.env.UI_BASELINE_ADMIN_ID;
      const secret = process.env.UI_BASELINE_ADMIN_SECRET;
      if (!actor || !secret) {
        preparation.coverage = 'blocked-missing-ephemeral-login-credentials';
        preparation.taskEvidence.push(createNotExecutedTaskEvidence({
          id: 'successful-login-executed',
          reasonCode: 'ephemeral-login-credentials-required',
        }));
        break;
      }
      await page.locator('input[name="id"]').fill(actor);
      await page.locator('input[name="password"]').fill(secret);
      const started = performance.now();
      await page.getByRole('button', { name: '로그인', exact: true }).click();
      await page.waitForURL((url) => url.pathname === '/admin', { timeout: 30_000 });
      await page.getByRole('heading', { level: 1, name: '관리자 업무 현황', exact: true })
        .waitFor({ state: 'visible', timeout: 30_000 });
      preparation.coverage = 'successful-login-and-safe-return-prepared';
      preparation.assertions.push({ id: 'safe-relative-return-complete', passed: true });
      preparation.automationStepDurationMs = Math.round(performance.now() - started);
      break;
    }
    case 'filtered-zero': {
      const search = page.getByRole('textbox', { name: '데이터 검색' });
      await search.fill('UI_BASELINE_NO_MATCH_9X8Y7Z');
      await search.press('Enter');
      const emptyVisible = await visibleWithin(
        page.locator('[data-testid="empty-state-display"]:visible')
          .filter({ hasText: /검색 결과가 없습니다/ })
          .first(),
        20_000,
      );
      const fixtureCounts = preparation.zeroFixtureCounts?.() ?? { matchedRequestCount: 0, servedFixtureCount: 0 };
      preparation.coverage = 'synthetic-filtered-zero-prepared';
      preparation.assertions.push({ id: 'zero-fixture-request-matched', passed: fixtureCounts.matchedRequestCount > 0 });
      preparation.assertions.push({ id: 'zero-fixture-served', passed: fixtureCounts.servedFixtureCount > 0 });
      preparation.assertions.push({ id: 'filtered-zero-distinct', passed: emptyVisible });
      break;
    }
    case 'server-error': {
      const search = page.getByRole('textbox', { name: '데이터 검색' });
      preparation.armInjectedFailure?.();
      await search.fill('UI_BASELINE_FAILURE_PROBE');
      await search.press('Enter');
      const retry = page.getByRole('button', { name: '데이터 다시 불러오기', exact: true }).first();
      const errorVisible = await visibleWithin(retry, 20_000);
      const valuePreserved = await search.inputValue().then((value) => value.length > 0).catch(() => false);
      preparation.releaseInjectedFailure?.();
      if (errorVisible) await retry.click();
      const recovered = errorVisible
        ? await retry.waitFor({ state: 'hidden', timeout: 20_000 }).then(() => true).catch(() => false)
        : false;
      preparation.coverage = 'scoped-5xx-and-retry-prepared';
      preparation.assertions.push({ id: 'server-error-distinct-from-empty', passed: errorVisible });
      preparation.assertions.push({ id: 'filter-input-preserved', passed: valuePreserved });
      preparation.assertions.push({ id: 'scoped-retry-recovered', passed: recovered });
      break;
    }
    case 'user-hub-ready': {
      const fixture = createSyntheticMutationFixture(stateCase, mutationRunNonce);
      const api = page.context().request;
      await runSyntheticMutationLifecycle({
        execute: async () => {
          await createSyntheticUser(api, fixture);
          await selectSyntheticUser(page, fixture);
          const mutateDialog = await submitBulkStatus(page, '승인 대기');
          await waitForSyntheticUserStatus(api, fixture.userId, 'A');
          await mutateDialog.waitFor({ state: 'hidden', timeout: 10_000 });
          const rollbackDialog = await submitBulkStatus(page, '정상');
          await waitForSyntheticUserStatus(api, fixture.userId, 'P');
          await rollbackDialog.waitFor({ state: 'hidden', timeout: 10_000 });
        },
        cleanup: () => cleanupSyntheticUser(api, fixture),
        readActiveResidueCount: () => syntheticUserResidueCount(api, fixture),
      });
      preparation.coverage = 'synthetic-user-mutation-readback-rollback-complete';
      preparation.assertions.push({ id: 'single-synthetic-user-status-mutation-readback', passed: true });
      preparation.assertions.push({ id: 'synthetic-user-status-rollback-readback', passed: true });
      preparation.taskEvidence.push(completedSyntheticMutationEvidence(
        'role-status-mutation-readback-executed',
        stateCase,
      ));
      break;
    }
    case 'mutation-error': {
      const fixture = createSyntheticMutationFixture(stateCase, mutationRunNonce);
      const api = page.context().request;
      await runSyntheticMutationLifecycle({
        execute: async () => {
          await createSyntheticUser(api, fixture);
          await selectSyntheticUser(page, fixture);
          preparation.armInjectedFailure?.();
          const dialog = await openBulkStatusDialog(page, '승인 대기');
          await dialog.getByRole('button', { name: '상태 일괄 적용', exact: true }).click();
          await firstVisibleLocator(page.getByText('상태 변경 중 오류 발생', { exact: true }), {
            reasonCode: 'synthetic-user-error-feedback-not-observed',
          });
          await waitForSyntheticUserStatus(api, fixture.userId, 'P');
          preparation.releaseInjectedFailure?.();
          await dialog.getByRole('button', { name: '상태 일괄 적용', exact: true }).click();
          await waitForSyntheticUserStatus(api, fixture.userId, 'A');
          await dialog.waitFor({ state: 'hidden', timeout: 10_000 });
          const rollbackDialog = await submitBulkStatus(page, '정상');
          await waitForSyntheticUserStatus(api, fixture.userId, 'P');
          await rollbackDialog.waitFor({ state: 'hidden', timeout: 10_000 });
          if (preparation.injectedFailureCount?.() !== 1) {
            throw syntheticMutationFailure('synthetic-user-error-injection-count-mismatch');
          }
        },
        cleanup: async () => {
          preparation.releaseInjectedFailure?.();
          await cleanupSyntheticUser(api, fixture);
        },
        readActiveResidueCount: () => syntheticUserResidueCount(api, fixture),
      });
      preparation.coverage = 'synthetic-user-error-recovery-rollback-complete';
      preparation.assertions.push({ id: 'synthetic-user-error-preserved-authoritative-status', passed: true });
      preparation.assertions.push({ id: 'synthetic-user-retry-and-rollback-readback', passed: true });
      preparation.taskEvidence.push(completedSyntheticMutationEvidence(
        'synthetic-role-status-rollback-complete',
        stateCase,
      ));
      break;
    }
    case 'composer-ready': {
      await page.getByRole('button', { name: '게시글 등록', exact: true }).click();
      const validationVisible = await visibleWithin(
        page.locator('[role="alert"], [id$="-form-item-message"]').first(),
        10_000,
      );
      const title = page.getByRole('textbox', { name: '게시글 제목' });
      const focusOnTitle = await title.evaluate((element) => document.activeElement === element).catch(() => false);
      preparation.coverage = 'empty-composer-validation-prepared';
      preparation.assertions.push({ id: 'validation-visible', passed: validationVisible });
      preparation.assertions.push({ id: 'validation-focus-on-first-field', passed: focusOnTitle });
      break;
    }
    case 'draft-restoration': {
      const title = page.getByRole('textbox', { name: '게시글 제목' });
      const restored = await pollForExpectedValue({
        readValue: () => title.inputValue(),
        expectedValue: 'UI_BASELINE_DRAFT_TITLE',
        maxAttempts: 100,
        intervalMs: 100,
      });
      preparation.coverage = 'synthetic-draft-restoration-prepared';
      preparation.assertions.push({ id: 'draft-restored-after-reload-context', passed: restored });
      break;
    }
    case 'user-faq-search': {
      const fixture = createSyntheticMutationFixture(stateCase, mutationRunNonce);
      const adminContext = await createAdminMutationContext(browser, baseOrigin);
      try {
        const api = adminContext.request;
        await runSyntheticMutationLifecycle({
          execute: async () => {
            await seedSyntheticFaq(api, fixture);
            const search = page.getByRole('textbox', { name: '도움말 키워드 검색', exact: true });
            await search.fill(fixture.faqTitle);
            const item = await firstVisibleLocator(
              page.getByRole('button').filter({ hasText: fixture.faqTitle }),
              { reasonCode: 'synthetic-faq-user-readback-failed' },
            );
            await item.click();
            await firstVisibleLocator(page.getByText(fixture.faqContent, { exact: true }), {
              reasonCode: 'synthetic-faq-user-answer-readback-failed',
            });
          },
          cleanup: () => cleanupSyntheticFaq(api, fixture),
          readActiveResidueCount: () => syntheticFaqResidueCount(api, fixture),
        });
      } finally {
        await adminContext.close().catch(() => {});
      }
      preparation.coverage = 'synthetic-faq-cross-role-readback-cleanup-complete';
      preparation.assertions.push({ id: 'synthetic-faq-user-question-answer-readback', passed: true });
      preparation.taskEvidence.push(completedSyntheticMutationEvidence(
        'cross-role-created-answer-readback',
        stateCase,
      ));
      break;
    }
    case 'wizard-validation': {
      await page.getByRole('button', { name: /다음 단계로/ }).click();
      const validationVisible = await visibleWithin(page.getByText(/게시판 명칭은 최소 2글자/), 5_000);
      const firstStepStillActive = await visibleWithin(
        page.getByRole('heading', { level: 3, name: '기본 설정', exact: true }),
        5_000,
      );
      const focusOnName = await page.locator('#bbsTtl')
        .evaluate((element) => document.activeElement === element).catch(() => false);
      preparation.coverage = 'wizard-empty-next-validation-probed';
      preparation.assertions.push({ id: 'wizard-validation-visible', passed: validationVisible });
      preparation.assertions.push({ id: 'wizard-remains-on-invalid-step', passed: firstStepStillActive });
      preparation.assertions.push({ id: 'wizard-focuses-invalid-field', passed: focusOnName });
      break;
    }
    case 'admin-compose-faq': {
      const fixture = createSyntheticMutationFixture(stateCase, mutationRunNonce);
      const api = page.context().request;
      await runSyntheticMutationLifecycle({
        execute: async () => {
          await fillFaqComposer(page, fixture);
          const post = await waitForExactFaqPost(api, fixture);
          await assertFaqDetail(api, fixture, post.pstSn, {
            expectedContentKind: 'canonical-tiptap-html',
          });
        },
        cleanup: () => cleanupSyntheticFaq(api, fixture),
        readActiveResidueCount: () => syntheticFaqResidueCount(api, fixture),
      });
      await page.goto(`${stateCase.identity.route}${resolveQueryTemplate(stateCase)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForReadyHeading(page, stateCase);
      preparation.coverage = 'synthetic-faq-ui-save-readback-cleanup-complete';
      preparation.assertions.push({ id: 'synthetic-faq-authoritative-save-readback', passed: true });
      preparation.taskEvidence.push(completedSyntheticMutationEvidence(
        'faq-authoritative-save-readback',
        stateCase,
      ));
      break;
    }
    case 'admin-faq-readback': {
      const fixture = createSyntheticMutationFixture(stateCase, mutationRunNonce);
      const api = page.context().request;
      await runSyntheticMutationLifecycle({
        execute: async () => {
          await seedSyntheticFaq(api, fixture);
          const search = page.getByRole('textbox', { name: '지식 검색어', exact: true });
          await search.fill(fixture.faqTitle);
          await firstVisibleLocator(
            page.getByRole('button', { name: `${fixture.faqTitle} 상세 보기`, exact: true }),
            { reasonCode: 'synthetic-faq-admin-readback-failed' },
          );
        },
        cleanup: () => cleanupSyntheticFaq(api, fixture),
        readActiveResidueCount: () => syntheticFaqResidueCount(api, fixture),
      });
      preparation.coverage = 'synthetic-faq-admin-readback-cleanup-complete';
      preparation.assertions.push({ id: 'synthetic-faq-admin-created-item-readback', passed: true });
      preparation.taskEvidence.push(completedSyntheticMutationEvidence(
        'admin-created-faq-readback',
        stateCase,
      ));
      break;
    }
    case 'wizard-ready': {
      const fixture = createSyntheticMutationFixture(stateCase, mutationRunNonce);
      const api = page.context().request;
      await runSyntheticMutationLifecycle({
        execute: async () => {
          await completeBoardWizard(page, fixture);
          await waitForSyntheticBoardDeploy(api, fixture);
        },
        cleanup: () => cleanupSyntheticBoardDeploy(api, fixture),
        readActiveResidueCount: () => syntheticBoardResidueCount(api, fixture),
      });
      preparation.coverage = 'synthetic-board-deploy-readback-cleanup-complete';
      preparation.assertions.push({ id: 'synthetic-board-single-deploy-authoritative-readback', passed: true });
      preparation.taskEvidence.push(completedSyntheticMutationEvidence(
        'single-deploy-authoritative-readback',
        stateCase,
      ));
      break;
    }
    case ONBOARDING_STEP_ID: {
      const dialog = await waitForOnboardingDialog(page);
      const descriptionBound = await dialog.evaluate((element) => {
        const describedBy = element.getAttribute('aria-describedby');
        if (!describedBy) return false;
        return describedBy.split(/\s+/).every((id) => {
          const description = document.getElementById(id);
          return Boolean(description?.textContent?.trim());
        });
      });
      const focusInside = await dialog.evaluate((element) => (
        document.activeElement instanceof HTMLElement && element.contains(document.activeElement)
      ));
      const closeAvailable = await visibleWithin(
        dialog.getByRole('button', { name: '온보딩 닫기', exact: true }),
        5_000,
      );
      preparation.coverage = 'first-use-onboarding-open-prepared';
      preparation.assertions.push({ id: 'onboarding-description-bound', passed: descriptionBound });
      preparation.assertions.push({ id: 'onboarding-focus-inside', passed: focusInside });
      preparation.assertions.push({ id: 'onboarding-dismiss-action-available', passed: closeAvailable });
      break;
    }
    default:
      break;
  }
}

function redactedAxe(analysis) {
  return analysis.violations.map((violation) => ({
    ruleId: violation.id,
    impact: violation.impact ?? 'not-observed',
    wcagTags: violation.tags.filter((tag) => /^wcag/.test(tag)),
    nodeCount: violation.nodes.length,
    nodes: violation.nodes.map((_, index) => ({ locator: `redacted-node-${index + 1}` })),
  }));
}

async function auditStateCase(browser, stateCase, manifest, baseOrigin, mutationRunNonce) {
  let context;
  let stage = 'context';
  try {
    context = await createContext(browser, stateCase, baseOrigin);
    const page = await context.newPage();
    stage = 'first-use-preference-preparation';
    await prepareFirstUseOnboardingPage(page, stateCase, baseOrigin);
    const diagnostics = installSafeDiagnostics(page, stateCase);
    const preparation = await installStatePreparation(page, stateCase);
    stage = 'navigation';
    const query = resolveQueryTemplate(stateCase);
    const response = await page.goto(`${stateCase.identity.route}${query}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    stage = 'readiness';
    if (stateCase.stepId !== 'successful-login') await waitForReadyHeading(page, stateCase);
    stage = 'pre-state-stabilization';
    await disableAnimations(page);
    stage = 'state-preparation';
    await exerciseState(page, stateCase, preparation, { browser, baseOrigin, mutationRunNonce });
    if (stateCase.stepId === 'successful-login' && preparation.coverage.startsWith('blocked-')) {
      await page.getByRole('heading', { level: 1, name: '엔터프라이즈', exact: true })
        .waitFor({ state: 'visible', timeout: 30_000 });
    }
    stage = 'stabilization';
    await disableAnimations(page);
    stage = 'visual-readiness';
    const visualReadiness = await observeStableVisualReadiness({
      readSample: () => readVisualReadinessSample(page),
      advanceFrame: () => settleVisualReadinessFrame(page),
      minimumSamples: 12,
      requiredConsecutiveSamples: 3,
      maxSamples: 24,
    });
    if (visualReadiness.status !== 'ready') {
      throw new Error('bounded visual readiness was not observed');
    }
    stage = 'responsive';
    const responsiveObservation = await observeStableResponsiveGeometry({
      readSample: () => readResponsiveGeometry(page),
      advanceFrame: () => advanceAnimationFrame(page),
      requiredConsecutiveSamples: 3,
      maxSamples: 12,
    });
    const responsive = responsiveObservation.sample;
    const responsiveGeometryStable = responsiveObservation.status === 'stable';
    stage = 'accessibility-readiness';
    const accessibilityReadiness = await waitForStandardDataTableAccessibilityReadiness(page);
    if (accessibilityReadiness.status !== 'ready') {
      throw new Error('standard data table accessibility readiness was not observed');
    }
    stage = 'axe';
    const analysis = await new AxeBuilder({ page })
      .withTags(manifest.automation.axe.runOnlyTags)
      .analyze();
    const axe = redactedAxe(analysis);
    const failedAssertions = preparation.assertions.filter(({ passed }) => !passed).length;
    const expectedInjectedHttp5 = preparation.injectedFailureCount?.() ?? 0;
    const unexpectedClientErrorCount = diagnostics.responseCategoryCounts[
      SAFE_REQUEST_CATEGORIES.UNEXPECTED_HTTP_4XX
    ];
    const unexpectedServerErrorCount = ['server-error', 'mutation-error'].includes(stateCase.stepId)
      ? Math.max(0, diagnostics.http5xx - expectedInjectedHttp5)
      : diagnostics.http5xx;
    const unexpectedStatusCount = unexpectedClientErrorCount + unexpectedServerErrorCount;
    const notExecutedTaskCount = preparation.taskEvidence
      .filter(({ status }) => status === 'not-executed').length;
    const blockedPrerequisite = preparation.coverage.startsWith('blocked-')
      || notExecutedTaskCount > 0;
    const invalid = !response
      || response.status() >= 400
      || unexpectedStatusCount > 0
      || diagnostics.pageException > 0
      || diagnostics.apiRequestFailure > 0
      || diagnostics.otherRequestFailure > 0;
    const expectedRouteReached = new URL(page.url()).pathname === (
      stateCase.stepId === 'successful-login' && !preparation.coverage.startsWith('blocked-')
        ? '/admin'
        : stateCase.identity.route
    );
    const horizontalOverflowPx = Math.max(0, responsive.scrollWidth - responsive.clientWidth);
    const automatedCase = classifyAutomatedCaseOutcome({
      blockedPrerequisite,
      runtimeInvalid: invalid,
      responsiveGeometryStable,
      notExecutedTaskCount,
      failedAssertionCount: failedAssertions,
      expectedRouteReached,
      axeViolationCount: axe.length,
      horizontalOverflowPx,
      colorModeApplied: responsive.themeClassMatchesPreference,
    });
    return {
      caseId: stateCase.caseId,
      identity: stateCase.identity,
      status: automatedCase.status,
      automatedOutcome: automatedCase.outcome,
      automatedFindingCodes: automatedCase.findingCodes,
      stateCoverage: preparation.coverage,
      assertions: preparation.assertions,
      taskEvidence: preparation.taskEvidence,
      failedAssertionCount: failedAssertions,
      automationStepDurationMs: preparation.automationStepDurationMs ?? null,
      navigation: {
        documentStatus: response?.status() ?? null,
        expectedRouteReached,
      },
      diagnostics,
      expectedInjectedHttp5,
      responsive: {
        viewportWidth: responsive.viewportWidth,
        horizontalOverflowPx,
        maxHorizontalOverflowPxObserved: responsiveObservation.maxHorizontalOverflowPxObserved,
        colorModeApplied: responsive.themeClassMatchesPreference,
        geometryStatus: responsiveObservation.status,
        sampleCount: responsiveObservation.sampleCount,
        consecutiveStableSamples: responsiveObservation.consecutiveStableSamples,
        offenders: responsive.offenders,
      },
      axe,
      axeViolationCount: axe.length,
      invalidReasonCode: invalid
        ? 'unexpected-runtime-signal'
        : responsiveGeometryStable
          ? null
          : 'responsive-geometry-not-stable',
    };
  } catch (error) {
    return {
      caseId: stateCase.caseId,
      identity: stateCase.identity,
      status: 'invalid-run',
      automatedOutcome: 'automated-observation-invalid',
      automatedFindingCodes: [`${stage}-failed`],
      stateCoverage: 'not-observed',
      assertions: [],
      taskEvidence: [],
      failedAssertionCount: 0,
      automationStepDurationMs: null,
      navigation: { documentStatus: null, expectedRouteReached: false },
      diagnostics: createSafeDiagnosticsCounts(),
      expectedInjectedHttp5: 0,
      responsive: null,
      axe: [],
      axeViolationCount: 0,
      invalidReasonCode: error?.code === 'auth-state-missing'
        ? 'auth-state-missing'
        : classifySyntheticMutationFailureReason(error, `${stage}-failed`),
    };
  } finally {
    await context?.close().catch(() => {});
  }
}

function performanceSummary(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  const deviations = sorted.map((value) => Math.abs(value - median)).sort((a, b) => a - b);
  const deviationMiddle = Math.floor(deviations.length / 2);
  const medianAbsoluteDeviation = deviations.length % 2
    ? deviations[deviationMiddle]
    : (deviations[deviationMiddle - 1] + deviations[deviationMiddle]) / 2;
  return {
    median,
    minimum: sorted[0],
    maximum: sorted.at(-1),
    medianAbsoluteDeviation,
  };
}

class PerformanceStageError extends Error {
  constructor(failureStage) {
    super('performance probe stage failed');
    this.failureStage = failureStage;
  }
}

async function runPerformanceStage(failureStage, operation) {
  try {
    return await operation();
  } catch {
    throw new PerformanceStageError(failureStage);
  }
}

async function collectPagePerformance(page, baseOrigin, readyDurationMs) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const lcpDelivery = await observeLcpWithinBoundedFrames({
    readObserved: () => page.evaluate(() => {
      window.__uiqFlushPerformanceEntries?.();
      return Number.isFinite(window.__uiqMetrics?.lcp?.startTime);
    }),
    advanceFrame: () => advanceAnimationFrame(page),
    maxFrames: 60,
  });
  const { rawLcp, ...metrics } = await page.evaluate(({ origin, readyMs, delivery }) => {
    window.__uiqFlushPerformanceEntries?.();
    const scripts = performance.getEntriesByType('resource')
      .filter((entry) => entry.initiatorType === 'script' && new URL(entry.name).origin === origin)
      .map((entry) => ({
        resourcePath: new URL(entry.name).pathname,
        transferBytes: entry.transferSize,
        encodedBodyBytes: entry.encodedBodySize,
        decodedBodyBytes: entry.decodedBodySize,
      }));
    const lcp = window.__uiqMetrics?.lcp;
    const lcpElement = lcp?.element instanceof Element ? lcp.element : null;
    return {
      routeJsTransferBytes: scripts.reduce((sum, entry) => sum + entry.transferBytes, 0),
      routeJsResources: scripts,
      lcpMs: typeof lcp?.startTime === 'number' ? lcp.startTime : null,
      rawLcp: lcp ? {
        tag: lcpElement?.tagName?.toLowerCase() ?? null,
        role: lcpElement?.getAttribute('role') ?? null,
        resourceUrl: typeof lcp.url === 'string' ? lcp.url : null,
        size: typeof lcp.size === 'number' ? lcp.size : null,
      } : null,
      lcpDelivery: delivery,
      cls: window.__uiqMetrics?.cls ?? 0,
      largestShiftTag: window.__uiqMetrics?.largestShiftTag ?? null,
      readinessLatencyProxyMs: Math.round(readyMs),
    };
  }, { origin: baseOrigin, readyMs: readyDurationMs, delivery: lcpDelivery });
  return {
    ...metrics,
    lcp: sanitizeLcpObservation(rawLcp, baseOrigin),
  };
}

async function navigateForPerformance(page, stateCase) {
  if (stateCase.stepId === 'successful-login') {
    await page.goto(`${stateCase.identity.route}${resolveQueryTemplate(stateCase)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.getByRole('heading', { level: 1, name: '엔터프라이즈', exact: true })
      .waitFor({ state: 'visible', timeout: 30_000 });
    await page.locator('input[name="id"]').fill(process.env.UI_BASELINE_ADMIN_ID);
    await page.locator('input[name="password"]').fill(process.env.UI_BASELINE_ADMIN_SECRET);
    const started = performance.now();
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/admin', { timeout: 30_000 });
    await page.getByRole('heading', { level: 1, name: '관리자 업무 현황', exact: true })
      .waitFor({ state: 'visible', timeout: 30_000 });
    await disableAnimations(page);
    return performance.now() - started;
  }
  const started = performance.now();
  const response = await page.goto(`${stateCase.identity.route}${resolveQueryTemplate(stateCase)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  if (!response || response.status() >= 400) throw new Error('performance navigation failed');
  await waitForReadyHeading(page, stateCase);
  if (stateCase.stepId === ONBOARDING_STEP_ID) await waitForOnboardingDialog(page);
  await disableAnimations(page);
  return performance.now() - started;
}

async function measurePerformanceCase(browser, stateCase, manifest, baseOrigin) {
  const conditionRuns = [];
  for (let repetition = 1; repetition <= manifest.repeatPolicy.cold.repetitions; repetition += 1) {
    const context = await runPerformanceStage(
      'cold-context',
      () => createContext(browser, stateCase, baseOrigin, { cacheDisabled: true }),
    );
    try {
      const page = await context.newPage();
      await runPerformanceStage(
        'cold-preference-preparation',
        () => prepareFirstUseOnboardingPage(page, stateCase, baseOrigin),
      );
      const readyDuration = await runPerformanceStage(
        'cold-navigation',
        () => navigateForPerformance(page, stateCase),
      );
      conditionRuns.push({
        condition: 'cold',
        repetition,
        metrics: await runPerformanceStage(
          'cold-metrics',
          () => collectPagePerformance(page, baseOrigin, readyDuration),
        ),
      });
    } finally {
      await context.close();
    }
  }

  const warmContext = await runPerformanceStage(
    'warm-context',
    () => createContext(browser, stateCase, baseOrigin),
  );
  try {
    const prime = await warmContext.newPage();
    await runPerformanceStage(
      'warm-prime-preference-preparation',
      () => prepareFirstUseOnboardingPage(prime, stateCase, baseOrigin),
    );
    await runPerformanceStage(
      'warm-prime-navigation',
      () => navigateForPerformance(prime, stateCase),
    );
    await prime.close();
    if (stateCase.stepId === 'successful-login') await warmContext.clearCookies();
    for (let repetition = 1; repetition <= manifest.repeatPolicy.warm.repetitions; repetition += 1) {
      const page = await warmContext.newPage();
      await runPerformanceStage(
        'warm-preference-preparation',
        () => prepareFirstUseOnboardingPage(page, stateCase, baseOrigin),
      );
      const readyDuration = await runPerformanceStage(
        'warm-navigation',
        () => navigateForPerformance(page, stateCase),
      );
      conditionRuns.push({
        condition: 'warm',
        repetition,
        metrics: await runPerformanceStage(
          'warm-metrics',
          () => collectPagePerformance(page, baseOrigin, readyDuration),
        ),
      });
      await page.close();
      if (stateCase.stepId === 'successful-login') await warmContext.clearCookies();
    }
  } finally {
    await warmContext.close();
  }

  const summary = Object.fromEntries(['cold', 'warm'].map((condition) => {
    const runs = conditionRuns.filter((run) => run.condition === condition);
    return [condition, {
      routeJsTransferBytes: performanceSummary(runs.map((run) => run.metrics.routeJsTransferBytes)),
      lcpMs: performanceSummary(runs.flatMap((run) => run.metrics.lcpMs === null ? [] : [run.metrics.lcpMs])),
      cls: performanceSummary(runs.map((run) => run.metrics.cls)),
      readinessLatencyProxyMs: performanceSummary(runs.map((run) => run.metrics.readinessLatencyProxyMs)),
    }];
  }));
  const observation = classifyPerformanceObservation(conditionRuns, manifest.repeatPolicy);
  return {
    renderCaseId: stateCase.renderCaseId,
    status: observation.status,
    invalidReasonCode: observation.invalidReasonCode,
    failureStage: observation.failureStage,
    conditionRuns,
    summary,
  };
}

function manualEvidence(manifest) {
  return manifest.manualChecks.map((check) => ({
    checkId: check.id,
    status: check.id === 'nvda-chrome' ? 'blocked-external' : 'not-run-manual-review-required',
    evidenceKind: 'none',
  }));
}

function commonEnvironment(
  contract,
  execution,
  baseOrigin,
  browserVersion,
) {
  const { manifest, plan } = contract;
  const gitStatus = commandOutput('git', ['status', '--porcelain=v1', '--untracked-files=normal']);
  return {
    ...artifactIdentity(execution),
    protocolVersion: manifest.schemaVersion,
    runnerVersion: RUNNER_VERSION,
    startedAt: execution.startedAt,
    buildSha: execution.buildSha,
    workingTreeDirty: gitStatus.length > 0,
    buildInputTreeHash: execution.buildInputTreeHash,
    buildInputTreeHashVerifiedAtFinish: true,
    buildInputDirty: execution.dirtyBuildInputDiffHash !== null,
    dirtyBuildInputDiffHash: execution.dirtyBuildInputDiffHash,
    dirtyBuildInputDiffHashVerifiedAtFinish: true,
    protocolPath: contract.protocolPointer,
    protocolHash: execution.protocolHash,
    protocolHashVerifiedAtFinish: true,
    executionPlanHash: contract.executionPlanHash,
    frontendBuildId: execution.frontendBuildId,
    backendBuildId: execution.backendBuildId,
    baseOrigin,
    runtime: {
      node: process.version,
      pnpm: packageManagerVersion(),
      playwright: safeVersion(path.join(frontendRoot, 'node_modules', '@playwright', 'test', 'package.json')),
      chromium: browserVersion,
      axeCore: safeVersion(path.join(frontendRoot, 'node_modules', 'axe-core', 'package.json')),
      os: `${os.platform()}-${os.release()}-${os.arch()}`,
    },
    browserContract: {
      locale: manifest.automation.axe.locale,
      timezone: manifest.automation.axe.timezone,
      deviceScaleFactor: 1,
      zoomPercent: 100,
      forcedColors: 'none',
      reducedMotion: 'reduce-for-deterministic-automation',
    },
    manifestHash: contract.executionScenarioManifestHash,
    routeTruthHash: execution.routeTruthHash,
    privacyRuleHash: execution.privacyRuleHash,
    runnerHash: execution.runnerHash,
    coreHash: execution.coreHash,
    runnerContractHash: execution.runnerContractHash,
    scenarioContractHash: execution.scenarioContractHash,
    syntheticSeedLabel: sanitizeIdentifier(process.env.UI_BASELINE_SYNTHETIC_SEED_LABEL, 'isolated-synthetic-seed-unverified'),
    stackClassification: sanitizeIdentifier(process.env.UI_BASELINE_STACK_CLASSIFICATION, 'not-provided'),
    rolePreflight: 'derived-per-case-no-raw-identity-recorded',
    plannedRenderCases: plan.renderCases.length,
    plannedStateCases: plan.stateCases.length,
    executionAgent: 'automated-baseline-runner',
    manualReviewer: 'unassigned',
    redactionReviewer: 'unassigned',
  };
}

async function execute(contract, includePerformance) {
  const { manifest, plan } = contract;
  const baseOrigin = validateLoopbackOrigin(process.env.UI_BASELINE_WEB_URL);
  const artifactRoot = artifactRootFromManifest(manifest);
  const forbiddenKeys = manifest.privacy.forbiddenArtifactKeys;
  const stateResults = [];
  const performanceResults = [];
  const diagnosticLimit = Number.parseInt(process.env.UI_BASELINE_DIAGNOSTIC_LIMIT ?? '', 10);
  const genericDiagnostic = Number.isInteger(diagnosticLimit) && diagnosticLimit > 0;
  const mutationDiagnosticValue = process.env.UI_BASELINE_MUTATION_DIAGNOSTIC ?? '';
  if (mutationDiagnosticValue !== '' && mutationDiagnosticValue !== SYNTHETIC_MUTATION_DIAGNOSTIC) {
    throw new Error('unsupported synthetic mutation diagnostic mode');
  }
  const mutationDiagnostic = mutationDiagnosticValue === SYNTHETIC_MUTATION_DIAGNOSTIC;
  if (genericDiagnostic && mutationDiagnostic) {
    throw new Error('diagnostic execution modes are mutually exclusive');
  }
  const diagnostic = genericDiagnostic || mutationDiagnostic;
  const executionRequirements = captureExecutionPreflightRequirements({
    genericDiagnostic,
    mutationDiagnostic,
    includePerformance,
    baseOrigin,
  });
  const buildShaAtStart = commandOutput('git', ['rev-parse', 'HEAD']);
  const commitTreeIdAtStart = commandOutput('git', ['rev-parse', `${buildShaAtStart}^{tree}`]);
  const dirtyBuildInputDiffHashAtStart = dirtyBuildInputFingerprint();
  const buildInputTreeHashAtStart = sourceTreeHash(buildShaAtStart);
  if (commandOutput('git', ['rev-parse', 'HEAD']) !== buildShaAtStart) {
    throw new Error('baseline source provenance changed during preflight');
  }
  if (!diagnostic && dirtyBuildInputDiffHashAtStart !== null) {
    throw new Error('baseline full execution requires clean production build inputs');
  }
  const stackPreflight = attestExecutionStack({
    requirements: executionRequirements,
    buildSha: buildShaAtStart,
    buildInputTreeHash: buildInputTreeHashAtStart,
    commitTreeId: commitTreeIdAtStart,
  });
  const startedAt = new Date().toISOString();
  const executionId = createBaselineExecutionId();
  const execution = {
    baselineRunId: UI_QUALITY_BASELINE_RUN_ID,
    executionId,
    runnerVersion: RUNNER_VERSION,
    startedAt,
    buildSha: buildShaAtStart,
    buildInputTreeHash: buildInputTreeHashAtStart,
    dirtyBuildInputDiffHash: dirtyBuildInputDiffHashAtStart,
    protocolHash: baselineProtocolHash(contract, buildShaAtStart),
    executionScenarioManifestHash: contract.executionScenarioManifestHash,
    executionPlanHash: contract.executionPlanHash,
    routeTruthHash: routeTruthHash(),
    privacyRuleHash: sha256(Buffer.from(`${stableJson(manifest.privacy)}\n`, 'utf8')),
    frontendBuildId: stackPreflight.frontendBuildId,
    backendBuildId: stackPreflight.backendBuildId,
    ...toolingHashes(buildShaAtStart),
  };
  const workspace = createRunWorkspace({
    boundaryRoot: repoRoot,
    artifactRoot,
    executionId,
    diagnostic,
  });
  const root = workspace.stagingRoot;
  const progressPath = path.join(root, 'run-progress.json');
  writeRunArtifact(progressPath, {
    evidenceKind: 'baseline-run-progress-v2',
    runnerVersion: RUNNER_VERSION,
    startedAt,
    phase: 'initializing',
    plannedStateCaseCount: diagnostic ? null : plan.stateCases.length,
    completedStateCaseCount: 0,
    invalidStateCaseCount: 0,
    plannedPerformanceCaseCount: diagnostic ? 0 : plan.performanceCases.length,
    completedPerformanceCaseCount: 0,
    invalidPerformanceCaseCount: 0,
    final: false,
  }, forbiddenKeys, execution);
  const mutationRunNonce = randomBytes(16).toString('hex');
  const diagnosticRepresentatives = [];
  const diagnosticKeys = new Set();
  for (const stateCase of plan.stateCases) {
    const key = `${stateCase.scenarioId}/${stateCase.stepId}`;
    if (diagnosticKeys.has(key)) continue;
    diagnosticKeys.add(key);
    diagnosticRepresentatives.push(stateCase);
  }
  const stateCasesToExecute = mutationDiagnostic
    ? selectSyntheticMutationDiagnosticCases(plan.stateCases)
    : genericDiagnostic
      ? diagnosticRepresentatives.slice(0, diagnosticLimit)
      : plan.stateCases;

  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
    const environment = commonEnvironment(
      contract,
      execution,
      baseOrigin,
      browser.version(),
    );
    for (const [index, stateCase] of stateCasesToExecute.entries()) {
      process.stdout.write(`UIQ state ${index + 1}/${stateCasesToExecute.length} ${stateCase.caseId}\n`);
      const result = bindArtifactIdentity(
        await auditStateCase(
          browser,
          stateCase,
          manifest,
          baseOrigin,
          mutationRunNonce,
        ),
        execution,
      );
      stateResults.push(result);
      writeRunArtifact(path.join(root, 'checkpoints', `${result.caseId}.json`), result, forbiddenKeys, execution);
      writeRunArtifact(progressPath, {
        evidenceKind: 'baseline-run-progress-v2',
        runnerVersion: RUNNER_VERSION,
        startedAt,
        phase: 'state-cases',
        plannedStateCaseCount: diagnostic ? stateCasesToExecute.length : plan.stateCases.length,
        completedStateCaseCount: stateResults.length,
        invalidStateCaseCount: stateResults.filter(({ status }) => status === 'invalid-run').length,
        latestCaseId: result.caseId,
        latestStatus: result.status,
        final: false,
      }, forbiddenKeys, execution);
    }

    if (diagnostic) {
      await browser.close();
      browser = null;
      const finishedAt = new Date().toISOString();
      writeRunArtifact(path.join(root, 'diagnostic-summary.json'), {
        evidenceKind: 'diagnostic-summary-v2',
        runnerVersion: RUNNER_VERSION,
        startedAt,
        finishedAt,
        status: 'diagnostic-not-baseline-evidence',
        diagnosticKind: mutationDiagnostic ? SYNTHETIC_MUTATION_DIAGNOSTIC : 'journey-representative-limit',
        fullPlannedStateCaseCount: plan.stateCases.length,
        diagnosticStateCaseCount: stateCasesToExecute.length,
        completedStateCaseCount: stateResults.length,
        invalidStateCaseCount: stateResults.filter(({ status }) => status === 'invalid-run').length,
        buildInputTreeHash: buildInputTreeHashAtStart,
        buildInputTreeHashVerifiedAtFinish: true,
        dirtyBuildInputDiffHash: dirtyBuildInputDiffHashAtStart,
        dirtyBuildInputDiffHashVerifiedAtFinish: true,
        protocolHash: execution.protocolHash,
        protocolHashVerifiedAtFinish: true,
        cases: stateResults.map(({ caseId, status, invalidReasonCode, taskEvidence: caseTaskEvidence }) => ({
          caseId,
          status,
          invalidReasonCode,
          taskEvidence: caseTaskEvidence,
        })),
      }, forbiddenKeys, execution);
      finalizeStagedRunPublication({
        publicationKind: 'diagnostic',
        boundaryRoot: repoRoot,
        stagingRoot: root,
        publishedRoot: workspace.publishedRoot,
        prepareFinalMarker: () => ({
          entries: assertDiagnosticInventory(
            collectJsonArtifactEntries(root),
            execution,
            stateCasesToExecute.length + 2,
          ),
        }),
        verifyFinalProvenance: () => verifyFinalExecutionProvenance(
          contract,
          execution,
          stackPreflight.verifyAtFinish,
        ),
        createFinalMarker: () => ({
          evidenceKind: 'diagnostic-run-seal-v1',
          runnerVersion: RUNNER_VERSION,
          startedAt,
          finishedAt,
          phase: 'complete',
          diagnosticKind: mutationDiagnostic ? SYNTHETIC_MUTATION_DIAGNOSTIC : 'journey-representative-limit',
          plannedStateCaseCount: stateCasesToExecute.length,
          completedStateCaseCount: stateResults.length,
          invalidStateCaseCount: stateResults.filter(({ status }) => status === 'invalid-run').length,
          plannedPerformanceCaseCount: 0,
          completedPerformanceCaseCount: 0,
          invalidPerformanceCaseCount: 0,
          protocolHash: execution.protocolHash,
          protocolHashVerifiedAtFinish: true,
          final: true,
        }),
        writeFinalMarker: (_stagingRoot, marker) => {
          writeRunArtifact(progressPath, marker, forbiddenKeys, execution);
        },
      });
      return;
    }

    if (includePerformance) {
      const targetCases = plan.performanceCases;
      for (const [index, stateCase] of targetCases.entries()) {
        process.stdout.write(`UIQ performance ${index + 1}/${targetCases.length} ${stateCase.renderCaseId}\n`);
        let performanceResult;
        try {
          performanceResult = await measurePerformanceCase(browser, stateCase, manifest, baseOrigin);
        } catch (error) {
          performanceResult = performanceFailureRecord(
            stateCase.renderCaseId,
            error?.failureStage,
          );
        }
        performanceResults.push(bindArtifactIdentity(performanceResult, execution));
        writeRunArtifact(progressPath, {
          evidenceKind: 'baseline-run-progress-v2',
          runnerVersion: RUNNER_VERSION,
          startedAt,
          phase: 'performance-cases',
          plannedPerformanceCaseCount: targetCases.length,
          completedPerformanceCaseCount: performanceResults.length,
          invalidPerformanceCaseCount: performanceResults.filter(({ status }) => status === 'invalid-run').length,
          latestRenderCaseId: stateCase.renderCaseId,
          latestStatus: performanceResults.at(-1).status,
          final: false,
        }, forbiddenKeys, execution);
      }
    }

    await browser.close();
    browser = null;
    const durability = classifyEvidenceDurability({ ignored: true, repositoryTracked: false });
    const manual = manualEvidence(manifest);
    const runSummaries = [];

    for (const scenario of manifest.scenarios) {
      const scenarioRoot = path.join(root, scenario.id);
      const scenarioAggregate = aggregateScenarioExecution({
        scenarioId: scenario.id,
        plannedStateCases: plan.stateCases,
        stateResults,
        plannedPerformanceCases: plan.performanceCases,
        performanceResults,
        manualChecksComplete: manual.every(({ status: manualStatus }) => manualStatus === 'pass'),
        evidenceDurable: durability.eligibleForMeasuredPromotion,
      });
      const {
        expectedStateCases,
        stateCases: cases,
        performanceCases: performance,
        task,
        status,
        plannedStateCaseCount,
        invalidStateCaseCount: invalidCases,
        plannedPerformanceCaseCount: plannedPerformanceCases,
        completedPerformanceCaseCount,
        invalidPerformanceCaseCount: invalidPerformanceCases,
      } = scenarioAggregate;
      const taskArtifact = bindArtifactIdentity(task, execution);
      const automatedOutcome = summarizeAutomatedOutcome(cases);
      const findings = cases.flatMap((result) => {
        const items = [];
        if (result.axeViolationCount > 0) items.push({
          findingCode: 'automated-axe-violation',
          caseId: result.caseId,
          severity: 'needs-human-triage',
          count: result.axeViolationCount,
        });
        if (result.failedAssertionCount > 0) items.push({
          findingCode: 'automated-state-contract-failed',
          caseId: result.caseId,
          severity: 'needs-human-triage',
          count: result.failedAssertionCount,
        });
        if ((result.responsive?.horizontalOverflowPx ?? 0) > 1) items.push({
          findingCode: 'page-horizontal-overflow',
          caseId: result.caseId,
          severity: 'needs-human-triage',
          count: 1,
        });
        if (result.responsive?.colorModeApplied === false) items.push({
          findingCode: 'color-mode-not-applied',
          caseId: result.caseId,
          severity: 'needs-human-triage',
          count: 1,
        });
        if (result.navigation?.expectedRouteReached === false) items.push({
          findingCode: 'unexpected-final-route',
          caseId: result.caseId,
          severity: 'needs-human-triage',
          count: 1,
        });
        return items;
      });
      const result = bindArtifactIdentity({
        scenarioId: scenario.id,
        protocolVersion: manifest.schemaVersion,
        buildSha: environment.buildSha,
        manifestHash: environment.manifestHash,
        protocolHash: environment.protocolHash,
        status,
        automatedOutcome,
        evidenceDurability: durability,
        cases,
        taskMetrics: [taskArtifact],
        performanceMetrics: performance,
        axe: cases.map(({ caseId, axeViolationCount }) => ({ caseId, violationCount: axeViolationCount })),
        manual,
        findings,
        limitations: [
          '자동 상태 probe는 사용자 연구 task metric이 아니다.',
          ...(cases.some(({ taskEvidence: caseTaskEvidence }) => (
            caseTaskEvidence.some(({ status: taskStatus }) => taskStatus === 'not-executed')
          )) ? ['authoritative mutation/save/readback/rollback/deploy 선행조건이 닫히지 않은 case가 있다.'] : []),
          '수동 keyboard, NVDA, 실제 zoom, forced-colors와 motion 평가는 자동 결과로 대체하지 않았다.',
          'ignored artifact는 clean checkout에서 지속되지 않아 measured 승격 근거가 아니다.',
        ],
        redaction: {
          reviewedBy: 'unassigned',
          reviewedAt: null,
          rawTraceStored: false,
          responsePayloadStored: false,
        },
      }, execution);

      writeRunArtifact(path.join(scenarioRoot, 'environment.json'), environment, forbiddenKeys, execution);
      writeRunArtifact(path.join(scenarioRoot, 'manifest-snapshot.json'), {
        scenarioId: scenario.id,
        manifestHash: environment.manifestHash,
        executionPlanHash: environment.executionPlanHash,
        routeTruthHash: environment.routeTruthHash,
        cases: plan.stateCases.filter(({ scenarioId }) => scenarioId === scenario.id),
      }, forbiddenKeys, execution);
      writeRunArtifact(path.join(scenarioRoot, 'task-observations.json'), taskArtifact, forbiddenKeys, execution);
      writeRunArtifact(path.join(scenarioRoot, 'manual', 'manual-checks.json'), {
        checks: manual,
      }, forbiddenKeys, execution);
      for (const stateResult of cases) {
        writeRunArtifact(path.join(scenarioRoot, 'axe', `${stateResult.caseId}.json`), {
          caseId: stateResult.caseId,
          violations: stateResult.axe,
        }, forbiddenKeys, execution);
      }
      for (const performanceResult of performance) {
        writeRunArtifact(
          path.join(scenarioRoot, 'performance', `${performanceResult.renderCaseId}.json`),
          performanceResult,
          forbiddenKeys,
          execution,
        );
      }
      writeRunArtifact(path.join(scenarioRoot, 'baseline-result.json'), result, forbiddenKeys, execution);
      runSummaries.push({
        scenarioId: scenario.id,
        status,
        plannedCaseCount: plannedStateCaseCount,
        invalidCaseCount: invalidCases,
        plannedPerformanceCaseCount: plannedPerformanceCases,
        completedPerformanceCaseCount,
        invalidPerformanceCaseCount: invalidPerformanceCases,
        axeViolationCaseCount: cases.filter(({ axeViolationCount }) => axeViolationCount > 0).length,
        failedAssertionCaseCount: cases.filter(({ failedAssertionCount }) => failedAssertionCount > 0).length,
      });
    }

    const automatedProjection = createAutomatedRunProjection({
      executionPlan: plan,
      stateResults,
      performanceResults,
      scenarioSummaries: runSummaries,
    });
    const finishedAt = new Date().toISOString();
    writeRunArtifact(path.join(root, 'run-summary.json'), {
      evidenceKind: 'automated-run-summary-v2',
      runnerVersion: RUNNER_VERSION,
      startedAt,
      finishedAt,
      buildSha: environment.buildSha,
      manifestHash: environment.manifestHash,
      executionPlanHash: environment.executionPlanHash,
      protocolHash: environment.protocolHash,
      evidenceDurability: durability,
      scenarioCount: runSummaries.length,
      plannedRenderCaseCount: plan.renderCases.length,
      plannedStateCaseCount: plan.stateCases.length,
      includePerformance,
      scenarios: runSummaries,
    }, forbiddenKeys, execution);
    writeRunArtifact(progressPath, {
      evidenceKind: 'baseline-run-progress-v2',
      runnerVersion: RUNNER_VERSION,
      startedAt,
      finishedAt,
      phase: 'complete',
      plannedStateCaseCount: plan.stateCases.length,
      completedStateCaseCount: stateResults.length,
      invalidStateCaseCount: stateResults.filter(({ status }) => status === 'invalid-run').length,
      plannedPerformanceCaseCount: includePerformance ? plan.performanceCases.length : 0,
      completedPerformanceCaseCount: performanceResults.length,
      invalidPerformanceCaseCount: performanceResults.filter(({ status }) => status === 'invalid-run').length,
      final: true,
    }, forbiddenKeys, execution);
    finalizeStagedRunPublication({
      publicationKind: 'full',
      boundaryRoot: repoRoot,
      stagingRoot: root,
      publishedRoot: workspace.publishedRoot,
      historyRoot: workspace.historyRoot,
      prepareFinalMarker: () => ({
        seal: createAutomatedRunSeal({
          artifactEntries: collectJsonArtifactEntries(root),
          automatedProjection,
          executionPlan: plan,
          provenance: {
            ...execution,
            finishedAt,
          },
        }),
      }),
      verifyFinalProvenance: () => verifyFinalExecutionProvenance(
        contract,
        execution,
        stackPreflight.verifyAtFinish,
      ),
      createFinalMarker: ({ seal }) => seal,
      writeFinalMarker: (stagingRoot, marker) => {
        writeSafeJson(path.join(stagingRoot, 'automated-run-seal.json'), marker, forbiddenKeys);
      },
    });
  } finally {
    if (browser) await browser.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const contract = captureBaselineExecutionContract(() => readFileSync(manifestPath));
  const { plan } = contract;
  if (options.mode === 'plan') {
    process.stdout.write(`${JSON.stringify({
      runnerVersion: RUNNER_VERSION,
      scenarioCount: plan.scenarioCount,
      renderCaseCount: plan.renderCases.length,
      stateCaseCount: plan.stateCases.length,
      performanceRenderCaseCount: plan.performanceCases.length,
      artifactDurability: 'ephemeral-ignored',
      eligibleForMeasuredPromotion: false,
    }, null, 2)}\n`);
    return;
  }
  await execute(contract, options.includePerformance);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const code = error instanceof Error
      && /baseline build attestation/.test(error.message)
      ? 'baseline-build-unverified'
      : error instanceof Error
        && /baseline Docker (?:stack|inspect|inspection|container|image|runtime|build|port|finish)/.test(error.message)
        ? 'baseline-stack-unverified'
      : error instanceof Error && /loopback|origin|UI_BASELINE_(?:WEB|API)_URL/.test(error.message)
        ? 'unsafe-or-missing-baseline-origin'
        : error instanceof Error && /preflight|isolated synthetic|private auth states/.test(error.message)
          ? 'baseline-preflight-incomplete'
          : 'baseline-runner-failed';
    process.stderr.write(`UI quality baseline runner stopped: ${code}\n`);
    process.exitCode = 1;
  });
}
