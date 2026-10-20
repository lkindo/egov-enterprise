# ADR-0038 — 쿠키 자격을 실은 쓰기 요청에 이중 제출 CSRF 토큰을 요구한다

- 상태: Accepted
- 결정일: 2026-10-21
- 승인: 사용자가 2026-10-20 시큐어코딩 점검에서 SAST 예외를 "모두 순서대로 근본 해소 방안으로" 처리하라고 지시했다(CSRF는 실제 토큰 도입안).
- 대체: [DEC-OPS-075](../../../.agent/memory/decisions.md)의 한정 예외 가운데 SAST-FP-001·002(API·코어 체인의 CSRF 비활성).

## 배경

API 체인과 코어 대체 체인은 CSRF를 끄고, 백엔드가 `Authorization` 헤더만 인증한다는 점과 SameSite=Strict 세션 쿠키·Origin 검사를 보완 통제로 삼았다. 그러나 브라우저 요청은 Next 프록시가 HttpOnly `accessToken` 쿠키를 Bearer 헤더로 바꿔 넘기고, 재발급·로그아웃은 백엔드가 `refreshToken` 쿠키를 직접 읽는다. 시스템 전체로 보면 쿠키가 자격이다. 행안부 구현단계 보안약점 49개의 "크로스사이트 요청 위조" 항목과 진단 도구는 CSRF 비활성 자체를 약점으로 보고, 예외 소명은 보완 통제가 바뀔 때마다 재검토가 필요했다.

## 결정

1. API 체인과 코어 대체 체인에서 CSRF를 켠다. Spring Security의 SPA용 이중 제출 방식(`csrf.spa()`)을 쓴다. 토큰은 `XSRF-TOKEN` 쿠키이고, 요청은 같은 값을 `X-XSRF-TOKEN` 헤더로 보낸다.
2. 토큰을 요구하는 범위는 **안전하지 않은 메서드이면서 쿠키 자격을 실은 요청**이다([정책](../../../foundation/src/main/java/nuri/foundation/security/filter/CredentialCookieCsrfPolicy.java)). 자격이 아닌 것으로 확인된 쿠키(`XSRF-TOKEN`·`session_exp`)만 빼고 모르는 쿠키는 자격으로 본다(fail-closed). 헤더로만 자격을 보내는 클라이언트(Next 서버 측 호출·API 클라이언트)는 브라우저가 자동으로 싣는 자격이 없어 위조 대상이 아니므로 요구하지 않는다.
3. SockJS 전송(`/ws/**`)은 커스텀 헤더를 실을 수 없으므로 범위에서 빼고, 쿠키 인증 필터가 허용 Origin을 강제한다.
4. 토큰 쿠키는 같은 출처 JavaScript가 읽어야 하므로 HttpOnly가 아니고 SameSite=Strict다. Secure는 세션 쿠키와 같은 설정(`jwt.cookie.secure`, [ADR-0010](ADR-0010-frontend-session-cookie-secure-policy.md))을 따른다.
5. 브라우저 쪽: axios는 같은 출처 요청에 쿠키 값을 헤더로 붙인다. 서버 렌더링만 거친 화면의 첫 쓰기가 토큰 없이 나가지 않도록 Next 프록시가 문서 응답에 토큰 쿠키가 없으면 만든다. 쿠키와 헤더가 같은지만 보므로 출처와 무관하게 같은 효력이다. 재발급·로그아웃 BFF는 브라우저 쿠키를 넘길 때 받은 헤더도 함께 넘긴다.
6. 토큰 누락·불일치는 403 `C010`이며 문구를 권한 부족과 나눈다.

## 영향과 경계

- 쿠키 자격을 실은 채 백엔드를 부르는 시험·도구는 토큰 쿠키와 같은 값의 헤더를 실어야 한다. E2E는 공용 fixture와 [헬퍼](../../../frontend/e2e/fixtures/csrf.ts)가 이를 맡는다. 헤더로만 자격을 보내는 부하 시험·API 계약 fixture는 바뀌지 않는다.
- 이중 제출은 다른 하위 도메인이 쿠키를 심을 수 있는 형상의 쿠키 주입을 막지 못한다. SameSite=Strict 세션 쿠키, 프록시·백엔드의 Origin 검사, 서버 액션의 Next 자체 Origin 검사를 그대로 함께 둔다.
- 보안 판정 근거와 해소 기록은 [SAST 예외 검토 결과](../../04-operations/sast-findings-review.md)와 [시큐어코딩 기준선](../../04-operations/secure-coding-weakness-baseline.md)에 둔다.
