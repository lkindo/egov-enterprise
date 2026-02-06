## 2025-01-30 - Use of System.out.println in Production Controllers
**Vulnerability:** Debugging statements using `System.out.println` were found in security-critical controllers (`EgovAuthorManageController`, `EgovRoleManageController`). This outputs sensitive debugging info to stdout, bypassing log configuration and potentially leaking details in environments where stdout is captured or exposed.
**Learning:** Legacy code often retains local debugging practices (sysout) in production files. These are easily missed during migrations unless specifically grepped for.
**Prevention:** Enforce SLF4J usage via static analysis (Checkstyle/PMD/Lint) and block `System.out.print` usage in CI/CD pipelines.
