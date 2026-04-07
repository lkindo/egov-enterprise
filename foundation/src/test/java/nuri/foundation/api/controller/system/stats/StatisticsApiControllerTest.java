package nuri.foundation.api.controller.system.stats;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.stats.ReportStatsService;
import nuri.foundation.service.stats.StatsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("StatisticsApiController 테스트")
class StatisticsApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private StatsService statsService;

    @Mock
    private ReportStatsService reportStatsService;

    @InjectMocks
    private StatisticsApiController statisticsApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(statisticsApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("접속 통계 조회 성공")
    void testGetConnectStats() throws Exception {
        when(statsService.getConnectionStats(anyString(), anyString(), anyString()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/admin/system/statistics/connect")
                .param("fromDate", "20230101")
                .param("toDate", "20230131"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("게시판 통계 조회 성공")
    void testGetBbsStats() throws Exception {
        when(statsService.getBoardStats(anyString(), anyString(), anyString()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/admin/system/statistics/bbs"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("사용자 통계 조회 성공")
    void testGetUserStats() throws Exception {
        when(statsService.getUserStats(anyString(), anyString(), anyString()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/admin/system/statistics/user"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("화면 통계 조회 성공")
    void testGetScreenStats() throws Exception {
        when(statsService.getRequestStats(anyString(), anyString(), anyString()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/admin/system/statistics/screen"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("보고서 통계 조회 성공")
    void testGetReportStats() throws Exception {
        List<Object[]> stats = new ArrayList<>();
        stats.add(new Object[]{"20230101", 10});
        doReturn(stats).when(reportStatsService).getReprtStatsByDate(anyString(), anyString());

        mockMvc.perform(get("/api/v1/admin/system/statistics/report"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].statsCo").value(10));
    }

    @Test
    @DisplayName("자료이용현황 통계 조회 성공")
    void testGetDataUsageStats() throws Exception {
        List<Object[]> stats = new ArrayList<>();
        stats.add(new Object[]{"20230101", 5});
        doReturn(stats).when(reportStatsService).getDtaUseStatsByDate(anyString(), anyString());

        mockMvc.perform(get("/api/v1/admin/system/statistics/data-usage"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].statsCo").value(5));
    }
}
