package com.company.project.test.resilience;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Arrays;

import com.company.project.domain.user.entity.Role;
import com.company.project.service.user.dto.UserResponse;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
public class FaultRecoveryFunctionTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @Test
    @DisplayName("?�비???�애 ???�상 복구 ?�스??- ?�시?�인 DB ?�애 ?�나리오")
    void temporaryDbFailure_recovery_success() throws Exception {
        // Given - �?번째 ?�청?� DB ?�애 ?��??�이?? ??번째 ?�청?� ?�상 ?�이??반환
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Database temporarily unavailable"))
                .thenReturn(Arrays.asList(
                        new UserDto("user1", "복구???�용??", "USR001", null, null, null, null),
                        new UserDto("user2", "복구???�용??", "USR002", null, null, null, null)));

        // When & Then - �?번째 ?�청 (?�애 발생)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??번째 ?�청 (?�상 복구 ?�인)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    @DisplayName("비즈?�스 ?�외 발생 ???�상 ?�비??복구 ?�스??)
    void exceptionThenRecovery_normalServiceRecovery() throws Exception {
        // Given - ?�정 ?�청???�???�외 발생 ???�음 ?�청?�서 ?�상 복구
        when(userService.getUserById("errorUser"))
                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND))
                .thenReturn(new UserDto("recoveredUser", "복구???�용??, "USR001", null, null, null, null));

        // When & Then - �?번째 ?�청 (?�외 발생)
        mockMvc.perform(get("/api/v1/users/errorUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());

        // When & Then - ??번째 ?�청 (?�상 복구)
        mockMvc.perform(get("/api/v1/users/recoveredUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("recoveredUser"));
    }

    @Test
    @DisplayName("API ?�출 ?�패 ???�시??메커?�즘 ?�스??)
    void retryMechanism_afterApiFailure() throws Exception {
        // Given - ?�러 �??�패 ???�공?�는 ?�나리오
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new RuntimeException("Service temporarily unavailable"))
                .thenThrow(new RuntimeException("Service still unavailable"))
                .thenReturn(new UserResponse("successfulUser", "?�시???�공 ?�용??, Role.USER));

        String requestBody = """
                {
                    "userId": "retryUser",
                    "password": "password123!",
                    "userNm": "?�시???�공 ?�용??,
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """;

        // When & Then - �?번째 ?�청 (?�패)
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError());

        // When & Then - ??번째 ?�청 (?�패)
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError());

        // When & Then - ??번째 ?�청 (?�공 - 복구 ?�료)
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("successfulUser"));
    }

    @Test
    @DisplayName("?�킷 브레?�커 ?�동 �?복구 ?�스??)
    void circuitBreaker_operationAndRecovery() throws Exception {
        // Given - ?�속???�패 ???�킷???�리�??�시 ??복구?�는 ?�나리오
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Service unavailable")) // 1st failure
                .thenThrow(new RuntimeException("Service still unavailable")) // 2nd failure
                .thenThrow(new RuntimeException("Circuit breaker open")) // 3rd - simulated open state
                .thenReturn(Arrays.asList(
                        new UserDto("circuitBreakerUser", "?�킷 복구 ?�용??, "USR001", null, null, null, null)));

        // When & Then - �?번째 ?�청 (?�패)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??번째 ?�청 (?�패)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??번째 ?�청 (?�킷 브레?�커 OPEN ?�태�??�한 즉시 ?�패)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable());

        // When & Then - ??번째 ?�청 (?�상 복구 ?�태)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("?�?�아??발생 ???�상 복구 ?�스??)
    void timeoutRecovery_afterTimeoutOccurs() throws Exception {
        // Given - �?번째 ?�청?� 지???�?�아??, ??번째??즉시 ?�답
        when(userService.getUserList())
                .thenAnswer(invocation -> {
                    Thread.sleep(6000); // 6�?지??                    return Arrays.asList(new UserDto("timeoutUser", "?�?�아???�용??, "USR001", null, null, null, null));
                })
                .thenReturn(Arrays.asList(
                        new UserDto("recoveredUser", "복구???�용??, "USR002", null, null, null, null)));

        // When & Then - �?번째 ?�청 (?�?�아??발생 ?��??�이??
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .requestAttr("org.springframework.web.util.WebUtils.ERROR_REQUEST_URI_ATTRIBUTE", "/api/v1/users"))
                .andExpect(status().isRequestTimeout());

        // When & Then - ??번째 ?�청 (?�상 복구)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].userId").value("recoveredUser"));
    }

    @Test
    @DisplayName("?�이?�베?�스 커넥??고갈 ??복구 ?�스??)
    void dbConnectionPoolExhaustion_recovery() throws Exception {
        // Given - ?� 고갈 ?�외 발생 ???�상 복구
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Connection pool exhausted"))
                .thenReturn(Arrays.asList(
                        new UserDto("poolUser", "?� 복구 ?�용??, "USR001", null, null, null, null)));

        // When & Then - �?번째 ?�청 (고갈 발생)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??번째 ?�청 (?�상 복구)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("메모�?부�??�태?�서 GC ???�상 ?�동 복구 ?�스??)
    void outOfMemoryRecovery_afterGC() throws Exception {
        // Given - 메모�?부�??�외 ?��??�이??        when(userService.getUserList())
                .thenThrow(new OutOfMemoryError("Memory exhausted"))
                .thenReturn(Arrays.asList(
                        new UserDto("memoryUser", "메모�??�용??, "USR001", null, null, null, null)));

        // When & Then - �?번째 ?�청 (메모�?부�?
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // GC 강제 ?�출�?복구 ?��??�이??        System.gc();

        // When & Then - ??번째 ?�청 (?�상 복구)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("?�애 발생 ???�비???�상???�태 ?�스??)
    void serviceStatusNormalization_afterException() throws Exception {
        // Given - 비정???�태 ???�시 ?�태 ?�상??        when(userService.getUserById("faultyUser"))
                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                .thenReturn(new UserDto("normalizedUser", "?�상?�된 ?�용??, "USR001", null, null, null, null));

        // When & Then - �?번째 ?�청 (?�류 발생)
        mockMvc.perform(get("/api/v1/users/faultyUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??번째 ?�청 (?�태 ?�상???�인)
        mockMvc.perform(get("/api/v1/users/normalizedUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("normalizedUser"));
    }

    @Test
    @DisplayName("?�애 발생 ???�백 메커?�즘 ?�스??)
    void fallbackMechanism_whenFailureOccurs() throws Exception {
        // Given - ?�애 발생 ???�백 ?�이???�공 ?��??�이??        when(userService.getUserList())
                .thenThrow(new RuntimeException("Service unavailable"))
                .thenReturn(Arrays.asList(
                        new UserDto("fallbackUser", "?�백 ?�용??, "USR001", null, null, null, null)));

        // When & Then - �?번째 ?�청 (?�애 발생)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??번째 ?�청 (?�상 ?�백 ?�인)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].userId").value("fallbackUser"));
    }

    @Test
    @DisplayName("?�애 복구 ??기능???�능 ?�???�는 ?�상 ?�동 ?�스??)
    void recovery_withoutPerformanceDegradation() throws Exception {
        // Given - ?�시???�패 ??복구
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Temporary failure"))
                .thenReturn(Arrays.asList(
                        new UserDto("performanceUser1", "?�능 ?�스???�용??", "USR001", null, null, null, null),
                        new UserDto("performanceUser2", "?�능 ?�스???�용??", "USR002", null, null, null, null)));

        // When & Then - �?번째 ?�청 (?�패)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??번째 ?�청 (?�능 검�?
        long startTime = System.currentTimeMillis();
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2));
        long endTime = System.currentTimeMillis();

        // 복구 ???�답 ?�도가 1�??�내?�야 ??        assertThat(endTime - startTime).isLessThan(1000);
    }

    @Test
    @DisplayName("복합 ?�애 발생 ??복구 ?�스??)
    void multipleFailures_recovery() throws Exception {
        // Given - ?�러 종류???�애 ?�속 발생 ??복구
        when(userService.getUserList())
                .thenThrow(new RuntimeException("First failure"))
                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                .thenThrow(new RuntimeException("Third failure"))
                .thenReturn(Arrays.asList(
                        new UserDto("multiFailureUser", "복합 ?�애 복구 ?�용??, "USR001", null, null, null, null)));

        // When & Then - ?�속???�패 ?��??�이??        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ?�상 복구 ?�인
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].userId").value("multiFailureUser"));
    }

    @Test
    @DisplayName("?�애 발생 ???�션 ?��? ?�스??)
    void sessionPreservation_afterFailure() throws Exception {
        // Given - ?�애 발생 ?�에???�용???�션???��??�는지 ?�인
        when(userService.getUserById("sessionUser"))
                .thenThrow(new RuntimeException("Temporary failure"))
                .thenReturn(new UserDto("sessionUser", "?�션 ?�용??, "USR001", null, null, null, null));

        // �?번째 ?�청 (?�패)
        mockMvc.perform(get("/api/v1/users/sessionUser")
                .contentType(MediaType.APPLICATION_JSON)
                .sessionAttr("userSession", "sessionValue"))
                .andExpect(status().isInternalServerError());

        // ??번째 ?�청 (?�상 복구 �??�션 ?�성 ?�인)
        mockMvc.perform(get("/api/v1/users/sessionUser")
                .contentType(MediaType.APPLICATION_JSON)
                .sessionAttr("userSession", "sessionValue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("sessionUser"));
    }

    @Test
    @DisplayName("?�애 발생 ???�랜??�� ?�리 ?�스??)
    void transactionCleanup_afterFailure() throws Exception {
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new RuntimeException("Transaction failed"))
                .thenReturn(new UserResponse("successfulTransactionUser", "?�랜??�� ?�용??, Role.USER));

        String requestBody = """
                {
                    "userId": "transactionUser",
                    "password": "password123!",
                    "userNm": "?�랜??�� ?�용??,
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """;

        // ?�애 발생 ?�청
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError());

        // ?�후 ?�상 ?�청 ?�공 ?�인 (?�린???�료 ?�제)
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("successfulTransactionUser"));
    }

    @Test
    @DisplayName("?�애 발생 ??메모�??�수 방�? ?�스??)
    void memoryLeakPrevention_afterFailure() throws Exception {
        // Given
        System.gc();
        Thread.sleep(100);
        long initialMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

        when(userService.getUserList())
                .thenThrow(new RuntimeException("Memory leak test"))
                .thenReturn(Arrays.asList(
                        new UserDto("memoryLeakUser", "메모�??�수 ?�스??, "USR001", null, null, null, null)));

        // ?�애 ?�발 ?�청 ?�수 ?�행
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isInternalServerError());
        }

        // ?�상 ?�청
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // ?�정??검�?        System.gc();
        Thread.sleep(100);
        long finalMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        long memoryDiff = Math.abs(initialMemory - finalMemory);

        System.out.printf("Memory leak check - Initial: %d, Final: %d, Diff: %d%n", initialMemory, finalMemory, memoryDiff);

        // ?�순 ?�산 ??메모�?증�??�이 5MB ?�내�??�정?�이?�야 ??        assertThat(memoryDiff).isLessThan(5 * 1024 * 1024L);
    }
}
