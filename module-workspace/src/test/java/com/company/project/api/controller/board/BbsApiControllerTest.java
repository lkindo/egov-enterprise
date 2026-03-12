package com.company.project.api.controller.board;

import com.company.project.service.board.EgovBoardService;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardSaveRequest;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BbsApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("BbsApiController 테스트")
class BbsApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovBoardService boardService;

    @Test
    @DisplayName("게시판 목록 조회 성공")
    void getBoardList_Success() throws Exception {
        // Given
        Page<BoardDto> page = new PageImpl<>(List.of(BoardDto.builder().id(1L).nttSj("Subject").build()));
        given(boardService.getBoardPosts(anyString(), any(PageRequest.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/bbs/BBSMSTR_1")
                .param("page", "0")
                .param("size", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.list[0].id").value(1));
    }

    @Test
    @DisplayName("게시글 상세 조회 성공")
    void getBoardDetail_Success() throws Exception {
        // Given
        given(boardService.getPostDetail(anyString(), anyLong())).willReturn(BoardDto.builder().id(1L).nttSj("Subject").build());

        // When & Then
        mockMvc.perform(get("/api/v1/bbs/BBSMSTR_1/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));
    }

    @Test
    @DisplayName("게시글 등록 성공 (파일 미포함)")
    void createBoard_Success() throws Exception {
        // Given
        given(boardService.createPost(anyString(), any(BoardSaveRequest.class))).willReturn(1L);

        MockMultipartFile boardPart = new MockMultipartFile("board", "", "application/json", "{\"bbsId\":\"BBSMSTR_1\", \"nttSj\":\"Subject\", \"nttCn\":\"Content\"}".getBytes());

        // When & Then
        mockMvc.perform(multipart("/api/v1/bbs/BBSMSTR_1")
                .file(boardPart)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.nttId").value(1));
    }
}
