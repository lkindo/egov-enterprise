import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateDependencySubmissionContract } from './dependency-submission-contract.mjs';
import {
  buildRetryDelays,

  classifySnapshotWarning,
  comparisonUrl,
  isPublisherConfiguredOnBase,

  resolutionGuidance,
  waitForCompleteSnapshots,
} from './dependency-snapshot-readiness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 아래 변이 테스트의 앵커는 여러 줄에 걸치므로 `\n`을 그대로 담는다. Windows 체크아웃은
// core.autocrlf 때문에 같은 blob을 CRLF로 재구현하고, 그러면 앵커가 하나도 맞지 않아
// 변이가 전부 no-op이 된다 — 게이트가 red를 증명하지 못한 채 통과한다(vacuous).
// 검증기 자체는 이미 정규화하므로 여기서도 읽는 시점에 맞춰 플랫폼 의존성을 없앤다.
function readWorkflow(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), 'utf8').replace(/\r\n/g, '\n');
}

const current = {
  producerContent: readWorkflow('.github', 'workflows', 'dependency-submission.yml'),
  publisherContent: readWorkflow('.github', 'workflows', 'dependency-submission-publish.yml'),
  ciContent: readWorkflow('.github', 'workflows', 'ci.yml'),
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
    // [2026-08-29] ref 가드를 되돌리면 workflow_dispatch 로 임의 브랜치의 빌드가
    // contents:write 로 돌 수 있다 — 워크플로 주석이 약속한 경계가 다시 비집행이 된다.
    {
      ...current,
      producerContent: current.producerContent.replace(
        "    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'",
        "    if: github.event_name != 'pull_request'",
      ),
    },
  ];

  for (const mutation of mutations) {
    assert.notDeepEqual(validateDependencySubmissionContract(mutation), []);
  }
});

test('readiness skips snapshot wait when publisher workflow is absent on base branch', async () => {
  let compareCalled = false;
  const logs = [];
  const fetchImpl = async (url) => {
    if (url.includes('/contents/')) return response(404);
    compareCalled = true;
    return response(200, 'missing head snapshot');
  };

  await waitForCompleteSnapshots(inputs, {
    maxWaitSeconds: 30,
    fetchImpl,
    sleep: async () => {},
    log: message => logs.push(message),
  });

  assert.equal(compareCalled, false);
  assert.match(logs[0], /bootstrap phase allows proceeding/);
});

test('readiness retries snapshot warnings with bounded exponential delays and then succeeds', async () => {
  const calls = [];
  const sleeps = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/contents/')) return response(200);
    const compareCalls = calls.filter(c => c.url.includes('/dependency-graph/compare/'));
    return compareCalls.length < 3 ? response(200, 'missing head snapshot') : response();
  };

  await waitForCompleteSnapshots(inputs, {
    maxWaitSeconds: 30,
    fetchImpl,
    sleep: async milliseconds => sleeps.push(milliseconds),
    log: () => {},
  });

  const compareCalls = calls.filter(c => c.url.includes('/dependency-graph/compare/'));
  assert.equal(compareCalls.length, 3);
  assert.deepEqual(sleeps, [10_000, 20_000]);
  assert.equal(compareCalls[0].url, comparisonUrl(inputs));
  assert.equal(compareCalls[0].options.headers.Authorization, 'Bearer test-token');
});

test('readiness is fail-closed when warnings remain at the bounded deadline', async () => {
  await assert.rejects(
    waitForCompleteSnapshots(inputs, {
      maxWaitSeconds: 30,
      fetchImpl: async (url) => {
        if (url.includes('/contents/')) return response(200);
        return response(200, 'missing Gradle head snapshot');
      },
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
    fetchImpl: async (url) => {
      if (url.includes('/contents/')) return response(200);
      return ++transientCalls === 1 ? response(503) : response();
    },
    sleep: async () => {},
    log: () => {},
  });
  assert.equal(transientCalls, 2);

  let networkCalls = 0;
  await waitForCompleteSnapshots(inputs, {
    maxWaitSeconds: 10,
    fetchImpl: async (url) => {
      if (url.includes('/contents/')) return response(200);
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
      fetchImpl: async (url) => {
        if (url.includes('/contents/')) return response(200);
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

/**
 * [2026-08-29] 실패 메시지가 "무엇을 기다려야 하는지" 를 말하게 한다 (GAP-DEP-001).
 *
 * 종전 메시지는 디코딩된 경고 원문만 흘렸다. 그래서 base 부재인지 head 부재인지, 기다리면
 * 해소되는지, 무엇을 실행해야 하는지가 전부 사람의 추적 과제였다 — 실측으로 두 번(8c850384
 * 의 base 부재, 4772119bd 의 head 부재) 병합이 막혔고 둘 다 대기로는 해소되지 않았다.
 *
 * ⚠ 이 계약이 지키는 경계: 분류는 **어느 쪽 SHA 가 비었는가**까지만 단정한다. head 부재의
 *   하위 원인 7가지는 글자 그대로 같은 경고를 내므로, 안내는 원인을 지어내지 않고 가르는
 *   명령을 준다. 알 수 없는 경고를 아는 척 분류하면 엉뚱한 곳을 고치게 되므로 unknown 은
 *   반드시 원문을 그대로 보여 준다.
 */
test('snapshot warnings classify into the axis that is actually missing', () => {
  // GitHub 이 실제로 내보내는 **완전한** 원문 2종. 종전 known-gaps 인용은 앞뒤가 잘린
  // 부분 문자열이었다("The number of ..." 접두와 "You may see ..." 접미가 빠져 있었다) —
  // 잘린 인용에만 맞춘 정규식은 실제 헤더를 못 잡는다.
  assert.equal(
    classifySnapshotWarning(
      'The number of snapshots compared for the base SHA (0) and the head SHA (1) do not match.'
      + ' You may see unexpected additions in the diff.',
    ).kind,
    'base-missing',
  );
  assert.equal(
    classifySnapshotWarning(
      'No snapshots were found for the head SHA 63d50c7154fc8bfb6ce9173f0d0edfe5f31d810f.',
    ).kind,
    'head-missing',
  );
  // head 부재는 **두 형태 중 하나로** 온다 — 전용 문구와 count 문구 어느 쪽이 오는지는
  // 비공개 서버 로직이라 갈리지 않는다. 두 경로 모두 같은 축으로 받아야 한다.
  assert.equal(
    classifySnapshotWarning(
      'The number of snapshots compared for the base SHA (1) and the head SHA (0) do not match.'
      + ' You may see unexpected removals in the diff.',
    ).kind,
    'head-missing',
  );
  // 종전 원장이 인용한 잘린 형태도 계속 받는다(회귀 방지).
  assert.equal(
    classifySnapshotWarning('snapshots compared for the base SHA (0) and the head SHA (1) do not match').kind,
    'base-missing',
  );

  // 개수 형태의 나머지 조합.
  assert.equal(
    classifySnapshotWarning('snapshots compared for the base SHA (1) and the head SHA (0) do not match').kind,
    'head-missing',
  );
  assert.equal(
    classifySnapshotWarning('snapshots compared for the base SHA (0) and the head SHA (0) do not match').kind,
    'both-missing',
  );
  // 양쪽 다 있는데 개수가 다르면 부재가 아니다 — correlator/스코프 축이므로 다른 안내가 나가야 한다.
  assert.equal(
    classifySnapshotWarning('snapshots compared for the base SHA (2) and the head SHA (1) do not match').kind,
    'count-mismatch',
  );

  // 모르는 것을 아는 척하지 않는다.
  const unknown = classifySnapshotWarning('some future wording GitHub has not used yet');
  assert.equal(unknown.kind, 'unknown');
  assert.equal(unknown.warning, 'some future wording GitHub has not used yet');
  assert.equal(classifySnapshotWarning('').kind, 'none');
});

test('guidance names the resolution command and whether waiting helps', () => {
  const base = resolutionGuidance(
    classifySnapshotWarning('snapshots compared for the base SHA (0) and the head SHA (1) do not match'),
    inputs,
  );
  assert.match(base, /기다려도 해소되지 않습니다/);
  assert.match(base, /gh workflow run dependency-submission\.yml --ref main/);

  const head = resolutionGuidance(
    classifySnapshotWarning('No snapshots were found for the head SHA abc123.'),
    inputs,
  );
  // head 부재는 PR 직후 한동안 정상이므로 "기다려도 소용없다" 고 단정하면 거짓이 된다.
  assert.match(head, /정상입니다/);
  assert.match(head, /actions\/runs\?head_sha=/);
  assert.match(head, /action_required/);
  // ⚠ 안내가 신뢰 경계를 깨는 해소책을 권하면 안 된다. PR 브랜치를 producer 에 dispatch 하면
  //   그 브랜치의 Gradle 빌드가 contents:write 로 돈다 — 이 워크플로가 막으려는 바로 그것이다.
  //   (실측: 조사 단계에서 그 해소책이 후보로 올라왔고, 채택했다면 게이트가 스스로 우회로를
  //    가르치는 문서가 됐을 것이다.)
  assert.doesNotMatch(head, /gh workflow run dependency-submission\.yml --ref (?!main)/);
  assert.match(head, /신뢰 경계/);

  // unknown 은 원문을 그대로 싣고 특정 원인을 지목하지 않는다.
  const unknown = resolutionGuidance(classifySnapshotWarning('brand new wording'), inputs);
  assert.match(unknown, /brand new wording/);
  assert.doesNotMatch(unknown, /--ref main/);
});

test('the fail-closed path emits guidance while keeping the frozen error shape', async () => {
  const logs = [];
  const fetchImpl = async (url) => {
    if (url.includes('/contents/')) return response(200);
    return response(200, 'snapshots compared for the base SHA (0) and the head SHA (1) do not match');
  };

  await assert.rejects(
    waitForCompleteSnapshots(inputs, {
      maxWaitSeconds: 30,
      fetchImpl,
      sleep: async () => {},
      log: message => logs.push(message),
    }),
    // 예외 메시지 형식은 계약이 정규식으로 고정한다 — 안내를 여기에 섞으면 red 다.
    /completeness was not proven within 30s.*base SHA \(0\)/,
  );

  const guidance = logs.filter(line => /gh workflow run dependency-submission\.yml --ref main/.test(line));
  // 첫 관측 1회 + 실패 직전 1회. 시도마다 반복하면 마지막 안내가 스크롤 밖으로 밀린다.
  assert.equal(guidance.length, 2, `안내가 ${guidance.length}회 나왔다 — 시도마다 반복되고 있다`);
  const attempts = logs.filter(line => /is not complete yet/.test(line));
  assert.ok(attempts.length > guidance.length, '안내가 시도 수만큼 반복되고 있다');
});

test('a terminal API error still carries the snapshot diagnosis seen earlier', async () => {
  const logs = [];
  let compareCalls = 0;
  const fetchImpl = async (url) => {
    if (url.includes('/contents/')) return response(200);
    compareCalls += 1;
    // 첫 시도는 head 부재 경고, 마지막 시도는 API 오류로 끝난다.
    return compareCalls === 1
      ? response(200, 'No snapshots were found for the head SHA abc123.')
      : response(503);
  };

  await assert.rejects(
    waitForCompleteSnapshots(inputs, {
      maxWaitSeconds: 30,
      fetchImpl,
      sleep: async () => {},
      log: message => logs.push(message),
    }),
    // 예외는 API 오류만 말한다 — 그래서 진단이 로그에 남아야 한다.
    /HTTP 503/,
  );

  const joined = logs.join('\n');
  assert.match(joined, /actions\/runs\?head_sha=/, 'API 오류로 끝나면서 앞서 본 진단이 사라졌다');
});
