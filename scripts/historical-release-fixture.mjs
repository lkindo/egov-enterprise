/** Fixed historical inputs for the existing isolated release smoke, never a deployment adapter. */
import { createHash } from 'node:crypto';
import { selectProductionBuildInputPaths } from '../frontend/scripts/ui-quality-baseline-core.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = () => new Error('Isolated release smoke: historical release identity mismatch.');
const HISTORICAL_BACKEND_DOCKERFILE_SHA256 = 'f40d77e283456f88b5e30b75ab4b11f3e21d26a7f9fdcbb0bd805e0528c4fcd3';
export const HISTORICAL_RELEASE = Object.freeze({
  tag: 'v0.1.0', revision: 'fa2a79386734671b90166e33ec355e4784715773',
  sourceFiles: 1391, sourceTreeSha256: 'cd71c2d46cfbbad4b9ead4b35012da2ffdde6f8067e793f1c5020124c1de0117',
  migrationFiles: 88, migrationManifestSha256: '7395117ead91d090eba43a22a1aa36eadf6092070a69570ed41189cff4ad6d81',
  apiDockerfileSha256: HISTORICAL_BACKEND_DOCKERFILE_SHA256,
  frontendDockerfileSha256: 'e0fc4d6b5378e13835949aa802965f2790af7b959cea46182422de712163920b',
});
export const HISTORICAL_API_ENTRYPOINT = Object.freeze(['sh', '-c', 'java $JAVA_OPTS -jar app.jar']);
export const HISTORICAL_FRONTEND_COMMAND = Object.freeze(['sh', '-c', 'exec node_modules/.bin/next start']);
export const HISTORICAL_ARCHIVE_GIT_OPTIONS = Object.freeze(['-c', 'core.autocrlf=false', '-c', 'core.eol=lf']);
const SQL_PREFIX = 'api-server/src/main/resources/db/migration/';

export function captureHistoricalRelease(root, run) {
  if (run('git', ['rev-parse', `${HISTORICAL_RELEASE.tag}^{commit}`], { cwd: root }) !== HISTORICAL_RELEASE.revision) throw fail();
  const rows = run('git', ['ls-tree', '-r', '-z', HISTORICAL_RELEASE.revision], { cwd: root }).split('\0').filter(Boolean).map(row => {
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t([^\0]+)$/u.exec(row);
    if (!match) throw fail();
    return { path: match[3], object: match[2] };
  });
  const selected = selectProductionBuildInputPaths(rows.map(row => row.path));
  if (selected.length !== HISTORICAL_RELEASE.sourceFiles) throw fail();
  const objects = new Map(rows.map(row => [row.path, row.object]));
  const bytes = run('git', ['cat-file', '--batch'], { cwd: root, binary: true,
    input: selected.map(file => objects.get(file)).join('\n') + '\n', maxBuffer: 256 * 1024 * 1024 });
  let offset = 0;
  const hashes = selected.map(file => {
    const end = bytes.indexOf(10, offset);
    const header = /^([a-f0-9]{40}) blob (\d+)$/u.exec(bytes.subarray(offset, end).toString('ascii'));
    if (end < offset || !header || header[1] !== objects.get(file)) throw fail();
    const size = Number(header[2]); offset = end + 1;
    if (!Number.isSafeInteger(size) || size < 0 || offset + size >= bytes.length || bytes[offset + size] !== 10) throw fail();
    const sha256 = digest(bytes.subarray(offset, offset + size)); offset += size + 1;
    return { path: file, sha256 };
  });
  if (offset !== bytes.length) throw fail();
  const migrations = hashes.filter(row => row.path.startsWith(SQL_PREFIX) && row.path.endsWith('.sql'));
  const sourceTreeSha256 = digest(hashes.map(row => `${row.path}:${row.sha256}`).join('\n'));
  if (sourceTreeSha256 !== HISTORICAL_RELEASE.sourceTreeSha256
      || hashes.find(row => row.path === 'api-server/Dockerfile')?.sha256 !== HISTORICAL_RELEASE.apiDockerfileSha256
      || hashes.find(row => row.path === 'frontend/Dockerfile')?.sha256 !== HISTORICAL_RELEASE.frontendDockerfileSha256) throw fail();
  validateHistoricalMigrations(migrations);
  return { ...HISTORICAL_RELEASE, dirty: false, migrations };
}

export function validateHistoricalMigrations(rows) {
  if (!Array.isArray(rows) || rows.length !== HISTORICAL_RELEASE.migrationFiles
      || rows.some(row => !row || !/^api-server\/src\/main\/resources\/db\/migration\/(?:V[\d_]+__[A-Za-z0-9_]+|R__[A-Za-z0-9_]+)\.sql$/u.test(row.path)
        || !/^[a-f0-9]{64}$/u.test(row.sha256)) || new Set(rows.map(row => row.path)).size !== rows.length) throw fail();
  const sorted = [...rows].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  if (digest(sorted.map(row => `${row.path}:${row.sha256}`).join('\n')) !== HISTORICAL_RELEASE.migrationManifestSha256) throw fail();
  return rows;
}

// pg_dump/restore reparses this complete CHECK as element casts, with identical varchar literals.
// No expression, bounded type, collation, escaped-string syntax or alternate parentheses is accepted.
const VARCHAR_ARRAY_CHECK = /^(CHECK \(\(\([a-z_][a-z0-9_]*\)::text = ANY \()\(ARRAY\[((?:'(?:[^'\\\r\n\0]|'')*'::character varying)(?:, '(?:[^'\\\r\n\0]|'')*'::character varying)*)\]\)::text\[\](\)\)\)(?: NOT VALID)?)$/u;
const VARCHAR_LITERAL = /'(?:[^'\\\r\n\0]|'')*'::character varying/gu;
function canonicalHistoricalConstraint(definition) {
  const match = VARCHAR_ARRAY_CHECK.exec(definition);
  if (!match) return definition;
  return `${match[1]}ARRAY[${match[2].match(VARCHAR_LITERAL).map(literal => `(${literal})::text`).join(', ')}]${match[3]}`;
}

/** Every named definition remains exact except the observed one-way CHECK array-cast rewrite. */
export function compareHistoricalConstraints(originalMap, restoredMap) {
  for (const map of [originalMap, restoredMap]) {
    if (!map || Array.isArray(map) || ![Object.prototype, null].includes(Object.getPrototypeOf(map))
        || Object.keys(map).length === 0 || Object.entries(map).some(([key, value]) => !key || typeof value !== 'string' || !value)) {
      throw new Error('Isolated release smoke: historical constraint metadata invalid.');
    }
  }
  const keys = [...new Set([...Object.keys(originalMap), ...Object.keys(restoredMap)])].sort();
  const differences = []; let normalizedCount = 0;
  for (const key of keys) {
    const before = Object.hasOwn(originalMap, key) ? originalMap[key] : undefined;
    const restored = Object.hasOwn(restoredMap, key) ? restoredMap[key] : undefined;
    if (before === restored) continue;
    if (typeof before === 'string' && canonicalHistoricalConstraint(before) === restored) normalizedCount += 1;
    else differences.push({ key, before, restored });
  }
  return { differences, canonicalSha256: digest(JSON.stringify(Object.keys(originalMap).sort()
    .map(key => [key, canonicalHistoricalConstraint(originalMap[key])]))), normalizedCount };
}

// pg_dump recreates visible columns densely; dropped physical attnum slots are not dumped.
// Preserve each visible column's relative order and every other metadata field exactly.
function canonicalHistoricalColumns(rows) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.some(row => !Array.isArray(row) || row.length !== 25
      || typeof row[0] !== 'string' || !row[0] || typeof row[1] !== 'string' || !row[1]
      || !Number.isSafeInteger(row[2]) || row[2] < 1
      || row.slice(3).some(value => value !== null && typeof value !== 'string' && !(typeof value === 'number' && Number.isFinite(value))))) {
    throw new Error('Isolated release smoke: historical column metadata invalid.');
  }
  const sorted = [...rows].sort((left, right) => left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : left[2] - right[2]);
  const names = new Set(); const slots = new Set(); let table; let position = 0;
  return sorted.map(row => {
    const key = `${row[0]}:${row[1]}`; const slot = `${row[0]}:${row[2]}`;
    if (names.has(key) || slots.has(slot)) throw new Error('Isolated release smoke: historical column metadata invalid.');
    names.add(key); slots.add(slot);
    if (table !== row[0]) { table = row[0]; position = 0; }
    return [row[0], row[1], ++position, ...row.slice(3)];
  });
}

export function compareHistoricalColumns(originalRows, restoredRows) {
  const beforeRows = canonicalHistoricalColumns(originalRows); const afterRows = canonicalHistoricalColumns(restoredRows);
  const keyed = rows => new Map(rows.map(row => [`${row[0]}:${row[1]}`, row]));
  const before = keyed(beforeRows); const after = keyed(afterRows); const physicalBefore = keyed(originalRows); const physicalAfter = keyed(restoredRows);
  const differences = []; let normalizedOrdinalCount = 0;
  for (const key of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    if (JSON.stringify(before.get(key)) !== JSON.stringify(after.get(key))) differences.push({ key, before: before.get(key), restored: after.get(key) });
    else if (physicalBefore.get(key)[2] !== physicalAfter.get(key)[2]) normalizedOrdinalCount += 1;
  }
  return { differences, canonicalSha256: digest(JSON.stringify(beforeRows)), normalizedOrdinalCount, columnsCompared: beforeRows.length };
}

export function validateHistoricalImages(images) {
  for (const role of ['api', 'frontend']) {
    const image = images?.[role];
    const config = image?.Config;
    if (!/^sha256:[a-f0-9]{64}$/u.test(image?.Id ?? '')
      || config?.Labels?.['org.opencontainers.image.revision'] !== HISTORICAL_RELEASE.revision
      || config.Labels['io.egov.ui-quality.build-input-tree-sha256'] !== HISTORICAL_RELEASE.sourceTreeSha256) throw fail();
    const environment = Object.create(null);
    for (const entry of config.Env ?? []) {
      const index = entry.indexOf('='); const name = entry.slice(0, index);
      if (index < 1 || !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name) || Object.hasOwn(environment, name)) throw fail();
      environment[name] = entry.slice(index + 1);
    }
    if (Object.entries(environment).some(([key, value]) => value && /^(?:SPRING_|DB_|JWT_SECRET$|ALGORITHM_KEY$|ADMIN_INITIAL_PASSWORD$|NODE_OPTIONS$|JAVA_TOOL_OPTIONS$|JDK_JAVA_OPTIONS$|_JAVA_OPTIONS$|LD_)/u.test(key))) throw fail();
    if (environment.JAVA_OPTS?.split(/\s+/u).some(option => !/^(?:-Xm[sx][1-9]\d*[kKmMgG]|-Xss[1-9]\d*[kKmMgG]|-XX:\+UseParallelGC)$/u.test(option))) throw fail();
    if (role === 'api' ? JSON.stringify(config.Entrypoint) !== JSON.stringify(HISTORICAL_API_ENTRYPOINT)
        || (config.Cmd?.length ?? 0) !== 0 || config.User !== 'spring:spring'
      : JSON.stringify(config.Cmd) !== JSON.stringify(HISTORICAL_FRONTEND_COMMAND)
        || config.User !== 'nextjs' || environment.NODE_ENV !== 'production' || environment.NEXT_TELEMETRY_DISABLED !== '1') throw fail();
  }
}

/** The pre-upgrade backup is the only permitted rollback input. Failures never write success evidence. */
export async function runHistoricalSmokeStages(operations) {
  let complete = false;
  try {
    for (const stage of ['prepare', 'historical', 'fixture', 'backupBeforeUpgrade', 'upgrade', 'verifyUpgraded', 'rollback', 'verifyRollback']) await operations[stage]();
    complete = true;
  } finally { await operations.cleanup(); }
  if (complete) await operations.evidence();
}
