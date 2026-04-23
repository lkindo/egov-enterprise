# eGov Enterprise 보안 개선 사항 리포트 (Security Best Practices Report)

## Executive Summary
본 리포트는 eGov Enterprise 프로젝트의 백엔드(Spring Boot) 및 프론트엔드(Next.js) 코드베이스에 대한 보안 감사를 수행한 결과를 요약합니다. 시스템 전반에 걸쳐 하드코딩된 민감 정보, 안전하지 않은 Actuator 엔드포인트 노출, 그리고 프론트엔드 크로스 사이트 스크립팅(XSS) 취약점 등 다수의 크리티컬한 보안 이슈가 발견되었습니다. 안정적인 운영 환경으로의 전환을 위해 신속한 조치가 필요합니다.

---

## [High] 1. 프론트엔드 XSS(크로스 사이트 스크립팅) 취약점
**Impact**: 공격자가 게시글이나 정책 내용에 악성 JavaScript 코드를 삽입하여, 이를 열람하는 사용자의 브라우저에서 임의의 스크립트(세션 탈취, 강제 동작 등)를 실행할 수 있습니다.

- **발견 위치**:
  - `frontend/src/app/admin/community/boards/detail/BoardDetailClient.tsx` (Line 163)
  - `frontend/src/app/help/policies/[type]/page.tsx` (Line 56)
- **상세 내용**:
  `dangerouslySetInnerHTML`을 통해 API에서 전달받은 HTML을 그대로 렌더링하고 있습니다. `article.knoCn`이나 `policy?.content`에 대한 소독(Sanitize) 과정이 존재하지 않습니다.
- **해결 방안**:
  - `dompurify` (혹은 `isomorphic-dompurify`) 패키지를 도입하여 HTML을 삽입하기 전에 안전하게 소독해야 합니다.
  - 예시: `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.knoCn) }}`

## [High] 2. 관리자 Actuator 엔드포인트 무단 노출
**Impact**: 애플리케이션의 중요 설정 정보, 환경 변수(`env`), 빈(`beans`), 메트릭스(`metrics`) 등 내부 시스템 구조가 악의적인 사용자에게 노출될 수 있어 심각한 2차 공격의 빌미를 제공합니다.

- **발견 위치**: `api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java` (Line 143)
- **상세 내용**:
  `legacySecurityFilterChain` 설정에서 `AntPathRequestMatcher.antMatcher("/actuator/**")`가 `permitAll()`로 설정되어 있어, 누구든지 인증 없이 Actuator 엔드포인트에 접근할 수 있습니다.
- **해결 방안**:
  - `/actuator/health`와 같이 외부 모니터링에 필수적인 항목만 `permitAll()`로 열어두고, 나머지 엔드포인트(특히 `/env`, `/beans`, `/prometheus`)는 `hasRole("SYSTEM")` 또는 `hasRole("ADMIN")`과 같이 엄격한 인가 설정을 추가해야 합니다.
  - 또는 로컬 환경을 제외한 운영/알파 환경에서는 Spring Security 외부에서 서브넷이나 IP 화이트리스트로 제한해야 합니다.

## [High] 3. 애플리케이션 설정 파일 내 민감 정보 하드코딩
**Impact**: 소스 코드가 외부에 유출되거나 형상 관리 시스템을 통해 개발자에게 노출될 경우, 데이터베이스 및 JWT 서명용 비밀키가 함께 유출되어 시스템 권한이 완전히 장악될 수 있습니다.

- **발견 위치**:
  - `api-server/src/main/resources/application.yml`
    - `spring.datasource.password`: `egov123` (Line 27)
    - `jwt.secret`: `dGhpcy1pcy1hLXZlcnktbG9uZy1zZWNyZXQta2V5LWZvci1lZ292LWVudGVycHJpc2UtbW9kZXJuaXphdGlvbg==` (Line 67)
  - `api-server/src/main/resources/application-prod.yml`
    - `spring.datasource.password`: `${DB_PASSWORD:s5isI0KE48Bd9kD1}` 환경변수 기본값에 운영 패스워드 하드코딩 (Line 10)
- **상세 내용**:
  DB 계정 정보 및 JWT 서명 시크릿이 소스 코드 내에 일반 텍스트로 존재합니다. 특히 운영용(`application-prod.yml`) 기본값으로 운영 DB 패스워드가 하드코딩된 것은 치명적입니다.
- **해결 방안**:
  - `.env` 파일을 활용하거나 AWS Secrets Manager, HashiCorp Vault 등 외부 설정 관리 도구를 사용해야 합니다.
  - 소스코드에 커밋되는 `yml` 파일 내에는 어떠한 실제 비밀번호나 시크릿 값도 존재해서는 안 되며, 환경 변수로만 주입(`password: ${DB_PASSWORD}`)받도록 변경해야 합니다.

## [Medium] 4. 개발 환경에 종속된 CORS(교차 출처 리소스 공유) 설정
**Impact**: 불특정 외부 도메인에서 악의적으로 API를 호출하여 민감한 데이터를 탈취하거나 사용자 권한을 악용하는 것을 방지하기 위한 보안 통제가 부족합니다.

- **발견 위치**: `api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java` (Line 73-75)
- **상세 내용**:
  `CorsConfiguration`에 `localhost`와 `127.0.0.1` 포트들이 하드코딩되어 있습니다. 환경 프로파일(dev/prod)과 무관하게 동작하며, 상용망에서는 허용된 클라이언트 도메인 주소 목록을 엄격히 설정해야 합니다.
- **해결 방안**:
  - `application.yml` 및 `application-prod.yml`을 통해 허용 도메인(`cors.allowed-origins`)을 배열 형태로 관리하고, `ApiSecurityConfig`는 `@Value`나 `@ConfigurationProperties`를 활용해 동적으로 CORS 설정을 불러오도록 변경합니다.

---
*본 문서는 Antigravity 에이전트에 의해 자동 분석 및 작성되었습니다.*
