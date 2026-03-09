package com.company.project.web.board;

import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.Import;
import com.company.project.api.config.WebMvcConfig;
import com.company.project.api.controller.board.BoardController;
import com.company.project.config.MinimalTestConfig;
import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.service.board.BoardService;
import com.company.project.service.board.dto.BoardDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BoardController.class)
@ActiveProfiles("test")
class BoardApiControllerTest {

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({ BoardController.class, WebMvcConfig.class, MinimalTestConfig.class,
            com.company.project.api.common.exception.GlobalExceptionHandler.class })
    static class TestConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BoardService boardService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("GET /api/v1/boards/{bbsId} - 성공")
    void getBoardPosts_success() throws Exception {
        String bbsId = "BBSMSTR_AAAAAAAAAAAA";
        List<BoardDto> list = new ArrayList<>();
        Page<BoardDto> page = new PageImpl<>(list, PageRequest.of(0, 10), 0);

        when(boardService.getBoardPosts(eq(bbsId), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/boards/" + bbsId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
