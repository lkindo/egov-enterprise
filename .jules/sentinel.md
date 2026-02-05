# Sentinel Journal

## 2026-01-27 - Hardcoded Password Logging
**Vulnerability:** `System.out.println` statements in `SecurityConfig.java` were logging plain text passwords, salts, and hashes to stdout during authentication checks.
**Learning:** Debugging statements from development were left in critical security configuration code. This bypasses standard logging levels and exposes sensitive credentials to any log aggregator or console viewer.
**Prevention:** Enforce a "No System.out.println" rule in CI/CD or linter. Use `SLF4J` with appropriate levels (never log credentials). Implement code reviews specifically checking for print statements in security modules.

## 2025-01-30 - Legacy Controller Testing in Spring Boot
**Vulnerability:** Reflected XSS in legacy `EgovLoginController`.
**Learning:** Testing legacy components (e.g., `egovframework.com.*`) using `@WebMvcTest` requires mocking static state containers (`EgovComponentChecker`) and named beans (`@Resource(name="leaveaTrace")`) that are not auto-configured by modern slices. Using a dedicated `@TestConfiguration` with `basePackageClasses` is cleaner than importing the full `ApiServerApplication` when legacy beans cause conflicts.
**Prevention:** Isolate legacy components in tests using targeted `@ComponentScan` and explicitly mock legacy dependencies like `LeaveaTrace` and `EgovComponentChecker` to avoid `NoSuchBeanDefinitionException`.

## 2025-02-04 - Hardcoded Secrets in Dev Config
**Vulnerability:** Hardcoded JWT secret key found in `application-dev.yml`.
**Learning:** Development configurations often contain hardcoded secrets for convenience, but these can easily be committed to version control and exposed. Even "dev" secrets can be dangerous if they are accidentally used in production or if the dev environment is accessible.
**Prevention:** Use environment variable placeholders (e.g., `${JWT_SECRET}`) even in development configurations. Provide a secure way to set these for local development (e.g., `.env` files not committed to git, or IDE run configurations) and enforce secret scanning in CI/CD.
