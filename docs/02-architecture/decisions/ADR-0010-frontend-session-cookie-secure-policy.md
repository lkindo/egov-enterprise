# ADR-0010 — 프론트엔드 세션 쿠키의 Secure 예외를 명시적 평문 loopback으로 제한한다

**Status:** Accepted

**Date:** 2026-09-05

**Deciders:** lkindo (repository owner · security owner · frontend architecture owner)

**Related:** [프론트엔드 헌법 제4조](../../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md), [공용 Secure 판정](../../../frontend/src/lib/auth/session-cookie-policy.ts), [인증 보안 플레이북](../../03-guides/security-hardening-playbook.md), [ADR-0003](ADR-0003-frontend-ux-modernization-principles.md)

## Context

프론트엔드 헌법은 `accessToken` 쿠키에 `HttpOnly`, `Secure`, `SameSite` 속성을 예외 없이 요구했지만, Next.js 로그인·재발급 Route Handler는 로컬 HTTP 개발을 위해 `NODE_ENV=production`일 때만 `Secure`를 설정해 왔다. 실무 플레이북은 이를 이미 “운영 `Secure`”라고 설명해 헌법과 실행 문서가 서로 달랐다.

운영 경로는 현재 `Secure`를 사용하므로 확인된 운영 토큰 노출을 뜻하지는 않는다. 다만 실행 모드 하나만으로 예외를 정하면 외부에서 도달 가능한 공유 개발 환경까지 `Secure`가 빠질 수 있고, 정적 계약의 단순한 `secure:` 문자열 검사는 `secure: false`도 통과시킨다. 로컬 HTTP 사용성과 배포 환경의 기밀성을 함께 보존하는 정확한 예외 경계가 필요하다.

## Decision drivers

- 운영·preview·staging·공유 개발을 포함한 외부 도달 환경에서 프론트엔드 `accessToken`·`session_exp` 쿠키를 HTTPS에만 전송한다.
- 로컬 loopback의 평문 HTTP 개발·검증은 계속 가능하게 한다.
- 실행 모드만으로 예외를 넓히지 않고 명시적 opt-in, scheme, URL host와 원 요청 헤더를 함께 판정한다.
- 로그인과 재발급이 같은 정책을 사용하고 실제 `Set-Cookie` 결과로 검증되게 한다.
- `HttpOnly`, `SameSite=Strict`, 응답 본문의 토큰 비노출 계약은 환경과 관계없이 유지한다.

## Considered options

1. **모든 환경에서 `Secure`를 강제** — 가장 단순하지만 평문 HTTP를 사용하는 로컬 도구와 개발 흐름이 쿠키를 저장하지 못할 수 있어 선택하지 않았다.
2. **production에서만 `Secure`를 강제** — 현재 동작과 같지만 non-production이라는 이유만으로 외부 도달 환경까지 예외가 되어 선택하지 않았다.
3. **평문 loopback 개발·검증만 예외로 허용** — 예외를 실제 필요 범위에 한정하면서 로컬 흐름을 보존하므로 선택했다.

## Decision

1. Next.js Route Handler가 설정하는 `accessToken` 쿠키는 모든 환경에서 `HttpOnly`, `SameSite=Strict`, `Path=/`를 유지하고 응답 본문이나 JavaScript 접근 가능 저장소에 토큰을 노출하지 않는다.
2. `Secure`는 기본값이자 배포 환경의 필수 속성이다. 다음 조건을 **모두** 만족하는 요청에만 `Secure` 미설정을 허용한다.
   - 실행 환경이 `development` 또는 `test`이고 서버 전용 `ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE=true`로 로컬 예외를 명시했다.
   - 내부 URL과 `x-forwarded-proto`가 모두 단일 평문 `http` 요청을 가리킨다.
   - 내부 URL hostname, `Host`, `x-forwarded-host`가 각각 정확히 `localhost`, `127.0.0.1`, `[::1]` 중 하나이며 `x-forwarded-for`도 단일 loopback 접속자를 가리킨다.
   - 표준 `Forwarded` 헤더나 쉼표로 연결된 proxy chain처럼 단일 로컬 요청임을 모호하게 만드는 증거가 없다.
3. production, preview, staging, 외부·공유 네트워크에서 도달 가능한 개발 환경, opt-in 없는 실행, non-loopback 또는 모호한 요청 증거, HTTPS loopback 요청에는 `Secure`를 강제한다. 평문 non-loopback 환경에서 프론트엔드 세션 쿠키가 동작하지 않으면 TLS 또는 접근 토폴로지를 고치며 예외를 확대하지 않는다.
4. 로그인과 재발급은 하나의 판정 규칙을 공유한다. 각 Route Handler가 독자적인 환경 분기를 복제하지 않는다.
5. 브라우저 세션 만료 안내용 `session_exp`는 토큰이 아니어서 JavaScript가 읽을 수 있지만, 전송 경계의 혼선을 피하도록 같은 `Secure` 판정을 사용한다.
6. 백엔드가 소유하는 `refreshToken` 쿠키의 발급·삭제와 `jwt.cookie.secure` 설정은 기존 백엔드 계약의 책임이다. 이 결정은 그 저장·전송 구조나 `SameSite` 정책을 변경하지 않는다.

## Consequences

### Positive

- 운영 외의 공유 배포도 기본 설정으로 비보안 프론트엔드 세션 쿠키를 발급하지 않는다.
- 로컬 loopback HTTP 개발과 테스트는 별도 TLS 구성 없이 유지된다.
- 헌법, 플레이북, 구현과 테스트가 하나의 명시적 예외 경계를 공유한다.
- 로그인만 보호하고 재발급은 빠뜨리는 경로별 drift를 차단한다.

### Costs and risks

- HTTP로 노출한 non-loopback 개발 서버에서는 프론트엔드 세션 쿠키가 저장되지 않아 로그인이 실패한다. 이는 fail-closed 동작이며 TLS 또는 loopback 접속으로 해결해야 한다.
- `ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE`는 loopback에만 bind한 로컬 프로세스에서만 사용한다. reverse proxy가 원래 host·scheme·접속자 주소를 모두 loopback으로 덮어쓰면 애플리케이션만으로 실제 외부 도달성을 복원할 수 없으므로, 공유 환경에서는 이 opt-in을 설정하지 않고 TLS를 사용한다.
- 브라우저별 localhost 처리 차이에 기대지 않고 정확한 예외를 유지해야 하므로 정책 판정과 Route Handler의 결속 테스트가 필요하다.

## Non-goals

- TLS 종료·인증서·reverse proxy 인프라를 이 ADR에서 구성하는 것
- `refreshToken`의 수명·회전·저장 구조를 바꾸는 것
- `SameSite=Strict`를 완화하거나 cross-site 인증을 새로 허용하는 것
- 로그아웃 만료 쿠키의 식별·삭제 계약을 바꾸는 것

## Validation

- [`session-cookie-policy.test.ts`](../../../frontend/src/lib/auth/__tests__/session-cookie-policy.test.ts)는 exact 환경·hostname allowlist, 명시적 opt-in, scheme·원 요청 헤더의 허용 조합과 누락·proxy chain·유사 hostname의 fail-closed 조합을 검증한다.
- [`auth-routes.test.ts`](../../../frontend/src/app/api/auth/__tests__/auth-routes.test.ts)는 로그인·재발급의 실제 `Set-Cookie`를 파싱해 배포 환경의 `Secure` 존재와 허용된 loopback 예외를 모두 검증한다.
- [`fe-auth-hardening.test.ts`](../../../frontend/src/__tests__/fe-auth-hardening.test.ts)는 두 Route Handler가 공용 보안 판정에 결속돼 있고 `HttpOnly`, `SameSite=Strict`, 토큰 비노출 계약을 유지하는지 빠른 경로에서 검사한다.
- [`playwright-auth-artifact-contract.test.mjs`](../../../scripts/playwright-auth-artifact-contract.test.mjs)는 제품 발급 증거가 아닌 E2E storage-state fixture에 local 예외를 복제하지 않고 항상 `Secure`, `HttpOnly`, `SameSite=Strict`를 쓰도록 차단한다.
- [`23-security-auth-supplement.spec.ts`](../../../frontend/e2e/23-security-auth-supplement.spec.ts)는 production build/start를 사용하는 required CI에서 로그인·재발급의 실제 브라우저/응답 쿠키에 `Secure`와 `SameSite=Strict`가 있는지 검증한다.
- `secure: false`, non-loopback 예외 확대 또는 재발급 경로의 정책 이탈을 의도적으로 주입했을 때 관련 계약이 red가 되는지 확인한다.
- 문서 링크와 ADR registry·공용 결정 인덱스의 exact-set 정합을 저장소 운영 계약으로 검증한다.
