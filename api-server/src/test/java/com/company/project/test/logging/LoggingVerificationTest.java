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
import com.company.project.domain.user.entity.Role;
import com.company.project.service.user.dto.UserResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.RejectedExecutionException;

import com.company.project.service.user.dto.UserDto;

@ExtendWith(SpringExtension.class)
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class LoggingVerificationTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
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
                BusinessException expectedException = new BusinessException(ErrorCode.DUPLICATE_USER_ID);
                when(userService.signup(any(UserSignupRequest.class))).thenThrow(expectedException);

                String requestBody = """
                                {
                                  "userId": "duplicateUser",
                                  "password": "password123!",
                                  "userNm": "사용자명",
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
        @DisplayName("예상치 못한 런타임 예외 에러 로그 기록 확인")
        void runtimeException_occurs_logsError() throws Exception {
                // Given
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new RuntimeException("Unexpected error occurred"));

                String requestBody = """
                                {
                                  "userId": "testUser",
                                  "password": "password123!",
                                  "userNm": "테스트사용자",
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
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenReturn(new UserResponse("testUser", "신규사용자", Role.USER));

                String requestBody = """
                                {
                                  "userId": "newUser",
                                  "password": "password123!",
                                  "userNm": "신규사용자",
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
        @DisplayName("유효성 검사 실패 시 경고 로그 기록 확인")
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
        @DisplayName("사용자 조회 시 접근 로그 기록 확인")
        void userLookupRequest_logsAccess() throws Exception {
                // Given
                when(userService.getUserById("testUser"))
                                .thenReturn(new UserDto("testUser", "테스트사용자", "USR00001", null, null, null, null));

                // When
                mockMvc.perform(get("/api/v1/users/testUser")
                                .contentType(MediaType.APPLICATION_JSON));

                // Then
                verify(logger, atLeastOnce()).info(anyString());
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
        @DisplayName("인증 실패 시 보안 이벤트 경고 로그 기록 확인")
        void authenticationFailure_logsSecurityEvent() throws Exception {
                // When
                mockMvc.perform(get("/api/v1/admin/users")
                                .contentType(MediaType.APPLICATION_JSON));

                // Then
                verify(logger, atLeastOnce()).warn(anyString()); // Authentication failures might be logged as warnings
        }

        @Test
        @DisplayName("권한 없는 사용자의 어드민 API 접근 시 보안 경고 로그 기록 확인")
        void unauthorizedAdminAccess_logsSecurityEvent() throws Exception {
                // When
                mockMvc.perform(get("/api/v1/admin/users")
                                .header("Authorization", "Bearer invalidToken")
                                .contentType(MediaType.APPLICATION_JSON));

                // Then
                verify(logger, atLeastOnce()).warn(anyString()); // Unauthorized access attempts should be logged
        }

        @Test
        @DisplayName("SQL 인젝션 시도 시 보안 이벤트 로깅 확인")
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
        @DisplayName("XSS 시도 시 보안 이벤트 로깅 확인")
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
        @DisplayName("API 호출 시 성능 지표 정보 로그 기록 확인")
        void apiCall_logsPerformanceMetrics() throws Exception {
                // Given
                when(userService.getUserList()).thenReturn(Arrays.asList(
                                new UserDto("user1", "유저1", "USR001", null, null, null, null)));

                // When
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON));

                // Then
                verify(logger, atLeastOnce()).info(argThat(message -> message.contains("Execution time")));
        }

        @Test
        @DisplayName("파일 업로드 요청 시 작업 내역 로그 기록 확인")
        void fileUploadRequest_logsFileOperation() throws Exception {
                // When
                mockMvc.perform(multipart("/api/v1/files/upload")
                                .file("file", "test file content".getBytes())
                                .contentType(MediaType.MULTIPART_FORM_DATA));

                // Then
                verify(logger, atLeastOnce()).info(anyString()); // File operation logs
        }

        @Test
        @DisplayName("오래 걸리는 작업 시 경고 로그 기록 확인")
        void longRunningOperation_logsWarning() throws Exception {
                // Given
                when(userService.getUserList()).thenAnswer(invocation -> {
                        Thread.sleep(5000); // Simulate long running operation
                        return Arrays.asList(
                                        new UserDto("user1", "유저1", "USR001", null, null, null, null));
                });

                // When
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON));

                // Then
                verify(logger, atLeastOnce()).warn(anyString()); // Long running operation warning
        }

        @Test
        @DisplayName("Out Of Memory 발생 에러 로그 기록 확인")
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
        @DisplayName("스레드 풀 초과 시 예외 경고 로그 기록 확인")
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
        @DisplayName("에러가 발생한 후의 정상 요청 인포 로그 기록 확인")
        void normalLogging_continuesAfterException() throws Exception {
                // Given - First request causes error
                when(userService.getUserById("errorUser"))
                                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND));

                // When & Then - Error request
                mockMvc.perform(get("/api/v1/users/errorUser")
                                .contentType(MediaType.APPLICATION_JSON));

                verify(logger, atLeastOnce()).error(anyString(), any(Throwable.class));

                // Given - Reset mock for normal response
                when(userService.getUserById("normalUser"))
                                .thenReturn(new UserDto("normalUser", "정상사용자", "USR00001", null, null, null, null));

                // When & Then - Normal request after error should still be logged normally
                mockMvc.perform(get("/api/v1/users/normalUser")
                                .contentType(MediaType.APPLICATION_JSON));

                // Verify normal logging continues
                verify(logger, atLeast(2)).info(anyString()); // At least 2 info logs (one for each request)
        }

        @Test
        @DisplayName("로그 메시지에 TraceId가 포함되어 있는지 확인")
        void logMessage_containsTraceId() throws Exception {
                // Given
                when(userService.getUserById("userWithTraceId"))
                                .thenReturn(new UserDto("userWithTraceId", "Trace ID 사용자", "USR00001", null, null, null,
                                                null));

                // When
                mockMvc.perform(get("/api/v1/users/userWithTraceId")
                                .contentType(MediaType.APPLICATION_JSON));

                // Then
                verify(logger, atLeastOnce()).info(argThat(message -> message.contains("traceId")));
        }

        @Test
        @DisplayName("예외 발생 시 StackTrace 로그 기록 확인")
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
        @DisplayName("보안 관련 이벤트 로그 기록 포맷 일관성 확인")
        void securityEvent_logFormat_consistency() throws Exception {
                // Given
                when(userService.getUserById("securityEvent"))
                                .thenThrow(new BusinessException(ErrorCode.UNAUTHORIZED));

                // When
                mockMvc.perform(get("/api/v1/users/securityEvent")
                                .contentType(MediaType.APPLICATION_JSON));

                // Then
                verify(logger, atLeastOnce()).warn(argThat(
                                message -> message.contains("SECURITY") && message.contains("UNAUTHORIZED_ACCESS")));
        }

        @Test
        @DisplayName("API 요청 및 응답 로그 포맷 일관성 확인")
        void apiRequestResponse_logFormat_consistency() throws Exception {
                // Given
                when(userService.getUserById("logFormatTest"))
                                .thenReturn(new UserDto("logFormatTest", "인포응답포맷", "USR00001", null, null, null,
                                                null));

                // When
                mockMvc.perform(get("/api/v1/users/logFormatTest")
                                .contentType(MediaType.APPLICATION_JSON));

                // Then
                verify(logger, atLeastOnce())
                                .info(argThat(message -> message.contains("REQUEST") || message.contains("RESPONSE")));
        }

        @Test
        @DisplayName("로그 출력 레벨 변경에 대한 동작 여부 확인")
        void loggingLevel_change_behaviorCheck() throws Exception {
                // Given
                when(userService.getUserById("logLevelTest"))
                                .thenReturn(new UserDto("logLevelTest", "로깅사용자", "USR00001", null, null, null,
                                                null));

                // When
                mockMvc.perform(get("/api/v1/users/logLevelTest")
                                .contentType(MediaType.APPLICATION_JSON));

                // Then
                verify(logger, atLeastOnce()).info(anyString());
                verify(logger, never()).debug(anyString()); // Debug logs should not appear with default config
        }
}
