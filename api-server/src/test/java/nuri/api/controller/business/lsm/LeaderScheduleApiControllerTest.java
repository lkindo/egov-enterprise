package nuri.api.controller.business.lsm;

import nuri.business.service.schedule.EgovLeaderScheduleService;
import nuri.business.service.schedule.dto.LeaderScheduleDto;
import nuri.business.service.schedule.dto.LeaderStatusDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(LeaderScheduleApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("LeaderScheduleApiController 테스트")
class LeaderScheduleApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private EgovLeaderScheduleService leaderScheduleService;

    @Test
    @DisplayName("간부 일정 목록 조회 성공")
    void getLeaderSchedules_Success() throws Exception {
        // Given
        Page<LeaderScheduleDto> page = new PageImpl<>(List.of(LeaderScheduleDto.builder().schdlId("L1").build()));
        given(leaderScheduleService.getLeaderScheduleList(any(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/leader-schedules")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").isArray());
    }

    @Test
    @DisplayName("간부 상태 목록 조회 성공")
    void getLeaderStatuses_Success() throws Exception {
        // Given
        Page<LeaderStatusDto> page = new PageImpl<>(List.of(LeaderStatusDto.builder().leaderId("LEADER1").build()));
        given(leaderScheduleService.getLeaderStatusList(any(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/leader-schedules/status")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").isArray());
    }
}
