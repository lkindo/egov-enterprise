import assert from 'node:assert/strict';
import {
  mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertBaselineIndex,
  assertCanonicalJsonBytes,
  assertRepositoryIndexAppendOnly,
  canonicalJsonBytes,
} from './ui-quality-evidence-durability.mjs';

const POLICY_ROOT_KEYS = [
  'schemaVersion', 'decisionId', 'status', 'storeMode', 'artifactProvider',
  'retentionDays', 'readers', 'publishers', 'trackedIndexPath', 'indexSchema',
  'redactionReviewers', 'replacementPolicy', 'expiryAndLegalHold',
];
const REQUIRED_INDEX_ENTRY_FIELDS = [
  'schemaVersion', 'baselineRunId', 'evidenceScope', 'buildSha', 'protocolVersion',
  'protocolHash', 'protocolHashStatus', 'buildInputTreeHash', 'dirtyBuildInputDiffHash',
  'executionScenarioManifestHash', 'executionPlanHash',
  'runnerHash', 'coreHash', 'runnerContractHash', 'scenarioContractHash',
  'routeTruthHash', 'privacyRuleHash', 'sourceArtifactAggregateDigest', 'artifactDigest',
  'jsonFileCount', 'automatedJsonFileCount',
  'diagnosticJsonFileCount', 'manualEvidenceCount', 'mediaType',
  'immutableObjectIdentity', 'createdAt', 'retentionExpiry', 'redactionStatus',
  'status', 'supersedes',
];

function assertExactKeys(value, expected, label) {
  assert.equal(value && typeof value === 'object' && !Array.isArray(value), true, `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} must use the closed key set`);
}

function assertAcceptedPolicy(policy) {
  assertExactKeys(policy, POLICY_ROOT_KEYS, 'durability policy');
  assert.equal(policy.schemaVersion, 1);
  assert.equal(policy.decisionId, 'PD-UIQ-001');
  assert.equal(policy.status, 'accepted');
  assert.equal(policy.storeMode, 'versioned-compact-summary');
  assert.equal(policy.artifactProvider, 'git-tracked-versioned-file-with-git-blob-identity-and-sha256-readback');
  assert.equal(policy.retentionDays, 3650);
  assert.deepEqual(policy.readers, ['public']);
  assert.deepEqual(policy.publishers, ['repository-maintainer-via-main-required-ci']);
  assert.equal(policy.trackedIndexPath, 'config/ui-quality-baseline-index.json');

  assertExactKeys(policy.indexSchema, ['summaryPathTemplate', 'requiredFields'], 'indexSchema');
  assert.equal(
    policy.indexSchema.summaryPathTemplate,
    'config/ui-quality-baseline/summaries/sha256-{artifactDigest}.json',
  );
  assert.deepEqual(policy.indexSchema.requiredFields, REQUIRED_INDEX_ENTRY_FIELDS);

  assertExactKeys(policy.redactionReviewers, ['roles', 'quorum', 'reReviewWhen'], 'redactionReviewers');
  assert.deepEqual(policy.redactionReviewers.roles, ['quality-engineering', 'repository-governance']);
  assert.equal(policy.redactionReviewers.quorum, 1);
  assert.deepEqual(policy.redactionReviewers.reReviewWhen, [
    'summary-schema-change', 'source-evidence-digest-change', 'privacy-rule-change',
    'manual-evidence-addition', 'allowlist-expansion',
  ]);

  assertExactKeys(
    policy.replacementPolicy,
    ['mode', 'currentPointer', 'overwriteExistingSummary', 'requireExactPredecessor'],
    'replacementPolicy',
  );
  assert.equal(policy.replacementPolicy.mode, 'append-new-digest-and-supersedes');
  assert.equal(policy.replacementPolicy.currentPointer, 'currentDigest');
  assert.equal(policy.replacementPolicy.overwriteExistingSummary, false);
  assert.equal(policy.replacementPolicy.requireExactPredecessor, true);

  assertExactKeys(
    policy.expiryAndLegalHold,
    ['automaticDeletion', 'minimumRetentionDays', 'expiryAction', 'legalHoldAction', 'providerWormClaimed'],
    'expiryAndLegalHold',
  );
  assert.equal(policy.expiryAndLegalHold.automaticDeletion, false);
  assert.equal(policy.expiryAndLegalHold.minimumRetentionDays, 3650);
  assert.equal(policy.expiryAndLegalHold.expiryAction, 'explicit-governance-approval-and-append-tombstone');
  assert.equal(policy.expiryAndLegalHold.legalHoldAction, 'block-removal-and-history-rewrite');
  assert.equal(policy.expiryAndLegalHold.providerWormClaimed, false);
}

function assertPublishedHistoricalIndex(index, policy) {
  assertExactKeys(index, ['schemaVersion', 'decisionId', 'storeMode', 'currentDigest', 'entries'], 'index');
  assert.equal(index.schemaVersion, 1);
  assert.equal(index.decisionId, policy.decisionId);
  assert.equal(index.storeMode, policy.storeMode);
  assert.match(index.currentDigest, /^[0-9a-f]{64}$/u);
  assert.equal(index.entries.length, 1, 'UA-04 must publish one historical r12 entry');
  assert.equal(index.entries[0].artifactDigest, index.currentDigest);
  assert.equal(index.entries[0].evidenceScope, 'automated-only');
  assert.equal(index.entries[0].manualEvidenceCount, 0);
  assert.equal(index.entries[0].redactionStatus, 'approved');
  assert.equal(index.entries[0].status, 'published');
  assert.equal(index.entries[0].supersedes, null);
  const summary = assertCanonicalJsonBytes(readFileSync(new URL(
    `../config/ui-quality-baseline/summaries/sha256-${index.currentDigest}.json`,
    import.meta.url,
  )));
  assert.equal(summary.redaction.status, 'approved');
  assert.deepEqual(summary.redaction.approvedByRoles, ['repository-governance']);
  assert.equal(summary.manual.completedEvidenceCount, 0);
  assert.equal(summary.promotion.eligible, false);
  assertBaselineIndex(index, new Map([[index.currentDigest, summary]]));
}

function runGit(root, args) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || `git ${args.join(' ')} must succeed`);
  return result.stdout.trim();
}

function writeCanonicalIndex(root, value) {
  const target = join(root, 'config', 'ui-quality-baseline-index.json');
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(target, canonicalJsonBytes(value));
}

function fixtureIndex(entries) {
  return {
    currentDigest: entries.at(-1)?.artifactDigest ?? null,
    decisionId: 'PD-UIQ-001',
    entries,
    schemaVersion: 1,
    storeMode: 'versioned-compact-summary',
  };
}

test('accepted policy and approved r12 historical publication remain non-measured', () => {
  const policy = JSON.parse(readFileSync(
    new URL('../config/ui-quality-evidence-policy.json', import.meta.url), 'utf8',
  ));
  const index = JSON.parse(readFileSync(
    new URL('../config/ui-quality-baseline-index.json', import.meta.url), 'utf8',
  ));
  const decisions = readFileSync(
    new URL('../docs/04-operations/pending-decisions.md', import.meta.url), 'utf8',
  );
  const adr = readFileSync(
    new URL('../docs/02-architecture/decisions/ADR-0005-ui-quality-durable-evidence.md', import.meta.url), 'utf8',
  );
  const protocol = readFileSync(
    new URL('../docs/04-operations/ui-ux-baseline-protocol.md', import.meta.url), 'utf8',
  );
  const runbook = readFileSync(
    new URL('../docs/04-operations/ui-ux-modernization-user-action-runbook.md', import.meta.url), 'utf8',
  );
  const plan = readFileSync(
    new URL('../docs/02-architecture/ui-ux-modernization-plan.md', import.meta.url), 'utf8',
  );
  const manifest = JSON.parse(readFileSync(
    new URL('../config/ui-quality-scenarios.json', import.meta.url), 'utf8',
  ));

  assertAcceptedPolicy(policy);
  assertPublishedHistoricalIndex(index, policy);
  assert.doesNotMatch(decisions, /^\| PD-UIQ-001 \|/mu);
  assert.doesNotMatch(decisions, /^### PD-UIQ-001 durable evidence 승인 입력$/mu);
  assert.match(adr, /\*\*Status:\*\* Accepted/u);
  assert.match(adr, /versioned-compact-summary/u);
  assert.match(runbook, /\| 3 \| UA-03 [^\n]*\| `DONE` \|/u);
  assert.match(runbook, /\| 4 \| UA-04 [^\n]*\| `DONE` \|/u);
  // [2026-08-22 DEC-OPS-012] UA-05 는 사용자 결정으로 보류됐다. 값 교체이지 신호 완화가 아니므로
  //   같은 변경에서 아래 assert 3건을 **추가**해 게이트 수를 늘린다:
  //   ① 보류 어휘가 §2 에 실제로 정의돼 있을 것(정의 없는 상태값 남용 차단)
  //   ② 보류가 뒤 단계 잠금을 풀지 않았을 것(UA-06~10 이 LOCKED 유지)
  //   ③ §12 에 "현재 실행 중" 이라는 거짓 진술이 남지 않을 것
  assert.match(runbook, /\| 5 \| UA-05 [^\n]*\| `DEFERRED` \(DEC-OPS-012\) \|/u);
  assert.match(
    runbook,
    /- `DEFERRED` — 선행 조건은 충족됐으나 \*\*명시적 결정으로 실행을 미뤘다\.\*\*/u,
    'DEFERRED 상태를 쓰려면 §2 진행 규칙이 그 의미와 "뒤 단계 잠금을 풀지 않는다"를 먼저 정의해야 한다',
  );
  for (const locked of ['6 \\| UA-06', '7 \\| UA-07', '8 \\| UA-08', '9 \\| UA-09', '10 \\| UA-10']) {
    assert.match(
      runbook,
      new RegExp(`\\| ${locked} [^\\n]*\\| \`LOCKED\` \\|`, 'u'),
      'UA-05 보류가 뒤 단계의 잠금을 해제해서는 안 된다 — 보류는 증거를 만들지 않는다',
    );
  }
  assert.doesNotMatch(
    runbook,
    /현재 실행 중인 대상은 \*\*UA-05/u,
    '§12 가 UA-05 를 실행 중이라고 계속 주장하면 보류 기록이 문서 안에서 자기모순이 된다',
  );
  assert.match(runbook, /f39ba9930df973710318088ccb00a2800643d9a3/u);
  assert.match(runbook, /32502622801/u);
  assert.match(runbook, /32504902346/u);
  assert.match(runbook, /32504902338/u);
  assert.match(protocol, /f39ba9930df973710318088ccb00a2800643d9a3/u);
  assert.match(protocol, /32502622801/u);
  assert.match(protocol, /32504902346/u);
  assert.match(protocol, /32504902338/u);
  assert.match(plan, /32502622801/u);
  assert.match(plan, /32504902346/u);
  assert.match(plan, /32504902338/u);
  assert.doesNotMatch(runbook, /UA-04 required CI(?:도|가)? (?:남아|완료 및)/u);
  assert.doesNotMatch(runbook, /push와 required CI는 수행하지 않았다/u);
  assert.doesNotMatch(protocol, /required CI readback(?:은)? 아직 남아/u);
  assert.doesNotMatch(protocol, /status=measured[^\n]*파일이 실제로 존재해야/u);
  assert.match(protocol, /tracked current combined summary의 exact 8 scenario·96 state·48 performance·48 manual projection/u);
  assert.match(protocol, /ui-quality-baseline-attempts\/\.staging-<executionId>/u);
  assert.match(protocol, /283번째 파일 `automated-run-seal\.json`/u);
  assert.match(protocol, /worktree raw bytes와 실행 commit의 Git blob bytes가 일치/u);
  assert.match(runbook, /production input dirty fingerprint가 `null`인 clean committed snapshot/u);
  assert.match(plan, /r13 evidence readiness/u);
  assert.doesNotMatch(plan, /merge commit `f39ba9930df973710318088ccb00a2800643d9a3`의 required CI/u);
  assert.equal(
    manifest.executionBlockers.some(({ reason }) => reason.includes('UA-04 required CI')),
    false,
    'merged UA-04 required CI must not remain as a current blocker',
  );
  assert.match(protocol, /baseline-artifact-durability` \| `unmeasured`/u);
  const blocker = manifest.executionBlockers.find(({ id }) => id === 'baseline-artifact-durability');
  assert.equal(blocker?.status, 'unmeasured');
});

test('policy field removal, widening, and false immutability are reproducible red', () => {
  const policy = JSON.parse(readFileSync(
    new URL('../config/ui-quality-evidence-policy.json', import.meta.url), 'utf8',
  ));
  assertAcceptedPolicy(policy);
  for (const field of POLICY_ROOT_KEYS) {
    const missing = structuredClone(policy);
    delete missing[field];
    assert.throws(() => assertAcceptedPolicy(missing), /closed key set/u);
  }
  assert.throws(() => assertAcceptedPolicy({ ...policy, unexpected: true }), /closed key set/u);
  assert.throws(() => assertAcceptedPolicy({ ...policy, readers: ['public', 'raw-link'] }));
  assert.throws(() => assertAcceptedPolicy({ ...policy, retentionDays: 0 }));
  assert.throws(() => assertAcceptedPolicy({
    ...policy,
    expiryAndLegalHold: { ...policy.expiryAndLegalHold, providerWormClaimed: true },
  }));
});

test('published historical index cannot drop or forge its current entry', () => {
  const policy = JSON.parse(readFileSync(
    new URL('../config/ui-quality-evidence-policy.json', import.meta.url), 'utf8',
  ));
  const index = JSON.parse(readFileSync(
    new URL('../config/ui-quality-baseline-index.json', import.meta.url), 'utf8',
  ));
  assertPublishedHistoricalIndex(index, policy);
  assert.throws(() => assertPublishedHistoricalIndex({ ...index, currentDigest: null }, policy));
  assert.throws(() => assertPublishedHistoricalIndex({ ...index, entries: [] }, policy));
  assert.throws(() => assertPublishedHistoricalIndex({ ...index, rawPath: 'forbidden' }, policy), /closed key set/u);
});

test('ignored baseline JSON is not bulk-tracked as repository evidence', () => {
  const result = spawnSync('git', ['ls-files', '--', 'build/reports/ui-quality-baseline'], {
    encoding: 'utf8', windowsHide: true,
  });
  assert.equal(result.status, 0, 'git tracked-evidence census must execute');
  assert.equal(result.stdout.trim(), '', 'ignored baseline JSON must not be copied into tracked source');
});

test('current index preserves the exact committed append-only prefix', () => {
  assert.doesNotThrow(() => assertRepositoryIndexAppendOnly({
    repoRoot: fileURLToPath(new URL('..', import.meta.url)),
  }));
});

test('required CI compares the entire event range and rejects a hidden three-commit truncation', () => {
  const root = mkdtempSync(join(tmpdir(), 'ui-quality-index-range-'));
  try {
    runGit(root, ['init']);
    runGit(root, ['config', 'user.email', 'ui-quality-contract@example.invalid']);
    runGit(root, ['config', 'user.name', 'UI Quality Contract']);
    const first = { artifactDigest: 'a'.repeat(64), supersedes: null };
    const second = { artifactDigest: 'b'.repeat(64), supersedes: first.artifactDigest };
    writeCanonicalIndex(root, fixtureIndex([first, second]));
    runGit(root, ['add', 'config/ui-quality-baseline-index.json']);
    runGit(root, ['commit', '-m', 'valid evidence history']);
    const eventBase = runGit(root, ['rev-parse', 'HEAD']);

    writeCanonicalIndex(root, fixtureIndex([{ ...second, supersedes: null }]));
    runGit(root, ['add', 'config/ui-quality-baseline-index.json']);
    runGit(root, ['commit', '-m', 'truncate evidence history']);
    writeFileSync(join(root, 'unrelated.txt'), 'no-op evidence change\n', 'utf8');
    runGit(root, ['add', 'unrelated.txt']);
    runGit(root, ['commit', '-m', 'unrelated follow-up']);

    assert.doesNotThrow(() => assertRepositoryIndexAppendOnly({
      repoRoot: root,
      previousRevision: 'HEAD^',
    }), 'the former last-parent comparison reproduces the false green');
    assert.throws(() => assertRepositoryIndexAppendOnly({
      repoRoot: root,
      githubActions: true,
      eventName: 'push',
      eventBaseRevision: eventBase,
    }), /preserve history/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('required CI fails closed for missing, zero, unresolvable, and manual-dispatch bases', () => {
  const root = mkdtempSync(join(tmpdir(), 'ui-quality-index-base-'));
  try {
    runGit(root, ['init']);
    runGit(root, ['config', 'user.email', 'ui-quality-contract@example.invalid']);
    runGit(root, ['config', 'user.name', 'UI Quality Contract']);
    writeCanonicalIndex(root, fixtureIndex([]));
    runGit(root, ['add', 'config/ui-quality-baseline-index.json']);
    runGit(root, ['commit', '-m', 'prepared evidence index']);

    for (const eventBaseRevision of ['', '0'.repeat(40), 'f'.repeat(40)]) {
      assert.throws(() => assertRepositoryIndexAppendOnly({
        repoRoot: root,
        githubActions: true,
        eventName: 'push',
        eventBaseRevision,
      }), /event base revision/u);
    }
    assert.throws(() => assertRepositoryIndexAppendOnly({
      repoRoot: root,
      githubActions: true,
      eventName: 'workflow_dispatch',
      eventBaseRevision: runGit(root, ['rev-parse', 'HEAD']),
    }), /workflow_dispatch/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('required operational CI passes the immutable event base to the append-only validator', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(
    workflow,
    /UI_QUALITY_INDEX_BASE_SHA:\s*\$\{\{ github\.event\.pull_request\.base\.sha \|\| github\.event\.before \}\}/u,
  );
});
