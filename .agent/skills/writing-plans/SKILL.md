---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** Use [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope) and [the orchestration SOP](../../../docs/03-guides/orchestration-protocol.md) (§3 Stage 1 approval, §2.3 audit, §2.4 failure recovery, §6 time budget). Use a separate worktree when isolation is needed (another operator's concurrent work — [AGENTS.md 공유 워킹트리와 Git](../../../AGENTS.md#공유-워킹트리와-git)).

**Where plans live (this repository):** there is no `docs/plans/`. Keep a task plan in the conversation, the PR description, or a scratch file outside the repository; promote only durable design to a kebab-case doc under `docs/01-product`·`02-architecture`·`03-guides`·`04-operations` with the `docs/README.md` index updated (AGENTS.md "Documentation and memory"). Session plans and TODOs never go into `.agent/memory/`.

**Commits (this repository):** the "Commit" steps below are checkpoints, not permission. Commit only when the user asked for it, and only your own paths with `git commit --only -- <paths>` (AGENTS.md "공유 워킹트리와 Git").

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> Execute in this session (subagent-driven-development or directly). Use executing-plans only when the user asked for a separate session with review checkpoints.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
# only when the user asked for commits
git commit --only -m "feat: add specific feature" -- tests/path/test.py src/path/file.py
```
```

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits

## Execution Handoff

If the user's current request or standing approval already covers implementation, continue in this session without asking. Offer a choice only when the user asked for checkpoints:

**"Plan complete (in <where the plan lives>). Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review by risk (subagent-driven-development), fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Pick one?"**

**If Subagent-Driven chosen:**
- Use subagent-driven-development
- Stay in this session
- Fresh subagent per task; reviews by risk (subagent-driven-development)

**If Parallel Session chosen:**
- Guide them to open new session in worktree
- New session uses executing-plans
