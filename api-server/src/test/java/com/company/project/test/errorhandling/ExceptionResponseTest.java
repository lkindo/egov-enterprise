package com.company.project.test.errorhandling;

import com.company.project.api.controller.UserController;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.core.exception.GlobalExceptionHandler;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 예외 응답 검증 테스트 (Standalone)
 */
class ExceptionResponseTest {

    private MockMvc mockMvc;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new UserController(userService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("비즈니스 예외 발생 시 적절한 응답 반환")
    void businessException_occurs_returnsProperErrorResponse() throws Exception {
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new BusinessException(ErrorCode.DUPLICATE_USER_ID));

        String requestBody = """
                {
                  "userId": "duplicateUser",
                  "password": "password123!",
                  "userNm": "중복사용자",
                  "passwordHint": "hint",
                  "passwordCnsr": "answer",
                  "role": "USER"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("U002"));
    }

    @Test
    @DisplayName("런타임 예외 발생 시 500 에러 반환")
    void runtimeException_occurs_returns500Error() throws Exception {
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new RuntimeException("Internal server error"));

        String requestBody = """
                {
                  "userId": "testUser",
                  "password": "password123!",
                  "userNm": "사용자",
                  "passwordHint": "hint",
                  "passwordCnsr": "answer",
                  "role": "USER"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("유효성 검증 예외 발생 시 400 에러 반환")
    void validationException_occurs_returns400Error() throws Exception {
        String invalidRequestBody = """
                {
                  "userId": "",
                  "password": "123",
                  "userNm": ""
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("404 에러 반환 테스트")
    void userNotFound_occurs_returns404Error() throws Exception {
        when(userService.getUserById("nonexistentUser"))
                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND));

        mockMvc.perform(get("/api/v1/users/nonexistentUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("U001"));
    }

    @Test
    @DisplayName("인증 실패 예외 시 401 에러 반환")
    void authenticationException_occurs_returns401Error() throws Exception {
        when(userService.getUserList())
                .thenThrow(new BadCredentialsException("Authentication required"));

        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("인가 실패 예외 시 403 에러 반환")
    void accessDeniedException_occurs_returns403Error() throws Exception {
        when(userService.getUserList())
                .thenThrow(new AccessDeniedException("Access denied"));

        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }
}
