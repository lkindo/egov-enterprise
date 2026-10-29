/**
 * 갈래 통합 점검(scripts/integration-precheck.mjs, `npm run verify:integrate`)의 판정을 고정한다. 붉은 예는 2026-10 통합 PR 의 실제
 * 사건이다 — #943 의 V2_135 번호 중복(90332c2ca), 퇴역 마이그레이션이 그 표에 행을 넣는 옛 replay 시험을 깬 것(387ec3f02).
 * verify.mjs 의 integrate 순서와 실패 전파는 pre-push-ref-contract.test.mjs 가 고정한다.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  COMPOSER_UI_TEST, MIGRATION_DIRECTORY, compareVersions, entityTables, flywayConflicts, integrationPrecheck, parseMigrationName,
  selectChangedE2e, selectIntegrationChecks, selectedCommands, testClassName, touchedTables, workingTreeChanges,
} from './integration-precheck.mjs';

test('Flyway names and versions compare the way Flyway does', () => {
  assert.deepEqual(parseMigrationName('V2_135__retire_internet_service_guidance.sql'), { kind: 'V', version: [2, 135], text: '2.135' });
  assert.deepEqual(parseMigrationName('R__seed_framework.sql'), { kind: 'R', version: null, text: null });
  assert.equal(parseMigrationName('README.md'), null);
  assert.equal(compareVersions([2, 9], [2, 10]), -1);
  assert.equal(compareVersions([2, 5], [2, 5, 0]), 0);
  assert.equal(compareVersions([2, 136], [2, 135]), 1);
});

test('two branches that take the same Flyway number, or a number at or below the base, are red', () => {
  const baseNames = ['V2_133__a.sql', 'V2_134__retire_report_stats_menu.sql', 'R__seed_framework.sql'];
  // #943: 두 갈래가 모두 V2_135 를 더했다.
  const duplicate = flywayConflicts({
    baseNames,
    headNames: [...baseNames, 'V2_135__retire_internet_service_guidance.sql', 'V2_135__add_scrap_owner_url_unique.sql'],
    changes: [{ status: 'A', name: 'V2_135__retire_internet_service_guidance.sql' }, { status: 'A', name: 'V2_135__add_scrap_owner_url_unique.sql' }],
  });
  assert.deepEqual(duplicate, ['Flyway 버전 2.135 이 둘 이상입니다: V2_135__add_scrap_owner_url_unique.sql, V2_135__retire_internet_service_guidance.sql'
    + ' — 나중에 합친 갈래의 번호를 기준의 최신 다음으로 바꾸십시오.']);
  // 기준이 이미 V2_135 까지 갔는데 갈래가 V2_135 를 더했다 — 중복이자 순서 밖이다. 0 을 덧붙인 같은 버전도 같다.
  const behind = flywayConflicts({
    baseNames: [...baseNames, 'V2_135__base.sql'],
    headNames: [...baseNames, 'V2_135__base.sql', 'V2_135_0__branch.sql'],
    changes: [{ status: 'A', name: 'V2_135_0__branch.sql' }],
  });
  assert.equal(behind.length, 2);
  assert.match(behind[0], /^Flyway 버전 2\.135 이 둘 이상입니다/u);
  assert.match(behind[1], /^V2_135_0__branch\.sql: 새 마이그레이션이 기준의 최신 버전\(2\.135\)보다 크지 않습니다/u);
  // 적용된 마이그레이션을 고치거나 지우면 붉다. 반복 마이그레이션은 고쳐도 되고, 최신 다음 번호의 새 마이그레이션은 초록이다.
  const edited = flywayConflicts({
    baseNames, headNames: baseNames.filter((name) => name !== 'V2_133__a.sql'),
    changes: [{ status: 'M', name: 'V2_134__retire_report_stats_menu.sql' }, { status: 'D', name: 'V2_133__a.sql' }, { status: 'M', name: 'R__seed_framework.sql' }],
  });
  assert.deepEqual(edited.map((message) => message.split(':')[0]), ['V2_134__retire_report_stats_menu.sql', 'V2_133__a.sql']);
  assert.deepEqual(flywayConflicts({ baseNames, headNames: [...baseNames, 'V2_135__next.sql'], changes: [{ status: 'A', name: 'V2_135__next.sql' }] }), []);
});

test('the Flyway check reads the base ref and the working tree, including uncommitted and untracked files', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'integration-precheck-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  try {
    git('init', '-q');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'test');
    git('config', 'core.autocrlf', 'false');
    const directory = path.join(root, MIGRATION_DIRECTORY);
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, 'V2_1__a.sql'), 'CREATE TABLE tb_a (id bigint);\n');
    writeFileSync(path.join(directory, 'V2_2__b.sql'), 'CREATE TABLE tb_b (id bigint);\n');
    git('add', '.');
    git('commit', '-q', '-m', 'base');
    git('tag', 'base');
    assert.deepEqual((await integrationPrecheck(root, 'base', { menus: false })).errors, []);
    // 바뀐 마이그레이션이 없으면 메뉴 스냅숏을 보지 않는다.
    assert.deepEqual((await integrationPrecheck(root, 'base')).notices, []);
    // 다른 갈래의 같은 번호(추적하지 않는 새 파일)와 적용된 마이그레이션의 수정(커밋하지 않은 변경).
    writeFileSync(path.join(directory, 'V2_2__other_branch.sql'), 'ALTER TABLE tb_b ADD COLUMN x int;\n');
    writeFileSync(path.join(directory, 'V2_1__a.sql'), 'CREATE TABLE tb_a (id bigint, y int);\n');
    const { errors, migrationChanges } = await integrationPrecheck(root, 'base', { menus: false });
    assert.deepEqual(migrationChanges.map(({ status, name }) => `${status} ${name}`).sort(), ['A V2_2__other_branch.sql', 'M V2_1__a.sql']);
    assert.equal(errors.length, 3, errors.join('\n'));
    assert.ok(errors.some((message) => message.startsWith('Flyway 버전 2.2 이 둘 이상입니다')));
    assert.ok(errors.some((message) => message.startsWith('V2_1__a.sql: 기준에 있는 마이그레이션을 고쳤습니다')));
    await assert.rejects(() => integrationPrecheck(root, 'no-such-ref', { menus: false }));
    // 메뉴 스냅숏은 regen --check 의 손 결속 사전 점검과 같은 점검(MENU_SNAPSHOT_PRECHECK)으로 본다 — 이 임시 저장소에는 스냅숏이 없다.
    const { notices } = await integrationPrecheck(root, 'base');
    assert.equal(notices.length, 1, notices.join('\n'));
    assert.match(notices[0], /MENU_SNAPSHOT_STALE: Composer menu snapshot: snapshot file is missing or unreadable/u);
    assert.match(notices[0], /npm run project:menus:refresh/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('changed migrations and entities select the schema-validation tests that name their tables or versions', () => {
  assert.deepEqual(touchedTables([
    '-- tb_comment_only 는 주석이다',
    'CREATE TABLE IF NOT EXISTS public.tb_new (id bigint REFERENCES tb_parent(id));',
    'ALTER TABLE ONLY tb_bbs_scrap ADD CONSTRAINT u UNIQUE (a);',
    'INSERT INTO tb_menu_info VALUES (1); UPDATE "tb_authrt_grnt_map" SET x = 1; DELETE FROM tb_authrt_chg_hstry;',
    'CREATE INDEX ix ON tb_log USING btree (created); COMMENT ON COLUMN tb_user.nm IS \'x\';',
  ].join('\n')), ['tb_authrt_chg_hstry', 'tb_authrt_grnt_map', 'tb_bbs_scrap', 'tb_log', 'tb_menu_info', 'tb_new', 'tb_parent', 'tb_user']);
  assert.deepEqual(entityTables('@Entity\n@Table(name = "tb_bbs_scrap")\nclass Scrap {}'), ['tb_bbs_scrap']);
  assert.equal(entityTables('@Entity\nclass Unnamed {}'), null);
  assert.deepEqual(entityTables('class NotAnEntity {}'), []);

  const sources = {
    'api-server/src/test/java/nuri/api/schema/InternetServiceGuidanceBigintMigrationIntegrationTest.java': 'INSERT INTO tb_intrn_svc VALUES (1)',
    'api-server/src/test/java/nuri/api/schema/ScrapOwnerUrlUniqueMigrationIntegrationTest.java': 'flyway target V2_136 tb_bbs_scrap',
    'api-server/src/test/java/nuri/api/schema/UnrelatedIntegrationTest.java': 'tb_other tb_intrn_svc_history',
  };
  const migration = (name, sql) => ({ change: { status: 'A', path: `${MIGRATION_DIRECTORY}/${name}` }, sql });
  const select = (rows, extra = {}) => selectIntegrationChecks({
    changes: rows.map((row) => row.change),
    readText: (file) => extra[file] ?? rows.find((row) => row.change.path === file)?.sql ?? sources[file] ?? '',
    schemaSources: Object.keys(sources),
  });
  // 387ec3f02: 퇴역 마이그레이션이 그 표에 행을 넣는 옛 replay 시험을 깼다 — 표 이름을 쓰는 시험을 고른다(접두가 같은 다른 표는 아니다).
  assert.deepEqual(select([migration('V2_135__retire_internet_service_guidance.sql', 'DROP TABLE tb_intrn_svc;')]).schema,
    { mode: 'selected', classes: ['nuri.api.schema.InternetServiceGuidanceBigintMigrationIntegrationTest'], reason: '테이블 tb_intrn_svc · 버전 2.135 을 쓰는 시험' });
  assert.deepEqual(select([migration('V2_136__add_scrap_owner_url_unique.sql', 'CREATE UNIQUE INDEX u ON tb_unmentioned (a);')]).schema.classes,
    ['nuri.api.schema.ScrapOwnerUrlUniqueMigrationIntegrationTest'], '버전으로도 고른다');
  assert.equal(select([migration('V2_137__noop.sql', 'SELECT 1;')]).schema.mode, 'all', '테이블을 읽지 못한 마이그레이션은 고를 수 없다');
  // 고를 수 없으면 전체다 — 닿는 시험이 없거나, 지운 마이그레이션·테이블 없는 엔티티가 있다.
  assert.equal(select([migration('V2_137__new.sql', 'CREATE TABLE tb_brand_new (id bigint);')]).schema.mode, 'all');
  assert.equal(select([{ change: { status: 'D', path: `${MIGRATION_DIRECTORY}/V2_100__old.sql` }, sql: '' }]).schema.mode, 'all');
  const entity = { change: { status: 'M', path: 'business-core/src/main/java/nuri/X.java' }, sql: '@Entity\nclass X {}' };
  assert.equal(select([entity]).schema.mode, 'all');
  assert.equal(select([{ change: { status: 'M', path: 'frontend/src/app/page.tsx' }, sql: '' }]).schema.mode, 'none');
  // 생성기 화면 시험은 카탈로그·생성기 화면 입력이 바뀌면 돈다. 다른 계약 시험 파일만 바꾸면 돌지 않는다.
  for (const [file, expected] of [['config/modules/board.json', true], ['tools/project-composer/public/app.js', true],
    ['scripts/project-composer-catalog.mjs', true], ['scripts/project-composer-catalog.test.mjs', false], ['scripts/verify.mjs', false]]) {
    assert.equal(select([{ change: { status: 'M', path: file }, sql: '' }]).composerUi, expected, file);
  }
});

test('the selection becomes Gradle and node commands with safe test class names only', () => {
  assert.equal(testClassName('api-server/src/test/java/nuri/api/schema/FooIntegrationTest.java'), 'nuri.api.schema.FooIntegrationTest');
  assert.throws(() => testClassName('api-server/src/main/java/nuri/Foo.java'), /시험 소스가 아닙니다/u);
  assert.deepEqual(selectedCommands({ schema: { mode: 'selected', classes: ['nuri.api.schema.A', 'nuri.api.schema.B'] }, composerUi: true }, { windows: false }), [
    './gradlew :api-server:schemaValidationTest --tests nuri.api.schema.A --tests nuri.api.schema.B --console=plain -Dfile.encoding=UTF-8',
    COMPOSER_UI_TEST,
  ]);
  assert.deepEqual(selectedCommands({ schema: { mode: 'all', classes: [] }, composerUi: false }, { windows: true }),
    ['.\\gradlew.bat :api-server:schemaValidationTest --console=plain -Dfile.encoding=UTF-8']);
  assert.deepEqual(selectedCommands({ schema: { mode: 'none', classes: [] }, composerUi: false }), []);
  assert.throws(() => selectedCommands({ schema: { mode: 'selected', classes: ['nuri.A; rm -rf /'] }, composerUi: false }), /시험 클래스 이름이 아닙니다/u);
});

test('changed E2E specs are selected once while unrelated product changes do not trigger E2E', () => {
  const changes = [
    { status: 'M', path: 'frontend/e2e/journeys/audit-log.spec.ts' },
    { status: 'A', path: 'frontend/e2e/contracts/schedules.spec.ts' },
    { status: 'M', path: 'frontend/e2e/quality/accessibility.spec.ts' },
    { status: 'M', path: 'frontend/e2e/contracts/schedules.spec.ts' },
    { status: 'M', path: 'frontend/src/app/page.tsx' },
  ];
  assert.deepEqual(selectChangedE2e(changes), {
    mode: 'selected',
    specs: ['e2e/contracts/schedules.spec.ts', 'e2e/journeys/audit-log.spec.ts', 'e2e/quality/accessibility.spec.ts'],
    reason: '추가·수정한 E2E spec',
  });
  assert.equal(selectIntegrationChecks({ changes, readText: () => '', schemaSources: [] }).e2e.mode, 'selected');
  assert.deepEqual(selectChangedE2e([
    { status: 'M', path: 'frontend/src/app/page.tsx' },
    { status: 'M', path: 'scripts/e2e-isolation.test.mjs' },
    { status: 'M', path: 'scripts/integration-precheck.mjs' },
    { status: 'M', path: 'scripts/verify.mjs' },
    { status: 'M', path: 'docs/03-guides/cicd-pipeline.md' },
  ]), { mode: 'none', specs: [], reason: 'E2E spec·공용 실행 입력 변경 없음' });
});

test('deleted, renamed or unclassified E2E changes and shared runtime inputs require both complete projects', () => {
  for (const change of [
    { status: 'D', path: 'frontend/e2e/contracts/schedules.spec.ts' },
    { status: 'R', path: 'frontend/e2e/contracts/schedules.spec.ts' },
    { status: 'T', path: 'frontend/e2e/contracts/schedules.spec.ts' },
    ...[
      'frontend/e2e/fixtures/global-setup.ts', 'frontend/e2e/scripts/cleanup-db.ts',
      'frontend/e2e/auth.setup.ts', 'frontend/e2e/helpers/xlsx-download.ts', 'frontend/e2e/pages/schedule-page.ts',
      'frontend/e2e/contracts/local-helper.ts', 'frontend/playwright.config.ts',
      'frontend/package.json', 'frontend/pnpm-lock.yaml', 'frontend/tsconfig.e2e.json',
      'package.json', 'package-lock.json', 'pnpm-lock.yaml',
      'scripts/run-isolated-e2e.mjs', 'scripts/e2e-isolation.mjs', 'scripts/playwright-result-contract.mjs',
    ].map(file => ({ status: 'M', path: file })),
  ]) {
    const result = selectChangedE2e([{ status: 'A', path: 'frontend/e2e/contracts/new.spec.ts' }, change]);
    assert.equal(result.mode, 'all', JSON.stringify(change));
    assert.deepEqual(result.specs, [], JSON.stringify(change));
  }
  assert.equal(selectChangedE2e([
    { status: 'D', path: 'frontend/e2e/contracts/old.spec.ts' },
    { status: 'A', path: 'frontend/e2e/contracts/new.spec.ts' },
  ]).mode, 'all', 'git --no-renames exposes both paths of a move');
  assert.throws(() => selectChangedE2e([{ status: 'M', path: 'frontend/e2e/enterprise-task-lab/enterprise-task-quality.spec.ts' }]),
    /전용 E2E 설정 변경은 별도 검증이 필요합니다/u);
  assert.throws(() => selectChangedE2e([
    { status: 'M', path: 'scripts/run-isolated-e2e.mjs' },
    { status: 'M', path: 'frontend/playwright.enterprise-task-lab.config.ts' },
  ]), /전용 E2E 설정 변경은 별도 검증이 필요합니다/u, 'a shared-input fallback must not conceal a dedicated project');
  assert.throws(() => selectChangedE2e([
    { status: 'M', path: 'frontend/e2e/fixtures/global-setup.ts' },
    { status: 'A', path: 'frontend/e2e/unknown/uncollected.spec.ts' },
  ]),
    /기본 Playwright 프로젝트에 포함되지 않는/u);
});

test('selected E2E uses the isolated runner after other checks and rejects unsafe or empty filters', () => {
  const selection = {
    schema: { mode: 'all', classes: [] }, composerUi: true,
    e2e: { mode: 'selected', specs: ['e2e/contracts/schedules.spec.ts', 'e2e/journeys/audit-log.spec.ts'] },
  };
  const runner = 'node scripts/run-isolated-e2e.mjs -- --project=api-contract --project=full-suite';
  assert.deepEqual(selectedCommands(selection, { windows: false }), [
    './gradlew :api-server:schemaValidationTest --console=plain -Dfile.encoding=UTF-8', COMPOSER_UI_TEST,
    `${runner} e2e/contracts/schedules.spec.ts e2e/journeys/audit-log.spec.ts`,
  ]);
  const commands = e2e => selectedCommands({ schema: { mode: 'none', classes: [] }, composerUi: false, e2e });
  assert.deepEqual(commands({ mode: 'all', specs: [] }), [runner]);
  assert.deepEqual(commands({ mode: 'none', specs: [] }), []);
  for (const e2e of [{ mode: 'selected', specs: [] }, { mode: 'invalid', specs: [] },
    { mode: 'all', specs: ['e2e/contracts/a.spec.ts'] }, { mode: 'none', specs: ['e2e/contracts/a.spec.ts'] }]) {
    assert.throws(() => commands(e2e), /E2E 선별 결과가 올바르지 않습니다/u);
  }
  for (const file of ['e2e/contracts/a.spec.ts; echo unsafe', 'e2e/contracts/../../a.spec.ts',
    'e2e/contracts/./a.spec.ts', 'e2e/contracts/a b.spec.ts', '--grep=skip', 'e2e/unknown/a.spec.ts']) {
    assert.throws(() => commands({ mode: 'selected', specs: [file] }), /E2E spec 경로가 올바르지 않습니다/u, file);
  }
});

test('E2E selection includes the base range, index, working tree and untracked files, and preserves deleted rename sources', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'integration-precheck-e2e-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  const files = ['committed', 'staged', 'unstaged', 'rename'].map(name => `frontend/e2e/contracts/${name}.spec.ts`);
  const put = (file, text) => writeFileSync(path.join(root, file), text);
  try {
    git('init', '-q');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'test');
    git('config', 'core.autocrlf', 'false');
    mkdirSync(path.join(root, 'frontend/e2e/contracts'), { recursive: true });
    for (const file of files) put(file, 'base\n');
    git('add', '.');
    git('commit', '-q', '-m', 'base');
    git('tag', 'base');
    put(files[0], 'committed\n');
    git('add', files[0]);
    git('commit', '-q', '-m', 'branch');
    put(files[1], 'staged\n');
    git('add', files[1]);
    put(files[1], 'base\n'); // base→worktree alone misses this staged change.
    put(files[2], 'unstaged\n');
    const untracked = 'frontend/e2e/contracts/untracked.spec.ts';
    put(untracked, 'untracked\n');
    const changes = workingTreeChanges(root, 'base');
    assert.deepEqual(changes.map(row => `${row.status} ${row.path}`).sort(),
      [...files.slice(0, 3).map(file => `M ${file}`), `A ${untracked}`].sort());
    assert.deepEqual(selectChangedE2e(changes).specs,
      [...files.slice(0, 3), untracked].map(file => file.slice('frontend/'.length)).sort());
    renameSync(path.join(root, files[3]), path.join(root, 'frontend/e2e/contracts/renamed.spec.ts'));
    const renamed = workingTreeChanges(root, 'base');
    assert.ok(renamed.some(row => row.status === 'D' && row.path === files[3]));
    assert.ok(renamed.some(row => row.status === 'A' && row.path.endsWith('/renamed.spec.ts')));
    assert.equal(selectChangedE2e(renamed).mode, 'all');
  } finally {
    const relative = path.relative(path.resolve(tmpdir()), path.resolve(root));
    assert.ok(relative.startsWith('integration-precheck-e2e-') && !relative.includes(path.sep) && !path.isAbsolute(relative),
      'delete only the allocated temporary test repository');
    rmSync(root, { recursive: true, force: true });
  }
});
