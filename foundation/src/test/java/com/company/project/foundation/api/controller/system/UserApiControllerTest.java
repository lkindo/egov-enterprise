package com.company.project.foundation.api.controller.system;

import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.user.UserService;
import com.company.project.foundation.service.user.dto.UserDto;
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

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("UserApiController 테스트")
class UserApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @InjectMocks
    private UserApiController userApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(userApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("사용자 목록 조회 성공")
    void testGetUsers() throws Exception {
        // Given
        when(userService.getPagedUserList(any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/users")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("사용자 상세 조회 성공")
    void testGetUser() throws Exception {
        // Given
        UserDto dto = UserDto.builder()
                .userId("user01")
                .userNm("사용자 01")
                .build();
        when(userService.getUserById("user01")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/users/user01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value("user01"));
    }

    @Test
    @DisplayName("사용자 등록 성공")
    void testInsertUser() throws Exception {
        // Given
        UserDto dto = UserDto.builder()
                .userId("newUser")
                .userNm("신규 사용자")
                .password("password123!")
                .role("USER")
                .build();
        when(userService.registerUser(any(), any(), any(), any(), any(), any())).thenReturn("newUser");

        // When & Then
        mockMvc.perform(post("/api/v1/admin/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(userService, times(1)).registerUser(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("비밀번호 변경 성공")
    void testUpdatePassword() throws Exception {
        // Given
        Map<String, String> request = new HashMap<>();
        request.put("newPassword", "newPassword123!");

        // When & Then
        mockMvc.perform(patch("/api/v1/admin/users/user01/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(userService, times(1)).updatePasswordByAdmin(eq("user01"), anyString());
    }

    @Test
    @DisplayName("아이디 중복 확인 성공")
    void testCheckIdDplct() throws Exception {
        // Given
        when(userService.checkIdDplct("user01")).thenReturn(true);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/users/check-id")
                .param("userId", "user01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(true));
    }
}
