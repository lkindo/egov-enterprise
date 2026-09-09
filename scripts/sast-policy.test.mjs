import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { evaluateSarif, sanitizeSarif, policy, repoRoot, reviewedExceptions } from './sast-policy.mjs';

function report(score = '7.0', results = true) {
  return { version: '2.1.0', runs: [{
    tool: { driver: { name: 'CodeQL', version: policy.codeqlVersion, rules: [{
      id: 'java/injection', properties: { tags: ['security'], 'security-severity': score },
    }] } },
    invocations: [{ executionSuccessful: true }],
    results: results ? [{ ruleId: 'java/injection', ruleIndex: 0,
      locations: [{ physicalLocation: { artifactLocation: { uri: 'src/Example.java' }, region: { startLine: 3 } } }],
    }] : [],
  }] };
}

test('high and critical block while lower severity remains visible', () => {
  for (const score of ['7.0', '9.0', '10']) assert.equal(evaluateSarif(report(score), 'java').blocking.length, 1);
  for (const score of ['0.0', '3.9', '6.9']) {
    const result = evaluateSarif(report(score), 'java');
    assert.equal(result.blocking.length, 0);
    assert.equal(result.findings.length, 1);
  }
  assert.equal(evaluateSarif(report('7.0', false), 'java').blocking.length, 0);
});

test('existing, unchanged and suppressed vulnerabilities still block', () => {
  const input = report();
  Object.assign(input.runs[0].results[0], { baselineState: 'unchanged', suppressions: [{ kind: 'inSource', status: 'accepted' }] });
  assert.equal(evaluateSarif(input, 'java').blocking.length, 1);
});

test('CodeQL pack extension references are resolved', () => {
  const input = report();
  input.runs[0].tool.extensions = [{ rules: input.runs[0].tool.driver.rules }];
  input.runs[0].tool.driver.rules = [];
  input.runs[0].results[0] = { ruleId: 'java/injection', rule: { index: 0, toolComponent: { index: 0 } } };
  assert.equal(evaluateSarif(input, 'java').blocking.length, 1);
});

test('missing, malformed, incomplete or wrong-language evidence fails closed', () => {
  for (const mutate of [
    r => { r.runs = []; },
    r => { r.runs[0].tool.driver.version = '0.0.0'; },
    r => { r.runs[0].properties = { incrementalMode: 'diff-informed' }; },
    r => { r.runs[0].properties = { incrementalMode: 'diff-informed,overlay' }; },
    r => { delete r.runs[0].results; },
    r => { r.runs[0].invocations = []; },
    r => { r.runs[0].invocations[0].executionSuccessful = false; },
    r => { r.runs[0].invocations[0].toolExecutionNotifications = [{ level: 'error' }]; },
    r => { r.runs[0].tool.driver.rules = []; },
    r => { r.runs[0].tool.driver.rules[0].defaultConfiguration = { enabled: false }; },
    r => { r.runs[0].results[0].ruleId = 'unknown'; },
    r => { delete r.runs[0].tool.driver.rules[0].properties['security-severity']; },
    r => { r.runs[0].tool.driver.rules[0].properties['security-severity'] = 'NaN'; },
    r => { r.runs[0].tool.driver.rules[0].properties['security-severity'] = '-1'; },
  ]) {
    const input = report(); mutate(input);
    assert.throws(() => evaluateSarif(input, 'java'));
  }
  assert.throws(() => evaluateSarif(report(), 'javascript'));
  assert.throws(() => evaluateSarif(report(), 'unknown'));
});

test('shared SARIF keeps locations and rules without source text or derived messages', () => {
  const input = report();
  input.runs[0].results[0].message = { text: 'private fixture content' };
  input.runs[0].results[0].locations[0].physicalLocation.region.snippet = { text: 'private fixture content' };
  input.runs[0].artifacts = [{ contents: { text: 'private fixture content' } }];
  const sanitized = sanitizeSarif(input);
  assert.doesNotMatch(JSON.stringify(sanitized), /private fixture content/);
  assert.match(JSON.stringify(input), /private fixture content/);
  assert.deepEqual(evaluateSarif(sanitized, 'java'), evaluateSarif(input, 'java'));
});

test('real CLI exits 0 for reviewed, 1 for high, and 2 for incomplete or invalid reports', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sast-policy-'));
  const file = path.join(directory, 'result.sarif');
  const command = path.join(repoRoot, 'scripts/sast-policy.mjs');
  const incremental = report();
  incremental.runs[0].properties = { incrementalMode: 'diff-informed' };
  const reviewed = report('7', false);
  reviewed.runs[0].results = reviewedExceptions.findings.filter(e => e.language === 'java').map(e => ({
    ruleId: e.ruleId, partialFingerprints: { primaryLocationLineHash: e.fingerprint },
    locations: [{ physicalLocation: { artifactLocation: { uri: e.file }, region: { startLine: e.line } } }],
  }));
  reviewed.runs[0].tool.driver.rules = [...new Set(reviewed.runs[0].results.map(r => r.ruleId))].map(id => ({
    id, properties: { tags: ['security'], 'security-severity': '7.8' },
  }));
  for (const [input, exit] of [[reviewed, 0], [report('7', false), 2], [report('7'), 1], [incremental, 2], [{}, 2]]) {
    fs.writeFileSync(file, JSON.stringify(input));
    assert.equal(spawnSync(process.execPath, [command, file, 'java']).status, exit);
  }
  assert.equal(spawnSync(process.execPath, [command, path.join(directory, 'absent'), 'java']).status, 2);
});
