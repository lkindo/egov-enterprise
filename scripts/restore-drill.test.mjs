import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  BACKUP_SET_FILES, CHECKSUM_FILE, CORE_TABLES, DEFAULT_MIGRATIONS, DRILL_CHECKS, LEDGER_FUNCTION, RESTORE_FLAGS, RUNBOOK,
  SCHEMA_VERSION_SQL, TABLE_COUNT_SQL, compareAttachments, compareTableCounts, flywayOrder, judgeAuditLedger,
  parseChecksums, parseFileListing, parseLedgerTriggers, parseManifest, parseTableCounts, postgresImage, readMigrations,
  runbookDrillChecks,
} from './restore-drill.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runbook = readFileSync(path.join(ROOT, RUNBOOK), 'utf8').replace(/\r\n/gu, '\n');
const normalize = sql => sql.replace(/\s+/gu, ' ').replace(/\s*;\s*$/u, '').trim();
const heredocs = (text, delimiter) => [...text.matchAll(new RegExp(`<<'${delimiter}'\\n([\\s\\S]*?)\\n${delimiter}\\n`, 'gu'))].map(match => match[1]);

function checkListDrift(runbookIds, toolIds) {
  return { onlyRunbook: runbookIds.filter(id => !toolIds.includes(id)), onlyTool: toolIds.filter(id => !runbookIds.includes(id)),
    order: runbookIds.join(',') === toolIds.join(',') };
}

test('런북 §5.1 의 확인 항목 표가 훈련 도구가 실제로 실행하는 확인 목록과 같다', () => {
  const ids = runbookDrillChecks(runbook);
  const drift = checkListDrift(ids, DRILL_CHECKS);
  assert.deepEqual(drift.onlyRunbook, [], `런북에만 있는 확인: ${drift.onlyRunbook.join(', ')} — 도구가 수행하지 않는다`);
  assert.deepEqual(drift.onlyTool, [], `도구에만 있는 확인: ${drift.onlyTool.join(', ')} — 런북 §5.1 표에 적는다`);
  assert.ok(drift.order, `확인 순서가 다르다: 런북 ${ids.join(',')} / 도구 ${DRILL_CHECKS.join(',')}`);
  // 대조군: 표에서 한 줄을 지우면 이 판정이 드리프트를 보고한다.
  const withoutRow = runbook.replace(/^\| `audit-ledger` \|.*\n/mu, '');
  assert.deepEqual(checkListDrift(runbookDrillChecks(withoutRow), DRILL_CHECKS).onlyTool, ['audit-ledger']);
  assert.deepEqual(runbookDrillChecks('# 표 없음\n'), []);
});

test('런북 §2·§3 의 행 수·스키마 버전 질의가 훈련 도구의 질의와 같다', () => {
  const counts = heredocs(runbook, 'TABLE_COUNTS_SQL');
  assert.equal(counts.length, 2, '백업(§2)과 복원(§3-1)의 행 수 질의가 각각 하나여야 한다');
  for (const sql of counts) assert.equal(normalize(sql), normalize(TABLE_COUNT_SQL), '런북의 행 수 질의가 도구와 다르다');
  const flattened = runbook.replace(/\s+/gu, ' ');
  assert.ok(flattened.includes(normalize(SCHEMA_VERSION_SQL)), '런북 §2 에 도구와 같은 스키마 버전 질의가 없다');
  for (const match of flattened.matchAll(/FROM flyway_schema_history WHERE success(?! AND version IS NOT NULL)/gu)) {
    assert.fail(`버전 없는 반복 마이그레이션 행을 빼지 않는 질의가 남았다: ${flattened.slice(match.index, match.index + 80)}`);
  }
  assert.notEqual(normalize(TABLE_COUNT_SQL.replace("table_type = 'BASE TABLE'", "table_type = 'VIEW'")), normalize(counts[0]));
});

test('런북의 백업 세트 파일 목록과 복원 선택지가 훈련 도구와 같다', () => {
  const sealed = /sha256sum ((?:[\w.-]+ )+)> sha256\.txt/u.exec(runbook);
  assert.ok(sealed, '런북 §2 의 sha256sum 봉인 줄을 찾지 못했다');
  assert.deepEqual(sealed[1].trim().split(' ').sort(), [...BACKUP_SET_FILES].sort(), '§2 가 봉인하는 파일과 도구가 요구하는 파일이 다르다');
  const verified = /for file in ((?:[\w.-]+ )*[\w.-]+); do/u.exec(runbook);
  assert.ok(verified, '런북 §3 의 백업 세트 존재 검사를 찾지 못했다');
  assert.deepEqual(verified[1].split(' ').sort(), [...BACKUP_SET_FILES, CHECKSUM_FILE].sort(), '§3 이 확인하는 파일 목록이 다르다');
  const restores = runbook.split('\n').filter(line => /\bpg_restore\b/u.test(line) && /\s-d\s/u.test(line) && !line.includes('--list'));
  assert.ok(restores.length >= 1, '런북 §3 의 pg_restore 복원 명령을 찾지 못했다');
  for (const line of restores) {
    for (const flag of RESTORE_FLAGS) assert.ok(line.includes(flag), `런북의 복원 명령에 ${flag} 가 없다: ${line.trim()}`);
  }
});

test('감사 원장 트리거의 기대 집합을 원본 V2 사슬과 pg_dump baseline 형식 모두에서 읽는다', () => {
  const triggers = parseLedgerTriggers(readMigrations(path.join(ROOT, DEFAULT_MIGRATIONS)));
  assert.deepEqual(triggers.map(entry => entry.table), ['tb_authrt_chg_hstry', 'tb_privacy_log', 'tb_sys_adt_log']);
  for (const { table, trigger } of triggers) assert.equal(trigger, `tr_${table}_chg_prhb`);
  const dumped = `CREATE TRIGGER tr_tb_sys_adt_log_chg_prhb BEFORE DELETE OR UPDATE ON public.tb_sys_adt_log FOR EACH ROW EXECUTE FUNCTION public.${LEDGER_FUNCTION}();`;
  assert.deepEqual(parseLedgerTriggers([{ text: dumped }]), [{ table: 'tb_sys_adt_log', trigger: 'tr_tb_sys_adt_log_chg_prhb' }]);
  assert.deepEqual(parseLedgerTriggers([{ text: dumped }, { text: 'DROP TRIGGER IF EXISTS tr_tb_sys_adt_log_chg_prhb ON tb_sys_adt_log;' }]), []);
  assert.deepEqual(parseLedgerTriggers([{ text: `-- ${dumped}\n/* ${dumped} */` }]), [], '주석 속 정의를 기대 집합에 넣지 않는다');
  assert.deepEqual(flywayOrder(['R__seed.sql', 'V2_10__b.sql', 'V2_9__a.sql', 'V1_0__baseline.sql', 'README.md']),
    ['V1_0__baseline.sql', 'V2_9__a.sql', 'V2_10__b.sql', 'R__seed.sql']);
});

test('감사 원장 판정은 없음·비활성·종류 다름·통과한 수정을 실패로 본다', () => {
  const expected = [{ table: 'tb_privacy_log', trigger: 'tr_tb_privacy_log_chg_prhb' }];
  const healthy = [{ table: 'tb_privacy_log', trigger: 'tr_tb_privacy_log_chg_prhb', enabled: 'O', type: 27 }];
  const rejected = [{ table: 'tb_privacy_log', operation: 'UPDATE', result: 'rejected' }, { table: 'tb_privacy_log', operation: 'DELETE', result: 'empty' }];
  assert.equal(judgeAuditLedger(expected, healthy, rejected).passed, true);
  assert.match(judgeAuditLedger(expected, [], rejected).problems.join(), /복원본에 없음/u);
  assert.match(judgeAuditLedger(expected, [{ ...healthy[0], enabled: 'D' }], rejected).problems.join(), /활성 상태가 D/u);
  assert.match(judgeAuditLedger(expected, [{ ...healthy[0], type: 19 }], rejected).problems.join(), /BEFORE UPDATE OR DELETE ROW/u);
  assert.match(judgeAuditLedger(expected, healthy, [{ table: 'tb_privacy_log', operation: 'DELETE', result: 'accepted' }]).problems.join(), /거부되지 않음/u);
  assert.match(judgeAuditLedger([], [], []).problems.join(), /찾지 못함/u);
});

test('행 수 대조는 없는 표·늘어난 표·다른 수를 모두 잡는다', () => {
  const expected = parseTableCounts('tb_a\t2\ntb_b\t0\n');
  assert.equal(compareTableCounts(expected, parseTableCounts('tb_a\t2\ntb_b\t0\n')).passed, true);
  const drift = compareTableCounts(expected, parseTableCounts('tb_a\t1\ntb_c\t5\n'));
  assert.deepEqual([drift.missing, drift.extra, drift.different], [['tb_b'], ['tb_c'], [{ table: 'tb_a', expected: 2, actual: 1 }]]);
  assert.equal(drift.passed, false);
  assert.throws(() => parseTableCounts('tb_a 2\n'), /표<TAB>행 수/u);
  assert.throws(() => parseTableCounts('tb_a\t2\ntb_a\t3\n'), /두 번/u);
  assert.throws(() => parseTableCounts(''), /비어/u);
  assert.ok(CORE_TABLES.every(table => /^[a-z_][a-z0-9_]*$/u.test(table)));
});

test('첨부 대조는 실물 부재·크기 차이를 실패로, 메타 없는 실물을 고아 후보로 본다', () => {
  const files = parseFileListing('5\tuploads/general/1/a.txt\u00003\tuploads/general/2/b.txt\u00009\tuploads/general/9/orphan.txt\u00001\tuploads/.deletions/x.object\u0000');
  const meta = [['general/1', 'a.txt', 5], ['general/2', 'b.txt', 3]];
  const healthy = compareAttachments(meta, files);
  assert.deepEqual([healthy.passed, healthy.missing, healthy.sizeMismatch, healthy.orphanCandidates], [true, 0, 0, 1]);
  assert.deepEqual(healthy.samples.orphanCandidates, ['uploads/general/9/orphan.txt'], '.deletions 는 고아 후보로 세지 않는다');
  const broken = compareAttachments([...meta, ['general/3', 'c.txt', 1], ['general/2', 'b.txt', 4], ['general/4', ' ', 1],
    ['../../etc', 'passwd', null]], files);
  assert.deepEqual([broken.passed, broken.missing, broken.sizeMismatch], [false, 3, 1]);
  assert.throws(() => parseFileListing('x\tpath\u0000'), /첨부 목록/u);
});

test('백업 세트의 manifest·checksum 형식이 런북 §2 의 출력과 같아야 한다', () => {
  const manifest = ['stamp=20261019T170000Z', 'algorithm_key_id=kms-key-v3', `api_image_ref=registry.example/egov/api@sha256:${'a'.repeat(64)}`,
    `frontend_image_ref=registry.example/egov/frontend@sha256:${'b'.repeat(64)}`, `release_revision=${'c'.repeat(40)}`,
    `compose_base_sha256=${'d'.repeat(64)}`, `compose_prod_sha256=${'e'.repeat(64)}`].join('\n');
  assert.equal(parseManifest(manifest).stamp, '20261019T170000Z');
  assert.throws(() => parseManifest(manifest.replace('@sha256:', ':latest@x')), /digest 고정/u);
  assert.throws(() => parseManifest(`${manifest}\nstamp=20261019T170000Z`), /두 번/u);
  assert.throws(() => parseManifest(manifest.replace(/^release_revision=.*$/mu, '')), /release_revision 가 없다/u);
  const checksums = BACKUP_SET_FILES.map((file, index) => `${String(index).repeat(64)}  ${file}`).join('\n');
  assert.equal(parseChecksums(checksums).size, BACKUP_SET_FILES.length);
  assert.throws(() => parseChecksums(checksums.split('\n').filter(line => !line.endsWith('table-counts.tsv')).join('\n')),
    /이전 절차의 백업은 행 수 기준이 없어/u);
  assert.throws(() => parseChecksums(`${checksums}\n${'f'.repeat(64)}  extra.bin`), /파일 목록/u);
});

test('훈련 DB 는 compose db 서비스와 같은 PostgreSQL digest 를 쓴다', () => {
  const compose = readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
  assert.match(postgresImage(compose), /^postgres:17@sha256:[0-9a-f]{64}$/u);
  assert.throws(() => postgresImage(compose.replace(/(image: postgres:17)@sha256:[0-9a-f]{64}/u, '$1')), /digest/u);
});
