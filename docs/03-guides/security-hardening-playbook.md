# Security Hardening & Authentication Playbook

본 플레이북은 인증(Authentication), 인가(Authorization), 세션 라이프사이클 및 관리자 접근 제어를 진단하는 실무 런북이다. 상위 규범은 [백엔드 헌법](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md)과 [프론트엔드 헌법](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md)이며, OWASP 원칙의 충족 여부는 이 문구가 아니라 현재 코드·보안 테스트·CI 증거로 판정한다.

---

## 1. 프론트-백엔드 인증 동기화 아키텍처

eGov Enterprise는 프론트엔드(Next.js App Router)와 백엔드(Spring Boot API Server) 사이에 **쿠키 기반 JWT 세션**을 사용한다. 프론트 Proxy의 조기 라우팅 판단과 백엔드 Spring Security의 최종 인가를 서로 다른 방어선으로 둔다.

```mermaid
sequenceDiagram
    autonumber
    actor User as Web Browser
    participant Mid as Next.js Proxy<br>(routing guard)
    participant Client as Browser/RSC API client
    participant BE as Spring Security<br>(api-server)

    User->>Mid: Access /admin/community
    Note over Mid: 1. accessToken JWT 서명·만료 검증<br>(Web Crypto HMAC, alg 화이트리스트)<br>2. 검증된 payload.role 로 역할 검사<br>(위조 userRole 쿠키 불신)
    Mid-->>User: Pass Edge Router (Allow)
    
    User->>Client: Mount & Fetch data
    Client->>Mid: GET /api/v1/admin/community/boards<br>(accessToken 쿠키 동봉)
    Note over Mid: /api/v1·/actuator 프록시:<br>accessToken 쿠키 → Authorization: Bearer 주입
    Mid->>BE: GET /api/v1/admin/community/boards<br>Authorization: Bearer [JWT]
    
    Note over BE: 1. JwtAuthenticationFilter 통과<br>2. SecurityContext Holder 적재<br>3. SecurityUtil 이중 권한 재검증
    BE-->>User: 200 OK (Protected Data)
```

### 1.1 쿠키 세션 & 헤더 바인딩 핵심 메커니즘
- **Access Token 관리**: Next.js 로그인·재발급 Route Handler가 access JWT를 항상 `HttpOnly`, `SameSite=Strict` 쿠키로 설정하고 응답 본문에는 토큰을 노출하지 않는다. `Secure`는 기본값이자 운영·preview·staging·공유 개발 등 배포 환경의 필수 속성이다. 서버 전용 `ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE=true` opt-in과 실행 모드·내부 URL·원 요청 및 forwarding 헤더가 모두 단일 평문 local loopback을 증명할 때만 생략할 수 있다. 공유 환경에서는 opt-in을 설정하지 않으며, non-loopback HTTP에서 로그인이 동작하지 않으면 TLS 또는 접근 토폴로지를 고치고 예외를 넓히지 않는다. 브라우저 코드가 `localStorage`나 JavaScript로 읽을 수 있는 쿠키에 access token을 저장해서는 안 된다. 정확한 결정 경계는 [ADR-0010](../02-architecture/decisions/ADR-0010-frontend-session-cookie-secure-policy.md)이 소유한다.
- **클라이언트 전파**: 브라우저 요청은 `withCredentials`로 같은 출처 프록시에 쿠키를 보내며 `frontend/src/proxy.ts`가 `/api/v1`·`/actuator`·`/ws` 요청에 Bearer 헤더를 주입한다. SSR 경로는 서버의 `cookies()`로 토큰을 읽어 백엔드 요청 헤더에 싣는다. 백엔드가 서명과 최종 인가를 authoritative하게 재검증한다.
- **CORS & Credentials 주의사항**: 이종 origin에서 자격증명 요청을 허용할 때는 `allowedOrigins=*`를 사용하지 않고 활성 프로필의 `cors.allowed-origins`에 실제 origin을 명시한다. 기본 브라우저 경로는 same-origin Next.js proxy이며, 개발 포트도 문서가 아니라 현재 설정에서 확인한다. 인증 cookie의 SameSite 정책을 완화하려면 실제 배포 토폴로지와 CSRF 영향을 별도 검토한다.

### 1.2 Refresh Token을 활용한 Silent Refresh (재발급) 파이프라인
- Access Token 만료에 따른 잦은 로그아웃(401) 방지를 위해, `HttpOnly` 쿠키에 더 긴 수명을 가진 `refreshToken`을 병행 저장한다.
- 401 발생 시 Axios interceptor가 Next.js `/api/auth/reissue` Route Handler를 호출한다. Route Handler는 refresh cookie를 백엔드 `/api/v1/auth/reissue`에 전달하고 새 access token을 HttpOnly cookie로 재설정한다. 성공 후 원 요청을 한 번 재시도하며, 재발급 요청 자체와 로그인 경로는 무한 루프 방지를 위해 제외한다.

---

## 2. Next.js Proxy & Spring Security 이중 방어

보안 위상 강화를 위해 프론트엔드 에지 단(Edge Node Routing)과 백엔드 애플리케이션 코어 단(Spring Filter Chain)에서 각각 **역할 기반 접근 제어(RBAC)**를 이중으로 집행한다.

### 2.1 Next.js Proxy 위상 설정 (`frontend/src/proxy.ts`)
프론트엔드 웹 라우팅 진입 시점에서 사용자의 미인증 접근을 원천 차단하고 어드민 메뉴로의 부적절한 권한 진입을 즉각 라우팅시킵니다.

아래 코드는 구조를 설명하는 축약 예시다. 허용·제외 경로, origin guard, WebSocket 처리와 JWT 검증 결과 타입은 현재 [`frontend/src/proxy.ts`](../../frontend/src/proxy.ts)가 정본이다.

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// prod 에서 JWT_SECRET 미설정이면 모듈 로드 시 즉시 throw(fail-fast) — 공개 dev 기본값으로 조용히 검증하는 최악 상태 방지
const DEV_JWT_SECRET = '...(dev 전용 base64 시크릿)...';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('[Middleware] prod 환경에 JWT_SECRET 미설정 (fail-fast)');
}
const JWT_SECRET = process.env.JWT_SECRET || DEV_JWT_SECRET;
// header.alg 를 신뢰하지 않고 화이트리스트로만 매핑 (alg=none·비대칭 혼동 공격 차단)
const HMAC_HASH: Record<string, string> = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

// base64url·utf8 → ArrayBuffer 변환 헬퍼 3종은 지면상 생략 (Edge 네이티브 Web Crypto만 사용, 외부 의존 없음)

/**
 * accessToken 의 HMAC 서명과 만료(exp)를 모두 검증하고 payload.role 을 반환한다.
 * 서명 위조·만료·구조 이상·알 수 없는 alg 는 전부 null(=미인증)로 처리한다.
 */
async function verifyAndExtractRole(token: string): Promise<string | null> {
    try {
        const [headerB64, payloadB64, sigB64] = token.split('.');
        if (!sigB64) return null;

        const header = JSON.parse(base64UrlDecodeToString(headerB64));
        const hash = HMAC_HASH[header.alg];
        if (!hash) return null; // alg=none·RS*(비대칭) 등 화이트리스트 밖은 거부

        const key = await crypto.subtle.importKey(
            'raw', utf8ToArrayBuffer(JWT_SECRET), { name: 'HMAC', hash: { name: hash } }, false, ['verify']
        );
        const valid = await crypto.subtle.verify(
            'HMAC', key, base64UrlToArrayBuffer(sigB64), utf8ToArrayBuffer(`${headerB64}.${payloadB64}`)
        );
        if (!valid) return null; // 서명 위조

        const payload = JSON.parse(base64UrlDecodeToString(payloadB64));
        if (payload.exp && Date.now() >= payload.exp * 1000) return null; // 만료
        return payload.role || null;
    } catch {
        return null;
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. 백엔드 API 프록시: accessToken 쿠키 → Authorization: Bearer 헤더 주입 (백엔드가 서명을 authoritative 재검증)
    if (pathname.startsWith('/api/v1') || pathname.startsWith('/actuator')) {
        const accessToken = request.cookies.get('accessToken')?.value;
        if (accessToken) {
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('Authorization', `Bearer ${accessToken}`);
            return NextResponse.next({ request: { headers: requestHeaders } });
        }
        return NextResponse.next();
    }

    // 2. 공개 경로 조기 우회 (로그인/Next API Route/정적)
    if (pathname.startsWith('/login') || pathname.startsWith('/api') || pathname.startsWith('/images') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
        return NextResponse.next();
    }

    // 3. accessToken JWT 서명·만료를 실제로 검증 → 위조 role=ADMIN 토큰의 관리자 UI 셸 열람 차단
    const accessToken = request.cookies.get('accessToken')?.value;
    const userRole = accessToken ? await verifyAndExtractRole(accessToken) : null;

    // 유효(서명·만료 통과) 토큰이 없으면 /login 으로 (redirect 쿼리 보존)
    // ⚠ 쿠키를 삭제하지 않는다 — 프리페치/RSC 1회 검증 실패가 유효 세션을 영구 로그아웃시키는 함정 방지
    if (!userRole) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 4. /admin 접근 통제 — 기본값 = ADMIN/SYSTEM 전용(deny-by-default).
    // 일반 사용자에게는 명시 허용 경로만 열고, 그 안의 관리 콘솔은 다시 제외한다.
    // 실제 목록·헬퍼는 frontend/src/proxy.ts가 정본이다.
    const normalizedPath = pathname.toLowerCase(); // /Admin 대소문자 우회 차단
    if (matchesPrefix(normalizedPath, '/admin')) {
        const normalizedRole = userRole.toUpperCase();
        // 백엔드(ApiSecurityConfig)가 ROLE_ADMIN 과 동급 취급하는 ROLE_SYSTEM 도 함께 인정
        const isAdmin =
            normalizedRole === 'ADMIN' || normalizedRole === 'ROLE_ADMIN' ||
            normalizedRole === 'SYSTEM' || normalizedRole === 'ROLE_SYSTEM';

        if (!isAdmin) {
            // USER_ACCESSIBLE_ADMIN_PATHS: work-hub·collaboration·help·community·survey polls participate
            // ADMIN_ONLY_SUBPATHS: community/boards/master·maker·templates (허용 경로 안의 관리 콘솔 역예외)
            const isUserAccessible =
                USER_ACCESSIBLE_ADMIN_PATHS.some((p) => matchesPrefix(normalizedPath, p)) &&
                !ADMIN_ONLY_SUBPATHS.some((p) => matchesPrefix(normalizedPath, p));
            if (!isUserAccessible) {
                const fallbackUrl = new URL('/', request.url);
                fallbackUrl.searchParams.set('auth_error', 'unauthorized');
                return NextResponse.redirect(fallbackUrl);
            }
        }
    }

    return NextResponse.next();
}

// 전역 매처: 정적 자원을 제외한 앱 전체를 가드 (API 경로도 프록시 주입을 위해 포함)
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 2.2 Spring Boot Security Filter Chain 설정 (`api-server`)
스프링 시큐리티는 프론트엔드 라우팅 우회 침투에 대비하여 API 엔드포인트 레벨에서 인가를 강제한다.

아래는 개념 예시이며 API 런타임의 실제 matcher 순서, DB URL 인가와 공개 경로는 [`ApiSecurityConfig.java`](../../api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java)를 직접 확인한다. `business-core`의 fallback `SecurityConfig`는 `ApiSecurityConfig`가 없는 컨텍스트에서만 활성화된다.

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable()) // Stateless JWT 기반 설정
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/v1/public/**", "/api/v1/auth/login").permitAll()
            .requestMatchers("/api/v1/admin/**").hasRole("ADMIN") // 어드민 API 인가 강제
            .anyRequest().authenticated()
        )
        .addFilterBefore(new JwtAuthenticationFilter(tokenProvider), UsernamePasswordAuthenticationFilter.class);
    return http.build();
}
```

---

## 3. 🚨 긴급 보안 장애 트러블슈팅 가이드

현업 개발 중 가장 빈번하게 마주치는 **401 Unauthorized** 및 **403 Forbidden** 에러에 대한 해결 알고리즘이다.

### 3.1 [HTTP 401] Unauthorized 진단 플로우차트

사용자의 인증 세션이 풀렸거나, 토큰이 정상적으로 전달되지 않는 장애 상황 발생 시 진단 단계:

```text
[HTTP 401 에러 발생]
   │
   ├──▶ 1단계: 브라우저 쿠키(DevTools ➔ Application ➔ Cookies)에 "accessToken"이 존재하는가?
   │            NO: 로그인 세션 만료. 로그인을 새로 처리하십시오.
   │            YES: 2단계로 진행.
   │
   ├──▶ 2단계: API 요청 헤더(Network ➔ Request Headers)에 "Authorization: Bearer eyJ..." 포맷이 정확한가?
   │            NO: 브라우저 경로는 frontend/src/proxy.ts의 쿠키→Bearer 중개와 rewrite를, SSR은 해당 server action/component의 cookies()→헤더 구성을 확인하십시오. frontend/src/lib/api/client.ts는 withCredentials와 401 재발급 흐름을 확인합니다.
   │            YES: 3단계로 진행.
   │
   └──▶ 3단계: 백엔드 서버 로그에 "ExpiredJwtException" 또는 "SignatureException"이 찍혀있는가?
                YES (Expired): JWT 토큰 만료 시간 경과. Refresh Token Silent Refresh 로직(§1.2)이 정상 작동하는지 확인하십시오.
                YES (Signature): JWT Secret Key 불일치. application.yml의 Secret은 반드시 `${JWT_SECRET}` 환경변수 바인딩이어야 한다. [백엔드 헌법 제11조]
```

### 3.2 [HTTP 403] Forbidden 진단 가이드

토큰은 올바르나 자원에 접근할 권한이 없는 상태에서의 조치 방법:

1. **`hasRole()` vs `hasAuthority()`와 권한 원본 확인**:
   - `hasRole("ADMIN")`은 내부적으로 `ROLE_ADMIN` 권한을 탐색한다.
   - access JWT의 subject는 `esntlId`이고 `role` claim은 프론트 라우팅의 심층 방어에 쓰인다. 백엔드 `JwtTokenProvider.getAuthentication()`은 subject로 현재 `UserDetails`를 다시 로드하므로 claim을 백엔드 권한 원본으로 보지 않는다.
   - 백엔드 403은 `tb_user_authrt_map`·`tb_authrt_role_map`, `JpaUserAuthAdapter`, `CustomUserDetails.getAuthorities()`와 role hierarchy를 같은 요청 시점 기준으로 대조한다. `ROLE_` 정규화 문제를 숨기기 위해 `hasAuthority("ADMIN")`로 의미를 바꾸지 않는다.
2. **SecurityUtil 디버깅**:
   - 비즈니스 레이어에서 `SecurityUtil.hasRole("ROLE_ADMIN")`이 `false`를 뱉는다면, `SecurityContextHolder` 내부에 저장된 `Authentication` 객체의 `Authorities` 배열에 해당 String 역할명이 정상 파싱되어 적재되어 있는지 디버깅 브레이크포인트를 걸고 분석한다.

---

## 4. 데이터 암호화 및 마스킹 규범 (Data Protection)

OWASP Top 10의 '암호화 실패(Cryptographic Failures)'를 방어하기 위한 백엔드 데이터 보호 원칙이다.

### 4.1 패스워드 및 민감 정보 단방향 해싱
- 사용자의 비밀번호는 DB에 평문(Plain Text)으로 절대 저장될 수 없다.
- Spring Security의 `BCryptPasswordEncoder`를 의무 적용하여, 가입 및 비밀번호 변경 시 반드시 단방향 해싱(Hashing)된 값으로 `tb_user_info` 테이블에 적재한다.

### 4.2 개인 식별 정보(PII) 로그 마스킹
- 주민등록번호, 연락처, 이메일 등의 PII 데이터는 `api-server`의 전역 로깅 인터셉터나 예외 핸들러에서 로깅(Logger.error)될 때 반드시 정규식을 통해 마스킹(Masking, 예: `010-****-1234`) 처리되어야 한다.

### 4.3 요청 상관관계(Trace) 추적

- **traceId 소유권은 Micrometer/OTel 브리지 단독이다.** 애플리케이션 필터는 `traceId` MDC 키를 별도로 생성하거나 덮어쓰지 않는다.
- **로그 패턴에 `%X{traceId}` 를 추가하지 말 것.** Spring Boot 가 `logging.pattern.correlation`(= `%correlationId`)으로 이미 출력하고 있다. 중복 추가하면 위 키 충돌을 되살린다.
- **`X-Trace-Id` 응답 헤더는 유지**하되 값은 OTel 의 traceId 를 싣는다. **클라이언트가 보낸 `X-Trace-Id` 는 수신하지 않는다** — 무검증 반영은 순수한 로그 위조 벡터였다.
- PII 마스킹(§4.2)과의 결속은 `%correlationId` 를 공통 축으로 삼는다(마스킹 유틸은 `nuri.foundation.core.util.PiiMaskUtil`).

---

## 5. Spring Security API 권한 제어 유실 방지 하네스 (Auth Role Guardrail)

엔드포인트 수준에서 명시적인 권한 검증 어노테이션이 누락되어 인가 우회가 일어나는 제로데이 취약점을 원천 방지하기 위해 **Auth Role Guardrail 하네스**를 구축하여 빌드 타임에 강제합니다.

### 5.1 작동 메커니즘
- **타겟 도메인 패키지**: `nuri.api.controller` 하위 패키지에 정의된 REST 컨트롤러.
- **오딧 검증(실제 집행 범위)**: 게이트의 자기 서술은 집행이 바뀔 때마다 함께 바뀌어야 합니다.
  - **Test#1** (`auditSecurityAnnotationsOnRestControllers`): **패키지 skip 없이** `nuri.api.controller` 하위 **전 컨트롤러의 읽기·쓰기**를 순회합니다. 단 다음 중 하나면 통과시킵니다 — ① `PUBLIC_PATH_WHITELIST` 매칭 ② `@PreAuthorize`/`@Secured`/메타 애노테이션 **존재** ③ `rbac.db-auth.secure-paths` 또는 DB 프로그램 URL 매칭.
  - **Test#2** (`auditWriteEndpointAuthorizationOnNonAdminPaths`): 전 컨트롤러를 보지만 **쓰기(POST/PUT/DELETE/PATCH)만** 보며, `/api/v1/admin/` 접두는 URL 시큐리티에 위임해 skip 합니다.
  - **남은 사각지대**: ③은 문자열/DB URL 매칭이므로 선언 동기화 게이트가 필요합니다. ②는 `@PreAuthorize("isAuthenticated()")`처럼 객체 소유권을 증명하지 않는 애노테이션도 통과시키므로, 개인 데이터는 서비스 가드와 음성 테스트가 별도로 필요합니다.
  - 요컨대 **"모든 컨트롤러를 순회한다"는 참이지만 "모든 인가를 검증한다"는 거짓**입니다. 이 게이트의 그린은 "인가 애노테이션이 빠지지 않았다"이지 "인가가 옳다"가 아닙니다. 최신 범위는 항상 `SecurityAuthAnnotationLinterTest` 의 클래스 javadoc 을 SSOT 로 삼으십시오.
- **예외 처리 (White-list)**: 비인가 접근이 허용되어야 하는 공개 API(예: 회원가입, 아이디 중복 확인 등)는 `SecurityAuthAnnotationLinterTest`의 `PUBLIC_PATH_WHITELIST` 상수에 등록하여 통과시키거나, `@PreAuthorize("permitAll()")`를 명시적으로 선언하도록 강제합니다.
- **빌드 하드 스톱(Hard-Stop)**: 만약 권한 제어 어노테이션이 유실된 커스텀 API가 발견되면, JUnit 테스트 단계에서 즉시 빌드를 실패(`Hard-Stop`) 처리하고 위반 엔드포인트 명세를 상세 보고합니다.

### 5.2 검증 수행 명령
```powershell
./gradlew :api-server:harnessTest --tests "*SecurityAuthAnnotationLinterTest*"
```

---
*Last reviewed against current sources: 2026-09-05.*
*Governed by: OWASP Hardening & Zero-Trust Security Playbook / Security Auth Linter Harness*
