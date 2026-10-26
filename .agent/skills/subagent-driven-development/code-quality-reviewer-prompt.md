# Code Quality Reviewer Prompt Template

Use this template when dispatching a code quality reviewer subagent.

**Purpose:** Verify implementation is well-built (clean, tested, maintainable)

**If you also run a spec compliance review, dispatch this after it passes.** Pass the user's original request as `USER_REQUEST`.

```
Task tool (code-reviewer):
  Use template at requesting-code-review/code-reviewer.md

  USER_REQUEST: [the user's original request, quoted word for word]
  BASE_SHA: [commit before task]
  HEAD_SHA: [current commit]
  WHAT_WAS_IMPLEMENTED: [from implementer's report, with a task summary]
  PLAN_OR_REQUIREMENTS: Task N from [plan-file]
```

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment
