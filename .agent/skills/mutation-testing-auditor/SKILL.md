---
name: mutation-testing-auditor
description: >-
  Agentic mutation testing skill. Triggers when writing or modifying tests. The agent intentionally
  injects bugs into the source code, runs the test to ensure it fails, and rewrites the test if it passes.
version: 1.0.0
---

# Mutation Testing Auditor Skill (Antigravity Native)

**Use this skill when:** Writing, fixing, or reviewing Unit Tests or E2E Tests (Playwright, Jest, JUnit).

---

## 1. Core Objective: Eliminating Shallow Tests

A test that passes even when the underlying logic is broken is worse than no test at all. The **Mutation Testing Auditor** forces the agent to physically prove the test is robust by intentionally sabotaging the code.

---

## 2. The Sabotage Loop

Whenever you finalize a test and it passes (Green), you MUST perform this loop:

1. **Inject Mutation**: Open the *source code* (not the test code) and inject a logical flaw.
   - *Example: Flip a boolean (`isAdmin == true` -> `isAdmin == false`), remove a required field from a DTO, or alter a CSS selector.*
2. **Execute Test**: Run the test suite targeting that code.
3. **Evaluate**:
   - 🚨 **If Test PASSES**: The test is shallow. You must revert the mutation, rewrite the test to be stricter (stronger assertions, exact DOM matching), and repeat.
   - ✅ **If Test FAILS**: The test is robust. The shield holds.
4. **Revert**: Restore the source code to its correct, functional state.

## 3. Output Requirements

Print the following block after verifying the test:

```markdown
### 🧬 [MUTATION TESTING AUDITOR REPORT] ###
- **Target Test**: `Tier 15 E2E - Login Flow`
- **Injected Bug**: Changed `submit_button` ID to `wrong_button` in `Login.tsx`.
- **Test Result**: 💥 FAILED (Expectedly caught the bug).
- **Status**: Reverted bug. Test robustness mathematically proven.
###########################################
```
