package nuri.security;

import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.iam.CustomUserDetailsService;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 🧭 요청 매처의 <b>경계 의미</b>를 현행 기준으로 동결한다.
 *
 * <p><b>왜 필요한가.</b> {@code ApiSecurityConfig} 는 {@code AntPathRequestMatcher} 를 37개소에서 쓰는데,
 * 이 클래스는 Spring Security 6.5 에서 <b>제거 예정</b>으로 표시됐다(Boot 3.5 동반).
 * 대체재인 {@code PathPatternRequestMatcher} 는 <b>매칭 의미가 완전히 같지 않다</b> —
 * 후행 슬래시 처리와 경로 파라미터 해석이 갈린다. 그런데 그 차이는 <b>조용하다</b>:
 * 컴파일도 되고 기존 테스트도 대부분 통과하는데 특정 경로의 인가만 달라진다.
 *
 * <p>그래서 전환 <b>전에</b> 현행 거동을 못 박는다. 이 테스트가 red 가 되면
 * "매처를 바꾸면서 인가 경계가 움직였다" 는 뜻이다.
 *
 * <p><b>무엇을 고정하나</b> — Ant ↔ PathPattern 이 실제로 갈릴 수 있는 축만 좁게 겨냥한다.
 * <ol>
 *   <li><b>후행 슬래시</b>: {@code /api/v1/admin/system/users/} 가 여전히 secure-path 로 판정되는가</li>
 *   <li><b>접두 경계</b>: {@code /api/v1/adminX} 가 {@code /api/v1/admin/**} 에 <b>매칭되지 않는가</b>
 *       (부분 문자열을 접두로 오인하면 무관한 경로가 관리자 인가를 요구하게 된다)</li>
 *   <li><b>필터체인 선택</b>: {@code securityMatcher("/api/v1/**","/actuator/**")} 밖의 경로가
 *       legacy 체인(@Order 2)으로 가는가 — 체인이 바뀌면 인가 규칙 전체가 바뀐다</li>
 * </ol>
 *
 * <p>인가 <i>정책</i>(누가 무엇에 접근하는가)은 {@link RbacAuthorizationMatrixTest} 가 이미 덮는다.
 * 여기서는 <b>매처가 어디까지를 그 정책의 사정권으로 보는가</b>만 본다.
 */
@SpringBootTest(
        classes = nuri.ApiServerApplication.class,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:matcher_boundary_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "rbac.db-auth.enabled=false",
                "rbac.shadow.enabled=false"
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class RequestMatcherBoundaryTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    private static CustomUserDetails normalUser() {
        return CustomUserDetails.builder()
                .userId("user_test")
                .esntlId("USR_001")
                .userNm("테스트유저")
                .roleName("USER")
                .authorCode("ROLE_USER")
                .build();
    }

    @Test
    @DisplayName("🧭 경계① 관리자 경로는 후행 슬래시가 붙어도 여전히 차단된다 (USER → 403)")
    void adminPath_withTrailingSlash_isStillForbiddenForNormalUser() throws Exception {
        // rbac.db-auth 를 끈 상태이므로 하드코딩 분기(/api/v1/admin/** → ADMIN/SYSTEM)가 판정한다.
        // 후행 슬래시가 붙었다고 이 경계가 뚫리면 안 된다.
        mockMvc.perform(get("/api/v1/admin/system/users/")
                        .with(user(normalUser()))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("🧭 경계① 관리자 경로는 후행 슬래시가 붙어도 익명에게 401 이다")
    void adminPath_withTrailingSlash_stillRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/admin/system/users/")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("🧭 경계② '/api/v1/adminX' 는 '/api/v1/admin/**' 의 부분 문자열일 뿐 매칭 대상이 아니다")
    void adminPrefix_isNotMatchedBySubstring() throws Exception {
        // 관리자 경계가 부분 문자열로 번지면 무관한 경로가 ADMIN 을 요구하게 된다.
        // 존재하지 않는 경로라 404 여야 하며, 403(관리자 인가 요구)이면 매처가 과잉 매칭한 것이다.
        mockMvc.perform(get("/api/v1/adminX")
                        .with(user(normalUser()))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().is(org.hamcrest.Matchers.not(403)));
    }

    @Test
    @DisplayName("🧭 경계③ securityMatcher 밖의 경로는 legacy 체인이 처리한다 (익명 정적 리소스 401 아님)")
    void nonApiPath_isHandledByLegacyChain() throws Exception {
        // /index.jsp 는 @Order(1) 체인의 securityMatcher("/api/v1/**","/actuator/**") 밖이므로
        // @Order(2) legacy 체인이 받고, 그 체인은 이 경로를 permitAll 한다.
        // 401 이 나오면 체인 선택이 바뀐 것이다 — 매처 전환이 가장 크게 깨뜨릴 수 있는 지점이다.
        mockMvc.perform(get("/index.jsp"))
                .andExpect(status().is(org.hamcrest.Matchers.not(401)));
    }

    @Test
    @DisplayName("🧭 WebSocket SockJS 핸드셰이크는 익명 접근을 허용하지 않는다")
    void websocketHandshake_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/ws/info"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("🧭 인증된 사용자의 SockJS 핸드셰이크만 WebSocket 핸들러에 도달한다")
    void websocketHandshake_acceptsAuthenticatedUser() throws Exception {
        mockMvc.perform(get("/ws/info").with(user(normalUser())))
                .andExpect(status().isOk());
    }
}
