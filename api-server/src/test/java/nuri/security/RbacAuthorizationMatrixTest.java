package nuri.security;

import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.iam.CustomUserDetailsService;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = nuri.ApiServerApplication.class,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:rbac_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "rbac.shadow.enabled=true",
                "rbac.db-auth.enabled=true",
                "rbac.db-auth.secure-paths=/api/v1/admin/**,/actuator/**,/api/v1/surveys,/api/v1/surveys/**,/api/v1/main-images,/api/v1/main-images/**,/api/v1/help,/api/v1/help/**,/api/v1/calendar/holidays,/api/v1/calendar/holidays/**"
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class RbacAuthorizationMatrixTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    private static final List<String> SECURE_TEST_PATHS = List.of(
            "/api/v1/admin/system/users",
            "/api/v1/surveys",
            "/api/v1/main-images",
            "/api/v1/help",
            "/api/v1/calendar/holidays"
    );

    @BeforeEach
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

        // 3. tb_prgrm_lst 시드 (어드민 경로 및 6개 별칭 경로 전수 시드)
        jdbcTemplate.execute("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url) VALUES ('ADMIN_USERS', '사용자관리', '/api/v1/admin/system/users')");
        jdbcTemplate.execute("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url) VALUES ('ADMIN_SURVEYS', '설문관리', '/api/v1/surveys')");
        jdbcTemplate.execute("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url) VALUES ('ADMIN_IMAGE', '이미지관리', '/api/v1/main-images')");
        jdbcTemplate.execute("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url) VALUES ('ADMIN_HELP', '도움말관리', '/api/v1/help')");
        jdbcTemplate.execute("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url) VALUES ('ADMIN_RESTDE', '공휴일관리', '/api/v1/calendar/holidays')");

        // 4. tb_role_prgrm_map 시드
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_ADMIN', 'ADMIN_USERS')");
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_SYSTEM', 'ADMIN_USERS')");

        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_ADMIN', 'ADMIN_SURVEYS')");
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_SYSTEM', 'ADMIN_SURVEYS')");


        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_ADMIN', 'ADMIN_IMAGE')");
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_SYSTEM', 'ADMIN_IMAGE')");

        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_ADMIN', 'ADMIN_HELP')");
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_SYSTEM', 'ADMIN_HELP')");


        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_ADMIN', 'ADMIN_RESTDE')");
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_SYSTEM', 'ADMIN_RESTDE')");
    }

    @Test
    @DisplayName("DB 인가 다차원 매트릭스 검증 - ADMIN 권한 보유 시 모든 어드민/별칭 API 통과")
    void dbAuth_shouldAllow_allSecurePaths_forAdminUser() throws Exception {
        CustomUserDetails mockAdmin = CustomUserDetails.builder()
                .userId("admin_test")
                .esntlId("USR_999")
                .userNm("테스트어드민")
                .roleName("ADMIN")
                .authorCode("ROLE_ADMIN")
                .build();

        for (String path : SECURE_TEST_PATHS) {
            // [W1-04 단언 강화] 종전에는 not(403) 하나뿐이라 401 도, 500 도 '통과' 로 계상됐다.
            //   즉 인가가 아니라 '403이 아님' 만 검증했고, 엔드포인트가 터져도 초록이었다.
            //   세 단언으로 분리해 실패 시 무엇이 틀렸는지가 메시지로 드러나게 한다.
            //   ⚠ 정확한 기대 상태코드(200/404 등)로 못 박지 않는 이유: 이 테스트는 H2 + create-drop 이라
            //     데이터가 0행이고 경로마다 200/404 가 갈린다. 실측 없이 핀으로 박으면 거짓 red 가 된다.
            //     대신 '인가 통과(403·401 아님)' + '터지지 않음(5xx 아님)' 을 고정한다.
            mockMvc.perform(get(path)
                            .with(user(mockAdmin))
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().is(org.hamcrest.Matchers.not(403)))
                    .andExpect(status().is(org.hamcrest.Matchers.not(401)))
                    .andExpect(status().is(org.hamcrest.Matchers.lessThan(500)));
        }
    }

    @Test
    @DisplayName("DB 인가 다차원 매트릭스 검증 - 일반 USER 권한 보유 시 모든 어드민/별칭 API 차단")
    void dbAuth_shouldForbidden_allSecurePaths_forNormalUser() throws Exception {
        CustomUserDetails mockUser = CustomUserDetails.builder()
                .userId("user_test")
                .esntlId("USR_001")
                .userNm("테스트유저")
                .roleName("USER")
                .authorCode("ROLE_USER")
                .build();

        for (String path : SECURE_TEST_PATHS) {
            mockMvc.perform(get(path)
                            .with(user(mockUser))
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    @DisplayName("DB 인가 다차원 매트릭스 검증 - 인증 정보 유실 시 모든 어드민/별칭 API 401 차단")
    void dbAuth_shouldRequireAuthentication_allSecurePaths_forAnonymous() throws Exception {
        for (String path : SECURE_TEST_PATHS) {
            mockMvc.perform(get(path)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isUnauthorized());
        }
    }
}
