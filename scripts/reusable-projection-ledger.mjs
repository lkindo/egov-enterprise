/**
 * 투영 원장 — 생성기가 원본에서 복사한 뒤 투영으로 지운 파일 목록(Phase 2 D6).
 *
 * 생성물 안의 검사는 어떤 파일이 투영 때문에 빠졌는지 알 근거가 없었다. 그래서 경로로 기능 파일을 읽는 계약은 ENOENT 로,
 * 파일별 총계를 동결한 계약은 불일치로 처음부터 붉었다(core 프런트 47개 파일). 생성기는 지운 파일을 정확히 알므로 그 목록을
 * 생성물 루트에 남기고 lock 이 해시를 결속한다. 검사는 "원장에 있고 실제로 없는" 항목만 빼며, 원본에는 원장이 없어 아무것도
 * 빼지 않는다. 원장은 면제 목록이 아니라 생성기가 한 일의 기록이다 — 원장에 적힌 파일이 생성물에 있으면 검사가 실패한다.
 *
 * 원장은 기능 제거만이 아니라 생성기가 지운 모든 파일을 적는다 — DB 번들로 바뀐 마이그레이션, 규칙으로 걷은 시험,
 * 제거된 목적지로 가는 리다이렉트 페이지, 검증 설치가 바꾼 워크플로도 들어간다. 생성기는 파일을 지우는 마지막 단계 뒤에 센다.
 * 경로는 원본 저장소 기준이다. 단일모듈 배치는 빌드 파일만 바꾸고 소스를 옮기지 않으므로 경로가 그대로 유효하다.
 */
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readTextIfPresent } from './reusable-source-tree.mjs';

export const PROJECTION_LEDGER_PATH = 'reusable-projection-ledger.json';
const AUTHORITY = 'generated-reusable-projection-ledger';
const sha256 = text => createHash('sha256').update(text).digest('hex');
const isRepoPath = path => typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\')
  && !/^[A-Za-z]:/.test(path) && path.split('/').every(part => part && part !== '.' && part !== '..');

/** 복사한 원본 파일 가운데 생성물에 없는 파일. `copiedFiles` 는 저장소 기준 경로다. */
export function buildProjectionLedger(output, copiedFiles) {
  const removedFiles = [...new Set(copiedFiles.map(path => path.replaceAll('\\', '/')))]
    .filter(path => path !== PROJECTION_LEDGER_PATH && !existsSync(join(output, path)))
    .sort();
  return { schemaVersion: 1, authority: AUTHORITY, removedFiles };
}

export function writeProjectionLedger(output, ledger) {
  const text = `${JSON.stringify(ledger, null, 2)}\n`;
  writeFileSync(join(output, PROJECTION_LEDGER_PATH), text, 'utf8');
  return { path: PROJECTION_LEDGER_PATH, sha256: sha256(text), files: ledger.removedFiles.length };
}

/** 원장 형식 검사. 형식이 틀리면 오류 목록을 돌려준다. */
export function projectionLedgerErrors(ledger) {
  const errors = [];
  if (ledger?.schemaVersion !== 1 || ledger?.authority !== AUTHORITY) errors.push('Projection ledger identity is invalid');
  const files = ledger?.removedFiles;
  if (!Array.isArray(files)) return [...errors, 'Projection ledger must list removed files'];
  for (const path of files) if (!isRepoPath(path)) errors.push(`Projection ledger path is not repository-relative: ${String(path)}`);
  const sorted = [...files].sort();
  if (new Set(files).size !== files.length || sorted.some((path, index) => path !== files[index])) {
    errors.push('Projection ledger paths must be sorted and unique');
  }
  return errors;
}

/**
 * 원장이 생성기가 한 일을 빠짐없이 적었는지 본다 — 원본의 복사 대상 가운데 생성물에 없는 파일과 정확히 같아야 한다.
 * 원본 쪽(base:verify)에서 생성 직후 부른다. 생성기가 원장을 쓴 뒤에 파일을 지우면 그 파일이 원장에 없어 여기서 붉다.
 */
export function projectionLedgerCoverageErrors(output, copiedFiles) {
  const text = readTextIfPresent(join(output, PROJECTION_LEDGER_PATH));
  if (text === undefined) return ['Projection ledger is missing'];
  let ledger;
  try { ledger = JSON.parse(text); } catch { return ['Projection ledger is not valid JSON']; }
  const listed = new Set(Array.isArray(ledger?.removedFiles) ? ledger.removedFiles : []);
  const expected = buildProjectionLedger(output, copiedFiles).removedFiles;
  const expectedSet = new Set(expected);
  const unlisted = expected.filter(path => !listed.has(path));
  const stale = [...listed].filter(path => !expectedSet.has(path));
  const errors = [];
  if (unlisted.length) errors.push(`Projection ledger misses removed files: ${unlisted.slice(0, 5).join(', ')}${unlisted.length > 5 ? ` (+${unlisted.length - 5})` : ''}`);
  if (stale.length) errors.push(`Projection ledger lists files that were not copied or still exist: ${stale.slice(0, 5).join(', ')}`);
  return errors;
}

/** 생성물의 원장이 lock 과 맞고, 적힌 파일이 실제로 없는지 본다(생성물 무결성 검사가 부른다). */
export function inspectProjectionLedger(root, lock) {
  const record = lock?.projectionLedger;
  if (!record || record.path !== PROJECTION_LEDGER_PATH) return ['Source lock must bind the projection ledger'];
  // 확인하고 읽지 않는다(js/file-system-race) — 읽기를 시도하고 부재만 따로 말한다.
  const raw = readTextIfPresent(join(root, PROJECTION_LEDGER_PATH));
  if (raw === undefined) return ['Projection ledger is missing'];
  const text = raw.replace(/\r\n/g, '\n');
  const errors = [];
  if (sha256(text) !== record.sha256) errors.push('Projection ledger checksum mismatch');
  let ledger;
  try { ledger = JSON.parse(text); } catch { return [...errors, 'Projection ledger is not valid JSON']; }
  errors.push(...projectionLedgerErrors(ledger));
  if (Array.isArray(ledger.removedFiles)) {
    if (ledger.removedFiles.length !== record.files) errors.push('Projection ledger file count differs from the source lock');
    const present = ledger.removedFiles.filter(file => typeof file === 'string' && isRepoPath(file) && existsSync(join(root, file)));
    if (present.length) errors.push(`Projection ledger lists files that exist: ${present.slice(0, 5).join(', ')}`);
  }
  return errors;
}
