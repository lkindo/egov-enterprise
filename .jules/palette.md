## 2025-05-19 - Legacy Anchor Button Antipattern
**Learning:** Found widespread use of `<a>` tags with `href="#"` and `onclick` handlers acting as buttons in legacy JSP files. This is a significant accessibility barrier (no native keyboard support, incorrect semantics).
**Action:** Systematically replace `<a>` "buttons" with `<button type="button">` tags. Ensure to explicitly set `border:0; cursor:pointer; background:transparent` (or retain existing classes) to maintain visual fidelity while gaining native accessibility.
