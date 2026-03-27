package com.company.project.foundation.api.controller.system;

import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.auth.UserAuthorityManageService;
import com.company.project.foundation.service.auth.dto.UserAuthorityDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("UserAuthorityApiController 테스트")
class UserAuthorityApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserAuthorityManageService userAuthorityManageService;

    @InjectMocks
    private UserAuthorityApiController userAuthorityApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(userAuthorityApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("사용자별 권한 목록 조회 성공")
    void testGetUserAuthorities() throws Exception {
        // Given
        when(userAuthorityManageService.selectUserAuthorityList(any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/user-authorities")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("사용자 권한 할당 저장 성공")
    void testSaveUserAuthorities() throws Exception {
        // Given
        List<UserAuthorityDto> userAuthorities = Arrays.asList(
                UserAuthorityDto.builder().uniqId("UNIQ_001").authorCode("ROLE_ADMIN").build()
        );

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/user-authorities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(userAuthorities)))
                .andExpect(status().isOk());

        verify(userAuthorityManageService, times(1)).saveUserAuthorities(anyList());
    }

    @Test
    @DisplayName("사용자 권한 할당 삭제 성공")
    void testDeleteUserAuthorities() throws Exception {
        // Given
        List<String> uniqIds = Arrays.asList("UNIQ_001", "UNIQ_002");

        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/user-authorities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(uniqIds)))
                .andExpect(status().isOk());

        verify(userAuthorityManageService, times(1)).deleteUserAuthorities(anyList());
    }
}
