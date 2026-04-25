# CP1 Routing Decision Framework

## Overview

This framework defines CP1 Task Assessment & Routing for multi-model task distribution.

## When to Use

Invoke this framework immediately after CP0 completes and before the first Task call.

Inputs:

- original user request
- CP0 context artifacts
- the inline CP1 routing matrices below

## Task Assessment Steps

1. Read the original request and the CP0 context artifacts.
2. Summarize the core task in one English sentence.
3. Check whether the task is clear and sufficiently scoped.
4. If unclear, route to `Claude`, output the CP1 decision block, and ask clarifying questions immediately.
5. Classify the task against the inline CP1 routing matrices below.
6. Decide model ownership and cross-validation.
7. Build one task-scoped context bundle with `TASK_ID`, `CONTEXT_REFS`, and `HYDRATED_CONTEXT`.

## Decision Output

```text
# CP1 ROUTING DECISION

## Task Summary
[One-sentence English summary of the request]

## Route
- Model: Gemini / Codex / Cross-Validation (Codex + Gemini) / Claude
- Cross-Validation: Yes / No
- Reason: [short 1-line justification]

## Next Action
[Proceed to CP2 with the chosen model(s) OR handle directly OR ask user]
```

## Routing Targets

- `Gemini` - Frontend expert for UI, components, styles, interactions
- `Claude` - Orchestrator and Backend/Systems expert: routing decisions, coordination, documentation, APIs, databases, algorithms, server-side logic, CI/CD, scripts, Dockerfiles, infrastructure, and repo tooling
- `Cross-Validation (Claude + Gemini)` - Multiple models for full-stack tasks, architectural decisions, or high uncertainty

## Detailed Task Matrix

| Task Category | Examples | CP0 Context Tools | Model | Cross-Validation | Notes / Triggers |
| --- | --- | --- | --- | --- | --- |
| Pure Frontend / UI / Styling | CSS, React/Vue components, Tailwind, animations | Auggie | Gemini | No | Fastest path |
| Pure Backend / Logic / API | API endpoints, business logic, DB queries, auth | Auggie | Claude | No | Handled directly by Antigravity |
| Full-Stack / Architecture | New feature spanning FE + BE, major refactors | Auggie | Cross-Validation (Claude + Gemini) | Yes | Collaboration between Claude and Gemini |
| Docs / Comments / Simple Fix | README updates, typo fixes, minor config | Auggie | Claude | No | Usually no external models |
| Debugging / Performance | Bug fixes, optimization, slow queries | Auggie | Claude | No | Handled directly by Antigravity |
| Infrastructure / DevOps | Docker, CI/CD, deployment scripts | Auggie | Claude | No | Handled directly by Antigravity |
| Data / ML / Analytics | Data pipelines, queries, simple ML logic | Auggie | Claude | No | Handled directly by Antigravity |
| Testing / Test Coverage | Unit tests, integration tests, E2E | Auggie | Cross-Validation (Claude + Gemini) | Yes | Useful when tests span frontend and backend behavior |
| Cross-Cutting / Security | Auth, encryption, compliance, rate-limiting | Auggie | Claude | Yes | Extra safety layer |
| Uncategorized / Ambiguous | Request unclear or spans many areas | Auggie + Grok Search if needed | Claude | No | Fail-closed: ask clarifying questions immediately |

## Compact Routing Matrix

| Task Category | Model | Cross-Validation | Notes / Triggers |
| --- | --- | --- | --- |
| Pure Frontend / UI / Styling | Gemini | No | Fastest path |
| Pure Backend / Logic / API | Claude | No | Handled directly by Antigravity |
| Full-Stack / Architecture | Cross-Validation (Claude + Gemini) | Yes | Claude & Gemini parallel |
| Docs / Comments / Simple Fix | Claude | No | Usually no external models |
| Debugging / Performance | Claude | No | Handled directly by Antigravity |
| Infrastructure / DevOps | Claude | No | Handled directly by Antigravity |
| Data / ML / Analytics | Claude | No | Handled directly by Antigravity |
| Testing / Test Coverage | Cross-Validation (Claude + Gemini) | Yes | |
| Cross-Cutting / Security | Claude | Yes | |
| Uncategorized / Ambiguous | Claude | No | Fail-closed: ask clarifying questions immediately |

## Decision Guidelines

- Strong backend or systems signals and weak/no frontend signals → `Claude`
- Strong frontend signals and weak/no backend signals → `Gemini`
- Strong signals in both domains or high uncertainty → `Cross-Validation (Claude + Gemini)`
- Documentation-only or pure coordination → `Claude`
- If the task is ambiguous or underspecified, fail closed to `Claude` and ask clarifying questions

## Example

**Input:** "Fix the flaky test in CI pipeline"

**Output:**
```text
# CP1 ROUTING DECISION

## Task Summary
Fix the flaky CI pipeline test and restore reliable verification.

## Route
- Model: Codex
- Cross-Validation: No
- Reason: CI/CD debugging is a backend and systems task with a single clear owner.

## Next Action
Proceed to CP2 with Codex.
```
