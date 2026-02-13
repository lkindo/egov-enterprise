# Palette's Journal

## 2025-05-18 - [Accessibility] Password Toggle Button Improvement
**Learning:** Raw buttons (`<button>`) often lack semantic value and proper focus styles, confusing screen reader users and making keyboard navigation difficult. In the login page, the password toggle was a raw button with `focus:outline-none`, making it invisible to keyboard users.
**Action:** Always use semantic `Button` components from the design system which include built-in focus rings and style variants. For icon-only buttons, explicitly add an `aria-label` that describes the action (e.g., "Show password" / "Hide password") to ensure screen reader accessibility.

## 2025-05-19 - [Components] Button asChild vs Button Variants
**Learning:** Combining the `Button` component (with `asChild`) and `next/link` causes `React.Children.only` runtime errors due to `Radix Slot` receiving multiple children or fragments.
**Action:** The correct pattern is to use `<Link>` directly with `buttonVariants` (e.g., `<Link className={buttonVariants(...)}>`) instead of wrapping it in `<Button asChild>`.

## 2025-05-19 - [Accessibility] Decorative Icons in Widgets
**Learning:** Purely decorative icons in widgets (like the large Vote icon in Dashboard) can be confusing for screen readers if not hidden.
**Action:** Always add `aria-hidden="true"` to decorative icons or their containers to remove them from the accessibility tree.
