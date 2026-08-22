import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createBaselineBuildAttestation } from './ui-quality-baseline-build.mjs';
import {
  stableJson,
} from '../frontend/scripts/ui-quality-baseline-core.mjs';
import {
  BASELINE_LAUNCH_RUNTIME_DIRECTORY,
  createBaselineComposeSpecification,
  createClosedBaselineRunnerEnvironment,
  launchAttestedBaseline,
  parseBaselineLaunchArguments,
  recoverAttestedBaseline,
} from './ui-quality-baseline-launch.mjs';

const BUILD_SHA = 'a'.repeat(40);
const BUILD_INPUT_TREE_HASH = 'b'.repeat(64);
const COMMIT_TREE_ID = 'c'.repeat(40);
const API_IMAGE_ID = `sha256:${'d'.repeat(64)}`;
const FRONTEND_IMAGE_ID = `sha256:${'e'.repeat(64)}`;
const API_CONTAINER_ID = '1'.repeat(64);
const FRONTEND_CONTAINER_ID = '2'.repeat(64);
const RUN_SUFFIX = '11'.repeat(16);
const PROJECT = `egov-uiux-baseline-r13-${RUN_SUFFIX}`;
const NETWORK = `${PROJECT}-net`;
const API_CONTAINER = `${PROJECT}-api`;
const FRONTEND_CONTAINER = `${PROJECT}-frontend`;
const WEB_PORT = 31_013;
const API_PORT = 18_091;
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const externalAttestationPath = path.join(
  path.parse(repositoryRoot).root,
  'outside',
  'attestation.json',
);

const temporaryRoots = [];
test.afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function createFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'uiq-launch-contract-'));
  temporaryRoots.push(root);
  const repositoryRoot = path.join(root, 'repository');
  const externalRoot = path.join(root, 'external');
  const runtimeRoot = path.join(root, BASELINE_LAUNCH_RUNTIME_DIRECTORY);
  mkdirSync(repositoryRoot);
  mkdirSync(externalRoot);
  const attestationPath = path.join(externalRoot, 'build-attestation.json');
  const attestation = createBaselineBuildAttestation({
    buildSha: BUILD_SHA,
    buildInputTreeHash: BUILD_INPUT_TREE_HASH,
    commitTreeId: COMMIT_TREE_ID,
    apiImageId: API_IMAGE_ID,
    frontendImageId: FRONTEND_IMAGE_ID,
  });
  const attestationBytes = Buffer.from(`${stableJson(attestation)}\n`, 'utf8');
  writeFileSync(attestationPath, attestationBytes);
  return {
    repositoryRoot,
    runtimeRoot,
    attestationPath,
    attestationSha256: sha256(attestationBytes),
  };
}

function executionEnvironment() {
  return {
    PATH: 'safe-path',
    DOCKER_CONTEXT: 'baseline-closed-context',
    UI_BASELINE_DB_NAME: 'egovdb',
    UI_BASELINE_DB_USER: 'egov',
    UI_BASELINE_DB_PASSWORD: 'private-db-password',
    UI_BASELINE_JWT_SECRET: 'private-jwt-secret',
    UI_BASELINE_ADMIN_ID: 'private-admin-id',
    UI_BASELINE_ADMIN_SECRET: 'private-admin-secret',
    UNRELATED_PRIVATE_VALUE: 'must-not-reach-any-child',
  };
}

function containerProjection(role, mutation = {}) {
  const frontend = role === 'frontend';
  const privatePort = frontend ? '3000/tcp' : '8080/tcp';
  const projection = {
    Id: frontend ? FRONTEND_CONTAINER_ID : API_CONTAINER_ID,
    Name: `/${frontend ? FRONTEND_CONTAINER : API_CONTAINER}`,
    Image: frontend ? FRONTEND_IMAGE_ID : API_IMAGE_ID,
    State: {
      Running: true,
      Status: 'running',
      Health: { Status: 'healthy' },
    },
    RestartCount: 0,
    Ports: {
      [privatePort]: [{
        HostIp: '127.0.0.1',
        HostPort: String(frontend ? WEB_PORT : API_PORT),
      }],
    },
    Labels: {
      ComposeProject: PROJECT,
      ComposeService: frontend ? 'frontend' : 'api',
    },
    NetworkPresent: true,
  };
  if (mutation.path) {
    let target = projection;
    for (const segment of mutation.path.slice(0, -1)) target = target[segment];
    target[mutation.path.at(-1)] = mutation.value;
  }
  return Buffer.from(JSON.stringify(projection), 'utf8');
}

function imageProjection(role, mutation = {}) {
  const frontend = role === 'frontend';
  const projection = {
    Id: frontend ? FRONTEND_IMAGE_ID : API_IMAGE_ID,
    Labels: {
      BuildSha: BUILD_SHA,
      BuildInputTreeHash: BUILD_INPUT_TREE_HASH,
    },
  };
  if (mutation.path) {
    let target = projection;
    for (const segment of mutation.path.slice(0, -1)) target = target[segment];
    target[mutation.path.at(-1)] = mutation.value;
  }
  return Buffer.from(JSON.stringify(projection), 'utf8');
}

function fakeExecutor({ containerMutation, imageMutation, failAt } = {}) {
  const calls = [];
  const composeSnapshots = new Map();
  const execute = (invocation) => {
    calls.push(invocation);
    const { command, args } = invocation;
    const joined = [command, ...args].join(' ');
    if (failAt && joined.includes(failAt)) throw new Error('private command failure detail');

    if (command === 'git') {
      if (args.includes('--show-toplevel')) return Buffer.from(`${invocation.cwd}\n`);
      if (args.includes('HEAD^{commit}')) return Buffer.from(`${BUILD_SHA}\n`);
      if (args.includes('--format=%T')) return Buffer.from(`${COMMIT_TREE_ID}\n`);
      if (args.includes('--porcelain=v1')) return Buffer.alloc(0);
    }
    if (command === 'docker' && args[0] === 'compose') {
      if (args.includes('config')) {
        assert.equal(args[args.indexOf('--file') + 1], '-');
        assert.ok(Buffer.isBuffer(invocation.input));
        composeSnapshots.set(invocation.runtimeDescriptorPath, invocation.input.toString('utf8'));
      }
      if (args.includes('ps')) {
        const service = args.at(-1);
        return Buffer.from(`${service === 'frontend' ? FRONTEND_CONTAINER_ID : API_CONTAINER_ID}\n`);
      }
      return Buffer.alloc(0);
    }
    if (command === 'docker' && args[0] === 'inspect') {
      const id = args.at(-1);
      const role = id === FRONTEND_CONTAINER_ID ? 'frontend' : 'backend';
      return containerProjection(role, containerMutation?.[role]);
    }
    if (command === 'docker' && args[0] === 'image') {
      const id = args.at(-1);
      const role = id === FRONTEND_IMAGE_ID ? 'frontend' : 'backend';
      return imageProjection(role, imageMutation?.[role]);
    }
    if (command === process.execPath) return Buffer.alloc(0);
    throw new Error(`unexpected command in contract double: ${joined}`);
  };
  return { calls, composeSnapshots, execute };
}

function launchInput(fixture) {
  return {
    ...fixture,
    webPort: WEB_PORT,
    apiPort: API_PORT,
    environment: executionEnvironment(),
  };
}

function launchDependencies(executor) {
  return {
    executeCommand: executor.execute,
    randomBytes: () => Buffer.from(RUN_SUFFIX, 'hex'),
  };
}

function findCall(calls, predicate) {
  const call = calls.find(predicate);
  assert.ok(call, 'expected command invocation was not observed');
  return call;
}

test('compose specification binds immutable images, run-scoped names/network and loopback-only ports without secret values', () => {
  const specification = createBaselineComposeSpecification({
    projectName: PROJECT,
    networkName: NETWORK,
    apiContainerName: API_CONTAINER,
    frontendContainerName: FRONTEND_CONTAINER,
    databaseContainerName: `${PROJECT}-db`,
    apiImageId: API_IMAGE_ID,
    frontendImageId: FRONTEND_IMAGE_ID,
    webPort: WEB_PORT,
    apiPort: API_PORT,
  });
  assert.equal(specification.services.api.image, API_IMAGE_ID);
  assert.equal(specification.services.frontend.image, FRONTEND_IMAGE_ID);
  assert.equal(specification.services.api.container_name, API_CONTAINER);
  assert.equal(specification.services.frontend.container_name, FRONTEND_CONTAINER);
  assert.deepEqual(specification.services.api.ports, [`127.0.0.1:${API_PORT}:8080`]);
  assert.deepEqual(specification.services.frontend.ports, [`127.0.0.1:${WEB_PORT}:3000`]);
  assert.equal(specification.networks.baseline.name, NETWORK);
  assert.equal(
    specification.services.db.healthcheck.test[1],
    'pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"',
  );
  assert.equal(JSON.stringify(specification).includes('private-'), false);
  assert.deepEqual(specification.services.api.environment, [
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
  ]);
});

test('root package and protocol expose the exact contract-first launch and bounded recovery commands', () => {
  const rootPackage = JSON.parse(readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
  assert.equal(
    rootPackage.scripts['ui-quality:baseline:launch'],
    'node scripts/ui-quality-baseline-launch.mjs',
  );
  const protocol = readFileSync(
    path.join(repositoryRoot, 'docs/04-operations/ui-ux-baseline-protocol.md'),
    'utf8',
  );
  assert.match(protocol, /--backend-api-url http:\/\/api:8080\/api\/v1 --public-api-url http:\/\/api:8080\/api\/v1/u);
  assert.doesNotMatch(protocol, /--backend-api-url http:\/\/egov-uiux-r13-api:8080/u);
  assert.match(protocol, /npm run ui-quality:baseline:launch -- --attestation <absolute-outside-repository-attestation-path> --attestation-sha256 <64-lowercase-hex> --web-port <loopback-host-port> --api-port <different-loopback-host-port> --execute confirmed/u);
  assert.match(protocol, /npm run ui-quality:baseline:launch -- --recover-project egov-uiux-baseline-r13-<32-lowercase-hex> --execute confirmed/u);
  for (const name of [
    'UI_BASELINE_DB_PASSWORD',
    'UI_BASELINE_JWT_SECRET',
    'UI_BASELINE_ADMIN_ID',
    'UI_BASELINE_ADMIN_SECRET',
  ]) assert.match(protocol, new RegExp(`\\b${name}\\b`, 'u'));

  const launcherSource = readFileSync(
    path.join(repositoryRoot, 'scripts/ui-quality-baseline-launch.mjs'),
    'utf8',
  );
  for (const contractPath of [
    'scripts/ui-quality-scenarios-contract.test.mjs',
    'scripts/ui-quality-baseline-runner-contract.test.mjs',
    'scripts/ui-quality-baseline-launch-contract.test.mjs',
  ]) assert.match(launcherSource, new RegExp(contractPath.replaceAll('.', '\\.'), 'u'));
  assert.doesNotMatch(launcherSource, /\bexecSync\s*\(/u);
  assert.doesNotMatch(launcherSource, /shell\s*:\s*true/u);
});

test('runner environment is a closed allowlist and does not inherit database, JWT or unrelated secrets', () => {
  const environment = createClosedBaselineRunnerEnvironment({
    sourceEnvironment: executionEnvironment(),
    attestationPath: externalAttestationPath,
    attestationSha256: 'f'.repeat(64),
    frontendContainerId: FRONTEND_CONTAINER_ID,
    backendContainerId: API_CONTAINER_ID,
    frontendBuildId: FRONTEND_IMAGE_ID,
    backendBuildId: API_IMAGE_ID,
    frontendContainerName: FRONTEND_CONTAINER,
    backendContainerName: API_CONTAINER,
    dockerProject: PROJECT,
    dockerNetwork: NETWORK,
    webOrigin: `http://127.0.0.1:${WEB_PORT}`,
    apiOrigin: `http://127.0.0.1:${API_PORT}`,
    syntheticSeedLabel: 'isolated-fixture-v1',
  });
  assert.equal(environment.UI_BASELINE_ADMIN_ID, 'private-admin-id');
  assert.equal(environment.UI_BASELINE_ADMIN_SECRET, 'private-admin-secret');
  assert.equal(environment.UI_BASELINE_DB_PASSWORD, undefined);
  assert.equal(environment.UI_BASELINE_JWT_SECRET, undefined);
  assert.equal(environment.UNRELATED_PRIVATE_VALUE, undefined);
  assert.equal(environment.UI_BASELINE_STACK_CLASSIFICATION, 'isolated-synthetic');
  assert.equal(environment.UI_BASELINE_SYNTHETIC_SEED_LABEL, 'isolated-fixture-v1');
  assert.equal(environment.NEXT_PUBLIC_API_URL, `http://127.0.0.1:${API_PORT}/api/v1`);
});

test('launch runs contracts before Compose, validates exact stack, passes a closed runner env and always cleans up', () => {
  const fixture = createFixture();
  const executor = fakeExecutor();
  const result = launchAttestedBaseline(launchInput(fixture), launchDependencies(executor));

  assert.deepEqual(result, {
    status: 'completed',
    projectName: PROJECT,
    webOrigin: `http://127.0.0.1:${WEB_PORT}`,
    apiOrigin: `http://127.0.0.1:${API_PORT}`,
    cleanup: 'complete',
  });
  const contractCallIndex = executor.calls.findIndex(({ command, args }) => (
    command === process.execPath && args[0] === '--test'
  ));
  const upCallIndex = executor.calls.findIndex(({ command, args }) => (
    command === 'docker' && args.includes('up')
  ));
  assert.ok(contractCallIndex >= 0 && contractCallIndex < upCallIndex);

  const configCall = findCall(executor.calls, ({ command, args }) => (
    command === 'docker' && args.includes('config')
  ));
  const composeFile = configCall.runtimeDescriptorPath;
  const serializedCompose = executor.composeSnapshots.get(composeFile);
  assert.equal(typeof serializedCompose, 'string');
  assert.equal(
    configCall.env.SPRING_DATASOURCE_JDBC_URL,
    'jdbc:postgresql://db:5432/egovdb',
  );
  for (const secret of ['private-db-password', 'private-jwt-secret', 'private-admin-secret']) {
    assert.equal(serializedCompose.includes(secret), false);
  }

  const runnerCall = findCall(executor.calls, ({ command, args }) => (
    command === process.execPath
      && args.includes('frontend/scripts/ui-quality-baseline-runner.mjs')
  ));
  assert.equal(runnerCall.env.UI_BASELINE_ADMIN_SECRET, 'private-admin-secret');
  assert.equal(runnerCall.env.UI_BASELINE_DB_PASSWORD, undefined);
  assert.equal(runnerCall.env.UI_BASELINE_JWT_SECRET, undefined);
  assert.equal(runnerCall.env.UNRELATED_PRIVATE_VALUE, undefined);

  const downCall = findCall(executor.calls, ({ command, args }) => (
    command === 'docker' && args.includes('down')
  ));
  assert.ok(downCall.args.includes('--volumes'));
  assert.ok(downCall.args.includes('--remove-orphans'));
  for (const dockerCall of executor.calls.filter(({ command }) => command === 'docker')) {
    assert.equal(dockerCall.env.DOCKER_CONTEXT, 'baseline-closed-context');
  }
  assert.equal(existsSync(path.dirname(composeFile)), false);
});

test('cleanup leaves the recovery descriptor intact when the bounded runtime directory is not empty', () => {
  const fixture = createFixture();
  const executor = fakeExecutor();
  const wrapped = {
    execute(invocation) {
      const result = executor.execute(invocation);
      if (invocation.command === 'docker' && invocation.args.includes('down')) {
        const composePath = invocation.runtimeDescriptorPath;
        writeFileSync(path.join(path.dirname(composePath), 'unexpected-entry'), 'sentinel');
      }
      return result;
    },
  };
  assert.throws(
    () => launchAttestedBaseline(launchInput(fixture), launchDependencies(wrapped)),
    /cleanup failed/,
  );
  assert.equal(
    existsSync(path.join(fixture.runtimeRoot, PROJECT, 'compose.json')),
    true,
  );
});

const hostileContainerCases = [
  ['wrong full container ID', { path: ['Id'], value: '3'.repeat(64) }, /container identity/],
  ['wrong image binding', { path: ['Image'], value: `sha256:${'9'.repeat(64)}` }, /image binding/],
  ['wrong published port', { path: ['Ports', '3000/tcp', 0, 'HostPort'], value: '39999' }, /port binding/],
  ['wrong project label', { path: ['Labels', 'ComposeProject'], value: `${PROJECT}-other` }, /stack provenance/],
  ['wrong service label', { path: ['Labels', 'ComposeService'], value: 'api' }, /stack provenance/],
  ['wrong network membership', { path: ['NetworkPresent'], value: false }, /stack provenance/],
  ['unhealthy container', { path: ['State', 'Health', 'Status'], value: 'unhealthy' }, /runtime state/],
  ['restarted container', { path: ['RestartCount'], value: 1 }, /runtime state/],
];

for (const [name, mutation, expected] of hostileContainerCases) {
  test(`launch rejects ${name} and still tears the project down`, () => {
    const fixture = createFixture();
    const executor = fakeExecutor({ containerMutation: { frontend: mutation } });
    assert.throws(
      () => launchAttestedBaseline(launchInput(fixture), launchDependencies(executor)),
      expected,
    );
    assert.ok(executor.calls.some(({ command, args }) => command === 'docker' && args.includes('down')));
    assert.equal(executor.calls.some(({ command, args }) => (
      command === process.execPath
        && args.includes('frontend/scripts/ui-quality-baseline-runner.mjs')
    )), false);
  });
}

test('launch rejects image provenance mismatch', () => {
  const fixture = createFixture();
  const executor = fakeExecutor({
    imageMutation: {
      frontend: { path: ['Labels', 'BuildSha'], value: '9'.repeat(40) },
    },
  });
  assert.throws(
    () => launchAttestedBaseline(launchInput(fixture), launchDependencies(executor)),
    /build provenance/,
  );
  assert.ok(executor.calls.some(({ command, args }) => command === 'docker' && args.includes('down')));
});

test('missing attestation fails before any Docker command', () => {
  const fixture = createFixture();
  rmSync(fixture.attestationPath);
  const executor = fakeExecutor();
  assert.throws(
    () => launchAttestedBaseline(launchInput(fixture), launchDependencies(executor)),
    /attestation file is invalid/,
  );
  assert.equal(executor.calls.some(({ command }) => command === 'docker'), false);
});

test('Compose command failure is redacted and cleanup is attempted', () => {
  const fixture = createFixture();
  const executor = fakeExecutor({ failAt: 'up --detach' });
  assert.throws(
    () => launchAttestedBaseline(launchInput(fixture), launchDependencies(executor)),
    (error) => {
      assert.match(error.message, /baseline Compose up failed/);
      assert.equal(error.message.includes('private command failure detail'), false);
      return true;
    },
  );
  assert.ok(executor.calls.some(({ command, args }) => command === 'docker' && args.includes('down')));
});

test('runner failure is redacted, cleanup failure leaves a bounded recovery file, and recovery removes it', () => {
  const fixture = createFixture();
  let failRunner = true;
  let failDown = true;
  const executor = fakeExecutor();
  const wrapped = {
    calls: executor.calls,
    execute(invocation) {
      if (invocation.command === process.execPath
        && invocation.args.includes('frontend/scripts/ui-quality-baseline-runner.mjs')
        && failRunner) throw new Error('private runner failure detail');
      if (invocation.command === 'docker' && invocation.args.includes('down') && failDown) {
        throw new Error('private cleanup failure detail');
      }
      return executor.execute(invocation);
    },
  };
  assert.throws(
    () => launchAttestedBaseline(launchInput(fixture), launchDependencies(wrapped)),
    (error) => {
      assert.match(error.message, /cleanup failed/);
      assert.equal(error.message.includes('private'), false);
      assert.match(error.message, new RegExp(PROJECT));
      return true;
    },
  );
  const composePath = path.join(fixture.runtimeRoot, PROJECT, 'compose.json');
  assert.equal(existsSync(composePath), true);
  const serialized = readFileSync(composePath, 'utf8');
  assert.equal(serialized.includes('private-'), false);

  failRunner = false;
  failDown = false;
  const recovery = recoverAttestedBaseline({
    repositoryRoot: fixture.repositoryRoot,
    runtimeRoot: fixture.runtimeRoot,
    projectName: PROJECT,
    environment: executionEnvironment(),
  }, { executeCommand: wrapped.execute });
  assert.deepEqual(recovery, { status: 'recovered', projectName: PROJECT, cleanup: 'complete' });
  assert.equal(existsSync(path.dirname(composePath)), false);
});

test('CLI parser requires exact launch/recovery arguments and rejects injection-shaped ports/projects', () => {
  assert.deepEqual(parseBaselineLaunchArguments([
    '--attestation', externalAttestationPath,
    '--attestation-sha256', 'f'.repeat(64),
    '--web-port', String(WEB_PORT),
    '--api-port', String(API_PORT),
    '--execute', 'confirmed',
  ], { repositoryRoot }), {
    mode: 'launch',
    repositoryRoot,
    attestationPath: externalAttestationPath,
    attestationSha256: 'f'.repeat(64),
    webPort: WEB_PORT,
    apiPort: API_PORT,
  });
  assert.deepEqual(parseBaselineLaunchArguments([
    '--recover-project', PROJECT,
    '--execute', 'confirmed',
  ], { repositoryRoot }), {
    mode: 'recover',
    repositoryRoot,
    projectName: PROJECT,
  });
  assert.throws(() => parseBaselineLaunchArguments([
    '--attestation', externalAttestationPath,
    '--attestation-sha256', 'f'.repeat(64),
    '--web-port', `${WEB_PORT};docker rm -f victim`,
    '--api-port', String(API_PORT),
    '--execute', 'confirmed',
  ], { repositoryRoot }), /arguments are invalid/);
  assert.throws(() => parseBaselineLaunchArguments([
    '--recover-project', `${PROJECT};docker rm -f victim`,
    '--execute', 'confirmed',
  ], { repositoryRoot }), /arguments are invalid/);
});
