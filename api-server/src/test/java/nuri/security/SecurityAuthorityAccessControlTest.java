package nuri.security;

import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.iam.CustomUserDetailsService;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 정밀 보안 권한 & API 접근 제어(RBAC) 검증 통합 테스트
 * - 역할 기반 권한 제어(Role-Based Access Control)가 철저히 동작하는지 검증합니다.
 * - 비인가 사용자가 어드민 관리 전용 리소스(/api/v1/admin/**)에 접근 시 403 Forbidden으로 안전하게 차단되는지 증명합니다.
 * - 인증되지 않은 익명 사용자가 보안 리소스 접근 시 401 Unauthorized가 발생하는지 확인합니다.
 */
@SpringBootTest(
        classes = nuri.ApiServerApplication.class,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:security_access_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class SecurityAuthorityAccessControlTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("보안 검증 - ADMIN 권한이 없는 일반 USER 사용자가 어드민 메뉴 목록 강제 접근 시 403 Forbidden 차단 보증")
    void adminResource_shouldBeForbidden_forNormalUser() throws Exception {
        // Given: 일반 사용자(USER) 권한을 지닌 모의 유저 정보 준비
        CustomUserDetails mockUser = nuri.business.support.AuthorizationTestPrincipal.principal("normal_user", "USR_001", "USER");

        // When & Then: 어드민 메뉴 목록 API 강제 접근 요청 시 403 Forbidden 발생 보증
        mockMvc.perform(get("/api/v1/admin/system/menus")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("보안 검증 - ADMIN 권한을 가진 어드민 사용자가 어드민 메뉴 목록 접근 시 정상 통과 처리")
    void adminResource_shouldBeAllowed_forAdminUser() throws Exception {
        // Given: 어드민(ADMIN) 권한을 지닌 모의 유저 정보 준비
        CustomUserDetails mockAdmin = nuri.business.support.AuthorizationTestPrincipal.principal("admin_user", "USR_999", "ADMIN");

        // When & Then: 어드민 API 접근 시 인가를 통과하는지 검증.
        // [W1-04 단언 강화] 종전에는 not(403) 하나뿐이라 401 도, 500 도 '통과' 로 계상됐다 —
        //   즉 '인가됨' 이 아니라 '403이 아님' 만 확인했고 엔드포인트가 터져도 초록이었다.
        //   '인가 통과(403·401 아님)' + '터지지 않음(5xx 아님)' 으로 분리해 고정한다.
        mockMvc.perform(get("/api/v1/admin/system/menus")
                        .with(user(mockAdmin))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().is(org.hamcrest.Matchers.not(403)))
                .andExpect(status().is(org.hamcrest.Matchers.not(401)))
                .andExpect(status().is(org.hamcrest.Matchers.lessThan(500)));
    }

    @Test
    @DisplayName("보안 검증 - 인증 정보가 전혀 없는 익명 사용자가 보안 리소스 조회 요청 시 401 Unauthorized 차단")
    void securedResource_shouldRequireAuthentication_forAnonymous() throws Exception {
        // When & Then: 인증용 JWT 토큰이나 유저 정보 없이 보안이 필요한 회원 내 정보 API(/api/v1/users/me) 접근 시 401 차단
        mockMvc.perform(get("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    // [DEC-OPS-010] 설문 별칭 인가 단언은 SurveyAliasAccessControlTest 로 옮겼다(Phase 2 D6) — 설문 컨트롤러를 참조해
    //   설문을 고르지 않은 생성물에서 함께 빠진다. 여기 두면 설문이 없는 생성물에서 404 로 처음부터 붉었다.
}
