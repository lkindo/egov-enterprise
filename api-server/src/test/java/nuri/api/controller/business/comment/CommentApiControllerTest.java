package nuri.api.controller.business.comment;

import nuri.business.service.comment.CommentService;
import nuri.business.service.comment.dto.CommentDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CommentApiController 테스트")
class CommentApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CommentService commentService;

    @InjectMocks
    private CommentApiController commentApiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(commentApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("댓글 목록 조회 성공")
    void getComments_Success() throws Exception {
        // Given
        Page<CommentDto> page = new PageImpl<>(List.of(
                CommentDto.builder()
                        .ansSn(1L)
                        .pstSn(1L)
                        .bbsId("BBS_001")
                        .ansCn("Comment")
                        .build()
        ));
        given(commentService.getComments(any(Long.class), anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/comments")
                .param("pstSn", "1")
                .param("bbsId", "BBS_001")
                .accept(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].ansSn").value(1));
    }

    @Test
    @DisplayName("댓글 생성 성공")
    void createComment_Success() throws Exception {
        // Given
        given(commentService.createComment(any(CommentDto.class))).willReturn(1L);

        // When & Then
        mockMvc.perform(post("/api/v1/comments")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pstSn\":\"1\", \"bbsId\":\"BBS_001\", \"ansCn\":\"Content\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(1));
    }

    @Test
    @DisplayName("댓글 삭제 성공")
    void deleteComment_Success() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/comments/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
