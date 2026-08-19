import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateDependencySubmissionContract } from './dependency-submission-contract.mjs';
import {
  buildRetryDelays,
  comparisonUrl,
  waitForCompleteSnapshots,
} from './dependency-snapshot-readiness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const current = {
  producerContent: fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'dependency-submission.yml'), 'utf8'),
  publisherContent: fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'dependency-submission-publish.yml'), 'utf8'),
  ciContent: fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8'),
};

const inputs = {
  repository: 'owner/repository',
  baseSha: 'a'.repeat(40),
  headSha: 'b'.repeat(40),
  token: 'test-token',
  apiUrl: 'https://api.github.test',
};

function response(status = 200, warning = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(warning
      ? { 'x-github-dependency-graph-snapshot-warnings': Buffer.from(warning).toString('base64') }
      : {}),
    body: { cancel: async () => {} },
    text: async () => `status ${status}`,
  };
}

test('public-fork producer, trusted publisher, and required review form one fail-closed contract', () => {
  assert.deepEqual(validateDependencySubmissionContract(current), []);
});

test('contract turns red for write-token PR execution, publisher execution, scope loss, or readiness decoy', () => {
  const mutations = [
    {
      ...current,
      producerContent: current.producerContent.replace(
        "  generate-pr-snapshot:\n    if: github.event_name == 'pull_request'\n    permissions:\n      contents: read",
        "  generate-pr-snapshot:\n    if: github.event_name == 'pull_request'\n    permissions:\n      contents: write",
      ),
    },
    {
      ...current,
      publisherContent: current.publisherContent.replace(
        '    steps:\n',
        '    steps:\n      - name: Execute artifact\n        run: ./artifact/payload\n',
      ),
    },
    {
      ...current,
      producerContent: current.producerContent.replaceAll(
        '          DEPENDENCY_GRAPH_RUNTIME_INCLUDE_CONFIGURATIONS: (compileClasspath|runtimeClasspath)\n',
        '',
      ),
    },
    {
      ...current,
      ciContent: current.ciContent.replace(
        '        run: node scripts/dependency-snapshot-readiness.mjs',
        '        run: echo node scripts/dependency-snapshot-readiness.mjs',
      ),
    },
  ];

  for (const mutation of mutations) {
    assert.notDeepEqual(validateDependencySubmissionContract(mutation), []);
  }
});

test('readiness retries snapshot warnings with bounded exponential delays and then succeeds', async () => {
  const calls = [];
  const sleeps = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return calls.length < 3 ? response(200, 'missing head snapshot') : response();
  };

  await waitForCompleteSnapshots(inputs, {
    maxWaitSeconds: 30,
    fetchImpl,
    sleep: async milliseconds => sleeps.push(milliseconds),
    log: () => {},
  });

  assert.equal(calls.length, 3);
  assert.deepEqual(sleeps, [10_000, 20_000]);
  assert.equal(calls[0].url, comparisonUrl(inputs));
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
});

test('readiness is fail-closed when warnings remain at the bounded deadline', async () => {
  await assert.rejects(
    waitForCompleteSnapshots(inputs, {
      maxWaitSeconds: 30,
      fetchImpl: async () => response(200, 'missing Gradle head snapshot'),
      sleep: async () => {},
      log: () => {},
    }),
    /completeness was not proven within 30s.*missing Gradle head snapshot/i,
  );
});

test('readiness retries transient API failures but rejects authorization failures immediately', async () => {
  let transientCalls = 0;
  await waitForCompleteSnapshots(inputs, {
    maxWaitSeconds: 10,
    fetchImpl: async () => (++transientCalls === 1 ? response(503) : response()),
    sleep: async () => {},
    log: () => {},
  });
  assert.equal(transientCalls, 2);

  let networkCalls = 0;
  await waitForCompleteSnapshots(inputs, {
    maxWaitSeconds: 10,
    fetchImpl: async () => {
      networkCalls += 1;
      if (networkCalls === 1) throw new TypeError('temporary network failure');
      return response();
    },
    sleep: async () => {},
    log: () => {},
  });
  assert.equal(networkCalls, 2);

  let deniedCalls = 0;
  await assert.rejects(
    waitForCompleteSnapshots(inputs, {
      maxWaitSeconds: 600,
      fetchImpl: async () => {
        deniedCalls += 1;
        return response(403);
      },
      sleep: async () => {},
      log: () => {},
    }),
    /HTTP 403/,
  );
  assert.equal(deniedCalls, 1);
});

test('retry schedule reaches the deadline exactly and invalid inputs fail before network access', async () => {
  assert.deepEqual(buildRetryDelays(30), [0, 10, 20]);
  assert.equal(buildRetryDelays(600).reduce((sum, value) => sum + value, 0), 600);

  let called = false;
  await assert.rejects(
    waitForCompleteSnapshots({ ...inputs, headSha: 'not-a-sha' }, {
      fetchImpl: async () => {
        called = true;
        return response();
      },
      sleep: async () => {},
    }),
    /HEAD_SHA.*40-hex/i,
  );
  assert.equal(called, false);
});
