#!/usr/bin/env node
/**
 * CHECK 번역의 차등 시험(ADR-0047 결정 6). 문장이 성공했다고 같은 값을 받는 것은 아니다.
 * 모든 CHECK 를 작은 시험 표로 옮겨 같은 값을 PostgreSQL 과 벤더에 넣고, 받아들인 값이 같은지 본다.
 *
 * 사용: node scripts/project-composer-vendor-differential.mjs --input <입력 JSON> --vendor <id> --container <기준 PostgreSQL> --user <사용자> --database <임시 DB>
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { buildVendorModel, columnsIn, gap } from './project-composer-vendor-model.mjs';
import { VENDOR_ADAPTERS } from './project-composer-vendors.mjs';
import { runStatements, startVendorEngine, stopVendorEngine } from './project-composer-vendor-engine.mjs';

/** 정규식마다 맞는 값과 틀린 값. 맞는 값 뒤의 줄바꿈은 항상 시험한다(`$` 함정). */
const REGEX_SAMPLES = Object.freeze({
  '^[0-9a-f]{64}$': ['a'.repeat(64), 'A'.repeat(64), 'a'.repeat(63), 'g'.repeat(64)],
  '^[1-9][0-9]{0,18}$': ['1', '1234567890123456789', '0', '01', '12a', '12345678901234567890'],
  '^[0-9]{8}$': ['20261030', '2026103', '2026103a', '202610300'],
  '^[0-9]{1,11}$': ['1', '01234567890', '012345678901', '1a'],
  '^[a-z0-9]+(-[a-z0-9]+)*$': ['a-b', 'abc', 'a--b', '-a', 'a-', 'A', 'a_b'],
  '^([01][0-9]|2[0-3])[0-5][0-9][0-5][0-9]$': ['235959', '000000', '240000', '196000', '12000', '12000a'],
});
const TIMESTAMP = '2026-10-30T00:00:00';
const shiftSeconds = seconds => new Date(Date.parse(`${TIMESTAMP}Z`) + seconds * 1000).toISOString().slice(0, 19);
const MAX_ROWS = 48;

function collectValues(node, columns, values) {
  const add = (name, ...items) => { if (name) values.get(name)?.push(...items); };
  const nameOf = item => (item?.op === 'column' ? item.name : item?.arg?.op === 'column' ? item.arg.name : item?.arg?.name);
  switch (node.op) {
    case 'in': add(nameOf(node), ...node.values, ...node.values.slice(0, 2).flatMap(value => [`${value} `, value.toLowerCase(), `${value}\n`]), 'zz'); break;
    case 'regex': {
      const samples = REGEX_SAMPLES[node.pattern] ?? gap(`시험값이 없는 정규식: ${node.pattern}`);
      add(nameOf(node), ...samples, `${samples[0]}\n`, '');
      break;
    }
    case 'compare': {
      const name = nameOf(node.left);
      const column = columns.find(item => item.name === name);
      if (node.right.op === 'string') add(name, node.right.value, `${node.right.value}x`, ' ', '');
      if (node.right.op === 'number') {
        if (['bigint', 'integer', 'numeric'].includes(column?.type.kind)) add(name, node.right.value - 1, node.right.value, node.right.value + 1);
        else add(name, 'a'.repeat(Math.max(0, node.right.value)), 'a'.repeat(node.right.value + 1));
      }
      if (node.right.op === 'trim' || node.left.op === 'trim') add(nameOf(node.right) ?? name, 'ab', ' ab', 'ab ', ' ', '');
      if (node.right.op === 'column') add(name, ...sampleByType(column));
      if (node.right.op === 'addSeconds') {
        add(name, ...[-1, 0, 1, 299, 300, 301].map(shiftSeconds));
        add(node.right.arg.name, TIMESTAMP);
      }
      if (node.left.op === 'jsonType') add(name, '{"a":1}', '[1,2]', '1', '{}');
      break;
    }
    default: break;
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(item => { if (item?.op) collectValues(item, columns, values); });
    else if (value?.op) collectValues(value, columns, values);
  }
}

function sampleByType(column) {
  switch (column.type.kind) {
    case 'bigint': case 'integer': case 'numeric': return [0, 1, 2];
    case 'timestamp': return [TIMESTAMP, shiftSeconds(1)];
    case 'date': return ['2026-10-30'];
    case 'json': return ['{"a":1}'];
    case 'uuid': return ['00000000-0000-0000-0000-000000000001'];
    default: return ['a', 'b'];
  }
}

/** 한 칸씩 바꾼 행. 나머지 칸은 앞의 값을 쓴다. 두 칸짜리 조건은 곱집합까지 본다. */
export function probeRows(check, table) {
  const names = [...columnsIn(check.expression)];
  const columns = names.map(name => table.columns.find(column => column.name === name));
  const values = new Map(names.map(name => [name, []]));
  collectValues(check.expression, table.columns, values);
  for (const column of columns) {
    const list = values.get(column.name);
    if (!list.length) list.push(...sampleByType(column));
    if (column.nullable) list.push(null);
  }
  const distinct = name => [...new Set(values.get(name))];
  const rows = [];
  if (names.length === 2) {
    for (const left of distinct(names[0])) for (const right of distinct(names[1])) rows.push({ [names[0]]: left, [names[1]]: right });
  } else {
    const base = Object.fromEntries(names.map(name => [name, distinct(name)[0]]));
    rows.push(base);
    for (const name of names) for (const value of distinct(name)) rows.push({ ...base, [name]: value });
  }
  return rows.slice(0, MAX_ROWS);
}

/** 벤더 고유 차이로 비교할 수 없는 값. 없앨 수 없는 한계는 저하 목록에 이미 있다(설계서 §6.1). */
const comparable = {
  oracle: row => !Object.values(row).includes(''),
  mssql: row => !Object.values(row).some(value => typeof value === 'string' && / $/.test(value)),
};

const probeTableName = index => `zz_probe_${index}`;

/** 시험 표는 값이 잘려 판정이 가려지지 않게 문자열 칸을 넓힌다. */
function probeModel(model) {
  const tables = [];
  for (const table of model.tables) {
    for (const check of table.checks) {
      const names = columnsIn(check.expression);
      tables.push({
        name: probeTableName(tables.length), comment: null, source: table.name,
        columns: [{ name: 'probe_id', type: { kind: 'integer' }, nullable: false, identity: false, default: null, comment: null },
          ...table.columns.filter(column => names.has(column.name)).map(column => ({ ...column, identity: false, default: null, comment: null,
            type: column.type.kind === 'varchar' ? { ...column.type, length: Math.min(column.type.length + 2, 2000) } : column.type }))],
        primaryKey: { name: `pk_zz_probe_${tables.length}`, columns: ['probe_id'] },
        uniques: [], foreignKeys: [], indexes: [], triggers: [], checks: [check], definition: check.name,
      });
    }
  }
  return { schemaVersion: 1, tables, sequences: [] };
}

function postgresLiteral(value) {
  if (value === null) return 'NULL';
  return typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
}

const pgType = column => ({ varchar: `varchar(${column.type.length})`, text: 'text', json: 'jsonb', uuid: 'uuid', binary: 'bytea',
  timestamp: 'timestamp', date: 'date', bigint: 'bigint', integer: 'integer', numeric: column.type.precision ? `numeric(${column.type.precision},${column.type.scale ?? 0})` : 'numeric' }[column.type.kind]);

/** 기준 판정은 원본 CHECK 문장을 그대로 쓴 PostgreSQL 이다. */
function postgresAccepts({ container, user, database }, probes, definitions) {
  const statements = probes.tables.flatMap(table => {
    const columns = table.columns.map(column => `"${column.name}" ${pgType(column)}${column.nullable ? '' : ' NOT NULL'}`).join(', ');
    return [`CREATE TABLE ${table.name} (${columns}, PRIMARY KEY (probe_id));`, `ALTER TABLE ${table.name} ADD ${definitions.get(table.checks[0].name)};`];
  });
  const psql = script => spawnSync('docker', ['exec', '-i', container, 'psql', '-U', user, '-d', database, '-X', '-q', '-A', '-t'], { input: script, encoding: 'utf8', maxBuffer: 1 << 29 });
  const insertions = probes.tables.flatMap(table => table.rows.map((row, index) => {
    const names = Object.keys(row);
    return `INSERT INTO ${table.name} (probe_id, ${names.map(name => `"${name}"`).join(', ')}) VALUES (${index}, ${names.map(name => postgresLiteral(row[name])).join(', ')});`;
  }));
  const applied = psql([...statements, ...insertions].join('\n'));
  const broken = `${applied.stderr}`.split(/\r?\n/).filter(line => /ERROR:\s+(relation|syntax|column|type)/.test(line));
  if (broken.length) gap(`PostgreSQL 기준 실행 실패: ${broken[0]}`);
  // 받아들인 행을 다시 읽는다. 거부는 행이 없다는 사실로 판정한다.
  const stored = psql(`${probes.tables.map(table => `SELECT '${table.name}:' || probe_id FROM ${table.name};`).join('\n')}\n`);
  return new Set(stored.stdout.split(/\r?\n/).filter(Boolean));
}

function vendorAccepts(handle, adapter, probes) {
  const insertions = probes.tables.flatMap(table => table.rows.map((row, index) => {
    const names = Object.keys(row);
    const columns = names.map(name => table.columns.find(column => column.name === name));
    return { key: `${table.name}:${index}`, sql: `INSERT INTO ${table.name} (probe_id, ${names.map(adapter.identifier).join(', ')}) VALUES (${index}, ${columns.map(column => adapter.literal(column, row[column.name])).join(', ')})` };
  }));
  const { errors } = runStatements(handle, insertions);
  const rejected = new Set(errors.map(item => insertions[item.index].key));
  return new Set(insertions.map(item => item.key).filter(key => !rejected.has(key)));
}

export function runDifferential({ input, vendorId, engineId, postgres }) {
  const model = buildVendorModel({ snapshot: input.snapshot, extras: input.extras });
  const adapter = VENDOR_ADAPTERS[vendorId];
  const definitions = new Map(input.snapshot.constraints.filter(row => row.type === 'c').map(row => [row.name, row.definition]));
  const probes = probeModel(model);
  for (const table of probes.tables) {
    const source = model.tables.find(item => item.name === table.source);
    table.rows = probeRows(table.checks[0], source).filter(row => (comparable[vendorId] ?? (() => true))(row));
  }
  const baseline = postgresAccepts(postgres, probes, definitions);
  const emission = adapter.emitSchema(probes);
  const handle = startVendorEngine(engineId ?? vendorId);
  try {
    const schema = runStatements(handle, emission.statements);
    if (schema.errors.length) gap(`시험 표 적용 실패 ${schema.errors.length}건: ${schema.errors[0].error} :: ${schema.errors[0].statement}`);
    const actual = vendorAccepts(handle, adapter, probes);
    const differences = [];
    for (const table of probes.tables) {
      table.rows.forEach((row, index) => {
        const key = `${table.name}:${index}`;
        if (baseline.has(key) !== actual.has(key)) differences.push({ check: table.definition, row, postgresql: baseline.has(key), vendor: actual.has(key) });
      });
    }
    const rows = probes.tables.reduce((sum, table) => sum + table.rows.length, 0);
    return { vendor: vendorId, engine: engineId ?? vendorId, checks: probes.tables.length, rows, accepted: baseline.size, rejected: rows - baseline.size, differences };
  } finally {
    stopVendorEngine(handle);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = {};
  for (let index = 2; index < process.argv.length; index += 2) args[process.argv[index].replace(/^--/, '')] = process.argv[index + 1];
  const result = runDifferential({ input: JSON.parse(readFileSync(args.input, 'utf8')), vendorId: args.vendor, engineId: args.engine,
    postgres: { container: args.container, user: args.user, database: args.database } });
  if (args.report) writeFileSync(args.report, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`[vendor-differential] ${result.engine}: CHECK ${result.checks}, 값 ${result.rows}(기준 허용 ${result.accepted}, 거부 ${result.rejected}), 불일치 ${result.differences.length}`);
  for (const item of result.differences.slice(0, 12)) console.log(`  ${item.check} ${JSON.stringify(item.row).slice(0, 110)} pg=${item.postgresql} vendor=${item.vendor}`);
  if (result.differences.length) process.exitCode = 1;
}
