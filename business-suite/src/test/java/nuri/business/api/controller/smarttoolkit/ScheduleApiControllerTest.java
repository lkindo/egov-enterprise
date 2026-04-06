package nuri.business.api.controller.smarttoolkit;

import nuri.business.service.schedule.EgovScheduleService;
import nuri.business.service.schedule.dto.ScheduleDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ScheduleApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("ScheduleApiController 테스트")
class ScheduleApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovScheduleService egovScheduleService;

    @Test
    @DisplayName("일정 목록 조회 성공")
    void getScheduleList_Success() throws Exception {
        // Given
        Page<ScheduleDto> page = new PageImpl<>(List.of(ScheduleDto.builder().schdulId("SCH1").schdulNm("Meeting").build()));
        given(egovScheduleService.getScheduleList(anyString(), any(PageRequest.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/schedules")
                .param("pageIndex", "1")
                .param("pageUnit", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].schdulId").value("SCH1"));
    }

    @Test
    @DisplayName("월간 일정 조회 성공")
    void getMonthlySchedule_Success() throws Exception {
        // Given
        given(egovScheduleService.getMonthlySchedule(anyString(), anyString())).willReturn(List.of(ScheduleDto.builder().schdulId("SCH1").build()));

        // When & Then
        mockMvc.perform(get("/api/v1/schedules/monthly")
                .param("yearMonth", "2023-10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].schdulId").value("SCH1"));
    }
}
