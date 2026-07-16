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
                "rbac.shadow.enabled=true",
                "rbac.db-auth.enabled=true"
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class SecurityAuthorityAccessControlTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        // H2 테스트 데이터베이스의 인가 매핑 기초 데이터 초기화 및 멱등 시드
        jdbcTemplate.execute("DELETE FROM tb_role_prgrm_map");
        jdbcTemplate.execute("DELETE FROM tb_prgrm_lst");
        jdbcTemplate.execute("DELETE FROM tb_authrt_role_map");
        jdbcTemplate.execute("DELETE FROM tb_authrt_info");
        jdbcTemplate.execute("DELETE FROM tb_role_info");

        // 1. 마스터 테이블 시드
        jdbcTemplate.execute("INSERT INTO tb_authrt_info (authrt_cd, authrt_nm) VALUES ('ROLE_ADMIN', '관리자권한')");
        jdbcTemplate.execute("INSERT INTO tb_authrt_info (authrt_cd, authrt_nm) VALUES ('ROLE_SYSTEM', '시스템권한')");
        jdbcTemplate.execute("INSERT INTO tb_authrt_info (authrt_cd, authrt_nm) VALUES ('ROLE_USER', '사용자권한')");

        jdbcTemplate.execute("INSERT INTO tb_role_info (role_id, role_nm) VALUES ('ROLE_ADMIN', '관리자역할')");
        jdbcTemplate.execute("INSERT INTO tb_role_info (role_id, role_nm) VALUES ('ROLE_SYSTEM', '시스템역할')");
        jdbcTemplate.execute("INSERT INTO tb_role_info (role_id, role_nm) VALUES ('ROLE_USER', '사용자역할')");

        // 2. tb_authrt_role_map 매핑 시드
        jdbcTemplate.execute("INSERT INTO tb_authrt_role_map (authrt_cd, role_cd) VALUES ('ROLE_ADMIN', 'ROLE_ADMIN')");
        jdbcTemplate.execute("INSERT INTO tb_authrt_role_map (authrt_cd, role_cd) VALUES ('ROLE_SYSTEM', 'ROLE_SYSTEM')");
        jdbcTemplate.execute("INSERT INTO tb_authrt_role_map (authrt_cd, role_cd) VALUES ('ROLE_USER', 'ROLE_USER')");

        // 3. tb_prgrm_lst 시드 (어드민 메뉴 목록 및 설문 별칭)
        jdbcTemplate.execute("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url) VALUES ('ADMIN_MENUS', '어드민 메뉴 조회', '/api/v1/admin/menus')");
        jdbcTemplate.execute("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url) VALUES ('ADMIN_SURVEYS', '설문 별칭 조회', '/api/v1/surveys')");

        // 4. tb_role_prgrm_map 시드
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_ADMIN', 'ADMIN_MENUS')");
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_SYSTEM', 'ADMIN_MENUS')");
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_ADMIN', 'ADMIN_SURVEYS')");
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_SYSTEM', 'ADMIN_SURVEYS')");
    }

    @Test
    @DisplayName("보안 검증 - ADMIN 권한이 없는 일반 USER 사용자가 어드민 메뉴 목록 강제 접근 시 403 Forbidden 차단 보증")
    void adminResource_shouldBeForbidden_forNormalUser() throws Exception {
        // Given: 일반 사용자(USER) 권한을 지닌 모의 유저 정보 준비
        CustomUserDetails mockUser = CustomUserDetails.builder()
                .userId("normal_user")
                .esntlId("USR_001")
                .userNm("일반사용자")
                .roleName("USER") // 💥 USER 권한만 가짐
                .build();

        // When & Then: 어드민 메뉴 목록 API 강제 접근 요청 시 403 Forbidden 발생 보증
        mockMvc.perform(get("/api/v1/admin/menus")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("보안 검증 - ADMIN 권한을 가진 어드민 사용자가 어드민 메뉴 목록 접근 시 정상 통과 처리")
    void adminResource_shouldBeAllowed_forAdminUser() throws Exception {
        // Given: 어드민(ADMIN) 권한을 지닌 모의 유저 정보 준비
        CustomUserDetails mockAdmin = CustomUserDetails.builder()
                .userId("admin_user")
                .esntlId("USR_999")
                .userNm("관리자")
                .roleName("ADMIN") // 🛡️ ADMIN 권한 가짐
                .build();

        // When & Then: 어드민 메뉴 목록 API 접근 시 권한 검사를 정상 통과(200 OK 등)하는지 검증
        // (단, 여기서는 모킹된 서비스 빈이 있으나 단순 시큐리티 권한 차단을 넘어서는 것이 목적이므로 403 Forbidden만 안 뱉으면 됨)
        mockMvc.perform(get("/api/v1/admin/menus")
                        .with(user(mockAdmin))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().is(org.hamcrest.Matchers.not(403))); // 🛡️ 403 Forbidden이 아님을 검증 (권한 차단 가볍게 통과)
    }

    @Test
    @DisplayName("보안 검증 - 인증 정보가 전혀 없는 익명 사용자가 보안 리소스 조회 요청 시 401 Unauthorized 차단")
    void securedResource_shouldRequireAuthentication_forAnonymous() throws Exception {
        // When & Then: 인증용 JWT 토큰이나 유저 정보 없이 보안이 필요한 회원 내 정보 API(/api/v1/users/me) 접근 시 401 차단
        mockMvc.perform(get("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("보안 검증 - [Phase1 방어심층] 일반 USER가 비-admin alias(/api/v1/surveys)로 관리자 설문 등록 시도 시 403 (URL alias 우회 차단)")
    void surveyAdminAlias_shouldBeForbidden_forNormalUser() throws Exception {
        // Given: 일반 USER. /api/v1/surveys 는 URL admin 규칙(/api/v1/admin/**) 밖이라 URL 인가는 통과하지만,
        //        SurveyApiController의 클래스 레벨 @PreAuthorize(ADMIN/SYSTEM)로 차단되어야 한다(방어심층).
        CustomUserDetails normalUser = CustomUserDetails.builder()
                .userId("normal_user")
                .esntlId("USR_001")
                .userNm("일반사용자")
                .roleName("USER")
                .build();

        // When & Then: alias 경로(GET, @Valid 검증 개입 없음)로 관리자 설문 목록 접근 → @PreAuthorize에 의해 403 Forbidden.
        // (POST는 @Valid(400)가 method-security(403)보다 먼저 평가되므로 순수 인가 검증에는 GET을 사용한다.)
        mockMvc.perform(get("/api/v1/surveys")
                        .with(user(normalUser))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}
