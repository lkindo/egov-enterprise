import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

/*
 * 주간 ZAP 의 'Prepare API definition without session-ending operations' 단계가 실제로 하는 변환을 실행해 본다.
 * WorkflowManifestLinterTest 는 그 단계의 형태(목록·대상 파일·실패 문구·순서)를 정적으로 고정하지만, 변환의 의미 —
 * 목록의 연산만 빼고 나머지 정의는 그대로 둔다 — 는 보지 않았다(2026-10-29 교차 검토). 워크플로에 적힌 스크립트와 잡의 제외
 * 목록을 그대로 꺼내 커밋된 api-docs.json 사본에 돌린다. 스크립트를 Java 에서 실행하지 않는 이유: 큰따옴표가 많은 -e 인자는
 * Windows 의 ProcessBuilder 인자 인용을 거치며 깨진다(Node 의 spawn 은 인용을 지킨다).
 */
const root = resolve(import.meta.dirname, '..');
const WORKFLOW = '.github/workflows/zap-scan.yml';
const STEP = 'Prepare API definition without session-ending operations';
const LOGOUT = 'POST /api/v1/auth/logout';
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/**
 * 워크플로 원문에서 그 단계의 node 스크립트와 zap_scan 잡의 제외 목록을 꺼낸다. 스크립트는 bash 작은따옴표 인자라 다음 `'` 까지가
 * 셸이 넘기는 값 그대로다(작은따옴표 안에는 이스케이프가 없다). 블록 스칼라의 들여쓰기는 JS 의미를 바꾸지 않는다.
 */
function workflowFilter() {
  const text = readFileSync(join(root, WORKFLOW), 'utf8').replace(/\r\n/g, '\n');
  const start = text.indexOf(`      - name: ${STEP}\n`);
  assert.ok(start >= 0, `${WORKFLOW}: '${STEP}' 단계가 없다`);
  const next = text.indexOf('\n      - name: ', start + 1);
  const step = text.slice(start, next < 0 ? text.length : next);
  const call = /node -e '([^']*)' "\$RUNNER_TEMP\/api-docs\.json" zap-api-docs\.json\n/.exec(step);
  assert.ok(call, `${STEP}: 받은 정의($RUNNER_TEMP/api-docs.json)를 node -e 로 걸러 zap-api-docs.json 에 쓰는 호출이 없다`);
  const listed = /^ {6}ZAP_SESSION_ENDING_OPERATIONS: '([^']*)'$/m.exec(text);
  assert.ok(listed, `${WORKFLOW}: zap_scan 잡의 ZAP_SESSION_ENDING_OPERATIONS 가 없다`);
  return { script: call[1], operations: listed[1] };
}

/** 워크플로와 같은 인자 형태(`node -e <스크립트> <받은 정의> <사본>`)로 돌린다. operations 가 undefined 면 환경 변수를 두지 않는다. */
function runFilter(script, spec, operations) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-definition-filter-'));
  try {
    const source = join(dir, 'api-docs.json');
    const target = join(dir, 'zap-api-docs.json');
    writeFileSync(source, typeof spec === 'string' ? spec : JSON.stringify(spec));
    const env = { ...process.env, ZAP_SESSION_ENDING_OPERATIONS: operations };
    if (operations === undefined) delete env.ZAP_SESSION_ENDING_OPERATIONS;
    const run = spawnSync(process.execPath, ['-e', script, source, target], { env, encoding: 'utf8' });
    return { status: run.status, stdout: run.stdout, stderr: run.stderr,
      output: existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : undefined };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const operationsOf = (spec) => Object.entries(spec.paths ?? {})
  .flatMap(([path, item]) => METHODS.filter((method) => Object.hasOwn(item, method)).map((method) => `${method.toUpperCase()} ${path}`));

/** 연산 하나만 뺀 기대 정의 — 경로에 다른 메서드가 남으면 경로 항목(요약·공통 파라미터 포함)을 그대로 두고, 없으면 경로째 뺀다. */
function withoutOperation(spec, operation) {
  const [method, path] = operation.split(' ');
  const copy = structuredClone(spec);
  delete copy.paths[path][method.toLowerCase()];
  if (!METHODS.some((name) => Object.hasOwn(copy.paths[path], name))) delete copy.paths[path];
  return copy;
}

test('워크플로의 제외 목록은 로그아웃 하나이고, 커밋된 정의에서 그 연산만 빼며 나머지 연산·정의는 그대로 둔다', () => {
  const { script, operations } = workflowFilter();
  assert.equal(operations, LOGOUT, '제외 목록이 바뀌면 이 시험과 WorkflowManifestLinterTest 의 SESSION_ENDING_OPERATIONS 를 함께 본다');
  const spec = JSON.parse(readFileSync(join(root, 'api-docs.json'), 'utf8'));
  const before = operationsOf(spec);
  assert.ok(before.includes(LOGOUT), '커밋된 api-docs.json 에 로그아웃 연산이 있어야 한다');

  const run = runFilter(script, spec, operations);
  assert.equal(run.status, 0, `정의 준비가 실패했다: ${run.stdout}${run.stderr}`);
  const after = operationsOf(run.output);
  assert.equal(after.length, before.length - 1, '연산이 정확히 하나 줄어야 한다');
  assert.deepEqual(before.filter((operation) => !after.includes(operation)), [LOGOUT], '빠진 연산은 로그아웃 하나다');
  assert.deepEqual(run.output, withoutOperation(spec, LOGOUT), '나머지 연산과 정의(components·info·servers 등)는 입력과 같아야 한다');
});

test('같은 경로의 다른 메서드와 경로 항목은 남기고, 목록의 공백·여러 항목을 읽는다', () => {
  const { script } = workflowFilter();
  const spec = {
    openapi: '3.1.0', info: { title: 'fixture', version: '1' }, servers: [{ url: '/' }],
    paths: {
      '/api/v1/auth/logout': { summary: 'session', parameters: [{ name: 'X-Trace', in: 'header' }], post: { operationId: 'logout' }, get: { operationId: 'logoutPage' } },
      '/api/v1/auth/login': { post: { operationId: 'login', requestBody: { content: { 'application/json': {} } } } },
    },
    components: { schemas: { Login: { type: 'object' } } },
  };
  const single = runFilter(script, spec, LOGOUT);
  assert.equal(single.status, 0, single.stdout);
  assert.deepEqual(single.output, withoutOperation(spec, LOGOUT), '로그아웃 경로의 GET·요약·공통 파라미터와 다른 경로는 그대로다');
  assert.deepEqual(Object.keys(single.output.paths['/api/v1/auth/logout']), ['summary', 'parameters', 'get']);

  const both = runFilter(script, spec, ` ${LOGOUT} ; GET /api/v1/auth/logout `);
  assert.equal(both.status, 0, both.stdout);
  assert.deepEqual(operationsOf(both.output), ['POST /api/v1/auth/login'], '두 항목을 모두 빼면 메서드가 없는 경로는 경로째 빠진다');
  assert.deepEqual(both.output.components, spec.components);
});

test('제외 목록이 비었거나 정의에 없는(낡은·모르는) 연산이면 사본을 쓰지 않고 실패한다', () => {
  const { script } = workflowFilter();
  const spec = JSON.parse(readFileSync(join(root, 'api-docs.json'), 'utf8'));
  const cases = {
    '환경 변수 없음': undefined,
    '빈 목록': '',
    '구분자만': ' ; ',
    '바뀐 경로(낡은 제외)': 'POST /api/v1/auth/logout-old',
    '경로에 없는 메서드': 'GET /api/v1/auth/logout',
    '모르는 메서드': 'FETCH /api/v1/auth/logout',
    '항목 뒤 여분의 단어': `${LOGOUT} extra`,
    '뒤 항목만 낡음': `${LOGOUT}; POST /api/v1/auth/gone`,
  };
  for (const [label, operations] of Object.entries(cases)) {
    const run = runFilter(script, spec, operations);
    assert.equal(run.status, 1, `${label}: 실패해야 한다 (${JSON.stringify(operations)})`);
    assert.match(run.stdout, /^::error::/m, `${label}: 워크플로 오류 표시로 알린다`);
    assert.equal(run.output, undefined, `${label}: 일부만 뺀 사본도 쓰지 않는다`);
  }
});
