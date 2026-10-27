---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# Executing Plans

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches.

**Core principle:** Batch execution with checkpoints for architect review.

**In this repository:** Use [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope) and [the orchestration SOP](../../../docs/03-guides/orchestration-protocol.md) (§3 Stage 1 approval, §2.3 audit, §2.4 failure recovery, §6 time budget). When the user's current request or standing approval covers the work, report at batch boundaries and keep going — wait only for a new permission or user decision. A failing test is diagnosed and fixed (cause hypothesis → targeted evidence → minimal fix → re-verify); stop and report after three failures from the same cause.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Batch
**Default: First 3 tasks**

For each task:
1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

### Step 3: Report
When batch complete:
- Show what was implemented
- Show verification output
- If the plan was handed to this session for review checkpoints and nothing approves continuing, ask for feedback; otherwise continue

### Step 4: Continue
Based on feedback:
- Apply changes if needed
- Execute next batch
- Repeat until complete

### Step 5: Complete Development

After all tasks complete and verified:
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- Use finishing-a-development-branch
- Follow its standing-approval path ([AGENTS.md 공유 워킹트리와 Git](../../../AGENTS.md#공유-워킹트리와-git)); present options only when the user's current instruction limits the scope

## When to Stop and Ask for Help

**Stop and report when:**
- The same cause has failed three times (first failure included) under SOP §2.4
- A step needs a new permission, a destructive or outward-facing action, or a user decision
- The plan has gaps that change the result and cannot be settled from the code or the request

A failing test or an already-declared dependency that is not installed is a cause to diagnose and fix within the approved scope, not a reason to stop at once. Adding a new dependency (manifest, lockfile, version catalog) is a decision to report, not a fix. Ask only questions whose answers change the result.

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - diagnose them; stop and ask only on the conditions above.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Between batches: report; wait only when a decision is pending
- Stop on the conditions above, don't guess
- Never start implementation on main/master — create a work branch first (AGENTS.md "공유 워킹트리와 Git")

## Integration

**Required workflow skills:**
- **using-git-worktrees** - Use when isolation is needed (concurrent work by another operator — AGENTS.md 공유 워킹트리와 Git)
- **writing-plans** - Creates the plan this skill executes
- **finishing-a-development-branch** - Complete development after all tasks
