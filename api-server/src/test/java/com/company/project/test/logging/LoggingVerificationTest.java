package com.company.project.test.logging;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.Appender;
import com.company.project.api.controller.UserController;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.core.exception.GlobalExceptionHandler;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import com.company.project.domain.user.entity.Role;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@SpringBootTest(properties = "springdoc.api-docs.enabled=false")
@AutoConfigureMockMvc
@EnableWebMvc
@ActiveProfiles("test")
class LoggingVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    private Appender<ILoggingEvent> mockAppender;
    private Logger controllerLogger;
    private Logger exceptionHandlerLogger;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        mockAppender = mock(Appender.class);
        when(mockAppender.getName()).thenReturn("MockAppender");
        // Logback에서 Appender가 이벤트를 처리하려면 isStarted()가 true를 반환해야 함
        when(mockAppender.isStarted()).thenReturn(true); 

        // UserController 로거 부착 (정상 요청 INFO 로그 확인용)
        controllerLogger = (Logger) LoggerFactory.getLogger(UserController.class);
        controllerLogger.addAppender(mockAppender);
        
        // GlobalExceptionHandler 로거 부착 (예외 발생 시 WARN/ERROR 로그 확인용)
        exceptionHandlerLogger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        exceptionHandlerLogger.addAppender(mockAppender);
    }

    @AfterEach
    void tearDown() {
        controllerLogger.detachAppender(mockAppender);
        exceptionHandlerLogger.detachAppender(mockAppender);
    }

    @Test
    @DisplayName("비즈니스 예외 발생 시 에러 핸들러를 통한 WARN 로그 기록 확인")
    void exception_occurs_logsWarning() throws Exception {
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

        // When
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isConflict());

        // Then
        ArgumentCaptor<ILoggingEvent> loggingEventCaptor = ArgumentCaptor.forClass(ILoggingEvent.class);
        verify(mockAppender, atLeastOnce()).doAppend(loggingEventCaptor.capture());

        List<ILoggingEvent> events = loggingEventCaptor.getAllValues();
        boolean hasWarnLog = events.stream().anyMatch(event -> 
            event.getLevel().toString().equals("WARN") && event.getFormattedMessage().contains("Duplicate User ID")
        );
        assertThat(hasWarnLog).isTrue();
    }

    @Test
    @DisplayName("예상치 못한 런타임 예외 발생 시 ERROR 로그 기록 확인")
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
                .content(requestBody))
                .andExpect(status().isInternalServerError());

        // Then
        ArgumentCaptor<ILoggingEvent> loggingEventCaptor = ArgumentCaptor.forClass(ILoggingEvent.class);
        verify(mockAppender, atLeastOnce()).doAppend(loggingEventCaptor.capture());

        boolean hasErrorLog = loggingEventCaptor.getAllValues().stream()
                .anyMatch(event -> event.getLevel().toString().equals("ERROR"));
        assertThat(hasErrorLog).isTrue();
    }

    @Test
    @DisplayName("정상 회원가입 요청 시 컨트롤러에서 INFO 로그 기록 확인")
    void normalRequest_logsInfo() throws Exception {
        // Given
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

        // When
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk());

        // Then
        ArgumentCaptor<ILoggingEvent> loggingEventCaptor = ArgumentCaptor.forClass(ILoggingEvent.class);
        verify(mockAppender, atLeastOnce()).doAppend(loggingEventCaptor.capture());

        boolean hasInfoLog = loggingEventCaptor.getAllValues().stream()
                .anyMatch(event -> event.getLevel().toString().equals("INFO") && event.getFormattedMessage().contains("newUser"));
        assertThat(hasInfoLog).isTrue();
    }

    @Test
    @DisplayName("유효성 검사 실패 시 에러 핸들러를 통한 WARN 로그 기록 확인")
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
                .content(invalidRequestBody))
                .andExpect(status().isBadRequest());

        // Then
        ArgumentCaptor<ILoggingEvent> loggingEventCaptor = ArgumentCaptor.forClass(ILoggingEvent.class);
        verify(mockAppender, atLeastOnce()).doAppend(loggingEventCaptor.capture());

        boolean hasWarnLog = loggingEventCaptor.getAllValues().stream()
                .anyMatch(event -> event.getLevel().toString().equals("WARN") && event.getFormattedMessage().contains("Validation Failed"));
        assertThat(hasWarnLog).isTrue();
    }

    @Test
    @DisplayName("사용자 상세 조회 시 컨트롤러에서 INFO 로그 기록 확인")
    void userLookupRequest_logsAccess() throws Exception {
        // Given
        when(userService.getUserById("testUser"))
                .thenReturn(new UserDto("testUser", "테스트사용자", "USR00001", null, null, null, null));

        // When
        mockMvc.perform(get("/api/v1/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Then
        ArgumentCaptor<ILoggingEvent> loggingEventCaptor = ArgumentCaptor.forClass(ILoggingEvent.class);
        verify(mockAppender, atLeastOnce()).doAppend(loggingEventCaptor.capture());
        
        boolean hasInfoLog = loggingEventCaptor.getAllValues().stream()
                .anyMatch(event -> event.getLevel().toString().equals("INFO") && event.getFormattedMessage().contains("testUser"));
        assertThat(hasInfoLog).isTrue();
    }
}
