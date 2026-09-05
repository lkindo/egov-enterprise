package nuri.api.config;

import nuri.business.security.iam.EgovAuthenticationProvider;
import nuri.foundation.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import nuri.business.security.annotation.WithMockCustomUser;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import nuri.api.controller.UserApiController;
import nuri.business.service.user.UserService;
import org.springframework.data.domain.PageImpl;
import java.util.Collections;
import nuri.api.interceptor.OperationalAuditInterceptor;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(controllers = UserApiController.class)
@ActiveProfiles({ "test", "security-test" })
// ClientIpResolver 를 함께 싣는 이유: 이 슬라이스가 로드하는 RateLimitFilter 가 그것을 생성자 주입한다.
//   @WebMvcTest 는 컴포넌트 스캔이 제한적이라 foundation 의 @Component 가 자동으로 오지 않아
//   컨텍스트 로딩이 통째로 실패했다(W1-07 에서 XFF 신뢰 판정을 통합하며 생긴 회귀).
//   @MockitoBean 으로 대체하지 말 것 — 신뢰 경계 판정이 사라져 필터의 보안 계약이 무의미해진다.
@ContextConfiguration(classes = { ApiSecurityConfig.class, nuri.foundation.security.net.ClientIpResolver.class })
@DisplayName("ApiSecurityConfig 설정 테스트")
public class ApiSecurityConfigTest extends ControllerTestSupport {

    @MockitoBean
    private EgovAuthenticationProvider egovAuthenticationProvider;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private OperationalAuditInterceptor operationalAuditInterceptor;

    @Autowired(required = false)
    private PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private SecurityFilterChain apiSecurityFilterChain;

    @Autowired(required = false)
    private AuthenticationManager authenticationManager;

    @Test
    @DisplayName("보안 빈들 로드 확인")
    void securityBeansLoadedTest() {
        assertThat(passwordEncoder).isNotNull();
        assertThat(apiSecurityFilterChain).isNotNull();
        assertThat(authenticationManager).isNotNull();
    }

    @Test
    @DisplayName("공개 API 엔드포인트 - 인증 없이 접근 가능")
    void publicEndpointsTest() throws Exception {
        // [A-1] 종전에는 not(401)/not(403) 뿐이라 서버가 500 을 뱉어도 "공개 접근 가능" 으로 통과했다.
        //   500 상한을 함께 걸어야 "인가가 막지 않았다" 와 "엔드포인트가 살아 있다" 가 동시에 증명된다.
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isNotEqualTo(401);
                    assertThat(status).isNotEqualTo(403);
                    assertThat(status).withFailMessage("공개 엔드포인트가 5xx 를 반환했다: %d", status)
                                      .isLessThan(500);
                });

        mockMvc.perform(get("/api/v1/auth/login"))
                .andDo(print())
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).withFailMessage("Expected status not to be 401 but was 401 for /api/v1/auth/login")
                                      .isNotEqualTo(401);
                    assertThat(status).isNotEqualTo(403);
                    assertThat(status).withFailMessage("공개 엔드포인트가 5xx 를 반환했다: %d", status)
                                      .isLessThan(500);
                });
    }

    @Test
    @DisplayName("미인증 사용자 접근 - 401 반환")
    void unauthorizedAccessTest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/system/users"))
                .andExpect(status().isUnauthorized());

        verify(operationalAuditInterceptor).publishSecurityFailure(any(), eq(401));
    }

    @Test
    @DisplayName("자격증명 query 이름은 컨트롤러 도달 전에 400으로 차단한다")
    void credentialQueryNameRejectedByActiveSecurityChain() throws Exception {
        String marker = "DO-NOT-ECHO-active-chain-3b8e";

        var result = mockMvc.perform(get("/api/v1/health").queryParam("pswd", marker))
                .andExpect(status().isBadRequest())
                .andReturn();

        assertThat(result.getResponse().getContentAsString()).doesNotContain(marker);
    }

    @Test
    @DisplayName("legacy 체인도 자격증명 query 이름을 400으로 차단한다")
    void credentialQueryNameRejectedByLegacySecurityChain() throws Exception {
        mockMvc.perform(get("/").queryParam("pswd", "legacy-chain-marker"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser(role = "USER")
    @DisplayName("일반 사용자 권한 - 관리자 API 접근 - 403 반환")
    void forbiddenAccessTest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/system/users"))
                .andExpect(status().isForbidden());

        verify(operationalAuditInterceptor).publishSecurityFailure(any(), eq(403));
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("관리자 권한 - 관리자 API 접근 - 성공")
    void adminAccessTest() throws Exception {
        // [A-1] OperationalAuditInterceptor 는 @MockitoBean 이라 preHandle 이 기본값 false 를 반환한다.
        //   그러면 핸들러가 단락되어 "빈 본문 200" 이 나오고, status().isOk() 만으로는 그것과
        //   진짜 성공을 구분할 수 없다(when(...getPagedUserList) 스텁도 死스텁이 된다).
        //   인터셉터를 통과시키고 본문까지 단언해야 실제로 핸들러가 돌았음이 증명된다.
        when(operationalAuditInterceptor.preHandle(any(), any(), any())).thenReturn(true);
        when(userService.getPagedUserList(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/admin/system/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    /**
     * 운영 보안 응답 헤더 검증. [A-1]
     *
     * <p>이 검증이 <b>여기에</b> 있는 이유: 전신 {@code nuri.security.SecurityHeadersTest} 는 메서드 본문이
     * 통째로 비어 있었고(실행문 0개), 게다가 {@code @IntegrationTest} 라 {@code TestApplication} +
     * {@code TestSecurityConfig} 를 부팅해 <b>{@code ApiSecurityConfig} 를 아예 로드하지 않았다</b>.
     * 그 컨텍스트에 헤더 단언을 넣었다면 운영과 무관한 설정을 검증하는 완전한 false-green 이 됐을 것이다.
     * 이 클래스는 {@code @ContextConfiguration(classes = ApiSecurityConfig.class)} 로 운영 설정을 직접
     * 로드하는 유일한 지점이라, 헤더를 실증할 수 있는 곳은 여기뿐이다.
     *
     * <p><b>판별력 고지</b> — 아래 단언 중 {@code X-Content-Type-Options: nosniff} 는 Spring Security
     * <b>기본값의 재진술</b>이라 {@code .contentTypeOptions()} 를 지워도 red 가 되지 않는다(회귀 감지력 없음).
     * 판별력이 있는 것은 설정으로 기본값을 바꾼 4개다: {@code frameOptions}(기본 DENY → SAMEORIGIN),
     * {@code X-XSS-Protection}(기본 0 → 1; mode=block), HSTS {@code preload}(기본 false → true),
     * {@code Referrer-Policy}(기본 no-referrer → strict-origin-when-cross-origin).
     */
    @Test
    @DisplayName("운영 보안 응답 헤더 - ApiSecurityConfig 가 설정한 값이 실제 응답에 실린다")
    void securityResponseHeadersTest() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                // 기본 DENY 를 SAMEORIGIN 으로 바꾼 설정값
                .andExpect(header().string("X-Frame-Options", "SAMEORIGIN"))
                // Spring Security 6 기본은 "0"(비활성) — ENABLED_MODE_BLOCK 설정이 살아있어야 한다
                .andExpect(header().string("X-XSS-Protection", "1; mode=block"))
                // 기본 no-referrer 를 바꾼 설정값
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                // 아래는 프레임워크 기본값 재진술 — 회귀 감지력이 없음을 알고 둔다(위 javadoc 참조)
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                // HSTS 는 HTTPS 요청에만 실린다(아래 테스트 참조). 평문 요청에 실리면 오히려 설정 오류다.
                .andExpect(header().doesNotExist("Strict-Transport-Security"));
    }

    @Test
    @DisplayName("운영 보안 응답 헤더 - HSTS 는 HTTPS 요청에만 실린다")
    void hstsHeaderOnSecureRequestTest() throws Exception {
        // Spring Security 의 HstsHeaderWriter 는 기본 RequestMatcher 가 `secure == true` 라
        // 평문 요청에는 HSTS 를 쓰지 않는다. 이것은 결함이 아니라 정상 동작이므로,
        // 검증도 HTTPS 요청으로 해야 한다. (이 사실을 모르고 평문으로 단언하면
        // "헤더가 없다" 는 결과를 설정 누락으로 오진하게 된다 — 실제로 그렇게 한 번 red 가 났다.)
        mockMvc.perform(get("/api/v1/health").secure(true))
                // preload 는 기본 false 라 이 단언이 HSTS 3속성 중 유일한 판별 축이다.
                // 나머지 둘(max-age=31536000·includeSubDomains)은 HstsHeaderWriter 기본값과 같아
                // 설정에서 지워도 red 가 되지 않는다 — 회귀 감지력이 없음을 알고 둔다.
                .andExpect(header().string("Strict-Transport-Security", containsString("preload")))
                .andExpect(header().string("Strict-Transport-Security", containsString("max-age=31536000")))
                .andExpect(header().string("Strict-Transport-Security", containsString("includeSubDomains")));
    }

    @Test
    @DisplayName("CORS 설정 확인 - OPTIONS 요청 - 허용 헤더 반환")
    void corsConfigurationTest() throws Exception {
        mockMvc.perform(options("/api/v1/users/signup")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Access-Control-Allow-Origin"))
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }
}
