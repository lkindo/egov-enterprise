import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as verificationRecord from './verification-record.mjs';
import { heavyProcessKinds, listProcesses, waitingExclusions } from './verification-record.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

test('the heavy-run scan skips the caller ancestry, survives pid cycles and keeps only kind names', () => {
  const processes = [
    { pid: 1, ppid: 0, name: 'init', command: 'init' },
    { pid: 10, ppid: 1, name: 'node.exe', command: '"C:\\nodejs\\node.exe" scripts/verify.mjs --scope fast' },
    { pid: 11, ppid: 10, name: 'node.exe', command: 'node scripts/heavy-run-queue.mjs run --kind verify -- node scripts/verify.mjs --scope fast' },
    { pid: 20, ppid: 1, name: 'node.exe', command: 'node private-root/node_modules/vitest/vitest.mjs run' },
    { pid: 21, ppid: 1, name: 'java.exe', command: "java -cp private.jar worker.org.gradle.process.internal.worker.GradleWorkerMain 'Gradle Test Executor 3'" },
    { pid: 22, ppid: 1, name: 'node', command: 'node --test scripts/private.test.mjs' },
    { pid: 23, ppid: 1, name: 'node.exe', command: 'node scripts/build-atlas.mjs' },
    { pid: 24, ppid: 1, name: 'node.exe', command: null },
  ];
  assert.deepEqual(heavyProcessKinds(processes, 11), ['gradle-test-worker', 'node-test', 'vitest']);
  const foreign = [
    { pid: 30, ppid: 1, name: 'node.exe', command: 'node D:\\wt-other\\scripts\\verify.mjs --scope full' },
    { pid: 31, ppid: 1, name: 'sh.exe', command: 'sh .githooks/pre-push origin private-remote' },
    { pid: 32, ppid: 1, name: 'node.exe', command: '"C:\\nodejs\\node.exe" "D:\\wt-x\\node_modules\\@playwright\\test\\cli.js" test --project=full-suite' },
    { pid: 33, ppid: 1, name: 'node', command: 'node scripts/verify-reusable-base.mjs --profile core' },
  ];
  assert.deepEqual(heavyProcessKinds([...processes, ...foreign], 11),
    ['gradle-test-worker', 'node-test', 'playwright', 'pre-push', 'reusable-base', 'verify', 'vitest']);
  // Processes that only mention these words, or tools' resident processes that run no tests, are not heavy runs.
  const lookalikes = [
    { pid: 11, ppid: 1, name: 'node.exe', command: 'node scripts/verify.mjs --scope fast' },
    { pid: 50, ppid: 1, name: 'powershell.exe', command: "powershell -Command while (Get-CimInstance Win32_Process | ? { $_.CommandLine -match 'node --test .scripts|vitest|GradleWorkerMain|playwright test ' }) { sleep 5 }" },
    { pid: 51, ppid: 1, name: 'rg.exe', command: 'rg -n vitest frontend/src' },
    { pid: 52, ppid: 1, name: 'node.exe', command: 'node D:\\x\\node_modules\\@playwright\\test\\cli.js show-report' },
    { pid: 53, ppid: 1, name: 'node.exe', command: 'node D:\\x\\node_modules\\@playwright\\test\\cli.js install chromium' },
    { pid: 54, ppid: 1, name: 'java.exe', command: "java worker.org.gradle.process.internal.worker.GradleWorkerMain 'Gradle Worker Daemon 2'" },
    { pid: 55, ppid: 1, name: 'bash.exe', command: 'bash -c "until ! pgrep -f .githooks/pre-push; do sleep 5; done"' },
    { pid: 56, ppid: 1, name: 'node.exe', command: 'node scripts/x.mjs --test-reporter=tap' },
    { pid: 57, ppid: 1, command: 'node --test scripts/unnamed.test.mjs' },
  ];
  assert.deepEqual(heavyProcessKinds(lookalikes, 11), []);
  // A blind listing is unknown, never "nothing": no own command line, or an unreadable watched process and nothing seen.
  assert.equal(heavyProcessKinds(lookalikes.slice(1), 11), null, 'the caller must find its own entry');
  assert.equal(heavyProcessKinds([{ ...lookalikes[0], command: null }, ...lookalikes.slice(1)], 11), null);
  const elevated = { pid: 60, ppid: 1, name: 'java.exe', command: null };
  assert.equal(heavyProcessKinds([...lookalikes, elevated], 11), null);
  assert.deepEqual(heavyProcessKinds([...processes, elevated], 11), ['gradle-test-worker', 'node-test', 'vitest']);
  assert.deepEqual(heavyProcessKinds([...lookalikes, { pid: 61, ppid: 1, name: 'svchost.exe', command: null }], 11), []);
  const cycle = [{ pid: 40, ppid: 41, name: 'node', command: 'node verify-helper' },
    { pid: 41, ppid: 40, name: 'node', command: 'node node_modules/vitest/vitest.mjs run' }];
  assert.deepEqual(heavyProcessKinds(cycle, 40), []);
});

test('waitingExclusions keeps only waiting supervisors and their direct entry-shaped parents', () => {
  const list = [
    { pid: 10, ppid: 1, name: 'node.exe', command: 'node scripts/verify.mjs push' },
    { pid: 11, ppid: 10, name: 'node.exe', command: 'node scripts/heavy-run-queue.mjs run --kind verify -- node scripts/verify.mjs push' },
    { pid: 12, ppid: 1, name: 'node.exe', command: 'node node_modules/vitest/vitest.mjs run' },
  ];
  assert.deepEqual([...waitingExclusions(list, new Set([11, 12]))].sort((a, b) => a - b), [10, 11]);
});

test('the real process listing shows this process with its executable and command line', () => {
  const self = listProcesses({ timeout: 120_000 }).find(entry => entry.pid === process.pid);
  assert.ok(self, 'the listing must contain the caller');
  assert.match(String(self.name), /^node(?:\.exe)?$/i);
  assert.equal(typeof self.command, 'string');
  assert.ok(Number.isInteger(self.ppid));
});

function pollingRetirementViolations({ hookSource, verifySource, recordSource }) {
  const violations = [];
  if (/verification-record\.mjs|build\/verification-runs/u.test(hookSource)) {
    violations.push('pre-push must not call verification-record.mjs or reference build/verification-runs');
  }
  if (/verification-record\.mjs|EGOV_VERIFICATION_RUN_ID|build\/verification-runs/u.test(verifySource)) {
    violations.push('verify.mjs must not import verification-record.mjs or emit EGOV_VERIFICATION_RUN_ID');
  }
  if (/createRun|noteTimeoutRerun|summarizeRuns|verification-runs|\.jsonl/u.test(recordSource)) {
    violations.push('verification-record.mjs must not retain JSONL recording functions or paths');
  }
  return violations;
}

test('DEC-OPS-436 retires JSONL recording and per-step CIM polling while preserving queue helpers (including H5 red proofs)', () => {
  for (const name of ['heavyProcessKinds', 'listProcesses', 'listProcessesAsync', 'waitingExclusions', 'waitingQueuePids']) {
    assert.equal(typeof verificationRecord[name], 'function', `${name} must remain exported for heavy-run-queue`);
  }
  for (const retired of ['createRun', 'noteTimeoutRerun', 'summarizeRuns']) {
    assert.equal(verificationRecord[retired], undefined, `${retired} must remain retired`);
  }
  const current = {
    hookSource: readFileSync(path.join(REPO_ROOT, '.githooks', 'pre-push'), 'utf8'),
    verifySource: readFileSync(path.join(REPO_ROOT, 'scripts', 'verify.mjs'), 'utf8'),
    recordSource: readFileSync(path.join(HERE, 'verification-record.mjs'), 'utf8'),
  };
  assert.deepEqual(pollingRetirementViolations(current), []);
  assert.equal(pollingRetirementViolations({ ...current, hookSource: `${current.hookSource}\nnode scripts/verification-record.mjs begin\n` }).length, 1);
  assert.equal(pollingRetirementViolations({ ...current, verifySource: `${current.verifySource}\nimport { createRun } from './verification-record.mjs';\n` }).length, 1);
  assert.equal(pollingRetirementViolations({ ...current, recordSource: `${current.recordSource}\nbuild/verification-runs\n` }).length, 1);
});
