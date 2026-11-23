package nuri.api.config;

import nuri.business.security.authorization.PermissionPolicy;
import nuri.business.service.user.UserService;
import nuri.business.support.ControllerTestSupport;
import nuri.business.security.iam.EgovAuthenticationProvider;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.net.ClientIpResolver;
import nuri.api.controller.UserApiController;
import nuri.api.interceptor.OperationalAuditInterceptor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserApiController.class)
@ContextConfiguration(classes = {
        ApiSecurityConfig.class,
        ClientIpResolver.class,
        PermissionPolicy.class
})
@ActiveProfiles({ "test", "security-test", "prod" })
@TestPropertySource(properties = {
        "jwt.cookie.secure=true",
        "springdoc.api-docs.enabled=true"
})
@DisplayName("prod 프로파일 legacySecurityFilterChain · API CSP 하드닝 통합 테스트")
class LegacySecurityFilterChainProdTest extends ControllerTestSupport {

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private EgovAuthenticationProvider egovAuthenticationProvider;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private OperationalAuditInterceptor operationalAuditInterceptor;

    @Test
    @DisplayName("prod 에서 /v3/api-docs 는 미인증 401, OPS_READ 미보유 403, OPS_READ Bearer JWT 는 보안 필터(401/403)를 통과한다")
    void prodDocsEndpointRequiresOpsReadViaJwtAuthenticationFilter() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))
                .andExpect(header().string("Cross-Origin-Resource-Policy", "same-origin"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "SAMEORIGIN"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"));

        given(jwtTokenProvider.resolveToken(any())).willAnswer(invocation -> {
            jakarta.servlet.http.HttpServletRequest req = invocation.getArgument(0);
            String auth = req.getHeader("Authorization");
            return auth != null && auth.startsWith("Bearer ") ? auth.substring(7) : null;
        });
        given(jwtTokenProvider.validateToken("user-token")).willReturn(true);
        given(jwtTokenProvider.getAuthentication("user-token")).willReturn(
                new UsernamePasswordAuthenticationToken("user1", "", List.of(new SimpleGrantedAuthority("ROLE_USER"))));
        given(jwtTokenProvider.validateToken("ops-token")).willReturn(true);
        given(jwtTokenProvider.getAuthentication("ops-token")).willReturn(
                new UsernamePasswordAuthenticationToken("ops1", "", List.of(new SimpleGrantedAuthority("OPS_READ"))));

        mockMvc.perform(get("/v3/api-docs").header("Authorization", "Bearer user-token"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v3/api-docs")
                        .header("Authorization", "Bearer ops-token")
                        .secure(true))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotIn(401, 403))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))
                .andExpect(header().string("Strict-Transport-Security", "max-age=31536000 ; includeSubDomains ; preload"));
    }

    @Test
    @DisplayName("API 체인과 레거시 체인 모두 엄격한 CSP 와 Secure+SameSite=Strict XSRF 쿠키 정책을 적용한다")
    void apiChainEmitsCspAndLegacyChainHardensCsrfCookie() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))
                .andExpect(header().string("Cross-Origin-Resource-Policy", "same-origin"));

        mockMvc.perform(post("/v3/api-docs").secure(true))
                .andExpect(status().isForbidden())
                .andExpect(cookie().exists("XSRF-TOKEN"))
                .andExpect(cookie().secure("XSRF-TOKEN", true))
                .andExpect(cookie().sameSite("XSRF-TOKEN", "Strict"));
    }
}
