package nuri.api.controller.foundation.controller.system.policy;

import nuri.business.domain.system.policy.SystemPolicy;
import nuri.business.domain.system.policy.SystemPolicyRepository;
import nuri.business.support.AuthorizationTestPrincipal;
import nuri.foundation.security.iam.CustomUserDetailsService;
import nuri.foundation.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.http.MediaType;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 일반 사용자 정책 열람 경로(/api/v1/policies/{type})와 관리자 정책 관리 경로(/api/v1/admin/system/policies/**)의
 * 실제 HTTP 체인 인가 경계를 검증한다.
 */
@SpringBootTest(
        classes = nuri.ApiServerApplication.class,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:public_policy_authz_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext
class PublicPolicyApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SystemPolicyRepository systemPolicyRepository;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    private org.springframework.security.core.userdetails.UserDetails normalUser() {
        return (org.springframework.security.core.userdetails.UserDetails) AuthorizationTestPrincipal
                .authentication("normal_user", "USR_NORMAL", "USER").getPrincipal();
    }

    @Test
    @Transactional
    @DisplayName("로그인한 일반 사용자는 관리자 권한 없이 /api/v1/policies/{type} 로 등록된 정책의 공개 필드만 열람할 수 있다")
    void authenticatedUserReadsPublicPolicyWithoutAdminFields() throws Exception {
        systemPolicyRepository.insert(SystemPolicy.create("PRIVACY", "개인정보 처리방침", "<p>실제 본문</p>"));

        mockMvc.perform(get("/api/v1/policies/privacy").with(user(normalUser())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plcyTypeCd").value("PRIVACY"))
                .andExpect(jsonPath("$.data.plcyTtl").value("개인정보 처리방침"))
                .andExpect(jsonPath("$.data.plcyCn").value("<p>실제 본문</p>"))
                .andExpect(jsonPath("$.data.version").doesNotExist())
                .andExpect(jsonPath("$.data.lastMdfrId").doesNotExist());
    }

    @Test
    @DisplayName("미인증 요청은 /api/v1/policies/{type} 에서 401 로 차단된다")
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/policies/privacy"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("미등록 정책 열람 요청은 기본 본문을 지어내지 않고 404 를 반환한다")
    void unregisteredPolicyReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/policies/TERMS").with(user(normalUser())))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("일반 사용자는 관리자 정책 수정 API 를 호출할 수 없다(403)")
    void normalUserCannotUpdateAdminPolicy() throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/policies/PRIVACY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plcyTtl\":\"변경 시도\",\"plcyCn\":\"본문\",\"version\":0}")
                        .with(user(normalUser())))
                .andExpect(status().isForbidden());
    }
}
