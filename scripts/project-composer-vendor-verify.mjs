#!/usr/bin/env node
/**
 * 생성 번들의 중립 모델을 벤더 일회용 DB 에 적용하고 다시 읽어 대조한다(설계서 D-4·D-5).
 *
 * 사용: node scripts/project-composer-vendor-verify.mjs --input <입력 JSON> --vendor <id> [--engine <id>] [--report <경로>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { buildVendorModel } from './project-composer-vendor-model.mjs';
import { assertCatalogParity, assertUniqueColumns, nextValues } from './project-composer-vendor-sql.mjs';
import { VENDOR_ADAPTERS } from './project-composer-vendors.mjs';
import { parseCount, readCatalog, readNextValues, readSequenceNextValues, readUniqueColumns, runStatements, startVendorEngine, stopVendorEngineReporting } from './project-composer-vendor-engine.mjs';

export function parseVerifyArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = { '--input': 'input', '--vendor': 'vendor', '--engine': 'engine', '--report': 'report' }[argv[index]];
    if (!key || !argv[index + 1]) throw new Error(`알 수 없는 인자: ${argv[index]}`);
    args[key] = argv[++index];
  }
  if (!args.input || !VENDOR_ADAPTERS[args.vendor]) throw new Error('--input 과 어댑터가 있는 --vendor 가 필요하다.');
  return args;
}

const stageFailure = (stage, errors) => {
  const first = errors.slice(0, 5).map(item => `${item.error} :: ${item.statement}`).join('\n  ');
  const error = new Error(`${stage} 실패 ${errors.length}건\n  ${first}`);
  error.code = 'VENDOR_PARITY_FAILED';
  return error;
};

const queryFailure = message => Object.assign(new Error(message), { code: 'VENDOR_QUERY_FAILED' });

/** 표마다 행 수를 세어 시드가 빠짐없이 들어갔는지 본다. 세지 못한 것은 대조 결과가 아니라 조회 자체의 문제다. */
export function rowCounts(handle, model, vendorId, run = runStatements) {
  const statements = model.tables.map(table => ({ sql: `SELECT COUNT(*) FROM ${table.name}` }));
  const { sections, errors } = run(handle, statements);
  if (errors.length) throw queryFailure(`${vendorId} 행 수 조회 실패 ${errors.length}건: ${errors[0].error} :: ${errors[0].statement}`);
  return Object.fromEntries(model.tables.map((table, index) => {
    const count = parseCount(sections.get(index));
    if (count === null) throw queryFailure(`${vendorId} 행 수를 읽지 못했다: ${table.name}`);
    return [table.name, count];
  }));
}

/** 대상 DB 를 다시 읽어 모델과 맞춘다. 다른 일을 하기 전에 DB 가 믿을 만한지 보는 관문이다. Flyway 이력 표는 번들 밖이다. */
export function assertVendorApplied(handle, input, vendorId, { ignoreTables } = {}) {
  const model = buildVendorModel({ snapshot: input.snapshot, extras: input.extras });
  const emission = VENDOR_ADAPTERS[vendorId].emitSchema(model);
  assertCatalogParity(emission, readCatalog(handle, vendorId), { ignoreTables });
  const uniqueColumns = readUniqueColumns(handle, vendorId);
  if (uniqueColumns) assertUniqueColumns(emission, uniqueColumns, { ignoreTables });
  const expected = Object.fromEntries(model.tables.map(table => [table.name, input.rows[table.name]?.length ?? 0]));
  const actual = rowCounts(handle, model, vendorId);
  const different = Object.keys(expected).filter(name => expected[name] !== actual[name]);
  if (different.length) {
    const error = new Error(`시드 행 수가 다르다: ${different.slice(0, 8).map(name => `${name} ${actual[name]}/${expected[name]}`).join(', ')}`);
    error.code = 'VENDOR_PARITY_FAILED';
    throw error;
  }
  const next = readNextValues(handle, vendorId);
  const expectedNext = nextValues(model, input.rows);
  const behind = expectedNext.identities.filter(item => item.next > 1 && !(next.get(item.table) >= item.next));
  if (behind.length) {
    const error = new Error(`다음 값이 최대 ID 뒤로 가지 않았다: ${behind.slice(0, 8).map(item => `${item.table} ${next.get(item.table)}/${item.next}`).join(', ')}`);
    error.code = 'VENDOR_PARITY_FAILED';
    throw error;
  }
  const sequenceNext = readSequenceNextValues(handle, vendorId);
  const behindSequences = sequenceNext ? expectedNext.sequences.filter(item => !(sequenceNext.get(item.name) >= item.next)) : [];
  if (behindSequences.length) {
    const error = new Error(`시퀀스의 다음 값이 번역 결과 뒤로 가지 않았다: ${behindSequences.slice(0, 8).map(item => `${item.name} ${sequenceNext.get(item.name)}/${item.next}`).join(', ')}`);
    error.code = 'VENDOR_PARITY_FAILED';
    throw error;
  }
  return { emission, tables: model.tables.length, seedRows: Object.values(expected).reduce((sum, rows) => sum + rows, 0) };
}

/** 스키마와 시드를 적용하고 대조한다. */
export function applyVendor(handle, input, vendorId) {
  const adapter = VENDOR_ADAPTERS[vendorId];
  const model = buildVendorModel({ snapshot: input.snapshot, extras: input.extras });
  const emission = adapter.emitSchema(model);
  const seed = adapter.emitSeed(model, input.rows).map(sql => ({ sql }));
  const sync = adapter.emitSequenceSync(model, input.rows).map(sql => ({ sql }));
  {
    const schema = runStatements(handle, emission.statements);
    if (schema.errors.length) throw stageFailure('스키마 적용', schema.errors);
    const seeded = runStatements(handle, seed);
    if (seeded.errors.length) throw stageFailure('시드 적용', seeded.errors);
    const synced = runStatements(handle, sync);
    if (synced.errors.length) throw stageFailure('다음 값 맞춤', synced.errors);
    // 시드 행 수는 DB 에서 센 값이다. 시드 문장 수는 행 수가 아니다 — CUBRID 는 여러 행을 한 문장에 묶는다.
    const applied = assertVendorApplied(handle, input, vendorId);
    return { statements: emission.statements.length, seedRows: applied.seedRows, degradations: emission.degradations };
  }
}

export function verifyVendor({ input, vendorId, engineId }) {
  const handle = startVendorEngine(engineId ?? vendorId);
  let failure = null;
  let report = null;
  try {
    report = { vendor: vendorId, engine: engineId ?? vendorId, ...applyVendor(handle, input, vendorId) };
  } catch (error) {
    failure = error;
  }
  stopVendorEngineReporting(handle, failure);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = parseVerifyArgs(process.argv.slice(2));
  try {
    const report = verifyVendor({ input: JSON.parse(readFileSync(args.input, 'utf8')), vendorId: args.vendor, engineId: args.engine });
    if (args.report) writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`[vendor-verify] PASS ${report.engine}: 문장 ${report.statements}, 시드 ${report.seedRows}, 저하 ${report.degradations.length}`);
  } catch (error) {
    console.error(`[vendor-verify] ${error.code ?? 'FAILED'}: ${error.message}`);
    process.exitCode = 1;
  }
}
