import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { evaluateAuditReport } from './frontend-audit-policy.mjs';

function report(advisories) {
  const vulnerabilities = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  for (const advisory of Object.values(advisories)) vulnerabilities[advisory.severity] += 1;
  return { advisories, metadata: { vulnerabilities } };
}

function advisory(severity, findings) {
  return { severity, title: `${severity} fixture`, findings };
}

test('critical advisories block regardless of dependency type', () => {
  const policy = evaluateAuditReport(report({
    one: advisory('critical', [{ dev: true }]),
    two: advisory('critical', [{ dev: false }]),
  }));
  assert.deepEqual(policy.blocking.map(({ id }) => id), ['one', 'two']);
});

test('production high blocks while development-only high remains advisory', () => {
  const policy = evaluateAuditReport(report({
    production: advisory('high', [{ dev: false }]),
    development: advisory('high', [{ dev: true }]),
    mixed: advisory('high', [{ dev: true }, { dev: false }]),
    moderate: advisory('moderate', [{ dev: false }]),
  }));
  assert.deepEqual(policy.blocking.map(({ id }) => id), ['production', 'mixed']);
  assert.deepEqual(policy.advisoryOnly.map(({ id }) => id), ['development']);
});

test('missing dependency classification fails closed as production', () => {
  const policy = evaluateAuditReport(report({ unknown: advisory('high', [{}]) }));
  assert.deepEqual(policy.blocking.map(({ id }) => id), ['unknown']);
});

test('malformed or internally inconsistent reports fail closed', () => {
  assert.throws(() => evaluateAuditReport({}), /missing advisories/);
  assert.throws(() => evaluateAuditReport({
    advisories: { broken: { severity: 'high', findings: [] } },
    metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 } },
  }), /invalid shape/);
  assert.throws(() => evaluateAuditReport({
    advisories: {},
    metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 } },
  }), /count mismatch/);
});

test('CI performs one frontend audit request through the policy evaluator', () => {
  const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.equal(
    [...workflow.matchAll(/^\s*run: node \.\.\/scripts\/frontend-audit-policy\.mjs\s*$/gm)].length,
    1,
  );
  assert.doesNotMatch(workflow, /^\s*run:\s*pnpm audit\b/gm);
});
