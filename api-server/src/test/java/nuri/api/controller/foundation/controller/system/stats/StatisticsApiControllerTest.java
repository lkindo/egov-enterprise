package nuri.api.controller.foundation.controller.system.stats;

import nuri.business.test.BaseControllerTest;
import nuri.business.service.stats.ReportStatsService;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.ArrayList;
import java.util.List;

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
}
