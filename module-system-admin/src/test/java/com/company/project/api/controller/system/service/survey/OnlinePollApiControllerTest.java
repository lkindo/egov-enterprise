package com.company.project.api.controller.system.service.survey;

import com.company.project.service.system.service.survey.EgovOnlinePollService;
import com.company.project.service.system.service.survey.dto.OnlinePollManageDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("OnlinePollApiController 단위 테스트")
class OnlinePollApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private EgovOnlinePollService onlinePollService;

    @InjectMocks
    private OnlinePollApiController onlinePollApiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(onlinePollApiController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("온라인 Poll 목록 페이징 조회 테스트")
    void getPollListTest() throws Exception {
        when(onlinePollService.getPollList(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/admin/system/polls")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("온라인 Poll 상세 조회 테스트")
    void getPollTest() throws Exception {
        String pollId = "POLL_001";
        OnlinePollManageDto dto = OnlinePollManageDto.builder().pollId(pollId).pollNm("Test Poll").build();
        when(onlinePollService.getPoll(pollId)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/polls/{pollId}", pollId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.pollId").value(pollId));
    }

    @Test
    @DisplayName("투표 처리 테스트")
    void voteTest() throws Exception {
        String pollId = "POLL_001";
        String itemId = "ITEM_001";

        mockMvc.perform(post("/api/v1/admin/system/polls/{pollId}/vote", pollId)
                        .param("pollIemId", itemId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
