import assert from 'node:assert/strict';
import test from 'node:test';

import { backendEnvironment, isLocalDatabaseUrl } from './dev.mjs';

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
