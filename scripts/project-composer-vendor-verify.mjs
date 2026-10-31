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
import { assertCatalogParity, nextValues } from './project-composer-vendor-sql.mjs';
import { VENDOR_ADAPTERS } from './project-composer-vendors.mjs';
import { parseCount, readCatalog, readNextValues, runStatements, startVendorEngine, stopVendorEngine } from './project-composer-vendor-engine.mjs';

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

/** 표마다 행 수를 세어 시드가 빠짐없이 들어갔는지 본다. */
function rowCounts(handle, model) {
  const statements = model.tables.map(table => ({ sql: `SELECT COUNT(*) FROM ${table.name}` }));
  const { sections, errors } = runStatements(handle, statements);
  if (errors.length) throw stageFailure('행 수 조회', errors);
  return Object.fromEntries(model.tables.map((table, index) => {
    return [table.name, parseCount(sections.get(index))];
  }));
}

export function verifyVendor({ input, vendorId, engineId }) {
  const adapter = VENDOR_ADAPTERS[vendorId];
  const model = buildVendorModel({ snapshot: input.snapshot, extras: input.extras });
  const emission = adapter.emitSchema(model);
  const seed = adapter.emitSeed(model, input.rows).map(sql => ({ sql }));
  const sync = adapter.emitSequenceSync(model, input.rows).map(sql => ({ sql }));
  const handle = startVendorEngine(engineId ?? vendorId);
  try {
    const schema = runStatements(handle, emission.statements);
    if (schema.errors.length) throw stageFailure('스키마 적용', schema.errors);
    const seeded = runStatements(handle, seed);
    if (seeded.errors.length) throw stageFailure('시드 적용', seeded.errors);
    const synced = runStatements(handle, sync);
    if (synced.errors.length) throw stageFailure('다음 값 맞춤', synced.errors);
    assertCatalogParity(emission, readCatalog(handle, vendorId));
    const expected = Object.fromEntries(model.tables.map(table => [table.name, input.rows[table.name]?.length ?? 0]));
    const actual = rowCounts(handle, model);
    const different = Object.keys(expected).filter(name => expected[name] !== actual[name]);
    if (different.length) {
      const error = new Error(`시드 행 수가 다르다: ${different.slice(0, 8).map(name => `${name} ${actual[name]}/${expected[name]}`).join(', ')}`);
      error.code = 'VENDOR_PARITY_FAILED';
      throw error;
    }
    const next = readNextValues(handle, vendorId);
    const behind = nextValues(model, input.rows).identities.filter(item => item.next > 1 && !(next.get(item.table) >= item.next));
    if (behind.length) {
      const error = new Error(`다음 값이 최대 ID 뒤로 가지 않았다: ${behind.slice(0, 8).map(item => `${item.table} ${next.get(item.table)}/${item.next}`).join(', ')}`);
      error.code = 'VENDOR_PARITY_FAILED';
      throw error;
    }
    return { vendor: vendorId, engine: engineId ?? vendorId, statements: emission.statements.length, seedRows: seed.length,
      degradations: emission.degradations };
  } finally {
    stopVendorEngine(handle);
  }
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
