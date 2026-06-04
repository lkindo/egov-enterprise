package nuri.test.logging;

import nuri.api.controller.UserApiController;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.core.exception.GlobalExceptionHandler;
import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.UserResponse;
import nuri.business.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 로깅 검증 테스트 (Standalone)
 * 
 * 참고: 실제 로깅 검증은 통합 테스트 환경에서 수행하는 것이 더 정확합니다.
 * 이 테스트는 컨트롤러와 예외 핸들러의 기본 동작을 검증합니다.
 */
public class LoggingVerificationTest {

    private MockMvc mockMvc;
    private UserService userService;
    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new UserApiController(userService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("예외 발생 시 에러 응답 반환")
    void exception_occurs_returnsErrorResponse() throws Exception {
        doThrow(new BusinessException(ErrorCode.DUPLICATE_USER_ID))
                .when(userService).signup(any(UserSignupRequest.class));

        String requestBody = """
                {
                  "userId": "duplicateUser",
                  "pswd": "password123!",
                  "userNm": "중복사용자",
                  "pswdHint": "hint",
                  "pswdCrans": "answer",
                  "role": "USER"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isConflict());

        // 예외가 발생했고, 적절한 HTTP 상태 코드가 반환되었음을 검증
        verify(userService, times(1)).signup(any(UserSignupRequest.class));
    }

    @Test
    @DisplayName("정상 요청 시 성공 응답 반환")
    void normalRequest_returnsSuccessResponse() throws Exception {
        when(userService.signup(any(UserSignupRequest.class)))
                .thenReturn(new UserResponse("newUser", "신규사용자", "USER"));


        String requestBody = """
                {
                  "userId": "newUser",
                  "pswd": "password123!",
                  "userNm": "신규사용자",
                  "pswdHint": "hint",
                  "pswdCrans": "answer",
                  "role": "USER"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk());

        // 서비스가 정상 호출되었음을 검증
        verify(userService, times(1)).signup(any(UserSignupRequest.class));
    }
}
