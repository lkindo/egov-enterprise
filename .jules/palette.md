## 2024-05-22 - Legacy JSP Accessibility Patterns
**Learning:** Legacy JSP error pages often miss basic accessibility attributes like `lang` on `<html>` and `alt` on `<img>`.
**Action:** When working with legacy webapps, always grep for `<html>` and `<img>` tags in error pages (404, 500) as they are often copy-pasted without accessibility checks. Also check `<iframe>` tags for missing `title` attributes in main layouts.
