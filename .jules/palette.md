## 2025-02-04 - Legacy JSP Accessibility Patterns
**Learning:** Legacy JSPs often use `<a>` tags for buttons and lack `lang` attributes on `<html>`. They also frequently have broken "Skip Navigation" links because target IDs (like `contents`) are missing from the markup.
**Action:** When modernizing legacy JSPs, systematically replace `<a>` buttons with `<button type="button">` (adding CSS resets), ensure `<html>` has a `lang` attribute, and verify/fix skip link targets.
