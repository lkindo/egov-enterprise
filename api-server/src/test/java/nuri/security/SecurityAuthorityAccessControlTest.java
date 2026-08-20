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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

        // When & Then: 어드민 API 접근 시 인가를 통과하는지 검증.
        // [W1-04 단언 강화] 종전에는 not(403) 하나뿐이라 401 도, 500 도 '통과' 로 계상됐다 —
        //   즉 '인가됨' 이 아니라 '403이 아님' 만 확인했고 엔드포인트가 터져도 초록이었다.
        //   '인가 통과(403·401 아님)' + '터지지 않음(5xx 아님)' 으로 분리해 고정한다.
        mockMvc.perform(get("/api/v1/admin/menus")
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

    @Test
    @DisplayName("보안 검증 - [DEC-OPS-010] 설문 alias: USER 열람은 200, 관리 뮤테이션은 403 (메서드 인가가 단독 방어선)")
    void surveyAlias_readOpen_mutationForbidden_forNormalUser() throws Exception {
        // [2026-08-20 DEC-OPS-010 개정] 종전 이 테스트는 GET /api/v1/surveys 의 403 을 단언했다.
        //   그때의 방어는 W1-04 주석이 스스로 밝혔듯 **secure-paths URL 게이트 1겹뿐**이었다
        //   (SurveyApiController 에 메서드 인가가 하나도 없었다).
        //   제품 결정으로 설문 열람·제출이 일반 개방되면서 그 게이트는 V2_84 로 제거됐고,
        //   방어는 **메서드 인가**(@Authenticated / @AdminOrSystem)로 이동했다. 이 테스트는 이제
        //   그 새 의미를 양방향으로 고정한다 — 열람이 막히면(red) 제품 회귀이고,
        //   뮤테이션이 뚫리면(red) 인가 회귀다.
        CustomUserDetails normalUser = CustomUserDetails.builder()
                .userId("normal_user")
                .esntlId("USR_001")
                .userNm("일반사용자")
                .roleName("USER")
                .build();

        // ① 열람 개방: 일반 USER 의 목록 조회는 200 이어야 한다 (@Authenticated).
        mockMvc.perform(get("/api/v1/surveys")
                        .with(user(normalUser))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // ② 관리 차단: 별칭 경로의 관리 뮤테이션은 @AdminOrSystem 이 단독 방어선이다.
        //    DELETE 는 @Valid 본문이 없어 400 개입 없이 순수 인가(403)를 관찰할 수 있다.
        mockMvc.perform(delete("/api/v1/surveys/{srvySn}", 999999L)
                        .with(user(normalUser))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}
