package nuri.business.api.controller.board;

import nuri.business.service.board.BoardService;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.foundation.security.jwt.JwtTokenProvider;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BoardApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("BoardApiController 테스트")
class BoardApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private BoardService boardService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("게시글 목록 조회 성공")
    void getPosts_Success() throws Exception {
        // Given
        Page<BoardDto> page = new PageImpl<>(List.of(BoardDto.builder().id(1L).pstTtl("Subject").build()));
        given(boardService.getBoardPosts(anyString(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/boards/BBS_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].id").value(1));
    }

    @Test
    @DisplayName("게시글 상세 조회 성공")
    void getPost_Success() throws Exception {
        // Given
        given(boardService.getPostDetail(anyString(), anyLong())).willReturn(BoardDto.builder().id(1L).build());

        // When & Then
        mockMvc.perform(get("/api/v1/boards/BBS_001/posts/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));
    }

    @Test
    @WithMockUser(username = "testUser")
    @DisplayName("게시글 생성 성공")
    void createPost_Success() throws Exception {
        // Given
        given(boardService.createPost(anyString(), any(BoardSaveRequest.class))).willReturn(1L);

        // When & Then
        mockMvc.perform(post("/api/v1/boards/posts")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsId\":\"BBS_001\", \"pstTtl\":\"Subject\", \"pstCn\":\"Content\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(1));
    }
}
