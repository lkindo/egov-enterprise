# Sentinel Journal

## 2026-01-27 - Hardcoded Password Logging
**Vulnerability:** `System.out.println` statements in `SecurityConfig.java` were logging plain text passwords, salts, and hashes to stdout during authentication checks.
**Learning:** Debugging statements from development were left in critical security configuration code. This bypasses standard logging levels and exposes sensitive credentials to any log aggregator or console viewer.
**Prevention:** Enforce a "No System.out.println" rule in CI/CD or linter. Use `SLF4J` with appropriate levels (never log credentials). Implement code reviews specifically checking for print statements in security modules.
