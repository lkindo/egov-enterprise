package nuri.api.controller.foundation.controller.system.service.survey;

import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.survey.OnlinePollService;
import nuri.business.service.survey.dto.OnlinePollManageDto;
import nuri.api.support.ApiHttpIntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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

// [2026-08-20] @IntegrationTest → @ApiHttpIntegrationTest (사유는 stereotype javadoc 참조).
//   종전에는 mock-security 체인 위라 /api/v1/admin/system/polls 를 무자격으로 호출해도 200 이었다.
//   클래스 수준 ADMIN 주체는 관리 API 인가를 통과시키기 위한 것이며, vote() 의 메서드 수준
//   @WithMockCustomUser 는 getCurrentLoginId() 용 주체 주입이라 그대로 둔다.
@ApiHttpIntegrationTest
@WithMockCustomUser(role = "ADMIN")
@DisplayName("OnlinePollApiController 통합 테스트(MockMvc)")
class OnlinePollApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OnlinePollService onlinePollService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("온라인 설문 목록 페이징 조회")
    void getPolls() throws Exception {
        OnlinePollManageDto dto = OnlinePollManageDto.builder().pollSn(1L).pollNm("Poll 1").build();
        given(onlinePollService.getPollList(any(), any())).willReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/v1/admin/system/polls"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].pollSn").value(1));
    }

    @Test
    @DisplayName("온라인 설문 상세 조회")
    void getPoll() throws Exception {
        OnlinePollManageDto dto = OnlinePollManageDto.builder().pollSn(1L).pollNm("Poll 1").build();
        given(onlinePollService.getPoll(1L)).willReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/polls/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pollSn").value(1));
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
    @WithMockCustomUser(username = "admin", esntlId = "ADMIN_ESNTL", role = "ADMIN")
    @DisplayName("온라인 설문 투표 처리")
    void vote() throws Exception {
        // 투표는 loginId(getCurrentLoginId)로 식별하므로 CustomUserDetails 주체가 필요하다.
        mockMvc.perform(post("/api/v1/admin/system/polls/1/vote")
                .param("pollArtclSn", "11"))
                .andExpect(status().isOk());
    }
}
