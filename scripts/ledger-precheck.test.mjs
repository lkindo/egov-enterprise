/**
 * 손 결속 원장 사전 점검(scripts/ledger-precheck.mjs — `npm run regen -- --check` 의 hand-bound-ledgers)의 계약.
 *
 * 붉은 예는 실제로 push 를 거부시킨 모양 그대로다 — gates.json 에 등록하지 않은 @Tag("schema-validation") 시험(2026-10-19),
 * 기능 파일에서 빠진 CMS_PURGE 안내 행(2026-10-26), 갱신하지 않은 메뉴 스냅숏 해시(PR #897·#978). 원본 설정은 고치지 않고 자료만
 * 임시 복사본으로 바꾼다. 판정 자체는 운영 계약(governance-gates-contract·project-composer 시험)이 고정하므로, 여기서는 그 판정 함수에
 * 이어졌는지·코드 라벨과 고치는 법이 regen --check 출력까지 가는지·판정 모듈이 없을 때만 건너뛰는지를 고정한다.
 */
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { JAVA_GATE_SCAN_ROOTS, loadGovernanceRegistry } from './governance-gates-contract.mjs';
import { GATE_REGISTRY, LEDGER_PRECHECKS, formatPrecheck, ledgerPrecheck, main } from './ledger-precheck.mjs';
import { LEDGER_CHECKS, checkGenerated, checkTasks } from './regenerate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = 'api-server/src/main/resources/db/migration';
const MENU_SNAPSHOT = 'config/project-composer-menus.json';
const SCHEMA_ROOT = 'api-server/src/test/java/nuri/api/schema';
const CMS_MODULE = 'config/modules/cms.json';
// PR #978(b142cda0a) 바로 앞 커밋(40c3b9790)의 메뉴 스냅숏 해시 — 메뉴에 닿는 CMS 마이그레이션을 더하고 스냅숏을 갱신하지 않았다면 남았을 값이다.
const OLD_MENU_HASH = '29629f4355c91165b9f9e7dedec035bc636005c5980493fbb7ff12d9cff2b20d';

const STALE_MENU = 'Composer menu snapshot: stale migration hash; refresh from an owned migrated database';
const MISSING_CMS_PURGE = 'project-composer unassigned permissions: unassigned permission lacks guidance: CMS_PURGE';
const unregistered = name => `unregistered tagged gate in GATESET-SCHEMA-VALIDATION: ${SCHEMA_ROOT}/${name}.java`;

function scratch(t, prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => {
    const owned = resolve(root);
    assert.equal(dirname(owned), resolve(tmpdir()));
    assert.ok(basename(owned).startsWith(prefix));
    rmSync(owned, { recursive: true, force: true });
  });
  return root;
}

const put = (root, file, text) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); };
const schemaTest = name => ['package nuri.api.schema;', 'import org.junit.jupiter.api.Tag;', 'import org.junit.jupiter.api.Test;',
  '@Tag("schema-validation")', `class ${name} {`, '    @Test', '    void replaysToLatest() {}', '}', ''].join('\n');

/**
 * 세 점검이 읽는 자료만 담은 트리 — 기능 파일·권한 원장·메뉴 스냅숏·마이그레이션은 원본 복사본이고, 게이트 원장은 실제 schema-validation
 * 선택자에 등록 시험 하나만 둔다(원본 Java 시험 트리 전체를 복사하지 않는다). 처음에는 세 점검 모두 초록이다.
 */
function fixture(t) {
  const root = scratch(t, 'ledger-precheck-');
  const copy = file => { mkdirSync(dirname(join(root, file)), { recursive: true }); cpSync(join(ROOT, file), join(root, file), { recursive: true }); };
  for (const file of ['config/modules', 'config/governance/permission-catalog.json', 'config/governance/permission-bundles.json', MENU_SNAPSHOT,
    MIGRATIONS, 'api-server/src/main/resources/db/cutover/authorization-contract.sql']) copy(file);
  for (const scanRoot of JAVA_GATE_SCAN_ROOTS) mkdirSync(join(root, scanRoot), { recursive: true });
  put(root, `${SCHEMA_ROOT}/RegisteredSchemaTest.java`, schemaTest('RegisteredSchemaTest'));
  const real = loadGovernanceRegistry(join(ROOT, GATE_REGISTRY)).gateSets.find(({ id }) => id === 'GATESET-SCHEMA-VALIDATION');
  put(root, GATE_REGISTRY, `${JSON.stringify({ gateSets: [{ ...real, rules: [{ id: 'SCHEMA-REGISTERED', source: `${SCHEMA_ROOT}/RegisteredSchemaTest.java` }] }] }, null, 2)}\n`);
  return root;
}

const editJson = (root, file, edit) => {
  const value = JSON.parse(readFileSync(join(root, file), 'utf8'));
  edit(value);
  writeFileSync(join(root, file), `${JSON.stringify(value, null, 2)}\n`);
};
const findings = async root => (await ledgerPrecheck({ root })).findings.map(({ code, message }) => [code, message]);

test('세 점검은 실제 판정 모듈을 가리키고 코드가 겹치지 않으며, CLI 는 인자를 받지 않는다', async () => {
  assert.deepEqual(LEDGER_PRECHECKS.map(check => check.code), ['TAGGED_GATE_REGISTRY', 'MENU_SNAPSHOT_STALE', 'UNASSIGNED_PERMISSION_GUIDANCE']);
  for (const check of LEDGER_PRECHECKS) {
    assert.ok(readFileSync(join(ROOT, check.requires), 'utf8').length > 0, `${check.code}: ${check.requires} 이 없다`);
    assert.match(check.fix, /\S/u, `${check.code}: 고치는 법이 없다`);
  }
  const errors = [];
  assert.equal(await main(['--write'], { log: () => {}, error: line => errors.push(line) }), 2);
  assert.match(errors.join('\n'), /인자 없음/u);
});

test('실제 사례 셋은 각자 자기 코드 하나로만 붉고, 되돌리면 초록이다', async (t) => {
  const root = fixture(t);
  assert.deepEqual(await findings(root), [], '복사한 자료와 등록된 시험 하나는 초록이다');

  // ① 2026-10-19: 새 schema-validation 시험을 게이트 원장에 등록하지 않았다.
  put(root, `${SCHEMA_ROOT}/MenuInventorySchemaTest.java`, schemaTest('MenuInventorySchemaTest'));
  assert.deepEqual(await findings(root), [['TAGGED_GATE_REGISTRY', unregistered('MenuInventorySchemaTest')]]);
  rmSync(join(root, `${SCHEMA_ROOT}/MenuInventorySchemaTest.java`));
  assert.deepEqual(await findings(root), []);

  // ② 2026-10-26: 기본 그룹이 없는 CMS_PURGE 의 안내 행이 기능 파일에 없다.
  const cms = readFileSync(join(root, CMS_MODULE), 'utf8');
  editJson(root, CMS_MODULE, value => { value.unassignedPermissions = value.unassignedPermissions.filter(row => row.code !== 'CMS_PURGE'); });
  assert.deepEqual(await findings(root), [['UNASSIGNED_PERMISSION_GUIDANCE', MISSING_CMS_PURGE]]);
  writeFileSync(join(root, CMS_MODULE), cms);
  assert.deepEqual(await findings(root), []);

  // ③ PR #978: 메뉴에 닿는 마이그레이션을 더하고 스냅숏을 갱신하지 않았다면 남았을 옛 해시.
  const snapshot = readFileSync(join(root, MENU_SNAPSHOT), 'utf8');
  editJson(root, MENU_SNAPSHOT, value => { value.sourceMigrationHash = OLD_MENU_HASH; });
  assert.deepEqual(await findings(root), [['MENU_SNAPSHOT_STALE', STALE_MENU]]);
  writeFileSync(join(root, MENU_SNAPSHOT), snapshot);
  assert.deepEqual(await findings(root), []);
  // PR #897 의 모양: 스냅숏은 그대로인데 메뉴 inventory 에 닿는 마이그레이션이 새로 생겼다.
  put(root, `${MIGRATIONS}/V9_999__add_ledger_precheck_menu.sql`, "INSERT INTO tb_menu_info (menu_sn, menu_nm) VALUES (99999, 'probe');\n");
  assert.deepEqual(await findings(root), [['MENU_SNAPSHOT_STALE', STALE_MENU]]);
});

test('regen --check 의 손 결속 확인은 실패한 코드의 머리줄과 고치는 법을 그대로 보인다', async (t) => {
  const root = fixture(t);
  put(root, `${SCHEMA_ROOT}/MenuInventorySchemaTest.java`, schemaTest('MenuInventorySchemaTest'));
  editJson(root, CMS_MODULE, value => { value.unassignedPermissions = value.unassignedPermissions.filter(row => row.code !== 'CMS_PURGE'); });
  editJson(root, MENU_SNAPSHOT, value => { value.sourceMigrationHash = OLD_MENU_HASH; });
  // regenerate.mjs 의 hand-bound-ledgers 와 같은 발췌·안내로, 같은 CLI 진입점(main)을 자식 프로세스에서 이 임시 자료에 돌린다.
  const handBound = LEDGER_CHECKS.find(check => check.id === 'hand-bound-ledgers');
  assert.deepEqual(handBound.command, ['node', ['scripts/ledger-precheck.mjs']]);
  const entry = pathToFileURL(join(ROOT, 'scripts/ledger-precheck.mjs')).href;
  const script = `const { main } = await import(${JSON.stringify(entry)}); process.exitCode = await main([], { root: ${JSON.stringify(root)} });`;
  const tasks = checkTasks(ROOT, [], [{ ...handBound, requires: undefined, command: ['node', ['--input-type=module', '-e', script]] }]);
  const logs = [];
  const result = await checkGenerated({ cwd: ROOT, tasks, log: line => logs.push(line) });
  assert.equal(result.ok, false);
  const fix = code => LEDGER_PRECHECKS.find(check => check.code === code).fix;
  assert.equal(result.results[0].output, [
    `  - [TAGGED_GATE_REGISTRY] ${unregistered('MenuInventorySchemaTest')}`, `    → ${fix('TAGGED_GATE_REGISTRY')}`,
    `  - [MENU_SNAPSHOT_STALE] ${STALE_MENU}`, `    → ${fix('MENU_SNAPSHOT_STALE')}`,
    `  - [UNASSIGNED_PERMISSION_GUIDANCE] ${MISSING_CMS_PURGE}`, `    → ${fix('UNASSIGNED_PERMISSION_GUIDANCE')}`,
    `→ ${handBound.hint}`,
  ].join('\n'));
  // checkGenerated 는 줄마다 300자에서 자른다 — 고치는 법이 잘리지 않는다.
  for (const code of LEDGER_PRECHECKS.map(check => check.code)) assert.ok(`    → ${fix(code)}`.length <= 300, `${code}: 고치는 법이 300자를 넘는다`);
  assert.match(logs.join('\n'), /✘ hand-bound-ledgers[\s\S]*\[MENU_SNAPSHOT_STALE\] Composer menu snapshot: stale migration hash/u);
});

test('판정 모듈이 없을 때만 건너뛰고, 자료가 없으면 건너뛰지 않고 붉다', async (t) => {
  const empty = scratch(t, 'ledger-precheck-empty-');
  // 생성물처럼 판정 모듈이 없는 저장소: 세 점검을 모두 건너뛰고 그렇게 말한다(없는 모듈을 실패로 보지 않는다).
  const absent = await ledgerPrecheck({ root: empty, moduleRoot: empty });
  assert.deepEqual(absent.findings, []);
  assert.deepEqual(absent.ran, []);
  assert.deepEqual(absent.skipped, LEDGER_PRECHECKS.map(({ code, requires }) => ({ code, requires })));
  const shown = formatPrecheck(absent);
  assert.equal(shown.ok, true);
  assert.match(shown.lines.join('\n'), /^건너뜀: TAGGED_GATE_REGISTRY — scripts\/governance-gates-contract\.mjs 이 이 저장소에 없다\.$/mu);
  assert.equal(await main([], { root: empty, moduleRoot: empty, log: () => {}, error: () => {} }), 0);
  // 판정 모듈은 있는데 원장·스냅숏·기능 파일이 없다: 세 점검 모두 돌고 모두 붉다.
  const missing = await ledgerPrecheck({ root: empty });
  assert.deepEqual(missing.ran, LEDGER_PRECHECKS.map(check => check.code));
  assert.deepEqual(missing.skipped, []);
  assert.deepEqual([...new Set(missing.findings.map(finding => finding.code))], LEDGER_PRECHECKS.map(check => check.code));
  assert.ok(missing.findings.some(({ message }) => message === 'Composer menu snapshot: snapshot file is missing or unreadable'));
  assert.equal(await main([], { root: empty, log: () => {}, error: () => {} }), 1);
  // 판정 함수가 던진 여러 줄 문장도 머리줄 하나로 남는다(발췌는 머리줄만 본다).
  const thrown = await ledgerPrecheck({ root: empty, checks: [{ code: 'PROBE', requires: 'scripts/ledger-precheck.mjs', fix: 'probe',
    run: () => { throw new Error('first line\n  second line'); } }] });
  assert.deepEqual(thrown.findings, [{ code: 'PROBE', message: 'first line second line', fix: 'probe' }]);
});
