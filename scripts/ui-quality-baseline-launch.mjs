import { execFileSync } from 'node:child_process';
import { randomBytes as secureRandomBytes } from 'node:crypto';
import {
  closeSync,
  constants as fileConstants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateBaselineBuildAttestationBytes,
} from './ui-quality-baseline-build.mjs';
import {
  createBaselineDockerImageInspectInvocation,
  createBaselineDockerInspectInvocation,
  validateBaselineDockerStack,
} from '../frontend/scripts/ui-quality-baseline-core.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, '..');
const BUILD_ATTESTATION_MAX_BYTES = 4_096;
const COMPOSE_FILE_MAX_BYTES = 32_768;
const COMMAND_OUTPUT_MAX_BYTES = 32_768;
const COMMAND_TIMEOUT_MS = 30_000;
const COMPOSE_UP_TIMEOUT_MS = 10 * 60_000;
const AUTH_SETUP_TIMEOUT_MS = 5 * 60_000;
const RUNNER_TIMEOUT_MS = 4 * 60 * 60_000;
const PROJECT_PREFIX = 'egov-uiux-baseline-r13-';
const PROJECT_PATTERN = /^egov-uiux-baseline-r13-[a-f0-9]{32}$/u;
const SHA1_HEX = /^[a-f0-9]{40}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const DOCKER_IMAGE_ID = /^sha256:[a-f0-9]{64}$/u;
const DOCKER_CONTAINER_ID = /^[a-f0-9]{64}$/u;
const SAFE_DATABASE_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]{0,62}$/u;
const SAFE_OPTIONAL_BOARD_ID = /^[A-Za-z0-9_-]{1,64}$/u;
const POSTGRES_IMAGE = 'postgres:17@sha256:a426e44bac0b759c95894d68e1a0ac03ecc20b619f498a91aae373bf06d8508d';
const CONTRACT_PATHS = Object.freeze([
  'scripts/ui-quality-scenarios-contract.test.mjs',
  'scripts/ui-quality-baseline-runner-contract.test.mjs',
  'scripts/ui-quality-baseline-launch-contract.test.mjs',
]);
const SAFE_SYSTEM_ENVIRONMENT_NAMES = new Set([
  'appdata',
  'comspec',
  'docker_cert_path',
  'docker_config',
  'docker_context',
  'docker_host',
  'docker_tls_verify',
  'home',
  'lang',
  'lc_all',
  'localappdata',
  'path',
  'pathext',
  'playwright_browsers_path',
  'programdata',
  'systemroot',
  'temp',
  'tmp',
  'tmpdir',
  'userprofile',
  'windir',
  'xdg_cache_home',
]);

export const BASELINE_LAUNCH_RUNTIME_DIRECTORY = 'egov-ui-quality-baseline-r13';

function exactObjectKeys(value, expected) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).sort().join('\0') === [...expected].sort().join('\0');
}

function isOutside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '..'
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative);
}

function requireBoundedValue(value, label, { maximum = 4_096 } = {}) {
  if (typeof value !== 'string'
    || value.length < 1
    || value.length > maximum
    || value.includes('\0')
    || value.includes('\r')
    || value.includes('\n')) {
    throw new Error(`baseline launch ${label} is invalid`);
  }
  return value;
}

function safeSystemEnvironment(sourceEnvironment = process.env) {
  if (sourceEnvironment === null || typeof sourceEnvironment !== 'object') {
    throw new Error('baseline launch environment is invalid');
  }
  const closed = {};
  for (const [name, value] of Object.entries(sourceEnvironment)) {
    if (SAFE_SYSTEM_ENVIRONMENT_NAMES.has(name.toLowerCase()) && typeof value === 'string') {
      requireBoundedValue(value, 'system environment', { maximum: 32_768 });
      closed[name] = value;
    }
  }
  return closed;
}

function requireExecutionSecret(sourceEnvironment, name) {
  return requireBoundedValue(sourceEnvironment?.[name], 'environment');
}

function normalizedDatabaseIdentity(sourceEnvironment) {
  const databaseName = sourceEnvironment?.UI_BASELINE_DB_NAME ?? 'egovdb';
  const databaseUser = sourceEnvironment?.UI_BASELINE_DB_USER ?? 'egov';
  if (!SAFE_DATABASE_IDENTIFIER.test(databaseName)
    || !SAFE_DATABASE_IDENTIFIER.test(databaseUser)) {
    throw new Error('baseline launch database identity is invalid');
  }
  return { databaseName, databaseUser };
}

function validatePort(port) {
  return Number.isInteger(port) && port >= 1_024 && port <= 65_535;
}

function createRunIdentity(randomBytes = secureRandomBytes) {
  let entropy;
  try {
    entropy = randomBytes(16);
  } catch {
    throw new Error('baseline launch identity generation failed');
  }
  if (!Buffer.isBuffer(entropy) || entropy.length !== 16) {
    throw new Error('baseline launch identity generation failed');
  }
  const suffix = entropy.toString('hex');
  const projectName = `${PROJECT_PREFIX}${suffix}`;
  return Object.freeze({
    projectName,
    networkName: `${projectName}-net`,
    databaseContainerName: `${projectName}-db`,
    apiContainerName: `${projectName}-api`,
    frontendContainerName: `${projectName}-frontend`,
    syntheticSeedLabel: 'isolated-fixture-v1',
  });
}

function assertLaunchIdentity({
  projectName,
  networkName,
  databaseContainerName,
  apiContainerName,
  frontendContainerName,
} = {}) {
  if (!PROJECT_PATTERN.test(projectName ?? '')
    || networkName !== `${projectName}-net`
    || databaseContainerName !== `${projectName}-db`
    || apiContainerName !== `${projectName}-api`
    || frontendContainerName !== `${projectName}-frontend`) {
    throw new Error('baseline launch identity is invalid');
  }
}

export function createBaselineComposeSpecification({
  projectName,
  networkName,
  databaseContainerName,
  apiContainerName,
  frontendContainerName,
  apiImageId,
  frontendImageId,
  webPort,
  apiPort,
} = {}) {
  assertLaunchIdentity({
    projectName,
    networkName,
    databaseContainerName,
    apiContainerName,
    frontendContainerName,
  });
  if (!DOCKER_IMAGE_ID.test(apiImageId ?? '')
    || !DOCKER_IMAGE_ID.test(frontendImageId ?? '')
    || apiImageId === frontendImageId
    || !validatePort(webPort)
    || !validatePort(apiPort)
    || webPort === apiPort) {
    throw new Error('baseline launch Compose request is invalid');
  }
  return Object.freeze({
    services: Object.freeze({
      db: Object.freeze({
        image: POSTGRES_IMAGE,
        container_name: databaseContainerName,
        pull_policy: 'never',
        restart: 'no',
        environment: Object.freeze([
          'POSTGRES_DB',
          'POSTGRES_PASSWORD',
          'POSTGRES_USER',
        ]),
        tmpfs: Object.freeze(['/var/lib/postgresql/data']),
        healthcheck: Object.freeze({
          test: Object.freeze(['CMD-SHELL', 'pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"']),
          interval: '5s',
          timeout: '5s',
          retries: 24,
          start_period: '5s',
        }),
        networks: Object.freeze(['baseline']),
      }),
      api: Object.freeze({
        image: apiImageId,
        container_name: apiContainerName,
        pull_policy: 'never',
        restart: 'no',
        ports: Object.freeze([`127.0.0.1:${apiPort}:8080`]),
        environment: Object.freeze([
          'CORS_ALLOWED_ORIGINS',
          'JWT_ACCESS_TOKEN_VALIDITY_MS',
          'JWT_SECRET',
          'MANAGEMENT_HEALTH_MAIL_ENABLED',
          'SPRING_DATASOURCE_JDBC_URL',
          'SPRING_DATASOURCE_PASSWORD',
          'SPRING_DATASOURCE_URL',
          'SPRING_DATASOURCE_USERNAME',
          'SPRING_FLYWAY_LOCATIONS',
          'SPRING_JPA_HIBERNATE_DDL_AUTO',
        ]),
        depends_on: Object.freeze({
          db: Object.freeze({ condition: 'service_healthy' }),
        }),
        healthcheck: Object.freeze({
          test: Object.freeze([
            'CMD-SHELL',
            'wget --spider -q http://localhost:8080/actuator/health || exit 1',
          ]),
          interval: '10s',
          timeout: '10s',
          retries: 30,
          start_period: '20s',
        }),
        networks: Object.freeze(['baseline']),
      }),
      frontend: Object.freeze({
        image: frontendImageId,
        container_name: frontendContainerName,
        pull_policy: 'never',
        restart: 'no',
        ports: Object.freeze([`127.0.0.1:${webPort}:3000`]),
        environment: Object.freeze([
          'BACKEND_API_URL',
          'JWT_SECRET',
          'NEXT_PUBLIC_API_URL',
        ]),
        depends_on: Object.freeze({
          api: Object.freeze({ condition: 'service_healthy' }),
        }),
        healthcheck: Object.freeze({
          test: Object.freeze([
            'CMD-SHELL',
            'wget --spider -q http://localhost:3000/ || exit 1',
          ]),
          interval: '10s',
          timeout: '10s',
          retries: 24,
          start_period: '20s',
        }),
        networks: Object.freeze(['baseline']),
      }),
    }),
    networks: Object.freeze({
      baseline: Object.freeze({
        name: networkName,
        driver: 'bridge',
      }),
    }),
  });
}

function createClosedComposeEnvironment({ sourceEnvironment, webOrigin }) {
  const { databaseName, databaseUser } = normalizedDatabaseIdentity(sourceEnvironment);
  const databasePassword = requireExecutionSecret(sourceEnvironment, 'UI_BASELINE_DB_PASSWORD');
  const jwtSecret = requireExecutionSecret(sourceEnvironment, 'UI_BASELINE_JWT_SECRET');
  return Object.freeze({
    ...safeSystemEnvironment(sourceEnvironment),
    POSTGRES_DB: databaseName,
    POSTGRES_USER: databaseUser,
    POSTGRES_PASSWORD: databasePassword,
    SPRING_DATASOURCE_URL: `jdbc:postgresql://db:5432/${databaseName}`,
    SPRING_DATASOURCE_JDBC_URL: `jdbc:postgresql://db:5432/${databaseName}`,
    SPRING_DATASOURCE_USERNAME: databaseUser,
    SPRING_DATASOURCE_PASSWORD: databasePassword,
    SPRING_JPA_HIBERNATE_DDL_AUTO: 'none',
    SPRING_FLYWAY_LOCATIONS: 'classpath:db/migration,classpath:db/seed-dev',
    CORS_ALLOWED_ORIGINS: webOrigin,
    JWT_SECRET: jwtSecret,
    JWT_ACCESS_TOKEN_VALIDITY_MS: '14400000',
    MANAGEMENT_HEALTH_MAIL_ENABLED: 'false',
    BACKEND_API_URL: 'http://api:8080/api/v1',
    NEXT_PUBLIC_API_URL: 'http://api:8080/api/v1',
  });
}

function optionalBoardEnvironment(sourceEnvironment, targetEnvironment, name) {
  const value = sourceEnvironment?.[name];
  if (value === undefined) return;
  if (typeof value !== 'string' || !SAFE_OPTIONAL_BOARD_ID.test(value)) {
    throw new Error('baseline launch optional synthetic board identity is invalid');
  }
  targetEnvironment[name] = value;
}

export function createClosedBaselineRunnerEnvironment({
  sourceEnvironment,
  attestationPath,
  attestationSha256,
  frontendContainerId,
  backendContainerId,
  frontendBuildId,
  backendBuildId,
  frontendContainerName,
  backendContainerName,
  dockerProject,
  dockerNetwork,
  webOrigin,
  apiOrigin,
  syntheticSeedLabel,
} = {}) {
  const adminId = requireExecutionSecret(sourceEnvironment, 'UI_BASELINE_ADMIN_ID');
  const adminSecret = requireExecutionSecret(sourceEnvironment, 'UI_BASELINE_ADMIN_SECRET');
  if (!path.isAbsolute(attestationPath ?? '')
    || path.resolve(attestationPath) !== attestationPath
    || !SHA256_HEX.test(attestationSha256 ?? '')
    || !DOCKER_CONTAINER_ID.test(frontendContainerId ?? '')
    || !DOCKER_CONTAINER_ID.test(backendContainerId ?? '')
    || frontendContainerId === backendContainerId
    || !DOCKER_IMAGE_ID.test(frontendBuildId ?? '')
    || !DOCKER_IMAGE_ID.test(backendBuildId ?? '')
    || frontendBuildId === backendBuildId) {
    throw new Error('baseline runner environment binding is invalid');
  }
  assertLaunchIdentity({
    projectName: dockerProject,
    networkName: dockerNetwork,
    databaseContainerName: `${dockerProject}-db`,
    apiContainerName: backendContainerName,
    frontendContainerName,
  });
  const runnerEnvironment = {
    ...safeSystemEnvironment(sourceEnvironment),
    TZ: 'Asia/Seoul',
    NEXT_PUBLIC_WEB_URL: webOrigin,
    NEXT_PUBLIC_API_URL: `${apiOrigin}/api/v1`,
    UI_BASELINE_WEB_URL: webOrigin,
    UI_BASELINE_API_URL: apiOrigin,
    UI_BASELINE_STACK_CLASSIFICATION: 'isolated-synthetic',
    UI_BASELINE_FRONTEND_BUILD_ID: frontendBuildId,
    UI_BASELINE_BACKEND_BUILD_ID: backendBuildId,
    UI_BASELINE_BUILD_ATTESTATION_PATH: attestationPath,
    UI_BASELINE_BUILD_ATTESTATION_SHA256: attestationSha256,
    UI_BASELINE_FRONTEND_CONTAINER_ID: frontendContainerId,
    UI_BASELINE_BACKEND_CONTAINER_ID: backendContainerId,
    UI_BASELINE_FRONTEND_CONTAINER_NAME: frontendContainerName,
    UI_BASELINE_BACKEND_CONTAINER_NAME: backendContainerName,
    UI_BASELINE_DOCKER_PROJECT: dockerProject,
    UI_BASELINE_DOCKER_NETWORK: dockerNetwork,
    UI_BASELINE_SYNTHETIC_SEED_LABEL: syntheticSeedLabel,
    UI_BASELINE_ADMIN_ID: adminId,
    UI_BASELINE_ADMIN_SECRET: adminSecret,
  };
  optionalBoardEnvironment(
    sourceEnvironment,
    runnerEnvironment,
    'UI_BASELINE_SYNTHETIC_BOARD_ID',
  );
  optionalBoardEnvironment(
    sourceEnvironment,
    runnerEnvironment,
    'UI_BASELINE_SYNTHETIC_FAQ_BOARD_ID',
  );
  return Object.freeze(runnerEnvironment);
}

function defaultExecuteCommand({
  command,
  args,
  cwd,
  env,
  timeoutMs = COMMAND_TIMEOUT_MS,
  maxOutputBytes = COMMAND_OUTPUT_MAX_BYTES,
  captureOutput = true,
  input,
}) {
  return execFileSync(command, args, {
    cwd,
    env,
    encoding: 'buffer',
    stdio: captureOutput
      ? [input === undefined ? 'ignore' : 'pipe', 'pipe', 'ignore']
      : [input === undefined ? 'ignore' : 'pipe', 'ignore', 'ignore'],
    timeout: timeoutMs,
    maxBuffer: maxOutputBytes,
    windowsHide: true,
    input,
  }) ?? Buffer.alloc(0);
}

function executeClosed(executeCommand, invocation, failureMessage) {
  try {
    const result = executeCommand(invocation);
    if (!Buffer.isBuffer(result)) throw new Error('non-buffer command result');
    return result;
  } catch {
    throw new Error(failureMessage);
  }
}

function boundedText(bytes, message) {
  if (!Buffer.isBuffer(bytes) || bytes.length > COMMAND_OUTPUT_MAX_BYTES) throw new Error(message);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).trim();
  } catch {
    throw new Error(message);
  }
  return text;
}

function captureRepositoryIdentity(repositoryRoot, executeCommand, sourceEnvironment) {
  const git = (args, failureMessage) => executeClosed(executeCommand, {
    command: 'git',
    args,
    cwd: repositoryRoot,
    env: safeSystemEnvironment(sourceEnvironment),
    timeoutMs: COMMAND_TIMEOUT_MS,
    maxOutputBytes: COMMAND_OUTPUT_MAX_BYTES,
    captureOutput: true,
  }, failureMessage);
  const discoveredRoot = boundedText(
    git(['rev-parse', '--show-toplevel'], 'baseline repository identity verification failed'),
    'baseline repository identity verification failed',
  );
  let requestedRealPath;
  let discoveredRealPath;
  try {
    requestedRealPath = realpathSync(repositoryRoot);
    discoveredRealPath = realpathSync(discoveredRoot);
  } catch {
    throw new Error('baseline repository identity verification failed');
  }
  if (requestedRealPath !== discoveredRealPath) {
    throw new Error('baseline repository identity verification failed');
  }
  const buildSha = boundedText(
    git(['rev-parse', '--verify', 'HEAD^{commit}'], 'baseline repository identity verification failed'),
    'baseline repository identity verification failed',
  );
  const commitTreeId = boundedText(
    git(['show', '-s', '--format=%T', 'HEAD'], 'baseline repository identity verification failed'),
    'baseline repository identity verification failed',
  );
  const status = git(
    ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored=no'],
    'baseline repository cleanliness verification failed',
  );
  if (!SHA1_HEX.test(buildSha) || !SHA1_HEX.test(commitTreeId) || status.length !== 0) {
    throw new Error('baseline launch requires the exact clean attested commit');
  }
  return Object.freeze({ buildSha, commitTreeId });
}

function readBoundedRegularFile(targetPath, maximumBytes, invalidMessage) {
  let descriptor;
  try {
    const before = lstatSync(targetPath);
    if (!before.isFile()
      || before.isSymbolicLink()
      || !Number.isSafeInteger(before.size)
      || before.size < 1
      || before.size > maximumBytes) throw new Error(invalidMessage);
    descriptor = openSync(
      targetPath,
      fileConstants.O_RDONLY | (process.platform === 'win32' ? 0 : fileConstants.O_NOFOLLOW),
    );
    const opened = fstatSync(descriptor);
    if (!opened.isFile() || opened.size !== before.size) throw new Error(invalidMessage);
    const bounded = Buffer.alloc(maximumBytes + 1);
    const bytesRead = readSync(descriptor, bounded, 0, bounded.length, 0);
    if (bytesRead !== before.size || bytesRead > maximumBytes) throw new Error(invalidMessage);
    const after = lstatSync(targetPath);
    if (!after.isFile()
      || after.isSymbolicLink()
      || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs) throw new Error(invalidMessage);
    return Buffer.from(bounded.subarray(0, bytesRead));
  } catch {
    throw new Error(invalidMessage);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function readBuildAttestation({
  repositoryRoot,
  attestationPath,
  attestationSha256,
}) {
  const invalidMessage = 'baseline build attestation file is invalid';
  if (typeof repositoryRoot !== 'string'
    || !path.isAbsolute(repositoryRoot)
    || typeof attestationPath !== 'string'
    || !path.isAbsolute(attestationPath)
    || path.resolve(attestationPath) !== attestationPath
    || !SHA256_HEX.test(attestationSha256 ?? '')) {
    throw new Error(invalidMessage);
  }
  let repositoryRealPath;
  let attestationRealPath;
  try {
    repositoryRealPath = realpathSync(repositoryRoot);
    attestationRealPath = realpathSync(attestationPath);
  } catch {
    throw new Error(invalidMessage);
  }
  if (attestationRealPath !== attestationPath
    || !isOutside(repositoryRealPath, attestationRealPath)) {
    throw new Error(invalidMessage);
  }
  const rawBytes = readBoundedRegularFile(
    attestationPath,
    BUILD_ATTESTATION_MAX_BYTES,
    invalidMessage,
  );
  try {
    return validateBaselineBuildAttestationBytes(rawBytes, {
      expectedAttestationSha256: attestationSha256,
    });
  } catch {
    throw new Error(invalidMessage);
  }
}

function prepareRuntimeDirectory(repositoryRoot, runtimeRoot, projectName) {
  if (typeof runtimeRoot !== 'string'
    || !path.isAbsolute(runtimeRoot)
    || path.resolve(runtimeRoot) !== runtimeRoot
    || !PROJECT_PATTERN.test(projectName)) {
    throw new Error('baseline launch runtime directory is invalid');
  }
  mkdirSync(runtimeRoot, { recursive: true, mode: 0o700 });
  let repositoryRealPath;
  let runtimeRealPath;
  try {
    const runtimeMetadata = lstatSync(runtimeRoot);
    if (!runtimeMetadata.isDirectory() || runtimeMetadata.isSymbolicLink()) {
      throw new Error('unsafe runtime root');
    }
    repositoryRealPath = realpathSync(repositoryRoot);
    runtimeRealPath = realpathSync(runtimeRoot);
  } catch {
    throw new Error('baseline launch runtime directory is invalid');
  }
  if (runtimeRealPath !== runtimeRoot || !isOutside(repositoryRealPath, runtimeRealPath)) {
    throw new Error('baseline launch runtime directory is invalid');
  }
  const runDirectory = path.join(runtimeRoot, projectName);
  if (existsSync(runDirectory)) {
    throw new Error(`baseline launch project already exists; recover project ${projectName}`);
  }
  mkdirSync(runDirectory, { recursive: false, mode: 0o700 });
  return Object.freeze({
    runDirectory,
    composePath: path.join(runDirectory, 'compose.json'),
  });
}

function writeComposeFile(composePath, specification) {
  const bytes = Buffer.from(`${JSON.stringify(specification, null, 2)}\n`, 'utf8');
  if (bytes.length < 1 || bytes.length > COMPOSE_FILE_MAX_BYTES) {
    throw new Error('baseline launch Compose file is invalid');
  }
  writeFileSync(composePath, bytes, { flag: 'wx', mode: 0o600 });
  const readback = readBoundedRegularFile(
    composePath,
    COMPOSE_FILE_MAX_BYTES,
    'baseline launch Compose file is invalid',
  );
  if (!readback.equals(bytes)) throw new Error('baseline launch Compose file is invalid');
  return bytes;
}

function removeRuntimeDescriptor({ runDirectory, composePath }) {
  const expectedComposePath = path.join(runDirectory, 'compose.json');
  if (composePath !== expectedComposePath || !path.isAbsolute(runDirectory)) {
    throw new Error('baseline runtime cleanup boundary is invalid');
  }
  let entries;
  try {
    const directoryMetadata = lstatSync(runDirectory);
    const composeMetadata = lstatSync(composePath);
    if (!directoryMetadata.isDirectory()
      || directoryMetadata.isSymbolicLink()
      || !composeMetadata.isFile()
      || composeMetadata.isSymbolicLink()) {
      throw new Error('unsafe runtime descriptor');
    }
    entries = readdirSync(runDirectory);
  } catch {
    throw new Error('baseline runtime cleanup boundary is invalid');
  }
  if (entries.length !== 1 || entries[0] !== 'compose.json') {
    throw new Error('baseline runtime cleanup boundary is invalid');
  }
  unlinkSync(composePath);
  rmdirSync(runDirectory);
}

function commonComposeArgs({ projectName, runDirectory, composePath }) {
  if (composePath !== path.join(runDirectory, 'compose.json')) {
    throw new Error('baseline launch Compose descriptor is invalid');
  }
  return [
    'compose',
    '--project-name', projectName,
    '--project-directory', runDirectory,
    '--file', '-',
  ];
}

function runCompose({
  executeCommand,
  repositoryRoot,
  composeEnvironment,
  commonArgs,
  args,
  failureMessage,
  timeoutMs = COMMAND_TIMEOUT_MS,
  captureOutput = false,
  composeBytes,
  composePath,
}) {
  if (!Buffer.isBuffer(composeBytes)
    || composeBytes.length < 1
    || composeBytes.length > COMPOSE_FILE_MAX_BYTES
    || typeof composePath !== 'string') {
    throw new Error('baseline launch Compose descriptor is invalid');
  }
  return executeClosed(executeCommand, {
    command: 'docker',
    args: [...commonArgs, ...args],
    cwd: repositoryRoot,
    env: composeEnvironment,
    timeoutMs,
    maxOutputBytes: COMMAND_OUTPUT_MAX_BYTES,
    captureOutput,
    input: composeBytes,
    runtimeDescriptorPath: composePath,
  }, failureMessage);
}

function exactComposeContainerId({
  executeCommand,
  repositoryRoot,
  composeEnvironment,
  commonArgs,
  composeBytes,
  composePath,
  service,
}) {
  const output = runCompose({
    executeCommand,
    repositoryRoot,
    composeEnvironment,
    commonArgs,
    args: ['ps', '--quiet', '--all', service],
    failureMessage: 'baseline Compose container identity lookup failed',
    captureOutput: true,
    composeBytes,
    composePath,
  });
  const containerId = boundedText(output, 'baseline Compose container identity is invalid');
  if (!DOCKER_CONTAINER_ID.test(containerId)) {
    throw new Error('baseline Compose container identity is invalid');
  }
  return containerId;
}

function validateLaunchedStack({
  executeCommand,
  repositoryRoot,
  attestation,
  identity,
  frontendContainerId,
  backendContainerId,
  webOrigin,
  apiOrigin,
  sourceEnvironment,
}) {
  const inspectContainer = ({ containerId, privatePort, networkName }) => {
    const invocation = createBaselineDockerInspectInvocation({
      containerId,
      privatePort,
      networkName,
    });
    return executeClosed(executeCommand, {
      ...invocation,
      cwd: repositoryRoot,
      env: safeSystemEnvironment(sourceEnvironment),
      captureOutput: true,
    }, 'baseline Docker inspection failed');
  };
  const inspectImage = ({ imageId }) => {
    const invocation = createBaselineDockerImageInspectInvocation({ imageId });
    return executeClosed(executeCommand, {
      ...invocation,
      cwd: repositoryRoot,
      env: safeSystemEnvironment(sourceEnvironment),
      captureOutput: true,
    }, 'baseline Docker image inspection failed');
  };
  return validateBaselineDockerStack({
    frontendContainerId,
    backendContainerId,
    frontendContainerName: identity.frontendContainerName,
    backendContainerName: identity.apiContainerName,
    frontendBuildId: attestation.images.frontend.id,
    backendBuildId: attestation.images.api.id,
    frontendOrigin: webOrigin,
    apiOrigin,
    dockerProject: identity.projectName,
    dockerNetwork: identity.networkName,
    buildSha: attestation.buildSha,
    buildInputTreeHash: attestation.buildInputTreeHash,
    inspectContainer,
    inspectImage,
  });
}

function createAuthEnvironment(sourceEnvironment, webOrigin, apiOrigin) {
  return Object.freeze({
    ...safeSystemEnvironment(sourceEnvironment),
    TZ: 'Asia/Seoul',
    NEXT_PUBLIC_WEB_URL: webOrigin,
    NEXT_PUBLIC_API_URL: `${apiOrigin}/api/v1`,
  });
}

function executeContracts(executeCommand, repositoryRoot, sourceEnvironment) {
  executeClosed(executeCommand, {
    command: process.execPath,
    args: ['--test', ...CONTRACT_PATHS],
    cwd: repositoryRoot,
    env: safeSystemEnvironment(sourceEnvironment),
    timeoutMs: 3 * 60_000,
    maxOutputBytes: COMMAND_OUTPUT_MAX_BYTES,
    captureOutput: false,
  }, 'baseline launch contract verification failed');
}

function executeAuthSetup(executeCommand, repositoryRoot, environment) {
  executeClosed(executeCommand, {
    command: process.execPath,
    args: [
      'frontend/node_modules/@playwright/test/cli.js',
      'test',
      '--project=setup',
    ],
    cwd: repositoryRoot,
    env: environment,
    timeoutMs: AUTH_SETUP_TIMEOUT_MS,
    maxOutputBytes: COMMAND_OUTPUT_MAX_BYTES,
    captureOutput: false,
  }, 'baseline authentication setup failed');
}

function executeRunner(executeCommand, repositoryRoot, environment) {
  executeClosed(executeCommand, {
    command: process.execPath,
    args: [
      'frontend/scripts/ui-quality-baseline-runner.mjs',
      '--execute',
      '--include-performance',
    ],
    cwd: repositoryRoot,
    env: environment,
    timeoutMs: RUNNER_TIMEOUT_MS,
    maxOutputBytes: COMMAND_OUTPUT_MAX_BYTES,
    captureOutput: false,
  }, 'baseline runner command failed');
}

function runtimeRootFrom(input) {
  return input?.runtimeRoot ?? path.join(tmpdir(), BASELINE_LAUNCH_RUNTIME_DIRECTORY);
}

export function launchAttestedBaseline(input = {}, {
  executeCommand = defaultExecuteCommand,
  randomBytes = secureRandomBytes,
} = {}) {
  const repositoryRoot = path.resolve(input.repositoryRoot ?? defaultRepositoryRoot);
  if (!validatePort(input.webPort)
    || !validatePort(input.apiPort)
    || input.webPort === input.apiPort
    || typeof executeCommand !== 'function'
    || typeof randomBytes !== 'function') {
    throw new Error('baseline launch request is invalid');
  }
  const attestationPath = input.attestationPath;
  const attestationSha256 = input.attestationSha256;
  const sourceEnvironment = input.environment ?? process.env;
  const attestation = readBuildAttestation({
    repositoryRoot,
    attestationPath,
    attestationSha256,
  });
  const repositoryIdentity = captureRepositoryIdentity(
    repositoryRoot,
    executeCommand,
    sourceEnvironment,
  );
  if (repositoryIdentity.buildSha !== attestation.buildSha
    || repositoryIdentity.commitTreeId !== attestation.commitTreeId) {
    throw new Error('baseline launch requires the exact clean attested commit');
  }
  requireExecutionSecret(sourceEnvironment, 'UI_BASELINE_DB_PASSWORD');
  requireExecutionSecret(sourceEnvironment, 'UI_BASELINE_JWT_SECRET');
  requireExecutionSecret(sourceEnvironment, 'UI_BASELINE_ADMIN_ID');
  requireExecutionSecret(sourceEnvironment, 'UI_BASELINE_ADMIN_SECRET');
  executeContracts(executeCommand, repositoryRoot, sourceEnvironment);

  const identity = createRunIdentity(randomBytes);
  const webOrigin = `http://127.0.0.1:${input.webPort}`;
  const apiOrigin = `http://127.0.0.1:${input.apiPort}`;
  const runtime = prepareRuntimeDirectory(
    repositoryRoot,
    path.resolve(runtimeRootFrom(input)),
    identity.projectName,
  );
  const specification = createBaselineComposeSpecification({
    ...identity,
    apiImageId: attestation.images.api.id,
    frontendImageId: attestation.images.frontend.id,
    webPort: input.webPort,
    apiPort: input.apiPort,
  });
  const composeBytes = writeComposeFile(runtime.composePath, specification);
  const composeEnvironment = createClosedComposeEnvironment({ sourceEnvironment, webOrigin });
  const commonArgs = commonComposeArgs({
    projectName: identity.projectName,
    runDirectory: runtime.runDirectory,
    composePath: runtime.composePath,
  });
  let primaryError;
  let cleanupError;
  try {
    runCompose({
      executeCommand,
      repositoryRoot,
      composeEnvironment,
      commonArgs,
      args: ['config', '--quiet'],
      failureMessage: 'baseline Compose configuration validation failed',
      composeBytes,
      composePath: runtime.composePath,
    });
    runCompose({
      executeCommand,
      repositoryRoot,
      composeEnvironment,
      commonArgs,
      args: [
        'up',
        '--detach',
        '--wait',
        '--wait-timeout', '300',
        '--no-build',
        '--pull', 'never',
      ],
      failureMessage: 'baseline Compose up failed',
      timeoutMs: COMPOSE_UP_TIMEOUT_MS,
      composeBytes,
      composePath: runtime.composePath,
    });
    const frontendContainerId = exactComposeContainerId({
      executeCommand,
      repositoryRoot,
      composeEnvironment,
      commonArgs,
      service: 'frontend',
      composeBytes,
      composePath: runtime.composePath,
    });
    const backendContainerId = exactComposeContainerId({
      executeCommand,
      repositoryRoot,
      composeEnvironment,
      commonArgs,
      service: 'api',
      composeBytes,
      composePath: runtime.composePath,
    });
    validateLaunchedStack({
      executeCommand,
      repositoryRoot,
      attestation,
      identity,
      frontendContainerId,
      backendContainerId,
      webOrigin,
      apiOrigin,
      sourceEnvironment,
    });
    executeAuthSetup(
      executeCommand,
      repositoryRoot,
      createAuthEnvironment(sourceEnvironment, webOrigin, apiOrigin),
    );
    const runnerEnvironment = createClosedBaselineRunnerEnvironment({
      sourceEnvironment,
      attestationPath,
      attestationSha256,
      frontendContainerId,
      backendContainerId,
      frontendBuildId: attestation.images.frontend.id,
      backendBuildId: attestation.images.api.id,
      frontendContainerName: identity.frontendContainerName,
      backendContainerName: identity.apiContainerName,
      dockerProject: identity.projectName,
      dockerNetwork: identity.networkName,
      webOrigin,
      apiOrigin,
      syntheticSeedLabel: identity.syntheticSeedLabel,
    });
    executeRunner(executeCommand, repositoryRoot, runnerEnvironment);
  } catch (error) {
    primaryError = error instanceof Error ? error : new Error('baseline launch failed');
  } finally {
    try {
      runCompose({
        executeCommand,
        repositoryRoot,
        composeEnvironment: safeSystemEnvironment(sourceEnvironment),
        commonArgs,
        args: ['down', '--volumes', '--remove-orphans', '--timeout', '10'],
        failureMessage: 'baseline Compose cleanup failed',
        timeoutMs: COMPOSE_UP_TIMEOUT_MS,
        composeBytes,
        composePath: runtime.composePath,
      });
      removeRuntimeDescriptor(runtime);
    } catch {
      cleanupError = new Error(
        `baseline stack cleanup failed; recover project ${identity.projectName}`,
      );
    }
  }
  if (cleanupError) throw cleanupError;
  if (primaryError) throw primaryError;
  return Object.freeze({
    status: 'completed',
    projectName: identity.projectName,
    webOrigin,
    apiOrigin,
    cleanup: 'complete',
  });
}

function parsePortBinding(binding, privatePort) {
  const match = /^127\.0\.0\.1:(\d{1,5}):(\d{1,5})$/u.exec(binding ?? '');
  if (!match || Number(match[2]) !== privatePort) {
    throw new Error('baseline recovery Compose descriptor is invalid');
  }
  const port = Number(match[1]);
  if (!validatePort(port)) throw new Error('baseline recovery Compose descriptor is invalid');
  return port;
}

function readRecoverySpecification({ runtimeRoot, projectName }) {
  const runDirectory = path.join(runtimeRoot, projectName);
  const composePath = path.join(runDirectory, 'compose.json');
  let runtimeRealPath;
  let runRealPath;
  try {
    const runtimeMetadata = lstatSync(runtimeRoot);
    const runMetadata = lstatSync(runDirectory);
    if (!runtimeMetadata.isDirectory()
      || runtimeMetadata.isSymbolicLink()
      || !runMetadata.isDirectory()
      || runMetadata.isSymbolicLink()) throw new Error('unsafe recovery directory');
    runtimeRealPath = realpathSync(runtimeRoot);
    runRealPath = realpathSync(runDirectory);
  } catch {
    throw new Error('baseline recovery descriptor is invalid');
  }
  if (runtimeRealPath !== runtimeRoot
    || runRealPath !== runDirectory
    || path.dirname(runRealPath) !== runtimeRealPath) {
    throw new Error('baseline recovery descriptor is invalid');
  }
  const bytes = readBoundedRegularFile(
    composePath,
    COMPOSE_FILE_MAX_BYTES,
    'baseline recovery Compose descriptor is invalid',
  );
  let specification;
  try {
    specification = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error('baseline recovery Compose descriptor is invalid');
  }
  if (!exactObjectKeys(specification, ['services', 'networks'])
    || !exactObjectKeys(specification.services, ['api', 'db', 'frontend'])
    || !exactObjectKeys(specification.networks, ['baseline'])
    || !Array.isArray(specification.services.api.ports)
    || specification.services.api.ports.length !== 1
    || !Array.isArray(specification.services.frontend.ports)
    || specification.services.frontend.ports.length !== 1) {
    throw new Error('baseline recovery Compose descriptor is invalid');
  }
  const webPort = parsePortBinding(specification.services.frontend.ports[0], 3000);
  const apiPort = parsePortBinding(specification.services.api.ports[0], 8080);
  const expected = createBaselineComposeSpecification({
    projectName,
    networkName: `${projectName}-net`,
    databaseContainerName: `${projectName}-db`,
    apiContainerName: `${projectName}-api`,
    frontendContainerName: `${projectName}-frontend`,
    apiImageId: specification.services.api.image,
    frontendImageId: specification.services.frontend.image,
    webPort,
    apiPort,
  });
  if (JSON.stringify(specification) !== JSON.stringify(expected)) {
    throw new Error('baseline recovery Compose descriptor is invalid');
  }
  return Object.freeze({ runDirectory, composePath, composeBytes: bytes });
}

export function recoverAttestedBaseline(input = {}, {
  executeCommand = defaultExecuteCommand,
} = {}) {
  const repositoryRoot = path.resolve(input.repositoryRoot ?? defaultRepositoryRoot);
  const runtimeRoot = path.resolve(runtimeRootFrom(input));
  const projectName = input.projectName;
  if (!PROJECT_PATTERN.test(projectName ?? '') || typeof executeCommand !== 'function') {
    throw new Error('baseline recovery request is invalid');
  }
  let repositoryRealPath;
  let runtimeRealPath;
  try {
    repositoryRealPath = realpathSync(repositoryRoot);
    runtimeRealPath = realpathSync(runtimeRoot);
  } catch {
    throw new Error('baseline recovery request is invalid');
  }
  if (!isOutside(repositoryRealPath, runtimeRealPath)) {
    throw new Error('baseline recovery request is invalid');
  }
  const runtime = readRecoverySpecification({ runtimeRoot, projectName });
  const commonArgs = commonComposeArgs({
    projectName,
    runDirectory: runtime.runDirectory,
    composePath: runtime.composePath,
  });
  runCompose({
    executeCommand,
    repositoryRoot,
    composeEnvironment: safeSystemEnvironment(input.environment ?? process.env),
    commonArgs,
    args: ['down', '--volumes', '--remove-orphans', '--timeout', '10'],
    failureMessage: 'baseline recovery cleanup failed',
    timeoutMs: COMPOSE_UP_TIMEOUT_MS,
    composeBytes: runtime.composeBytes,
    composePath: runtime.composePath,
  });
  removeRuntimeDescriptor(runtime);
  return Object.freeze({ status: 'recovered', projectName, cleanup: 'complete' });
}

export function parseBaselineLaunchArguments(argv, {
  repositoryRoot = process.cwd(),
} = {}) {
  if (!Array.isArray(argv) || argv.length % 2 !== 0) {
    throw new Error('baseline launch CLI arguments are invalid');
  }
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (typeof key !== 'string'
      || !key.startsWith('--')
      || typeof value !== 'string'
      || values.has(key)) {
      throw new Error('baseline launch CLI arguments are invalid');
    }
    values.set(key, value);
  }
  if (values.get('--execute') !== 'confirmed') {
    throw new Error('baseline launch CLI arguments are invalid');
  }
  if (values.has('--recover-project')) {
    if (values.size !== 2 || !PROJECT_PATTERN.test(values.get('--recover-project'))) {
      throw new Error('baseline launch CLI arguments are invalid');
    }
    return {
      mode: 'recover',
      repositoryRoot,
      projectName: values.get('--recover-project'),
    };
  }
  const expected = [
    '--attestation',
    '--attestation-sha256',
    '--web-port',
    '--api-port',
    '--execute',
  ];
  if (values.size !== expected.length || expected.some((key) => !values.has(key))) {
    throw new Error('baseline launch CLI arguments are invalid');
  }
  const webPortText = values.get('--web-port');
  const apiPortText = values.get('--api-port');
  if (!/^\d{1,5}$/u.test(webPortText)
    || !/^\d{1,5}$/u.test(apiPortText)
    || !SHA256_HEX.test(values.get('--attestation-sha256'))) {
    throw new Error('baseline launch CLI arguments are invalid');
  }
  const webPort = Number(webPortText);
  const apiPort = Number(apiPortText);
  if (!validatePort(webPort) || !validatePort(apiPort) || webPort === apiPort) {
    throw new Error('baseline launch CLI arguments are invalid');
  }
  const attestationPath = path.resolve(values.get('--attestation'));
  if (!path.isAbsolute(values.get('--attestation'))
    || attestationPath !== values.get('--attestation')) {
    throw new Error('baseline launch CLI arguments are invalid');
  }
  return {
    mode: 'launch',
    repositoryRoot,
    attestationPath,
    attestationSha256: values.get('--attestation-sha256'),
    webPort,
    apiPort,
  };
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = parseBaselineLaunchArguments(process.argv.slice(2), {
      repositoryRoot: process.cwd(),
    });
    const result = options.mode === 'recover'
      ? recoverAttestedBaseline({ ...options, environment: process.env })
      : launchAttestedBaseline({ ...options, environment: process.env });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const code = /cleanup failed/u.test(message)
      ? message
      : /arguments|request/u.test(message)
        ? 'baseline-launch-invalid-request'
        : /attestation|attested commit/u.test(message)
          ? 'baseline-launch-build-unverified'
          : /contract/u.test(message)
            ? 'baseline-launch-contract-unverified'
            : /authentication/u.test(message)
              ? 'baseline-launch-auth-unverified'
              : /runner/u.test(message)
                ? 'baseline-launch-runner-failed'
                : /Docker|Compose|stack/u.test(message)
                  ? 'baseline-launch-stack-unverified'
                  : 'baseline-launch-failed';
    process.stderr.write(`UI quality baseline launcher stopped: ${code}\n`);
    process.exitCode = 1;
  }
}
