package com.company.project.web.board;

import com.company.project.api.controller.board.BoardController;
import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.service.board.BoardService;
import com.company.project.service.board.dto.BoardDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.batch.BatchAutoConfiguration;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 게시판 API 컨트롤러 슬라이스 테스트
 */
@WebMvcTest(controllers = BoardController.class, excludeAutoConfiguration = {
        DataSourceAutoConfiguration.class,
        JpaRepositoriesAutoConfiguration.class,
        HibernateJpaAutoConfiguration.class,
        BatchAutoConfiguration.class
})
@ActiveProfiles("test")
class BoardApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BoardService boardService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private PasswordEncoder passwordEncoder;

    @MockBean
    private AuthenticationManager authenticationManager;

    @Test
    @DisplayName("게시물 목록 조회 - 인증된 사용자")
    void getBoardList_authenticated() throws Exception {
        // Given
        Page<BoardDto> emptyPage = new PageImpl<>(Collections.emptyList());
        when(boardService.getBoardPosts(eq("TEST_BBS"), any(Pageable.class))).thenReturn(emptyPage);
        when(jwtTokenProvider.validateToken(any())).thenReturn(true);

        // When & Then
        mockMvc.perform(get("/api/v1/boards/{bbsId}", "TEST_BBS")
                .header("Authorization", "Bearer mock-token")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("게시물 목록 조회 - 인증되지 않은 사용자 (401)")
    void getBoardList_unauthenticated() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/boards/{bbsId}", "TEST_BBS")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("존재하지 않는 게시판 조회 (404)")
    void getBoardList_notFound() throws Exception {
        // Given
        when(jwtTokenProvider.validateToken(any())).thenReturn(true);
        when(boardService.getBoardPosts(eq("NOT_EXIST"), any(Pageable.class)))
                .thenThrow(new com.company.project.core.exception.BusinessException(
                        com.company.project.core.exception.ErrorCode.RESOURCE_NOT_FOUND));

        // When & Then
        mockMvc.perform(get("/api/v1/boards/{bbsId}", "NOT_EXIST")
                .header("Authorization", "Bearer mock-token")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isNotFound());
    }
}
