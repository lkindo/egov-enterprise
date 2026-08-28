package nuri.api.controller.foundation.controller.system.login;

import nuri.foundation.security.iam.CustomUserDetailsService;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 로그인 정책 API 의 <b>메서드 인가</b>가 URL 게이트와 독립적으로 동작하는지 검증한다.
 *
 * <p><b>왜 필요한가.</b> 이 컨트롤러는 5개 엔드포인트 어디에도 메서드 인가가 없었고
 * URL 게이트({@code /api/v1/admin/**} → {@code ADMIN_ALL}) 한 겹에만 의존했다. 그 매핑 한 줄이
 * 빠지면 접속 IP 제한·허용 시간대·2단계 인증(OTP) 설정이 함께 열린다.
 *
 * <p><b>URL 게이트를 일부러 더 넓게 열어 두고 판정한다.</b> 운영 시드대로 두면 그 축이 먼저 막아
 * 메서드 인가의 유무를 구분할 수 없다 — 그러면 이 테스트는 아무것도 증명하지 못한다. 반대로
 * 게이트를 <b>비우면</b> {@code DbUrlAuthorizationManager} 가 fail-closed 라 관리자까지 403 이 되어
 * 역시 구분이 안 된다(실측). 그래서 {@code ADMIN_ALL} 에 ROLE_USER 까지 매핑해 <b>일반 사용자가
 * URL 축을 통과하게</b> 만든 뒤, 남은 방어선이 실제로 막는지를 본다. 이 ROLE_USER 매핑은 이 테스트
 * 전용이며 운영 시드(V2_11)에는 없다.
 */
@SpringBootTest(
        classes = nuri.ApiServerApplication.class,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:login_policy_authz_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "rbac.shadow.enabled=true",
                "rbac.db-auth.enabled=true"
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class LoginPolicyMethodAuthorizationTest {

    private static final String LIST_URL = "/api/v1/admin/system/login-policies";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void widenUrlGateSoMethodSecurityIsTheOnlyJudge() {
        jdbcTemplate.execute("DELETE FROM tb_role_prgrm_map");
        jdbcTemplate.execute("DELETE FROM tb_prgrm_lst");
        jdbcTemplate.execute("DELETE FROM tb_authrt_role_map");
        jdbcTemplate.execute("DELETE FROM tb_authrt_info");
        jdbcTemplate.execute("DELETE FROM tb_role_info");

        for (String role : new String[]{"ROLE_ADMIN", "ROLE_SYSTEM", "ROLE_USER"}) {
            jdbcTemplate.update("INSERT INTO tb_authrt_info (authrt_cd, authrt_nm) VALUES (?, ?)", role, role);
            jdbcTemplate.update("INSERT INTO tb_role_info (role_id, role_nm) VALUES (?, ?)", role, role);
            jdbcTemplate.update("INSERT INTO tb_authrt_role_map (authrt_cd, role_cd) VALUES (?, ?)", role, role);
        }

        jdbcTemplate.execute("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url) "
                + "VALUES ('ADMIN_ALL', '관리자 전체', '/api/v1/admin/**')");
        // ⚠ ROLE_USER 매핑은 **이 테스트 전용**이다(운영 시드에는 없다). 일반 사용자를 URL 축에
        //    통과시켜야 메서드 인가가 유일한 판정자가 되고, 그때 비로소 이 계약이 무언가를 증명한다.
        for (String role : new String[]{"ROLE_ADMIN", "ROLE_SYSTEM", "ROLE_USER"}) {
            jdbcTemplate.update("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES (?, 'ADMIN_ALL')", role);
        }
    }

    private CustomUserDetails principal(String userId, String roleName) {
        return CustomUserDetails.builder()
                .userId(userId)
                .esntlId("USR_" + userId)
                .userNm(userId)
                .roleName(roleName)
                .build();
    }

    @Test
    @DisplayName("일반 사용자는 URL 게이트를 통과해도 메서드 인가에서 차단된다")
    void list_shouldBeForbidden_forNormalUser() throws Exception {
        mockMvc.perform(get(LIST_URL).with(user(principal("normal_user", "USER"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("익명 사용자는 401 이다")
    void list_shouldRequireAuthentication_forAnonymous() throws Exception {
        mockMvc.perform(get(LIST_URL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("관리자는 통과한다 — 인가를 좁히지 않았다")
    void list_shouldBeAllowed_forAdmin() throws Exception {
        mockMvc.perform(get(LIST_URL).with(user(principal("admin_user", "ADMIN"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("SYSTEM 롤도 통과한다 — URL 게이트와 같은 집합이라 동작이 바뀌지 않는다")
    void list_shouldBeAllowed_forSystemRole() throws Exception {
        mockMvc.perform(get(LIST_URL).with(user(principal("system_user", "SYSTEM"))))
                .andExpect(status().isOk());
    }
}
