package nuri.business.api.controller.poll;
 
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.service.system.service.survey.OnlinePollService;
import nuri.foundation.service.system.service.survey.dto.OnlinePollArticleDto;
import nuri.foundation.service.system.service.survey.dto.OnlinePollManageDto;
import nuri.foundation.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
 
import java.util.List;
 
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
 
@WebMvcTest(PollApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("PollApiController 테스트")
class PollApiControllerTest extends ControllerTestSupport {
 
    @MockitoBean
    private OnlinePollService pollService;
 
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
 
    @Test
    @DisplayName("설문 목록 조회 성공")
    void getPolls_Success() throws Exception {
        // Given
        OnlinePollManageDto poll = OnlinePollManageDto.builder()
                .pollId("POLL_001")
                .pollNm("테스트 설문")
                .build();
        Page<OnlinePollManageDto> page = new PageImpl<>(List.of(poll));
        given(pollService.getPollList(anyString(), any(Pageable.class))).willReturn(page);
 
        // When & Then
        mockMvc.perform(get("/api/v1/polls")
                .param("keyword", "테스트")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].pollId").value("POLL_001"))
                .andExpect(jsonPath("$.data.list[0].pollNm").value("테스트 설문"));
    }
 
    @Test
    @DisplayName("설문 상세 조회 성공")
    void getPoll_Success() throws Exception {
        // Given
        OnlinePollManageDto poll = OnlinePollManageDto.builder()
                .pollId("POLL_001")
                .pollNm("테스트 설문")
                .build();
        given(pollService.getPoll("POLL_001")).willReturn(poll);
 
        // When & Then
        mockMvc.perform(get("/api/v1/polls/POLL_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.pollId").value("POLL_001"))
                .andExpect(jsonPath("$.data.pollNm").value("테스트 설문"));
    }
 
    @Test
    @DisplayName("설문 등록 성공")
    void createPoll_Success() throws Exception {
        // Given
        willDoNothing().given(pollService).insertPoll(any(OnlinePollManageDto.class));
 
        // When & Then
        mockMvc.perform(post("/api/v1/polls")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pollNm\":\"신규 설문\",\"pollBgngYmd\":\"2026-05-20\",\"pollEndYmd\":\"2026-05-25\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
 
    @Test
    @DisplayName("설문 수정 성공")
    void updatePoll_Success() throws Exception {
        // Given
        willDoNothing().given(pollService).updatePoll(any(OnlinePollManageDto.class));
 
        // When & Then
        mockMvc.perform(put("/api/v1/polls/POLL_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pollNm\":\"수정 설문\",\"pollBgngYmd\":\"2026-05-20\",\"pollEndYmd\":\"2026-05-25\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
 
    @Test
    @DisplayName("설문 삭제 성공")
    void deletePoll_Success() throws Exception {
        // Given
        willDoNothing().given(pollService).deletePoll("POLL_001");
 
        // When & Then
        mockMvc.perform(delete("/api/v1/polls/POLL_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
 
    @Test
    @WithMockUser(username = "testUser")
    @DisplayName("설문 참여(투표) 성공")
    void vote_Success() throws Exception {
        // Given
        willDoNothing().given(pollService).vote(eq("POLL_001"), eq("ITEM_001"), eq("testUser"));
 
        // When & Then
        mockMvc.perform(post("/api/v1/polls/POLL_001/vote/ITEM_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
 
    @Test
    @DisplayName("설문 항목 목록 조회 성공")
    void getPollItems_Success() throws Exception {
        // Given
        OnlinePollArticleDto item = OnlinePollArticleDto.builder()
                .pollArtclId("ITEM_001")
                .pollId("POLL_001")
                .pollArtclNm("항목 1")
                .pollIemCo(10L)
                .build();
        given(pollService.getPollItemList("POLL_001")).willReturn(List.of(item));
 
        // When & Then
        mockMvc.perform(get("/api/v1/polls/POLL_001/items")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].pollArtclId").value("ITEM_001"))
                .andExpect(jsonPath("$.data[0].pollArtclNm").value("항목 1"));
    }
}
