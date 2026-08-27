package nuri.api.controller.foundation.controller.system.log;

import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.foundation.security.iam.CustomUserDetailsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 개인정보 접근 로그가 최상위 SYSTEM 롤에게 열리지 않는지 검증한다.
 *
 * <p><b>왜 이 테스트가 필요한가.</b> 종전에는 목록이 {@code @AdminOnly}, export 가
 * {@code @AdminOrSystem} 이었고 클래스 javadoc 은 "SYSTEM 은 제외한다" 고 적어 두었다.
 * 그런데 이 저장소는 DB 역할 계층 {@code ROLE_SYSTEM > ROLE_ADMIN} 을 메서드 인가에도 주입하므로
 * {@code hasRole('ADMIN')} 이 SYSTEM 보유자도 통과시킨다 — 즉 <b>문서와 동작이 어긋나 있었고
 * 애노테이션을 눈으로 비교해서는 그 사실이 드러나지 않는다.</b> 그래서 계층이 살아 있는 상태에서
 * 실제 요청으로 판정한다.
 *
 * <p><b>vacuous 통과 차단.</b> 계층을 시드하지 않으면 SYSTEM 보유자는 {@code ROLE_ADMIN} 을 얻지 못해
 * 어떤 애노테이션에서도 403 이 된다 — 그러면 이 테스트는 아무것도 증명하지 못한다.
 * {@link #roleHierarchyIsActive_soTheExclusionIsMeaningful()} 가 계층 활성 자체를 먼저 고정한다.
 */
@SpringBootTest(
        classes = nuri.ApiServerApplication.class,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:privacy_log_authz_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "rbac.shadow.enabled=true",
                "rbac.db-auth.enabled=true"
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class PrivacyLogSystemRoleExclusionTest {

    private static final String LIST_URL = "/api/v1/admin/system/logs/privacy";
    private static final String EXPORT_URL = "/api/v1/admin/system/logs/privacy/export.xlsx";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RoleHierarchy roleHierarchy;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void seedProductionShapedAuthorizationChain() {
        // tb_role_hierarchy 는 JPA 엔티티가 없는 Flyway 전용 테이블(V2_3)이라 create-drop 스키마에 없다.
        // DbRoleHierarchy 가 읽는 두 컬럼만 운영과 같은 이름으로 만든다.
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS tb_role_hierarchy ("
                + " higher_authrt VARCHAR(30) NOT NULL,"
                + " lower_authrt VARCHAR(30) NOT NULL,"
                + " frst_rgtr_id VARCHAR(20),"
                + " PRIMARY KEY (higher_authrt, lower_authrt))");

        jdbcTemplate.execute("DELETE FROM tb_role_prgrm_map");
        jdbcTemplate.execute("DELETE FROM tb_prgrm_lst");
        jdbcTemplate.execute("DELETE FROM tb_authrt_role_map");
        jdbcTemplate.execute("DELETE FROM tb_authrt_info");
        jdbcTemplate.execute("DELETE FROM tb_role_info");
        jdbcTemplate.execute("DELETE FROM tb_role_hierarchy");

        jdbcTemplate.execute("INSERT INTO tb_authrt_info (authrt_cd, authrt_nm) VALUES ('ROLE_ADMIN', '관리자권한')");
        jdbcTemplate.execute("INSERT INTO tb_authrt_info (authrt_cd, authrt_nm) VALUES ('ROLE_SYSTEM', '시스템권한')");
        jdbcTemplate.execute("INSERT INTO tb_role_info (role_id, role_nm) VALUES ('ROLE_ADMIN', '관리자역할')");
        jdbcTemplate.execute("INSERT INTO tb_role_info (role_id, role_nm) VALUES ('ROLE_SYSTEM', '시스템역할')");
        jdbcTemplate.execute("INSERT INTO tb_authrt_role_map (authrt_cd, role_cd) VALUES ('ROLE_ADMIN', 'ROLE_ADMIN')");
        jdbcTemplate.execute("INSERT INTO tb_authrt_role_map (authrt_cd, role_cd) VALUES ('ROLE_SYSTEM', 'ROLE_SYSTEM')");

        // URL 게이트는 운영 시드(V2_11)와 동일하게 **SYSTEM 도 통과**시킨다.
        // 그래야 메서드 인가가 유일한 판정자가 되어 이 테스트가 실제 축을 검증한다.
        jdbcTemplate.execute("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url) "
                + "VALUES ('ADMIN_ALL', '관리자 전체', '/api/v1/admin/**')");
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_ADMIN', 'ADMIN_ALL')");
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_SYSTEM', 'ADMIN_ALL')");

        // 역할 계층도 운영 시드(R__zz_seed_base_admin)와 동일하게 둔다.
        jdbcTemplate.execute("INSERT INTO tb_role_hierarchy (higher_authrt, lower_authrt, frst_rgtr_id) "
                + "VALUES ('ROLE_SYSTEM', 'ROLE_ADMIN', 'SYSTEM')");
        jdbcTemplate.execute("INSERT INTO tb_role_hierarchy (higher_authrt, lower_authrt, frst_rgtr_id) "
                + "VALUES ('ROLE_ADMIN', 'ROLE_USER', 'SYSTEM')");

        // 계층은 ApplicationReadyEvent 에서 한 번 로드된다. 시드가 그 뒤이므로 명시적으로 다시 읽는다.
        if (roleHierarchy instanceof nuri.api.config.DbRoleHierarchy reloadable) {
            reloadable.reload();
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
    @DisplayName("전제 — 역할 계층이 살아 있어 SYSTEM 보유자가 ROLE_ADMIN 을 상속한다 (vacuous 통과 차단)")
    void roleHierarchyIsActive_soTheExclusionIsMeaningful() {
        var reachable = roleHierarchy.getReachableGrantedAuthorities(
                List.of(new SimpleGrantedAuthority("ROLE_SYSTEM")));

        assertThat(reachable)
                .as("계층이 로드되지 않으면 SYSTEM 은 애초에 ADMIN 자원에 못 가므로 아래 배제 테스트가 무의미해진다")
                .extracting(org.springframework.security.core.GrantedAuthority::getAuthority)
                .contains("ROLE_ADMIN");
    }

    @Test
    @DisplayName("배제 — SYSTEM 롤은 개인정보 로그 목록을 볼 수 없다")
    void list_shouldBeForbidden_forSystemRole() throws Exception {
        mockMvc.perform(get(LIST_URL).with(user(principal("system_user", "SYSTEM"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("배제 — SYSTEM 롤은 개인정보 로그 전량 반출을 할 수 없다")
    void export_shouldBeForbidden_forSystemRole() throws Exception {
        mockMvc.perform(get(EXPORT_URL).with(user(principal("system_user", "SYSTEM"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("허용 — ADMIN 롤은 목록과 반출을 모두 사용할 수 있다 (배제가 과하지 않다)")
    void listAndExport_shouldBeAllowed_forAdminRole() throws Exception {
        var admin = principal("admin_user", "ADMIN");

        mockMvc.perform(get(LIST_URL).with(user(admin)))
                .andExpect(status().isOk());
        mockMvc.perform(get(EXPORT_URL).with(user(admin)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("배제 — 일반 사용자는 종전과 같이 차단된다")
    void list_shouldBeForbidden_forNormalUser() throws Exception {
        mockMvc.perform(get(LIST_URL).with(user(principal("normal_user", "USER"))))
                .andExpect(status().isForbidden());
    }
}
