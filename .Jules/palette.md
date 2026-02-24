# Palette's Journal

## 2025-05-18 - [Accessibility] Password Toggle Button Improvement
**Learning:** Raw buttons (`<button>`) often lack semantic value and proper focus styles, confusing screen reader users and making keyboard navigation difficult. In the login page, the password toggle was a raw button with `focus:outline-none`, making it invisible to keyboard users.
**Action:** Always use semantic `Button` components from the design system which include built-in focus rings and style variants. For icon-only buttons, explicitly add an `aria-label` that describes the action (e.g., "Show password" / "Hide password") to ensure screen reader accessibility.

## 2025-05-19 - [Accessibility] Trend Indicators & Icon-Only Links
**Learning:** Visual-only trend indicators (color + icon) completely exclude screen reader users from understanding key metrics. Using `role="img"` with a descriptive `aria-label` on the wrapper element allows us to provide rich context (e.g., "Increased by 12%") while keeping the UI clean.
**Action:** For complex visual status indicators, wrap them in `role="img"` with a full text description in `aria-label` and hide the internal decorative icons from assistive technology. Always ensure icon-only links have descriptive `aria-label`s.

## 2025-05-20 - [Accessibility] Form Field Association
**Learning:** Implicit association (wrapping input in label) changes DOM structure and can break styling. Explicit association (`htmlFor` + `id`) is safer for retrofitting accessibility into existing components.
**Action:** When enhancing existing form components, prefer adding optional `htmlFor` props over restructuring the component tree.

## 2025-05-20 - [Testing] Playwright & Middleware
**Learning:** Next.js Middleware runs before client-side Playwright mocks can intercept requests if it checks cookies.
**Action:** Always set required authentication cookies (even dummy ones) in Playwright context when testing pages protected by server-side middleware.
