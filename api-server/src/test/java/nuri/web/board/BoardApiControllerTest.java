package nuri.web.board;

import nuri.business.api.controller.board.BoardApiController;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.business.service.board.BoardService;
import nuri.business.service.board.dto.BoardDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

/**
 * BoardApiController 테스트 (Standalone)
 */
class BoardApiControllerTest {

    private MockMvc mockMvc;
    private BoardService boardService;

    @BeforeEach
    void setUp() {
        boardService = mock(BoardService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new BoardApiController(boardService))
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/boards/{bbsId} - 성공")
    void getBoardPosts_success() throws Exception {
        String bbsId = "BBSMSTR_AAAAAAAAAAAA";
        List<BoardDto> list = new ArrayList<>();
        Page<BoardDto> page = new PageImpl<>(list, PageRequest.of(0, 10), 0);

        when(boardService.getBoardPosts(eq(bbsId), any(), any(), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/boards/" + bbsId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
