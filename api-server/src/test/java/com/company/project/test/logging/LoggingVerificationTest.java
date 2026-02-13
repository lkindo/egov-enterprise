package com.company.project.test.logging;

import com.company.project.api.controller.UserController;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;

import java.util.logging.Level;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class LoggingVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    private Logger logger;

    @BeforeEach
    void setUp() {
        logger = LoggerFactory.getLogger(UserController.class);
    }

    @Test
    @DisplayName("예외 발생 시 에러 로그 기록 확인")
    void exception_occurs_logsError() throws Exception {
        // Given
        UserSignupRequest request = new UserSignupRequest(
                "duplicateUser",
                "password123!",
                "중복 사용자",
                "hint",
                "answer",
                com.company.project.domain.user.Role.USER
        );

        BusinessException expectedException = new BusinessException(ErrorCode.DUPLICATE_USER_ID);
        when(userService.signup(any(UserSignupRequest.class))).thenThrow(expectedException);

        String requestBody = """
                {
                    "userId": "duplicateUser",
                    "password": "password123!",
                    "userNm": "중복 사용자",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """;

        // Capture log messages
        ArgumentCaptor<String> logMessageCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Throwable> throwableCaptor = ArgumentCaptor.forClass(Throwable.class);

        // When
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody));

        // Then
        verify(logger, atLeastOnce()).error(logMessageCaptor.capture(), throwableCaptor.capture());
        
        // Verify that the logged message contains relevant information
        String loggedMessage = logMessageCaptor.getValue();
        assertThat(loggedMessage).contains("duplicateUser"); // Contains user ID
        assertThat(loggedMessage).contains("DUPLICATE_USER_ID"); // Contains error code
        
        // Verify that the logged exception is the expected one
        Throwable loggedException = throwableCaptor.getValue();
        assertThat(loggedException).isInstanceOf(BusinessException.class);
        assertThat(((BusinessException) loggedException).getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_USER_ID);
    }

    @Test
    @DisplayName("런타임 예외 발생 시 에러 로그 기록 확인")
    void runtimeException_occurs_logsError() throws Exception {
        // Given
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new RuntimeException("Unexpected error occurred"));

        String requestBody = """
                {
                    "userId": "testUser",
                    "password": "password123!",
                    "userNm": "테스트 사용자",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """;

        // When
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody));

        // Then
        verify(logger, atLeastOnce()).error(anyString(), any(Throwable.class));
    }

    @Test
    @DisplayName("정상 요청 시 정보 로그 기록 확인")
    void normalRequest_logsInfo() throws Exception {
        // Given
        when(userService.signup(any(UserSignupRequest.class))).thenReturn("testUser");

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

        // When
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody));

        // Then
        verify(logger, atLeastOnce()).info(anyString());
    }

    @Test
    @DisplayName("입력 검증 실패 시 경고 로그 기록 확인")
    void validationFailure_logsWarning() throws Exception {
        // Given
        String invalidRequestBody = """
                {
                    "userId": "",
                    "password": "123",
                    "userNm": ""
                }
                """;

        // When
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequestBody));

        // Then
        verify(logger, atLeastOnce()).warn(anyString());
    }

    @Test
    @DisplayName("사용자 조회 요청 시 접근 로그 기록 확인")
    void userLookupRequest_logsAccess() throws Exception {
        // Given
        when(userService.getUserById("testUser")).thenReturn(UserDto.builder()
                .userId("testUser")
                .userNm("테스트 사용자")
                .esntlId("USR00001")
                .build());

        // When
        mockMvc.perform(get("/api/v1/users/testUser")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        verify(logger, atLeastOnce()).info(anyString());
        // Verify that access log contains relevant information like user ID, timestamp, etc.
    }

    @Test
    @DisplayName("데이터베이스 연결 실패 시 에러 로그 기록 확인")
    void databaseConnectionFailure_logsError() throws Exception {
        // Given
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Connection to database failed"));

        // When
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        verify(logger, atLeastOnce()).error(anyString(), any(Throwable.class));
    }

    @Test
    @DisplayName("인증 실패 시 보안 로그 기록 확인")
    void authenticationFailure_logsSecurityEvent() throws Exception {
        // When
        mockMvc.perform(get("/api/v1/admin/users")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        verify(logger, atLeastOnce()).warn(anyString()); // Authentication failures might be logged as warnings
    }

    @Test
    @DisplayName("권한 없이 관리자 API 접근 시 보안 로그 기록 확인")
    void unauthorizedAdminAccess_logsSecurityEvent() throws Exception {
        // When
        mockMvc.perform(get("/api/v1/admin/users")
                .header("Authorization", "Bearer invalidToken")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        verify(logger, atLeastOnce()).warn(anyString()); // Unauthorized access attempts should be logged
    }

    @Test
    @DisplayName("SQL Injection 시도 감지 시 보안 로그 기록 확인")
    void sqlInjectionAttempt_logsSecurityEvent() throws Exception {
        // Given
        String maliciousParam = "'; DROP TABLE NEMPLYRINFO; --";

        // When
        mockMvc.perform(get("/api/v1/users/{id}", maliciousParam)
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        verify(logger, atLeastOnce()).warn(anyString()); // Suspicious activity should be logged
    }

    @Test
    @DisplayName("XSS 공격 시도 감지 시 보안 로그 기록 확인")
    void xssAttempt_logsSecurityEvent() throws Exception {
        // Given
        String requestBody = """
                {
                    "userId": "xssUser",
                    "password": "password123!",
                    "userNm": "<script>alert('XSS')</script>",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """;

        // When
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody));

        // Then
        verify(logger, atLeastOnce()).warn(anyString()); // Suspicious input should be logged
    }

    @Test
    @DisplayName("API 호출 시 성능 로그 기록 확인")
    void apiCall_logsPerformanceMetrics() throws Exception {
        // Given
        when(userService.getUserList()).thenReturn(Arrays.asList(
                UserDto.builder().userId("user1").userNm("사용자1").esntlId("USR001").build()
        ));

        // When
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        // Verify that performance logs are recorded (execution time, etc.)
        verify(logger, atLeastOnce()).info(argThat(message -> message.contains("Execution time")));
    }

    @Test
    @DisplayName("파일 업로드 요청 시 파일 관련 로그 기록 확인")
    void fileUploadRequest_logsFileOperation() throws Exception {
        // When
        mockMvc.perform(multipart("/api/v1/files/upload")
                .file("file", "test file content".getBytes())
                .contentType(MediaType.MULTIPART_FORM_DATA));

        // Then
        verify(logger, atLeastOnce()).info(anyString()); // File operation logs
    }

    @Test
    @DisplayName("장시간 실행 작업 시 워닝 로그 기록 확인")
    void longRunningOperation_logsWarning() throws Exception {
        // Given
        when(userService.getUserList()).thenAnswer(invocation -> {
            Thread.sleep(5000); // Simulate long running operation
            return Arrays.asList(UserDto.builder().userId("user1").userNm("사용자1").esntlId("USR001").build());
        });

        // When
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        verify(logger, atLeastOnce()).warn(anyString()); // Long running operation warning
    }

    @Test
    @DisplayName("메모리 부족 예외 발생 시 에러 로그 기록 확인")
    void outOfMemoryError_logsError() throws Exception {
        // Given
        when(userService.getUserList()).thenThrow(new OutOfMemoryError("Out of memory"));

        // When
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        verify(logger, atLeastOnce()).error(anyString(), any(Throwable.class));
    }

    @Test
    @DisplayName("스레드 풀 과부하 시 경고 로그 기록 확인")
    void threadPoolOverload_logsWarning() throws Exception {
        // Given
        when(userService.getUserList()).thenThrow(new RejectedExecutionException("Thread pool exhausted"));

        // When
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        verify(logger, atLeastOnce()).warn(anyString(), any(Throwable.class));
    }

    @Test
    @DisplayName("예외 발생 후 정상 로그 기록 지속 확인")
    void normalLogging_continuesAfterException() throws Exception {
        // Given - First request causes error
        when(userService.getUserById("errorUser"))
                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND));

        // When & Then - Error request
        mockMvc.perform(get("/api/v1/users/errorUser")
                .contentType(MediaType.APPLICATION_JSON));

        // Verify error was logged
        verify(logger, atLeastOnce()).error(anyString(), any(Throwable.class));

        // Given - Reset mock for normal response
        when(userService.getUserById("normalUser"))
                .thenReturn(UserDto.builder()
                        .userId("normalUser")
                        .userNm("정상 사용자")
                        .esntlId("USR00001")
                        .build());

        // When & Then - Normal request after error should still be logged normally
        mockMvc.perform(get("/api/v1/users/normalUser")
                .contentType(MediaType.APPLICATION_JSON));

        // Verify normal logging continues
        verify(logger, atLeast(2)).info(anyString()); // At least 2 info logs (one for each request)
    }

    @Test
    @DisplayName("로그 메시지에 추적 ID 포함 여부 확인")
    void logMessage_containsTraceId() throws Exception {
        // Given
        when(userService.getUserById("userWithTraceId"))
                .thenReturn(UserDto.builder()
                        .userId("userWithTraceId")
                        .userNm("추적 ID 사용자")
                        .esntlId("USR00001")
                        .build());

        // When
        mockMvc.perform(get("/api/v1/users/userWithTraceId")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        verify(logger, atLeastOnce()).info(argThat(message -> message.contains("traceId")));
    }

    @Test
    @DisplayName("예외 발생 시 스택 트레이스 로그 기록 확인")
    void exceptionStackTrace_logged() throws Exception {
        // Given
        RuntimeException exception = new RuntimeException("Test exception for stack trace");
        when(userService.getUserById("exceptionUser"))
                .thenThrow(exception);

        // When
        mockMvc.perform(get("/api/v1/users/exceptionUser")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        verify(logger, atLeastOnce()).error(anyString(), any(Throwable.class)); // Includes stack trace
    }

    @Test
    @DisplayName("보안 관련 이벤트 로그 포맷 일관성 확인")
    void securityEvent_logFormat_consistency() throws Exception {
        // Given
        when(userService.getUserById("securityEvent"))
                .thenThrow(new BusinessException(ErrorCode.UNAUTHORIZED));

        // When
        mockMvc.perform(get("/api/v1/users/securityEvent")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        verify(logger, atLeastOnce()).warn(argThat(message -> 
                message.contains("SECURITY") && message.contains("UNAUTHORIZED_ACCESS")));
    }

    @Test
    @DisplayName("API 요청/응답 로그 포맷 일관성 확인")
    void apiRequestResponse_logFormat_consistency() throws Exception {
        // Given
        when(userService.getUserById("logFormatTest"))
                .thenReturn(UserDto.builder()
                        .userId("logFormatTest")
                        .userNm("로그 포맷 테스트 사용자")
                        .esntlId("USR00001")
                        .build());

        // When
        mockMvc.perform(get("/api/v1/users/logFormatTest")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        verify(logger, atLeastOnce()).info(argThat(message -> 
                message.contains("REQUEST") || message.contains("RESPONSE")));
    }

    @Test
    @DisplayName("로깅 레벨 변경 시 동작 확인")
    void loggingLevel_change_behaviorCheck() throws Exception {
        // Given
        when(userService.getUserById("logLevelTest"))
                .thenReturn(UserDto.builder()
                        .userId("logLevelTest")
                        .userNm("로깅 레벨 테스트 사용자")
                        .esntlId("USR00001")
                        .build());

        // When
        mockMvc.perform(get("/api/v1/users/logLevelTest")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        // Verify that logs are generated according to the configured log level
        verify(logger, atLeastOnce()).info(anyString());
        verify(logger, never()).debug(anyString()); // Debug logs should not appear with default config
    }
}