package com.company.project.web.board;

import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.Import;
import com.company.project.api.config.WebMvcConfig;
import com.company.project.api.controller.board.BoardController;
import com.company.project.config.TestSecurityConfig;
import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.service.board.BoardService;
import com.company.project.service.board.dto.BoardDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.junit.jupiter.api.BeforeEach;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 게시??API 컨트롤러 ?�라?�스 ?�스?? */
@WebMvcTest(BoardController.class)
@ActiveProfiles("test")
class BoardApiControllerTest {

        @SpringBootConfiguration
        @EnableAutoConfiguration
        @Import({ BoardController.class, WebMvcConfig.class, TestSecurityConfig.class,
                        com.company.project.api.common.exception.GlobalExceptionHandler.class })
        static class TestConfig {
        }

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private BoardService boardService;

        @MockitoBean
        private JwtTokenProvider jwtTokenProvider;

        @MockitoBean(name = "dataSource")
        private javax.sql.DataSource dataSource;

        @MockitoBean
        private com.company.project.service.menu.MenuService menuService;

        @BeforeEach
        void setUp() {
                when(jwtTokenProvider.resolveToken(any())).thenReturn("mock-token");
                when(jwtTokenProvider.validateToken(any())).thenReturn(true);
                org.springframework.security.core.userdetails.UserDetails userDetails = org.springframework.security.core.userdetails.User
                                .withUsername("testuser")
                                .password("password")
                                .roles("USER")
                                .build();
                org.springframework.security.core.Authentication auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                when(jwtTokenProvider.getAuthentication(any())).thenReturn(auth);
        }

        @Test
        @DisplayName("게시�?목록 조회 - ?�증???�용??)
        void getBoardList_authenticated() throws Exception {
                // Given
                List<BoardDto> list = new ArrayList<>();
                Page<BoardDto> emptyPage = new PageImpl<>(list, PageRequest.of(0, 10), 0);
                when(boardService.getBoardPosts(eq("TEST_BBS"), any(Pageable.class))).thenReturn(emptyPage);

                // When & Then
                mockMvc.perform(get("/api/v1/boards/{bbsId}", "TEST_BBS")
                                .header("Authorization", "Bearer mock-token")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andDo(print())
                                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("게시�?목록 조회 - ?�증?��? ?��? ?�용??(401)")
        void getBoardList_unauthenticated() throws Exception {
                // Given
                when(jwtTokenProvider.resolveToken(any())).thenReturn(null);
                when(jwtTokenProvider.validateToken(any())).thenReturn(false);

                // When & Then
                mockMvc.perform(get("/api/v1/boards/{bbsId}", "TEST_BBS")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andDo(print())
                                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("존재?��? ?�는 게시??조회 (404)")
        void getBoardList_notFound() throws Exception {
                // Given
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
