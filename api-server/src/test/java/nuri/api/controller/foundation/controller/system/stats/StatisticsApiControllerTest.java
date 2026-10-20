package nuri.api.controller.foundation.controller.system.stats;

import nuri.business.test.BaseControllerTest;
import nuri.business.service.stats.ReportStatsService;
import nuri.business.service.stats.dto.StatsPoint;
import nuri.business.service.stats.dto.SummaryStatsDto;
import nuri.business.service.stats.dto.UserActivityStats;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.aMapWithSize;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 관리자 통계 API 계약.
 *
 * <p>[2026-10-20] 시계열은 {@code [{date, value}]} 한 모양이다. 기간의 기본값·형식·상한·빈 날 채우기·정렬은 서비스가 정하고
 * ({@code ReportStatsServiceTest}), 컨트롤러는 받은 기간을 가공 없이 넘기고 서비스의 결과·오류를 그대로 싣는다. 그래서 여기서는
 * 경로 → 서비스 메서드 연결, 기간 무가공 전달, 응답 모양, 서비스 오류의 400 을 본다.
 */
class StatisticsApiControllerTest extends BaseControllerTest {

    private static final String BASE = "/api/v1/admin/system/statistics/";
    private static final List<String> SERIES = List.of("data-usage", "bbs", "connect");

    private ReportStatsService reportStatsService;

    @Override
    protected Object getController() {
        reportStatsService = mock(ReportStatsService.class);
        return new StatisticsApiController(reportStatsService);
    }

    private static List<StatsPoint> points(String... pairs) {
        return Arrays.stream(pairs).map(pair -> {
            String[] parts = pair.split("=");
            return new StatsPoint(parts[0], Long.parseLong(parts[1]));
        }).toList();
    }

    private void stub(String endpoint, List<StatsPoint> rows) {
        switch (endpoint) {
            case "data-usage" -> when(reportStatsService.getDtaUseStatsByDate(any(), any())).thenReturn(rows);
            case "bbs" -> when(reportStatsService.getBbsStatsByDate(any(), any())).thenReturn(rows);
            case "connect" -> when(reportStatsService.getConnectStatsByDate(any(), any())).thenReturn(rows);
            default -> throw new IllegalArgumentException(endpoint);
        }
    }

    /** 엔드포인트마다 정해진 서비스 메서드 하나만 그 기간으로 불렸는지 본다. */
    private void verifyPeriod(String endpoint, String from, String to) {
        switch (endpoint) {
            case "data-usage" -> verify(reportStatsService).getDtaUseStatsByDate(from, to);
            case "bbs" -> verify(reportStatsService).getBbsStatsByDate(from, to);
            case "connect" -> verify(reportStatsService).getConnectStatsByDate(from, to);
            case "user" -> verify(reportStatsService).getUserStatsByDate(from, to);
            default -> throw new IllegalArgumentException(endpoint);
        }
        verifyNoMoreInteractions(reportStatsService);
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"data-usage", "bbs", "connect"})
    @DisplayName("시계열은 서비스가 낸 {date, value} 를 순서·값 그대로, 그 두 필드만 싣는다")
    void seriesCarryDateAndValueOnly(String endpoint) throws Exception {
        stub(endpoint, points("2026-10-01=3", "2026-10-02=0", "2026-10-03=12"));

        mockMvc.perform(get(BASE + endpoint).param("fromDate", "2026-10-01").param("toDate", "2026-10-03")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0]", aMapWithSize(2)))
                .andExpect(jsonPath("$.data[0].date").value("2026-10-01"))
                .andExpect(jsonPath("$.data[0].value").value(3))
                .andExpect(jsonPath("$.data[1].date").value("2026-10-02"))
                .andExpect(jsonPath("$.data[1].value").value(0))
                .andExpect(jsonPath("$.data[2].date").value("2026-10-03"))
                .andExpect(jsonPath("$.data[2].value").value(12));
        verifyPeriod(endpoint, "2026-10-01", "2026-10-03");
    }

    @Test
    @DisplayName("사용자 통계는 조회·등록·수정·삭제 네 계열을 한 객체로 싣는다")
    void userStatsCarryFourSeries() throws Exception {
        when(reportStatsService.getUserStatsByDate(any(), any())).thenReturn(new UserActivityStats(
                points("2026-10-01=120", "2026-10-02=0"),
                points("2026-10-01=3", "2026-10-02=0"),
                points("2026-10-01=2", "2026-10-02=5"),
                points("2026-10-01=1", "2026-10-02=0")));

        mockMvc.perform(get(BASE + "user").param("fromDate", "20261001").param("toDate", "20261002")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", aMapWithSize(4)))
                .andExpect(jsonPath("$.data.inqCnt[0].date").value("2026-10-01"))
                .andExpect(jsonPath("$.data.inqCnt[0].value").value(120))
                .andExpect(jsonPath("$.data.crtCnt[0].value").value(3))
                .andExpect(jsonPath("$.data.mdfcnCnt[1].date").value("2026-10-02"))
                .andExpect(jsonPath("$.data.mdfcnCnt[1].value").value(5))
                .andExpect(jsonPath("$.data.delCnt", hasSize(2)));
        verifyPeriod("user", "20261001", "20261002");
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"data-usage", "bbs", "connect", "user"})
    @DisplayName("기간을 생략하면 null, 빈 문자열이면 빈 문자열을 그대로 넘긴다 — 기본값은 서비스가 정한다")
    void omittedOrBlankPeriodIsPassedThrough(String endpoint) throws Exception {
        mockMvc.perform(get(BASE + endpoint).accept(MediaType.APPLICATION_JSON)).andExpect(status().isOk());
        verifyPeriod(endpoint, null, null);

        clearInvocations(reportStatsService);
        mockMvc.perform(get(BASE + endpoint).param("fromDate", "").param("toDate", "")
                .accept(MediaType.APPLICATION_JSON)).andExpect(status().isOk());
        verifyPeriod(endpoint, "", "");
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"data-usage", "bbs", "connect", "user"})
    @DisplayName("받은 기간은 형식을 바꾸지 않고 그대로 넘긴다")
    void explicitPeriodIsPassedVerbatim(String endpoint) throws Exception {
        mockMvc.perform(get(BASE + endpoint).param("fromDate", "2026-08-01").param("toDate", "20260831")
                .accept(MediaType.APPLICATION_JSON)).andExpect(status().isOk());

        verifyPeriod(endpoint, "2026-08-01", "20260831");
    }

    /** 받고 버리던 statsKind 를 걷었다 — 보내도 서비스에 닿는 조건이 없고, 핸들러도 그 이름을 받지 않는다. */
    @Test
    @DisplayName("접속 통계는 statsKind 를 받지 않는다")
    void connectStatsHasNoStatsKind() throws Exception {
        assertThat(Arrays.stream(StatisticsApiController.class.getMethods())
                .filter(method -> method.getName().equals("getConnectStats"))
                .flatMap(method -> Arrays.stream(method.getParameters()))
                .map(java.lang.reflect.Parameter::getName))
                .containsExactly("fromDate", "toDate");

        mockMvc.perform(get(BASE + "connect").param("fromDate", "2026-10-01").param("toDate", "2026-10-02")
                .param("statsKind", "MONTHLY").accept(MediaType.APPLICATION_JSON)).andExpect(status().isOk());
        verifyPeriod("connect", "2026-10-01", "2026-10-02");
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"data-usage", "bbs", "connect", "user"})
    @DisplayName("서비스가 기간을 거부하면(형식·역순·366일 초과) 400 과 그 사유를 싣는다")
    void rejectedPeriodIs400(String endpoint) throws Exception {
        BusinessException tooLong = new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "조회 기간은 366일을 넘을 수 없습니다.");
        switch (endpoint) {
            case "data-usage" -> when(reportStatsService.getDtaUseStatsByDate(any(), any())).thenThrow(tooLong);
            case "bbs" -> when(reportStatsService.getBbsStatsByDate(any(), any())).thenThrow(tooLong);
            case "connect" -> when(reportStatsService.getConnectStatsByDate(any(), any())).thenThrow(tooLong);
            case "user" -> when(reportStatsService.getUserStatsByDate(any(), any())).thenThrow(tooLong);
            default -> throw new IllegalArgumentException(endpoint);
        }

        mockMvc.perform(get(BASE + endpoint).param("fromDate", "2025-01-01").param("toDate", "2026-01-02")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value(CommonErrorCode.INVALID_INPUT_VALUE.getCode()))
                .andExpect(jsonPath("$.message").value("조회 기간은 366일을 넘을 수 없습니다."));
    }

    @Test
    @DisplayName("요약은 서비스의 세 숫자를 그대로, 그 세 필드만 싣는다")
    void getSummary_ReturnsExactlyTheThreeCounts() throws Exception {
        when(reportStatsService.getSummary()).thenReturn(SummaryStatsDto.builder()
                .totalUsers(7L)
                .totalPosts(20L)
                .todayConnects(3L)
                .build());

        mockMvc.perform(get(BASE + "summary").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", aMapWithSize(3)))
                .andExpect(jsonPath("$.data.totalUsers").value(7))
                .andExpect(jsonPath("$.data.totalPosts").value(20))
                .andExpect(jsonPath("$.data.todayConnects").value(3));

        verify(reportStatsService).getSummary();
        verifyNoMoreInteractions(reportStatsService);
    }

    @Test
    @DisplayName("세 시계열 경로는 서로 다른 서비스 메서드에 닿는다")
    void seriesEndpointsReachDistinctServiceMethods() throws Exception {
        for (String endpoint : SERIES) {
            clearInvocations(reportStatsService);
            mockMvc.perform(get(BASE + endpoint).accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(0)));
            verifyPeriod(endpoint, null, null);
        }
    }
}
