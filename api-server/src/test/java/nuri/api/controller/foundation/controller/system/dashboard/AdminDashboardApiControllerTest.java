package nuri.api.controller.foundation.controller.system.dashboard;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.service.system.signal.OperationalSignalService;
import nuri.business.service.system.signal.OperationalSignalService.Kind;
import nuri.business.service.system.signal.OperationalSignalService.OperationalSignal;
import nuri.business.service.system.signal.OperationalSignalService.OperationalSignals;
import nuri.business.support.ControllerTestSupport;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * [2026-10-20] 관리자 홈 운영 신호 요약 API 의 응답 모양. 이 슬라이스는 인증 필터만 탄다(메서드 보안은 싣지 않는다) — 진입 권한
 * (DASHBOARD_ADMIN_READ, 원천 권한만으로는 403)은 실제 인가를 타는 RbacAuthorizationMatrixTest 가, 신호별 원천 권한 판정은
 * OperationalSignalServiceTest 가 본다.
 */
@WebMvcTest(AdminDashboardApiController.class)
@DisplayName("AdminDashboardApiController — 운영 신호 요약")
class AdminDashboardApiControllerTest extends ControllerTestSupport {

    private static final String PATH = "/api/v1/admin/dashboard/operational-signals";

    @MockitoBean
    private OperationalSignalService operationalSignalService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    private static CustomUserDetails principal(String... permissions) {
        return CustomUserDetails.builder().userId("operator").esntlId("USRCNFRM_00000000099").userNm("operator")
                .password("test").groups(List.of("OPERATIONS_TEAM")).permissions(List.of(permissions)).enabled(true).lockAt("N")
                .authorizationVersion(PermissionCodes.CATALOG_VERSION).build();
    }

    @Test
    @DisplayName("관리자 홈 권한이 있으면 관측 시각과 보이는 신호를 돌려준다 — 셀 수 없는 신호의 건수는 null 이다")
    void returnsSignalsWithObservationTime() throws Exception {
        given(operationalSignalService.currentSignals()).willReturn(new OperationalSignals(Instant.parse("2026-10-19T23:30:00Z"),
                List.of(new OperationalSignal(Kind.FAILED_DURABLE_JOBS, 3L), new OperationalSignal(Kind.FAILED_REQUESTS_TODAY, null))));

        mockMvc.perform(get(PATH).with(user(principal("DASHBOARD_ADMIN_READ", "DWORK_READ", "SYS_LOG_READ"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.observedAt").value("2026-10-19T23:30:00Z"))
                .andExpect(jsonPath("$.data.signals.length()").value(2))
                .andExpect(jsonPath("$.data.signals[0].kind").value("FAILED_DURABLE_JOBS"))
                .andExpect(jsonPath("$.data.signals[0].count").value(3))
                .andExpect(jsonPath("$.data.signals[1].kind").value("FAILED_REQUESTS_TODAY"))
                .andExpect(jsonPath("$.data.signals[1].count").value(nullValue()));
    }

    @Test
    @DisplayName("인증하지 않으면 401 이다")
    void anonymousIsUnauthorized() throws Exception {
        mockMvc.perform(get(PATH)).andExpect(status().isUnauthorized());
        verifyNoInteractions(operationalSignalService);
    }
}
