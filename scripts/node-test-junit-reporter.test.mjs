import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { collectNodeTestEvents, renderNodeTestJUnit, xmlAttribute } from './node-test-junit-reporter.mjs';
import { buildNodeTestDurationSummary, collectNodeTestDurations } from './ci-junit-duration-summary.mjs';

// Windows 에서 절대 경로는 보고자 지정자로 받지 않는다 — file URL 로 넘긴다.
const reporter = new URL('./node-test-junit-reporter.mjs', import.meta.url).href;

test('events are grouped by test file with top-level totals and nested names', () => {
  const cwd = path.resolve('/repo');
  const file = path.join(cwd, 'scripts', 'a.test.mjs');
  const events = [
    { type: 'test:start', data: { name: 'group', nesting: 0, file } },
    { type: 'test:start', data: { name: 'inner', nesting: 1, file } },
    { type: 'test:pass', data: { name: 'inner', nesting: 1, file, details: { duration_ms: 30, type: 'test' } } },
    { type: 'test:pass', data: { name: 'group', nesting: 0, file, details: { duration_ms: 40, type: 'suite' } } },
    { type: 'test:start', data: { name: 'top', nesting: 0, file } },
    { type: 'test:fail', data: { name: 'top', nesting: 0, file, details: { duration_ms: 2000, type: 'test', error: new Error('secret') } } },
    { type: 'test:pass', data: { name: 'later', nesting: 0, file, skip: true, details: { duration_ms: 1, type: 'test' } } },
  ];
  assert.deepEqual(collectNodeTestEvents(events, { cwd }), [{
    name: 'scripts/a.test.mjs',
    seconds: 2.041,
    tests: [
      { name: 'group > inner', seconds: 0.03, status: 'passed' },
      { name: 'top', seconds: 2, status: 'failed' },
      { name: 'later', seconds: 0.001, status: 'skipped' },
    ],
  }]);
});

test('a suite that fails on its own is recorded, a suite failing only through its children is not repeated', () => {
  const cwd = path.resolve('/repo');
  const file = path.join(cwd, 'scripts', 'b.test.mjs');
  const subtests = Object.assign(new Error('x'), { failureType: 'subtestsFailed' });
  const hook = Object.assign(new Error('after hook'), { failureType: 'hookFailed' });
  const events = [
    { type: 'test:start', data: { name: 'hooked', nesting: 0, file } },
    { type: 'test:start', data: { name: 'ok', nesting: 1, file } },
    { type: 'test:pass', data: { name: 'ok', nesting: 1, file, details: { duration_ms: 1, type: 'test' } } },
    { type: 'test:fail', data: { name: 'hooked', nesting: 0, file, details: { duration_ms: 2, type: 'suite', error: hook } } },
    { type: 'test:start', data: { name: 'parent', nesting: 0, file } },
    { type: 'test:start', data: { name: 'bad', nesting: 1, file } },
    { type: 'test:fail', data: { name: 'bad', nesting: 1, file, details: { duration_ms: 1, type: 'test' } } },
    { type: 'test:fail', data: { name: 'parent', nesting: 0, file, details: { duration_ms: 1, type: 'suite', error: subtests } } },
    // 불러오지 못한 파일: Node 는 절대 경로를 이름으로 쓴다 — 이 컴퓨터의 경로를 남기지 않는다.
    { type: 'test:fail', data: { name: path.join(cwd, 'scripts', 'broken.test.mjs'), nesting: 0, file: path.join(cwd, 'scripts', 'broken.test.mjs'),
      details: { duration_ms: 1, type: 'test' } } },
  ];
  const [b, broken] = collectNodeTestEvents(events, { cwd });
  assert.deepEqual(b.tests.map(test => [test.name, test.status]),
    [['hooked > ok', 'passed'], ['hooked', 'failed'], ['parent > bad', 'failed']], 'the own suite failure is kept once');
  assert.deepEqual(broken.tests.map(test => test.name), ['scripts/broken.test.mjs'], 'an absolute file name is made relative');
  assert.match(renderNodeTestJUnit([b]), /failures="2"/);
});

test('attribute escaping keeps the XML well formed', () => {
  assert.equal(xmlAttribute('a<b>&"c"\n\u0001d'), 'a&lt;b&gt;&amp;&quot;c&quot; d');
  const xml = renderNodeTestJUnit([{ name: 'x "y".test.mjs', seconds: 1, tests: [{ name: 'a > b', seconds: 1, status: 'passed' }] }]);
  assert.match(xml, /<testsuite name="x &quot;y&quot;\.test\.mjs" tests="1" failures="0" skipped="0" time="1\.000">/);
  assert.match(xml, /name="a &gt; b"/);
});

// 실제 node --test 사건으로 확인한다 — 파일 속성이 사라지는 Node 변경이나 오류 원문 유출을 여기서 잡는다.
test('a real node --test run records per-file times and never the failure text', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'node-test-junit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'slow.test.mjs'), [
    "import test from 'node:test';",
    "test('waits', async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });",
    "test('fast', () => {});",
  ].join('\n'));
  fs.writeFileSync(path.join(root, 'broken.test.mjs'), [
    "import test from 'node:test';",
    "test('fails', () => { throw new Error('SECRET-TOKEN-VALUE should never reach the report'); });",
  ].join('\n'));
  const destination = path.join(root, 'junit.xml');
  // 바깥 node --test 의 문맥을 물려받으면 안쪽 실행이 부모에게 보고하는 모드로 돈다.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const run = spawnSync(process.execPath, ['--test', `--test-reporter=${reporter}`, `--test-reporter-destination=${destination}`,
    'slow.test.mjs', 'broken.test.mjs'], { cwd: root, encoding: 'utf8', env });
  assert.equal(run.status, 1, 'the failing fixture keeps its exit status');
  const xml = fs.readFileSync(destination, 'utf8');
  assert.doesNotMatch(xml, /SECRET-TOKEN-VALUE/u);
  assert.doesNotMatch(xml, new RegExp(root.replaceAll('\\', '\\\\')), 'paths are relative to the working directory');
  const { files, tests } = collectNodeTestDurations(xml);
  assert.deepEqual(files.map(({ file, tests: count, failures }) => [file, count, failures]),
    [['slow.test.mjs', 2, 0], ['broken.test.mjs', 1, 1]]);
  assert.ok(files[0].seconds >= 0.15, `the slow file total includes its slow test (${files[0].seconds})`);
  assert.equal(tests[0].name, 'waits');
  const summary = buildNodeTestDurationSummary(destination);
  assert.match(summary, /\| 1 \| slow\.test\.mjs \| 2 \| \d+\.\d{3} \|/);
  assert.match(summary, /### Slowest tests[\s\S]*\| 1 \| slow\.test\.mjs \| waits \|/);
  assert.doesNotMatch(summary, /SECRET-TOKEN-VALUE|node --test/u);
});

test('a missing or empty report leaves a note instead of hiding the test result', () => {
  assert.match(buildNodeTestDurationSummary('missing.xml', { readFile: () => { throw new Error('ENOENT'); } }),
    /No Node test JUnit report was produced/);
  assert.match(buildNodeTestDurationSummary('empty.xml', { readFile: () => '<testsuites/>' }),
    /holds no file with a valid duration/);
  assert.deepEqual(collectNodeTestDurations('  <testsuite name="a" time="-1">\n    <testcase name="x" time="1"/>\n  </testsuite>').files, []);
});
