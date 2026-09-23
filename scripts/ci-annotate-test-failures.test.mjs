import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MAX_DETAIL,
  MAX_FILES,
  NO_DETAIL,
  buildAnnotations,
  escapeAnnotation,
  extractDetail,
} from './ci-annotate-test-failures.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CI_WORKFLOW = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');

function withResults(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-annotate-'));
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
  }
  return root;
}

const suite = (message, type = 'java.lang.AssertionError') =>
  `<testsuite><testcase name="t"><failure message="${message}" type="${type}">stack</failure></testcase></testsuite>`;

/*
 * [2026-09-23] 이 계약이 고정하는 것은 "긴 메시지도 본문이 비지 않는다" 하나다.
 * 종전 셸 패턴 `message="[^"]\{0,300\}"` 은 닫는 따옴표를 창 안에서 요구해, Flyway·SQL 예외처럼
 * 긴 메시지에서 추출이 빈 문자열이 됐고 본문 없는 annotation 은 GitHub 가 버렸다 —
 * 즉 진단이 가장 필요한 실패에서만 진단이 사라졌다.
 */
test('긴 실패 메시지도 본문이 비지 않는다 — 종전 셸 패턴이 죽던 자리', () => {
  const long = 'x'.repeat(400);
  const root = withResults({
    'api-server/build/test-results/schemaValidationTest/TEST-nuri.api.schema.Flaky.xml': suite(long),
  });
  const lines = buildAnnotations(root);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^::error title=테스트 실패: nuri\.api\.schema\.Flaky::/);

  const body = lines[0].split('::').slice(2).join('::');
  assert.equal(body.length, MAX_DETAIL, '본문은 잘리되 비지 않아야 한다');

  // 대조군 — 닫는 따옴표를 창 안에서 요구하면 같은 입력에서 아무것도 뽑히지 않는다.
  const bounded = suite(long).match(/message="[^"]{0,300}"/);
  assert.equal(bounded, null, '종전 패턴이 이 입력에서 매칭되면 이 계약은 vacuous 하다');
});

test('짧은 메시지는 그대로 실린다', () => {
  const root = withResults({
    'business-core/build/test-results/test/TEST-Short.xml': suite('기대값과 다릅니다'),
  });
  const [line] = buildAnnotations(root);
  assert.ok(line.endsWith('::기대값과 다릅니다'), line);
});

test('message 속성이 없으면 예외 타입으로, 그것도 없으면 표지로 물러난다', () => {
  assert.equal(extractDetail('<failure type="org.postgresql.util.PSQLException">s</failure>'),
    'org.postgresql.util.PSQLException');
  assert.equal(extractDetail('<failure>s</failure>'), NO_DETAIL);
  assert.equal(extractDetail('<failure message="   " type="  ">s</failure>'), NO_DETAIL);
});

test('실패가 없는 리포트는 annotation 을 만들지 않는다', () => {
  const root = withResults({
    'api-server/build/test-results/test/TEST-Green.xml': '<testsuite><testcase name="t"/></testsuite>',
  });
  assert.deepEqual(buildAnnotations(root), []);
});

test('노출 건수는 상한을 지키고 경로 순서로 안정적이다', () => {
  const files = {};
  for (let index = 0; index < MAX_FILES + 3; index += 1) {
    files[`api-server/build/test-results/test/TEST-Case${index}.xml`] = suite(`실패 ${index}`);
  }
  const root = withResults(files);
  const lines = buildAnnotations(root);
  assert.equal(lines.length, MAX_FILES);
  assert.deepEqual(lines, buildAnnotations(root), '같은 입력은 같은 순서를 낸다');
});

test('workflow command 를 깨는 문자를 이스케이프한다', () => {
  assert.equal(escapeAnnotation('a%b\nc\rd'), 'a%25b%0Ac%0Dd');
  const root = withResults({
    'api-server/build/test-results/test/TEST-Multi.xml': suite('첫 줄&#10;둘째 줄 100%'),
  });
  const [line] = buildAnnotations(root);
  assert.ok(!line.includes('\n'), 'annotation 은 한 줄이어야 한다');
  assert.ok(line.includes('%25'), '퍼센트가 이스케이프돼야 한다');
});

test('읽을 수 없는 리포트는 건너뛰고 나머지를 계속 노출한다', () => {
  const root = withResults({
    'api-server/build/test-results/test/TEST-Broken.xml': suite('깨진 파일'),
    'api-server/build/test-results/test/TEST-Fine.xml': suite('정상 파일'),
  });
  const lines = buildAnnotations(root, {
    readFile: (file) => {
      if (file.includes('TEST-Broken')) throw new Error('EACCES');
      return fs.readFileSync(file, 'utf8');
    },
  });
  assert.equal(lines.length, 1);
  assert.ok(lines[0].endsWith('::정상 파일'), lines[0]);
});

test('ci.yml 이 이 모듈을 부르고 죽은 셸 패턴을 다시 들이지 않는다', () => {
  const workflow = fs.readFileSync(CI_WORKFLOW, 'utf8');
  assert.ok(
    workflow.includes('scripts/ci-annotate-test-failures.mjs'),
    'ci.yml 이 이 모듈을 부르지 않으면 계약이 실행 경로와 끊긴다',
  );
  assert.ok(
    !/message="\[\^"\]\\?\{0,\d+\\?\}"/.test(workflow),
    '닫는 따옴표를 창 안에서 요구하는 추출이 되살아났다 — 긴 메시지가 다시 조용히 사라진다',
  );
});
