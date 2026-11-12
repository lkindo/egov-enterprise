import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateManagedDbEnvironment, evaluateManagedDbOverlay } from './managed-db-env-check.mjs';

const VALID = {
  DB_URL: 'jdbc:postgresql://pg.managed.example.com:5432/egovdb?sslmode=verify-full&sslrootcert=/app/certs/db/ca.pem',
  DB_USERNAME: 'app',
  DB_PASSWORD: 'secret-value',
  DB_SSL_CA_DIR: '/etc/egov/db-ca',
};

test('관리형 DB 접속 변수: 외부 주소·verify-full·마운트한 CA 면 통과한다', () => {
  assert.deepEqual(evaluateManagedDbEnvironment(VALID), []);
  assert.deepEqual(evaluateManagedDbEnvironment({ ...VALID,
    DB_URL: 'jdbc:postgresql://[2001:db8::1]/egovdb?sslmode=verify-full&sslrootcert=/app/certs/db/ca.pem&currentSchema=public' }), []);
});

test('관리형 DB 접속 변수: 번들 DB·루프백·약한 SSL·CA 밖 경로·클래스 옵션은 붉다', () => {
  const cases = {
    'jdbc:postgresql://db:5432/egovdb?sslmode=verify-full&sslrootcert=/app/certs/db/ca.pem': /번들 DB/,
    'jdbc:postgresql://localhost/egovdb?sslmode=verify-full&sslrootcert=/app/certs/db/ca.pem': /루프백/,
    'jdbc:postgresql://pg.example.com/egovdb?sslmode=require&sslrootcert=/app/certs/db/ca.pem': /verify-full/,
    'jdbc:postgresql://pg.example.com/egovdb?sslmode=verify-full': /sslrootcert/,
    'jdbc:postgresql://pg.example.com/egovdb?sslmode=verify-full&sslrootcert=/app/certs/db/../../etc/passwd': /sslrootcert/,
    'jdbc:postgresql://pg.example.com/egovdb?sslmode=verify-full&sslrootcert=/app/certs/db/ca.pem&sslfactory=evil.Factory': /허용 목록 밖/,
    'jdbc:postgresql://pg.example.com/egovdb?sslmode=verify-full&sslmode=disable&sslrootcert=/app/certs/db/ca.pem': /두 번/,
    'jdbc:mysql://pg.example.com/egovdb': /형식/,
    'jdbc:postgresql://pg.example.com/egovdb?%73slmode=verify-full&sslrootcert=/app/certs/db/ca.pem': /인코딩/,
  };
  for (const [url, expected] of Object.entries(cases)) {
    const problems = evaluateManagedDbEnvironment({ ...VALID, DB_URL: url });
    assert.ok(problems.some((problem) => expected.test(problem)), `${url} → ${problems.join(' / ')}`);
    assert.ok(problems.every((problem) => !problem.includes('secret-value')), '값을 출력하지 않는다');
  }
  assert.ok(evaluateManagedDbEnvironment({ ...VALID, DB_SSL_CA_DIR: '' }).some((p) => p.includes('DB_SSL_CA_DIR')));
  assert.ok(evaluateManagedDbEnvironment({}).length >= 4);
});

test('관리형 DB 오버레이 원문은 번들 DB 를 빼고 db 대기를 지우며 CA 를 읽기 전용으로 붙인다', () => {
  const source = readFileSync(new URL('../docker-compose.managed-db.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.deepEqual(evaluateManagedDbOverlay(source), []);
  assert.ok(evaluateManagedDbOverlay(source.replace('profiles: ["bundled-db"]', 'image: postgres:17')).length > 0,
    '번들 DB 를 남기면 붉다');
  assert.ok(evaluateManagedDbOverlay(source.replace('depends_on: !reset {}', 'depends_on: {}')).length > 0,
    'db 대기를 남기면 붉다');
  assert.ok(evaluateManagedDbOverlay(source.replace(':/app/certs/db:ro', ':/app/certs/db')).length > 0,
    'CA 를 쓰기 가능하게 붙이면 붉다');
  assert.ok(evaluateManagedDbOverlay(`${source}\n      TRUSTED_EDGE_PROXY: 10.0.0.1\n`).length > 0, '신뢰 경계를 다시 정하면 붉다');
});
