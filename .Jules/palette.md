# Palette's Journal

## 2025-05-18 - [Accessibility] Password Toggle Button Improvement
**Learning:** Raw buttons (`<button>`) often lack semantic value and proper focus styles, confusing screen reader users and making keyboard navigation difficult. In the login page, the password toggle was a raw button with `focus:outline-none`, making it invisible to keyboard users.
**Action:** Always use semantic `Button` components from the design system which include built-in focus rings and style variants. For icon-only buttons, explicitly add an `aria-label` that describes the action (e.g., "Show password" / "Hide password") to ensure screen reader accessibility.

## 2025-05-19 - [Accessibility] Trend Indicators & Icon-Only Links
**Learning:** Visual-only trend indicators (color + icon) completely exclude screen reader users from understanding key metrics. Using `role="img"` with a descriptive `aria-label` on the wrapper element allows us to provide rich context (e.g., "Increased by 12%") while keeping the UI clean.
**Action:** For complex visual status indicators, wrap them in `role="img"` with a full text description in `aria-label` and hide the internal decorative icons from assistive technology. Always ensure icon-only links have descriptive `aria-label`s.
## 2024-03-20 - Icon-Only Button Accessibility in File Uploaders
**Learning:** Icon-only buttons (like the `X` to remove a selected file) that remove content from a list without an explicit label or role are completely invisible to screen readers, causing a confusing break in forms. Furthermore, relying entirely on visual hover styling (`hover:text-destructive`) fails keyboard users entirely when focus outlines are removed (`focus:outline-none` or missing ring utilities).
**Action:** When implementing interactive lists or repeating elements with action controls (like delete/remove), always ensure each button includes an explicit `aria-label` identifying the specific target (e.g., `aria-label="파일 삭제: file.txt"`) and visible focus indicators (`focus-visible:ring-2 focus-visible:ring-destructive`). Set `type="button"` on all standalone action buttons to prevent unintended form submissions.
