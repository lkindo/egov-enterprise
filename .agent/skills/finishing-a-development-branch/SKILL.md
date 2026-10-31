---
name: finishing-a-development-branch
description: Use when implementation is complete to verify the work, follow the authorized PR and merge scope, and safely finish its branch
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# Finishing a Development Branch

## Overview

Complete the authorized workflow using current Git and CI evidence.

**Core principle:** Verify scope → Verify checks → Complete the authorized workflow → Confirm branch cleanup.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Tests

**Before completion, verify the checks required for the changed scope:**

Use [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope) and [SOP §2.3, §2.4 and §6](../../../docs/03-guides/orchestration-protocol.md). Root `npm test` runs the whole Gradle test suite; it is not the default for every branch. The main agent independently verifies delegated work. Red/green proof, hooks and required CI still apply; serialize heavy checks and avoid only the redundant full bundles described in §6.2.

For example, a change to the shared-memory contract is checked with `node --test scripts/shared-memory-contract.test.mjs`. Choose the actual affected test and required scope checks, rather than copying this example for unrelated changes.

If checks fail, report the evidence and diagnose before proceeding. Count failures by the same cause under SOP §2.4; at three total failures, stop and report the evidence and options. Do not merge while required checks fail.

### Step 2: Confirm Branch and Authorized Scope

Read `git status`, the branch and diff, remotes, PR state, and `git worktree list`. Establish which changes belong to this task from the actual work performed; a branch name, prefix, current checkout or partial edit is not evidence that the whole branch belongs to this task.

Follow [AGENTS.md shared worktree and Git authority](../../../AGENTS.md#공유-워킹트리와-git). The completion approval there (사용자 상시 승인 — not the SOP's batch approval, which cannot cross the safety boundary) covers completion of the branch directly worked on for their requested task. Do not request the same approval again or present a mandatory options menu for that workflow. A current instruction such as local work only, PR only, hold the merge, or keep the branch takes precedence.

Do not modify, integrate, delete, or switch another operator's branch or worktree under this approval. If attribution or scope is materially unclear, preserve that work and resolve only the missing information.

### Step 3: Complete the Authorized Workflow

For the directly worked branch covered by that completion approval:

1. Verify the final diff and commit only this task's paths with `git commit --only -- <paths>`. If another task's changes share one of those files, `--only` would commit them too — stop and report the mixed paths instead (the AGENTS.md section linked in Step 2).
2. Push normally with hooks enabled and create or update the PR against `main`. Use a body file for a multiline description; include the concrete change, validation and material limitations.
3. If the change alters meaning — authorization or privacy (H3), physical schema (H1), an identifier axis, or what a gate asserts — run the one pre-merge independent review of [SOP §2.3](../../../docs/03-guides/orchestration-protocol.md) with [requesting-code-review](../requesting-code-review/SKILL.md) on the final diff, and record the reviewed commit in the PR. Domain skills (security, DB, migration, API contract) do not replace it.
4. Wait for required CI on the latest PR HEAD. Use [.github/required-checks.json](../../../.github/required-checks.json) and the [CI guide](../../../docs/03-guides/cicd-pipeline.md). Local tests do not replace required CI. Wait with `node scripts/pr-checks-wait.mjs --pr <n> --sha <the commit you verified>` (run it in the background; only exit 0 is green; exit 3 means HEAD moved — wait again on the new HEAD). Judge settlement and red checks with [ci-triage](../ci-triage/SKILL.md) — required aggregates register late, and infrastructure failures are re-run only after evidence.
5. Merge through the PR after its required CI is green and its current HEAD still matches the commit you verified — when step 3 applies, the commit that review saw (re-review only the changed part if it moved). Do not merge directly into `main`, bypass protection, or force-push.
6. Confirm the PR is merged and its changes are included in `main`, then finish this branch under Step 4. Report the PR link, merge result and cleanup result.

If the user limited the scope, stop at that boundary: keep the branch and worktree for PR-only or hold instructions. Ask for a workflow choice only when the existing instructions leave a material decision unresolved. Do not offer a local merge into `main`.

### Step 4: Finish the Branch Safely

Before deleting, recheck local and remote branch HEADs against the merged PR HEAD, PR merge evidence, the working tree and worktree use. Preserve unmerged additional commits and any other operator's changes. An open dependent PR or another worktree still using the branch must be resolved within the authorized scope before deletion.

After those checks, delete the merged task branch locally and then remotely without asking again — local first, for the reason below. Switch only this task's clean worktree to an appropriate base or detached state first; do not switch another operator's worktree. Prefer non-forced deletion. If deletion is refused, inspect the cause rather than escalating automatically. A squash merge leaves the local branch "not fully merged", so `git branch -d` refuses: delete it with `git branch -D` while its pushed tip is still on a remote-tracking ref (before `git fetch --prune` or the remote deletion). The pre-run guard lets that through only when no local-only commit would be lost and asks otherwise.

Branch deletion does not authorize automatic worktree directory deletion. Keep the directory and untracked evidence unless cleanup of those exact contents is separately authorized.

In this repository, retain the assigned persistent worktree under [SOP §6.6](../../../docs/03-guides/orchestration-protocol.md#66-작업-트리). After confirming the merge, ownership and clean state, stop only processes started for this task, fetch `origin`, return this worktree to detached `origin/main`, and delete only the verified task branch as described above. Keep its installed dependencies and caches for the next task. A busy worktree or unfinished work belongs to its current session; do not repurpose it for another session.

## Discard Is a Separate Action

Discarding unmerged work is outside normal branch completion. Before any destructive discard, identify the exact branch, commits, worktree path and affected files, then obtain explicit authorization for those contents. Do not treat approval to delete a merged branch as permission to discard work.

## Common Mistakes

- Repeating an approval question already answered by the user or project standing approval.
- Treating another operator's branch as part of this task because its name looks related.
- Merging with failed or stale required CI.
- Deleting a branch that acquired new commits after the merge.
- Removing a worktree and its untracked evidence as an automatic side effect of branch deletion.
- Treating PR-only or hold instructions as authorization to merge.

## Integration

**Called by:**

- **subagent-driven-development** — After all tasks complete.
- **executing-plans** — After all batches complete.

**Pairs with:**

- **using-git-worktrees** — Worktree isolation; cleanup remains subject to the scope above.
