# 20260717 — 잔여 하드닝: fe-auth Phase 1-3 + fe-csp Phase 1

> **등급**: L2 (인증 미들웨어·계약변경·보안헤더) · **승인**: 사용자 "잔여작업도 진행해줘"
> **선행**: A그룹 설계서(a-group-decision-recommendations.md) §3-1·§3-2 + 적대검증 amendment 반영

## 1. fe-auth Phase 1 — 미들웨어 JWT 서명 검증 (위조 토큰 거부)

기존 [middleware.ts](../../frontend/src/middleware.ts)는 base64 페이로드만 디코드 → 서명 없는 위조 토큰(role=ADMIN·미래 exp)으로 관리자 UI 셸 열람 가능.
- **Edge 네이티브 Web Crypto(SubtleCrypto) HMAC 검증** — jose 의존 추가 없이 서명+만료 검증. alg 화이트리스트(HS256/384/512, header.alg 불신, alg=none·비대칭 혼동 차단).
- **HS512 정정**: dev 시크릿 88바이트라 jjwt 가 HS512 자동추론 → HS256 핀 금지(적대검증 발견). 키는 `TextEncoder().encode(secret)`(base64 디코드 금지 — 백엔드 getBytes() raw 정합).
- **prod fail-fast**: NODE_ENV=production+JWT_SECRET 미설정 시 모듈 로드 throw. **런타임 확증: JWT_SECRET 없으면 /login 500, 주입 시 200.**
- **🚨 함정 발견·정정**: 검증 실패 시 쿠키 삭제를 넣었더니 **프리페치/RSC 전환적 검증실패 1회가 유효 세션을 영구 로그아웃**(E0 로그인 후 /admin 로드→되돌림). 트레이스로 확인(WS는 webmaster CONNECT 성공했는데 URL은 /login) → **쿠키 삭제 제거**(원본 동작 보존, 전환적 실패 자가복구).

## 2. fe-auth Phase 2 — E2E 잔재 정리 (HttpOnly 정합)

- [auth.setup.ts](../../frontend/e2e/auth.setup.ts): accessToken 쿠키 httpOnly:false→**true**, **userRole 쿠키·localStorage accessToken 제거**(죽은 잔재), egov_smart_tour_v1 보존(투어억제 살아있는 의존). refreshToken 은 Set-Cookie 파싱 폴백 추가(Phase 3 대비).
- [SurveyPage.ts](../../frontend/e2e/pages/SurveyPage.ts): localStorage accessToken 추출·수동 Authorization 제거 → 동일출처 fetch 를 미들웨어 Bearer 주입에 위임(HttpOnly 정합). tier-19 는 cookieToken 우선이라 무영향 확인.

## 3. fe-auth Phase 3 — refreshToken 바디 축소 (Contract)

- [TokenResponse.java](../../business-core/src/main/java/nuri/business/service/auth/dto/TokenResponse.java): refreshToken `@JsonIgnore`+`@Schema(hidden)` — HttpOnly 쿠키로만 전달(XSS 재발급토큰 탈취면 제거). **런타임 확증: /v3/api-docs TokenResponse 에서 refreshToken 소멸**, codegen 재생성.
- [AuthApiController.reissue](../../api-server/src/main/java/nuri/api/controller/foundation/auth/AuthApiController.java): `addRefreshTokenCookie` 대칭 추가(향후 회전 도입 시 전달경로 소멸 함정 차단).
- AuthApiControllerTest: `$.data.refreshToken` doesNotExist 단언 추가.

## 4. fe-csp Phase 1 — CSP 하드닝 (파손 0 이득 선취)

[next.config.ts](../../frontend/next.config.ts) prod/dev CSP 분리:
- **prod script-src 'unsafe-eval' 제거**(앱 소스 eval 0 실측; unsafe-inline 은 RSC 요구로 잔존=nonce Phase 4).
- **prod connect-src 'self' 만**(bare `ws: wss:`=전 호스트 허용 XSS 유출채널 제거; 동일출처 /ws + CSP3 'self' 승격 커버). dev 는 HMR 위해 ws/wss 유지.
- img-src grainy-gradients(참조 0) 제거 · **X-XSS-Protection '0'**(deprecated·XS-Leaks).
- 리포팅: `Reporting-Endpoints` + prod `report-uri /api/security/csp; report-to`('csp-report' 문자열 회피=광고차단기 오차단 방지). [csp route](../../frontend/src/app/api/security/csp/route.ts) 방어설계(Content-Type 허용목록·32KB 상한·필드 화이트리스트 로깅·제어문자 새니타이즈·204).
- **런타임 확증**(next start prod): unsafe-eval 부재·grainy 부재·connect-src 'self'·X-XSS 0·report-uri 존재 실측.

## 5. 게이트 (Stage 4)

- **tier-23 인증 E2E 17 passed**: E0 로그인성공(P0 회귀가드+서명검증)·**E1 위조토큰 거부 2종(신규 보안속성)**·E2 로그인실패·E3/E4 RBAC·E11 a11y·E12. **error-detector 근본수정: 예상401 목록에 `/api/v1/auth` 추가**(기존 `/api/auth`만 체크해 /api/v1/auth/me benign 401 미포착 = E2/E11 pre-existing 실패 해소).
- compileJava/compileTestJava 0 · tsc 0 · next build 0(RSC+prod CSP) · AuthApiControllerTest·RbacAuthorizationMatrixTest green · 전체 백엔드 테스트(하단 참조).

## 6. Phase 4 — 제품 결정 보류 (미착수)

- **fe-auth Phase 4**(admin 게이트 커버리지 확장): /admin 17세그먼트 중 일반사용자 기능 편입범위/URL 재편 = 설계서 §4 3-1.①.
- **fe-csp Phase 4**(nonce+strict-dynamic로 unsafe-inline 제거): **cacheComponents(PPR) 포기** 성능-보안 트레이드오프 = 설계서 §4 3-2.① 순수 제품결정. Report-Only 계측(Phase 2-3)도 이 결정에 게이트되어 함께 보류.
