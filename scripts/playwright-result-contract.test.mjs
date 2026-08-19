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

test('does not reinterpret unexpected or flaky outcomes that Playwright owns', () => {
  const mixed = report([
    jsonSpec('01-core.spec.ts', 'unexpected'),
    jsonSpec('nested/02-admin.spec.ts', 'flaky'),
  ]);
  assert.deepEqual(validatePlaywrightResult(mixed, planned, { cwd }).errors, []);
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
  const scriptPath = path.resolve('scripts/playwright-result-contract.mjs');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report()), 'utf8');
    const green = spawnSync(process.execPath, [scriptPath, '--report', reportPath, ...planned], {
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
    const red = spawnSync(process.execPath, [scriptPath, '--report', reportPath, ...planned], {
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
