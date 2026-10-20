package nuri.api.controller.foundation.controller.system.stats;

import nuri.business.service.stats.ReportStatsService;
import nuri.business.service.stats.dto.StatsPoint;
import nuri.business.test.BaseControllerTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.List;

import static org.hamcrest.Matchers.aMapWithSize;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 사용자용 접속 추이 API 계약.
 *
 * <p>[2026-10-20] 관리자 접속 통계와 같은 서비스 경로라 같은 모양({@code [{date, value}]})이다. 기간 기본값은 서비스가 정한다
 * (종전에는 이 컨트롤러가 JVM 시간대로 따로 계산했다). 이 API 는 지금 소비자가 없고 퇴역은 별도 결정이다(GAP-WIRING-001).
 */
@DisplayName("StatisticsUserApiController 접속 추이 계약")
class StatisticsUserApiControllerTest extends BaseControllerTest {

    private static final String CONNECT = "/api/v1/statistics/connect";

    private ReportStatsService reportStatsService;

    @Override
    protected Object getController() {
        reportStatsService = mock(ReportStatsService.class);
        return new StatisticsUserApiController(reportStatsService);
    }

    @Test
    @DisplayName("서비스가 낸 {date, value} 를 순서·값 그대로, 그 두 필드만 싣는다")
    void connect_CarriesServicePointsVerbatim() throws Exception {
        when(reportStatsService.getConnectStatsByDate(any(), any())).thenReturn(List.of(
                new StatsPoint("2026-08-05", 4), new StatsPoint("2026-08-06", 0), new StatsPoint("2026-08-07", 2)));

        mockMvc.perform(get(CONNECT).param("fromDate", "20260805").param("toDate", "20260807")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0]", aMapWithSize(2)))
                .andExpect(jsonPath("$.data[0].date").value("2026-08-05"))
                .andExpect(jsonPath("$.data[0].value").value(4))
                .andExpect(jsonPath("$.data[1].value").value(0))
                .andExpect(jsonPath("$.data[2].date").value("2026-08-07"))
                .andExpect(jsonPath("$.data[2].value").value(2));
    }

    @Test
    @DisplayName("받은 기간은 형식을 바꾸지 않고 그대로, 생략은 null 로 넘긴다 — 기본값은 서비스가 정한다")
    void connect_PassesPeriodThrough() throws Exception {
        mockMvc.perform(get(CONNECT).param("fromDate", "2026-08-01").param("toDate", "20260831")
                .accept(MediaType.APPLICATION_JSON)).andExpect(status().isOk());
        verify(reportStatsService).getConnectStatsByDate("2026-08-01", "20260831");
        verifyNoMoreInteractions(reportStatsService);

        clearInvocations(reportStatsService);
        mockMvc.perform(get(CONNECT).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
        verify(reportStatsService).getConnectStatsByDate(null, null);
        verifyNoMoreInteractions(reportStatsService);
    }
}
