import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { validateIsolationManifest, assertOwnedDatabase, assertOwnedComposeRuntime, assertIsolatedTarget, validateComposePlan } from './e2e-isolation.mjs';
import { closedEnvironment, assertNoDotEnv, assertBuildTarget } from './run-isolated-e2e.mjs';

const now = Date.now();
const fixture = () => ({ version: 1, runId: 'a'.repeat(24), token: 'b'.repeat(64), databaseId: 'c'.repeat(64),
  createdAt: now - 1000, apiUrl: 'http://127.0.0.1:18080/api/v1', webUrl: 'http://127.0.0.1:13001',
  controlUrl: 'http://127.0.0.1:14001/verify' });
const environment = manifest => ({ NEXT_PUBLIC_API_URL: manifest.apiUrl, NEXT_PUBLIC_WEB_URL: manifest.webUrl });
const database = manifest => ({ Id: manifest.databaseId, Created: new Date(now).toISOString(), State: { Running: true },
  Config: { Labels: { 'egov.task': 'isolated-e2e', 'egov.e2e.run': manifest.runId }, Env: ['POSTGRES_DB=authz_e2e', 'POSTGRES_USER=egov'] },
  HostConfig: { Tmpfs: { '/var/lib/postgresql/data': 'rw' } }, Mounts: [{ Type: 'tmpfs' }],
  NetworkSettings: { Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '15433' }] } } });

test('owned fresh tmpfs database and matching explicit loopback manifest pass', () => {
  const manifest = fixture();
  assert.equal(validateIsolationManifest(manifest, environment(manifest), now), manifest);
  assert.equal(assertOwnedDatabase(database(manifest), manifest), '15433');
});
test('remote, credential-bearing, redirected, missing and expired target descriptors fail closed', () => {
  for (const apiUrl of ['https://shared.example/api/v1', 'http://127.0.0.1:8080/api/v1?target=remote',
    'http://user:secret@127.0.0.1:8080/api/v1', 'http://localhost:8080/api/v1']) {
    const manifest = { ...fixture(), apiUrl };
    assert.throws(() => validateIsolationManifest(manifest, environment(manifest), now), /isolation verification failed/);
  }
  assert.throws(() => validateIsolationManifest(fixture(), {}, now));
  assert.throws(() => validateIsolationManifest({ ...fixture(), createdAt: now - 7 * 3600000 }, environment(fixture()), now));
  assert.throws(() => validateIsolationManifest({ ...fixture(), controlUrl: 'https://remote.invalid/verify' }, environment(fixture()), now));
});
test('unknown identity, reused run/container/storage, remote binding and stopped runtime are rejected', () => {
  const manifest = fixture();
  const changes = [
    value => { value.Id = 'd'.repeat(64); },
    value => { value.Config.Labels['egov.e2e.run'] = 'e'.repeat(24); },
    value => { value.Created = new Date(now - 60000).toISOString(); },
    value => { value.Mounts = [{ Type: 'volume', Name: 'shared-db' }]; },
    value => { value.HostConfig.Tmpfs = {}; },
    value => { value.Config.Env[0] = 'POSTGRES_DB=egovdb'; },
    value => { value.NetworkSettings.Ports['5432/tcp'][0].HostIp = '0.0.0.0'; },
    value => { value.State.Running = false; },
  ];
  for (const change of changes) { const actual = database(manifest); change(actual); assert.throws(() => assertOwnedDatabase(actual, manifest)); }
});
test('closed environment removes inherited datasource, proxy, Java/Node injection and arbitrary app settings', () => {
  assert.deepEqual(closedEnvironment({ PATH: 'tools', JAVA_HOME: 'jdk', DB_URL: 'remote', SPRING_APPLICATION_JSON: 'remote',
    NODE_OPTIONS: '--require=unsafe', JAVA_TOOL_OPTIONS: 'unsafe', HTTPS_PROXY: 'remote', JWT_SECRET: 'remote', BACKEND_API_URL: 'remote',
    NEXT_PUBLIC_API_URL: 'remote', DOCKER_HOST: 'tcp://remote:2375', PLAYWRIGHT_JSON_OUTPUT_FILE: 'report.json' }),
  { PATH: 'tools', JAVA_HOME: 'jdk', PLAYWRIGHT_JSON_OUTPUT_FILE: 'report.json' });
});
test('dotenv contents are never read and unexpected production rewrites are refused', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'e2e-isolation-'));
  try {
    writeFileSync(path.join(directory, '.env.example'), 'example'); assert.doesNotThrow(() => assertNoDotEnv(directory));
    writeFileSync(path.join(directory, '.env'), 'DB_URL=remote'); assert.throws(() => assertNoDotEnv(directory));
  } finally { rmSync(directory, { recursive: true, force: true }); }
  const apiUrl = fixture().apiUrl;
  const routes = { rewrites: { beforeFiles: [], afterFiles: [
    { source: '/api/v1/:path*', destination: `${apiUrl}/:path*` },
    { source: '/actuator/:path*', destination: 'http://127.0.0.1:18080/actuator/:path*' },
    { source: '/ws/:path*', destination: 'http://127.0.0.1:18080/ws/:path*' },
  ], fallback: [] } };
  assert.doesNotThrow(() => assertBuildTarget(routes, apiUrl));
  routes.rewrites.afterFiles[0].destination = 'https://remote.invalid/:path*';
  assert.throws(() => assertBuildTarget(routes, apiUrl));
});
test('manifest requires a matching live owner, rejects replay/foreign attestation, and refuses unknown execution', async () => {
  await assert.rejects(assertIsolatedTarget({}), /isolation verification failed/);
  const directory = mkdtempSync(path.join(tmpdir(), 'e2e-live-owner-'));
  const manifest = fixture();
  let ready = true;
  const server = createServer((request, response) => {
    assert.equal(request.headers.authorization, `Bearer ${manifest.token}`);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ready, runId: manifest.runId, databaseId: manifest.databaseId }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  manifest.controlUrl = `http://127.0.0.1:${server.address().port}/verify`;
  const file = path.join(directory, 'runtime.json'); writeFileSync(file, JSON.stringify(manifest));
  const env = { ...environment(manifest), E2E_ISOLATION_MANIFEST: file };
  try {
    assert.equal((await assertIsolatedTarget(env)).runId, manifest.runId);
    ready = false; await assert.rejects(assertIsolatedTarget(env));
    await new Promise(resolve => server.close(resolve));
    await assert.rejects(assertIsolatedTarget(env));
  } finally { if (server.listening) await new Promise(resolve => server.close(resolve)); rmSync(directory, { recursive: true, force: true }); }
});

function composeFixture() {
  const env = { CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2', COMPOSE_PROJECT_NAME: 'egov-e2e-123-2-0' };
  const project = env.COMPOSE_PROJECT_NAME;
  const network = { Id: 'network', Name: `${project}_egov-net`, Labels: { 'com.docker.compose.project': project } };
  const container = service => ({ Id: service === 'db' ? 'a'.repeat(64) : 'b'.repeat(64), Created: new Date(now).toISOString(), State: { Running: true },
    Config: { Labels: { 'com.docker.compose.project': project, 'com.docker.compose.service': service }, Env: [] },
    NetworkSettings: { Networks: { [network.Name]: { NetworkID: network.Id, Aliases: [service] } }, Ports: { '8080/tcp': [{ HostIp: '0.0.0.0', HostPort: '8080' }] } }, Mounts: [] });
  const db = container('db'); const api = container('api');
  api.Config.Entrypoint = ['sh', '-c', 'exec java $JAVA_OPTS -jar app.jar'];
  api.Config.Cmd = null;
  api.HostConfig = { ExtraHosts: null };
  db.Config.Env = ['POSTGRES_DB=authz_e2e', 'POSTGRES_USER=egov', 'POSTGRES_PASSWORD=synthetic'];
  const url = 'jdbc:postgresql://db:5432/authz_e2e';
  api.Config.Env = ['SPRING_PROFILES_ACTIVE=e2e', 'NURI_AUTHORIZATION_ISOLATED_CUTOVER=true',
    'NURI_AUTHORIZATION_DISPOSABLE_DATABASE_ACK=CONFIRMED_DISPOSABLE_AUTHZ_DATABASE',
    `JWT_SECRET=${randomBytes(32).toString('base64')}`,
    'JAVA_OPTS=-Xms512m -Xmx512m -XX:+UseParallelGC',
    `SPRING_APPLICATION_JSON=${JSON.stringify({ spring: { datasource: { url, 'jdbc-url': url, hikari: { 'jdbc-url': url }, username: 'egov', password: 'synthetic' } } })}`];
  db.Mounts = [{ Type: 'volume', Destination: '/var/lib/postgresql/data', Name: `${project}-database` }];
  const volume = { Name: `${project}-database`, CreatedAt: new Date(now).toISOString(),
    Driver: 'local', Scope: 'local', Options: null, Labels: { 'com.docker.compose.project': project } };
  return { env, db, api, volume, network };
}
test('CI compose validates actual isolated datasource, owned volume/network and exact GitHub run identity', () => {
  const values = composeFixture();
  assert.equal(assertOwnedComposeRuntime(values.db, values.api, values.volume, values.network, values.env, now).databaseId, values.db.Id);
  const changes = [
    value => { value.env.GITHUB_ACTIONS = 'false'; },
    value => { value.env.GITHUB_RUN_ATTEMPT = '3'; },
    value => { value.volume.Labels['com.docker.compose.project'] = 'old-shared'; },
    value => { value.volume.CreatedAt = new Date(now - 7 * 3600000).toISOString(); },
    value => { value.api.Config.Env[value.api.Config.Env.length - 1] = value.api.Config.Env.at(-1).replaceAll('db:5432', 'remote:5432'); },
    value => { value.api.NetworkSettings.Networks = {}; },
    value => { value.api.Config.Env.push('SPRING_CONFIG_LOCATION=file:/shared-config/'); },
  ];
  for (const change of changes) { const changed = composeFixture(); change(changed); assert.throws(() => assertOwnedComposeRuntime(changed.db, changed.api, changed.volume, changed.network, changed.env, now)); }
});

test('CI API launch cannot replace inspected datasource through JVM, application arguments, or alternate configuration', () => {
  const assertRejected = change => {
    const value = composeFixture();
    change(value);
    assert.throws(() => assertOwnedComposeRuntime(value.db, value.api, value.volume, value.network, value.env, now));
  };
  for (const option of [
    '-Dspring.application.json={}', '-Dspring.datasource.jdbc-url=jdbc:postgresql://remote.invalid/shared',
    '-Dspring.config.location=file:/shared/', '--spring.config.location=file:/shared/',
    '-javaagent:/shared/agent.jar', '-agentpath:/shared/agent.so', '@shared.args',
    '-cp /shared/classes', '-Xbootclasspath/a:/shared/classes', '-jar /shared/app.jar',
  ]) {
    assertRejected(value => {
      value.api.Config.Env = value.api.Config.Env.filter(entry => !entry.startsWith('JAVA_OPTS='));
      value.api.Config.Env.push(`JAVA_OPTS=${option}`);
    });
  }
  for (const argument of ['--spring.application.json={}', '--spring.datasource.url=jdbc:postgresql://remote.invalid/shared', '@shared.args']) {
    assertRejected(value => { value.api.Config.Cmd = [argument]; });
    assertRejected(value => { value.api.Config.Entrypoint.push(argument); });
  }
  assertRejected(value => { value.api.Config.Entrypoint = ['java', '-Dspring.application.json={}', '-jar', 'app.jar']; });
  for (const entry of [
    'JAVA_TOOL_OPTIONS=-javaagent:/shared/agent.jar', 'JDK_JAVA_OPTIONS=@shared.args', '_JAVA_OPTIONS=-Dspring.application.json={}',
    'SPRING_DATASOURCE_DATA_SOURCE_CLASS_NAME=example.SharedDataSource', 'SPRING_FLYWAY_URL=jdbc:postgresql://remote.invalid/shared',
    'SPRING_LIQUIBASE_URL=jdbc:postgresql://remote.invalid/shared', 'SPRING_CONFIG_IMPORT=file:/shared/config.yml',
    'LD_PRELOAD=/shared/override.so',
  ]) assertRejected(value => { value.api.Config.Env.push(entry); });
  for (const section of [
    { flyway: { url: 'jdbc:postgresql://remote.invalid/shared' } },
    { config: { import: 'file:/shared/config.yml' } },
  ]) assertRejected(value => {
    const index = value.api.Config.Env.findIndex(entry => entry.startsWith('SPRING_APPLICATION_JSON='));
    const application = JSON.parse(value.api.Config.Env[index].slice('SPRING_APPLICATION_JSON='.length));
    Object.assign(application.spring, section);
    value.api.Config.Env[index] = `SPRING_APPLICATION_JSON=${JSON.stringify(application)}`;
  });
  assertRejected(value => {
    const index = value.api.Config.Env.findIndex(entry => entry.startsWith('SPRING_APPLICATION_JSON='));
    const application = JSON.parse(value.api.Config.Env[index].slice('SPRING_APPLICATION_JSON='.length));
    application['spring.datasource.jdbc-url'] = 'jdbc:postgresql://remote.invalid/shared';
    value.api.Config.Env[index] = `SPRING_APPLICATION_JSON=${JSON.stringify(application)}`;
  });
  const safe = composeFixture();
  safe.api.Config.Env = safe.api.Config.Env.filter(entry => !entry.startsWith('JAVA_OPTS='));
  safe.api.Config.Env.push('JAVA_OPTS=-Xms256m -Xmx2g -Xss1m -XX:+UseParallelGC');
  assert.doesNotThrow(() => assertOwnedComposeRuntime(safe.db, safe.api, safe.volume, safe.network, safe.env, now));
});

test('CI ownership rejects remote volume drivers/options and host aliases that redirect the db name', () => {
  for (const change of [
    value => { value.volume.Driver = 'remote-storage'; },
    value => { value.volume.Options = { type: 'nfs', o: 'addr=192.0.2.1', device: ':/shared' }; },
    value => { value.volume.Options = { type: 'none', o: 'bind', device: '/shared/postgres' }; },
    value => { value.volume.CreatedAt = new Date(now + 60000).toISOString(); },
    value => { value.api.HostConfig.ExtraHosts = ['db:192.0.2.1']; },
    value => { value.api.HostConfig.NetworkMode = 'host'; },
  ]) {
    const value = composeFixture(); change(value);
    assert.throws(() => assertOwnedComposeRuntime(value.db, value.api, value.volume, value.network, value.env, now));
  }
});

function composePlanFixture() {
  const values = composeFixture();
  const project = values.env.COMPOSE_PROJECT_NAME;
  const toEnvironment = container => Object.fromEntries(container.Config.Env.map(entry => {
    const separator = entry.indexOf('='); return [entry.slice(0, separator), entry.slice(separator + 1)];
  }));
  const apiEnvironment = toEnvironment(values.api);
  delete apiEnvironment.JAVA_OPTS;
  const apiImage = { Id: `sha256:${'c'.repeat(64)}`, Config: {
    Entrypoint: values.api.Config.Entrypoint, Cmd: null,
    Env: ['PATH=/usr/bin:/bin', 'JAVA_OPTS=-Xms512m -Xmx512m -XX:+UseParallelGC'],
  } };
  return { env: values.env, apiImage, plan: {
    name: project,
    services: {
      db: { image: `postgres:17@sha256:${'a'.repeat(64)}`, environment: toEnvironment(values.db),
        networks: { 'egov-net': null }, volumes: [{ type: 'volume', source: 'postgres_data', target: '/var/lib/postgresql/data' }] },
      api: { image: 'egov-enterprise-api:local', environment: apiEnvironment,
        networks: { 'egov-net': null }, depends_on: { db: { condition: 'service_healthy' } },
        volumes: [{ type: 'volume', source: 'attachment_storage', target: '/app/storage' }] },
    },
    volumes: { postgres_data: { name: `${project}-database` }, attachment_storage: { name: `${project}-attachments` } },
    networks: { 'egov-net': { name: `${project}_egov-net`, driver: 'bridge', ipam: { driver: 'default' } } },
  } };
}

test('rendered CI Compose preflight validates the closed overlay before any service starts', () => {
  const fixture = composePlanFixture();
  assert.equal(validateComposePlan(fixture.plan, fixture.env, fixture.apiImage), true);
  fixture.env.API_IMAGE_REF = 'egov-enterprise-api:e2e';
  fixture.plan.services.api.image = fixture.env.API_IMAGE_REF;
  assert.equal(validateComposePlan(fixture.plan, fixture.env, fixture.apiImage), true);
  const source = readFileSync(new URL('./e2e-compose-preflight.mjs', import.meta.url), 'utf8');
  const importedModule = readFileSync(new URL('./e2e-isolation.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(importedModule, /import\.meta|node:url|node:child_process/);
  assert.match(source, /COMPOSE_DISABLE_ENV_FILE: 'true'/);
  assert.match(source, /'compose', 'config', '--no-env-resolution', '--format', 'json', 'db', 'api'/);
  assert.match(source, /'image', 'inspect', '--', plan\.services\.api\.image/);
  assert.match(source, /validateComposePlan\(plan, environment, apiImage\)/);
  assert.match(source, /stdio: \['ignore', 'pipe', 'pipe'\]/);
  assert.doesNotMatch(source, /console\.(?:log|error)\((?:plan|environment|error)/);
});

test('pre-start Compose verification rejects remote datasource, migration, launcher, host, and storage substitutions', () => {
  const changes = [
    value => { value.plan.name = 'shared-project'; },
    value => { value.env.GITHUB_ACTIONS = 'false'; },
    value => { value.plan.services.db.image = 'postgres:17'; },
    value => { value.plan.services.api.image = 'other-api:latest'; },
    value => { value.plan.services.api.environment.SPRING_APPLICATION_JSON = value.plan.services.api.environment.SPRING_APPLICATION_JSON.replaceAll('db:5432', 'remote.invalid:5432'); },
    value => { value.plan.services.api.environment.SPRING_FLYWAY_URL = 'jdbc:postgresql://remote.invalid/shared'; },
    value => { value.plan.services.api.environment.JAVA_OPTS = '-Dspring.application.json={}'; },
    value => { value.plan.services.api.command = ['--spring.datasource.url=jdbc:postgresql://remote.invalid/shared']; },
    value => { value.plan.services.api.entrypoint = ['java', '-jar', 'other.jar']; },
    value => { value.plan.services.db.entrypoint = ['remote-proxy']; },
    value => { value.plan.services.api.env_file = [{ path: '/shared/.env' }]; },
    value => { value.plan.services.api.extra_hosts = ['db:192.0.2.1']; },
    value => { value.plan.services.api.dns = ['192.0.2.1']; },
    value => { value.plan.services.api.network_mode = 'host'; },
    value => { value.plan.services.api.networks = { shared: null }; },
    value => { value.plan.services.api.depends_on.foreign = {}; },
    value => { value.plan.services.api.configs = [{ source: 'shared-config' }]; },
    value => { value.plan.services.db.volumes[0].type = 'bind'; },
    value => { value.plan.services.db.volumes[0].source = '/shared/postgres'; },
    value => { value.plan.volumes.postgres_data.name = 'existing-production-data'; },
    value => { value.plan.volumes.postgres_data.external = true; },
    value => { value.plan.volumes.postgres_data.driver_opts = { type: 'nfs', o: 'addr=192.0.2.1', device: ':/shared' }; },
    value => { value.plan.volumes.attachment_storage.external = true; },
    value => { value.plan.networks['egov-net'].external = true; },
    value => { value.plan.networks['egov-net'].driver = 'overlay'; },
    value => { value.plan.networks['egov-net'].name = 'existing-network'; },
  ];
  for (const change of changes) {
    const value = composePlanFixture(); change(value);
    assert.throws(() => validateComposePlan(value.plan, value.env, value.apiImage), /isolation verification failed/);
  }
});

test('pre-start verification requires actual image configuration and rejects image-level launcher and environment overrides', () => {
  const changes = [
    value => { value.apiImage = undefined; },
    value => { value.apiImage.Id = 'unknown'; },
    value => { delete value.apiImage.Config; },
    value => { value.apiImage.Config.Env = null; },
    value => { value.apiImage.Config.Env.push('JAVA_OPTS=-Dspring.application.json={}'); },
    value => { value.apiImage.Config.Env = ['INVALID_ENVIRONMENT']; },
    value => { value.apiImage.Config.Entrypoint = ['java', '-jar', 'app.jar', '--spring.datasource.url=jdbc:postgresql://remote.invalid/shared']; },
    value => { value.apiImage.Config.Cmd = ['--spring.config.location=file:/shared/']; },
    value => { value.apiImage.Config.Env = ['JAVA_OPTS=-Dspring.datasource.jdbc-url=jdbc:postgresql://remote.invalid/shared']; },
  ];
  for (const entry of [
    'JAVA_TOOL_OPTIONS=-javaagent:/shared/agent.jar', 'JDK_JAVA_OPTIONS=@shared.args',
    '_JAVA_OPTIONS=-Dspring.application.json={}', 'SPRING_CONFIG_IMPORT=file:/shared/config.yml',
    'SPRING_DATASOURCE_URL=jdbc:postgresql://remote.invalid/shared',
    'SPRING_FLYWAY_URL=jdbc:postgresql://remote.invalid/shared',
    'SPRING_LIQUIBASE_URL=jdbc:postgresql://remote.invalid/shared', 'LD_PRELOAD=/shared/override.so',
  ]) changes.push(value => { value.apiImage.Config.Env.push(entry); });
  for (const change of changes) {
    const value = composePlanFixture(); change(value);
    assert.throws(() => validateComposePlan(value.plan, value.env, value.apiImage), /isolation verification failed/);
  }
});

test('image defaults and explicit Compose environment use container precedence before datasource verification', () => {
  const value = composePlanFixture();
  value.apiImage.Config.Env.push('SPRING_PROFILES_ACTIVE=prod', 'SPRING_APPLICATION_JSON={}');
  value.plan.services.api.environment.JAVA_OPTS = '-Xms256m -Xmx1g';
  assert.equal(validateComposePlan(value.plan, value.env, value.apiImage), true);
  value.plan.services.api.environment.SPRING_APPLICATION_JSON = null;
  assert.throws(() => validateComposePlan(value.plan, value.env, value.apiImage), /isolation verification failed/);
});


test('both CI launchers execute Compose preflight before application startup', () => {
  const verifyOrder = source => {
    const lines = source.split(/\r?\n/).map(line => line.trim());
    const preflights = lines.flatMap((line, index) => line === 'node scripts/e2e-compose-preflight.mjs' ? [index] : []);
    const startups = lines.flatMap((line, index) => /^docker compose up(?: |$)/.test(line) ? [index] : []);
    assert.equal(preflights.length, 1);
    assert.equal(startups.length, 1);
    assert.ok(preflights[0] < startups[0]);
  };
  for (const name of ['ci.yml', 'update-visual-baseline.yml']) {
    const source = readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');
    verifyOrder(source);
    assert.throws(() => verifyOrder(source.replace('node scripts/e2e-compose-preflight.mjs', 'echo node scripts/e2e-compose-preflight.mjs')));
    assert.throws(() => verifyOrder(source.replace('node scripts/e2e-compose-preflight.mjs', '# node scripts/e2e-compose-preflight.mjs')));
  }
});
