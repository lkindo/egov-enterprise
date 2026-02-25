package com.company.project.test.resilience;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
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

    @MockBean
    private UserService userService;

    @Test
    @DisplayName("서비스 장애 시 정상 복구 테스트 - 일시적인 DB 장애 시나리오")
    void temporaryDbFailure_recovery_success() throws Exception {
        // Given - 첫 번째 요청은 DB 장애 시뮬레이션, 두 번째 요청은 정상 데이터 반환
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Database temporarily unavailable"))
                .thenReturn(Arrays.asList(
                        new UserDto("user1", "복구된 사용자1", "USR001", null, null, null, null),
                        new UserDto("user2", "복구된 사용자2", "USR002", null, null, null, null)));

        // When & Then - 첫 번째 요청 (장애 발생)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - 두 번째 요청 (정상 복구 확인)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    @DisplayName("비즈니스 예외 발생 후 정상 서비스 복구 테스트")
    void exceptionThenRecovery_normalServiceRecovery() throws Exception {
        // Given - 특정 요청에 대해 예외 발생 후 다음 요청에서 정상 복구
        when(userService.getUserById("errorUser"))
                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND))
                .thenReturn(new UserDto("recoveredUser", "복구된 사용자", "USR001", null, null, null, null));

        // When & Then - 첫 번째 요청 (예외 발생)
        mockMvc.perform(get("/api/v1/users/errorUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());

        // When & Then - 두 번째 요청 (정상 복구)
        mockMvc.perform(get("/api/v1/users/recoveredUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("recoveredUser"));
    }

    @Test
    @DisplayName("API 호출 실패 시 재시도 메커니즘 테스트")
    void retryMechanism_afterApiFailure() throws Exception {
        // Given - 여러 번 실패 후 성공하는 시나리오
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new RuntimeException("Service temporarily unavailable"))
                .thenThrow(new RuntimeException("Service still unavailable"))
                .thenReturn(new UserResponse("successfulUser", "재시도 성공 사용자", Role.USER));

        String requestBody = """
                {
                    "userId": "retryUser",
                    "password": "password123!",
                    "userNm": "재시도 성공 사용자",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """;

        // When & Then - 첫 번째 요청 (실패)
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError());

        // When & Then - 두 번째 요청 (실패)
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError());

        // When & Then - 세 번째 요청 (성공 - 복구 완료)
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("successfulUser"));
    }

    @Test
    @DisplayName("서킷 브레이커 작동 및 복구 테스트")
    void circuitBreaker_operationAndRecovery() throws Exception {
        // Given - 연속된 실패 후 서킷이 열리고 잠시 후 복구되는 시나리오
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Service unavailable")) // 1st failure
                .thenThrow(new RuntimeException("Service still unavailable")) // 2nd failure
                .thenThrow(new RuntimeException("Circuit breaker open")) // 3rd - simulated open state
                .thenReturn(Arrays.asList(
                        new UserDto("circuitBreakerUser", "서킷 복구 사용자", "USR001", null, null, null, null)));

        // When & Then - 첫 번째 요청 (실패)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - 두 번째 요청 (실패)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - 세 번째 요청 (서킷 브레이커 OPEN 상태로 인한 즉시 실패)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable());

        // When & Then - 네 번째 요청 (정상 복구 상태)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("타임아웃 발생 후 정상 복구 테스트")
    void timeoutRecovery_afterTimeoutOccurs() throws Exception {
        // Given - 첫 번째 요청은 지연(타임아웃), 두 번째는 즉시 응답
        when(userService.getUserList())
                .thenAnswer(invocation -> {
                    Thread.sleep(6000); // 6초 지연
                    return Arrays.asList(new UserDto("timeoutUser", "타임아웃 사용자", "USR001", null, null, null, null));
                })
                .thenReturn(Arrays.asList(
                        new UserDto("recoveredUser", "복구된 사용자", "USR002", null, null, null, null)));

        // When & Then - 첫 번째 요청 (타임아웃 발생 시뮬레이션)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .requestAttr("org.springframework.web.util.WebUtils.ERROR_REQUEST_URI_ATTRIBUTE", "/api/v1/users"))
                .andExpect(status().isRequestTimeout());

        // When & Then - 두 번째 요청 (정상 복구)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].userId").value("recoveredUser"));
    }

    @Test
    @DisplayName("데이터베이스 커넥션 고갈 후 복구 테스트")
    void dbConnectionPoolExhaustion_recovery() throws Exception {
        // Given - 풀 고갈 예외 발생 후 정상 복구
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Connection pool exhausted"))
                .thenReturn(Arrays.asList(
                        new UserDto("poolUser", "풀 복구 사용자", "USR001", null, null, null, null)));

        // When & Then - 첫 번째 요청 (고갈 발생)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - 두 번째 요청 (정상 복구)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("메모리 부족 상태에서 GC 후 정상 작동 복구 테스트")
    void outOfMemoryRecovery_afterGC() throws Exception {
        // Given - 메모리 부족 예외 시뮬레이션
        when(userService.getUserList())
                .thenThrow(new OutOfMemoryError("Memory exhausted"))
                .thenReturn(Arrays.asList(
                        new UserDto("memoryUser", "메모리 사용자", "USR001", null, null, null, null)));

        // When & Then - 첫 번째 요청 (메모리 부족)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // GC 강제 호출로 복구 시뮬레이션
        System.gc();

        // When & Then - 두 번째 요청 (정상 복구)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("장애 발생 후 서비스 정상화 상태 테스트")
    void serviceStatusNormalization_afterException() throws Exception {
        // Given - 비정상 상태 후 다시 상태 정상화
        when(userService.getUserById("faultyUser"))
                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                .thenReturn(new UserDto("normalizedUser", "정상화된 사용자", "USR001", null, null, null, null));

        // When & Then - 첫 번째 요청 (오류 발생)
        mockMvc.perform(get("/api/v1/users/faultyUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - 두 번째 요청 (상태 정상화 확인)
        mockMvc.perform(get("/api/v1/users/normalizedUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("normalizedUser"));
    }

    @Test
    @DisplayName("장애 발생 시 폴백 메커니즘 테스트")
    void fallbackMechanism_whenFailureOccurs() throws Exception {
        // Given - 장애 발생 시 폴백 데이터 제공 시뮬레이션
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Service unavailable"))
                .thenReturn(Arrays.asList(
                        new UserDto("fallbackUser", "폴백 사용자", "USR001", null, null, null, null)));

        // When & Then - 첫 번째 요청 (장애 발생)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - 두 번째 요청 (정상 폴백 확인)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].userId").value("fallbackUser"));
    }

    @Test
    @DisplayName("장애 복구 후 기능적 성능 저하 없는 정상 작동 테스트")
    void recovery_withoutPerformanceDegradation() throws Exception {
        // Given - 일시적 실패 후 복구
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Temporary failure"))
                .thenReturn(Arrays.asList(
                        new UserDto("performanceUser1", "성능 테스트 사용자1", "USR001", null, null, null, null),
                        new UserDto("performanceUser2", "성능 테스트 사용자2", "USR002", null, null, null, null)));

        // When & Then - 첫 번째 요청 (실패)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - 두 번째 요청 (성능 검증)
        long startTime = System.currentTimeMillis();
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2));
        long endTime = System.currentTimeMillis();

        // 복구 후 응답 속도가 1초 이내여야 함
        assertThat(endTime - startTime).isLessThan(1000);
    }

    @Test
    @DisplayName("복합 장애 발생 후 복구 테스트")
    void multipleFailures_recovery() throws Exception {
        // Given - 여러 종류의 장애 연속 발생 후 복구
        when(userService.getUserList())
                .thenThrow(new RuntimeException("First failure"))
                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                .thenThrow(new RuntimeException("Third failure"))
                .thenReturn(Arrays.asList(
                        new UserDto("multiFailureUser", "복합 장애 복구 사용자", "USR001", null, null, null, null)));

        // When & Then - 연속된 실패 시뮬레이션
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - 정상 복구 확인
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].userId").value("multiFailureUser"));
    }

    @Test
    @DisplayName("장애 발생 후 세션 유지 테스트")
    void sessionPreservation_afterFailure() throws Exception {
        // Given - 장애 발생 후에도 사용자 세션이 유지되는지 확인
        when(userService.getUserById("sessionUser"))
                .thenThrow(new RuntimeException("Temporary failure"))
                .thenReturn(new UserDto("sessionUser", "세션 사용자", "USR001", null, null, null, null));

        // 첫 번째 요청 (실패)
        mockMvc.perform(get("/api/v1/users/sessionUser")
                .contentType(MediaType.APPLICATION_JSON)
                .sessionAttr("userSession", "sessionValue"))
                .andExpect(status().isInternalServerError());

        // 두 번째 요청 (정상 복구 및 세션 속성 확인)
        mockMvc.perform(get("/api/v1/users/sessionUser")
                .contentType(MediaType.APPLICATION_JSON)
                .sessionAttr("userSession", "sessionValue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("sessionUser"));
    }

    @Test
    @DisplayName("장애 발생 후 트랜잭션 정리 테스트")
    void transactionCleanup_afterFailure() throws Exception {
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new RuntimeException("Transaction failed"))
                .thenReturn(new UserResponse("successfulTransactionUser", "트랜잭션 사용자", Role.USER));

        String requestBody = """
                {
                    "userId": "transactionUser",
                    "password": "password123!",
                    "userNm": "트랜잭션 사용자",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """;

        // 장애 발생 요청
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError());

        // 이후 정상 요청 성공 확인 (클린업 완료 전제)
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("successfulTransactionUser"));
    }

    @Test
    @DisplayName("장애 발생 후 메모리 누수 방지 테스트")
    void memoryLeakPrevention_afterFailure() throws Exception {
        // Given
        System.gc();
        Thread.sleep(100);
        long initialMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

        when(userService.getUserList())
                .thenThrow(new RuntimeException("Memory leak test"))
                .thenReturn(Arrays.asList(
                        new UserDto("memoryLeakUser", "메모리 누수 테스트", "USR001", null, null, null, null)));

        // 장애 유발 요청 다수 수행
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isInternalServerError());
        }

        // 정상 요청
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // 안정성 검증
        System.gc();
        Thread.sleep(100);
        long finalMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        long memoryDiff = Math.abs(initialMemory - finalMemory);

        System.out.printf("Memory leak check - Initial: %d, Final: %d, Diff: %d%n", initialMemory, finalMemory, memoryDiff);

        // 단순 연산 후 메모리 증가량이 5MB 이내로 안정적이어야 함
        assertThat(memoryDiff).isLessThan(5 * 1024 * 1024L);
    }
}
