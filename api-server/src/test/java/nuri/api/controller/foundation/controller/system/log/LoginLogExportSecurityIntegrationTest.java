package nuri.api.controller.foundation.controller.system.log;

import nuri.business.service.log.LoginLogManageService;
import nuri.business.service.log.dto.LoginLogDto;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.iam.CustomUserDetailsService;
import nuri.foundation.security.service.CustomUserDetails;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 로그인 로그 xlsx export 의 인가·전량 export 통합 검증.
 *
 * <p>[H3 — 인가 의미] export 는 기존 목록 API 와 같은 ADMIN/SYSTEM 축이다. 이 테스트는
 * ① 일반 USER 의 403 차단(인가 완화 회귀 시 red), ② ADMIN 의 정상 다운로드,
 * ③ 실 저장 경로(H2 + QueryDSL)를 관통한 "페이지 파라미터 무시 = 전량 export" 를 함께 고정한다.
 *
 * <p>DB URL 게이트(secure-paths + tb_prgrm_lst)는 {@code SecurityAuthorityAccessControlTest} 와
 * 같은 방식으로 V2_11 의 {@code ADMIN_ALL(/api/v1/admin/**)} 행을 시드해 운영 시드와 같은
 * 매핑 아래에서 판정한다 — 매핑 부재 fail-closed 403 과 역할 부족 403 을 뒤섞지 않기 위해서다.
 */
@SpringBootTest(
        classes = nuri.ApiServerApplication.class,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:login_log_export_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "rbac.shadow.enabled=true",
                "rbac.db-auth.enabled=true"
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class LoginLogExportSecurityIntegrationTest {

    private static final String EXPORT_URL = "/api/v1/admin/system/logs/login/export.xlsx";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private LoginLogManageService loginLogManageService;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        // URL 인가 매핑 시드 (V2_11 ADMIN_ALL 과 동일한 패턴)
        jdbcTemplate.execute("DELETE FROM tb_role_prgrm_map");
        jdbcTemplate.execute("DELETE FROM tb_prgrm_lst");
        jdbcTemplate.execute("DELETE FROM tb_authrt_role_map");
        jdbcTemplate.execute("DELETE FROM tb_authrt_info");
        jdbcTemplate.execute("DELETE FROM tb_role_info");

        jdbcTemplate.execute("INSERT INTO tb_authrt_info (authrt_cd, authrt_nm) VALUES ('ROLE_ADMIN', '관리자권한')");
        jdbcTemplate.execute("INSERT INTO tb_authrt_info (authrt_cd, authrt_nm) VALUES ('ROLE_USER', '사용자권한')");
        jdbcTemplate.execute("INSERT INTO tb_role_info (role_id, role_nm) VALUES ('ROLE_ADMIN', '관리자역할')");
        jdbcTemplate.execute("INSERT INTO tb_role_info (role_id, role_nm) VALUES ('ROLE_USER', '사용자역할')");
        jdbcTemplate.execute("INSERT INTO tb_authrt_role_map (authrt_cd, role_cd) VALUES ('ROLE_ADMIN', 'ROLE_ADMIN')");
        jdbcTemplate.execute("INSERT INTO tb_authrt_role_map (authrt_cd, role_cd) VALUES ('ROLE_USER', 'ROLE_USER')");
        jdbcTemplate.execute("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url) VALUES ('ADMIN_ALL', '관리자 전체', '/api/v1/admin/**')");
        jdbcTemplate.execute("INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES ('ROLE_ADMIN', 'ADMIN_ALL')");

        // export 모집단 시드 — 서비스 경로로 3건 적재
        jdbcTemplate.execute("DELETE FROM tb_login_log");
        loginLogManageService.logInsertLoginLog(loginLog("userA", "10.0.0.1", "PWD"));
        loginLogManageService.logInsertLoginLog(loginLog("userB", "10.0.0.2", "PWD"));
        loginLogManageService.logInsertLoginLog(loginLog("userC", "10.0.0.3", "SSO"));
    }

    @Test
    @DisplayName("인가 — ADMIN 권한 없는 일반 USER 의 export 접근은 403 으로 차단된다 (H3: 목록 API 와 동일 축)")
    void export_shouldBeForbidden_forNormalUser() throws Exception {
        CustomUserDetails normalUser = CustomUserDetails.builder()
                .userId("normal_user")
                .esntlId("USR_001")
                .userNm("일반사용자")
                .roleName("USER")
                .build();

        mockMvc.perform(get(EXPORT_URL).with(user(normalUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("인가 — 익명 사용자의 export 접근은 401 이다")
    void export_shouldRequireAuthentication_forAnonymous() throws Exception {
        mockMvc.perform(get(EXPORT_URL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("전량 export — ADMIN 은 페이지 파라미터와 무관하게 조건 일치 전체 행을 xlsx 로 받는다")
    void export_shouldStreamAllRows_ignoringPaging_forAdmin() throws Exception {
        CustomUserDetails admin = CustomUserDetails.builder()
                .userId("admin_user")
                .esntlId("USR_999")
                .userNm("관리자")
                .roleName("ADMIN")
                .build();

        // 화면 페이징 값(pageIndex=3, pageUnit=1)이 적용된다면 1행만 나와야 한다 — export 는 전량이어야 한다.
        MvcResult asyncStarted = mockMvc.perform(get(EXPORT_URL)
                        .with(user(admin))
                        .param("pageIndex", "3")
                        .param("pageUnit", "1"))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(asyncStarted))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"login-logs.xlsx\""))
                .andExpect(header().string("Content-Type", LoginLogApiController.XLSX_MEDIA_TYPE));

        byte[] body = asyncStarted.getResponse().getContentAsByteArray();
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(body))) {
            Sheet sheet = workbook.getSheetAt(0);
            // 헤더 1행 + 시드 3행 전량 — 실 저장 경로(H2 + QueryDSL) 관통 증명
            assertThat(sheet.getLastRowNum()).isEqualTo(3);
        }
    }

    private static LoginLogDto loginLog(String loginId, String ip, String method) {
        return LoginLogDto.builder()
                .loginId(loginId)
                .loginIp(ip)
                .loginMthd(method)
                .errOccrrAt("N")
                .build();
    }
}
