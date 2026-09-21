import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { validatePlaywrightResult } from './playwright-result-contract.mjs';

const cwd = path.resolve('frontend');

function jsonTest(status = 'expected', projectName = 'full-suite') {
  return {
    timeout: 180000,
    annotations: [],
    expectedStatus: 'passed',
    projectName,
    projectId: projectName,
    results: [{ status: status === 'expected' ? 'passed' : status, retry: 0 }],
    status,
  };
}

function jsonSpec(file, status = 'expected', projectName = 'full-suite') {
  return {
    title: `${file} journey`,
    ok: status !== 'unexpected',
    tags: [],
    tests: [jsonTest(status, projectName)],
    id: `${projectName}-${file}`,
    file,
    line: 1,
    column: 1,
  };
}

function report(specs = [
  jsonSpec('01-core.spec.ts'),
  jsonSpec('nested/02-admin.spec.ts'),
]) {
  const setup = jsonSpec('auth.setup.ts', 'expected', 'setup');
  const allTests = [setup, ...specs].flatMap((spec) => spec.tests);
  const stats = { expected: 0, skipped: 0, unexpected: 0, flaky: 0 };
  for (const current of allTests) stats[current.status] += 1;
  return {
    config: {
      rootDir: path.join(cwd, 'e2e'),
      projects: [{ name: 'setup' }, { name: 'full-suite' }],
    },
    suites: [
      { title: 'auth.setup.ts', file: 'auth.setup.ts', line: 0, column: 0, specs: [setup] },
      {
        title: 'journeys',
        file: '01-core.spec.ts',
        line: 0,
        column: 0,
        specs: [specs[0]],
        suites: specs.slice(1).map((spec) => ({
          title: 'nested',
          file: spec.file,
          line: 1,
          column: 1,
          specs: [spec],
        })),
      },
    ],
    errors: [],
    stats: { startTime: '2026-08-19T00:00:00.000Z', duration: 100, ...stats },
  };
}

const planned = ['e2e/01-core.spec.ts', 'e2e/nested/02-admin.spec.ts'];

test('accepts recursive JSON reporter v2 suites when every planned spec executes', () => {
  const result = validatePlaywrightResult(report(), planned, { cwd });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.summary, {
    plannedSpecs: 2,
    reportedSpecs: 2,
    expected: 3,
    skipped: 0,
    unexpected: 0,
    flaky: 0,
  });
});

test('rejects missing and unplanned spec results with normalized nested paths', () => {
  const swapped = report([
    jsonSpec('01-core.spec.ts'),
    jsonSpec('nested/99-unplanned.spec.ts'),
  ]);
  const errors = validatePlaywrightResult(swapped, planned, { cwd }).errors.join('\n');
  assert.match(errors, /missing planned spec result: e2e\/nested\/02-admin\.spec\.ts/);
  assert.match(errors, /unplanned spec result: e2e\/nested\/99-unplanned\.spec\.ts/);
});

test('rejects skipped, zero-expected, and all-skipped false-green reports', () => {
  const skipped = report([
    jsonSpec('01-core.spec.ts', 'skipped'),
    jsonSpec('nested/02-admin.spec.ts', 'skipped'),
  ]);
  skipped.suites[0].specs[0].tests[0] = jsonTest('skipped', 'setup');
  skipped.stats.expected = 0;
  skipped.stats.skipped = 3;

  const errors = validatePlaywrightResult(skipped, planned, { cwd }).errors.join('\n');
  assert.match(errors, /stats\.expected must be greater than zero/);
  assert.match(errors, /stats\.skipped must be zero/);
  assert.match(errors, /planned spec has no non-skipped test.*01-core\.spec\.ts/);
  assert.match(errors, /planned spec has no non-skipped test.*02-admin\.spec\.ts/);
});

test('does not reinterpret unexpected outcomes that Playwright already fails on', () => {
  // `unexpected` 는 Playwright 가 non-zero exit 로 CI 를 이미 red 로 만든다. 계약이 같은 판정을
  // 중복하지 않는다 — outcome 분류를 재해석하지 않는다는 원래 의미는 이 축에 그대로 남는다.
  const failed = report([
    jsonSpec('01-core.spec.ts', 'unexpected'),
    jsonSpec('nested/02-admin.spec.ts'),
  ]);
  assert.deepEqual(validatePlaywrightResult(failed, planned, { cwd }).errors, []);
});

// [2026-09-01 신설] flaky 는 다르다 — 재시도로 통과하면 Playwright 는 **exit 0** 이라 어떤 층도
//   잡지 않는다. 종전에는 이 계약도 집계·출력만 해서, 실패 후 재시도로 통과한 테스트가 green 과
//   구별되지 않았다(2026-08-31 PR #528 의 간헐 실패가 이 구멍으로 통과했다).
test('gates flaky outcomes that no other layer would catch', () => {
  const flaky = report([
    jsonSpec('01-core.spec.ts'),
    jsonSpec('nested/02-admin.spec.ts', 'flaky'),
  ]);
  assert.match(
    validatePlaywrightResult(flaky, planned, { cwd }).errors.join('\n'),
    /stats\.flaky must be zero/,
  );

  // 정상(재시도 없이 통과)은 그대로 green 이어야 한다 — 완화가 아니라 신호 복구다.
  assert.deepEqual(validatePlaywrightResult(report(), planned, { cwd }).errors, []);
});

test('rejects malformed counters, traversal, duplicate plans, and invalid test records', () => {
  const malformed = report();
  malformed.stats.expected += 1;
  malformed.suites[1].specs[0].file = '../outside.spec.ts';
  malformed.suites[1].suites[0].specs[0].tests[0].status = 'passed';

  const errors = validatePlaywrightResult(
    malformed,
    ['e2e/01-core.spec.ts', 'e2e/01-core.spec.ts'],
    { cwd },
  ).errors.join('\n');
  assert.match(errors, /duplicate planned spec/);
  assert.match(errors, /report spec path escapes configured rootDir/);
  assert.match(errors, /invalid Playwright outcome/);
  assert.match(errors, /stats\.expected does not match test outcomes/);
});

test('rejects wrong rootDir, malformed JSON shape, and reports without full-suite', () => {
  assert.match(
    validatePlaywrightResult({}, planned, { cwd }).errors.join('\n'),
    /config must be an object|suites must be an array/,
  );

  const wrongRoot = report();
  wrongRoot.config.rootDir = path.join(cwd, 'other');
  wrongRoot.config.projects = [{ name: 'setup' }];
  const errors = validatePlaywrightResult(wrongRoot, planned, { cwd }).errors.join('\n');
  assert.match(errors, /config\.rootDir must equal.*frontend.*e2e/i);
  assert.match(errors, /full-suite project is missing/);
});

test('CLI passes a complete report and exits nonzero for an all-skipped report', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-result-contract-'));
  const reportPath = path.join(temporary, 'results.json');
  const inventoryPath = path.join(temporary, 'inventory.json');
  const scriptPath = path.resolve('scripts/playwright-result-contract.mjs');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report()), 'utf8');
    fs.writeFileSync(inventoryPath, JSON.stringify(report()), 'utf8');
    const green = spawnSync(process.execPath, [scriptPath, '--report', reportPath, '--inventory', inventoryPath, ...planned], {
      cwd,
      encoding: 'utf8',
    });
    assert.equal(green.status, 0, green.stderr);
    assert.match(green.stdout, /2\/2 specs, 3 expected/);

    const skipped = report([
      jsonSpec('01-core.spec.ts', 'skipped'),
      jsonSpec('nested/02-admin.spec.ts', 'skipped'),
    ]);
    skipped.suites[0].specs[0].tests[0] = jsonTest('skipped', 'setup');
    skipped.stats.expected = 0;
    skipped.stats.skipped = 3;
    fs.writeFileSync(reportPath, JSON.stringify(skipped), 'utf8');
    const red = spawnSync(process.execPath, [scriptPath, '--report', reportPath, '--inventory', inventoryPath, ...planned], {
      cwd,
      encoding: 'utf8',
    });
    assert.equal(red.status, 1);
    assert.match(red.stderr, /stats\.expected must be greater than zero/);
    assert.match(red.stderr, /stats\.skipped must be zero/);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test('API and browser projects have disjoint ownership, and duplicate project execution is red', () => {
  const specs = [jsonSpec('contracts/authorization.spec.ts', 'expected', 'api-contract'), jsonSpec('journeys/session.spec.ts')];
  const combined = report(specs);
  combined.config.projects.push({ name: 'api-contract' });
  const plan = specs.map(spec => `e2e/${spec.file}`);
  assert.deepEqual(validatePlaywrightResult(combined, plan, { cwd, inventory: structuredClone(combined) }).errors, []);
  const duplicate = structuredClone(combined);
  duplicate.suites[1].specs[0].tests.push(jsonTest('expected'));
  duplicate.stats.expected += 1;
  assert.match(validatePlaywrightResult(duplicate, plan, { cwd, inventory: combined }).errors.join('\n'), /must belong to api-contract|unplanned test coordinate/);
});

test('inventory detects one missing test within a present file, missing setup, and repeated results', () => {
  const inventory = report();
  const secondTest = jsonSpec('01-core.spec.ts');
  secondTest.id += '-second';
  secondTest.title += ' second';
  inventory.suites[1].specs.push(secondTest);
  inventory.stats.expected += 1;
  assert.match(validatePlaywrightResult(report(), planned, { cwd, inventory }).errors.join('\n'), /missing planned test coordinate/);
  const noSetup = report();
  noSetup.suites.shift();
  noSetup.stats.expected -= 1;
  assert.match(validatePlaywrightResult(noSetup, planned, { cwd, inventory: report() }).errors.join('\n'), /missing planned test coordinate/);
  const duplicate = report();
  duplicate.suites[1].specs.push(structuredClone(duplicate.suites[1].specs[0]));
  duplicate.stats.expected += 1;
  assert.match(validatePlaywrightResult(duplicate, planned, { cwd, inventory: report() }).errors.join('\n'), /duplicate test coordinate/);
});

test('global setup and teardown errors cannot pass the result contract', () => {
  const failed = report();
  failed.errors.push({ message: 'cleanup failed' });
  assert.match(validatePlaywrightResult(failed, planned, { cwd }).errors.join('\n'), /global execution errors/);
});

test('only the existing exact Linux visual waiver is accepted on a non-Linux local runtime', () => {
  const visual = jsonSpec('quality/visual-baselines.spec.ts', 'skipped');
  visual.title = 'Visual Regression Baseline';
  visual.tests[0].expectedStatus = 'skipped';
  const isolation = jsonSpec('quality/visual-baselines.spec.ts');
  isolation.id += '-isolation';
  const local = report([isolation, visual]);
  const plan = ['e2e/quality/visual-baselines.spec.ts'];
  assert.deepEqual(validatePlaywrightResult(local, plan, { cwd, platform: 'win32' }).errors, []);
  assert.match(validatePlaywrightResult(local, plan, { cwd, platform: 'linux' }).errors.join('\n'), /stats.skipped must be zero/);
  visual.title = 'another visual assertion';
  assert.match(validatePlaywrightResult(report([isolation, visual]), plan, { cwd, platform: 'win32' }).errors.join('\n'), /stats.skipped must be zero/);
});
