import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const overlay = 'docker-compose.authz-e2e.yml';
const readiness = 'scripts/run-isolated-readiness.mjs';
const deploy = 'scripts/deploy.sh';
const config = 'api-server/src/main/java/nuri/api/config/IsolatedAuthorizationRehearsalConfig.java';
const jobs = new Map([
  ['.github/workflows/ci.yml', 'e2e-tests'],
  ['.github/workflows/load-test.yml', 'load-test'],
  ['.github/workflows/update-visual-baseline.yml', 'update-baseline'],
  ['.github/workflows/zap-scan.yml', 'zap_scan'],
]);
const defaults = ['docker-compose.yml', 'docker-compose.prod.yml',
  'api-server/src/main/resources/application.yml', 'api-server/src/main/resources/application-prod.yml'];
const files = [...jobs.keys(), ...defaults, overlay, readiness, deploy, config];
const read = () => new Map(files.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')]));

// Inspect the executable configuration paths, without starting Docker or accepting production state as fixture evidence.
function assertWiring(sources) {
  for (const [file, job] of jobs) {
    const block = sources.get(file).match(new RegExp(`^  ${job}:\\n([\\s\\S]*?)(?=^  [a-zA-Z0-9_-]+:|$(?![\\s\\S]))`, 'm'))?.[1];
    assert.ok(block, `${file}: rehearsal job missing`);
    assert.match(block, /^    env:\n(?:      .*\n)*?      COMPOSE_FILE: docker-compose\.yml:docker-compose\.authz-e2e\.yml$/m, `${file}: overlay is not in job environment`);
    assert.match(block, /(?:run:\s*|^\s*)docker compose (?:up|build)\b/m, `${file}: compose execution missing`);
  }
  const fixture = sources.get(overlay);
  assert.match(fixture, /^      POSTGRES_DB: authz_e2e$/m);
  assert.match(fixture, /^      SPRING_PROFILES_ACTIVE: e2e$/m);
  assert.match(fixture, /^      NURI_AUTHORIZATION_ISOLATED_CUTOVER: "true"$/m);
  assert.match(fixture, /^      NURI_AUTHORIZATION_DISPOSABLE_DATABASE_ACK: CONFIRMED_DISPOSABLE_AUTHZ_DATABASE$/m);
  const json = JSON.parse(fixture.match(/SPRING_APPLICATION_JSON: >\n([\s\S]*?)(?=^volumes:)/m)?.[1] ?? '{}');
  for (const url of [json.spring?.datasource?.url, json.spring?.datasource?.['jdbc-url'], json.spring?.datasource?.hikari?.['jdbc-url']]) {
    assert.equal(url, 'jdbc:postgresql://db:5432/authz_e2e', 'fixture datasource drift');
  }
  assert.equal(json.spring.jpa.hibernate['ddl-auto'], 'validate');
  assert.match(fixture, /name: "\$\{COMPOSE_PROJECT_NAME:-egov-authz-e2e\}-database"/);
  for (const file of defaults) {
    assert.doesNotMatch(sources.get(file), /NURI_AUTHORIZATION_(?:ISOLATED_CUTOVER|DISPOSABLE_DATABASE_ACK)|isolated-cutover\s*:|docker-compose\.authz-e2e\.yml/, `${file}: ordinary startup opted into rehearsal`);
  }
  assert.match(sources.get(deploy), /^COMPOSE_FILES=\(-f docker-compose\.yml -f docker-compose\.prod\.yml\)$/m);
  assert.doesNotMatch(sources.get(deploy), /docker-compose\.authz-e2e\.yml|NURI_AUTHORIZATION_ISOLATED_CUTOVER/);
  const runner = sources.get(readiness);
  assert.match(runner, /const databaseName = 'authz_e2e_readiness'/);
  assert.match(runner, /SPRING_PROFILES_ACTIVE: 'e2e'/);
  assert.match(runner, /NURI_AUTHORIZATION_ISOLATED_CUTOVER: 'true'/);
  assert.match(runner, /NURI_AUTHORIZATION_DISPOSABLE_DATABASE_ACK: 'CONFIRMED_DISPOSABLE_AUTHZ_DATABASE'/);
  assert.match(runner, /\.filter\(\(\[key\]\) => !\/\^\(SPRING_\|DB_\|NURI_\|/);
  assert.match(runner, /DB_URL: `jdbc:postgresql:\/\/127\.0\.0\.1:\$\{port\}\/\$\{databaseName\}/);
  assert.match(runner, /function sql\(statement\) \{\s*assertOwned\(\);/);
  assert.match(runner, /if \(actual !== label\) throw new Error\('Disposable database ownership mismatch'\)/);
  const java = sources.get(config);
  assert.match(java, /@ConditionalOnProperty\(name = "nuri\.authorization\.isolated-cutover", havingValue = "true"\)/);
  assert.match(java, /!profiles\.equals\(Set\.of\("e2e"\)\)/);
  assert.match(java, /!ACK\.equals\(ack\)/);
  assert.match(java, /!expected\.equals\(actual\)/);
  const stagedMigrate = 'Flyway.configure().configuration(flyway.getConfiguration()).target("2.99").load().migrate();';
  assert.ok(java.indexOf('validateTarget(profiles,connection.getMetaData().getURL(),ack)') < java.indexOf(stagedMigrate));
  assert.ok(java.indexOf(stagedMigrate) < java.indexOf('statement.execute(new String(input.readAllBytes(),StandardCharsets.UTF_8))'));
  assert.ok(java.indexOf('connection.commit()') < java.indexOf('flyway.migrate()'));
}

test('authorization cutover rehearsal is explicit in four CI jobs and isolated local readiness only', () => {
  assertWiring(read());
});

test('missing execution wiring, unsafe defaults and removed isolation checks are red', () => {
  const mutations = [
    ['.github/workflows/ci.yml', s => s.replace('COMPOSE_FILE: docker-compose.yml:docker-compose.authz-e2e.yml', 'COMPOSE_FILE: docker-compose.yml')],
    [overlay, s => s.replace('SPRING_PROFILES_ACTIVE: e2e', 'SPRING_PROFILES_ACTIVE: prod')],
    [overlay, s => s.replaceAll('jdbc:postgresql://db:5432/authz_e2e', 'jdbc:postgresql://production:5432/egov')],
    [overlay, s => s.replace('CONFIRMED_DISPOSABLE_AUTHZ_DATABASE', 'missing-ack')],
    ['docker-compose.yml', s => `${s}\n      NURI_AUTHORIZATION_ISOLATED_CUTOVER: "true"\n`],
    [deploy, s => s.replace('-f docker-compose.prod.yml', '-f docker-compose.authz-e2e.yml')],
    [readiness, s => s.replace('SPRING_|DB_|NURI_|', 'SPRING_|DB_|')],
    [readiness, s => s.replace('  assertOwned();', '  // ownership removed')],
    [config, s => s.replace('!profiles.equals(Set.of("e2e"))', 'false')],
    [config, s => s.replace('!expected.equals(actual)', 'false')],
    [config, s => s.replace('.target("2.99")', '.target("latest")')],
    [config, s => s.replace('            flyway.migrate();', '').replace('            // Check the effective datasource', '            flyway.migrate();\n            // Check the effective datasource')],
  ];
  for (const [file, mutate] of mutations) {
    const fixture = read();
    const original = fixture.get(file);
    const changed = mutate(original);
    assert.notEqual(changed, original, `${file}: red fixture did not change`);
    fixture.set(file, changed);
    assert.throws(() => assertWiring(fixture), { name: 'AssertionError' }, `${file}: intentional violation was accepted`);
  }
});

test('rehearsal contracts execute through verify, pre-push and CI operational tests', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['test:operational-contracts'].includes('"scripts/*.test.mjs"'));
  for (const file of ['scripts/verify.mjs', '.githooks/pre-push', '.github/workflows/ci.yml']) {
    assert.ok(fs.readFileSync(path.join(root, file), 'utf8').includes('npm run test:operational-contracts'), file);
  }
});
