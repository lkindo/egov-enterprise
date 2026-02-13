package com.company.project.api.controller;

import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@AutoConfigureWebMvc
class UserControllerAuthTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("POST /api/v1/users/signup - 인증 없이 접근 가능")
    void signup_accessibleWithoutAuth() throws Exception {
        // Given
        UserSignupRequest request = new UserSignupRequest(
                "newUser",
                "password123!",
                "신규 사용자",
                "hint",
                "answer",
                com.company.project.domain.user.Role.USER
        );

        UserResponse response = UserResponse.builder()
                .userId("newUser")
                .userNm("신규 사용자")
                .build();

        when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

        String requestBody = """
                {
                    "userId": "newUser",
                    "password": "password123!",
                    "userNm": "신규 사용자",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """;

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("GET /api/v1/users - 인증된 사용자만 접근 가능")
    @WithMockUser(roles = "USER")
    void getUserList_requiresAuth() throws Exception {
        // Given
        List<UserDto> userList = Arrays.asList(
                UserDto.builder().userId("user1").userNm("사용자1").esntlId("USR001").build()
        );

        when(userService.getUserList()).thenReturn(userList);

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("GET /api/v1/users - 인증되지 않은 사용자는 접근 불가 (401 Unauthorized)")
    void getUserList_unauthorizedUser_returns401() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/users/paged - 인증된 사용자만 접근 가능")
    @WithMockUser(roles = "USER")
    void getPagedUserList_requiresAuth() throws Exception {
        // Given
        org.springframework.data.domain.Page<UserDto> userPage = 
            new org.springframework.data.domain.PageImpl<>(Arrays.asList(
                UserDto.builder().userId("user1").userNm("사용자1").esntlId("USR001").build()
        ));

        when(userService.getPagedUserList(any(org.springframework.data.domain.Pageable.class))).thenReturn(userPage);

        // When & Then
        mockMvc.perform(get("/api/v1/users/paged")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("GET /api/v1/users/paged - 인증되지 않은 사용자는 접근 불가 (401 Unauthorized)")
    void getPagedUserList_unauthorizedUser_returns401() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/users/paged")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/users - ADMIN 역할만 접근 가능한 엔드포인트 테스트")
    @WithMockUser(roles = "ADMIN")
    void getUserList_withAdminRole_accessGranted() throws Exception {
        // Given
        List<UserDto> userList = Arrays.asList(
                UserDto.builder().userId("user1").userNm("사용자1").esntlId("USR001").build(),
                UserDto.builder().userId("user2").userNm("사용자2").esntlId("USR002").build()
        );

        when(userService.getUserList()).thenReturn(userList);

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    @DisplayName("GET /api/v1/users - USER 역할은 접근 가능한 엔드포인트 테스트")
    @WithMockUser(roles = "USER")
    void getUserList_withUserRole_accessGranted() throws Exception {
        // Given
        List<UserDto> userList = Arrays.asList(
                UserDto.builder().userId("user1").userNm("사용자1").esntlId("USR001").build()
        );

        when(userService.getUserList()).thenReturn(userList);

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test
    @DisplayName("JWT 토큰이 유효한 경우 API 접근 허용")
    void getUserList_withValidJwtToken_accessGranted() throws Exception {
        // Given
        String validToken = "validJwtToken";
        List<UserDto> userList = Arrays.asList(
                UserDto.builder().userId("user1").userNm("사용자1").esntlId("USR001").build()
        );

        when(jwtTokenProvider.resolveToken(any())).thenReturn(validToken);
        when(jwtTokenProvider.validateToken(validToken)).thenReturn(true);
        when(userService.getUserList()).thenReturn(userList);

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("JWT 토큰이 유효하지 않은 경우 API 접근 거부")
    void getUserList_withInvalidJwtToken_accessDenied() throws Exception {
        // Given
        String invalidToken = "invalidJwtToken";

        when(jwtTokenProvider.resolveToken(any())).thenReturn(invalidToken);
        when(jwtTokenProvider.validateToken(invalidToken)).thenReturn(false);

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .header("Authorization", "Bearer " + invalidToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("JWT 토큰이 없는 경우 API 접근 거부")
    void getUserList_withoutJwtToken_accessDenied() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}