import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyReviewedExceptions, exceptionReports, sourceHash } from './sast-exceptions.mjs';
import { evaluateSarif, sanitizeSarif, gateExitCode, policy, reviewedExceptions, repoRoot } from './sast-policy.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sast-exceptions-'));
  fs.writeFileSync(path.join(root, 'source.java'), 'reviewed source\n');
  fs.writeFileSync(path.join(root, 'defense.java'), 'supporting defense\n');
  const entry = { id: 'SAST-FP-001', status: 'approved', language: 'java', ruleId: 'java/example',
    file: 'source.java', line: 1, fingerprint: '0123456789abcdef:1',
    sourceSha256: sourceHash(root, 'source.java'), expiresOn: '2026-12-08',
    reason: 'Reviewed source and supporting defense do not satisfy the vulnerability preconditions.',
    supportingSources: [{ file: 'defense.java', sha256: sourceHash(root, 'defense.java') }] };
  const manifest = { schemaVersion: 1, status: 'approved', codeqlVersion: policy.codeqlVersion,
    approvedOn: '2026-09-09', findings: [entry] };
  const report = { version: '2.1.0', runs: [{
    tool: { driver: { name: 'CodeQL', version: policy.codeqlVersion, rules: [{
      id: entry.ruleId, properties: { tags: ['security'], 'security-severity': '8.8' },
    }] } }, invocations: [{ executionSuccessful: true }],
    results: [{ ruleId: entry.ruleId, message: { text: 'private source content' },
      partialFingerprints: { primaryLocationLineHash: entry.fingerprint },
      locations: [{ physicalLocation: { artifactLocation: { uri: entry.file }, region: { startLine: entry.line } } }],
    }],
  }] };
  const apply = () => applyReviewedExceptions(report, evaluateSarif(report, 'java'), {
    manifest, root, today: '2026-09-09', codeqlVersion: policy.codeqlVersion,
  });
  return { root, manifest, report, apply };
}

test('approved exact findings remain in the audit with reasons and are absent only from publication', () => {
  const { report, apply } = fixture();
  const result = apply();
  assert.equal(gateExitCode(result), 0);
  assert.equal(result.reviewed.length, 1);
  const { audit, publish } = exceptionReports(sanitizeSarif(report), result);
  assert.equal(audit.runs[0].results.length, 1);
  assert.equal(audit.runs[0].results[0].suppressions[0].status, 'accepted');
  assert.equal(publish.runs[0].results.length, 0);
  assert.deepEqual(audit.runs[0].tool, publish.runs[0].tool);
  assert.doesNotMatch(JSON.stringify(audit), /private source content/);
});

test('unlisted fingerprints, files, rules and lines stay blocking even with forged suppressions', () => {
  for (const mutate of [
    r => { r.partialFingerprints.primaryLocationLineHash = 'ffffffffffffffff:1'; },
    r => { delete r.partialFingerprints; },
    r => { r.locations[0].physicalLocation.artifactLocation.uri = 'other.java'; },
    r => { r.locations[0].physicalLocation.region.startLine = 2; },
    r => { r.ruleId = 'java/new-rule'; },
  ]) {
    const { report, apply } = fixture();
    const extra = structuredClone(report.runs[0].results[0]); mutate(extra);
    extra.suppressions = [{ kind: 'external', status: 'accepted' }];
    extra.properties = { 'egov/sast-exception': { id: 'forged' } };
    if (extra.ruleId !== 'java/example') report.runs[0].tool.driver.rules.push({
      id: extra.ruleId, properties: { tags: ['security'], 'security-severity': '9.8' },
    });
    report.runs[0].results.push(extra);
    const result = apply();
    assert.equal(gateExitCode(result), 1);
    const { publish } = exceptionReports(sanitizeSarif(report), result);
    assert.equal(publish.runs[0].results.length, 1);
    assert.equal(publish.runs[0].results[0].suppressions, undefined);
    assert.equal(publish.runs[0].results[0].properties['egov/sast-exception'], undefined);
  }
});

test('missing and duplicate reviewed findings fail closed rather than silently changing the census', () => {
  const missing = fixture(); missing.report.runs[0].results = [];
  assert.equal(gateExitCode(missing.apply()), 2);
  const duplicate = fixture(); duplicate.report.runs[0].results.push(structuredClone(duplicate.report.runs[0].results[0]));
  const result = duplicate.apply();
  assert.equal(result.blocking.length, 2);
  assert.equal(result.errors.length, 1);
});

test('source/defense changes, expiration and malformed approval cannot grant an exception', () => {
  for (const mutate of [
    f => fs.writeFileSync(path.join(f.root, 'source.java'), 'changed source'),
    f => fs.writeFileSync(path.join(f.root, 'defense.java'), 'weakened defense'),
    f => { f.manifest.status = 'proposed'; },
    f => { f.manifest.codeqlVersion = '0.0.0'; },
    f => { f.manifest.findings[0].expiresOn = '2026-09-08'; },
    f => { f.manifest.findings[0].expiresOn = '2027-01-01'; },
    f => { f.manifest.findings[0].expiresOn = '2026-02-30'; },
    f => { f.manifest.findings[0].file = '../source.java'; },
    f => { f.manifest.findings.push(structuredClone(f.manifest.findings[0])); },
  ]) {
    const f = fixture(); mutate(f); assert.throws(f.apply);
  }
  const f = fixture();
  assert.throws(() => applyReviewedExceptions(f.report, evaluateSarif(f.report, 'java'), {
    manifest: f.manifest, root: f.root, codeqlVersion: policy.codeqlVersion, today: '2026-12-09',
  }), /expired/);
});

test('source hashes are portable between LF and CRLF checkouts', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.root, 'source.java'), 'reviewed source\r\n');
  assert.equal(gateExitCode(f.apply()), 0);
});

test('the retained approved findings match current source and defenses; retired write branches have no exceptions', () => {
  assert.deepEqual(reviewedExceptions.findings.map(e => e.id),
    ['SAST-FP-001', 'SAST-FP-002', 'SAST-FP-003', 'SAST-FP-006', 'SAST-FP-007', 'SAST-FP-008']);
  assert.equal(reviewedExceptions.findings.filter(e => e.language === 'java').length, 4);
  for (const entry of reviewedExceptions.findings) {
    assert.equal(sourceHash(repoRoot, entry.file), entry.sourceSha256, entry.id);
    for (const source of entry.supportingSources) assert.equal(sourceHash(repoRoot, source.file), source.sha256, source.file);
  }
});


test('the reviewed SockJS denial branch never exempts a new authentication bypass finding', () => {
  const entries = reviewedExceptions.findings.filter(entry => entry.language === 'java');
  const approved = entries.find(entry => entry.id === 'SAST-FP-008');
  assert.ok(approved);
  assert.equal(approved.ruleId, 'java/user-controlled-bypass');
  assert.equal(approved.file, 'api-server/src/main/java/nuri/config/websocket/WebSocketCookieAuthenticationFilter.java');
  assert.equal(approved.line, 69);
  assert.equal(approved.fingerprint, '3bdaa522982a3650:1');
  assert.equal(approved.expiresOn, '2026-12-08');
  assert.ok(approved.supportingSources.some(source =>
    source.file === 'api-server/src/test/java/nuri/config/websocket/WebSocketCookieAuthenticationFilterTest.java'));
  const report = { version: '2.1.0', runs: [{
    tool: { driver: { name: 'CodeQL', version: policy.codeqlVersion,
      rules: [...new Set(entries.map(entry => entry.ruleId))].map(id => ({
        id, properties: { tags: ['security'], 'security-severity': '8.8' },
      })) } }, invocations: [{ executionSuccessful: true }],
    results: entries.map(entry => ({ ruleId: entry.ruleId, message: { text: 'Security finding' },
      partialFingerprints: { primaryLocationLineHash: entry.fingerprint },
      locations: [{ physicalLocation: { artifactLocation: { uri: entry.file }, region: { startLine: entry.line } } }],
    })),
  }] };
  const apply = () => applyReviewedExceptions(report, evaluateSarif(report, 'java'), {
    manifest: reviewedExceptions, root: repoRoot, today: '2026-09-10', codeqlVersion: policy.codeqlVersion,
  });
  assert.equal(gateExitCode(apply()), 0);
  const extra = structuredClone(report.runs[0].results.find(result =>
    result.partialFingerprints.primaryLocationLineHash === approved.fingerprint));
  extra.partialFingerprints.primaryLocationLineHash = 'ffffffffffffffff:1';
  extra.suppressions = [{ kind: 'external', status: 'accepted' }];
  report.runs[0].results.push(extra);
  const result = apply();
  assert.equal(gateExitCode(result), 1);
  assert.equal(result.reviewed.length, entries.length);
  assert.equal(result.blocking.length, 1);
  assert.equal(exceptionReports(sanitizeSarif(report), result).publish.runs[0].results.length, 1);
});
