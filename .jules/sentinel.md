# Sentinel Journal

## 2026-01-27 - Hardcoded Password Logging
**Vulnerability:** `System.out.println` statements in `SecurityConfig.java` were logging plain text passwords, salts, and hashes to stdout during authentication checks.
**Learning:** Debugging statements from development were left in critical security configuration code. This bypasses standard logging levels and exposes sensitive credentials to any log aggregator or console viewer.
**Prevention:** Enforce a "No System.out.println" rule in CI/CD or linter. Use `SLF4J` with appropriate levels (never log credentials). Implement code reviews specifically checking for print statements in security modules.

## 2026-01-31 - Hardcoded Default JWT Secret
**Vulnerability:** `JwtTokenProvider.java` contained a default value in the `@Value` annotation: `@Value("${jwt.secret:default_secret...}")`.
**Learning:** Providing a fallback value for critical security parameters (like secrets) creates a silent failure mode where the application runs insecurely if configuration is missing, rather than failing fast. Attackers can exploit this known default.
**Prevention:** Never use default values for secrets in `@Value` or configuration classes. Ensure the application fails to start if a required secret is missing. Use explicit profile-based configuration (dev vs prod).
