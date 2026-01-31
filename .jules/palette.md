## 2024-05-23 - Legacy JSP Accessibility Patterns
**Learning:** Legacy EgovFramework JSPs often use `<a>` tags for buttons (e.g., login, popups) and miss basic `lang` attributes on `<html>`. They also implement "Skip Navigation" links pointing to anchors (`#contents`) that don't exist in the markup.
**Action:** systematically replace `class="btn_..."` anchor tags with `<button type="button">` (preserving styles inline if necessary to avoid global CSS risk), ensure `id="contents"` exists for skip links, and always add `lang` to `<html>`.
