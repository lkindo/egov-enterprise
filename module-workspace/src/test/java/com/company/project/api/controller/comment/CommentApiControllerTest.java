package com.company.project.api.controller.comment;

import com.company.project.service.comment.CommentService;
import com.company.project.service.comment.dto.CommentDto;
import com.company.project.service.comment.dto.CommentSaveRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CommentController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("CommentController 테스트")
class CommentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommentService commentService;

    @Test
    @DisplayName("댓글 목록 조회 성공")
    void getComments_Success() throws Exception {
        // Given
        Page<CommentDto> page = new PageImpl<>(List.of(CommentDto.builder().id(1L).commentCn("Comment").build()));
        given(commentService.getComments(anyLong(), anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/comments")
                .param("nttId", "1")
                .param("bbsId", "BBS_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].id").value(1));
    }

    @Test
    @WithMockUser(username = "testUser")
    @DisplayName("댓글 생성 성공")
    void createComment_Success() throws Exception {
        // Given
        given(commentService.createComment(anyString(), anyString(), any(CommentSaveRequest.class))).willReturn(1L);

        // When & Then
        mockMvc.perform(post("/api/v1/comments")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nttId\":1, \"bbsId\":\"BBS_001\", \"commentCn\":\"Content\"}") // Fixed: Add bbsId
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(1));
    }

    @Test
    @WithMockUser(username = "testUser")
    @DisplayName("댓글 삭제 성공")
    void deleteComment_Success() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/comments/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
