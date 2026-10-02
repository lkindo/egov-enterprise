#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { closedEnvironment, assertBuildTarget } from './run-isolated-e2e.mjs';
import { createProductionBuildInputTreeHash } from '../frontend/scripts/ui-quality-baseline-core.mjs';
import { captureHistoricalRelease, HISTORICAL_RELEASE, HISTORICAL_API_ENTRYPOINT, HISTORICAL_ARCHIVE_GIT_OPTIONS,
  validateHistoricalImages, validateHistoricalMigrations, compareHistoricalConstraints, compareHistoricalColumns, runHistoricalSmokeStages } from './historical-release-fixture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ID = /^sha256:[a-f0-9]{64}$/u;
const HASH = /^[a-f0-9]{64}$/u;
const RUN = /^[a-f0-9]{24}$/u;
const OWNER = 'egov.release-smoke.run';
const TREE_LABEL = 'io.egov.ui-quality.build-input-tree-sha256';
const API_ENTRYPOINT = ['sh', '-c', 'exec java $JAVA_OPTS -jar app.jar'];
const SAFE_JAVA_OPTION = /^(?:-Xm[sx][1-9]\d*[kKmMgG]|-Xss[1-9]\d*[kKmMgG]|-XX:\+UseParallelGC)$/u;
const BOOTSTRAP_ACK = 'CONFIRMED_DISPOSABLE_AUTHZ_DATABASE';
const BACKEND_URL = 'http://api:8080/api/v1';
const ENCODED_AUTH_PATHS = ['/api/v1/auth/%2572eissue', '/api/v1/%2561uth/login', '/api/v1/auth/%ZZreissue'];
const failure = category => new Error(`Isolated release smoke: ${category}.`);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const privateWrite = (file, bytes) => writeFileSync(file, bytes, { mode: 0o600, flag: 'wx' });

// Engine output can contain credentials or cookie values. It is never included in errors.
export function smokeCommand(command, args, { cwd = ROOT, env = closedEnvironment(), input,
  binary = false, timeout = 900_000, maxBuffer = 64 * 1024 * 1024, executable = command, prefix = [] } = {}) {
  const result = spawnSync(executable, [...prefix, ...args], { cwd, env, input,
    encoding: binary ? undefined : 'utf8', windowsHide: true, timeout, maxBuffer });
  if (result.error || result.status !== 0) throw failure('command failed; raw output withheld');
  return binary ? result.stdout : result.stdout.trim();
}

export function captureReleaseSmokeSource(root = ROOT, run = smokeCommand) {
  const physicalRoot = realpathSync(root);
  const outsideRoot = relative => relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
  const paths = run('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root })
    .split('\0').filter(Boolean);
  const revision = run('git', ['rev-parse', 'HEAD'], { cwd: root });
  const dirty = run('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root }).length > 0;
  if (!/^[a-f0-9]{40}$/u.test(revision)) throw failure('invalid source revision');
  const read = file => {
    const target = path.resolve(root, file);
    const relative = path.relative(root, target);
    if (outsideRoot(relative) || !lstatSync(target).isFile() || lstatSync(target).isSymbolicLink()) throw failure('unsafe source input');
    const physicalTarget = realpathSync(target);
    if (outsideRoot(path.relative(physicalRoot, physicalTarget))) throw failure('unsafe source input');
    // Clean attested archives use Git blobs; checkout CRLF conversion must not redefine their identity.
    // A dirty local build still identifies the actual worktree bytes, including untracked inputs.
    return dirty ? readFileSync(physicalTarget)
      : run('git', ['show', `${revision}:${file}`], { cwd: root, binary: true });
  };
  const sourceTreeSha256 = createProductionBuildInputTreeHash({ trackedPaths: paths, readCommittedFile: read });
  return { revision, dirty, sourceTreeSha256 };
}

function environment(entries) {
  if (entries != null && !Array.isArray(entries)) throw failure('ambiguous image environment');
  const result = Object.create(null);
  for (const entry of entries ?? []) {
    if (typeof entry !== 'string' || entry.includes('\0')) throw failure('ambiguous image environment');
    const separator = entry.indexOf('=');
    const name = separator < 0 ? entry : entry.slice(0, separator);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name) || Object.hasOwn(result, name)) throw failure('ambiguous image environment');
    // Compose may retain optional null entries as bare keys in Docker Config.Env.
    result[name] = separator < 0 ? null : entry.slice(separator + 1);
  }
  return result;
}

function validateApplicationSmokeImages(images, source) {
  if (!HASH.test(source?.sourceTreeSha256 ?? '') || typeof source.dirty !== 'boolean') throw failure('missing source evidence');
  for (const role of ['api', 'frontend']) {
    const image = images[role];
    if (!ID.test(image?.Id ?? '') || image.Config?.Labels?.['org.opencontainers.image.revision'] !== source.revision
      || image.Config.Labels[TREE_LABEL] !== source.sourceTreeSha256) throw failure('image source identity mismatch');
    const inherited = environment(image.Config.Env);
    if (Object.entries(inherited).some(([key, value]) => value &&
      /^(?:SPRING_|DB_|JWT_SECRET$|ALGORITHM_KEY$|ADMIN_INITIAL_PASSWORD$|NODE_OPTIONS$|JAVA_TOOL_OPTIONS$|JDK_JAVA_OPTIONS$|_JAVA_OPTIONS$|LD_)/u.test(key))) {
      throw failure('image contains startup configuration override');
    }
    if (inherited.JAVA_OPTS?.split(/\s+/u).some(option => !SAFE_JAVA_OPTION.test(option))) throw failure('image contains JVM startup override');
    if (role === 'api' && (JSON.stringify(image.Config.Entrypoint) !== JSON.stringify(API_ENTRYPOINT)
      || (image.Config.Cmd?.length ?? 0) !== 0 || image.Config.User !== 'spring:spring')) throw failure('unexpected API entrypoint or user');
    if (role === 'frontend' && (JSON.stringify(image.Config.Cmd) !== '["node","server.js"]'
      || image.Config.User !== 'nextjs' || inherited.NODE_ENV !== 'production'
      || inherited.HOSTNAME !== '0.0.0.0' || inherited.NEXT_TELEMETRY_DISABLED !== '1')) throw failure('unexpected frontend runtime');
  }
}

export function validateSmokeImages(images, source) {
  validateApplicationSmokeImages(images, source);
  for (const role of ['db', 'edge']) if (!ID.test(images[role]?.Id ?? '')) throw failure('missing local support image');
}

export function createSmokeContext({ runId = randomBytes(12).toString('hex'), phase, images, directory, subnet }) {
  if (!RUN.test(runId) || !['fresh', 'restored', 'historical', 'upgraded', 'rollback'].includes(phase) || !/^10\.203\.[1-9]\d{0,2}\.0\/24$/u.test(subnet)
    || Number(subnet.split('.')[2]) > 254 || !path.isAbsolute(directory)) throw failure('invalid owned context');
  if (['historical', 'rollback'].includes(phase)) validateHistoricalImages(images);
  const project = `egov-release-smoke-${runId}-${phase}`;
  return { runId, phase, images, directory, subnet, project, createdAt: Date.now(),
    database: `authz_e2e_${runId}${phase}`, network: `${project}-network`, volume: `${project}-attachments`,
    frontendIp: subnet.replace('0/24', '10'), ids: {} };
}

export function createReleaseSmokePlan(rendered, context, credentials) {
  if (Object.keys(rendered.services ?? {}).sort().join() !== 'api,db,edge,frontend') throw failure('unexpected production services');
  const plan = structuredClone(rendered);
  plan.name = context.project;
  plan.volumes = { attachment_storage: { name: context.volume, labels: { [OWNER]: context.runId } } };
  plan.networks = { 'egov-net': { name: context.network, driver: 'bridge', internal: true,
    labels: { [OWNER]: context.runId }, ipam: { config: [{ subnet: context.subnet,
      gateway: context.subnet.replace('0/24', '1'), ip_range: context.subnet.replace('0/24', '128/25') }] } } };
  for (const [name, service] of Object.entries(plan.services)) {
    service.image = context.images[name].Id;
    delete service.build;
    service.container_name = `${context.project}-${name}`;
    service.pull_policy = 'never'; service.restart = 'no';
    service.labels = { [OWNER]: context.runId };
    service.ports = [];
    service.networks = { 'egov-net': name === 'frontend' ? { ipv4_address: context.frontendIp } : {} };
    if (name === 'db') {
      service.environment = { POSTGRES_DB: context.database, POSTGRES_USER: 'smoke', POSTGRES_PASSWORD: credentials.database };
      service.volumes = []; service.tmpfs = ['/var/lib/postgresql/data'];
    } else if (name === 'api') {
      service.environment = { ...service.environment,
        DB_URL: `jdbc:postgresql://db:5432/${context.database}`, DB_USERNAME: 'smoke', DB_PASSWORD: credentials.database,
        JWT_SECRET: credentials.jwt, ALGORITHM_KEY: credentials.encryption, ADMIN_INITIAL_PASSWORD: credentials.admin,
        OLD_ALGORITHM_KEY: '', MAIL_HOST: '127.0.0.1', TRUSTED_PROXIES: `${context.frontendIp}/32`,
        CORS_ORIGIN_1: 'http://edge:8080' };
      service.volumes = [{ type: 'volume', source: 'attachment_storage', target: '/app/storage' }];
    } else if (name === 'frontend') {
      service.environment = { ...service.environment, JWT_SECRET: credentials.jwt,
        BACKEND_API_URL: BACKEND_URL, NEXT_PUBLIC_API_URL: BACKEND_URL };
      service.volumes = [];
    } else {
      service.environment = { ...service.environment, EDGE_TRUSTED_UPSTREAM: '127.0.0.1/32' };
      service.volumes = [{ type: 'bind', source: path.join(context.directory, 'config/edge/default.conf.template'),
        target: '/etc/nginx/templates/default.conf.template', read_only: true }];
    }
  }
  const bootstrap = structuredClone(plan.services.api);
  bootstrap.container_name = `${context.project}-bootstrap`;
  bootstrap.ports = [];
  bootstrap.environment.SPRING_PROFILES_ACTIVE = 'e2e';
  bootstrap.environment.NURI_AUTHORIZATION_ISOLATED_CUTOVER = 'true';
  bootstrap.environment.NURI_AUTHORIZATION_DISPOSABLE_DATABASE_ACK = BOOTSTRAP_ACK;
  bootstrap.healthcheck = { test: ['CMD-SHELL', 'wget --spider -q http://127.0.0.1:8080/actuator/health || exit 1'],
    interval: '2s', timeout: '5s', retries: 120 };
  plan.services.bootstrap = bootstrap;
  validateReleaseSmokePlan(plan, context, credentials);
  return plan;
}

export function validateReleaseSmokePlan(plan, context, credentials) {
  if (plan.name !== context.project || Object.keys(plan.services ?? {}).sort().join() !== 'api,bootstrap,db,edge,frontend') throw failure('plan identity mismatch');
  const network = plan.networks?.['egov-net'];
  if (Object.keys(plan.networks ?? {}).join() !== 'egov-net' || network.name !== context.network || network.driver !== 'bridge'
    || network.external || network.internal !== true || network.labels?.[OWNER] !== context.runId
    || Object.keys(network.driver_opts ?? {}).length || network.ipam?.config?.length !== 1
    || network.ipam.config[0].subnet !== context.subnet) throw failure('network is not isolated');
  const volume = plan.volumes?.attachment_storage;
  if (Object.keys(plan.volumes ?? {}).join() !== 'attachment_storage' || volume.name !== context.volume
    || volume.external || volume.labels?.[OWNER] !== context.runId || Object.keys(volume.driver_opts ?? {}).length) throw failure('volume is not owned');
  for (const [name, service] of Object.entries(plan.services)) {
    if (service.image !== context.images[name === 'bootstrap' ? 'api' : name].Id || service.build
      || service.container_name !== `${context.project}-${name}` || service.pull_policy !== 'never' || service.restart !== 'no'
      || service.labels?.[OWNER] !== context.runId || service.entrypoint || service.command || service.network_mode
      || service.privileged || service.pid || service.ipc || service.user || service.working_dir || Object.keys(service.networks ?? {}).join() !== 'egov-net'
      || ['env_file', 'extra_hosts', 'dns', 'links', 'external_links', 'configs', 'secrets', 'volumes_from', 'devices', 'cap_add']
        .some(key => Object.keys(service[key] ?? {}).length)) throw failure('unsafe service launch');
    const ports = service.ports ?? [];
    if (ports.length !== 0) throw failure('public or unexpected port');
    const env = service.environment ?? {};
    if (Object.entries(env).some(([key, value]) => value && /^(?:SPRING_CONFIG_|SPRING_DATASOURCE_|SPRING_FLYWAY_(?:URL|USER|PASSWORD)$|SPRING_PROFILES_(?:INCLUDE|DEFAULT)$|NODE_OPTIONS$|JAVA_TOOL_OPTIONS$|JDK_JAVA_OPTIONS$|_JAVA_OPTIONS$|LD_)/u.test(key))) throw failure('alternate startup configuration');
    if (name === 'api' || name === 'bootstrap') {
      const expectedProfile = name === 'api' ? 'prod' : 'e2e';
      if (env.SPRING_PROFILES_ACTIVE !== expectedProfile || env.SPRING_FLYWAY_LOCATIONS !== 'classpath:db/migration'
        || env.DB_URL !== `jdbc:postgresql://db:5432/${context.database}` || env.DB_USERNAME !== 'smoke' || env.DB_PASSWORD !== credentials.database
        || env.JWT_SECRET !== credentials.jwt || env.ALGORITHM_KEY !== credentials.encryption || env.ADMIN_INITIAL_PASSWORD !== credentials.admin
        || env.TRUSTED_PROXIES !== `${context.frontendIp}/32` || env.MAIL_HOST !== '127.0.0.1' || env.CORS_ORIGIN_1 !== 'http://edge:8080'
        || (env.JAVA_OPTS && env.JAVA_OPTS.split(/\s+/u).some(option => !SAFE_JAVA_OPTION.test(option)))
        || JSON.stringify(JSON.parse(env.SPRING_APPLICATION_JSON)) !== '{"management":{"health":{"mail":{"enabled":false}}}}'
        || JSON.stringify(service.volumes) !== JSON.stringify([{ type: 'volume', source: 'attachment_storage', target: '/app/storage' }])) throw failure('API datasource or production boundary changed');
      if (name === 'bootstrap' ? env.NURI_AUTHORIZATION_ISOLATED_CUTOVER !== 'true' || env.NURI_AUTHORIZATION_DISPOSABLE_DATABASE_ACK !== BOOTSTRAP_ACK
        : Object.keys(env).some(key => key.startsWith('NURI_AUTHORIZATION_'))) throw failure('cutover opt-in boundary changed');
      if (name === 'api' && (env.MANAGEMENT_PORT !== '9090' || env.MANAGEMENT_ADDRESS !== '0.0.0.0')) throw failure('management boundary changed');
    } else if (name === 'db') {
      if (env.POSTGRES_DB !== context.database || env.POSTGRES_USER !== 'smoke' || env.POSTGRES_PASSWORD !== credentials.database
        || (service.volumes?.length ?? 0) || JSON.stringify(service.tmpfs) !== '["/var/lib/postgresql/data"]') throw failure('database is not disposable');
    } else if (name === 'frontend') {
      if (env.JWT_SECRET !== credentials.jwt || env.BACKEND_API_URL !== BACKEND_URL || env.NEXT_PUBLIC_API_URL !== BACKEND_URL
        || env.TRUSTED_EDGE_PROXY !== 'true' || env.ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE || (service.volumes?.length ?? 0)
        || service.networks['egov-net'].ipv4_address !== context.frontendIp) throw failure('frontend trust boundary changed');
    } else if (JSON.stringify(service.volumes) !== JSON.stringify([{ type: 'bind', source: path.join(context.directory, 'config/edge/default.conf.template'),
      target: '/etc/nginx/templates/default.conf.template', read_only: true }])) throw failure('unexpected edge mount');
  }
  return plan;
}

export function assertOwnedSmokeContainer(container, service, context, plan, { running = false, beforeStart = false } = {}) {
  const specification = plan.services[service];
  const imageConfig = context.images[service === 'bootstrap' ? 'api' : service].Config;
  const created = Date.parse(container?.Created);
  if (!/^[a-f0-9]{64}$/u.test(container?.Id ?? '') || (context.ids[service] && context.ids[service] !== container.Id)
    || container.Config?.Labels?.[OWNER] !== context.runId || container.Config.Labels['com.docker.compose.project'] !== context.project
    || container.Config.Labels['com.docker.compose.service'] !== service || container.Image !== specification.image
    || !Number.isFinite(created) || created < context.createdAt - 2000 || (running && !container.State?.Running)
    || container.HostConfig?.Privileged || container.HostConfig?.NetworkMode === 'host'
    || Object.keys(container.HostConfig?.ExtraHosts ?? {}).length) throw failure('container ownership mismatch');
  const connections = Object.entries(container.NetworkSettings?.Networks ?? {});
  const pendingNetwork = beforeStart && container.State?.Status === 'created'
    && container.HostConfig?.NetworkMode === context.network;
  if (!pendingNetwork && (connections.length !== 1 || connections[0][0] !== context.network
    || (context.networkId && connections[0][1].NetworkID !== context.networkId))) throw failure('container network mismatch');
  if (pendingNetwork && connections.some(([name]) => name !== context.network)) throw failure('pending network mismatch');
  for (const key of ['Entrypoint', 'Cmd']) {
    if (JSON.stringify(container.Config[key] ?? []) !== JSON.stringify(imageConfig[key] ?? [])) throw failure('effective image launch mismatch');
  }
  for (const key of ['User', 'WorkingDir']) {
    if ((container.Config[key] ?? '') !== (imageConfig[key] ?? '')) throw failure('effective image execution context mismatch');
  }
  const expectedPorts = (specification.ports ?? []).map(port => `${port.target}/${port.protocol ?? 'tcp'}`).sort();
  const verifyPorts = (ports, assigned) => {
    const bound = Object.entries(ports ?? {}).filter(([, bindings]) => bindings?.length);
    if (JSON.stringify(bound.map(([target]) => target).sort()) !== JSON.stringify(expectedPorts)
      || bound.some(([, bindings]) => bindings.length !== 1 || bindings[0].HostIp !== '127.0.0.1'
        || (assigned ? !/^[1-9]\d*$/u.test(bindings[0].HostPort) || Number(bindings[0].HostPort) > 65535
          : !/^(?:0|)$/u.test(bindings[0].HostPort)))) throw failure('effective port target or count mismatch');
  };
  verifyPorts(container.HostConfig?.PortBindings, false);
  // Exposed-but-unpublished image ports have null bindings. Created/stopped containers may have no assigned ports.
  if (container.State?.Running) verifyPorts(container.NetworkSettings.Ports, true);
  else if (Object.values(container.NetworkSettings.Ports ?? {}).some(bindings => bindings?.length)) verifyPorts(container.NetworkSettings.Ports, true);
  const actualEnvironment = environment(container.Config.Env);
  if (Object.entries(actualEnvironment).some(([key, value]) => value && /^(?:SPRING_CONFIG_|SPRING_DATASOURCE_|SPRING_FLYWAY_(?:URL|USER|PASSWORD)$|SPRING_PROFILES_(?:INCLUDE|DEFAULT)$|NODE_OPTIONS$|JAVA_TOOL_OPTIONS$|JDK_JAVA_OPTIONS$|_JAVA_OPTIONS$|LD_)/u.test(key))) throw failure('effective alternate startup configuration');
  if (actualEnvironment.JAVA_OPTS?.split(/\s+/u).some(option => !SAFE_JAVA_OPTION.test(option))) throw failure('effective JVM startup override');
  for (const [key, value] of Object.entries(specification.environment ?? {})) {
    const actual = actualEnvironment[key];
    if (value === null ? actual !== undefined && actual !== null : actual !== String(value)) throw failure('effective container environment mismatch');
  }
  if (service === 'db') {
    if (!Object.hasOwn(container.HostConfig?.Tmpfs ?? {}, '/var/lib/postgresql/data')
      || (container.Mounts ?? []).some(mount => mount.Type !== 'tmpfs')) throw failure('database mount is not disposable');
  } else if (['api', 'bootstrap'].includes(service)) {
    if (container.Mounts?.length !== 1 || container.Mounts[0].Type !== 'volume'
      || container.Mounts[0].Name !== context.volume || container.Mounts[0].Destination !== '/app/storage' || container.Mounts[0].RW !== true
      || JSON.stringify(container.Config.Entrypoint) !== JSON.stringify(['historical', 'rollback'].includes(context.phase) ? HISTORICAL_API_ENTRYPOINT : API_ENTRYPOINT)
      || (container.Config.Cmd?.length ?? 0) !== 0) throw failure('API runtime mount or entrypoint mismatch');
  } else if (service === 'frontend' && (container.Mounts?.length ?? 0)) throw failure('unexpected frontend mount');
  else if (service === 'edge') {
    const mount = container.Mounts?.[0];
    if (container.Mounts?.length !== 1 || mount.Type !== 'bind' || mount.RW !== false
      || mount.Destination !== '/etc/nginx/templates/default.conf.template'
      || path.normalize(mount.Source) !== path.normalize(specification.volumes[0].source)) throw failure('effective edge mount mismatch');
  }
  context.ids[service] = container.Id;
  return container;
}

export function createSmokeFailureDiagnostic({ service, phase, reason, container, logs = '', credentials, logStatus }) {
  if (!['db', 'bootstrap', 'api', 'frontend', 'edge'].includes(service) || !['fresh', 'restored', 'historical', 'upgraded', 'rollback'].includes(phase)
    || !['not-running', 'unhealthy', 'timeout'].includes(reason)) throw failure('invalid failure diagnostic context');
  let text = typeof logs === 'string' ? logs : '';
  for (const secret of Object.values(credentials ?? {})) {
    if (typeof secret === 'string' && secret.length) text = text.split(secret).join('[REDACTED]');
  }
  text = text.slice(-128 * 1024);
  const extract = (pattern, maximum) => [...new Set([...text.matchAll(pattern)].map(match => match[1]))].slice(0, maximum);
  const state = container?.State ?? {};
  // Keep structural signals only: never persist messages, Config.Env, State.Error or health-check output.
  return { schemaVersion: 1, service, phase, reason,
    containerId: /^[a-f0-9]{64}$/u.test(container?.Id ?? '') ? container.Id : null,
    state: {
      status: ['created', 'running', 'paused', 'restarting', 'removing', 'exited', 'dead'].includes(state.Status) ? state.Status : 'unknown',
      running: state.Running === true, exitCode: Number.isSafeInteger(state.ExitCode) ? state.ExitCode : null,
      oomKilled: typeof state.OOMKilled === 'boolean' ? state.OOMKilled : null,
      health: ['starting', 'healthy', 'unhealthy'].includes(state.Health?.Status) ? state.Health.Status : null,
    },
    logStatus: logStatus === 'captured' ? 'captured' : 'unavailable',
    exceptions: extract(/^\s*(?:(?:Caused by|Suppressed):\s*)?((?:[A-Za-z_$][\w$]*\.)+(?:[A-Za-z_$][\w$]*(?:Exception|Error)|Exception|Error))(?=[:\s]|$)/gmu, 32),
    sqlStates: extract(/\bSQL\s*STATE\s*[:=]?\s*([A-Z0-9]{5})\b/giu, 16),
    nuriFrames: extract(/^\s*at\s+(nuri\.[\w.$<>]+\([\w$]+\.java:\d{1,7}\))\s*$/gmu, 24),
  };
}

export async function waitForSmokeHealth(service, { inspect, diagnose, wait = pause }) {
  let container;
  const reject = async reason => {
    try { await diagnose(service, container, reason); }
    catch { throw failure(`owned service ${reason}; failure diagnostic unavailable`); }
    throw failure(`owned service ${reason}; sanitized failure diagnostic saved`);
  };
  for (let attempt = 0; attempt < 150; attempt += 1) {
    container = inspect(service);
    if (container.State?.Running !== true) return reject('not-running');
    if (container.State.Health?.Status === 'healthy') return container;
    if (container.State.Health?.Status === 'unhealthy') return reject('unhealthy');
    await wait(2000);
  }
  return reject('timeout');
}

const BARRIER_SQL = `SELECT json_build_object(
 'legacy', (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN
 ('tb_user_authrt_map','tb_authrt_role_map','tb_menu_crt_dtl','tb_role_prgrm_map','tb_role_hierarchy','tb_role_info')),
 'evidence', (SELECT count(*) FROM tb_authrt_chg_hstry WHERE chg_artcl_nm='legacy_authorization_contract' AND chg_type_cd='UPDATE'),
 'failed', (SELECT count(*) FROM flyway_schema_history WHERE NOT success),
 'devSeeds', (SELECT count(*) FROM flyway_schema_history WHERE script LIKE '%seed_dev%' OR script LIKE '%dev_credentials%'),
 'provisioned', (SELECT count(*) FROM tb_user_info WHERE esntl_id='USRCNFRM_00000000001' AND pswd NOT LIKE '{disabled}%'));`;
const TABLE_COUNTS_SQL = `SELECT jsonb_object_agg(table_name,
 ((xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text)::bigint)
 FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';`;

export function validateSmokeBarrier(value) {
  if (JSON.stringify(value) !== JSON.stringify({ legacy: 0, evidence: 1, failed: 0, devSeeds: 0, provisioned: 1 })) throw failure('schema barrier or bootstrap evidence failed');
}

export function validateSmokeTableCounts(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !(value.flyway_schema_history > 0)
    || Object.values(value).some(count => !Number.isSafeInteger(count) || count < 0)) throw failure('database census is invalid');
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

export function validateEncodedSmokeProbe(probe) {
  // A valid login and refresh immediately precede each probe. Authentication/rate-limit failures are not routing evidence.
  if (!probe.rawPathPreserved || probe.exposesToken || ![400, 404].includes(probe.status)) throw failure('encoded Spring path was not safely rejected');
}

export function validateSmokeSessionCookies(cookies) {
  const invalid = () => failure('session cookie contract failed');
  if (!Array.isArray(cookies) || cookies.some(cookie => typeof cookie !== 'string')) throw invalid();
  for (const name of ['accessToken', 'refreshToken']) {
    const matching = cookies.filter(cookie => cookie.startsWith(`${name}=`));
    if (matching.length !== 1) throw invalid();
    const [pair, ...parts] = matching[0].split(';');
    const value = pair.slice(name.length + 1).trim();
    const attributes = parts.map(part => part.trim().toLowerCase());
    if (!value || value === '""' || !attributes.includes('httponly') || !attributes.includes('secure')
      || !attributes.includes('samesite=strict') || attributes.filter(attribute => attribute.startsWith('samesite=')).length !== 1) throw invalid();
  }
}

export function validateSmokeManagementBoundary(status) {
  // The public health route lives on prod's management port; Next rewrites to the main application port.
  if (status !== 404) throw failure('management health was not absent from the frontend application port');
}

function exposesToken(value) {
  return value !== null && typeof value === 'object' && Object.entries(value).some(([key, child]) =>
    ['accessToken', 'refreshToken'].includes(key) || exposesToken(child));
}

export async function probeDirectApiEncodedPaths(request, loginBody) {
  const readTokens = async (result, stage) => {
    if (result.response.status !== 200 || result.rawPathPreserved !== true) throw failure(`direct API ${stage} control failed`);
    let value;
    try { value = await result.response.json(); } catch { throw failure(`direct API ${stage} control failed`); }
    const accessToken = value?.data?.accessToken;
    const cookies = result.response.headers.getSetCookie().filter(cookie => cookie.startsWith('refreshToken='));
    if (value?.success !== true || typeof accessToken !== 'string' || !accessToken.trim()
      || Object.hasOwn(value.data, 'refreshToken') || Object.hasOwn(value, 'refreshToken') || cookies.length !== 1) {
      throw failure(`direct API ${stage} token contract failed`);
    }
    const refreshCookie = cookies[0].split(';', 1)[0];
    if (refreshCookie === 'refreshToken=') throw failure(`direct API ${stage} token contract failed`);
    return { accessToken, refreshCookie };
  };
  const probes = [];
  for (const rawPath of ENCODED_AUTH_PATHS) {
    const login = await readTokens(await request('/api/v1/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: loginBody,
    }), 'login');
    const refreshed = await readTokens(await request('/api/v1/auth/reissue', {
      method: 'POST', headers: { Cookie: login.refreshCookie },
    }), 'refresh');
    const headers = { Authorization: `Bearer ${refreshed.accessToken}`, Cookie: refreshed.refreshCookie };
    const session = await request('/api/v1/auth/me', { headers });
    if (session.response.status !== 200 || session.rawPathPreserved !== true) throw failure('direct API session control failed');
    const result = await request(rawPath, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: loginBody });
    let value; try { value = await result.response.json(); } catch { value = null; }
    const probe = { status: result.response.status, exposesToken: exposesToken(value), rawPathPreserved: result.rawPathPreserved };
    validateEncodedSmokeProbe(probe);
    probes.push({ path: rawPath, controls: { login: 200, refresh: 200, session: session.response.status }, ...probe });
  }
  return probes;
}

export function rawSmokeRequest(origin, rawPath, { headers, body = '' } = {}) {
  const target = new URL(origin);
  if (target.protocol !== 'http:' || target.hostname !== '127.0.0.1' || !rawPath.startsWith('/')) throw failure('raw HTTP target is not loopback');
  return new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: target.hostname, port: target.port, method: 'POST', path: rawPath, headers }, response => {
      let bytes = 0; const chunks = [];
      response.on('data', chunk => { bytes += chunk.length; if (bytes > 1024 * 1024) request.destroy(); else chunks.push(chunk); });
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json; try { json = JSON.parse(text); } catch { json = null; }
        resolve({ status: response.statusCode, exposesToken: exposesToken(json), rawPathPreserved: request.path === rawPath });
      });
      response.on('error', () => reject(failure('raw HTTP probe failed')));
    });
    request.setTimeout(15000, () => request.destroy());
    request.on('error', () => reject(failure('raw HTTP probe failed')));
    request.end(body);
  });
}

// Self-contained: the exact function is sent to the owned frontend's existing Node runtime.
export async function internalSmokeHttp(input, requestHttp = httpRequest, timers = globalThis) {
  const fail = () => new Error('Isolated release smoke: internal HTTP probe failed.');
  const requestLimit = 1024 * 1024; const responseLimit = 4 * 1024 * 1024;
  if (!input || !['api', 'edge'].includes(input.target) || typeof input.rawPath !== 'string'
    || !/^\/(?!\/)/u.test(input.rawPath) || /[\x00-\x20\x7f\\#]/u.test(input.rawPath) || input.rawPath.length > 8192
    || !['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(input.method)
    || !Array.isArray(input.headers) || Buffer.byteLength(JSON.stringify(input.headers)) > 65536
    || typeof input.bodyBase64 !== 'string' || input.bodyBase64.length > Math.ceil(requestLimit / 3) * 4) throw fail();
  const body = Buffer.from(input.bodyBase64, 'base64');
  if (body.length > requestLimit || body.toString('base64') !== input.bodyBase64
    || (['GET', 'HEAD'].includes(input.method) && body.length)) throw fail();
  const headers = {};
  for (const pair of input.headers) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || typeof pair[1] !== 'string'
      || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u.test(pair[0]) || /[\r\n\0]/u.test(pair[1])) throw fail();
    const name = pair[0].toLowerCase();
    if (['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'proxy-authorization'].includes(name)
      || Object.hasOwn(headers, name)) throw fail();
    Object.defineProperty(headers, name, { value: pair[1], enumerable: true });
  }
  headers['content-length'] = String(body.length);
  return new Promise((resolve, reject) => {
    let request; let timeout; let finished = false;
    const stop = () => { if (finished) return; finished = true; timers.clearTimeout(timeout); request?.destroy(); reject(fail()); };
    try {
      request = requestHttp({ hostname: input.target, port: 8080, path: input.rawPath, method: input.method,
        headers, maxHeaderSize: 65536 }, response => {
        let bytes = 0; const chunks = [];
        response.on('error', stop); response.on('aborted', stop);
        response.on('data', chunk => { bytes += chunk.length; if (bytes > responseLimit) stop(); else chunks.push(chunk); });
        response.on('end', () => {
          if (finished) return;
          if (!Number.isInteger(response.statusCode) || response.statusCode < 200 || response.statusCode > 599
            || !Array.isArray(response.rawHeaders) || Buffer.byteLength(JSON.stringify(response.rawHeaders)) > 65536) { stop(); return; }
          finished = true; timers.clearTimeout(timeout);
          resolve({ status: response.statusCode, rawHeaders: response.rawHeaders,
            bodyBase64: Buffer.concat(chunks).toString('base64'), rawPathPreserved: request.path === input.rawPath });
        });
      });
      timeout = timers.setTimeout(stop, 15000);
      request.on('error', stop); request.end(body);
    } catch { stop(); }
  });
}

export const INTERNAL_SMOKE_HTTP_SCRIPT = `
const chunks = []; let bytes = 0; let failed = false;
const fail = () => { if (failed) return; failed = true; process.stderr.write('Internal smoke HTTP failed.'); process.exitCode = 1; process.stdin.destroy(); };
process.stdin.on('error', fail);
process.stdin.on('data', chunk => { bytes += chunk.length; if (bytes > 2 * 1024 * 1024) fail(); else chunks.push(chunk); });
process.stdin.on('end', async () => {
  if (failed) return;
  try {
    const result = await (${internalSmokeHttp.toString()})(JSON.parse(Buffer.concat(chunks).toString('utf8')), require('node:http').request);
    process.stdout.write(JSON.stringify(result));
  } catch { fail(); }
});`;

export async function containerSmokeRequest(runtime, docker, target, rawPath, { method = 'GET', headers, body } = {}) {
  if (!['api', 'edge'].includes(target)) throw failure('internal HTTP target is not owned');
  runtime.verifyNetwork();
  runtime.inspect(target, true);
  const frontend = runtime.inspect('frontend', true);
  // Request serializes multipart boundaries; the separately carried raw path never passes through URL normalization.
  const prepared = new Request(`http://${target}:8080/`, { method, headers, body });
  const bytes = Buffer.from(await prepared.arrayBuffer());
  if (bytes.length > 1024 * 1024) throw failure('internal HTTP request is too large');
  const payload = { target, rawPath, method: prepared.method, headers: [...prepared.headers], bodyBase64: bytes.toString('base64') };
  let result;
  try {
    result = JSON.parse(await docker(['exec', '-i', frontend.Id, 'node', '-e', INTERNAL_SMOKE_HTTP_SCRIPT], {
      input: JSON.stringify(payload), timeout: 20000, maxBuffer: 8 * 1024 * 1024,
    }));
  } catch { throw failure('internal HTTP command failed; raw output withheld'); }
  if (!result || !Number.isInteger(result.status) || result.status < 200 || result.status > 599 || result.rawPathPreserved !== true
    || !Array.isArray(result.rawHeaders) || result.rawHeaders.length % 2 || Buffer.byteLength(JSON.stringify(result.rawHeaders)) > 65536
    || result.rawHeaders.some(value => typeof value !== 'string') || typeof result.bodyBase64 !== 'string'
    || result.bodyBase64.length > Math.ceil(4 * 1024 * 1024 / 3) * 4) throw failure('invalid internal HTTP response');
  const responseBody = Buffer.from(result.bodyBase64, 'base64');
  if (responseBody.length > 4 * 1024 * 1024 || responseBody.toString('base64') !== result.bodyBase64) throw failure('invalid internal HTTP response');
  const responseHeaders = new Headers();
  for (let index = 0; index < result.rawHeaders.length; index += 2) responseHeaders.append(result.rawHeaders[index], result.rawHeaders[index + 1]);
  return { response: new Response([204, 205, 304].includes(result.status) || prepared.method === 'HEAD' ? null : responseBody,
    { status: result.status, headers: responseHeaders }), rawPathPreserved: true };
}

export async function runSmokeStages(operations) {
  let complete = false;
  try {
    await operations.prepare();
    await operations.bootstrap();
    await operations.production();
    await operations.http();
    await operations.backup();
    await operations.restore();
    await operations.verifyRestored();
    complete = true;
  } finally {
    await operations.cleanup();
  }
  if (complete) await operations.evidence();
}

export async function main(args = process.argv.slice(2)) {
  const source = captureReleaseSmokeSource();
  if (args.length === 1 && args[0] === '--source-info') { console.log(JSON.stringify(source)); return; }
  const buildHistorical = args.length === 1 && args[0] === '--build-historical-images';
  const buildCurrent = args.length === 1 && args[0] === '--build-current-images';
  const historical = args.length === 8 && args[4] === '--historical-api-image' && args[6] === '--historical-frontend-image'
    && ID.test(args[5]) && ID.test(args[7]);
  if (!buildHistorical && !buildCurrent && (!(args.length === 4 || historical) || args[0] !== '--api-image' || args[2] !== '--frontend-image'
    || !ID.test(args[1]) || !ID.test(args[3]))) throw failure('use --api-image sha256:... --frontend-image sha256:... [--historical-api-image sha256:... --historical-frontend-image sha256:...]');
  const clean = closedEnvironment();
  const docker = (parameters, options = {}) => smokeCommand('docker', parameters, { env: clean, ...options });
  const currentContext = docker(['context', 'show']);
  const endpoint = docker(['context', 'inspect', currentContext, '--format', '{{.Endpoints.docker.Host}}']);
  if (!/^(?:unix:\/\/|npipe:\/\/)/u.test(endpoint)) throw failure('only a local Docker daemon is permitted');
  if (buildCurrent) {
    const parent = path.join(ROOT, '.agent/temp'); mkdirSync(parent, { recursive: true });
    const output = mkdtempSync(path.join(parent, 'current-release-build-'));
    const built = {};
    for (const role of ['api', 'frontend']) {
      console.log(`Current release: building actual local ${role} sources.`);
      const iid = path.join(output, `${role}.iid`);
      docker(['build', '--iidfile', iid, '-f', role === 'api' ? 'api-server/Dockerfile' : 'Dockerfile',
        '--build-arg', `BASELINE_BUILD_SHA=${source.revision}`, '--build-arg', `BASELINE_BUILD_INPUT_TREE_SHA256=${source.sourceTreeSha256}`,
        ...(role === 'frontend' ? ['--build-arg', `BACKEND_API_URL=${BACKEND_URL}`, '--build-arg', `NEXT_PUBLIC_API_URL=${BACKEND_URL}`] : []), '.'],
      { cwd: role === 'api' ? ROOT : path.join(ROOT, 'frontend'), timeout: 1_800_000, maxBuffer: 16 * 1024 * 1024 });
      const imageId = readFileSync(iid, 'utf8').trim(); if (!ID.test(imageId)) throw failure('current build image identity missing');
      built[role] = { imageId };
    }
    assert.deepEqual(captureReleaseSmokeSource(), source, 'Source changed while current images were building.');
    const inspected = Object.fromEntries(Object.entries(built).map(([role, value]) => [role, JSON.parse(docker(['image', 'inspect', value.imageId]))[0]]));
    validateApplicationSmokeImages(inspected, source);
    privateWrite(path.join(output, 'build.json'), JSON.stringify({ schemaVersion: 1, kind: 'actual-worktree-production-build', source, images: built }, null, 2));
    console.log(JSON.stringify({ evidence: path.relative(ROOT, path.join(output, 'build.json')), apiImage: built.api.imageId, frontendImage: built.frontend.imageId }));
    return;
  }
  if (buildHistorical) {
    const fixed = captureHistoricalRelease(ROOT, smokeCommand);
    const parent = path.join(ROOT, '.agent/temp'); mkdirSync(parent, { recursive: true });
    const output = mkdtempSync(path.join(parent, 'historical-release-build-'));
    const built = {};
    for (const role of ['api', 'frontend']) {
      console.log(`Historical release: building fixed ${fixed.tag} ${role} archive.`);
      const archive = smokeCommand('git', [...HISTORICAL_ARCHIVE_GIT_OPTIONS, 'archive', '--format=tar', role === 'api' ? fixed.revision : `${fixed.revision}:frontend`],
        { binary: true, maxBuffer: 256 * 1024 * 1024 });
      const iid = path.join(output, `${role}.iid`);
      docker(['build', '--iidfile', iid, '-f', role === 'api' ? 'api-server/Dockerfile' : 'Dockerfile',
        '--build-arg', `BASELINE_BUILD_SHA=${fixed.revision}`, '--build-arg', `BASELINE_BUILD_INPUT_TREE_SHA256=${fixed.sourceTreeSha256}`,
        ...(role === 'frontend' ? ['--build-arg', `BACKEND_API_URL=${BACKEND_URL}`, '--build-arg', `NEXT_PUBLIC_API_URL=${BACKEND_URL}`] : []), '-'],
        { input: archive, timeout: 1_800_000, maxBuffer: 16 * 1024 * 1024 });
      const imageId = readFileSync(iid, 'utf8').trim(); if (!ID.test(imageId)) throw failure('historical build image identity missing');
      built[role] = { imageId, archiveSha256: hash(archive) };
    }
    const inspected = Object.fromEntries(Object.entries(built).map(([role, value]) => [role, JSON.parse(docker(['image', 'inspect', value.imageId]))[0]]));
    validateHistoricalImages(inspected);
    privateWrite(path.join(output, 'build.json'), JSON.stringify({ schemaVersion: 1, kind: 'fixed-git-archive-historical-build', source: fixed, images: built }, null, 2));
    console.log(JSON.stringify({ evidence: path.relative(ROOT, path.join(output, 'build.json')), apiImage: built.api.imageId, frontendImage: built.frontend.imageId }));
    return;
  }
  const images = { api: JSON.parse(docker(['image', 'inspect', args[1]]))[0], frontend: JSON.parse(docker(['image', 'inspect', args[3]]))[0] };
  const historicalSource = historical ? captureHistoricalRelease(ROOT, smokeCommand) : null;
  const oldImages = historical ? { api: JSON.parse(docker(['image', 'inspect', args[5]]))[0], frontend: JSON.parse(docker(['image', 'inspect', args[7]]))[0] } : null;
  const baseSource = readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
  const prodSource = readFileSync(path.join(ROOT, 'docker-compose.prod.yml'), 'utf8');
  const edgeSource = readFileSync(path.join(ROOT, 'config/edge/default.conf.template'));
  const supportReference = (text, role) => {
    const match = text.match(new RegExp(`^  ${role}:\\r?\\n(?:    [^\\n]*\\r?\\n)*?    image: ([^\\r\\n]+)`, 'mu'));
    if (!match || !/@sha256:[a-f0-9]{64}$/u.test(match[1])) throw failure('support image must have a committed digest');
    return match[1];
  };
  images.db = JSON.parse(docker(['image', 'inspect', supportReference(baseSource, 'db')]))[0];
  images.edge = JSON.parse(docker(['image', 'inspect', supportReference(prodSource, 'edge')]))[0];
  validateSmokeImages(images, source);
  if (oldImages) { oldImages.db = images.db; oldImages.edge = images.edge; validateHistoricalImages(oldImages); }
  const parent = path.join(ROOT, '.agent/temp'); mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(path.join(parent, 'egov-release-smoke-'));
  if (!realpathSync(directory).startsWith(realpathSync(parent) + path.sep)) throw failure('unsafe temporary directory');
  const credentials = { database: randomBytes(24).toString('hex'), jwt: randomBytes(64).toString('base64'),
    encryption: randomBytes(24).toString('hex'), admin: `Aa1!${randomBytes(18).toString('hex')}` };
  const runId = randomBytes(12).toString('hex');
  const copySources = folder => {
    mkdirSync(path.join(folder, 'config/edge'), { recursive: true });
    privateWrite(path.join(folder, 'base.yml'), baseSource);
    privateWrite(path.join(folder, 'prod.yml'), prodSource);
    privateWrite(path.join(folder, 'config/edge/default.conf.template'), edgeSource);
    privateWrite(path.join(folder, 'owned.env'), Object.entries({ DB_URL: 'jdbc:postgresql://db:5432/unused', DB_USERNAME: 'smoke',
      DB_PASSWORD: credentials.database, JWT_SECRET: credentials.jwt, ALGORITHM_KEY: credentials.encryption,
      ADMIN_INITIAL_PASSWORD: credentials.admin, MAIL_HOST: '127.0.0.1', OLD_ALGORITHM_KEY: '' }).map(([key, value]) => `${key}=${value}`).join('\n'));
  };
  const networkSubnets = docker(['network', 'ls', '-q']).split(/\s+/u).filter(Boolean)
    .flatMap(id => JSON.parse(docker(['network', 'inspect', id])))
    .flatMap(network => (network.IPAM?.Config ?? []).map(config => config.Subnet));
  const chooseSubnet = () => {
    for (let octet = 1; octet < 255; octet += 1) {
      const candidate = `10.203.${octet}.0/24`;
      if (!networkSubnets.includes(candidate)) { networkSubnets.push(candidate); return candidate; }
    }
    throw failure('no unused test subnet');
  };
  const contexts = [];
  const setup = (phase, runtimeImages = images) => {
    const folder = path.join(directory, phase); copySources(folder);
    const context = createSmokeContext({ runId, phase, images: runtimeImages, directory: folder, subnet: chooseSubnet() });
    const rendered = JSON.parse(docker(['compose', '--project-directory', folder, '--env-file', path.join(folder, 'owned.env'),
      '-f', path.join(folder, 'base.yml'), '-f', path.join(folder, 'prod.yml'), 'config', '--format', 'json']));
    const plan = createReleaseSmokePlan(rendered, context, credentials);
    const file = path.join(folder, 'compose.json'); privateWrite(file, JSON.stringify(plan));
    const compose = parameters => docker(['compose', '--project-directory', folder, '--env-file', path.join(folder, 'owned.env'),
      '-p', context.project, '-f', file, ...parameters]);
    const inspectedPlan = JSON.parse(compose(['config', '--format', 'json']));
    validateReleaseSmokePlan(inspectedPlan, context, credentials);
    const inspect = (service, running = false, beforeStart = false) => {
      const container = JSON.parse(docker(['container', 'inspect', context.ids[service] ?? `${context.project}-${service}`]))[0];
      return assertOwnedSmokeContainer(container, service, context, plan, { running, beforeStart });
    };
    const sql = statement => {
      const database = inspect('db', true);
      return docker(['exec', '-i', database.Id, 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'smoke', '-d', context.database, '-tAc', statement]);
    };
    const verifyNetwork = () => {
      const network = JSON.parse(docker(['network', 'inspect', context.network]))[0];
      if (network.Labels?.[OWNER] !== runId || network.Labels['com.docker.compose.project'] !== context.project
        || network.Driver !== 'bridge' || !network.Internal || network.IPAM?.Config?.[0]?.Subnet !== context.subnet
        || (context.networkId && context.networkId !== network.Id)) throw failure('actual network is not owned');
      context.networkId = network.Id;
    };
    const diagnose = (service, container, reason) => {
      // The caller has verified this container's ownership. Capture bounded stdout AND stderr only in memory.
      const result = spawnSync('docker', ['logs', '--tail', '200', container.Id], {
        env: clean, encoding: 'utf8', windowsHide: true, timeout: 10_000, maxBuffer: 256 * 1024,
      });
      const captured = !result.error && result.status === 0;
      const diagnostic = createSmokeFailureDiagnostic({ service, phase, reason, container, credentials,
        logs: captured ? `${result.stdout ?? ''}\n${result.stderr ?? ''}` : '', logStatus: captured ? 'captured' : 'unavailable' });
      privateWrite(path.join(folder, `${service}-readiness-failure.json`), JSON.stringify(diagnostic, null, 2));
    };
    const waitHealthy = service => waitForSmokeHealth(service, { inspect, diagnose });
    const start = async services => {
      // Inspect the effective container configuration before application startup can write.
      compose(['create', '--no-build', '--pull', 'never', '--no-recreate', ...services]); verifyNetwork();
      for (const service of services) {
        const container = inspect(service, false, true);
        if (!container.State.Running) docker(['start', container.Id]);
        await waitHealthy(service);
      }
    };
    const stop = service => { const container = inspect(service); docker(['stop', '--time', '200', container.Id]); };
    const value = { context, plan, compose, inspect, sql, start, stop, waitHealthy, verifyNetwork };
    contexts.push(value); return value;
  };
  let fresh, restored, fileId, expectedFileHash, backup, attachmentArchive, httpChecks, tableCounts;
  const pathProbes = [];
  const check = (condition, category) => { if (!condition) throw failure(category); };
  const httpSmoke = async (runtime, existingFile) => {
    const origin = 'http://edge:8080';
    const rawProbe = async (target, rawPath, options) => {
      const { response, rawPathPreserved } = await containerSmokeRequest(runtime, docker, target, rawPath, { method: 'POST', ...options });
      let value; try { value = await response.json(); } catch { value = null; }
      return { status: response.status, exposesToken: exposesToken(value), rawPathPreserved };
    };
    const direct = await probeDirectApiEncodedPaths(
      (route, options) => containerSmokeRequest(runtime, docker, 'api', route, options),
      JSON.stringify({ userId: 'webmaster', password: credentials.admin }));
    pathProbes.push(...direct.map(probe => ({ target: 'api', phase: runtime.context.phase, ...probe })));
    const request = async (route, options = {}) => (await containerSmokeRequest(runtime, docker, 'edge', route, options)).response;
    check((await request('/login')).status === 200, 'login page unavailable');
    const login = await request('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ userId: 'webmaster', password: credentials.admin }) });
    check(login.status === 200, 'production login failed');
    const body = await login.json();
    check(body.success === true && !Object.hasOwn(body, 'accessToken') && !Object.hasOwn(body.data ?? {}, 'accessToken')
      && !Object.hasOwn(body, 'refreshToken') && !Object.hasOwn(body.data ?? {}, 'refreshToken'), 'browser token response exposed');
    const cookies = login.headers.getSetCookie();
    validateSmokeSessionCookies(cookies);
    // Only this test context replays HttpOnly cookies; product JavaScript never reads them.
    let cookie = cookies.map(value => value.split(';', 1)[0]).join('; ');
    check((await request('/api/v1/auth/me', { headers: { Cookie: cookie } })).status === 200, 'session or rewrite failed');
    check((await request('/api/v1/auth/%72eissue', { method: 'POST', headers: { Cookie: cookie, Origin: origin } })).status === 400, 'encoded token route bypass');
    check((await request('/api/v1/auth/reissue', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://untrusted.invalid' } })).status === 403, 'cross-origin token route accepted');
    for (const rawPath of ENCODED_AUTH_PATHS) {
      const controlLogin = await request('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
        body: JSON.stringify({ userId: 'webmaster', password: credentials.admin }) });
      check(controlLogin.status === 200, 'encoded probe login control failed');
      const controlLoginCookies = controlLogin.headers.getSetCookie();
      validateSmokeSessionCookies(controlLoginCookies);
      let probeCookie = controlLoginCookies.map(value => value.split(';', 1)[0]).join('; ');
      const controlRefresh = await request('/api/v1/auth/reissue', { method: 'POST', headers: { Cookie: probeCookie, Origin: origin } });
      check(controlRefresh.status === 200 && !exposesToken(await controlRefresh.json()), 'encoded probe refresh control failed');
      const controlRefreshCookies = controlRefresh.headers.getSetCookie();
      validateSmokeSessionCookies(controlRefreshCookies);
      const jar = new Map(probeCookie.split('; ').map(value => { const index = value.indexOf('='); return [value.slice(0, index), value.slice(index + 1)]; }));
      for (const value of controlRefreshCookies) { const pair = value.split(';', 1)[0]; const index = pair.indexOf('='); jar.set(pair.slice(0, index), pair.slice(index + 1)); }
      probeCookie = [...jar].map(([key, value]) => `${key}=${value}`).join('; ');
      const probe = await rawProbe('edge', rawPath, { headers: { Cookie: probeCookie, Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'webmaster', password: credentials.admin }) });
      validateEncodedSmokeProbe(probe);
      cookie = probeCookie;
      pathProbes.push({ target: 'edge', phase: runtime.context.phase, path: rawPath,
        controls: { login: controlLogin.status, refresh: controlRefresh.status }, ...probe });
    }
    check((await request('/api/v1/auth/me', { headers: { Cookie: cookie } })).status === 200, 'latest probe session is invalid');
    const actuator = await request('/actuator/health', { headers: { Cookie: cookie } });
    validateSmokeManagementBoundary(actuator.status);
    let attachmentId = existingFile;
    if (!attachmentId) {
      const bytes = Buffer.from('release-smoke synthetic attachment\n'); expectedFileHash = hash(bytes);
      const form = new FormData(); form.append('files', new Blob([bytes], { type: 'text/plain' }), 'smoke.txt');
      const uploaded = await request('/api/v1/files', { method: 'POST', headers: { Cookie: cookie, Origin: origin }, body: form });
      check(uploaded.status === 200, 'nonroot attachment upload failed');
      attachmentId = (await uploaded.json()).data;
      check(Number.isSafeInteger(attachmentId) && attachmentId > 0, 'upload contract changed');
    }
    const downloaded = await request(`/api/v1/files/${attachmentId}/1`, { headers: { Cookie: cookie } });
    check(downloaded.status === 200 && hash(Buffer.from(await downloaded.arrayBuffer())) === expectedFileHash, 'attachment content mismatch');
    validateSmokeBarrier(JSON.parse(runtime.sql(BARRIER_SQL)));
    return { attachmentId, checks: ['nonbrowser-login-contract', 'direct-api-encoded-routes', 'login', 'token-body', 'cookie-attributes', 'session', 'encoded-route', 'origin', 'management-boundary', 'attachment', 'schema-barrier'] };
  };
  const assertVolume = runtime => {
    const volume = JSON.parse(docker(['volume', 'inspect', runtime.context.volume]))[0];
    check(volume.Name === runtime.context.volume && volume.Labels?.[OWNER] === runId
      && volume.Labels['com.docker.compose.project'] === runtime.context.project && volume.Driver === 'local'
      && Object.keys(volume.Options ?? {}).length === 0 && Date.parse(volume.CreatedAt) >= runtime.context.createdAt - 2000, 'attachment volume ownership mismatch');
  };
  const attachmentTar = (runtime, restoreBytes) => {
    assertVolume(runtime);
    return docker(['run', '--rm', '--pull', 'never', '--network', 'none', '--label', `${OWNER}=${runId}`,
      '--mount', `type=volume,source=${runtime.context.volume},target=/app/storage${restoreBytes ? '' : ',readonly'}`,
      '--entrypoint', 'tar', ...(restoreBytes ? ['-i'] : []), images.api.Id,
      '-C', '/app/storage', restoreBytes ? '-xf' : '-cf', '-', ...(restoreBytes ? [] : ['.'])],
    { binary: true, input: restoreBytes });
  };
  const cleanup = async () => {
    // All lifecycle modes share the same inspection before removing exact owned resources.
    for (const runtime of contexts) {
      const ids = docker(['ps', '-aq', '--filter', `label=${OWNER}=${runId}`, '--filter', `label=com.docker.compose.project=${runtime.context.project}`]).split(/\s+/u).filter(Boolean);
      const containers = ids.map(id => JSON.parse(docker(['container', 'inspect', id]))[0]);
      for (const container of containers) {
        const service = container.Config?.Labels?.['com.docker.compose.service'];
        if (!runtime.plan.services[service]) throw failure('cleanup found an unexpected owned service');
        assertOwnedSmokeContainer(container, service, runtime.context, runtime.plan, { beforeStart: true });
      }
      const volumes = docker(['volume', 'ls', '-q', '--filter', `label=${OWNER}=${runId}`, '--filter', `label=com.docker.compose.project=${runtime.context.project}`]).split(/\s+/u).filter(Boolean);
      for (const name of volumes) { check(name === runtime.context.volume, 'cleanup found unexpected volume'); assertVolume(runtime); }
      const networks = docker(['network', 'ls', '-q', '--filter', `label=${OWNER}=${runId}`, '--filter', `label=com.docker.compose.project=${runtime.context.project}`]).split(/\s+/u).filter(Boolean);
      for (const id of networks) { runtime.verifyNetwork(); check(runtime.context.networkId.startsWith(id), 'cleanup network identity changed'); }
      for (const container of containers) docker(['rm', '--force', container.Id]);
      for (const name of volumes) docker(['volume', 'rm', name]);
      for (const _id of networks) docker(['network', 'rm', runtime.context.networkId]);
    }
    check(docker(['ps', '-aq', '--filter', `label=${OWNER}=${runId}`]) === ''
      && docker(['volume', 'ls', '-q', '--filter', `label=${OWNER}=${runId}`]) === ''
      && docker(['network', 'ls', '-q', '--filter', `label=${OWNER}=${runId}`]) === '', 'owned resources remain after cleanup');
  };
  const startedAt = Date.now();
  if (historical) {
    let previous, upgraded, rollback, snapshotTime, historicalCounts, constraintsHash, coreConstraintsHash, historicalConstraintDefinitions, historicalColumns, columnsHash, cipher, rollbackConstraintComparison, rollbackColumnComparison, rollbackRawColumnsHash, rollbackRawConstraintsHash;
    let upgradeStartedAt, rollbackStartedAt, upgradeMillis, rollbackMillis;
    let backupBytes, fileBytes, historicalStorageOwner;
    const fixture = { users: [`smoke_${runId.slice(0, 10)}a`, `smoke_${runId.slice(0, 10)}b`],
      password: `Aa1!${randomBytes(18).toString('hex')}`, bookName: `owned recovery ${runId.slice(0, 12)}` };
    const classes = path.join(directory, 'probe-classes'); mkdirSync(classes);
    const probe = async (runtime, mode, input) => {
      runtime.verifyNetwork(); const api = runtime.inspect('api', true);
      docker(['cp', classes, `${api.Id}:/tmp/recovery-probe`]);
      const value = docker(['exec', '-i', api.Id, 'java', '-Dloader.path=/tmp/recovery-probe',
        '-Dloader.main=nuri.recoveryprobe.ReleaseSmokeProbe', '-cp', '/app/app.jar',
        'org.springframework.boot.loader.launch.PropertiesLauncher', mode], { input });
      const lines = value.split(/\r?\n/u).filter(line => line.startsWith('EGOV_PROBE='));
      check(lines.length === 1, 'packaged crypto probe did not return a unique result');
      return lines[0].slice('EGOV_PROBE='.length);
    };
    const request = async (runtime, route, token, data, method = 'GET') => (await containerSmokeRequest(runtime, docker, 'api', route, {
      method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {}),
    })).response;
    const login = async (runtime, userId, password) => {
      const response = await request(runtime, '/api/v1/auth/login', null, { userId, password }, 'POST');
      check(response.status === 200, 'historical fixture login failed');
      const token = (await response.json())?.data?.accessToken;
      check(typeof token === 'string' && token.length > 0, 'historical fixture token missing'); return token;
    };
    const constraintDigest = runtime => hash(runtime.sql("SELECT coalesce(string_agg(n.nspname||'.'||c.relname||':'||x.conname||':'||pg_get_constraintdef(x.oid),E'\\n' ORDER BY n.nspname,c.relname,x.conname),'') FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'"));
    const constraintDefinitions = runtime => JSON.parse(runtime.sql("SELECT jsonb_object_agg(c.relname||':'||x.conname,pg_get_constraintdef(x.oid)) FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'"));
    const columnDefinitions = runtime => JSON.parse(runtime.sql("SELECT jsonb_agg(jsonb_build_array(table_name,column_name,ordinal_position,data_type,udt_schema,udt_name,domain_schema,domain_name,character_maximum_length,numeric_precision,numeric_scale,datetime_precision,is_nullable,column_default,is_identity,identity_generation,identity_start,identity_increment,identity_maximum,identity_minimum,identity_cycle,is_generated,generation_expression,collation_schema,collation_name) ORDER BY table_name,ordinal_position) FROM information_schema.columns WHERE table_schema='public'"));
    const coreConstraintDigest = runtime => hash(runtime.sql("SELECT coalesce(string_agg(c.relname||':'||x.conname||':'||pg_get_constraintdef(x.oid)||':'||x.convalidated::text,E'\\n' ORDER BY c.relname,x.conname),'') FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('tb_adbk_manage','tb_adbk_info','tb_file_master','tb_file_detail') AND x.contype IN ('p','u','f')"));
    const restoreSnapshot = async runtime => {
      await runtime.start(['db']);
      docker(['exec', '-i', runtime.inspect('db', true).Id, 'pg_restore', '--exit-on-error', '--no-owner', '-U', 'smoke', '-d', runtime.context.database], { binary: true, input: backupBytes });
      runtime.compose(['create', '--no-build', '--pull', 'never', '--no-recreate', 'api']); runtime.verifyNetwork(); runtime.inspect('api', false, true);
      attachmentTar(runtime, fileBytes);
    };
    const verifyFixture = async runtime => {
      const adminToken = await login(runtime, 'webmaster', credentials.admin);
      const ownerToken = await login(runtime, fixture.users[0], fixture.password);
      const otherToken = await login(runtime, fixture.users[1], fixture.password);
      const book = await request(runtime, `/api/v1/address-books/${fixture.bookId}`, ownerToken);
      check(book.status === 200, 'restored owner could not read business data');
      const data = (await book.json()).data;
      check(data.adbkNm === fixture.bookName && data.useYn === 'Y' && data.adbkMan?.length === 1
        && data.adbkMan[0].nm === '합성 복구 연락처' && data.adbkMan[0].emlAddr === 'restore@example.invalid'
        && data.adbkMan[0].mblTelno === '01000000111', 'restored business snapshot differs');
      check((await request(runtime, `/api/v1/address-books/${fixture.bookId}`, otherToken)).status === 403, 'restored owner privacy changed');
      check((await request(runtime, '/api/v1/admin/system/users', ownerToken)).status === 403, 'ordinary user gained administrative access');
      check((await request(runtime, '/api/v1/admin/system/users', adminToken)).status === 200, 'administrative permission was lost');
      check((await request(runtime, `/api/v1/address-books/${fixture.bookId}`, null)).status === 401, 'anonymous business access changed');
      const downloaded = await request(runtime, `/api/v1/files/${fixture.fileId}/1`, adminToken);
      check(downloaded.status === 200 && hash(Buffer.from(await downloaded.arrayBuffer())) === expectedFileHash, 'restored historical attachment differs');
      check(runtime.sql(`SELECT count(*) FROM tb_file_detail d JOIN tb_file_master m ON m.atch_file_sn=d.atch_file_sn WHERE m.atch_file_sn=${fixture.fileId}`) === '1', 'attachment relation was lost');
      const encryptedColumn = runtime.context.phase === 'upgraded' ? 'user_enrrno' : 'rrno';
      const storedCipher = runtime.sql(`SELECT ${encryptedColumn} FROM tb_user_info WHERE user_id='${fixture.users[0]}'`);
      check(storedCipher === cipher && await probe(runtime, 'verify', storedCipher) === 'verified', 'packaged crypto recovery check failed');
      check((await containerSmokeRequest(runtime, docker, 'edge', '/login')).response.status === 200, 'historical frontend image failed to serve');
    };
    await runHistoricalSmokeStages({
      prepare: async () => {
        console.log('Historical release: verifying fixed source and SQL embedded in the actual boot jar.');
        smokeCommand('javac', ['-d', classes, path.join(ROOT, 'scripts/ReleaseSmokeProbe.java')]);
        const jar = path.join(directory, 'historical-app.jar');
        privateWrite(jar, docker(['run', '--rm', '--pull', 'never', '--network', 'none', '--label', `${OWNER}=${runId}`,
          '--entrypoint', 'cat', oldImages.api.Id, '/app/app.jar'], { binary: true, maxBuffer: 256 * 1024 * 1024 }));
        const manifestResult = smokeCommand('java', ['-cp', classes, 'nuri.recoveryprobe.ReleaseSmokeProbe', 'manifest', jar]);
        check(manifestResult.startsWith('EGOV_PROBE='), 'historical boot jar manifest missing');
        validateHistoricalMigrations(JSON.parse(manifestResult.slice('EGOV_PROBE='.length)));
        const uid = docker(['run', '--rm', '--pull', 'never', '--network', 'none', '--entrypoint', 'id', oldImages.api.Id, '-u', 'spring']);
        const gid = docker(['run', '--rm', '--pull', 'never', '--network', 'none', '--entrypoint', 'id', oldImages.api.Id, '-g', 'spring']);
        check(/^[1-9]\d{0,7}$/u.test(uid) && /^[1-9]\d{0,7}$/u.test(gid), 'historical non-root storage owner is invalid');
        historicalStorageOwner = `${uid}:${gid}`;
        for (const imageSet of [oldImages, images]) {
          const routes = JSON.parse(docker(['run', '--rm', '--pull', 'never', '--network', 'none', '--label', `${OWNER}=${runId}`,
            '--entrypoint', 'node', imageSet.frontend.Id, '-e', 'process.stdout.write(require("node:fs").readFileSync(".next/routes-manifest.json","utf8"))']));
          assertBuildTarget(routes, BACKEND_URL);
        }
        previous = setup('historical', oldImages); upgraded = setup('upgraded'); rollback = setup('rollback', oldImages);
      },
      historical: async () => {
        console.log('Historical release: starting the original production images on a fresh owned database.');
        await previous.start(['db']);
        previous.compose(['create', '--no-build', '--pull', 'never', '--no-recreate', 'api']); previous.verifyNetwork(); previous.inspect('api', false, true);
        assertVolume(previous);
        // The old image did not prepare storage. Use the actual old image's non-root UID/GID for this inspected synthetic volume.
        docker(['run', '--rm', '--pull', 'never', '--network', 'none', '--label', `${OWNER}=${runId}`, '--user', '0',
          '--mount', `type=volume,source=${previous.context.volume},target=/app/storage`, '--entrypoint', 'chown', images.api.Id, '-R', historicalStorageOwner, '/app/storage']);
        await previous.start(['api', 'frontend', 'edge']);
        check(previous.sql("SELECT count(*) FROM flyway_schema_history WHERE script LIKE 'V%.sql' AND success") === '85'
          && previous.sql("SELECT count(*) FROM flyway_schema_history WHERE script LIKE 'R__%.sql' AND success") === '3'
          && previous.sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='tb_user_authrt_map'") === '1', 'historical schema was not the previous release');
      },
      fixture: async () => {
        const adminToken = await login(previous, 'webmaster', credentials.admin);
        for (const userId of fixture.users) check((await request(previous, '/api/v1/admin/system/users', adminToken,
          { userId, pswd: fixture.password, userNm: '합성 복구 사용자', role: 'USER' }, 'POST')).status === 200, 'historical synthetic user creation failed');
        const ownerToken = await login(previous, fixture.users[0], fixture.password);
        check((await request(previous, '/api/v1/address-books', ownerToken, { adbkNm: fixture.bookName, rlsScopeCd: 'G',
          adbkMan: [{ userId: fixture.users[0], nm: '합성 복구 연락처', emlAddr: 'restore@example.invalid', mblTelno: '01000000111' }] }, 'POST')).status === 200, 'historical business fixture creation failed');
        const list = await request(previous, `/api/v1/address-books?searchWrd=${encodeURIComponent(fixture.bookName)}&size=100`, ownerToken);
        check(list.status === 200, 'historical business fixture readback failed');
        const rows = (await list.json()).data;
        fixture.bookId = (rows.list ?? rows.content ?? []).find(row => row.adbkNm === fixture.bookName)?.adbkSn;
        check(Number.isSafeInteger(fixture.bookId) && fixture.bookId > 0, 'historical business fixture identity missing');
        const attachment = Buffer.from('fixed historical synthetic attachment\n'); expectedFileHash = hash(attachment);
        const form = new FormData(); form.append('files', new Blob([attachment], { type: 'text/plain' }), 'restore.txt');
        const uploaded = (await containerSmokeRequest(previous, docker, 'api', '/api/v1/files', { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: form })).response;
        check(uploaded.status === 200, 'historical attachment fixture creation failed'); fixture.fileId = (await uploaded.json()).data;
        check(Number.isSafeInteger(fixture.fileId) && fixture.fileId > 0, 'historical attachment fixture identity missing');
        cipher = await probe(previous, 'encrypt'); check(/^[A-Za-z0-9+/=]{1,256}$/u.test(cipher), 'historical cipher is invalid');
        check(previous.sql(`UPDATE tb_user_info SET rrno='${cipher}' WHERE user_id='${fixture.users[0]}' RETURNING user_id`) === fixture.users[0], 'owned crypto fixture update failed');
        await verifyFixture(previous);
      },
      backupBeforeUpgrade: async () => {
        console.log('Historical release: stopping writers and capturing the pre-upgrade recovery point.');
        previous.stop('edge'); previous.stop('frontend'); previous.stop('api');
        snapshotTime = new Date().toISOString();
        historicalCounts = validateSmokeTableCounts(JSON.parse(previous.sql(TABLE_COUNTS_SQL))); constraintsHash = constraintDigest(previous);
        historicalConstraintDefinitions = constraintDefinitions(previous);
        historicalColumns = columnDefinitions(previous); columnsHash = hash(JSON.stringify(historicalColumns));
        coreConstraintsHash = coreConstraintDigest(previous);
        backupBytes = docker(['exec', previous.inspect('db', true).Id, 'pg_dump', '-U', 'smoke', '-d', previous.context.database, '-Fc'], { binary: true });
        fileBytes = attachmentTar(previous);
        privateWrite(path.join(directory, 'pre-upgrade.dump'), backupBytes); privateWrite(path.join(directory, 'pre-upgrade-attachments.tar'), fileBytes);
        // An owned update after the snapshot must not appear in either restored database.
        check(previous.sql(`UPDATE tb_adbk_manage SET adbk_nm=adbk_nm||' after-backup' WHERE adbk_sn=${fixture.bookId} RETURNING adbk_sn`) === String(fixture.bookId), 'recovery-point control update failed');
      },
      upgrade: async () => {
        console.log('Historical release: restoring the pre-upgrade snapshot and migrating with current code.');
        upgradeStartedAt = Date.now(); await restoreSnapshot(upgraded);
        await upgraded.start(['bootstrap']); validateSmokeBarrier(JSON.parse(upgraded.sql(BARRIER_SQL))); upgraded.stop('bootstrap');
        await upgraded.start(['api', 'frontend', 'edge']);
      },
      verifyUpgraded: async () => {
        check(coreConstraintDigest(upgraded) === coreConstraintsHash, 'upgraded business or attachment constraints differ');
        await verifyFixture(upgraded); await httpSmoke(upgraded, fixture.fileId);
        upgradeMillis = Date.now() - upgradeStartedAt;
        upgraded.stop('edge'); upgraded.stop('frontend'); upgraded.stop('api');
      },
      rollback: async () => {
        console.log('Historical release: restoring the same pre-upgrade snapshot with the original images.');
        rollbackStartedAt = Date.now(); await restoreSnapshot(rollback);
        const restoredCounts = validateSmokeTableCounts(JSON.parse(rollback.sql(TABLE_COUNTS_SQL)));
        const restoredConstraints = constraintDigest(rollback);
        const restoredDefinitions = constraintDefinitions(rollback);
        const restoredColumns = columnDefinitions(rollback); const restoredColumnsHash = hash(JSON.stringify(restoredColumns));
        rollbackColumnComparison = compareHistoricalColumns(historicalColumns, restoredColumns);
        rollbackRawColumnsHash = restoredColumnsHash;
        const columnRows = rows => new Map(rows.map(row => [`${row[0]}:${row[1]}`, row]));
        const originalColumnRows = columnRows(historicalColumns); const restoredColumnRows = columnRows(restoredColumns);
        const columnDifferences = [...new Set([...originalColumnRows.keys(), ...restoredColumnRows.keys()])]
          .filter(key => JSON.stringify(originalColumnRows.get(key)) !== JSON.stringify(restoredColumnRows.get(key)))
          .map(key => ({ key, before: originalColumnRows.get(key), restored: restoredColumnRows.get(key) }));
        rollbackConstraintComparison = compareHistoricalConstraints(historicalConstraintDefinitions, restoredDefinitions);
        rollbackRawConstraintsHash = restoredConstraints;
        const differences = [...new Set([...Object.keys(historicalCounts), ...Object.keys(restoredCounts)])]
          .filter(table => historicalCounts[table] !== restoredCounts[table])
          .map(table => ({ table, before: historicalCounts[table], restored: restoredCounts[table] }));
        privateWrite(path.join(directory, 'rollback-restore-check.json'), JSON.stringify({ differences,
          originalConstraintsSha256: constraintsHash, restoredConstraintsSha256: restoredConstraints,
          originalColumnsSha256: columnsHash, restoredColumnsSha256: restoredColumnsHash,
          canonicalColumnsSha256: rollbackColumnComparison.canonicalSha256,
          normalizedOrdinalCount: rollbackColumnComparison.normalizedOrdinalCount,
          remainingColumnDifferences: rollbackColumnComparison.differences,
          columnDifferences,
          canonicalConstraintsSha256: rollbackConstraintComparison.canonicalSha256,
          normalizedConstraintCount: rollbackConstraintComparison.normalizedCount,
          remainingConstraintDifferences: rollbackConstraintComparison.differences,
          constraintDifferences: [...new Set([...Object.keys(historicalConstraintDefinitions), ...Object.keys(restoredDefinitions)])]
            .filter(key => historicalConstraintDefinitions[key] !== restoredDefinitions[key])
            .map(key => ({ key, before: historicalConstraintDefinitions[key], restored: restoredDefinitions[key] })) }, null, 2));
        check(differences.length === 0 && rollbackConstraintComparison.differences.length === 0 && rollbackColumnComparison.differences.length === 0, 'pre-upgrade database census, columns or constraints differ');
        await rollback.start(['api', 'frontend', 'edge']);
      },
      verifyRollback: async () => { await verifyFixture(rollback); rollbackMillis = Date.now() - rollbackStartedAt; },
      cleanup,
      evidence: async () => {
        assert.deepEqual(captureReleaseSmokeSource(), source, 'Source changed while historical smoke was running.');
        const result = { schemaVersion: 1, kind: 'local-isolated-historical-upgrade-rollback', publicationApproved: false,
          source, historicalSource, images: Object.fromEntries(Object.entries(images).map(([role, image]) => [role, image.Id])),
          historicalImages: Object.fromEntries(Object.entries(oldImages).map(([role, image]) => [role, image.Id])),
          historicalStorageOwner,
          runnerSha256: hash(readFileSync(fileURLToPath(import.meta.url))), fixtureSha256: hash(readFileSync(path.join(ROOT, 'scripts/historical-release-fixture.mjs'))),
          probeSha256: hash(readFileSync(path.join(ROOT, 'scripts/ReleaseSmokeProbe.java'))),
          recoveryPoint: { snapshotTime, source: 'writers-stopped-pre-upgrade-backup', syntheticUsers: 2, syntheticBusinessRows: 2,
            snapshotRowsLost: 0, postSnapshotSyntheticUpdatesExcluded: 1, operationalRpoApproved: false },
          restoreAndVerificationMillis: { upgraded: upgradeMillis, rollback: rollbackMillis }, operationalRtoApproved: false,
          checks: ['fixed-git-source', 'actual-embedded-historical-sql', 'previous-production-images', 'pre-upgrade-backup',
            'business-data', 'attachments-and-relations', 'packaged-crypto-and-wrong-key', 'owner-and-admin-permissions', 'constraints', 'rollback-table-census'],
          tablesVerified: Object.keys(historicalCounts).length, tableCountsSha256: hash(JSON.stringify(historicalCounts)), constraintsSha256: constraintsHash,
          upgradedCoreConstraintsSha256: coreConstraintsHash,
          originalColumnsSha256: columnsHash, rollbackRawColumnsSha256: rollbackRawColumnsHash,
          rollbackCanonicalColumnsSha256: rollbackColumnComparison.canonicalSha256,
          rollbackColumnsCompared: rollbackColumnComparison.columnsCompared,
          rollbackNormalizedOrdinalCount: rollbackColumnComparison.normalizedOrdinalCount,
          rollbackRawConstraintsSha256: rollbackRawConstraintsHash,
          rollbackCanonicalConstraintsSha256: rollbackConstraintComparison.canonicalSha256,
          rollbackConstraintsCompared: Object.keys(historicalConstraintDefinitions).length,
          rollbackNormalizedConstraintCount: rollbackConstraintComparison.normalizedCount,
          databaseBackupSha256: hash(backupBytes), attachmentBackupSha256: hash(fileBytes), pathProbes,
          operationalRecovery: 'not-tested', tlsBrowserFlow: 'not-tested', elapsedMs: Date.now() - startedAt, ownedResourcesRemaining: 0 };
        privateWrite(path.join(directory, 'result.json'), JSON.stringify(result, null, 2));
        console.log(`Historical upgrade and rollback passed; bounded evidence: ${path.relative(ROOT, path.join(directory, 'result.json'))}`);
      },
    });
    return;
  }
  await runSmokeStages({
    prepare: async () => {
      console.log('Release smoke: verifying immutable runtime and owned plans.');
      const routes = JSON.parse(docker(['run', '--rm', '--pull', 'never', '--network', 'none', '--label', `${OWNER}=${runId}`,
        '--entrypoint', 'node', images.frontend.Id, '-e', 'process.stdout.write(require("node:fs").readFileSync(".next/routes-manifest.json","utf8"))']));
      assertBuildTarget(routes, BACKEND_URL);
      fresh = setup('fresh'); restored = setup('restored');
    },
    bootstrap: async () => {
      console.log('Release smoke: disposable migration and explicit authorization cutover.');
      await fresh.start(['db']); await fresh.start(['bootstrap']);
      validateSmokeBarrier(JSON.parse(fresh.sql(BARRIER_SQL)));
      fresh.stop('bootstrap');
    },
    production: async () => {
      console.log('Release smoke: starting production profile and edge.');
      await fresh.start(['api', 'frontend', 'edge']); assertVolume(fresh);
    },
    http: async () => { const result = await httpSmoke(fresh); fileId = result.attachmentId; httpChecks = result.checks; },
    backup: async () => {
      console.log('Release smoke: backing up owned database and attachment storage.');
      fresh.stop('edge'); fresh.stop('frontend'); fresh.stop('api');
      const database = fresh.inspect('db', true);
      tableCounts = validateSmokeTableCounts(JSON.parse(fresh.sql(TABLE_COUNTS_SQL)));
      backup = docker(['exec', database.Id, 'pg_dump', '-U', 'smoke', '-d', fresh.context.database, '-Fc'], { binary: true });
      attachmentArchive = attachmentTar(fresh);
      privateWrite(path.join(directory, 'database.dump'), backup);
      privateWrite(path.join(directory, 'attachments.tar'), attachmentArchive);
    },
    restore: async () => {
      console.log('Release smoke: restoring into a second fresh owned database and volume.');
      await restored.start(['db']);
      docker(['exec', '-i', restored.inspect('db', true).Id, 'pg_restore', '--exit-on-error', '--no-owner', '-U', 'smoke', '-d', restored.context.database], { binary: true, input: backup });
      restored.compose(['create', '--no-build', '--pull', 'never', '--no-recreate', 'api']); restored.verifyNetwork(); restored.inspect('api', false, true);
      attachmentTar(restored, attachmentArchive);
      validateSmokeBarrier(JSON.parse(restored.sql(BARRIER_SQL)));
      check(JSON.stringify(validateSmokeTableCounts(JSON.parse(restored.sql(TABLE_COUNTS_SQL)))) === JSON.stringify(tableCounts), 'restored database row counts differ');
      await restored.start(['api', 'frontend', 'edge']);
    },
    verifyRestored: async () => { await httpSmoke(restored, fileId); },
    cleanup,
    evidence: async () => {
      assert.deepEqual(captureReleaseSmokeSource(), source, 'Source changed while smoke was running.');
      const evidence = { schemaVersion: 1, kind: 'local-isolated-release-smoke', publicationApproved: false,
        source, images: Object.fromEntries(Object.entries(images).map(([key, image]) => [key, { id: image.Id, repoDigests: image.RepoDigests ?? [] }])),
        runnerSha256: hash(readFileSync(fileURLToPath(import.meta.url))), composeSha256: hash(baseSource + prodSource), edgeTemplateSha256: hash(edgeSource),
        checks: httpChecks, pathProbes, freshInstall: 'explicit-disposable-cutover-then-prod', recovery: 'same-image-database-and-attachments',
        historicalUpgrade: 'not-tested', tlsBrowserFlow: 'not-tested', smtpDelivery: 'not-tested',
        tablesVerified: Object.keys(tableCounts).length, tableCountsSha256: hash(JSON.stringify(tableCounts)),
        databaseBackupSha256: hash(backup), attachmentBackupSha256: hash(attachmentArchive), elapsedMs: Date.now() - startedAt };
      privateWrite(path.join(directory, 'result.json'), JSON.stringify(evidence, null, 2));
      console.log(`Release smoke passed; bounded evidence: ${path.relative(ROOT, path.join(directory, 'result.json'))}`);
    },
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof Error && error.message.startsWith('Isolated release smoke: ')
      ? error.message : 'Isolated release smoke failed; no complete evidence was written. Raw diagnostics are withheld.');
    process.exitCode = 1;
  });
}
