## 2025-02-04 - Legacy JSP Accessibility Patterns
**Learning:** Legacy JSPs often use `<a>` tags for buttons and lack `lang` attributes on `<html>`. They also frequently have broken "Skip Navigation" links because target IDs (like `contents`) are missing from the markup.
**Action:** When modernizing legacy JSPs, systematically replace `<a>` buttons with `<button type="button">` (adding CSS resets), ensure `<html>` has a `lang` attribute, and verify/fix skip link targets.

## 2025-02-06 - Loading States for Programmatic Submits
**Learning:** Legacy forms often use `type="button"` and JS submission. Adding a loading state (text change + disable) in the JS function is a high-impact, low-risk way to prevent double-submission and improve perceived performance without changing the underlying form architecture.
**Action:** Identify JS submission functions (e.g., `actionLogin`) and inject DOM manipulation to update button state immediately before `form.submit()`.
