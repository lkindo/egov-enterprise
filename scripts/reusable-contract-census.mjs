/**
 * 생성물의 API 계약 census 투영 — TypeScript 가 필요한 부분(Phase 2 10단계 10c-2).
 *
 * 생성기가 api-docs 와 생성 타입을 구성 기준으로 다시 쓴 뒤(reusable-contract-projection.mjs), 그 생성물 트리에서
 *   ① 생성 경계 census(generated-api-boundaries.json)를 다시 만들고
 *   ② 소비 census 원장(operation-consumer-census.json)을 투영한다:
 *      - 생성물 api-docs 에 없는 연산의 항목을 뺀다.
 *      - 핸들러는 남는데 원본의 소비자 파일을 투영이 모두 지운 연산은 닫힌 어휘 `consumer-not-in-composition` 으로 적는다.
 *        근거는 투영 원장(reusable-projection-ledger.json)에 적힌 지워진 소비자 파일이다. 소비자 파일이 남았는데 호출만 사라졌으면
 *        (마커 투영 등) 근거를 댈 수 없으므로 실패한다.
 *      - 기대값(연산 수·세 래칫)은 생성물에서 잰 값으로 다시 쓴다(설계서 13장 — 축소한 하한은 생성 원장에서 다시 계산한다).
 *   ③ 생성물 트리에서 소비 census 전체(runCensus)를 돌려 오류가 0 인지 본다.
 * 모든 기능을 고른 구성은 두 파일 모두 원본과 바이트가 같다(계약 시험).
 *
 * 이 모듈은 적재할 때 원본 frontend 의 TypeScript 를 읽는다(generated-boundary-census.mjs). 생성기·정밀 점검·생성기 서버는
 * 이 모듈을 동적 import 로만 부른다 — 정적으로 부르면 frontend 를 설치하지 않은 곳에서 생성기 적재부터 실패한다
 * (frontend-reachability-census.test.mjs 의 '투영은 frontend 설치 없이' 계약).
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildBoundaryCensus, validateBoundaryCensus } from './generated-boundary-census.mjs';
import { API_DOC_PATH, BOUNDARY_PATH, LEDGER_PATH, baseOperationId, isAliasDuplicate, readOperations, runCensus } from './operation-consumer-census.mjs';

const readJson = (root, file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const jsonText = value => `${JSON.stringify(value, null, 2)}\n`;
export const CONSUMER_NOT_IN_COMPOSITION = 'consumer-not-in-composition';

/**
 * 소비 census 원장을 생성물 api-docs·경계 census 로 투영한다(기대값 제외 — 측정은 runCensus 가 한다).
 * `removedFiles` 는 투영이 지운 원본 파일(투영 원장)이다.
 */
export function projectConsumerEntries({ sourceLedger, sourceBoundaries, apiDoc, boundaries, removedFiles }) {
  const operations = readOperations(apiDoc);
  const byOperationId = new Map(operations.map(operation => [operation.operationId, operation]));
  const consumed = new Set((boundaries.records ?? []).map(record => record.operationId).filter(Boolean));
  const removed = new Set(removedFiles);
  const sourceConsumers = new Map();
  for (const record of sourceBoundaries.records ?? []) {
    if (!record.operationId) continue;
    if (!sourceConsumers.has(record.operationId)) sourceConsumers.set(record.operationId, new Set());
    sourceConsumers.get(record.operationId).add(record.file);
  }
  const entries = (sourceLedger.entries ?? []).filter(entry => byOperationId.has(entry.operationId));
  const ledgered = new Set(entries.map(entry => entry.operationId));
  // 기본 연산을 먼저 본다 — springdoc 별칭(`_N`)은 기본 연산이 원장에 오르면 기계로 파생된다.
  const lost = operations.filter(operation => !consumed.has(operation.operationId) && !ledgered.has(operation.operationId))
    .sort((left, right) => Number(baseOperationId(left.operationId) !== left.operationId) - Number(baseOperationId(right.operationId) !== right.operationId)
      || left.operationId.localeCompare(right.operationId));
  const added = [];
  for (const operation of lost) {
    if (isAliasDuplicate(operation, byOperationId, consumed, ledgered)) continue;
    const files = [...(sourceConsumers.get(operation.operationId) ?? [])].sort();
    if (files.length === 0) {
      throw new Error(`operation ${operation.operationId} has no consumer upstream and no ledger entry — the upstream consumer census is stale`);
    }
    const surviving = files.filter(file => !removed.has(file));
    if (surviving.length) {
      throw new Error(`operation ${operation.operationId} lost its consumer, but the consumer file survives the projection: ${surviving.join(', ')}`);
    }
    entries.push({
      operationId: operation.operationId,
      category: CONSUMER_NOT_IN_COMPOSITION,
      note: 'The handler stays with a selected feature, but every upstream consumer file was removed by this composition\'s projection.',
      evidence: files,
    });
    ledgered.add(operation.operationId);
    added.push(operation.operationId);
  }
  entries.sort((left, right) => left.operationId.localeCompare(right.operationId));
  return { entries, added };
}

/**
 * 생성물 트리(`output`)의 경계 census 를 다시 만들고 소비 census 원장을 투영한다. 원본 원장·경계 census 는 `sourceRoot` 에서 읽는다.
 * 투영 원장(`removedFiles`)이 생성물에 이미 쓰여 있어야 한다 — 소비 census 가 그 원장으로 근거를 대조한다.
 */
export function projectContractCensuses({ sourceRoot, output, removedFiles }) {
  const sourceBoundaries = readJson(sourceRoot, BOUNDARY_PATH);
  const boundaries = buildBoundaryCensus({ repoRoot: output });
  const boundaryErrors = validateBoundaryCensus(boundaries);
  if (boundaryErrors.length) throw new Error(`projected boundary census is invalid:\n${boundaryErrors.join('\n')}`);
  // 원본이 생성 경로를 모두 쓰면 생성물도 그래야 한다. 남는 화면이 생성물 api-docs 에 없는 연산을 부르면 여기서 드러난다.
  for (const classification of ['legacy', 'direct', 'unmapped']) {
    const before = sourceBoundaries.summary?.byClassification?.[classification] ?? 0;
    const after = boundaries.summary.byClassification[classification];
    if (after > before) {
      const records = boundaries.records.filter(record => record.classification === classification)
        .map(record => `${record.file}:${record.line} ${record.callee} -> ${record.target ?? '<unresolved>'}`);
      throw new Error(`projected boundary census has ${after} ${classification} boundaries (upstream ${before}):\n${records.join('\n')}`);
    }
  }
  // 남는 호출은 생성물 api-docs 에 있는 연산만 부른다(생성 타입이 api-docs 와 어긋나도 여기서 드러난다).
  const apiDoc = readJson(output, API_DOC_PATH);
  const documented = new Set(readOperations(apiDoc).map(operation => operation.operationId));
  const undocumented = [...new Set(boundaries.records.map(record => record.operationId).filter(id => id && !documented.has(id)))].sort();
  if (undocumented.length) throw new Error(`projected boundary census calls operations missing from the projected api-docs: ${undocumented.join(', ')}`);
  writeFileSync(join(output, BOUNDARY_PATH), jsonText(boundaries), 'utf8');

  const sourceLedger = readJson(sourceRoot, LEDGER_PATH);
  const { entries, added } = projectConsumerEntries({ sourceLedger, sourceBoundaries, apiDoc, boundaries, removedFiles });
  const ts = createRequire(join(sourceRoot, 'frontend', 'package.json'))('typescript');
  const write = expected => writeFileSync(join(output, LEDGER_PATH), jsonText({ ...sourceLedger, expected, entries }), 'utf8');
  // 처음에는 원본 기대값으로 재고, 잰 값으로 기대값을 다시 쓴 뒤 오류가 0 인지 본다. 키 순서는 원본 그대로다.
  write(sourceLedger.expected);
  const measured = runCensus(output, { ts }).summary;
  const values = { operationCount: measured.operationCount, unwiredMax: measured.unwired,
    screenOrphanMax: measured.screenOrphans, ungatedWriteMax: measured.ungatedWrites };
  const unknown = Object.keys(sourceLedger.expected ?? {}).filter(key => !Object.hasOwn(values, key));
  if (unknown.length) throw new Error(`consumer census expectations the projection cannot measure: ${unknown.join(', ')}`);
  write(Object.fromEntries(Object.keys(sourceLedger.expected).map(key => [key, values[key]])));
  const result = runCensus(output, { ts });
  if (result.errors.length) {
    throw new Error(`projected consumer census failed:\n${result.errors.map(error => `[${error.code}] ${error.operationId ?? '(census)'}: ${error.message}`).join('\n')}`);
  }
  return {
    boundary: { records: boundaries.records.length, eligible: boundaries.summary.eligible, adoptionPercent: boundaries.summary.adoptionPercent },
    consumer: { ...result.summary, consumerNotInComposition: added },
  };
}
