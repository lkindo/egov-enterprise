package nuri.test.errorhandling;

import nuri.api.controller.UserApiController;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.user.UserService;
import nuri.foundation.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.data.domain.Pageable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 예외 처리 테스트 (Standalone)
 */
class ExceptionResponseTest {

    private MockMvc mockMvc;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new UserApiController(userService))
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("비즈니스 예외 발생 - 적절한 에러 응답 반환")
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
    @DisplayName("404 에러 발생 테스트")
    void userNotFound_occurs_returns404Error() throws Exception {
        when(userService.getUserById("nonexistentUser"))
                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND));

        mockMvc.perform(get("/api/v1/admin/system/users/nonexistentUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("U001"));
    }

    @Test
    @DisplayName("인증 에러 발생 - 401 에러 반환")
    void authenticationException_occurs_returns401Error() throws Exception {
        when(userService.getPagedUserList(any(Pageable.class)))
                .thenThrow(new BadCredentialsException("Authentication required"));

        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("접근 에러 발생 - 403 에러 반환")
    void accessDeniedException_occurs_returns403Error() throws Exception {
        when(userService.getPagedUserList(any(Pageable.class)))
                .thenThrow(new AccessDeniedException("Access denied"));

        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }
}
