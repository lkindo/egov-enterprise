package nuri.api.controller.foundation.controller.system.stats;

import nuri.business.service.stats.ReportStatsService;
import nuri.business.test.BaseControllerTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 사용자 홈 대시보드의 접속 추이 API 동등성 고정(Phase 0c).
 *
 * <p>통계 서비스·DTO 가 모듈을 옮겨도 이 컨트롤러가 서비스에 넘기는 기간과 응답 형태는 같아야 한다.
 */
@DisplayName("StatisticsUserApiController 접속 추이 계약")
class StatisticsUserApiControllerTest extends BaseControllerTest {

    private static final String CONNECT = "/api/v1/statistics/connect";
    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");

    private ReportStatsService reportStatsService;

    @Override
    protected Object getController() {
        reportStatsService = mock(ReportStatsService.class);
        return new StatisticsUserApiController(reportStatsService);
    }

    @Test
    @DisplayName("행 순서를 그대로 두고 건수는 숫자 타입과 무관하게 정수로 싣는다")
    void connect_KeepsServiceOrderAndNarrowsAnyNumber() throws Exception {
        when(reportStatsService.getConnectStatsByDate(anyString(), anyString())).thenReturn(List.of(
                new Object[]{"2026-08-05", 4L},
                new Object[]{"2026-08-06", BigInteger.valueOf(9)},
                new Object[]{"2026-08-07", new BigDecimal("2")}));

        mockMvc.perform(get(CONNECT).param("fromDate", "20260805").param("toDate", "20260807")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0].statsDate").value("2026-08-05"))
                .andExpect(jsonPath("$.data[0].statsCo").value(4))
                .andExpect(jsonPath("$.data[1].statsDate").value("2026-08-06"))
                .andExpect(jsonPath("$.data[1].statsCo").value(9))
                .andExpect(jsonPath("$.data[2].statsDate").value("2026-08-07"))
                .andExpect(jsonPath("$.data[2].statsCo").value(2));
    }

    @Test
    @DisplayName("받은 기간은 형식을 바꾸지 않고 그대로 넘긴다")
    void connect_PassesExplicitPeriodVerbatim() throws Exception {
        mockMvc.perform(get(CONNECT).param("fromDate", "2026-08-01").param("toDate", "20260831")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        assertThat(capturedPeriods(1).get(0)).containsExactly("2026-08-01", "20260831");
    }

    @Test
    @DisplayName("기간을 비우면 오늘(yyyyMMdd)까지 한 달 전부터를 서비스에 넘긴다")
    void connect_OmittedPeriodDefaultsToOneMonthEndingToday() throws Exception {
        LocalDate before = LocalDate.now();
        mockMvc.perform(get(CONNECT).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(0)));
        mockMvc.perform(get(CONNECT).param("fromDate", "").param("toDate", "")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        LocalDate after = LocalDate.now();

        // 자정을 넘기며 실행돼도 호출 직전·직후 어느 한쪽의 기본값과 같아야 한다. 빈 문자열도 생략과 같다.
        for (List<String> period : capturedPeriods(2)) {
            assertThat(period).isIn(List.of(before.minusMonths(1).format(YMD), before.format(YMD)),
                    List.of(after.minusMonths(1).format(YMD), after.format(YMD)));
        }
    }

    /** 시작일 기본값은 받은 종료일이 아니라 오늘에서 센다 — 현행 그대로 고정한다. */
    @Test
    @DisplayName("한쪽만 주면 빈 쪽만 오늘 기준 기본값으로 채운다")
    void connect_PartialPeriodFillsOnlyTheMissingSideFromToday() throws Exception {
        LocalDate before = LocalDate.now();
        mockMvc.perform(get(CONNECT).param("toDate", "20200131").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        mockMvc.perform(get(CONNECT).param("fromDate", "20200101").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        LocalDate after = LocalDate.now();

        List<List<String>> periods = capturedPeriods(2);
        assertThat(periods.get(0)).isIn(List.of(before.minusMonths(1).format(YMD), "20200131"),
                List.of(after.minusMonths(1).format(YMD), "20200131"));
        assertThat(periods.get(1)).isIn(List.of("20200101", before.format(YMD)),
                List.of("20200101", after.format(YMD)));
    }

    /** 접속 통계 하나만 불렸는지 확인하고, 넘긴 [시작일, 종료일]을 호출 순서대로 돌려준다. */
    private List<List<String>> capturedPeriods(int calls) {
        ArgumentCaptor<String> from = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> to = ArgumentCaptor.forClass(String.class);
        verify(reportStatsService, times(calls)).getConnectStatsByDate(from.capture(), to.capture());
        verifyNoMoreInteractions(reportStatsService);
        List<List<String>> periods = new ArrayList<>();
        for (int i = 0; i < calls; i++) {
            periods.add(List.of(from.getAllValues().get(i), to.getAllValues().get(i)));
        }
        return periods;
    }
}
