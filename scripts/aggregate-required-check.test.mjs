import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { evaluateRequiredAggregate } from './aggregate-required-check.mjs';

test('only selected success and explicitly unselected skip pass', () => {
  assert.equal(evaluateRequiredAggregate({
    classifierResult: 'success', expectedWork: 'true', sourceResult: 'success',
  }).ok, true);
  assert.equal(evaluateRequiredAggregate({
    classifierResult: 'success', expectedWork: 'false', sourceResult: 'skipped',
  }).ok, true);
});

test('classifier failure and every ambiguous source conclusion fail closed', () => {
  for (const input of [
    { classifierResult: 'failure', expectedWork: 'false', sourceResult: 'skipped' },
    { classifierResult: 'cancelled', expectedWork: 'true', sourceResult: 'success' },
    { classifierResult: 'success', expectedWork: 'true', sourceResult: 'failure' },
    { classifierResult: 'success', expectedWork: 'true', sourceResult: 'cancelled' },
    { classifierResult: 'success', expectedWork: 'true', sourceResult: 'skipped' },
    { classifierResult: 'success', expectedWork: 'false', sourceResult: 'success' },
    { classifierResult: 'success', expectedWork: '', sourceResult: '' },
  ]) {
    assert.equal(evaluateRequiredAggregate(input).ok, false, JSON.stringify(input));
  }
});

test('complete truth table has exactly two green states, including docs-only skipped work', () => {
  const classifierResults = ['success', 'failure', 'cancelled', 'skipped', ''];
  const expectedWorkValues = ['true', 'false', ''];
  const sourceResults = ['success', 'failure', 'cancelled', 'skipped', ''];
  const greenStates = [];

  for (const classifierResult of classifierResults) {
    for (const expectedWork of expectedWorkValues) {
      for (const sourceResult of sourceResults) {
        const input = { classifierResult, expectedWork, sourceResult };
        if (evaluateRequiredAggregate(input).ok) greenStates.push(input);
      }
    }
  }

  assert.deepEqual(greenStates, [
    { classifierResult: 'success', expectedWork: 'true', sourceResult: 'success' },
    { classifierResult: 'success', expectedWork: 'false', sourceResult: 'skipped' },
  ]);
});

test('CLI exit status is the aggregate result, not a log-only advisory', () => {
  const pass = spawnSync(process.execPath, ['scripts/aggregate-required-check.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, CLASSIFIER_RESULT: 'success', EXPECTED_WORK: 'true', SOURCE_RESULT: 'success' },
  });
  assert.equal(pass.status, 0, pass.stderr);

  const fail = spawnSync(process.execPath, ['scripts/aggregate-required-check.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, CLASSIFIER_RESULT: 'success', EXPECTED_WORK: 'true', SOURCE_RESULT: 'failure' },
  });
  assert.equal(fail.status, 1);
  assert.match(fail.stderr, /required aggregate failed/);
});
