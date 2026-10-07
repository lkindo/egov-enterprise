package nuri.api.controller.foundation.controller.system.stats;

import nuri.business.test.BaseControllerTest;
import nuri.business.service.stats.ReportStatsService;
import nuri.business.service.stats.dto.SummaryStatsDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.aMapWithSize;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class StatisticsApiControllerTest extends BaseControllerTest {

    private ReportStatsService reportStatsService;

    @Override
    protected Object getController() {
        reportStatsService = mock(ReportStatsService.class);
        return new StatisticsApiController(reportStatsService);
    }

    @Test
    public void getReportStats_ShouldReturnStats() throws Exception {
        List<Object[]> mockStats = new ArrayList<>();
        mockStats.add(new Object[]{"20260501", 10});
        mockStats.add(new Object[]{"20260502", 15});

        when(reportStatsService.getReprtStatsByDate(anyString(), anyString())).thenReturn(mockStats);

        mockMvc.perform(get("/api/v1/admin/system/statistics/report")
                .param("fromDate", "20260501")
                .param("toDate", "20260502")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].statsDate").value("20260501"))
                .andExpect(jsonPath("$.data[0].statsCo").value(10))
                .andExpect(jsonPath("$.data[1].statsDate").value("20260502"))
                .andExpect(jsonPath("$.data[1].statsCo").value(15));
    }

    @Test
    public void getReportStats_WithDefaultDates_ShouldReturnStats() throws Exception {
        List<Object[]> mockStats = new ArrayList<>();
        mockStats.add(new Object[]{"20260520", 5});

        when(reportStatsService.getReprtStatsByDate(anyString(), anyString())).thenReturn(mockStats);

        mockMvc.perform(get("/api/v1/admin/system/statistics/report")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    public void getDataUsageStats_ShouldReturnStats() throws Exception {
        List<Object[]> mockStats = new ArrayList<>();
        mockStats.add(new Object[]{"20260501", 20});

        when(reportStatsService.getDtaUseStatsByDate(anyString(), anyString())).thenReturn(mockStats);

        mockMvc.perform(get("/api/v1/admin/system/statistics/data-usage")
                .param("fromDate", "20260501")
                .param("toDate", "20260502")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].statsDate").value("20260501"))
                .andExpect(jsonPath("$.data[0].statsCo").value(20));
    }

    @Test
    public void getBbsStats_ShouldReturnStats() throws Exception {
        List<Object[]> mockStats = new ArrayList<>();
        mockStats.add(new Object[]{"20260501", 30});

        when(reportStatsService.getBbsStatsByDate(anyString(), anyString())).thenReturn(mockStats);

        mockMvc.perform(get("/api/v1/admin/system/statistics/bbs")
                .param("fromDate", "20260501")
                .param("toDate", "20260502")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].statsDate").value("20260501"))
                .andExpect(jsonPath("$.data[0].statsCo").value(30));
    }

    @Test
    public void getUserStats_ShouldReturnStats() throws Exception {
        List<Object[]> mockStats = new ArrayList<>();
        mockStats.add(new Object[]{"20260501", 40});

        when(reportStatsService.getUserStatsByDate(anyString(), anyString())).thenReturn(mockStats);

        mockMvc.perform(get("/api/v1/admin/system/statistics/user")
                .param("fromDate", "20260501")
                .param("toDate", "20260502")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].statsDate").value("20260501"))
                .andExpect(jsonPath("$.data[0].statsCo").value(40));
    }

    @Test
    public void getConnectStats_ShouldReturnStats() throws Exception {
        List<Object[]> mockStats = new ArrayList<>();
        mockStats.add(new Object[]{"20260501", 50});

        when(reportStatsService.getConnectStatsByDate(anyString(), anyString())).thenReturn(mockStats);

        mockMvc.perform(get("/api/v1/admin/system/statistics/connect")
                .param("fromDate", "20260501")
                .param("toDate", "20260502")
                .param("statsKind", "DAILY")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].statsDate").value("20260501"))
                .andExpect(jsonPath("$.data[0].statsCo").value(50));
    }

    // ── 동등성 고정(Phase 0c) ─────────────────────────────────────────────
    // 통계 서비스·DTO 가 모듈을 옮겨도 이 컨트롤러가 서비스에 넘기는 기간과 응답 형태는 같아야 한다.

    private static final String BASE = "/api/v1/admin/system/statistics/";
    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");

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

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"report", "data-usage", "bbs", "user", "connect"})
    @DisplayName("기간을 비우면 오늘(yyyyMMdd)까지 한 달 전부터를 서비스에 넘긴다")
    void omittedPeriod_DefaultsToOneMonthEndingToday(String endpoint) throws Exception {
        LocalDate before = LocalDate.now();
        mockMvc.perform(get(BASE + endpoint).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
        LocalDate after = LocalDate.now();

        // 자정을 넘기며 실행돼도 호출 직전·직후 어느 한쪽의 기본값과 같아야 한다.
        assertThat(capturedPeriod(endpoint))
                .isIn(List.of(before.minusMonths(1).format(YMD), before.format(YMD)),
                        List.of(after.minusMonths(1).format(YMD), after.format(YMD)));
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"report", "data-usage", "bbs", "user", "connect"})
    @DisplayName("빈 문자열 기간도 생략과 같다")
    void blankPeriod_IsTreatedAsOmitted(String endpoint) throws Exception {
        LocalDate before = LocalDate.now();
        mockMvc.perform(get(BASE + endpoint).param("fromDate", "").param("toDate", "")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        LocalDate after = LocalDate.now();

        assertThat(capturedPeriod(endpoint))
                .isIn(List.of(before.minusMonths(1).format(YMD), before.format(YMD)),
                        List.of(after.minusMonths(1).format(YMD), after.format(YMD)));
    }

    /** 시작일 기본값은 받은 종료일이 아니라 오늘에서 센다 — 현행 그대로 고정한다. */
    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"report", "data-usage", "bbs", "user", "connect"})
    @DisplayName("한쪽만 주면 빈 쪽만 오늘 기준 기본값으로 채운다")
    void partialPeriod_FillsOnlyTheMissingSideFromToday(String endpoint) throws Exception {
        LocalDate before = LocalDate.now();
        mockMvc.perform(get(BASE + endpoint).param("toDate", "20200131").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        mockMvc.perform(get(BASE + endpoint).param("fromDate", "20200101").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        LocalDate after = LocalDate.now();

        List<List<String>> periods = capturedPeriods(endpoint, 2);
        assertThat(periods.get(0)).isIn(List.of(before.minusMonths(1).format(YMD), "20200131"),
                List.of(after.minusMonths(1).format(YMD), "20200131"));
        assertThat(periods.get(1)).isIn(List.of("20200101", before.format(YMD)),
                List.of("20200101", after.format(YMD)));
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"report", "data-usage", "bbs", "user", "connect"})
    @DisplayName("받은 기간은 형식을 바꾸지 않고 그대로 넘긴다")
    void explicitPeriod_IsPassedVerbatim(String endpoint) throws Exception {
        MockHttpServletRequestBuilder request = get(BASE + endpoint)
                .param("fromDate", "2026-08-01")
                .param("toDate", "20260831")
                .accept(MediaType.APPLICATION_JSON);
        if ("connect".equals(endpoint)) {
            request.param("statsKind", "MONTHLY");
        }
        mockMvc.perform(request).andExpect(status().isOk());

        assertThat(capturedPeriod(endpoint)).containsExactly("2026-08-01", "20260831");
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"report", "data-usage", "bbs", "user", "connect"})
    @DisplayName("행 순서를 그대로 두고 건수는 숫자 타입과 무관하게 정수로 싣는다")
    void rows_KeepServiceOrderAndNarrowAnyNumber(String endpoint) throws Exception {
        List<Object[]> rows = List.of(
                new Object[]{"2026-08-07", 3L},
                new Object[]{"2026-08-06", BigInteger.valueOf(2)},
                new Object[]{"2026-08-05", new BigDecimal("1")});
        stub(endpoint, rows);

        mockMvc.perform(get(BASE + endpoint).param("fromDate", "20260805").param("toDate", "20260807")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0].statsDate").value("2026-08-07"))
                .andExpect(jsonPath("$.data[0].statsCo").value(3))
                .andExpect(jsonPath("$.data[1].statsDate").value("2026-08-06"))
                .andExpect(jsonPath("$.data[1].statsCo").value(2))
                .andExpect(jsonPath("$.data[2].statsDate").value("2026-08-05"))
                .andExpect(jsonPath("$.data[2].statsCo").value(1));
    }

    private void stub(String endpoint, List<Object[]> rows) {
        switch (endpoint) {
            case "report" -> when(reportStatsService.getReprtStatsByDate(anyString(), anyString())).thenReturn(rows);
            case "data-usage" -> when(reportStatsService.getDtaUseStatsByDate(anyString(), anyString())).thenReturn(rows);
            case "bbs" -> when(reportStatsService.getBbsStatsByDate(anyString(), anyString())).thenReturn(rows);
            case "user" -> when(reportStatsService.getUserStatsByDate(anyString(), anyString())).thenReturn(rows);
            case "connect" -> when(reportStatsService.getConnectStatsByDate(anyString(), anyString())).thenReturn(rows);
            default -> throw new IllegalArgumentException(endpoint);
        }
    }

    private List<String> capturedPeriod(String endpoint) {
        return capturedPeriods(endpoint, 1).get(0);
    }

    /** 엔드포인트마다 정해진 서비스 메서드 하나만 불렸는지 확인하고, 넘긴 [시작일, 종료일]을 호출 순서대로 돌려준다. */
    private List<List<String>> capturedPeriods(String endpoint, int calls) {
        ArgumentCaptor<String> from = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> to = ArgumentCaptor.forClass(String.class);
        switch (endpoint) {
            case "report" -> verify(reportStatsService, times(calls)).getReprtStatsByDate(from.capture(), to.capture());
            case "data-usage" -> verify(reportStatsService, times(calls)).getDtaUseStatsByDate(from.capture(), to.capture());
            case "bbs" -> verify(reportStatsService, times(calls)).getBbsStatsByDate(from.capture(), to.capture());
            case "user" -> verify(reportStatsService, times(calls)).getUserStatsByDate(from.capture(), to.capture());
            case "connect" -> verify(reportStatsService, times(calls)).getConnectStatsByDate(from.capture(), to.capture());
            default -> throw new IllegalArgumentException(endpoint);
        }
        verifyNoMoreInteractions(reportStatsService);
        List<List<String>> periods = new ArrayList<>();
        for (int i = 0; i < calls; i++) {
            periods.add(List.of(from.getAllValues().get(i), to.getAllValues().get(i)));
        }
        return periods;
    }
}
