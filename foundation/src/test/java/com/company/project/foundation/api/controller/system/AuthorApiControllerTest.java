package com.company.project.foundation.api.controller.system;

import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.auth.AuthorManageService;
import com.company.project.foundation.service.auth.dto.AuthorManageDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("AuthorApiController 테스트")
class AuthorApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthorManageService authorManageService;

    @InjectMocks
    private AuthorApiController authorApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(authorApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("권한 그룹 목록 조회 성공")
    void testGetAuthors() throws Exception {
        // Given
        when(authorManageService.selectAuthorList(any())).thenReturn(Collections.emptyList());
        when(authorManageService.selectAuthorListTotCnt(any())).thenReturn(0);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/authorities")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("권한 그룹 상세 조회 성공")
    void testGetAuthor() throws Exception {
        // Given
        AuthorManageDto dto = new AuthorManageDto();
        dto.setAuthorCode("ROLE_ADMIN");
        dto.setAuthorNm("관리자");
        when(authorManageService.selectAuthor("ROLE_ADMIN")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/authorities/ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.authorCode").value("ROLE_ADMIN"));
    }

    @Test
    @DisplayName("권한 그룹 등록 성공")
    void testCreateAuthor() throws Exception {
        // Given
        AuthorManageDto dto = new AuthorManageDto();
        dto.setAuthorCode("ROLE_NEW");
        dto.setAuthorNm("신규 권한");

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/authorities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(authorManageService, times(1)).insertAuthor(any(AuthorManageDto.class));
    }

    @Test
    @DisplayName("권한 그룹 삭제 성공")
    void testDeleteAuthor() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/authorities/ROLE_ADMIN"))
                .andExpect(status().isOk());

        verify(authorManageService, times(1)).deleteAuthor("ROLE_ADMIN");
    }
}