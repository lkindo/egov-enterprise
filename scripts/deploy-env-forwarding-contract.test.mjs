import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  collectJavaValuePlaceholders,
  collectPlaceholders,
  evaluateDeployEnvForwarding,
  inspectDeployEnvForwarding,
  parseComposeServiceEnvironment,
  resolvesEmptyWhenUnset,
  stripYamlComment,
} from './deploy-env-forwarding-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 합성 픽스처는 판정 규칙만 검증하므로 vacuity 하한을 끈다(하한 자체는 아래 전용 테스트가 본다).
const NO_FLOORS = { placeholders: 0, apiEnvironment: 0, frontendReads: 0 };

function compose({ api = [], frontend = [] }) {
  const block = (entries) => entries.map((entry) => `      ${entry}`).join('\n');
  return [
    'services:',
    '  api:',
    '    image: api',
    '    environment:',
    block(api),
    '  frontend:',
    '    image: web',
    '    environment:',
    block(frontend),
    '',
  ].join('\n');
}

/**
 * 규칙 하나만 드러나도록 나머지를 전부 성립시킨 기본 픽스처.
 * base 는 완화 바인딩 선언 1개(SPRING_PROFILES_ACTIVE)와, 프런트가 읽는 BACKEND_API_URL 만 전달한다.
 */
function evaluate({
  yml = '',
  java = '',
  base = compose({ api: ['SPRING_PROFILES_ACTIVE: dev'], frontend: ['BACKEND_API_URL: http://api:8080'] }),
  prod = compose({ api: ['SPRING_PROFILES_ACTIVE: prod'] }),
  frontendSource = 'const url = process.env.BACKEND_API_URL;',
  apiNotForwarded = {},
  apiForwardedWithoutPlaceholder = { SPRING_PROFILES_ACTIVE: 'profile selection' },
  frontendNotForwarded = {},
  frontendForwardedWithoutRead = {},
}) {
  return evaluateDeployEnvForwarding({
    apiConfigs: [{ file: 'application.yml', text: yml }],
    javaSources: java ? [{ file: 'Provisioner.java', text: java }] : [],
    composeBase: base,
    composeProd: prod,
    frontendSources: [{ file: 'frontend/src/page.tsx', text: frontendSource }],
    apiNotForwarded,
    apiForwardedWithoutPlaceholder,
    frontendNotForwarded,
    frontendForwardedWithoutRead,
    floors: NO_FLOORS,
  }).errors;
}

const withProdApi = (...entries) => compose({ api: ['SPRING_PROFILES_ACTIVE: prod', ...entries] });

test('the repository forwards every variable the application reads, and nothing it does not read', () => {
  const { errors, summary } = inspectDeployEnvForwarding(ROOT);
  assert.deepEqual(errors, []);
  // 실측(2026-09-13): api 읽기 33종(설정 파일 + @Value) · 프런트 런타임 9종. 하한은 파서 붕괴를 잡기 위한 것이다.
  assert.ok(summary.apiReads >= 20, `api reads ${summary.apiReads}`);
  assert.ok(summary.frontendReads >= 4, `frontend reads ${summary.frontendReads}`);
});

test('the baseline fixture itself is green, so each red below is caused by the rule it names', () => {
  assert.deepEqual(evaluate({}), []);
});

test('a configured variable that compose does not forward is red', () => {
  const errors = evaluate({ yml: 'nuri:\n  sender: ${NOTIFICATION_SENDER_TEL:}\n' });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /NOTIFICATION_SENDER_TEL/);
  assert.match(errors[0], /application\.yml:2/);
});

test('a variable read only through @Value must be forwarded, while comment mentions are ignored', () => {
  const java = [
    '/** 운영에서는 ${JWT_SECRET} 을 주입한다. */',
    'class Provisioner {',
    '  // @Value("${IGNORED_IN_COMMENT:x}")',
    '  @Value("${ADMIN_INITIAL_PASSWORD:}") private String password;',
    '}',
  ].join('\n');
  const red = evaluate({ java });
  assert.equal(red.length, 1);
  assert.match(red[0], /ADMIN_INITIAL_PASSWORD.*Provisioner\.java:4/);

  assert.deepEqual(evaluate({ java, prod: withProdApi('ADMIN_INITIAL_PASSWORD: ${ADMIN_INITIAL_PASSWORD:?required}') }), []);
  assert.deepEqual([...collectJavaValuePlaceholders([{ file: 'P.java', text: java }]).keys()], ['ADMIN_INITIAL_PASSWORD']);
});

test('nested placeholders inside a default are collected too', () => {
  const placeholders = collectPlaceholders([{ file: 'a.yml', text: 'from: ${MAIL_FROM:${spring.mail.username:${FALLBACK_SENDER:x}}}\n' }]);
  assert.deepEqual([...placeholders.keys()].sort(), ['FALLBACK_SENDER', 'MAIL_FROM']);

  const errors = evaluate({ yml: 'from: ${MAIL_FROM:${FALLBACK_SENDER:x}}\n', prod: withProdApi('MAIL_FROM:') });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /FALLBACK_SENDER/);
});

test('valueless forwarding satisfies the contract and keeps the app default alive', () => {
  assert.deepEqual(evaluate({ yml: 'mail:\n  from: ${MAIL_FROM:no-reply@example}\n', prod: withProdApi('MAIL_FROM:') }), []);
  assert.deepEqual(evaluate({ yml: 'mail:\n  from: ${MAIL_FROM:no-reply@example}\n', prod: withProdApi('MAIL_FROM: ~') }), []);
});

test('every form that resolves to an empty string when unset is red for a non-empty or required default', () => {
  const forms = ['${MAIL_FROM}', '$MAIL_FROM', '${MAIL_FROM:-}', '${MAIL_FROM-}', '${MAIL_FROM:=}', '""', "''"];
  for (const form of forms) {
    const errors = evaluate({ yml: 'from: ${MAIL_FROM:no-reply@example}\n', prod: withProdApi(`MAIL_FROM: ${form}`) });
    assert.equal(errors.length, 1, `form ${form}: ${errors.join('\n')}`);
    assert.match(errors[0], /MAIL_FROM.*빈 문자열/);
  }

  const listEmpty = `services:\n  api:\n    environment:\n      - SPRING_PROFILES_ACTIVE=prod\n      - MAIL_HOST=\n  frontend:\n    environment:\n      - X=1\n`;
  const required = evaluate({ yml: 'host: ${MAIL_HOST}\n', prod: listEmpty, frontendForwardedWithoutRead: { X: 'fixture' } });
  assert.equal(required.length, 1, required.join('\n'));
  assert.match(required[0], /MAIL_HOST.*빈 문자열/);
});

test('default, required and passthrough substitution forms are accepted', () => {
  const errors = evaluate({
    yml: 'a: ${LOGIN_MAX_FAILURES:5}\nb: ${MAIL_HOST}\nc: ${NOTIFICATION_SENDER_TEL:}\n',
    prod: withProdApi(
      'LOGIN_MAX_FAILURES: ${LOGIN_MAX_FAILURES:-5}',
      'MAIL_HOST: ${MAIL_HOST:?required}',
      // 모든 선언이 빈 기본값이면 빈 문자열 전달은 앱 동작을 바꾸지 않는다.
      'NOTIFICATION_SENDER_TEL: ${NOTIFICATION_SENDER_TEL}',
    ),
  });
  assert.deepEqual(errors, []);
  assert.equal(resolvesEmptyWhenUnset(null, 'X'), false);
  assert.equal(resolvesEmptyWhenUnset('${X:-5}', 'X'), false);
  assert.equal(resolvesEmptyWhenUnset('${X:?why}', 'X'), false);
});

test('an overlay key redeclared without a value wipes the base value and is red in every null spelling', () => {
  for (const spelling of ['', ' ~', ' null', ' NULL']) {
    const errors = evaluate({
      yml: 'jwt: ${JWT_ACCESS_TOKEN_VALIDITY_MS:3600000}\n',
      base: compose({ api: ['SPRING_PROFILES_ACTIVE: dev', 'JWT_ACCESS_TOKEN_VALIDITY_MS: 3600000'], frontend: ['BACKEND_API_URL: http://api:8080'] }),
      prod: withProdApi(`JWT_ACCESS_TOKEN_VALIDITY_MS:${spelling}`),
    });
    assert.equal(errors.length, 1, `spelling '${spelling}': ${errors.join('\n')}`);
    assert.match(errors[0], /JWT_ACCESS_TOKEN_VALIDITY_MS.*지워집니다/);
  }
});

test('mentions inside YAML comments are not treated as configuration reads', () => {
  const errors = evaluate({ yml: '# 인증 릴레이는 ${MAIL_PASSWORD} 로 주입한다\nmail:\n  port: 587 # ${MAIL_PORT} 아님\n' });
  assert.deepEqual(errors, []);
  assert.equal(stripYamlComment("value: '#not-a-comment' # comment"), "value: '#not-a-comment' ");
});

test('a stale or contradictory api not-forwarded declaration is red', () => {
  const stale = evaluate({ apiNotForwarded: { SERVER_PORT: 'fixed port' } });
  assert.equal(stale.length, 1);
  assert.match(stale[0], /SERVER_PORT.*더 이상 읽지 않습니다/);

  const contradictory = evaluate({
    yml: 'server:\n  port: ${SERVER_PORT:8080}\n',
    prod: withProdApi('SERVER_PORT:'),
    apiNotForwarded: { SERVER_PORT: 'fixed port' },
  });
  assert.equal(contradictory.length, 1);
  assert.match(contradictory[0], /SERVER_PORT.*사실과 다릅니다/);
});

test('compose forwarding a variable the application no longer reads is red (reverse direction)', () => {
  const ghost = evaluate({ prod: withProdApi('RETIRED_SETTING:') });
  assert.equal(ghost.length, 1);
  assert.match(ghost[0], /RETIRED_SETTING.*앱이 읽지 않습니다/);

  const frontendGhost = evaluate({ prod: compose({ api: ['SPRING_PROFILES_ACTIVE: prod'], frontend: ['OLD_FLAG:'] }) });
  assert.equal(frontendGhost.length, 1);
  assert.match(frontendGhost[0], /frontend.*OLD_FLAG.*앱이 읽지 않습니다/);
});

test('a relaxed-binding declaration must actually be forwarded and must not duplicate a real read', () => {
  const missing = evaluate({ apiForwardedWithoutPlaceholder: { SPRING_PROFILES_ACTIVE: 'profile', SPRING_MAIL_PASSWORD: 'relay' } });
  assert.equal(missing.length, 1);
  assert.match(missing[0], /SPRING_MAIL_PASSWORD.*compose 에 없습니다/);

  const duplicate = evaluate({
    yml: 'profile: ${SPRING_PROFILES_ACTIVE:dev}\n',
  });
  assert.equal(duplicate.length, 1);
  assert.match(duplicate[0], /SPRING_PROFILES_ACTIVE.*실제로 읽힙니다/);
});

test('frontend runtime reads must be forwarded, while build-time NEXT_PUBLIC variables are ignored', () => {
  const red = evaluate({ frontendSource: 'process.env.BACKEND_API_URL; const theme = process.env.BRAND_THEME; const url = process.env.NEXT_PUBLIC_API_URL;' });
  assert.equal(red.length, 1);
  assert.match(red[0], /BRAND_THEME/);

  const green = evaluate({
    frontendSource: 'process.env.BACKEND_API_URL; const theme = process.env.BRAND_THEME;',
    prod: compose({ api: ['SPRING_PROFILES_ACTIVE: prod'], frontend: ['BRAND_THEME:'] }),
  });
  assert.deepEqual(green, []);
});

test('a stale or contradictory frontend not-forwarded declaration is red', () => {
  const stale = evaluate({ frontendNotForwarded: { E2E_DIAG: 'diagnostics' } });
  assert.equal(stale.length, 1);
  assert.match(stale[0], /E2E_DIAG.*더 이상 읽지 않습니다/);

  const contradictory = evaluate({
    frontendSource: 'process.env.BACKEND_API_URL; process.env.NODE_ENV;',
    prod: compose({ api: ['SPRING_PROFILES_ACTIVE: prod'], frontend: ['NODE_ENV:'] }),
    frontendNotForwarded: { NODE_ENV: 'next decides' },
  });
  assert.equal(contradictory.length, 1);
  assert.match(contradictory[0], /NODE_ENV.*사실과 다릅니다/);
});

test('the insecure loopback cookie opt-in can never appear in the production overlay', () => {
  const errors = evaluate({
    frontendSource: "process.env.BACKEND_API_URL; const insecure = process.env.ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE === 'true';",
    prod: compose({ api: ['SPRING_PROFILES_ACTIVE: prod'], frontend: ['ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE:'] }),
  });
  assert.ok(errors.some((error) => /ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE: 운영 오버레이에 둘 수 없습니다/.test(error)), errors.join('\n'));
});

test('compose parsing distinguishes passthrough, empty assignment and literal values', () => {
  const text = 'services:\n  api:\n    environment:\n      - A=1\n      - B\n      - E=\n      C: "x" # note\n      D: ~\n  web:\n    image: x\n';
  assert.deepEqual([...parseComposeServiceEnvironment(text, 'api')], [['A', '1'], ['B', null], ['E', ''], ['C', '"x"'], ['D', null]]);
  assert.equal(parseComposeServiceEnvironment(text, 'frontend'), null);

  const errors = evaluateDeployEnvForwarding({
    apiConfigs: [],
    composeBase: 'services:\n  web:\n    image: x\n',
    composeProd: 'services:\n  web:\n    image: x\n',
    frontendSources: [],
    floors: NO_FLOORS,
  }).errors;
  assert.match(errors[0], /서비스 정의를 찾지 못했습니다/);
});

test('vacuity floors turn a silently collapsed scan red', () => {
  const { errors } = evaluateDeployEnvForwarding({
    apiConfigs: [{ file: 'application.yml', text: '' }],
    composeBase: compose({ api: ['SPRING_PROFILES_ACTIVE: dev'], frontend: [] }),
    composeProd: compose({ api: ['SPRING_PROFILES_ACTIVE: prod'] }),
    frontendSources: [],
    apiNotForwarded: {},
    apiForwardedWithoutPlaceholder: { SPRING_PROFILES_ACTIVE: 'profile' },
    frontendNotForwarded: {},
    frontendForwardedWithoutRead: {},
  });
  assert.equal(errors.filter((error) => error.startsWith('게이트 무결성')).length, 3);
});
