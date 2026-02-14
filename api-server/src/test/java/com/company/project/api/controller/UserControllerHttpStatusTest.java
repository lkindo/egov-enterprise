package com.company.project.api.controller;

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
import org.springframework.test.web.servlet.MockMvc;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@AutoConfigureWebMvc
class UserControllerHttpStatusTest {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private UserService userService;

        @Test
        @DisplayName("POST /api/v1/users/signup - 성공 시 200 OK 반환")
        void signup_success_returns200() throws Exception {
                // Given

                UserResponse response = new UserResponse(
                                "newUser",
                                "신규 사용자",
                                com.company.project.domain.user.Role.USER);

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
        @DisplayName("POST /api/v1/users/signup - 중복 사용자 ID로 인한 400 Bad Request 반환")
        void signup_fail_duplicateUserId_returns400() throws Exception {
                // Given

                doThrow(new BusinessException(ErrorCode.DUPLICATE_USER_ID))
                                .when(userService).signup(any(UserSignupRequest.class));

                String requestBody = """
                                {
                                    "userId": "existingUser",
                                    "password": "password123!",
                                    "userNm": "기존 사용자",
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isBadRequest())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value(ErrorCode.DUPLICATE_USER_ID.getCode()));
        }

        @Test
        @DisplayName("GET /api/v1/users - 성공 시 200 OK 반환")
        void getUserList_success_returns200() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                new UserDto("user1", "사용자1", "USR001", null, null, null, null));

                when(userService.getUserList()).thenReturn(userList);

                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
        }

        @Test
        @DisplayName("GET /api/v1/users/paged - 성공 시 200 OK 반환")
        void getPagedUserList_success_returns200() throws Exception {
                // Given
                org.springframework.data.domain.Page<UserDto> userPage = new org.springframework.data.domain.PageImpl<>(
                                Arrays.asList(
                                                new UserDto("user1", "사용자1", "USR001", null, null, null, null)));

                when(userService.getPagedUserList(any(org.springframework.data.domain.Pageable.class)))
                                .thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/api/v1/users/paged")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
        }

        @Test
        @DisplayName("GET /api/v1/users/paged - 잘못된 페이지 번호로 인한 400 Bad Request 반환")
        void getPagedUserList_fail_invalidPage_returns400() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/paged?page=-1&size=10")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("POST /api/v1/users/signup - 유효성 검사 실패로 인한 400 Bad Request 반환")
        void signup_fail_validationError_returns400() throws Exception {
                // Given
                String invalidRequestBody = """
                                {
                                    "userId": "",
                                    "password": "123",
                                    "userNm": ""
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidRequestBody))
                                .andExpect(status().isBadRequest())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
        }

        @Test
        @DisplayName("POST /api/v1/users/signup - 서버 내부 오류로 인한 500 Internal Server Error 반환")
        void signup_fail_internalError_returns500() throws Exception {
                // Given

                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new RuntimeException("Internal server error"));

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
                                .andExpect(status().isInternalServerError())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(false));
        }
}