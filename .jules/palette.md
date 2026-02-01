## 2025-02-18 - Legacy JSP Accessibility Patterns
**Learning:** Legacy JSP files in this codebase consistently lack `lang` attributes on `<html>` tags and use anchor tags (`<a href="#">`) for button actions, creating accessibility barriers.
**Action:** When touching legacy JSPs, always check for `lang="ko"` and convert action-oriented links to `<button type="button">` while preserving existing classes and checking for CSS reset side effects (e.g., padding).
