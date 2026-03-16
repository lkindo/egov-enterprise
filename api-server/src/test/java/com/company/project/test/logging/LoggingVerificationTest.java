package com.company.project.test.logging;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.Appender;
import com.company.project.api.controller.UserController;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.core.exception.GlobalExceptionHandler;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import com.company.project.domain.user.entity.Role;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 로깅 검증 테스트 (Standalone)
 */
public class LoggingVerificationTest {

    private MockMvc mockMvc;
    private UserService userService;
    private Appender<ILoggingEvent> mockAppender;
    private Logger controllerLogger;
    private Logger exceptionHandlerLogger;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        userService = mock(UserService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new UserController(userService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        mockAppender = mock(Appender.class);
        when(mockAppender.getName()).thenReturn("MockAppender");
        when(mockAppender.isStarted()).thenReturn(true); 

        controllerLogger = (Logger) LoggerFactory.getLogger(UserController.class);
        controllerLogger.addAppender(mockAppender);
        
        exceptionHandlerLogger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        exceptionHandlerLogger.addAppender(mockAppender);
    }

    @AfterEach
    void tearDown() {
        controllerLogger.detachAppender(mockAppender);
        exceptionHandlerLogger.detachAppender(mockAppender);
    }

    @Test
    @DisplayName("비즈니스 예외 발생 시 WARN 로그 기록")
    void exception_occurs_logsWarning() throws Exception {
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new BusinessException(ErrorCode.DUPLICATE_USER_ID));

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

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isConflict());

        ArgumentCaptor<ILoggingEvent> loggingEventCaptor = ArgumentCaptor.forClass(ILoggingEvent.class);
        verify(mockAppender, atLeastOnce()).doAppend(loggingEventCaptor.capture());

        boolean hasWarnLog = loggingEventCaptor.getAllValues().stream().anyMatch(event -> 
            event.getLevel().toString().equals("WARN") && event.getFormattedMessage().contains("Duplicate User ID")
        );
        assertThat(hasWarnLog).isTrue();
    }

    @Test
    @DisplayName("런타임 예외 발생 시 ERROR 로그 기록")
    void runtimeException_occurs_logsError() throws Exception {
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

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError());

        ArgumentCaptor<ILoggingEvent> loggingEventCaptor = ArgumentCaptor.forClass(ILoggingEvent.class);
        verify(mockAppender, atLeastOnce()).doAppend(loggingEventCaptor.capture());

        boolean hasErrorLog = loggingEventCaptor.getAllValues().stream()
                .anyMatch(event -> event.getLevel().toString().equals("ERROR"));
        assertThat(hasErrorLog).isTrue();
    }

    @Test
    @DisplayName("정상 회원가입 시 INFO 로그 기록")
    void normalRequest_logsInfo() throws Exception {
        when(userService.signup(any(UserSignupRequest.class)))
                .thenReturn(new UserResponse("newUser", "신규사용자", Role.USER));

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

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk());

        ArgumentCaptor<ILoggingEvent> loggingEventCaptor = ArgumentCaptor.forClass(ILoggingEvent.class);
        verify(mockAppender, atLeastOnce()).doAppend(loggingEventCaptor.capture());

        boolean hasInfoLog = loggingEventCaptor.getAllValues().stream()
                .anyMatch(event -> event.getLevel().toString().equals("INFO") && event.getFormattedMessage().contains("newUser"));
        assertThat(hasInfoLog).isTrue();
    }
}
