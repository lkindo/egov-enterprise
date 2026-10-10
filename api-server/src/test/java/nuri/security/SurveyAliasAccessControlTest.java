package nuri.security;

import nuri.api.controller.foundation.controller.system.service.survey.SurveyApiController;
import nuri.foundation.security.iam.CustomUserDetailsService;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [DEC-OPS-010] 설문 별칭의 인가 — 열람은 일반 사용자에게 열리고 관리 뮤테이션은 막힌다.
 *
 * <p>[2026-10-10 Phase 2 D6] 종전에는 core 보안 테스트({@link SecurityAuthorityAccessControlTest}) 안에 URL 문자열로만
 * 있어, 설문이 없는 core·collaboration 생성물에서 404 로 처음부터 붉었다. 별칭 경로를 컨트롤러의 매핑에서 읽으므로
 * 설문을 고르지 않은 생성물에서는 이 클래스가 컨트롤러와 함께 빠진다.
 *
 * <p>HTTP 계층(OperationAuthorizationManager)이 먼저 판정하고 메서드 계층(@PreAuthorize)이 같은 binding 을 다시 본다.
 * 열람이 막히면(red) 제품 회귀이고, 뮤테이션이 뚫리면(red) 인가 회귀다. H2 DB 이름은 다른 보안 테스트와 겹치지 않게 둔다.
 */
@SpringBootTest(
        classes = nuri.ApiServerApplication.class,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:survey_alias_access_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class SurveyAliasAccessControlTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("보안 검증 - [DEC-OPS-010] 설문 alias: USER 열람은 200, 관리 뮤테이션은 403 (HTTP·메서드 이중 집행)")
    void surveyAlias_readOpen_mutationForbidden_forNormalUser() throws Exception {
        List<String> mappings = List.of(SurveyApiController.class.getAnnotation(RequestMapping.class).value());
        assertThat(mappings).as("설문 컨트롤러의 별칭 경로").contains("/api/v1/surveys");
        String alias = "/api/v1/surveys";
        CustomUserDetails normalUser = nuri.business.support.AuthorizationTestPrincipal.principal("normal_user", "USR_001", "USER");

        // ① 열람 개방: 일반 USER 의 목록 조회는 200 이어야 한다 (SURVEY_READ — 기본 그룹에 ROLE_USER 포함).
        mockMvc.perform(get(alias)
                        .with(user(normalUser))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // ② 관리 차단: 별칭 경로의 관리 뮤테이션은 SURVEY_DELETE_ALL 이 필요하다(HTTP 계층이 먼저 403 을 낸다).
        //    DELETE 는 @Valid 본문이 없어 400 개입 없이 순수 인가(403)를 관찰할 수 있다.
        mockMvc.perform(delete(alias + "/{srvySn}", 999999L)
                        .with(user(normalUser))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}
