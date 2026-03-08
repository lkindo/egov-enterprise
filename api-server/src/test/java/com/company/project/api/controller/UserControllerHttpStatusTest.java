package com.company.project.api.controller;

import com.company.project.config.MinimalTestConfig;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
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

@SpringBootTest(classes = MinimalTestConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class UserControllerHttpStatusTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private UserService userService;

        @Test
        @DisplayName("POST /api/v1/users/signup - Success (200 OK)")
        void signup_success_returns200() throws Exception {
                // Given
                UserResponse response = new UserResponse(
                                "newUser",
                                "New User",
                                com.company.project.domain.user.entity.Role.USER);

                when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

                String requestBody = """
                                {
                                  "userId": "newUser",
                                  "password": "password123!",
                                  "userNm": "New User",
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
        @DisplayName("POST /api/v1/users/signup - Duplicate ID (400 Bad Request)")
        void signup_fail_duplicateUserId_returns400() throws Exception {
                // Given
                doThrow(new BusinessException(ErrorCode.DUPLICATE_USER_ID))
                                .when(userService).signup(any(UserSignupRequest.class));

                String requestBody = """
                                {
                                  "userId": "existingUser",
                                  "password": "password123!",
                                  "userNm": "Existing User",
                                  "passwordHint": "hint",
                                  "passwordCnsr": "answer",
                                  "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                                .andExpect(status().isConflict())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.code").value(ErrorCode.DUPLICATE_USER_ID.getCode()));
        }

        @Test
        @DisplayName("GET /api/v1/users - Success (200 OK)")
        void getUserList_success_returns200() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                UserDto.builder()
                                                .userId("user1")
                                                .userNm("User1")
                                                .esntlId("USR001")
                                                .build());

                when(userService.getUserList()).thenReturn(userList);

                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
        }

        @Test
        @DisplayName("GET /api/v1/users/paged - Success (200 OK)")
        void getPagedUserList_success_returns200() throws Exception {
                // Given - PageImpl은 3인자 생성자 필수 (Jackson 직렬화 오류 방지)
                java.util.List<UserDto> content = Arrays.asList(
                                UserDto.builder()
                                                .userId("user1")
                                                .userNm("User1")
                                                .esntlId("USR001")
                                                .build());
                org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0,
                                10);
                org.springframework.data.domain.Page<UserDto> userPage = new org.springframework.data.domain.PageImpl<>(
                                content, pageable, content.size());

                when(userService.getPagedUserList(any(org.springframework.data.domain.Pageable.class)))
                                .thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/api/v1/users/paged")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
        }

        @Test
        @DisplayName("GET /api/v1/users/paged - Invalid Page (400 Bad Request)")
        void getPagedUserList_fail_invalidPage_returns400() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/paged?page=-1&size=10")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("POST /api/v1/users/signup - Validation Error (400 Bad Request)")
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
        @DisplayName("POST /api/v1/users/signup - Internal Error (500 Internal Server Error)")
        void signup_fail_internalError_returns500() throws Exception {
                // Given
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new RuntimeException("Internal server error"));

                String requestBody = """
                                {
                                  "userId": "newUser",
                                  "password": "password123!",
                                  "userNm": "New User",
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
