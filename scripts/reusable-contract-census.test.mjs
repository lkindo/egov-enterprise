import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CONSUMER_NOT_IN_COMPOSITION, projectConsumerEntries, projectContractCensuses } from './reusable-contract-census.mjs';
import { apiDocsText, projectSourceApiDocs, regenerateContractTypes } from './reusable-contract-projection.mjs';
import { BOUNDARY_PATH, LEDGER_PATH, readOperations, runCensus } from './operation-consumer-census.mjs';
import { PROJECTION_LEDGER_PATH, writeProjectionLedger } from './reusable-projection-ledger.mjs';
import { copySourceTree, trackedAndUntrackedFiles } from './reusable-source-tree.mjs';

const root = resolve(import.meta.dirname, '..');
const ts = createRequire(join(root, 'frontend', 'package.json'))('typescript');
const text = (base, file) => readFileSync(join(base, file), 'utf8').replace(/\r\n/g, '\n');
const json = (base, file) => JSON.parse(text(base, file));
// 계약 census 가 읽는 파일만 복사한다(프런트 소스·설정 원장·api-docs). 생성기는 전체 트리에서 같은 일을 한다.
const CONTRACT_INPUTS = ['frontend/src/', 'config/', 'api-docs.json', 'frontend/package.json', 'frontend/tsconfig.json'];
const contractFiles = trackedAndUntrackedFiles(root).filter(file => CONTRACT_INPUTS.some(prefix => file === prefix || file.startsWith(prefix)));
function contractTree(t, removedFiles = []) {
  const output = mkdtempSync(join(tmpdir(), 'contract-census-'));
  t.after(() => rmSync(output, { recursive: true, force: true, maxRetries: 5 }));
  copySourceTree(output, { sourceRoot: root, files: contractFiles.filter(file => !removedFiles.includes(file)) });
  writeProjectionLedger(output, { schemaVersion: 1, authority: 'generated-reusable-projection-ledger', removedFiles: [...removedFiles].sort() });
  return output;
}

/*
 * 생성물의 경계·소비 census 투영(Phase 2 10c-2). 아무것도 지우지 않은 구성은 두 파일 모두 원본과 바이트가 같아야 한다 —
 * 원본 기대값이 실측과 같고(래칫이 꽉 맞다), 경계 census 재생성이 원본 커밋본을 그대로 낸다는 뜻이다.
 */
test('the full composition reproduces the boundary census and the consumer ledger byte for byte', { timeout: 300_000 }, t => {
  const output = contractTree(t);
  const result = projectContractCensuses({ sourceRoot: root, output, removedFiles: [] });
  assert.equal(text(output, BOUNDARY_PATH), text(root, BOUNDARY_PATH), 'generated-api-boundaries.json');
  assert.equal(text(output, LEDGER_PATH), text(root, LEDGER_PATH), 'operation-consumer-census.json');
  assert.deepEqual(result.consumer.consumerNotInComposition, []);
  assert.equal(result.boundary.records, json(root, BOUNDARY_PATH).records.length);
});

test('a reduced composition drops removed operations, records consumers the projection removed and remeasures the ratchets', { timeout: 300_000 }, t => {
  const controller = 'api-server/src/main/java/nuri/api/controller/business/approval/InformalSanctionApiController.java';
  const consumer = 'frontend/src/services/business/user/help/HelpUserService.ts';
  const projection = projectSourceApiDocs(root, file => file === controller);
  assert.ok(projection.removedOperations.length > 0, 'the controller documents operations');
  const output = contractTree(t, [consumer]);
  writeFileSync(join(output, 'api-docs.json'), apiDocsText(projection.doc));
  regenerateContractTypes({ sourceRoot: root, output });
  const result = projectContractCensuses({ sourceRoot: root, output, removedFiles: [consumer] });

  const sourceLedger = json(root, LEDGER_PATH);
  const ledger = json(output, LEDGER_PATH);
  const removed = new Set(projection.removedOperations.map(operation => operation.operationId));
  const dropped = sourceLedger.entries.filter(entry => removed.has(entry.operationId)).map(entry => entry.operationId);
  assert.ok(dropped.length > 0, 'the removed controller had ledger entries');
  assert.deepEqual(ledger.entries.filter(entry => removed.has(entry.operationId)), [], 'no entry for a removed operation remains');
  // 원본에서 그 파일 하나만 소비하던 연산(남는 문서의 기본 연산)이 근거와 함께 오른다.
  const consumers = new Map();
  for (const record of json(root, BOUNDARY_PATH).records) {
    if (record.operationId) consumers.set(record.operationId, new Set([...(consumers.get(record.operationId) ?? []), record.file]));
  }
  const expected = readOperations(projection.doc).map(operation => operation.operationId)
    .filter(id => consumers.has(id) && [...consumers.get(id)].every(file => file === consumer)).sort();
  assert.ok(expected.length >= 2, `operations consumed only by ${consumer}: ${expected}`);
  const added = ledger.entries.filter(entry => entry.category === CONSUMER_NOT_IN_COMPOSITION);
  assert.deepEqual(added.map(entry => entry.operationId), expected);
  assert.ok(added.every(entry => JSON.stringify(entry.evidence) === JSON.stringify([consumer])));
  assert.deepEqual(result.consumer.consumerNotInComposition, expected);
  // 기대값은 생성물에서 잰 값이고 원본 래칫을 넘지 않는다.
  assert.equal(ledger.expected.operationCount, readOperations(projection.doc).length);
  assert.equal(ledger.expected.unwiredMax, ledger.entries.filter(entry => entry.category === 'unwired').length);
  for (const key of ['unwiredMax', 'screenOrphanMax', 'ungatedWriteMax']) assert.ok(ledger.expected[key] <= sourceLedger.expected[key], key);
  assert.deepEqual(Object.keys(ledger), Object.keys(sourceLedger), 'the ledger keeps its shape');

  // 근거는 투영 원장에 적히고 생성물에 없는 파일이어야 한다. 남는 파일(원장에 적어도)·원장 밖의 없는 파일은 근거가 아니다.
  const ledgerText = text(output, LEDGER_PATH);
  const projectionText = text(output, PROJECTION_LEDGER_PATH);
  const surviving = 'frontend/src/services/core/ApiService.ts';
  const withEvidence = evidence => writeFileSync(join(output, LEDGER_PATH), `${JSON.stringify({ ...ledger, entries: ledger.entries.map(entry => (
    entry.operationId === expected[0] ? { ...entry, evidence } : entry)) }, null, 2)}\n`);
  writeProjectionLedger(output, { schemaVersion: 1, authority: 'generated-reusable-projection-ledger', removedFiles: [consumer, surviving].sort() });
  withEvidence([surviving]);
  const survivingErrors = runCensus(output, { ts }).errors;
  assert.deepEqual(survivingErrors.map(error => `${error.code}:${error.operationId}`), [`UNPROVEN_EVIDENCE:${expected[0]}`]);
  assert.match(survivingErrors[0].message, /evidence must be consumer files the projection removed .*ApiService\.ts/);
  withEvidence(['frontend/src/services/core/NeverExisted.ts']);
  assert.deepEqual(runCensus(output, { ts }).errors.map(error => `${error.code}:${error.operationId}`), [`UNPROVEN_EVIDENCE:${expected[0]}`]);
  writeFileSync(join(output, PROJECTION_LEDGER_PATH), projectionText);
  writeFileSync(join(output, LEDGER_PATH), ledgerText);
  assert.deepEqual(runCensus(output, { ts }).errors, [], 'the restored projection is valid again');
  // 투영 원장이 없으면(원본 저장소) 이 범주는 쓸 수 없다.
  rmSync(join(output, PROJECTION_LEDGER_PATH));
  const unprojected = runCensus(output, { ts }).errors;
  assert.deepEqual([...new Set(unprojected.map(error => error.code))], ['UNPROVEN_EVIDENCE']);
  assert.match(unprojected[0].message, /exists only in a generated product/);
});

test('a consumer that disappears without its file being removed cannot be recorded', () => {
  const apiDoc = { paths: { '/api/v1/x': { get: { operationId: 'getX', tags: ['X'] } }, '/api/v1/y': { get: { operationId: 'getY', tags: ['X'] } } } };
  const sourceBoundaries = { records: [{ operationId: 'getX', file: 'frontend/src/x.ts' }, { operationId: 'getY', file: 'frontend/src/y.ts' }] };
  const sourceLedger = { entries: [] };
  const boundaries = { records: [{ operationId: 'getY', file: 'frontend/src/y.ts' }] };
  assert.deepEqual(projectConsumerEntries({ sourceLedger, sourceBoundaries, apiDoc, boundaries, removedFiles: ['frontend/src/x.ts'] }).added, ['getX']);
  assert.throws(() => projectConsumerEntries({ sourceLedger, sourceBoundaries, apiDoc, boundaries, removedFiles: [] }),
    /operation getX lost its consumer, but the consumer file survives the projection: frontend\/src\/x\.ts/);
  assert.throws(() => projectConsumerEntries({ sourceLedger, sourceBoundaries: { records: [] }, apiDoc, boundaries, removedFiles: [] }),
    /operation getX has no consumer upstream and no ledger entry/);
});

test('a surviving screen that calls an operation the projection removed fails the boundary census', { timeout: 300_000 }, t => {
  const output = contractTree(t);
  const doc = JSON.parse(text(root, 'api-docs.json'));
  const consumed = json(root, BOUNDARY_PATH).records.find(record => record.classification === 'generated' && record.operationId === 'getReflectedBanners');
  assert.ok(consumed, 'the banner screen calls a generated operation');
  for (const item of Object.values(doc.paths)) for (const method of Object.keys(item)) if (item[method].operationId === 'getReflectedBanners') delete item[method];
  writeFileSync(join(output, 'api-docs.json'), apiDocsText(doc));
  // 생성 타입이 낡았으면 호출은 남은 서술자로 매핑되지만, 그 연산이 문서에 없다.
  assert.throws(() => projectContractCensuses({ sourceRoot: root, output, removedFiles: [] }),
    /projected boundary census calls operations missing from the projected api-docs: getReflectedBanners/);
  // 생성기처럼 생성 타입을 다시 만들면 서술자가 사라져 그 호출은 매핑되지 않는 경계가 된다.
  regenerateContractTypes({ sourceRoot: root, output });
  assert.throws(() => projectContractCensuses({ sourceRoot: root, output, removedFiles: [] }), /projected boundary census has 1 unmapped boundaries \(upstream 0\)/);
});
