# Palette's Journal

## 2025-05-18 - [Accessibility] Password Toggle Button Improvement
**Learning:** Raw buttons (`<button>`) often lack semantic value and proper focus styles, confusing screen reader users and making keyboard navigation difficult. In the login page, the password toggle was a raw button with `focus:outline-none`, making it invisible to keyboard users.
**Action:** Always use semantic `Button` components from the design system which include built-in focus rings and style variants. For icon-only buttons, explicitly add an `aria-label` that describes the action (e.g., "Show password" / "Hide password") to ensure screen reader accessibility.
## 2025-05-18 - [Interaction] Preventing Content Flash on Navigation
**Learning:** Using `useEffect` to trigger loading states often results in a "stale content flash" because the effect runs after the render. To instantly switch to a loading skeleton when context changes (e.g., sidebar section), update state during render using the `if (props !== state) setState(props)` pattern. This triggers an immediate re-render before paint.
**Action:** Use render-based state updates for critical layout transitions to ensure loading states appear instantly.
