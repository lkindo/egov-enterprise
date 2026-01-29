# Sentinel Journal

## 2026-01-27 - Hardcoded Password Logging
**Vulnerability:** `System.out.println` statements in `SecurityConfig.java` were logging plain text passwords, salts, and hashes to stdout during authentication checks.
**Learning:** Debugging statements from development were left in critical security configuration code. This bypasses standard logging levels and exposes sensitive credentials to any log aggregator or console viewer.
**Prevention:** Enforce a "No System.out.println" rule in CI/CD or linter. Use `SLF4J` with appropriate levels (never log credentials). Implement code reviews specifically checking for print statements in security modules.

## 2026-01-29 - Hardcoded JWT Secret Defaults
**Vulnerability:** `JwtTokenProvider.java` used a hardcoded default value in the `@Value` annotation (`${jwt.secret:default...}`). This meant if the property was missing, the app would start securely but use a known, insecure key.
**Learning:** Providing fallback values for security credentials in code defeats the purpose of external configuration. It turns a "configuration error" (fail fast) into a "silent vulnerability".
**Prevention:** Never provide default values for secrets in code. Use `@Value("${jwt.secret}")` to force a startup failure if the secret is missing.
