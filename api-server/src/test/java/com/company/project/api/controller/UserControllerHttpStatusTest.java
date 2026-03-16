package com.company.project.api.controller;

import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.api.interceptor.OperationalAuditInterceptor;
import java.util.Arrays;
import java.util.List;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class UserControllerHttpStatusTest {

    private MockMvc mockMvc;
    private UserService userService;
    private OperationalAuditInterceptor operationalAuditInterceptor;

    @BeforeEach
    void setUp() throws Exception {
        userService = mock(UserService.class);
        operationalAuditInterceptor = mock(OperationalAuditInterceptor.class);
        when(operationalAuditInterceptor.preHandle(any(), any(), any())).thenReturn(true);

        mockMvc = MockMvcBuilders.standaloneSetup(new UserController(userService))
                .addInterceptors(operationalAuditInterceptor)
                .setControllerAdvice(new com.company.project.core.exception.GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/users/signup - Success (200 OK)")
    void signup_success_returns200() throws Exception {
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

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("POST /api/v1/users/signup - Duplicate ID (409 Conflict)")
    void signup_fail_duplicateUserId_returns409() throws Exception {
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

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isConflict())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value(ErrorCode.DUPLICATE_USER_ID.getCode()));
    }

    @Test
    @DisplayName("GET /api/v1/users - Success (200 OK)")
    void getUserList_success_returns200() throws Exception {
        List<UserDto> userList = Arrays.asList(
                UserDto.builder()
                        .userId("user1")
                        .userNm("User1")
                        .esntlId("USR001")
                        .build());

        when(userService.getUserList()).thenReturn(userList);

        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("GET /api/v1/users/paged - Success (200 OK)")
    void getPagedUserList_success_returns200() throws Exception {
        java.util.List<UserDto> content = Arrays.asList(
                UserDto.builder()
                        .userId("user1")
                        .userNm("User1")
                        .esntlId("USR001")
                        .build());
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        org.springframework.data.domain.Page<UserDto> userPage = new org.springframework.data.domain.PageImpl<>(
                content, pageable, content.size());

        when(userService.getPagedUserList(any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(userPage);

        mockMvc.perform(get("/api/v1/users/paged")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("POST /api/v1/users/signup - Internal Error (500 Internal Server Error)")
    void signup_fail_internalError_returns500() throws Exception {
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

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false));
    }
}
