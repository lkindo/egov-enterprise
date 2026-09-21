import { readFileSync } from 'node:fs';

const failure = () => new Error('E2E isolation verification failed; start a fresh run with scripts/run-isolated-e2e.mjs.');
const RUN_ID = /^[a-f0-9]{24}$/;
const API_ENTRYPOINT = ['sh', '-c', 'exec java $JAVA_OPTS -jar app.jar'];
const SAFE_JAVA_OPTIONS = /^(?:-Xm[sx][1-9]\d*[kKmMgG]|-Xss[1-9]\d*[kKmMgG]|-XX:\+UseParallelGC)$/;

function assertOwnedApiBootstrap(api, environment, application) {
  // The inspected JSON is authoritative only when neither the launcher nor an
  // alternate datasource/config source can replace it at application startup.
  if (JSON.stringify(api.Config.Entrypoint) !== JSON.stringify(API_ENTRYPOINT)
      || (api.Config.Cmd != null && (!Array.isArray(api.Config.Cmd) || api.Config.Cmd.length !== 0))) throw failure();
  const options = (environment.JAVA_OPTS ?? '').trim().split(/\s+/).filter(Boolean);
  if (options.some(option => !SAFE_JAVA_OPTIONS.test(option))) throw failure();
  if (Object.entries(environment).some(([key, value]) => value &&
      /^(?:SPRING_CONFIG_|SPRING_DATASOURCE_|SPRING_PROFILES_(?:INCLUDE|DEFAULT)$|SPRING_(?:FLYWAY|LIQUIBASE)_(?:URL|USER|PASSWORD)$|JAVA_TOOL_OPTIONS$|JDK_JAVA_OPTIONS$|_JAVA_OPTIONS$|LD_PRELOAD$|LD_LIBRARY_PATH$)/.test(key))) throw failure();
  if (application?.spring?.config
      || ['flyway', 'liquibase'].some(tool => ['url', 'user', 'password'].some(key => application?.spring?.[tool]?.[key]))) throw failure();
  const datasource = application?.spring?.datasource ?? {};
  const permitted = new Set(['url', 'jdbc-url', 'username', 'password', 'hikari']);
  if (Object.keys(datasource).some(key => !permitted.has(key))
      || Object.keys(datasource.hikari ?? {}).some(key => key !== 'jdbc-url')) throw failure();
  // An /etc/hosts entry for "db" can override Docker's otherwise correct network alias.
  if ((api.HostConfig?.ExtraHosts ?? []).length !== 0 || api.HostConfig?.NetworkMode === 'host') throw failure();
}

export function assertCiProject(environment) {
  const project = environment.COMPOSE_PROJECT_NAME;
  if (environment.GITHUB_ACTIONS !== 'true' || environment.CI !== 'true'
      || !/^\d+$/.test(environment.GITHUB_RUN_ID ?? '') || !/^\d+$/.test(environment.GITHUB_RUN_ATTEMPT ?? '')
      || !new RegExp(`^egov-e2e-${environment.GITHUB_RUN_ID}-${environment.GITHUB_RUN_ATTEMPT}-\\d+$`).test(project ?? '')) throw failure();
  return project;
}

function assertIsolatedDatasource(dbEnv, apiEnv, api) {
  let application;
  try { application = JSON.parse(apiEnv.SPRING_APPLICATION_JSON); } catch { throw failure(); }
  const assertUnambiguousKeys = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      // Spring flattens JSON keys: a dotted sibling can otherwise replace a verified nested value.
      if (key.includes('.')) throw failure();
      assertUnambiguousKeys(child);
    }
  };
  assertUnambiguousKeys(application);
  assertOwnedApiBootstrap(api, apiEnv, application);
  const datasource = application?.spring?.datasource;
  const databaseUrl = 'jdbc:postgresql://db:5432/authz_e2e';
  if (dbEnv.POSTGRES_DB !== 'authz_e2e' || dbEnv.POSTGRES_USER !== 'egov' || !dbEnv.POSTGRES_PASSWORD
      || apiEnv.SPRING_PROFILES_ACTIVE !== 'e2e'
      || apiEnv.NURI_AUTHORIZATION_ISOLATED_CUTOVER !== 'true'
      || apiEnv.NURI_AUTHORIZATION_DISPOSABLE_DATABASE_ACK !== 'CONFIRMED_DISPOSABLE_AUTHZ_DATABASE'
      || datasource?.url !== databaseUrl || datasource?.['jdbc-url'] !== databaseUrl
      || datasource?.hikari?.['jdbc-url'] !== databaseUrl
      || datasource?.username !== dbEnv.POSTGRES_USER || datasource?.password !== dbEnv.POSTGRES_PASSWORD
      || !apiEnv.JWT_SECRET) throw failure();
}

function mergedImageEnvironment(image, overrides) {
  if (!/^sha256:[a-f0-9]{64}$/.test(image?.Id ?? '') || !image.Config
      || !Array.isArray(image.Config.Env) || !overrides || typeof overrides !== 'object'
      || Array.isArray(overrides)) throw failure();
  const environment = new Map();
  for (const entry of image.Config.Env) {
    if (typeof entry !== 'string') throw failure();
    const separator = entry.indexOf('=');
    const key = entry.slice(0, separator);
    if (separator < 1 || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || environment.has(key)) throw failure();
    environment.set(key, entry.slice(separator + 1));
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || (value !== null && typeof value !== 'string')) throw failure();
    // Compose overrides image ENV; an explicitly unresolved value removes the variable.
    if (value === null) environment.delete(key);
    else environment.set(key, value);
  }
  return Object.fromEntries(environment);
}

/** Inspect the rendered plan and actual API image before startup can perform application writes. */
export function validateComposePlan(plan, environment, apiImage) {
  const project = assertCiProject(environment);
  const db = plan?.services?.db;
  const api = plan?.services?.api;
  if (plan?.name !== project || !db || !api
      || !/^postgres:17@sha256:[a-f0-9]{64}$/.test(db.image ?? '')
      || api.image !== (environment.API_IMAGE_REF || 'egov-enterprise-api:local')) throw failure();
  for (const service of [db, api]) {
    if (service.entrypoint != null || service.command != null || service.network_mode
        || Object.keys(service.networks ?? {}).join(',') !== 'egov-net'
        || ['env_file', 'extra_hosts', 'dns', 'links', 'external_links', 'configs', 'secrets', 'volumes_from']
          .some(key => Object.keys(service[key] ?? {}).length > 0)) throw failure();
  }
  if (Object.keys(db.depends_on ?? {}).length || Object.keys(api.depends_on ?? {}).some(key => key !== 'db')) throw failure();
  for (const [service, source, target, name] of [
    [db, 'postgres_data', '/var/lib/postgresql/data', `${project}-database`],
    [api, 'attachment_storage', '/app/storage', `${project}-attachments`],
  ]) {
    const mounts = service.volumes;
    const volume = plan.volumes?.[source];
    if (!Array.isArray(mounts) || mounts.length !== 1 || mounts[0].type !== 'volume'
        || mounts[0].source !== source || mounts[0].target !== target
        || !volume || volume.name !== name || volume.external
        || (volume.driver && volume.driver !== 'local') || Object.keys(volume.driver_opts ?? {}).length) throw failure();
  }
  const network = plan.networks?.['egov-net'];
  if (!network || network.name !== `${project}_egov-net` || network.external
      || network.driver !== 'bridge' || Object.keys(network.driver_opts ?? {}).length
      || (network.ipam?.driver && network.ipam.driver !== 'default')) throw failure();
  assertIsolatedDatasource(db.environment ?? {}, mergedImageEnvironment(apiImage, api.environment ?? {}), {
    // Compose launcher/host overrides are forbidden above; inspect the image defaults before startup.
    Config: apiImage.Config, HostConfig: { ExtraHosts: [] },
  });
  return true;
}

export function assertLoopbackUrl(value, pathname) {
  let url;
  try { url = new URL(value); } catch { throw failure(); }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port
      || url.username || url.password || url.search || url.hash || url.pathname !== pathname) throw failure();
  return url;
}

/** A manifest alone is never authorization: its live owner must attest the runtime below. */
export function validateIsolationManifest(manifest, environment, now = Date.now()) {
  if (!manifest || manifest.version !== 1 || !RUN_ID.test(manifest.runId)
      || !/^[a-f0-9]{64}$/.test(manifest.token) || !/^[a-f0-9]{64}$/.test(manifest.databaseId)
      || !Number.isFinite(manifest.createdAt) || manifest.createdAt > now
      || now - manifest.createdAt > 6 * 60 * 60 * 1000) throw failure();
  assertLoopbackUrl(manifest.apiUrl, '/api/v1');
  assertLoopbackUrl(manifest.webUrl, '/');
  assertLoopbackUrl(manifest.controlUrl, '/verify');
  if (environment.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') !== manifest.apiUrl
      || environment.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, '') !== manifest.webUrl.replace(/\/$/, '')) throw failure();
  return manifest;
}

/** Check immutable identity and fresh tmpfs storage, not only a reusable container name. */
export function assertOwnedDatabase(container, manifest) {
  const labels = container?.Config?.Labels ?? {};
  const environment = container?.Config?.Env ?? [];
  const bindings = container?.NetworkSettings?.Ports?.['5432/tcp'];
  const createdAt = Date.parse(container?.Created);
  if (container?.Id !== manifest.databaseId || !container?.State?.Running
      || labels['egov.task'] !== 'isolated-e2e' || labels['egov.e2e.run'] !== manifest.runId
      || !Number.isFinite(createdAt) || createdAt < manifest.createdAt - 2000
      || !environment.includes('POSTGRES_DB=authz_e2e')
      || !environment.includes('POSTGRES_USER=egov')
      || !Array.isArray(bindings) || bindings.length !== 1 || bindings[0].HostIp !== '127.0.0.1'
      || !/^\d+$/.test(bindings[0].HostPort)
      || !container?.HostConfig?.Tmpfs?.['/var/lib/postgresql/data']
      || (container.Mounts ?? []).some(mount => mount.Type !== 'tmpfs')) throw failure();
  return bindings[0].HostPort;
}

export function assertOwnedComposeRuntime(database, api, volume, network, environment, now = Date.now()) {
  const project = assertCiProject(environment);
  for (const [container, service] of [[database, 'db'], [api, 'api']]) {
    const createdAt = Date.parse(container?.Created);
    if (!container?.State?.Running || container?.Config?.Labels?.['com.docker.compose.project'] !== project
        || container.Config.Labels['com.docker.compose.service'] !== service
        || !Number.isFinite(createdAt) || createdAt > now || now - createdAt > 6 * 60 * 60 * 1000) throw failure();
  }
  const toEnvironment = container => Object.fromEntries(container.Config.Env.map(value => {
    const index = value.indexOf('='); return [value.slice(0, index), value.slice(index + 1)];
  }));
  const dbEnv = toEnvironment(database);
  const apiEnv = toEnvironment(api);
  assertIsolatedDatasource(dbEnv, apiEnv, api);
  const databaseMounts = database.Mounts ?? [];
  if (databaseMounts.length !== 1 || databaseMounts[0].Type !== 'volume'
      || databaseMounts[0].Destination !== '/var/lib/postgresql/data'
      || databaseMounts[0].Name !== `${project}-database`
      || volume?.Name !== `${project}-database` || volume?.Labels?.['com.docker.compose.project'] !== project
      || volume?.Driver !== 'local' || volume?.Scope !== 'local' || Object.keys(volume?.Options ?? {}).length !== 0
      || !Number.isFinite(Date.parse(volume.CreatedAt)) || Date.parse(volume.CreatedAt) > now
      || now - Date.parse(volume.CreatedAt) > 6 * 60 * 60 * 1000
      || network?.Labels?.['com.docker.compose.project'] !== project) throw failure();
  for (const container of [database, api]) {
    const connections = Object.values(container.NetworkSettings.Networks ?? {});
    if (connections.length !== 1 || connections[0].NetworkID !== network.Id) throw failure();
  }
  if (!database.NetworkSettings.Networks[network.Name]?.Aliases?.includes('db')) throw failure();
  const bindings = api.NetworkSettings.Ports?.['8080/tcp'];
  if (!bindings?.some(binding => ['127.0.0.1', '0.0.0.0'].includes(binding.HostIp) && binding.HostPort === '8080')) throw failure();
  if (!apiEnv.JWT_SECRET) throw failure();
  return { databaseId: database.Id, apiId: api.Id, jwtSecret: apiEnv.JWT_SECRET };
}

export async function assertIsolatedTarget(environment = process.env) {
  let manifest;
  try {
    if (!environment.E2E_ISOLATION_MANIFEST) throw failure();
    manifest = validateIsolationManifest(JSON.parse(readFileSync(environment.E2E_ISOLATION_MANIFEST, 'utf8')), environment);
    const response = await fetch(manifest.controlUrl, {
      method: 'POST', headers: { Authorization: `Bearer ${manifest.token}` },
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    const attestation = await response.json();
    if (!response.ok || attestation.runId !== manifest.runId || attestation.databaseId !== manifest.databaseId
        || attestation.ready !== true) throw failure();
  } catch { throw failure(); }
  return manifest;
}
