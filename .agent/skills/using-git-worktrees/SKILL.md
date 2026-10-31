---
name: using-git-worktrees
description: Use when work needs isolation from the current workspace — in this repository when another operator works in the same worktree at the same time (SOP §6.6) - creates isolated git worktrees with directory selection and safety verification
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# Using Git Worktrees

## Overview

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously without switching.

**Core principle:** Systematic directory selection + safety verification = reliable isolation.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

**In this repository:** Use [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope) and [the orchestration SOP](../../../docs/03-guides/orchestration-protocol.md) (§3 Stage 1 approval, §2.3 audit, §2.4 failure recovery, §6 time budget). For change tasks, use the assigned persistent worktree and a task-specific branch, even when the session started in the original checkout. [SOP §6.6](../../../docs/03-guides/orchestration-protocol.md#66-작업-트리) owns the tool-to-directory map, idle checks, initial creation, branch lifecycle and dependency reuse; it replaces the Directory Selection Process and creation command below. Create the persistent directory only when absent, outside the checkout from `origin/main` after fetching. Preserve existing work and use a separate temporary worktree when the assigned one is busy or its use is uncertain. Do not duplicate the directory map here or ask again for its configured location. The remaining generic creation steps apply only when a new worktree is needed; reusing a clean, idle worktree does not reinstall unchanged dependencies or delete its caches.

## Directory Selection Process

Follow this priority order:

### 1. Check Existing Directories

```bash
# Check in priority order
ls -d .worktrees 2>/dev/null     # Preferred (hidden)
ls -d worktrees 2>/dev/null      # Alternative
```

**If found:** Use that directory. If both exist, `.worktrees` wins.

### 2. Check AGENTS.md

In this repository the project rule SSOT is `AGENTS.md` (DEC-OPS-001); `CLAUDE.md` and `GEMINI.md` are thin adapters that do not carry their own preferences.

```bash
grep -i "worktree.*director" AGENTS.md 2>/dev/null
```

**If preference specified:** Use it without asking.

### 3. Ask User

In this repository the location is set by SOP §6.6 — skip this step. In other projects, if no directory exists and no AGENTS.md preference:

```
No worktree directory found. Where should I create worktrees?

1. .worktrees/ (project-local, hidden)
2. ~/.config/superpowers/worktrees/<project-name>/ (global location)

Which would you prefer?
```

## Safety Verification

### For Project-Local Directories (.worktrees or worktrees)

**MUST verify directory is ignored before creating worktree:**

```bash
# Check if directory is ignored (respects local, global, and system gitignore)
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**If NOT ignored:**

Per Jesse's rule "Fix broken things immediately":
1. Add appropriate line to .gitignore
2. Report the change; commit it within the commit scope below, with `git commit --only -- .gitignore` ([AGENTS.md 공유 워킹트리와 Git](../../../AGENTS.md#공유-워킹트리와-git))
3. Proceed with worktree creation

**Why critical:** Prevents accidentally committing worktree contents to repository.

### For Global Directory (~/.config/superpowers/worktrees)

No .gitignore verification needed - outside project entirely.

## Creation Steps

### 1. Detect Project Name

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. Create Worktree

```bash
# Determine full path
case $LOCATION in
  .worktrees|worktrees)
    path="$LOCATION/$BRANCH_NAME"
    ;;
  ~/.config/superpowers/worktrees/*)
    path="~/.config/superpowers/worktrees/$project/$BRANCH_NAME"
    ;;
esac

# Create worktree with new branch (in this repository: git fetch origin, then add it from origin/main — SOP §6.6)
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### 3. Run Project Setup

Auto-detect and run appropriate setup:

In this repository: run `npm ci` at the root (npm lockfile) and `pnpm -C frontend install` for the frontend (pnpm lockfile) — do not run `npm install` inside `frontend`. Generic examples for other projects:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

### 4. Verify Clean Baseline

Run tests to ensure worktree starts clean.

In this repository, pick the minimum check for the scope you will change from [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope). For docs-only work that is the related contracts and link check (`npm run regen -- --check` plus the `node --test` contracts that read the changed files), not `npm run verify:docs` — that is the broad docs path with the full operational contracts, which pre-push runs again on the same commit ([SOP §6.2](../../../docs/03-guides/orchestration-protocol.md#62-검증은-한-커밋에-한-번)). Broader entry points, cheapest first: `verify:docs` < `verify:fast` < `verify:push` < `verify:full`. Root `npm test` runs the whole Gradle test suite — a heavy run; do not overlap it with other heavy runs. Scoped baselines in this repository:

```bash
# Pick the ones that match the scope you will change (AGENTS.md Verification by change scope)
npm run regen -- --check                # docs, shared memory and generated artifacts
pnpm -C frontend run type-check       # frontend sources (next typegen, then tsc)
./gradlew compileJava compileTestJava   # backend sources
```

**If tests fail:** Record the failures with their output so new ones can be told apart; investigate under SOP §2.4 when they touch your scope, and ask only when a new permission or decision is needed.

**If tests pass:** Report ready.

### 5. Report Location

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| `.worktrees/` exists | Other projects: use it (verify ignored). This repository: SOP §6.6 |
| `worktrees/` exists | Other projects: use it (verify ignored). This repository: SOP §6.6 |
| Both exist | Other projects: use `.worktrees/`. This repository: SOP §6.6 |
| Neither exists | Check AGENTS.md → ask (this repository: SOP §6.6, no question) |
| Directory not ignored | Add to .gitignore; commit within the AGENTS commit scope |
| Tests fail during baseline | Record failures; diagnose under SOP §2.4 |
| No package.json/Cargo.toml | Skip dependency install |

## Common Mistakes

### Skipping ignore verification

- **Problem:** Worktree contents get tracked, pollute git status
- **Fix:** Always use `git check-ignore` before creating project-local worktree

### Assuming directory location

- **Problem:** Creates inconsistency, violates project conventions
- **Fix:** In this repository follow SOP §6.6; elsewhere follow priority: existing > AGENTS.md > ask

### Proceeding with failing tests

- **Problem:** Can't distinguish new bugs from pre-existing issues
- **Fix:** Record the baseline failures with their output so new failures can be told apart; diagnose them under SOP §2.4 when they touch your scope, and ask only when a new permission or decision is needed

### Hardcoding setup commands

- **Problem:** Breaks on projects using different tools
- **Fix:** Auto-detect from project files (package.json, etc.)

## Example Workflow

```
You: I'm using the using-git-worktrees skill to set up an isolated workspace.

[Check .worktrees/ - exists]
[Verify ignored - git check-ignore confirms .worktrees/ is ignored]
[Create worktree: git worktree add .worktrees/auth -b feature/auth]
[Run npm install]
[Run npm test - 47 passing]

Worktree ready at /Users/jesse/myproject/.worktrees/auth
Tests passing (47 tests, 0 failures)
Ready to implement auth feature
```

## Red Flags

**Never:**
- Create worktree without verifying it's ignored (project-local)
- Skip baseline test verification
- Proceed with failing tests without recording them
- Assume directory location when ambiguous (in this repository SOP §6.6 sets it)
- Skip the AGENTS.md/SOP location check

**Always:**
- Follow directory priority: SOP §6.6 in this repository; elsewhere existing > AGENTS.md > ask
- Verify directory is ignored for project-local
- Auto-detect and run project setup
- Verify clean test baseline

## Integration

**Called by:**
- **brainstorming** (Phase 4) - when isolation is needed for the implementation
- **subagent-driven-development** - when isolation is needed
- **executing-plans** - when isolation is needed
- Any skill needing isolated workspace

**Pairs with:**
- **finishing-a-development-branch** - for completion; deleting the branch and removing the worktree directory are separate (AGENTS.md 공유 워킹트리와 Git)
