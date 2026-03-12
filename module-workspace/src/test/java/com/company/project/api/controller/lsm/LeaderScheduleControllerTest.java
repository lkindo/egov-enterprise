package com.company.project.api.controller.lsm;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.schedule.EgovLeaderScheduleService;
import com.company.project.service.schedule.dto.LeaderScheduleDto;
import com.company.project.service.schedule.dto.LeaderStatusDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LeaderScheduleController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("LeaderScheduleController 테스트")
class LeaderScheduleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovLeaderScheduleService leaderScheduleService;

    @Test
    @DisplayName("간부 일정 목록 조회 성공")
    void getLeaderSchedules_Success() throws Exception {
        // Given
        Page<LeaderScheduleDto> page = new PageImpl<>(List.of(LeaderScheduleDto.builder().scheduleId("L1").build()));
        given(leaderScheduleService.getLeaderScheduleList(anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/leader-schedules")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("간부 상태 목록 조회 성공")
    void getLeaderStatuses_Success() throws Exception {
        // Given
        Page<LeaderStatusDto> page = new PageImpl<>(List.of(LeaderStatusDto.builder().leaderId("LEADER1").build()));
        given(leaderScheduleService.getLeaderStatusList(anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/leader-schedules/status")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
