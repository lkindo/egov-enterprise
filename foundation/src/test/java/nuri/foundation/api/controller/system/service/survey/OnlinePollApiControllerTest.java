package nuri.foundation.api.controller.system.service.survey;

import nuri.foundation.service.system.service.survey.EgovOnlinePollService;
import nuri.foundation.service.system.service.survey.dto.OnlinePollManageDto;
import nuri.foundation.support.IntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@IntegrationTest
@AutoConfigureMockMvc
@DisplayName("OnlinePollApiController 통합 테스트(MockMvc)")
class OnlinePollApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovOnlinePollService onlinePollService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("온라인 설문 목록 페이징 조회")
    void getPolls() throws Exception {
        OnlinePollManageDto dto = OnlinePollManageDto.builder().pollId("P1").pollNm("Poll 1").build();
        given(onlinePollService.getPollList(any(), any())).willReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/v1/admin/system/polls"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].pollId").value("P1"));
    }

    @Test
    @DisplayName("온라인 설문 상세 조회")
    void getPoll() throws Exception {
        OnlinePollManageDto dto = OnlinePollManageDto.builder().pollId("P1").pollNm("Poll 1").build();
        given(onlinePollService.getPoll("P1")).willReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/polls/P1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pollId").value("P1"));
    }

    @Test
    @DisplayName("온라인 설문 등록")
    void insertPoll() throws Exception {
        OnlinePollManageDto dto = OnlinePollManageDto.builder().pollNm("New Poll").build();

        mockMvc.perform(post("/api/v1/admin/system/polls")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("온라인 설문 투표 처리")
    void vote() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/polls/P1/vote")
                .param("pollIemId", "I1"))
                .andExpect(status().isOk());
    }
}
