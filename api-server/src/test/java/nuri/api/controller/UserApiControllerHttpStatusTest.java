package nuri.api.controller;

import nuri.foundation.service.user.UserService;
import nuri.foundation.service.user.dto.UserResponse;
import nuri.foundation.service.user.dto.UserSignupRequest;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.api.interceptor.OperationalAuditInterceptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;


import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class UserApiControllerHttpStatusTest {

    private MockMvc mockMvc;
    private UserService userService;
    private OperationalAuditInterceptor operationalAuditInterceptor;

    @BeforeEach
    void setUp() throws Exception {
        userService = mock(UserService.class);
        operationalAuditInterceptor = mock(OperationalAuditInterceptor.class);
        when(operationalAuditInterceptor.preHandle(any(), any(), any())).thenReturn(true);

        mockMvc = MockMvcBuilders.standaloneSetup(new UserApiController(userService))
                .addInterceptors(operationalAuditInterceptor)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/users/signup - 성공 (200 OK)")
    void signup_success_returns200() throws Exception {
        UserResponse response = new UserResponse(
                "newUser",
                "New User",
                "USER");


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
    @DisplayName("POST /api/v1/users/signup - 중복 ID (409 Conflict)")
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
    @DisplayName("POST /api/v1/users/signup - 서버 내부 오류 (500 Internal Server Error)")
    void signup_fail_internalError_returns500() throws Exception {
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR));

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
