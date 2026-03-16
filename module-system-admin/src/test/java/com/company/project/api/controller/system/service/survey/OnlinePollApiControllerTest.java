package com.company.project.api.controller.system.service.survey;

import com.company.project.service.system.service.survey.EgovOnlinePollService;
import com.company.project.service.system.service.survey.dto.OnlinePollManageDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OnlinePollApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("OnlinePollApiController 테스트")
class OnlinePollApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovOnlinePollService onlinePollService;

    @Test
    @DisplayName("온라인 설문 목록 조회 성공")
    void getPolls_Success() throws Exception {
        // Given
        OnlinePollManageDto dto = new OnlinePollManageDto();
        dto.setPollId("P1");
        given(onlinePollService.getPollList(any(), any()))
                .willReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/polls")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].pollId").value("P1"));
    }
}
