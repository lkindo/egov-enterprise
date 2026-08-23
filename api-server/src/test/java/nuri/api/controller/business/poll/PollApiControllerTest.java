package nuri.api.controller.business.poll;
 
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.service.survey.OnlinePollService;
import nuri.business.service.survey.dto.OnlinePollArticleDto;
import nuri.business.service.survey.dto.OnlinePollManageDto;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;
 
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
                .pollSn(1L)
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
                .andExpect(jsonPath("$.data.list[0].pollSn").value(1))
                .andExpect(jsonPath("$.data.list[0].pollNm").value("테스트 설문"));
    }
 
    @Test
    @DisplayName("설문 상세 조회 성공")
    void getPoll_Success() throws Exception {
        // Given
        OnlinePollManageDto poll = OnlinePollManageDto.builder()
                .pollSn(1L)
                .pollNm("테스트 설문")
                .build();
        given(pollService.getPoll(1L)).willReturn(poll);
 
        // When & Then
        mockMvc.perform(get("/api/v1/polls/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.pollSn").value(1))
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
                .content("{\"pollNm\":\"신규 설문\",\"pollBgngYmd\":\"20260520\",\"pollEndYmd\":\"20260525\"}")
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
        mockMvc.perform(put("/api/v1/polls/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pollSn\":999, \"pollNm\":\"수정 설문\",\"pollBgngYmd\":\"20260520\",\"pollEndYmd\":\"20260525\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
 
    @Test
    @DisplayName("설문 삭제 성공")
    void deletePoll_Success() throws Exception {
        // Given
        willDoNothing().given(pollService).deletePoll(1L);
 
        // When & Then
        mockMvc.perform(delete("/api/v1/polls/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
 
    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("설문 참여(투표) 성공")
    void vote_Success() throws Exception {
        // Given
        willDoNothing().given(pollService).vote(eq(1L), eq(11L), eq("testUser"));
 
        // When & Then
        mockMvc.perform(post("/api/v1/polls/1/vote/11")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
 
    @Test
    @DisplayName("설문 항목 목록 조회 성공")
    void getPollItems_Success() throws Exception {
        // Given
        OnlinePollArticleDto item = OnlinePollArticleDto.builder()
                .pollArtclSn(11L)
                .pollSn(1L)
                .pollArtclNm("항목 1")
                .pollIemCo(10L)
                .build();
        given(pollService.getPollItemList(1L)).willReturn(List.of(item));
 
        // When & Then
        mockMvc.perform(get("/api/v1/polls/1/items")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].pollArtclSn").value(11))
                .andExpect(jsonPath("$.data[0].pollArtclNm").value("항목 1"));
    }
}
