import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { backendEnvironment, frontendEnvironment, FRONTEND_WITHHELD_SIGNING_ENV, isLocalDatabaseUrl } from './dev.mjs';
import { exitCodeOf, nextDevArguments, WITHHELD_SIGNING_ENV, withoutSigningSecrets } from '../frontend/scripts/next-dev.mjs';

const REMOTE = 'jdbc:postgresql://203.0.113.10:5432/egovdb?currentSchema=public';

test('DB_URL 이 없거나 이 기계를 가리키면 로컬로 본다', () => {
  for (const url of [
    undefined,
    '',
    'jdbc:postgresql://localhost:5433/egovdb',
    'jdbc:postgresql://LOCALHOST:5432/egovdb?currentSchema=public&prepareThreshold=0',
    'jdbc:postgresql://127.0.0.1/egovdb',
    'jdbc:postgresql://[::1]:5432/egovdb',
  ]) {
    assert.equal(isLocalDatabaseUrl(url), true, String(url));
  }
});

test('다른 호스트나 판정할 수 없는 값은 원격으로 본다', () => {
  for (const url of [
    REMOTE,
    'jdbc:postgresql://db.example.org:5432/egovdb',
    'jdbc:postgresql://localhost.example.org/egovdb',
    'jdbc:postgresql://127.0.0.2/egovdb',
    'jdbc:postgresql://host.docker.internal:5432/egovdb',
    'postgres://localhost/egovdb',
  ]) {
    assert.equal(isLocalDatabaseUrl(url), false, url);
  }
});

test('로컬 DB 면 백엔드 환경을 바꾸지 않는다', () => {
  const env = { DB_URL: 'jdbc:postgresql://localhost:5433/egovdb', JWT_SECRET: 's' };
  const result = backendEnvironment(env);
  assert.equal(result.env, env);
  assert.equal(result.notice, null);
});

test('원격 DB 면 Flyway 자동 적용을 끄고 그 사실을 알린다', () => {
  const env = { DB_URL: REMOTE, JWT_SECRET: 's', SPRING_FLYWAY_ENABLED: 'true' };
  const result = backendEnvironment(env);
  assert.equal(result.env.SPRING_FLYWAY_ENABLED, 'false', '원격 DB 에 미병합 마이그레이션이 자동 적용됩니다.');
  assert.equal(result.env.JWT_SECRET, 's');
  assert.equal(env.SPRING_FLYWAY_ENABLED, 'true', '호출자의 환경을 고치면 안 됩니다.');
  assert.match(result.notice, /Flyway 자동 적용을 끄고/);
  assert.match(result.notice, /DEV_REMOTE_FLYWAY=migrate/);
});

test('DB_URL 을 덮어쓰는 Spring 환경 변수가 원격이어도 Flyway 를 끈다', () => {
  for (const key of ['SPRING_DATASOURCE_URL', 'SPRING_DATASOURCE_JDBC_URL', 'SPRING_FLYWAY_URL']) {
    const result = backendEnvironment({ [key]: REMOTE });
    assert.equal(result.env.SPRING_FLYWAY_ENABLED, 'false', `${key} 로 원격 DB 를 주면 가드를 건너뜁니다.`);
  }
});

test('옵트인해도 원격 DB 에 개발 시드는 넣지 않는다', () => {
  const env = { DB_URL: REMOTE, DEV_REMOTE_FLYWAY: 'migrate', SPRING_PROFILES_ACTIVE: 'dev' };
  const result = backendEnvironment(env);
  assert.equal(result.env.SPRING_FLYWAY_ENABLED, undefined);
  assert.equal(result.env.SPRING_FLYWAY_LOCATIONS, 'classpath:db/migration', '개발 자격 시드(db/seed-dev)가 원격 DB 에 들어갑니다.');
  assert.match(result.notice, /개발 시드/);
});

test('옵트인 값은 정확히 migrate 일 때만 받는다', () => {
  for (const value of ['1', 'true', 'MIGRATE', ' migrate']) {
    const result = backendEnvironment({ DB_URL: REMOTE, DEV_REMOTE_FLYWAY: value });
    assert.equal(result.env.SPRING_FLYWAY_ENABLED, 'false', value);
  }
});

test('프런트엔드 환경은 서명 비밀(ES256 개인키 키링·퇴역한 HMAC 비밀)을 상속하지 않고 검증 공개키만 유지한다', () => {
  const source = {
    JWT_SECRET: 's',
    JWT_ACCEPT_LEGACY_HMAC: 'true',
    JWT_VERIFY_KEYS_JSON: '{"k1":"pub"}',
    JWT_SIGNING_ACTIVE_KID: 'k1',
    JWT_SIGNING_KEYS_JSON: '{"k1":"priv"}',
    PATH: '/bin',
  };
  const nextEnv = frontendEnvironment(source);
  assert.equal(nextEnv.JWT_SIGNING_ACTIVE_KID, undefined);
  assert.equal(nextEnv.JWT_SIGNING_KEYS_JSON, undefined);
  assert.equal(nextEnv.JWT_SECRET, undefined, 'ADR-0060 2차: Next 는 HMAC 비밀도 갖지 않는다.');
  assert.equal(nextEnv.JWT_ACCEPT_LEGACY_HMAC, undefined);
  assert.equal(nextEnv.JWT_VERIFY_KEYS_JSON, '{"k1":"pub"}');
  assert.equal(nextEnv.PATH, '/bin');
  assert.equal(source.JWT_SIGNING_KEYS_JSON, '{"k1":"priv"}', '호출자 환경을 변형하지 않는다.');
});

test('Windows 처럼 이름의 대소문자가 다른 서명 비밀도 걷는다 — 정본(dev.mjs)과 프런트 dev 래퍼 모두', () => {
  const source = { jwt_signing_keys_json: '{"k1":"priv"}', Jwt_Secret: 's', JWT_VERIFY_KEYS_JSON: '{"k1":"pub"}', Path: 'C:\\bin' };
  for (const filter of [frontendEnvironment, withoutSigningSecrets]) {
    const nextEnv = filter(source);
    assert.deepEqual(Object.keys(nextEnv).sort(), ['JWT_VERIFY_KEYS_JSON', 'Path'], filter.name);
  }
});

test('서명 비밀 목록의 사본(verify.mjs·프런트 dev 래퍼)은 dev.mjs 정본과 같고 대소문자 무관하게 거른다', () => {
  // verify.mjs 는 독립 이관 제품에, 래퍼는 프런트 폴더째 생성물에 복사돼 dev.mjs 를 import 할 수 없다 — 사본이 어긋나면 이 시험이 붉다.
  assert.deepEqual([...WITHHELD_SIGNING_ENV].sort(), [...FRONTEND_WITHHELD_SIGNING_ENV].sort());
  const verifySource = readFileSync(new URL('./verify.mjs', import.meta.url), 'utf8');
  const copy = /const FRONTEND_WITHHELD_SIGNING_ENV = \[([^\]]*)\];/u.exec(verifySource)?.[1];
  assert.ok(copy, 'verify.mjs 에 FRONTEND_WITHHELD_SIGNING_ENV 사본이 있어야 한다.');
  const names = [...copy.matchAll(/'([A-Z_]+)'/gu)].map((match) => match[1]);
  assert.deepEqual([...names].sort(), [...FRONTEND_WITHHELD_SIGNING_ENV].sort());
  assert.match(verifySource, /\.filter\(\(\[name\]\) => !withheld\.has\(name\.toUpperCase\(\)\)\)/u);
});

test('프런트 dev 는 어느 경로로 띄워도 래퍼를 지난다 — 서명 비밀을 걷고 루프백·3001 기본, 받은 인자는 그대로', () => {
  const frontendPkg = JSON.parse(readFileSync(new URL('../frontend/package.json', import.meta.url), 'utf8'));
  assert.equal(frontendPkg.scripts.dev, 'node scripts/next-dev.mjs',
    'next dev 를 직접 부르면 셸의 JWT_SIGNING_KEYS_JSON 이 Next 로 넘어가고 모든 주소에 열린다.');
  const rootPkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(rootPkg.scripts.frontend, 'pnpm -C frontend dev');

  assert.deepEqual(nextDevArguments([]), ['dev', '-p', '3001', '-H', '127.0.0.1']);
  assert.deepEqual(nextDevArguments(['--hostname', '0.0.0.0', '--port', '3011']), ['dev', '--hostname', '0.0.0.0', '--port', '3011']);
  assert.deepEqual(nextDevArguments(['-H', '127.0.0.1', '-p', '3011']), ['dev', '-H', '127.0.0.1', '-p', '3011']);
  assert.deepEqual(nextDevArguments(['--hostname=::1']), ['dev', '-p', '3001', '--hostname=::1']);
  assert.deepEqual(nextDevArguments(['--turbopack']), ['dev', '-p', '3001', '-H', '127.0.0.1', '--turbopack']);
});

test('프런트 dev 래퍼는 자식의 종료 코드를 돌려주고 시그널 종료를 성공으로 보지 않는다', () => {
  assert.equal(exitCodeOf(0, null), 0);
  assert.equal(exitCodeOf(3, null), 3);
  assert.equal(exitCodeOf(null, 'SIGTERM'), 1);
  assert.equal(exitCodeOf(null, null), 0);
});
