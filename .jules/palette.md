# Palette's Journal - UX & Accessibility Learnings

## 2024-05-22 - Legacy Template Accessibility Gaps
**Learning:** The standard eGovFrame templates include accessibility features like Skip Navigation (`.skip_navi`) but they are often broken (missing `id` targets like `#contents`) or incomplete (ambiguous "More" links).
**Action:** Always verify that skip links have valid `id` targets in the DOM and ensure "More" buttons have context via `aria-label` or descriptive text.
