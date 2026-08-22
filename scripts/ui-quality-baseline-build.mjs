import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createProductionBuildInputTreeHash,
  sha256,
  stableJson,
} from '../frontend/scripts/ui-quality-baseline-core.mjs';

const SHA1_HEX = /^[a-f0-9]{40}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const SAFE_IMAGE_REFERENCE = /^[a-z0-9][a-z0-9._:/-]{0,254}$/u;
const DOCKER_IMAGE_ID = /^sha256:[a-f0-9]{64}$/u;
const BASELINE_BUILD_INSPECT_TIMEOUT_MS = 5_000;
const BASELINE_BUILD_INSPECT_MAX_BYTES = 4_096;
const BASELINE_BUILD_ATTESTATION_MAX_BYTES = 4_096;
const BASELINE_RUN_ID = 'r13';
export const BASELINE_BUILD_ATTESTATION_KIND = 'ui-quality-baseline-build-attestation';
const REQUIRED_SNAPSHOT_PATHS = Object.freeze([
  '.dockerignore',
  'api-server/Dockerfile',
  'frontend/.dockerignore',
  'frontend/Dockerfile',
  'scripts/ui-quality-baseline-build.mjs',
]);
const API_ARCHIVE_PATHS = Object.freeze([
  '.dockerignore',
  'build.gradle',
  'settings.gradle',
  'gradle.properties',
  'gradlew',
  'gradle',
  'lombok.config',
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
]);
const FRONTEND_ARCHIVE_PATHS = Object.freeze([
  '.dockerignore',
  'Dockerfile',
  'package.json',
  'pnpm-lock.yaml',
  'next-env.d.ts',
  'next.config.ts',
  'postcss.config.mjs',
  'tsconfig.json',
  'public',
  'src',
]);

const CONFIG_CONTEXT_EXCLUSIONS = Object.freeze([
  '**/application-local.yml',
  '**/application-local.yaml',
  '**/application-local.properties',
  '**/application-dev.yml',
  '**/application-dev.yaml',
  '**/application-dev.properties',
  '**/application-prod.yml',
  '**/application-prod.yaml',
  '**/application-prod.properties',
]);
const GENERATED_CONTEXT_EXCLUSIONS = Object.freeze([
  '**/generated-sources',
  '**/apt-generated',
  '**/src/main/generated',
  '**/build/generated',
  '**/target/generated-sources',
]);
const ROOT_CONFIG_REINCLUSIONS = Object.freeze([
  '!api-server/src/main/resources/application-dev.yml',
  '!api-server/src/main/resources/application-prod.yml',
]);

export const BASELINE_BUILD_ARG_NAMES = Object.freeze({
  buildSha: 'BASELINE_BUILD_SHA',
  buildInputTreeHash: 'BASELINE_BUILD_INPUT_TREE_SHA256',
});

export const BASELINE_IMAGE_LABEL_NAMES = Object.freeze({
  buildSha: 'org.opencontainers.image.revision',
  buildInputTreeHash: 'io.egov.ui-quality.build-input-tree-sha256',
});

function normalizedDockerIgnoreRules(source) {
  if (typeof source !== 'string') return [];
  return source
    .split(/\r?\n/u)
    .map((line) => line.trim().replaceAll('\\', '/').replace(/^\.\//u, '').replace(/\/$/u, ''))
    .filter((line) => line && !line.startsWith('#'));
}

function isConfigOrGeneratedReinclusion(rule) {
  if (!rule.startsWith('!')) return false;
  const candidate = rule.slice(1).replace(/^\//u, '');
  return /(?:^|\/)application-(?:local|dev|prod)\.(?:properties|ya?ml)$/iu.test(candidate)
    || /(?:^|\/)(?:generated-sources|apt-generated|src\/main\/generated|build\/generated|target\/generated-sources)(?:\/|$)/iu.test(candidate);
}

export function dockerIgnorePolicyErrors(source, { context } = {}) {
  if (context !== 'root' && context !== 'frontend') {
    return ['invalid Docker context policy target'];
  }
  const rules = normalizedDockerIgnoreRules(source);
  const errors = [];
  for (const required of [...CONFIG_CONTEXT_EXCLUSIONS, ...GENERATED_CONTEXT_EXCLUSIONS]) {
    if (!rules.includes(required)) {
      errors.push(`missing Docker context exclusion: ${required}`);
    }
  }

  const allowedReinclusions = context === 'root'
    ? new Set(ROOT_CONFIG_REINCLUSIONS)
    : new Set();
  for (const rule of rules.filter(isConfigOrGeneratedReinclusion)) {
    if (!allowedReinclusions.has(rule)) {
      errors.push(`unsafe Docker context re-inclusion: ${rule}`);
    }
  }
  for (const required of allowedReinclusions) {
    if (!rules.includes(required)) {
      errors.push(`missing Docker context re-inclusion: ${required}`);
      continue;
    }
    const targetName = required.slice(required.lastIndexOf('/') + 1);
    const matchingExclusion = `**/${targetName}`;
    if (rules.indexOf(required) < rules.indexOf(matchingExclusion)) {
      errors.push(`Docker context re-inclusion must follow exclusion: ${required}`);
    }
  }
  return errors;
}

function finalDockerfileStage(source) {
  if (typeof source !== 'string') return '';
  const starts = [...source.matchAll(/^\s*FROM\s+.+$/gimu)];
  if (starts.length === 0) return '';
  return source.slice(starts.at(-1).index);
}

export function dockerfileMetadataErrors(source) {
  const finalStage = finalDockerfileStage(source);
  const errors = [];
  for (const name of Object.values(BASELINE_BUILD_ARG_NAMES)) {
    if (!new RegExp(`^\\s*ARG\\s+${name}(?:\\s*=.*)?$`, 'mu').test(finalStage)) {
      errors.push(`missing Dockerfile build arg: ${name}`);
    }
  }
  const expectedLabels = [
    {
      label: BASELINE_IMAGE_LABEL_NAMES.buildSha,
      argument: BASELINE_BUILD_ARG_NAMES.buildSha,
    },
    {
      label: BASELINE_IMAGE_LABEL_NAMES.buildInputTreeHash,
      argument: BASELINE_BUILD_ARG_NAMES.buildInputTreeHash,
    },
  ];
  for (const { label, argument } of expectedLabels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const pattern = new RegExp(
      `${escapedLabel}\\s*=\\s*["']?\\$(?:\\{${argument}\\}|${argument})["']?`,
      'u',
    );
    if (!pattern.test(finalStage)) {
      errors.push(`missing Dockerfile OCI label: ${label}=\${${argument}}`);
    }
  }
  return errors;
}

export function validateBuildMetadata({ buildSha, buildInputTreeHash } = {}) {
  if (!SHA1_HEX.test(buildSha ?? '') || !SHA256_HEX.test(buildInputTreeHash ?? '')) {
    throw new Error('invalid baseline build metadata');
  }
  return { buildSha, buildInputTreeHash };
}

function validateApiUrl(value) {
  if (typeof value !== 'string' || value !== value.trim()
    || value.length === 0 || /[\u0000-\u0020\u007f]/u.test(value)) return false;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return (parsed.protocol === 'http:' || parsed.protocol === 'https:')
    && parsed.hostname !== ''
    && parsed.username === ''
    && parsed.password === ''
    && parsed.search === ''
    && parsed.hash === ''
    && (parsed.pathname === '/api/v1' || parsed.pathname === '/api/v1/');
}

function validateArchivePath(value) {
  return typeof value === 'string'
    && value.length > 0
    && value !== '.'
    && value !== '..'
    && !/[\u0000-\u001f\u007f]/u.test(value);
}

function metadataDockerArguments(buildSha, buildInputTreeHash) {
  return [
    '--build-arg', `${BASELINE_BUILD_ARG_NAMES.buildSha}=${buildSha}`,
    '--build-arg', `${BASELINE_BUILD_ARG_NAMES.buildInputTreeHash}=${buildInputTreeHash}`,
    '--label', `${BASELINE_IMAGE_LABEL_NAMES.buildSha}=${buildSha}`,
    '--label', `${BASELINE_IMAGE_LABEL_NAMES.buildInputTreeHash}=${buildInputTreeHash}`,
  ];
}

export function createDockerBuildInvocations(input = {}) {
  let metadata;
  try {
    metadata = validateBuildMetadata(input);
  } catch {
    throw new Error('invalid baseline Docker build request');
  }
  const {
    apiImage,
    frontendImage,
    backendApiUrl,
    publicApiUrl,
    rootArchivePath,
    frontendArchivePath,
    apiImageIdPath,
    frontendImageIdPath,
  } = input;
  if (![apiImage, frontendImage].every((value) => (
    typeof value === 'string' && SAFE_IMAGE_REFERENCE.test(value) && !value.startsWith('-')
  )) || apiImage === frontendImage
    || !validateApiUrl(backendApiUrl) || !validateApiUrl(publicApiUrl)
    || !validateArchivePath(rootArchivePath) || !validateArchivePath(frontendArchivePath)
    || !validateArchivePath(apiImageIdPath) || !validateArchivePath(frontendImageIdPath)
    || apiImageIdPath === frontendImageIdPath) {
    throw new Error('invalid baseline Docker build request');
  }
  const provenanceArgs = metadataDockerArguments(
    metadata.buildSha,
    metadata.buildInputTreeHash,
  );
  return [
    {
      component: 'api',
      imageReference: apiImage,
      imageIdPath: apiImageIdPath,
      command: 'docker',
      args: [
        'build', '--pull', '--no-cache',
        '--file', 'api-server/Dockerfile',
        '--tag', apiImage,
        '--iidfile', apiImageIdPath,
        ...provenanceArgs,
        '-',
      ],
      stdinArchivePath: rootArchivePath,
    },
    {
      component: 'frontend',
      imageReference: frontendImage,
      imageIdPath: frontendImageIdPath,
      command: 'docker',
      args: [
        'build', '--pull', '--no-cache',
        '--file', 'Dockerfile',
        '--tag', frontendImage,
        '--iidfile', frontendImageIdPath,
        ...provenanceArgs,
        '--build-arg', `BACKEND_API_URL=${backendApiUrl}`,
        '--build-arg', `NEXT_PUBLIC_API_URL=${publicApiUrl}`,
        '-',
      ],
      stdinArchivePath: frontendArchivePath,
    },
  ];
}

function exactObjectKeys(value, expectedKeys) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).sort().join('\0') === [...expectedKeys].sort().join('\0');
}

function dockerImageInspectFormat() {
  const revisionLabel = JSON.stringify(BASELINE_IMAGE_LABEL_NAMES.buildSha);
  const treeLabel = JSON.stringify(BASELINE_IMAGE_LABEL_NAMES.buildInputTreeHash);
  return [
    '{"Id":{{json .Id}},',
    '"Labels":{',
    `"BuildSha":{{json (index .Config.Labels ${revisionLabel})}},`,
    `"BuildInputTreeHash":{{json (index .Config.Labels ${treeLabel})}}}`,
  ].join('');
}

export function createDockerImageInspectInvocation({ imageReference } = {}) {
  if (typeof imageReference !== 'string'
    || !SAFE_IMAGE_REFERENCE.test(imageReference)
    || imageReference.startsWith('-')) {
    throw new Error('invalid baseline Docker image inspect request');
  }
  return Object.freeze({
    command: 'docker',
    args: Object.freeze([
      'image',
      'inspect',
      '--format',
      dockerImageInspectFormat(),
      imageReference,
    ]),
    timeoutMs: BASELINE_BUILD_INSPECT_TIMEOUT_MS,
    maxOutputBytes: BASELINE_BUILD_INSPECT_MAX_BYTES,
  });
}

function decodeBoundedUtf8(rawBytes, maximumBytes, errorMessage) {
  if (!Buffer.isBuffer(rawBytes) || rawBytes.length === 0 || rawBytes.length > maximumBytes) {
    throw new Error(errorMessage);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
  } catch {
    throw new Error(errorMessage);
  }
}

export function readDockerImageId(imageIdPath) {
  let metadata;
  let rawBytes;
  try {
    metadata = lstatSync(imageIdPath);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 80) {
      throw new Error('unsafe image ID file');
    }
    rawBytes = readFileSync(imageIdPath);
  } catch {
    throw new Error('baseline Docker image ID file is malformed');
  }
  const text = decodeBoundedUtf8(rawBytes, 80, 'baseline Docker image ID file is malformed');
  if (!/^sha256:[a-f0-9]{64}\n?$/u.test(text)) {
    throw new Error('baseline Docker image ID file is malformed');
  }
  return text.endsWith('\n') ? text.slice(0, -1) : text;
}

export function validateBuiltImageInspection(rawBytes, {
  expectedImageId,
  buildSha,
  buildInputTreeHash,
} = {}) {
  if (!DOCKER_IMAGE_ID.test(expectedImageId ?? '')) {
    throw new Error('baseline Docker image inspection request is incomplete');
  }
  validateBuildMetadata({ buildSha, buildInputTreeHash });
  const text = decodeBoundedUtf8(
    rawBytes,
    BASELINE_BUILD_INSPECT_MAX_BYTES,
    'baseline Docker image inspection is malformed',
  );
  let projection;
  try {
    projection = JSON.parse(text);
  } catch {
    throw new Error('baseline Docker image inspection is malformed');
  }
  if (!exactObjectKeys(projection, ['Id', 'Labels'])
    || !exactObjectKeys(projection.Labels, ['BuildSha', 'BuildInputTreeHash'])) {
    throw new Error('baseline Docker image inspection projection shape is invalid');
  }
  if (!DOCKER_IMAGE_ID.test(projection.Id ?? '') || projection.Id !== expectedImageId) {
    throw new Error('baseline Docker image identity mismatch');
  }
  if (projection.Labels.BuildSha !== buildSha
    || projection.Labels.BuildInputTreeHash !== buildInputTreeHash) {
    throw new Error('baseline Docker image provenance mismatch');
  }
  return Object.freeze({ id: projection.Id });
}

export function assertNoGitlinks(entries) {
  if (!Array.isArray(entries) || entries.some((entry) => (
    !entry || typeof entry.mode !== 'string' || typeof entry.type !== 'string'
      || typeof entry.path !== 'string'
  ))) {
    throw new Error('invalid committed Git tree');
  }
  if (entries.some(({ mode, type }) => mode === '160000' || type === 'commit')) {
    throw new Error('gitlink is not supported by the clean baseline build archive');
  }
}

export function assertArchiveAttributeSafety(attributeFiles) {
  if (!Array.isArray(attributeFiles) || attributeFiles.some((entry) => (
    !entry || typeof entry.path !== 'string' || typeof entry.source !== 'string'
  ))) {
    throw new Error('invalid committed Git attributes');
  }
  for (const { source } of attributeFiles) {
    const activeLines = source
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    if (activeLines.some((line) => /(?:^|\s)export-(?:ignore|subst)(?:\s|=|$)/iu.test(line))) {
      throw new Error('archive-transforming Git attribute is not allowed');
    }
  }
}

function sanitizedGit(repositoryRoot, args, { input } = {}) {
  try {
    return execFileSync('git', ['-C', repositoryRoot, ...args], {
      encoding: null,
      input,
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error('clean baseline build Git operation failed');
  }
}

function gitText(repositoryRoot, args) {
  return sanitizedGit(repositoryRoot, args).toString('utf8').trim();
}

function committedFile(repositoryRoot, buildSha, relativePath) {
  return sanitizedGit(repositoryRoot, ['show', `${buildSha}:${relativePath}`]);
}

function parseGitTree(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new Error('invalid committed Git tree');
  return buffer
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((record) => {
      const separator = record.indexOf('\t');
      const metadata = separator >= 0 ? record.slice(0, separator).split(' ') : [];
      const relativePath = separator >= 0 ? record.slice(separator + 1) : '';
      if (metadata.length !== 3 || !relativePath) throw new Error('invalid committed Git tree');
      return {
        mode: metadata[0],
        type: metadata[1],
        objectId: metadata[2],
        path: relativePath,
      };
    });
}

function ensureRepositoryIsClean(repositoryRoot, buildSha) {
  const verifiedCommit = gitText(repositoryRoot, ['rev-parse', '--verify', `${buildSha}^{commit}`]);
  const headCommit = gitText(repositoryRoot, ['rev-parse', '--verify', 'HEAD^{commit}']);
  if (verifiedCommit !== buildSha || headCommit !== buildSha) {
    throw new Error('baseline build SHA must equal repository HEAD');
  }
  const status = sanitizedGit(repositoryRoot, [
    'status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored=no',
  ]);
  if (status.length !== 0) {
    throw new Error('baseline image build requires a clean repository');
  }
}

function assertOutsideRepository(repositoryRoot, outputDirectory) {
  let repositoryRealPath;
  let outputRealPath;
  try {
    repositoryRealPath = realpathSync(repositoryRoot);
    outputRealPath = realpathSync(outputDirectory);
  } catch {
    throw new Error('baseline build archive path validation failed');
  }
  const relative = path.relative(repositoryRealPath, outputRealPath);
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..'
    && !path.isAbsolute(relative))) {
    throw new Error('baseline build archives must be outside the repository');
  }
}

function assertCommittedDockerPolicies(repositoryRoot, buildSha) {
  const rootErrors = dockerIgnorePolicyErrors(
    committedFile(repositoryRoot, buildSha, '.dockerignore').toString('utf8'),
    { context: 'root' },
  );
  const frontendErrors = dockerIgnorePolicyErrors(
    committedFile(repositoryRoot, buildSha, 'frontend/.dockerignore').toString('utf8'),
    { context: 'frontend' },
  );
  if (rootErrors.length > 0 || frontendErrors.length > 0) {
    throw new Error('committed Docker context exclusion policy is incomplete');
  }
}

export function prepareCleanBuildContexts({
  repositoryRoot,
  buildSha,
  expectedBuildInputTreeHash,
  outputDirectory,
} = {}, {
  calculateBuildInputTreeHash = createProductionBuildInputTreeHash,
} = {}) {
  if (!SHA1_HEX.test(buildSha ?? '')
    || (expectedBuildInputTreeHash !== undefined
      && !SHA256_HEX.test(expectedBuildInputTreeHash ?? ''))) {
    throw new Error('invalid clean baseline build metadata');
  }
  if (typeof repositoryRoot !== 'string' || typeof outputDirectory !== 'string'
    || typeof calculateBuildInputTreeHash !== 'function') {
    throw new Error('invalid clean baseline build request');
  }
  assertOutsideRepository(repositoryRoot, outputDirectory);
  const discoveredRoot = gitText(repositoryRoot, ['rev-parse', '--show-toplevel']);
  let discoveredRealPath;
  let requestedRealPath;
  try {
    discoveredRealPath = realpathSync(discoveredRoot);
    requestedRealPath = realpathSync(repositoryRoot);
  } catch {
    throw new Error('baseline repository root validation failed');
  }
  if (discoveredRealPath !== requestedRealPath) {
    throw new Error('baseline build must run from the repository root');
  }

  ensureRepositoryIsClean(repositoryRoot, buildSha);
  const treeEntries = parseGitTree(sanitizedGit(repositoryRoot, [
    'ls-tree', '-r', '-z', buildSha,
  ]));
  assertNoGitlinks(treeEntries);
  const committedPaths = new Set(treeEntries.map(({ path: relativePath }) => relativePath));
  if (REQUIRED_SNAPSHOT_PATHS.some((relativePath) => !committedPaths.has(relativePath))) {
    throw new Error('required clean baseline build file is not committed');
  }

  const attributeFiles = treeEntries
    .filter(({ path: relativePath }) => path.posix.basename(relativePath) === '.gitattributes')
    .map(({ path: relativePath }) => ({
      path: relativePath,
      source: committedFile(repositoryRoot, buildSha, relativePath).toString('utf8'),
    }));
  assertArchiveAttributeSafety(attributeFiles);
  assertCommittedDockerPolicies(repositoryRoot, buildSha);

  let buildInputTreeHash;
  try {
    buildInputTreeHash = calculateBuildInputTreeHash({
      trackedPaths: treeEntries
        .filter(({ type }) => type === 'blob')
        .map(({ path: relativePath }) => relativePath),
      readCommittedFile: (relativePath) => committedFile(repositoryRoot, buildSha, relativePath),
    });
  } catch {
    throw new Error('committed build-input tree capture failed');
  }
  if (!SHA256_HEX.test(buildInputTreeHash ?? '')
    || (expectedBuildInputTreeHash !== undefined
      && buildInputTreeHash !== expectedBuildInputTreeHash)) {
    throw new Error('committed build-input tree hash mismatch');
  }

  const commitTreeId = gitText(repositoryRoot, ['rev-parse', '--verify', `${buildSha}^{tree}`]);
  if (!SHA1_HEX.test(commitTreeId)) {
    throw new Error('invalid committed Git tree identity');
  }
  const rootArchivePath = path.join(outputDirectory, 'root-context.tar');
  const frontendArchivePath = path.join(outputDirectory, 'frontend-context.tar');
  sanitizedGit(repositoryRoot, [
    'archive', '--format=tar', `--output=${rootArchivePath}`, buildSha,
    '--', ...API_ARCHIVE_PATHS,
  ]);
  sanitizedGit(repositoryRoot, [
    'archive', '--format=tar', `--output=${frontendArchivePath}`, `${buildSha}:frontend`,
    '--', ...FRONTEND_ARCHIVE_PATHS,
  ]);
  try {
    if (statSync(rootArchivePath).size <= 0 || statSync(frontendArchivePath).size <= 0) {
      throw new Error('empty archive');
    }
  } catch {
    throw new Error('clean baseline build archive creation failed');
  }
  ensureRepositoryIsClean(repositoryRoot, buildSha);
  return {
    buildSha,
    buildInputTreeHash,
    commitTreeId,
    rootArchivePath,
    frontendArchivePath,
  };
}

function canonicalJsonBytes(value) {
  return Buffer.from(`${stableJson(value)}\n`, 'utf8');
}

export function createBaselineBuildAttestation({
  buildSha,
  buildInputTreeHash,
  commitTreeId,
  apiImageId,
  frontendImageId,
} = {}) {
  validateBuildMetadata({ buildSha, buildInputTreeHash });
  if (!SHA1_HEX.test(commitTreeId ?? '')
    || !DOCKER_IMAGE_ID.test(apiImageId ?? '')
    || !DOCKER_IMAGE_ID.test(frontendImageId ?? '')
    || apiImageId === frontendImageId) {
    throw new Error('invalid baseline build attestation identity');
  }
  const payload = Object.freeze({
    schemaVersion: 1,
    kind: BASELINE_BUILD_ATTESTATION_KIND,
    baselineRunId: BASELINE_RUN_ID,
    buildSha,
    buildInputTreeHash,
    commitTreeId,
    images: Object.freeze({
      api: Object.freeze({ id: apiImageId }),
      frontend: Object.freeze({ id: frontendImageId }),
    }),
  });
  return Object.freeze({
    payload,
    payloadSha256: sha256(canonicalJsonBytes(payload)),
  });
}

export function validateBaselineBuildAttestationBytes(rawBytes, {
  expectedAttestationSha256,
} = {}) {
  const text = decodeBoundedUtf8(
    rawBytes,
    BASELINE_BUILD_ATTESTATION_MAX_BYTES,
    'baseline build attestation is malformed',
  );
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new Error('baseline build attestation is malformed');
  }
  if (!exactObjectKeys(envelope, ['payload', 'payloadSha256'])
    || !exactObjectKeys(envelope.payload, [
      'schemaVersion',
      'kind',
      'baselineRunId',
      'buildSha',
      'buildInputTreeHash',
      'commitTreeId',
      'images',
    ])
    || !exactObjectKeys(envelope.payload.images, ['api', 'frontend'])
    || !exactObjectKeys(envelope.payload.images.api, ['id'])
    || !exactObjectKeys(envelope.payload.images.frontend, ['id'])) {
    throw new Error('baseline build attestation projection shape is invalid');
  }
  if (!canonicalJsonBytes(envelope).equals(rawBytes)) {
    throw new Error('baseline build attestation does not use canonical bytes');
  }
  const payload = envelope.payload;
  const calculatedPayloadDigest = sha256(canonicalJsonBytes(payload));
  if (!SHA256_HEX.test(envelope.payloadSha256 ?? '')
    || envelope.payloadSha256 !== calculatedPayloadDigest) {
    throw new Error('baseline build attestation payload digest mismatch');
  }
  if (payload.schemaVersion !== 1
    || payload.kind !== BASELINE_BUILD_ATTESTATION_KIND
    || payload.baselineRunId !== BASELINE_RUN_ID) {
    throw new Error('baseline build attestation identity mismatch');
  }
  validateBuildMetadata(payload);
  if (!SHA1_HEX.test(payload.commitTreeId ?? '')
    || !DOCKER_IMAGE_ID.test(payload.images.api.id ?? '')
    || !DOCKER_IMAGE_ID.test(payload.images.frontend.id ?? '')
    || payload.images.api.id === payload.images.frontend.id) {
    throw new Error('baseline build attestation identity mismatch');
  }
  const calculatedFileDigest = sha256(rawBytes);
  if (expectedAttestationSha256 !== undefined
    && (!SHA256_HEX.test(expectedAttestationSha256 ?? '')
      || expectedAttestationSha256 !== calculatedFileDigest)) {
    throw new Error('baseline build attestation file digest mismatch');
  }
  return payload;
}

function assertPathOutsideRepository(repositoryRoot, candidatePath, message) {
  let repositoryRealPath;
  let candidateRealPath;
  try {
    repositoryRealPath = realpathSync(repositoryRoot);
    candidateRealPath = realpathSync(candidatePath);
  } catch {
    throw new Error(message);
  }
  const relative = path.relative(repositoryRealPath, candidateRealPath);
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..'
    && !path.isAbsolute(relative))) {
    throw new Error(message);
  }
}

function assertBaselineBuildAttestationOutput(repositoryRoot, outputPath) {
  if (typeof repositoryRoot !== 'string'
    || typeof outputPath !== 'string'
    || !path.isAbsolute(outputPath)
    || path.resolve(outputPath) !== outputPath) {
    throw new Error('baseline build attestation output must be an absolute canonical path');
  }
  let parentRealPath;
  try {
    parentRealPath = realpathSync(path.dirname(outputPath));
  } catch {
    throw new Error('baseline build attestation output parent is invalid');
  }
  if (path.resolve(parentRealPath) !== path.resolve(path.dirname(outputPath))) {
    throw new Error('baseline build attestation output parent must not be a symlink');
  }
  assertPathOutsideRepository(
    repositoryRoot,
    path.dirname(outputPath),
    'baseline build attestation output must be outside the repository',
  );
  if (existsSync(outputPath)) {
    throw new Error('baseline build attestation output must not already exist');
  }
}

export function writeBaselineBuildAttestation({
  repositoryRoot,
  outputPath,
  attestation,
} = {}) {
  assertBaselineBuildAttestationOutput(repositoryRoot, outputPath);
  const parentDirectory = path.dirname(outputPath);
  const rawBytes = canonicalJsonBytes(attestation);
  validateBaselineBuildAttestationBytes(rawBytes);
  const temporaryPath = path.join(
    parentDirectory,
    `.${path.basename(outputPath)}.${process.pid}.${randomBytes(12).toString('hex')}.tmp`,
  );
  let descriptor;
  try {
    descriptor = openSync(temporaryPath, 'wx', 0o600);
    let offset = 0;
    while (offset < rawBytes.length) {
      offset += writeSync(descriptor, rawBytes, offset, rawBytes.length - offset);
    }
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    if (existsSync(outputPath)) {
      throw new Error('baseline build attestation output must not already exist');
    }
    renameSync(temporaryPath, outputPath);
    const metadata = lstatSync(outputPath);
    if (!metadata.isFile() || metadata.isSymbolicLink()
      || metadata.size !== rawBytes.length
      || metadata.size > BASELINE_BUILD_ATTESTATION_MAX_BYTES) {
      throw new Error('baseline build attestation publication verification failed');
    }
    assertPathOutsideRepository(
      repositoryRoot,
      outputPath,
      'baseline build attestation output must be outside the repository',
    );
    if (path.resolve(realpathSync(outputPath)) !== outputPath) {
      throw new Error('baseline build attestation publication verification failed');
    }
    const readback = readFileSync(outputPath);
    validateBaselineBuildAttestationBytes(readback, {
      expectedAttestationSha256: sha256(rawBytes),
    });
    if (!readback.equals(rawBytes)) {
      throw new Error('baseline build attestation publication verification failed');
    }
    return Object.freeze({
      attestationPath: outputPath,
      attestationSha256: sha256(rawBytes),
    });
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    throw error;
  } finally {
    if (existsSync(temporaryPath)) rmSync(temporaryPath, { force: true });
  }
}

function executeDockerBuild(invocation) {
  let archiveDescriptor;
  try {
    archiveDescriptor = openSync(invocation.stdinArchivePath, 'r');
    execFileSync(invocation.command, invocation.args, {
      encoding: null,
      stdio: [archiveDescriptor, 'inherit', 'inherit'],
    });
  } catch {
    throw new Error(`baseline ${invocation.component} image build failed`);
  } finally {
    if (archiveDescriptor !== undefined) closeSync(archiveDescriptor);
  }
}

function executeDockerImageInspect(invocation) {
  try {
    return execFileSync(invocation.command, invocation.args, {
      encoding: null,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: invocation.timeoutMs,
      maxBuffer: invocation.maxOutputBytes,
    });
  } catch {
    throw new Error('baseline Docker image inspection failed');
  }
}

export function buildCleanBaselineImages(input, {
  runDockerBuild = executeDockerBuild,
  inspectDockerImage = executeDockerImageInspect,
  createTemporaryDirectory = () => mkdtempSync(path.join(tmpdir(), 'egov-r13-build-')),
  removeTemporaryDirectory = (directory) => rmSync(directory, { recursive: true, force: true }),
  calculateBuildInputTreeHash = createProductionBuildInputTreeHash,
} = {}) {
  assertBaselineBuildAttestationOutput(input?.repositoryRoot, input?.attestationOutputPath);
  const temporaryDirectory = createTemporaryDirectory();
  try {
    const contexts = prepareCleanBuildContexts({
      repositoryRoot: input.repositoryRoot,
      buildSha: input.buildSha,
      expectedBuildInputTreeHash: input.buildInputTreeHash,
      outputDirectory: temporaryDirectory,
    }, { calculateBuildInputTreeHash });
    const invocations = createDockerBuildInvocations({
      ...input,
      ...contexts,
      apiImageIdPath: path.join(temporaryDirectory, 'api-image-id.txt'),
      frontendImageIdPath: path.join(temporaryDirectory, 'frontend-image-id.txt'),
    });
    const imageIds = {};
    for (const invocation of invocations) {
      runDockerBuild(invocation);
      const expectedImageId = readDockerImageId(invocation.imageIdPath);
      const inspectInvocation = Object.freeze({
        ...createDockerImageInspectInvocation({ imageReference: invocation.imageReference }),
        component: invocation.component,
        imageReference: invocation.imageReference,
      });
      let rawInspection;
      try {
        rawInspection = inspectDockerImage(inspectInvocation);
      } catch {
        throw new Error(`baseline ${invocation.component} image inspection failed`);
      }
      imageIds[invocation.component] = validateBuiltImageInspection(rawInspection, {
        expectedImageId,
        buildSha: contexts.buildSha,
        buildInputTreeHash: contexts.buildInputTreeHash,
      }).id;
    }
    ensureRepositoryIsClean(input.repositoryRoot, contexts.buildSha);
    const attestation = createBaselineBuildAttestation({
      buildSha: contexts.buildSha,
      buildInputTreeHash: contexts.buildInputTreeHash,
      commitTreeId: contexts.commitTreeId,
      apiImageId: imageIds.api,
      frontendImageId: imageIds.frontend,
    });
    const publication = writeBaselineBuildAttestation({
      repositoryRoot: input.repositoryRoot,
      outputPath: input.attestationOutputPath,
      attestation,
    });
    return Object.freeze({
      ...publication,
      attestation,
    });
  } finally {
    removeTemporaryDirectory(temporaryDirectory);
  }
}

function parseCliArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (typeof key !== 'string' || !key.startsWith('--') || typeof value !== 'string') {
      throw new Error('invalid clean baseline build CLI arguments');
    }
    if (values.has(key)) throw new Error('duplicate clean baseline build CLI argument');
    values.set(key, value);
  }
  const expected = [
    '--build-sha',
    '--api-image',
    '--frontend-image',
    '--backend-api-url',
    '--public-api-url',
    '--attestation-output',
    '--execute',
  ];
  if (values.size !== expected.length || expected.some((key) => !values.has(key))
    || values.get('--execute') !== 'confirmed') {
    throw new Error('clean baseline image build requires explicit --execute confirmed');
  }
  return {
    repositoryRoot: process.cwd(),
    buildSha: values.get('--build-sha'),
    apiImage: values.get('--api-image'),
    frontendImage: values.get('--frontend-image'),
    backendApiUrl: values.get('--backend-api-url'),
    publicApiUrl: values.get('--public-api-url'),
    attestationOutputPath: values.get('--attestation-output'),
  };
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const result = buildCleanBaselineImages(parseCliArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'clean baseline image build failed';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
