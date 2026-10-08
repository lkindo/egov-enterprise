package nuri.security;

import java.util.List;
import java.util.stream.Stream;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.iam.CustomUserDetailsService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RBAC 매트릭스 — **demo 프로필에만 존재하는 표면**의 인가 판정 계약.
 *
 * ── 왜 분리했는가 ──────────────────────────────────────────────────────────
 * 설문·투표·배너/팝업·약식결재는 재사용 base 의 core/collaboration 프로필에 없다.
 * 종전에는 이 단언들이 {@link RbacAuthorizationMatrixTest} 안에 함께 있었고, 통계 단언이 필요로 하는
 * {@code ReportStatsService} {@code @MockitoBean} 한 줄 때문에 **매트릭스 전체가 축소 프로필에서
 * 연쇄 제거**됐다 — core 에 RBAC 게이트가 하나도 남지 않았다(GAP-PACK-001 ④).
 *
 * <p>[Phase 0c] 통계는 business-core 로 옮겨 모든 프로필에 남는다. 통계 단언과 그 서비스 대역은
 *   core 매트릭스로 옮겼고, 이 클래스의 경계는 {@link #SURVEY_PACK_BOUNDARY} 가 잇는다.
 *
 * ⚠ 설문·투표 단언을 **이 클래스에 함께** 둔 것은 의도다. 그 단언들은 URL 문자열만 쓰므로 자체로는
 *   어떤 타입도 참조하지 않아, 따로 두면 **엔드포인트가 없는 프로필에도 살아남아 404 로 죽는다.**
 *   여기 두면 설문 표지 참조를 통해 함께 제거된다. 프로필 구성상 설문 pack 은 demo 프로필에만 들어가므로
 *   (core=[core], collaboration=[core,collaboration], demo=[core,collaboration,survey,demo])
 *   "demo 에서만 산다" 가 이 클래스의 모든 표면에 정확히 맞는다.
 *
 * ⚠ H2 DB 이름을 core 클래스와 다르게 둔다({@code rbac_demo_testdb}) — 같은 이름을 공유하면
 *   {@code create-drop} + {@code @DirtiesContext} 에서 컨텍스트 축출 순서에 따라 42S02 로 죽는다.
 */
@Tag("governance-harness")
@SpringBootTest(classes = nuri.ApiServerApplication.class, properties = {
        "spring.datasource.url=jdbc:h2:mem:rbac_demo_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
        "spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class RbacDemoSurfaceAuthorizationMatrixTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    /**
     * 이 참조가 곧 pack 경계다 — 설문은 demo 프로필에만 들어가므로 축소 프로필에서 이 클래스가 함께 사라진다.
     * 테스트는 이 상수를 쓰지 않는다. 종전 경계였던 통계 서비스 대역이 core 로 옮겨 가며 그 자리를 잇는 표지다.
     * composer 투영은 설문을 고르지 않은 구성에서 이 줄을 지우고 남은 표면의 단언을 지킨다.
     */
    private static final Class<?> SURVEY_PACK_BOUNDARY = nuri.business.service.survey.SurveyService.class;

    private static final String SURVEYS = "/api/v1/admin/system/surveys";

    @Test void adminReadsDemoOwnedAdministrativeSurfaces() throws Exception {
        var admin = nuri.business.support.AuthorizationTestPrincipal.principal("admin_test", "USR_999", "ADMIN");
        mockMvc.perform(get(SURVEYS).with(user(admin))).andExpect(status().isOk());
    }
    @Test void ordinaryUserCannotReadDemoOwnedAdministrativeSurfaces() throws Exception {
        var ordinary = nuri.business.support.AuthorizationTestPrincipal.principal("user_test", "USR_001", "USER");
        mockMvc.perform(get(SURVEYS).with(user(ordinary))).andExpect(status().isForbidden());
    }
    @Test void anonymousDemoOwnedAdministrativeRequestsRequireAuthentication() throws Exception {
        mockMvc.perform(get(SURVEYS)).andExpect(status().isUnauthorized());
    }
    @Test void explicitSurveyReadGrantWorksWithoutAnAdministrativeGroup() throws Exception {
        var operator = RbacAuthorizationMatrixTest.explicit(List.of("OPERATIONS_TEAM"), List.of("SURVEY_READ_ALL"));
        mockMvc.perform(get(SURVEYS).with(user(operator))).andExpect(status().isOk());
        mockMvc.perform(post(SURVEYS).with(user(operator))).andExpect(status().isForbidden());
    }
    @Test void ordinaryUserCannotEnterDemoOwnedAdministrativeEndpoints() throws Exception {
        var ordinary = nuri.business.support.AuthorizationTestPrincipal.principal("user_test", "USR_001", "USER");
        for (String path : List.of("/api/v1/admin/system/banners", "/api/v1/admin/system/banners/reflected",
                "/api/v1/admin/system/banners/1", "/api/v1/admin/system/popups", "/api/v1/admin/system/popups/1")) {
            mockMvc.perform(get(path).with(user(ordinary))).andExpect(status().isForbidden());
        }
        mockMvc.perform(patch("/api/v1/admin/system/ism/1/confirm").with(user(ordinary)))
                .andExpect(status().isForbidden());
    }
    @Test void ordinaryPollParticipantCannotCreateUpdateOrDeletePolls() throws Exception {
        var ordinary = nuri.business.support.AuthorizationTestPrincipal.principal("user_test", "USR_001", "USER");
        mockMvc.perform(get("/api/v1/polls").with(user(ordinary))).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/polls").with(user(ordinary))).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/v1/polls/1").with(user(ordinary))).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/polls/1").with(user(ordinary))).andExpect(status().isForbidden());
    }

    @ParameterizedTest(name = "{0} {1} rejects {2}")
    @MethodSource("managementWritesWithoutExactPermission")
    void managementWriteRequiresItsExactHttpPermission(ManagedSurface surface, HttpMethod method,
                                                        RbacAuthorizationMatrixTest.MissingGrant missing) throws Exception {
        String path = HttpMethod.POST.equals(method) ? surface.path()
                : surface.path() + "/" + (surface.fixedId().isEmpty() ? "9223372036854775807" : surface.fixedId());
        RbacAuthorizationMatrixTest.performDeniedManagementWrite(mockMvc, method, path, surface.body("RBAC initial"),
                surface.prefix(), surface.readPermission(), missing);
    }

    static Stream<Arguments> managementWritesWithoutExactPermission() {
        return managementSurfaces().flatMap(surface -> Stream.of(HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE)
                .flatMap(method -> Stream.of(RbacAuthorizationMatrixTest.MissingGrant.values())
                        .map(missing -> Arguments.of(surface, method, missing))));
    }

    /** Real CRUD must succeed with one exact operation grant, then a separate read grant observes the persisted result. */
    @ParameterizedTest(name = "{0} permits real CRUD with separate exact grants")
    @MethodSource("managementSurfaces")
    @Transactional
    void exactManagementGrantsIndependentlyAllowRealHttpCrud(ManagedSurface surface) throws Exception {
        var creation = mockMvc.perform(post(surface.path())
                        .with(user(RbacAuthorizationMatrixTest.explicit("http_creator", List.of("CONTENT_OPERATORS"),
                                List.of(surface.prefix() + "_CREATE"))))
                        .contentType(MediaType.APPLICATION_JSON).content(surface.body("RBAC initial")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true)).andReturn();
        String id = surface.fixedId();
        if (id.isEmpty()) {
            id = Long.toString(objectMapper.readTree(creation.getResponse().getContentAsString())
                    .at(surface.responseIdPath()).asLong());
            org.assertj.core.api.Assertions.assertThat(id).matches("[1-9][0-9]*");
        }
        String path = surface.path() + "/" + id;
        assertStoredName(surface, path, "RBAC initial");

        mockMvc.perform(put(path)
                        .with(user(RbacAuthorizationMatrixTest.explicit("http_editor", List.of("CONTENT_OPERATORS"),
                                List.of(surface.prefix() + "_UPDATE"))))
                        .contentType(MediaType.APPLICATION_JSON).content(surface.body("RBAC updated")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        assertStoredName(surface, path, "RBAC updated");

        mockMvc.perform(delete(path)
                        .with(user(RbacAuthorizationMatrixTest.explicit("http_remover", List.of("CONTENT_OPERATORS"),
                                List.of(surface.prefix() + "_DELETE")))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        var reader = RbacAuthorizationMatrixTest.explicit(List.of("CONTENT_READERS"), List.of(surface.readPermission()));
        if (surface.prefix().equals("REWARD")) {
            mockMvc.perform(get(surface.path()).param("name", "RBAC updated").with(user(reader)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.data.total").value(0));
        } else {
            mockMvc.perform(get(path).with(user(reader)))
                    .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("C007"));
        }
    }

    private void assertStoredName(ManagedSurface surface, String path, String name) throws Exception {
        var reader = RbacAuthorizationMatrixTest.explicit(List.of("CONTENT_READERS"), List.of(surface.readPermission()));
        if (surface.prefix().equals("REWARD")) {
            mockMvc.perform(get(surface.path()).param("name", name).with(user(reader)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.data.total").value(1))
                    .andExpect(jsonPath("$.data.list[0]." + surface.nameField()).value(name));
        } else {
            mockMvc.perform(get(path).with(user(reader)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.data." + surface.nameField()).value(name));
        }
    }

    static Stream<ManagedSurface> managementSurfaces() {
        return Stream.of(
                new ManagedSurface("/api/v1/admin/operation/events", "EVENT", "EVENT_READ", "evntNm",
                        """
                        {"evntNm":"%s","bizYr":"2026","evntBgngYmd":"20261001",
                         "evntEndYmd":"20261002","evntUseCnt":1,"evntTypeCd":"EVT01"}
                        """, "/data", ""),
                new ManagedSurface("/api/v1/admin/operation/rewards", "REWARD", "REWARD_READ", "rwardNm",
                        """
                        {"rwardNm":"%s","rwardwnrId":"rbac_recipient","rwardCode":"TEST",
                         "rwardDe":"20261001","pblenCn":"RBAC fixture"}
                        """, "/data/rwrdSn", ""),
                new ManagedSurface("/api/v1/help/hpcm", "HELP", "HELP_READ", "hlpDfn",
                        """
                        {"hlpSeCd":"GNR","hlpDfn":"%s","hlpExpln":"RBAC fixture"}
                        """, "/data", ""),
                new ManagedSurface("/api/v1/help/manuals", "HELP", "HELP_READ", "onlnMnlNm",
                        """
                        {"onlnMnlNm":"%s","onlnMnlSeCd":"GNR","onlnMnlDfn":"RBAC fixture",
                         "onlnMnlExpln":"RBAC fixture"}
                        """, "/data", ""),
                new ManagedSurface("/api/v1/admin/system/banners", "BANNER", "BANNER_ADMIN_READ", "bnrNm",
                        """
                        {"bnrNm":"%s","linkUrl":"https://example.invalid/rbac","sortOrdr":1,"rfltYn":"N"}
                        """, "/data", ""),
                new ManagedSurface("/api/v1/admin/system/popups", "POPUP", "POPUP_ADMIN_READ", "popupTtlNm",
                        """
                        {"popupTtlNm":"%s","fileUrl":"https://example.invalid/rbac",
                         "ntceBgnde":"2026-10-01","ntceEndde":"2026-10-02","stopvewSetupYn":"N","ntceYn":"N"}
                        """, "/data", ""),
                new ManagedSurface("/api/v1/admin/system/templates", "TEMPLATE", "TEMPLATE_READ", "tmpltNm",
                        """
                        {"tmpltId":"RBAC_HTTP_TMPL","tmpltNm":"%s","tmpltPath":"/rbac-fixture",
                         "tmpltSeCd":"GNR","useYn":"Y"}
                        """, "", "RBAC_HTTP_TMPL"));
    }

    record ManagedSurface(String path, String prefix, String readPermission, String nameField, String bodyTemplate,
                          String responseIdPath, String fixedId) {
        String body(String name) { return bodyTemplate.formatted(name); }
        @Override public String toString() { return path; }
    }
}
