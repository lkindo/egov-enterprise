package com.company.project.api.controller.system.stats;

import com.company.project.service.stats.StatsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(StatisticsApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("StatisticsApiController 테스트")
class StatisticsApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StatsService statsService;

    private final String BASE_URL = "/api/v1/admin/system/stats";

    @Test
    @DisplayName("접속 통계 조회 성공")
    void getConnectStats_Success() throws Exception {
        given(statsService.getConnectionStats(anyString(), anyString(), anyString()))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get(BASE_URL + "/connect")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("게시판 통계 조회 성공")
    void getBbsStats_Success() throws Exception {
        given(statsService.getBoardStats(anyString(), anyString(), anyString()))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get(BASE_URL + "/bbs")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
