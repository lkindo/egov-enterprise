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
import { expandIff } from './project-composer-vendor-sql.mjs';
import { VENDOR_ADAPTERS } from './project-composer-vendors.mjs';
import { parseCount, runStatements, startVendorEngine, stopVendorEngine } from './project-composer-vendor-engine.mjs';

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
const MAX_ROWS = 64;

function collectValues(node, columns, values) {
  const add = (name, ...items) => { if (name) values.get(name)?.push(...items); };
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

const nameOf = item => (item?.op === 'column' ? item.name : item?.arg?.op === 'column' ? item.arg.name : item?.arg?.name);

/**
 * 식을 참으로 만드는 값 묶음. OR 은 가지마다 하나씩 낸다. 여러 칸이 함께 맞아야 통과하는 CHECK 는
 * 한 칸씩 바꿔서는 허용 표본이 나오지 않아, 망가진 번역이 전부 거부해도 드러나지 않는다.
 * hard 는 그 값이어야 하는 칸, soft 는 다른 값이어도 되는 칸이다.
 */
function satisfying(node, table) {
  const hard = (name, value) => [{ hard: { [name]: value }, soft: {} }];
  const soft = (name, value) => [{ hard: {}, soft: { [name]: value } }];
  const columnOf = name => table.columns.find(column => column.name === name);
  const anyValue = name => sampleByType(columnOf(name))[0];
  switch (node.op) {
    case 'or': return node.args.flatMap(item => satisfying(item, table));
    case 'and': {
      let merged = [{ hard: {}, soft: {} }];
      for (const item of node.args) {
        merged = merged.flatMap(left => satisfying(item, table).flatMap(right => {
          const clash = Object.keys(left.hard).some(key => key in right.hard && left.hard[key] !== right.hard[key]);
          return clash ? [] : [{ hard: { ...left.hard, ...right.hard }, soft: { ...left.soft, ...right.soft } }];
        })).slice(0, 8);
      }
      return merged;
    }
    case 'iff': return satisfying(expandIff(node, table), table);
    case 'isNull': return hard(nameOf(node), null);
    case 'isNotNull': return hard(nameOf(node), anyValue(nameOf(node)));
    case 'in': return hard(nameOf(node), node.values[0]);
    case 'regex': return hard(nameOf(node), (REGEX_SAMPLES[node.pattern] ?? gap(`시험값이 없는 정규식: ${node.pattern}`))[0]);
    case 'compare': {
      const name = nameOf(node.left);
      if (node.left.op === 'jsonType') return hard(name, '{"a":1}');
      if (node.left.op === 'octetLength' || node.left.op === 'charLength') return soft(name, 'ab');
      if (node.right.op === 'addSeconds') return hard(name, shiftSeconds(1));
      if (node.right.op === 'trim' || node.left.op === 'trim') return soft(name, 'ab');
      if (node.right.op === 'string') {
        if (node.operator === '=') return hard(name, node.right.value);
        return soft(name, `${node.right.value}x`);
      }
      if (node.right.op === 'number') {
        const value = node.operator === '>' ? node.right.value + 1 : node.operator === '<' ? node.right.value - 1 : node.right.value;
        // 범위의 양 끝은 서로를 만족하므로 고정값이 아니다.
        return soft(name, node.operator === '<>' ? value + 1 : value);
      }
      if (node.right.op === 'column') {
        const [low, high] = sampleByType(columnOf(name));
        const greater = ['>', '>='].includes(node.operator);
        return [{ hard: {}, soft: { [name]: greater ? high : low, [node.right.name]: greater ? low : high } }];
      }
      return gap(`${table.name}: 허용 표본을 만들 수 없는 비교`);
    }
    default: return [{ hard: {}, soft: {} }];
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
  const filler = (assignment, name) => (name in assignment.hard ? assignment.hard[name] : name in assignment.soft ? assignment.soft[name] : distinct(name)[0]);
  const passing = satisfying(check.expression, table).map(assignment => Object.fromEntries(names.map(name => [name, filler(assignment, name)])));
  const rows = [...passing, ...passing.slice(0, 3).flatMap(row => names.flatMap(name => distinct(name).slice(0, 3).map(value => ({ ...row, [name]: value }))))];
  if (names.length === 2) {
    for (const left of distinct(names[0])) for (const right of distinct(names[1])) rows.push({ [names[0]]: left, [names[1]]: right });
  } else {
    const base = Object.fromEntries(names.map(name => [name, distinct(name)[0]]));
    rows.push(base);
    for (const name of names) for (const value of distinct(name)) rows.push({ ...base, [name]: value });
  }
  const seen = new Set();
  return rows.filter(row => { const key = JSON.stringify(row); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, MAX_ROWS);
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
  if (applied.error || applied.status !== 0) gap(`PostgreSQL 기준 실행 실패: ${applied.error?.message ?? applied.stderr.slice(0, 300)}`);
  // 값 때문에 거부된 것만 거부다. 그 밖의 오류는 시험 자체가 깨진 것이다.
  const broken = `${applied.stderr}`.split(/\r?\n/).filter(line => /ERROR:/.test(line)
    && !/violates (check|not-null) constraint|invalid input syntax|invalid input value|value too long|out of range|Token .* is invalid|invalid.*json/i.test(line));
  if (broken.length) gap(`PostgreSQL 기준 실행 실패: ${broken[0]}`);
  // 받아들인 행을 다시 읽는다. 거부는 행이 없다는 사실로 판정한다.
  const stored = psql(`${probes.tables.map(table => `SELECT '${table.name}:' || probe_id FROM ${table.name};`).join('\n')}\n`);
  if (stored.error || stored.status !== 0 || /ERROR:/.test(stored.stderr)) gap(`PostgreSQL 기준 결과를 읽지 못했다: ${stored.stderr.slice(0, 300)}`);
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

const probeColumn = (name, nullable = true) => ({ name, type: { kind: 'integer' }, nullable, identity: false, default: null, comment: null });
const intentTable = (name, columns, triggers) => ({ name, comment: null, columns: [probeColumn('id', false), ...columns.map(column => probeColumn(column))],
  primaryKey: { name: `pk_${name}`, columns: ['id'] }, uniques: [], foreignKeys: [], indexes: [], checks: [], triggers, rows: [] });
const INTENT_TABLES = () => [
  intentTable('zz_sync_probe', ['prcs_tm', 'prcs_req_msec'], [{ name: 'tr_zz_sync', kind: 'sync-pair', legacy: 'prcs_tm', current: 'prcs_req_msec' }]),
  intentTable('zz_ledger_probe', ['val'], [{ name: 'tr_zz_ledger', kind: 'append-only', permit: 'app.audit_retention' }]),
];

/** 번역한 트리거가 원본 함수와 같게 움직이는지 본다. 행은 원본 V2_145·감사 원장 시험과 같은 전이다. */
const INTENT_STEPS = Object.freeze([
  ['INSERT INTO zz_sync_probe (id, prcs_tm) VALUES (1, 5)', true],
  ['INSERT INTO zz_sync_probe (id, prcs_req_msec) VALUES (2, 7)', true],
  ['INSERT INTO zz_sync_probe (id, prcs_tm, prcs_req_msec) VALUES (3, 1, 2)', false],
  ['UPDATE zz_sync_probe SET prcs_tm = 20 WHERE id = 1', true],
  ['SELECT COUNT(*) FROM zz_sync_probe WHERE id = 1 AND prcs_tm = 20 AND prcs_req_msec = 20', 1],
  ['UPDATE zz_sync_probe SET prcs_req_msec = 30 WHERE id = 1', true],
  ['SELECT COUNT(*) FROM zz_sync_probe WHERE id = 1 AND prcs_tm = 30 AND prcs_req_msec = 30', 1],
  ['UPDATE zz_sync_probe SET prcs_tm = NULL WHERE id = 1', true],
  ['SELECT COUNT(*) FROM zz_sync_probe WHERE id = 1 AND prcs_tm IS NULL AND prcs_req_msec IS NULL', 1],
  ['UPDATE zz_sync_probe SET prcs_tm = 8, prcs_req_msec = 9 WHERE id = 2', false],
  ['SELECT COUNT(*) FROM zz_sync_probe WHERE id = 2 AND prcs_tm = 7 AND prcs_req_msec = 7', 1],
  ['INSERT INTO zz_ledger_probe (id, val) VALUES (1, 1)', true],
  ['INSERT INTO zz_ledger_probe (id, val) VALUES (2, 2)', true],
  ['UPDATE zz_ledger_probe SET val = 9 WHERE id = 1', false],
  ['DELETE FROM zz_ledger_probe WHERE id = 1', false],
  ["INSERT INTO tb_sys_ledger_permit (permit_key) VALUES ('app.audit_retention')", true],
  ['DELETE FROM zz_ledger_probe WHERE id = 1', true],
  ['UPDATE zz_ledger_probe SET val = 9 WHERE id = 2', false],
  ["DELETE FROM tb_sys_ledger_permit WHERE permit_key = 'app.audit_retention'", true],
  ['DELETE FROM zz_ledger_probe WHERE id = 2', false],
  ['SELECT COUNT(*) FROM zz_ledger_probe', 1],
]);

function intentFailures(handle, vendorId) {
  const statements = INTENT_STEPS.map(([sql]) => ({ sql }));
  const { sections, errors } = runStatements(handle, statements);
  const rejected = new Set(errors.map(item => item.index));
  return INTENT_STEPS.flatMap(([sql, expected], index) => {
    if (typeof expected === 'number') {
      const actual = parseCount(sections.get(index));
      return actual === expected ? [] : [`${sql} → ${actual} (기대 ${expected})`];
    }
    return rejected.has(index) === expected ? [`${sql} → ${expected ? '거부' : '통과'}`] : [];
  });
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
  // 허용과 거부가 다 있어야 번역이 망가졌을 때 드러난다.
  const unbalanced = probes.tables.filter(table => {
    const accepted = table.rows.filter((_, index) => baseline.has(`${table.name}:${index}`)).length;
    return accepted === 0 || accepted === table.rows.length;
  }).map(table => table.definition);
  const emission = adapter.emitSchema({ ...probes, tables: [...probes.tables, ...INTENT_TABLES()] });
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
    return { vendor: vendorId, engine: engineId ?? vendorId, checks: probes.tables.length, rows, accepted: baseline.size, rejected: rows - baseline.size,
      differences, unbalanced, intentFailures: intentFailures(handle, vendorId) };
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
  console.log(`[vendor-differential] ${result.engine}: CHECK ${result.checks}, 값 ${result.rows}(기준 허용 ${result.accepted}, 거부 ${result.rejected}), 불일치 ${result.differences.length}, 한쪽만 나온 CHECK ${result.unbalanced.length}, 트리거 동작 실패 ${result.intentFailures.length}`);
  for (const name of result.unbalanced.slice(0, 12)) console.log(`  표본 부족: ${name}`);
  for (const item of result.intentFailures.slice(0, 12)) console.log(`  트리거: ${item}`);
  for (const item of result.differences.slice(0, 12)) console.log(`  ${item.check} ${JSON.stringify(item.row).slice(0, 110)} pg=${item.postgresql} vendor=${item.vendor}`);
  if (result.differences.length || result.unbalanced.length || result.intentFailures.length) process.exitCode = 1;
}
