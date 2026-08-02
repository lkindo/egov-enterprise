package nuri.security.test;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 인증 우회 시도에 대한 <b>필터체인 + SecurityConfig 결합</b> 검증.
 *
 * <p><b>[2026-08-02 정보량 복원] 종전 이 클래스가 아무것도 증명하지 못했던 이유</b>
 * <ol>
 *   <li>{@link BaseSecurityTest} 가 {@code JwtTokenProvider} 를 {@code @MockitoBean} 으로 대체하고
 *       {@code SecurityTestConfig} 가 <b>그 mock 을 필터체인에 그대로 물린다</b>. Mockito 기본 반환값은
 *       {@code resolveToken()=null}, {@code validateToken()=false} 이며 <b>입력과 무관하게 고정</b>이다.
 *       따라서 "무효 토큰이 거부된다" 를 주장하던 5건은 사실 "어떤 토큰이든 거부된다" 만 보였고,
 *       "토큰 없음" 8건과 정보량이 완전히 같았다. 13개 테스트의 실질 정보량은 1개였다.</li>
 *   <li>대상 경로 대부분이 <b>존재하지 않는 엔드포인트</b>였다 — {@code /api/v1/users},
 *       {@code /api/v1/users/admin-action}, {@code /api/v1/users/victim} 은 매핑이 없다.
 *       인증 필터가 먼저 자르므로 404 대신 401 이 나올 뿐, <b>실제 보호 대상을 검증한 적이 없다.</b></li>
 * </ol>
 *
 * <p><b>수정 방향</b> — mock 을 실물로 바꾸지 않고 <b>stubbing 으로 유효/무효를 실제로 가른다</b>.
 * 이 클래스의 고유 가치는 JWT 파싱이 아니라 <b>"provider 가 유효하다고 판정했을 때 통과하고,
 * 무효라고 판정했을 때 401 이 되는가"</b> 라는 결합 계약이다. JWT 파싱·서명 위조·만료·타입 혼동은
 * {@code JwtTokenProviderTest} 가 실 HMAC 으로 19건 검증하므로 여기서 실물을 쓰면 중복이고,
 * 시크릿·시계 의존만 늘어난다.
 *
 * <p><b>양성 대조군이 반드시 있어야 한다.</b> 유효 토큰이 실제로 2xx 를 받는다는 것을 보이지 않으면,
 * 아래 401 들이 "인증이 막았다" 인지 "경로가 원래 죽어 있다" 인지 구분되지 않는다.
 */
class AuthenticationBypassTest extends BaseSecurityTest {

    /** provider 가 유효하다고 판정할 토큰. 값 자체에 의미는 없다 — stubbing 이 판정을 정의한다. */
    private static final String VALID_TOKEN = "valid.jwt.token";

    /** 보호된 실존 엔드포인트(@Authenticated). 매핑이 실재하는지 확인하고 골랐다. */
    private static final String PROTECTED_PATH = "/api/v1/users/me";

    /** 관리자 전용 실존 엔드포인트. SecurityTestConfig 가 /api/v1/admin/** 에 hasRole(ADMIN) 을 건다. */
    private static final String ADMIN_PATH = "/api/v1/admin/system/users";

    @BeforeEach
    void stubTokenContract() {
        // Authorization 헤더에서 Bearer 토큰을 뽑는 실제 규약을 mock 에 심는다.
        // 이것이 있어야 "Bearer 접두사 없음"·"빈 헤더"·"커스텀 헤더" 같은 케이스가 서로 달라진다.
        when(jwtTokenProvider.resolveToken(any(HttpServletRequest.class))).thenAnswer(inv -> {
            HttpServletRequest req = inv.getArgument(0);
            String header = req.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                return header.substring(7);
            }
            return null;
        });
        // 유효/무효를 실제로 가른다. 이 두 줄이 없으면 모든 토큰이 동일하게 거부되어 정보량이 0이 된다.
        when(jwtTokenProvider.validateToken(anyString())).thenReturn(false);
        when(jwtTokenProvider.validateToken(eq(VALID_TOKEN))).thenReturn(true);
        // principal 은 CustomUserDetails 여야 한다 — @LoginUser 아규먼트 리졸버가 그 타입을 주입하므로,
        // String principal 을 넣으면 핸들러가 null 을 받아 대조군이 엉뚱한 이유로 깨진다.
        nuri.foundation.security.service.CustomUserDetails principal =
                nuri.foundation.security.service.CustomUserDetails.builder()
                        .userId("testuser01")
                        .esntlId("USR0000001")
                        .userNm("테스트사용자")
                        .roleName("USER")
                        .build();
        when(jwtTokenProvider.getAuthentication(eq(VALID_TOKEN))).thenReturn(
                new UsernamePasswordAuthenticationToken(
                        principal, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
    }

    // ────────────────────────────────────────────────────────────────────────
    // [대조군] 이것이 red 면 아래 401 들은 "인증이 막았다" 를 증명하지 못한다.
    // ────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("[대조군] provider 가 유효하다고 판정한 토큰은 보호된 엔드포인트를 통과한다")
    void validToken_toProtectedEndpoint_isNotRejected() throws Exception {
        mockMvc.perform(get(PROTECTED_PATH)
                        .header("Authorization", "Bearer " + VALID_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    // ────────────────────────────────────────────────────────────────────────
    // [1] 자격증명 부재 — 인증 관문 자체
    // ────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("토큰 없이 보호된 엔드포인트 접근 시 401")
    void noToken_toProtectedEndpoint_returns401() throws Exception {
        mockMvc.perform(get(PROTECTED_PATH).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("토큰 없이 관리자 엔드포인트 접근 시 401")
    void noToken_toAdminEndpoint_returns401() throws Exception {
        mockMvc.perform(get(ADMIN_PATH).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("토큰 없이 관리자 쓰기(생성/수정/삭제) 시도 시 401")
    void noToken_toAdminWriteEndpoints_returns401() throws Exception {
        String body = """
                { "userId": "attacker", "userNm": "공격자" }
                """;

        mockMvc.perform(post(ADMIN_PATH).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put(ADMIN_PATH + "/victim").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete(ADMIN_PATH + "/victim").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    // ────────────────────────────────────────────────────────────────────────
    // [2] 자격증명은 있으나 무효 — 대조군과 갈리는 축이다
    // ────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("provider 가 무효라고 판정한 토큰은 401 (대조군과 같은 경로·같은 형식인데 결과가 갈린다)")
    void invalidToken_toProtectedEndpoint_returns401() throws Exception {
        mockMvc.perform(get(PROTECTED_PATH)
                        .header("Authorization", "Bearer invalid.token.here")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("서명이 조작된 만료 토큰은 401")
    void tamperedExpiredToken_toProtectedEndpoint_returns401() throws Exception {
        String expired = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
                + ".eyJzdWIiOiJ0ZXN0VXNlciIsImV4cCI6MTUwMDAwMDB9.someInvalidSignature";

        mockMvc.perform(get(PROTECTED_PATH)
                        .header("Authorization", "Bearer " + expired)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    // ────────────────────────────────────────────────────────────────────────
    // [3] 자격증명 전달 경로 — Bearer 헤더 외의 통로는 인정되지 않아야 한다
    //     stubbing 이 Bearer 규약을 심었으므로, 아래는 실제로 "다른 통로는 안 먹는다" 를 증명한다.
    // ────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("Bearer 접두사 없는 토큰은 인정되지 않는다 — 값이 유효 토큰이어도 401")
    void tokenWithoutBearerPrefix_isNotAccepted() throws Exception {
        mockMvc.perform(get(PROTECTED_PATH)
                        .header("Authorization", VALID_TOKEN)   // 접두사만 뺀 유효 토큰
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("빈 Authorization 헤더는 401")
    void emptyAuthHeader_returns401() throws Exception {
        mockMvc.perform(get(PROTECTED_PATH)
                        .header("Authorization", "")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("쿠키로 전달된 토큰은 인정되지 않는다 — 값이 유효 토큰이어도 401")
    void tokenViaCookie_isNotAccepted() throws Exception {
        mockMvc.perform(get(PROTECTED_PATH)
                        .cookie(new jakarta.servlet.http.Cookie("Authorization", "Bearer " + VALID_TOKEN))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("커스텀 헤더로 전달된 토큰은 인정되지 않는다 — 값이 유효 토큰이어도 401")
    void tokenInCustomHeader_isNotAccepted() throws Exception {
        mockMvc.perform(get(PROTECTED_PATH)
                        .header("X-Custom-Auth", "Bearer " + VALID_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
