package nuri.business.api.controller.admin;

import nuri.business.service.comment.CommentService;
import nuri.business.service.comment.dto.CommentDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("CommentApiController (Admin) 단위 테스트")
class CommentApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CommentService commentService;

    @InjectMocks
    private CommentApiController commentApiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(commentApiController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("전체 댓글 목록 조회 - 키워드 없음")
    void getComments_NoKeyword() throws Exception {
        Page<CommentDto> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(commentService.getAllComments(any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/comments")
                        .param("pageIndex", "1")
                        .param("searchKeyword", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("전체 댓글 목록 조회 - 키워드 있음")
    void getComments_WithKeyword() throws Exception {
        Page<CommentDto> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(commentService.searchComments(eq("test"), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/comments")
                        .param("pageIndex", "1")
                        .param("searchKeyword", "test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("댓글 삭제")
    void deleteComment() throws Exception {
        doNothing().when(commentService).deleteComment(1L, "SYSTEM");

        mockMvc.perform(delete("/api/v1/admin/system/comments/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
