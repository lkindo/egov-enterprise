import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { schemaSnapshotHash } from './project-composer-db.mjs';
import {
  MIGRATION_CATALOG, exportProjectedColumnCatalog, installProjectedColumnCatalog,
  parseColumnCatalog, projectedColumnCatalog, renderColumnCatalog,
} from './reusable-migration-catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const column = (table_name, ordinal_position, column_name) => ({ table_name, ordinal_position, column_name });

test('the renderer writes the origin catalog byte for byte (same format as the Java schema validation)', () => {
  const origin = readFileSync(join(root, MIGRATION_CATALOG), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(renderColumnCatalog(parseColumnCatalog(origin)), origin);
  assert.ok(parseColumnCatalog(origin).has('flyway_schema_history'));
});

test('the projected catalog keeps the origin Flyway history table and orders tables and columns like the Java renderer', () => {
  const origin = renderColumnCatalog(new Map([
    ['flyway_schema_history', ['installed_rank', 'version']],
    ['tb_gone', ['a']],
  ]));
  const schema = { columns: [column('tb_b', 2, 'y'), column('tb_a', 1, 'id'), column('tb_b', 1, 'x'), column('Tb_upper', 1, 'u')] };
  const projected = parseColumnCatalog(projectedColumnCatalog(origin, schema));
  // 표 이름은 코드 단위 순(대문자가 먼저), 표 안은 컬럼 순번 순이다. 구성에서 빠진 표(tb_gone)는 원본에 있어도 싣지 않는다.
  assert.deepEqual([...projected.keys()], ['Tb_upper', 'flyway_schema_history', 'tb_a', 'tb_b']);
  assert.deepEqual(projected.get('tb_b'), ['x', 'y']);
  assert.deepEqual(projected.get('flyway_schema_history'), ['installed_rank', 'version']);
  assert.equal(projected.has('tb_gone'), false);

  assert.throws(() => projectedColumnCatalog(renderColumnCatalog(new Map([['tb_a', ['id']]])), schema), /flyway_schema_history 가 없다/);
  assert.throws(() => projectedColumnCatalog(origin, { columns: [] }), /컬럼이 없다/);
  assert.throws(() => projectedColumnCatalog(origin, { columns: [column('flyway_schema_history', 1, 'x')] }), /원본에서 가져온다/);
  assert.throws(() => parseColumnCatalog('[]'), /비어 있지 않은 배열/);
  assert.throws(() => parseColumnCatalog('[{"table_name":"t"}]'), /항목 형식/);
});

test('the generator rewrites the artifact catalog only from the bundle schema bound to the DB lock', t => {
  const dir = mkdtempSync(join(tmpdir(), 'migration-catalog-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const origin = renderColumnCatalog(new Map([['flyway_schema_history', ['installed_rank']], ['tb_gone', ['a']]]));
  const [sourceRoot, output, bundle] = ['source', 'output', 'bundle'].map(name => join(dir, name));
  for (const path of [sourceRoot, output, bundle]) mkdirSync(path);
  writeFileSync(join(sourceRoot, MIGRATION_CATALOG), origin);
  writeFileSync(join(output, MIGRATION_CATALOG), origin);
  const snapshot = { columns: [column('tb_a', 1, 'id')] };
  writeFileSync(join(bundle, 'schema-contract.json'), JSON.stringify({ snapshot }));
  const lock = { schemaSnapshotHash: schemaSnapshotHash(snapshot) };
  assert.deepEqual(installProjectedColumnCatalog(sourceRoot, output, bundle, lock), { tables: 2 });
  assert.deepEqual([...parseColumnCatalog(readFileSync(join(output, MIGRATION_CATALOG), 'utf8')).keys()], ['flyway_schema_history', 'tb_a']);
  // lock 이 검증한 스키마가 아니면 쓰지 않는다.
  assert.throws(() => installProjectedColumnCatalog(sourceRoot, output, bundle, { schemaSnapshotHash: 'other' }), /스키마 해시와 다르다/);
});

test('exportProjectedColumnCatalog writes an external catalog from a validated DB bundle and rejects generated app trees', t => {
  const dir = mkdtempSync(join(tmpdir(), 'migration-catalog-export-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const origin = renderColumnCatalog(new Map([['flyway_schema_history', ['installed_rank']], ['tb_gone', ['a']]]));
  const [sourceRoot, bundle, appRoot, outside] = ['source', 'bundle', 'generated-app', 'outside'].map(name => join(dir, name));
  for (const target of [sourceRoot, bundle, appRoot, outside]) mkdirSync(target, { recursive: true });
  writeFileSync(join(sourceRoot, MIGRATION_CATALOG), origin);
  const snapshot = { columns: [column('tb_a', 1, 'id')] };
  const schemaHash = schemaSnapshotHash(snapshot);
  writeFileSync(join(bundle, 'schema-contract.json'), JSON.stringify({ snapshot }));
  writeFileSync(join(bundle, 'profile-lock.json'), JSON.stringify({ validated: false, schemaSnapshotHash: schemaHash }));
  assert.throws(() => exportProjectedColumnCatalog({ sourceRoot, dbBundle: bundle, outputFile: join(outside, MIGRATION_CATALOG) }), /validated: true/);

  writeFileSync(join(bundle, 'profile-lock.json'), JSON.stringify({ validated: true, schemaSnapshotHash: 'mismatch' }));
  assert.throws(() => exportProjectedColumnCatalog({ sourceRoot, dbBundle: bundle, outputFile: join(outside, MIGRATION_CATALOG) }), /스키마 해시와 다르다/);

  writeFileSync(join(bundle, 'profile-lock.json'), JSON.stringify({ validated: true, schemaSnapshotHash: schemaHash }));
  writeFileSync(join(appRoot, 'reusable-base-lock.json'), JSON.stringify({ profile: 'core', migrationTool: false }));
  assert.throws(() => exportProjectedColumnCatalog({ sourceRoot, dbBundle: bundle, outputFile: join(appRoot, 'sub/db_columns.json') }), /ADR-0062/);
  assert.throws(() => exportProjectedColumnCatalog({ sourceRoot, dbBundle: bundle, outputFile: join(sourceRoot, MIGRATION_CATALOG) }), /원본 저장소/);
  if (process.platform === 'win32' || process.platform === 'darwin') {
    assert.throws(() => exportProjectedColumnCatalog({ sourceRoot, dbBundle: bundle, outputFile: join(sourceRoot, MIGRATION_CATALOG.toUpperCase()) }), /원본 저장소/);
  }

  const exportedPath = join(outside, 'core-db_columns.json');
  const result = exportProjectedColumnCatalog({ sourceRoot, dbBundle: bundle, outputFile: exportedPath });
  assert.equal(result.tables, 2);
  assert.deepEqual([...parseColumnCatalog(readFileSync(exportedPath, 'utf8')).keys()], ['flyway_schema_history', 'tb_a']);

  const cliOutput = join(outside, 'cli-db_columns.json');
  const cli = spawnSync(process.execPath, [resolve(dirname(fileURLToPath(import.meta.url)), 'reusable-migration-catalog.mjs'),
    '--db-bundle', bundle, '--output', cliOutput], { cwd: resolve(root), encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual([...parseColumnCatalog(readFileSync(cliOutput, 'utf8')).keys()], ['flyway_schema_history', 'tb_a']);
});
