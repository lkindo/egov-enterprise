# PALETTE'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2025-02-23 - Legacy Button Accessibility
**Learning:** Legacy forms often use anchor tags (`<a>`) with JavaScript (`href="#"`, `onclick="submit()"`) for submission buttons. This breaks accessibility for screen readers and keyboard users (who expect spacebar to activate buttons).
**Action:** Replace these with `<button type="button">` to ensure proper semantics and keyboard support, while preserving visual styles (padding reset often needed).
