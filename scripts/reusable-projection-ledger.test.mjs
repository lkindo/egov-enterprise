import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import {
  PROJECTION_LEDGER_PATH, buildProjectionLedger, inspectProjectionLedger, projectionLedgerCoverageErrors, projectionLedgerErrors,
  writeProjectionLedger,
} from './reusable-projection-ledger.mjs';
import { ROOT, git } from './reusable-source-tree.mjs';

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'projection-ledger-'));
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), 'x');
  }
  return root;
}

test('원장은 복사한 파일 가운데 지금 없는 파일만 정렬해 적는다', () => {
  const root = fixture(['frontend/src/a.ts', 'business-app/src/Keep.java']);
  try {
    const copied = ['frontend/src/b.ts', 'frontend/src/a.ts', 'business-app/src/Gone.java', 'business-app/src/Keep.java',
      'frontend\\src\\b.ts', PROJECTION_LEDGER_PATH];
    const ledger = buildProjectionLedger(root, copied);
    assert.deepEqual(ledger.removedFiles, ['business-app/src/Gone.java', 'frontend/src/b.ts']);
    assert.deepEqual(projectionLedgerErrors(ledger), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('lock 이 결속한 원장만 통과하고, 고치거나 있는 파일을 적거나 결속을 빼면 실패한다', () => {
  const root = fixture(['frontend/src/a.ts']);
  try {
    const record = writeProjectionLedger(root, buildProjectionLedger(root, ['frontend/src/a.ts', 'frontend/src/gone.ts']));
    assert.equal(record.path, PROJECTION_LEDGER_PATH);
    assert.equal(record.files, 1);
    assert.deepEqual(inspectProjectionLedger(root, { projectionLedger: record }), []);

    // 줄 끝만 바뀐 체크아웃(autocrlf)은 같은 원장이다.
    const text = readFileSync(join(root, PROJECTION_LEDGER_PATH), 'utf8');
    writeFileSync(join(root, PROJECTION_LEDGER_PATH), text.replace(/\n/g, '\r\n'));
    assert.deepEqual(inspectProjectionLedger(root, { projectionLedger: record }), []);

    assert.deepEqual(inspectProjectionLedger(root, {}), ['Source lock must bind the projection ledger']);
    assert.deepEqual(inspectProjectionLedger(root, { projectionLedger: { ...record, path: 'other.json' } }),
      ['Source lock must bind the projection ledger']);
    assert.match(inspectProjectionLedger(root, { projectionLedger: { ...record, files: 2 } }).join('\n'),
      /file count differs/);

    writeFileSync(join(root, PROJECTION_LEDGER_PATH), `${JSON.stringify({ ...JSON.parse(text),
      removedFiles: ['frontend/src/a.ts', 'frontend/src/gone.ts'] }, null, 2)}\n`);
    const tampered = inspectProjectionLedger(root, { projectionLedger: record }).join('\n');
    assert.match(tampered, /checksum mismatch/);
    assert.match(tampered, /lists files that exist: frontend\/src\/a\.ts/);

    writeFileSync(join(root, PROJECTION_LEDGER_PATH), '{');
    assert.match(inspectProjectionLedger(root, { projectionLedger: record }).join('\n'), /not valid JSON/);
    rmSync(join(root, PROJECTION_LEDGER_PATH));
    assert.deepEqual(inspectProjectionLedger(root, { projectionLedger: record }), ['Projection ledger is missing']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('원장은 생성기가 지운 파일을 빠짐없이 적어야 한다 — 원장을 쓴 뒤에 지운 파일은 원본 쪽 대조가 잡는다', () => {
  const root = fixture(['frontend/src/a.ts', 'frontend/src/late.ts']);
  try {
    const copied = ['frontend/src/a.ts', 'frontend/src/gone.ts', 'frontend/src/late.ts'];
    writeProjectionLedger(root, buildProjectionLedger(root, copied));
    assert.deepEqual(projectionLedgerCoverageErrors(root, copied), []);
    // 원장을 쓴 뒤에 지운 파일(단계 순서 회귀)
    rmSync(join(root, 'frontend/src/late.ts'));
    assert.match(projectionLedgerCoverageErrors(root, copied).join('\n'), /misses removed files: frontend\/src\/late\.ts/);
    // 복사하지 않은 파일을 적은 원장
    writeProjectionLedger(root, { ...buildProjectionLedger(root, copied), removedFiles: ['frontend/src/gone.ts', 'frontend/src/late.ts', 'frontend/src/never.ts'] });
    assert.match(projectionLedgerCoverageErrors(root, copied).join('\n'), /not copied or still exist: frontend\/src\/never\.ts/);
    rmSync(join(root, PROJECTION_LEDGER_PATH));
    assert.deepEqual(projectionLedgerCoverageErrors(root, copied), ['Projection ledger is missing']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('원장 형식은 저장소 기준 경로·정렬·중복 없음·신원을 요구한다', () => {
  const ok = { schemaVersion: 1, authority: 'generated-reusable-projection-ledger', removedFiles: ['a/b.ts'] };
  assert.deepEqual(projectionLedgerErrors(ok), []);
  assert.match(projectionLedgerErrors({ ...ok, authority: 'x' }).join(), /identity/);
  assert.match(projectionLedgerErrors({ ...ok, removedFiles: undefined }).join(), /must list removed files/);
  for (const path of ['/a.ts', 'C:/a.ts', 'a\\b.ts', '../a.ts', 'a/./b.ts', 'a//b.ts', '', 3]) {
    assert.match(projectionLedgerErrors({ ...ok, removedFiles: [path] }).join(), /not repository-relative/, String(path));
  }
  assert.match(projectionLedgerErrors({ ...ok, removedFiles: ['b.ts', 'a.ts'] }).join(), /sorted and unique/);
  assert.match(projectionLedgerErrors({ ...ok, removedFiles: ['a.ts', 'a.ts'] }).join(), /sorted and unique/);
});

test('원본 저장소에는 투영 원장이 없고, 생성물에서는 lock 이 결속한 원장이 사실과 맞다', () => {
  let lockText;
  try {
    lockText = readFileSync(join(ROOT, 'reusable-base-lock.json'), 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  if (lockText !== undefined) {
    assert.deepEqual(inspectProjectionLedger(ROOT, JSON.parse(lockText)), []);
    return;
  }
  // 원본에 원장이 생기면 프런트 시험 도우미가 원본에서 계약을 빼게 된다.
  assert.equal(git(['ls-files', '--', PROJECTION_LEDGER_PATH]), '');
  assert.throws(() => readFileSync(join(ROOT, PROJECTION_LEDGER_PATH)), { code: 'ENOENT' });
});
