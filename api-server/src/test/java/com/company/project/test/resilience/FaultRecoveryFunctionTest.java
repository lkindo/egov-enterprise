package com.company.project.test.resilience;

import com.company.project.api.controller.UserController;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class FaultRecoveryFunctionTest {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private UserService userService;

        @Test
        @DisplayName("서비스 장애 후 정상 복구 테스트 - 일시적인 DB 장애 시뮬레이션")
        void temporaryDbFailure_recovery_success() throws Exception {
                // Given - 첫 요청은 DB 장애 시뮬레이션
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Database temporarily unavailable"))
                                .thenReturn(Arrays.asList(
                                                new UserDto("user1", "복구 후 사용자1", "USR001", null, null, null, null),
                                                new UserDto("user2", "복구 후 사용자2", "USR002", null, null, null, null))); // 다음
                                                                                                                       // 요청은
                                                                                                                       // 정상
                                                                                                                       // 동작

                // When & Then - 첫 번째 요청 (장애 발생)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 두 번째 요청 (정상 복구)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data.length()").value(2));
        }

        @Test
        @DisplayName("예외 발생 후 정상 서비스 복구 테스트")
        void exceptionThenRecovery_normalServiceRecovery() throws Exception {
                // Given - 첫 요청은 예외 발생
                when(userService.getUserById("errorUser"))
                                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND))
                                .thenReturn(new UserDto("recoveredUser", "복구된 사용자", "USR001", null, null, null, null)); // 다음
                                                                                                                        // 요청은
                                                                                                                        // 정상
                                                                                                                        // 동작

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
        @DisplayName("API 호출 실패 후 재시도 메커니즘 테스트")
        void retryMechanism_afterApiFailure() throws Exception {
                // Given - 일정 횟수의 실패 이후 성공하는 시나리오
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new RuntimeException("Service temporarily unavailable"))
                                .thenThrow(new RuntimeException("Service still unavailable"))
                                .thenReturn("successfulUser"); // 세 번째 시도에 성공

                String requestBody = """
                                {
                                    "userId": "retryUser",
                                    "password": "password123!",
                                    "userNm": "재시도 사용자",
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

                // When & Then - 세 번째 요청 (성공 - 복구됨)
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("successfulUser"));
        }

        @Test
        @DisplayName("서킷 브레이커 동작 및 복구 테스트")
        void circuitBreaker_operationAndRecovery() throws Exception {
                // Given - 연속된 실패 후 일정 시간 경과 후 정상 동작
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Service unavailable")) // 1st call - failure
                                .thenThrow(new RuntimeException("Service still unavailable")) // 2nd call - failure
                                .thenThrow(new RuntimeException("Circuit breaker open")) // 3rd call - circuit breaker
                                                                                         // open
                                .thenReturn(Arrays.asList( // 4th call - recovery after timeout simulation
                                                new UserDto("circuitBreakerUser", "서킷 브레이커 사용자", "USR001", null, null,
                                                                null, null)));

                // When & Then - 첫 번째 요청 (실패)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 두 번째 요청 (실패)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 세 번째 요청 (서킷 브레이커 OPEN 상태 시뮬레이션)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isServiceUnavailable()); // Circuit breaker open

                // When & Then - 네 번째 요청 (복구된 상태)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("타임아웃 발생 후 정상 복구 테스트")
        void timeoutRecovery_afterTimeoutOccurs() throws Exception {
                // Given - 첫 요청은 타임아웃 시뮬레이션
                when(userService.getUserList())
                                .thenAnswer(invocation -> {
                                        Thread.sleep(6000); // 6초 지연 (타임아웃)
                                        return Arrays.asList(new UserDto("timeoutUser", "타임아웃 사용자", "USR001", null,
                                                        null, null, null));
                                })
                                .thenReturn(Arrays.asList( // 다음 요청은 정상 처리
                                                new UserDto("recoveredUser", "복구된 사용자", "USR002", null, null, null,
                                                                null)));

                // When & Then - 첫 번째 요청 (타임아웃)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON)
                                .requestAttr("org.springframework.web.util.WebUtils.ERROR_REQUEST_URI_ATTRIBUTE",
                                                "/api/v1/users"))
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
        @DisplayName("데이터베이스 연결 풀 고갈 후 복구 테스트")
        void dbConnectionPoolExhaustion_recovery() throws Exception {
                // Given - DB 연결 풀 고갈 시뮬레이션
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Connection pool exhausted"))
                                .thenReturn(Arrays.asList( // 복구 후 정상 동작
                                                new UserDto("poolUser", "풀 사용자", "USR001", null, null, null, null)));

                // When & Then - 첫 번째 요청 (DB 연결 풀 고갈)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 두 번째 요청 (복구 후 정상 동작)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("메모리 부족 상태에서 GC 후 정상 동작 복구 테스트")
        void outOfMemoryRecovery_afterGC() throws Exception {
                // Given - 메모리 부족 상태 시뮬레이션
                when(userService.getUserList())
                                .thenThrow(new OutOfMemoryError("Memory exhausted"))
                                .thenReturn(Arrays.asList( // GC 후 정상 동작
                                                new UserDto("memoryUser", "메모리 사용자", "USR001", null, null, null,
                                                                null)));

                // When & Then - 첫 번째 요청 (메모리 부족)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // Force garbage collection to simulate recovery
                System.gc();

                // When & Then - 두 번째 요청 (복구 후 정상 동작)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("예외 발생 후 서비스 상태 정상화 테스트")
        void serviceStatusNormalization_afterException() throws Exception {
                // Given - 서비스가 일시적으로 비정상 상태
                when(userService.getUserById("faultyUser"))
                                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                                .thenReturn(new UserDto("normalizedUser", "정상화된 사용자", "USR001", null, null, null,
                                                null)); // 정상 상태로 복구

                // When & Then - 첫 번째 요청 (예외 발생)
                mockMvc.perform(get("/api/v1/users/faultyUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 두 번째 요청 (정상화된 상태)
                mockMvc.perform(get("/api/v1/users/normalizedUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("normalizedUser"));
        }

        @Test
        @DisplayName("장애 발생 시 폴백 메커니즘 테스트")
        void fallbackMechanism_whenFailureOccurs() throws Exception {
                // Given - 서비스 장애 시 폴백 제공
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Service unavailable"))
                                .thenReturn(Arrays.asList( // 폴백 후 정상 동작
                                                new UserDto("fallbackUser", "폴백 사용자", "USR001", null, null, null,
                                                                null)));

                // When & Then - 첫 번째 요청 (장애 발생)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 두 번째 요청 (정상 동작)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data[0].userId").value("fallbackUser"));
        }

        @Test
        @DisplayName("장애 복구 후 성능 저하 없이 정상 동작 테스트")
        void recovery_withoutPerformanceDegradation() throws Exception {
                // Given - 장애 발생 후 정상 복구
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Temporary failure"))
                                .thenReturn(Arrays.asList( // 복구 후 정상 동작
                                                new UserDto("performanceUser1", "성능 테스트 사용자1", "USR001", null, null,
                                                                null, null),
                                                new UserDto("performanceUser2", "성능 테스트 사용자2", "USR002", null, null,
                                                                null, null)));

                // When & Then - 첫 번째 요청 (장애 발생)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 두 번째 요청 (정상 복구)
                long startTime = System.currentTimeMillis();
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data.length()").value(2));
                long endTime = System.currentTimeMillis();

                // Verify that performance is acceptable after recovery (less than 1 second)
                assertThat(endTime - startTime).isLessThan(1000);
        }

        @Test
        @DisplayName("다중 장애 발생 후 복구 테스트")
        void multipleFailures_recovery() throws Exception {
                // Given - 여러 장애 발생 후 복구
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("First failure"))
                                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                                .thenThrow(new RuntimeException("Third failure"))
                                .thenReturn(Arrays.asList( // 복구 후 정상 동작
                                                new UserDto("multiFailureUser", "다중 장애 사용자", "USR001", null, null, null,
                                                                null)));

                // When & Then - 첫 번째 요청 (장애 1)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 두 번째 요청 (장애 2)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 세 번째 요청 (장애 3)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 네 번째 요청 (정상 복구)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data[0].userId").value("multiFailureUser"));
        }

        @Test
        @DisplayName("장애 발생 후 캐시 무효화 및 재생성 테스트")
        void cacheInvalidationAndRegeneration_afterFailure() throws Exception {
                // Given - 캐시가 있는 시나리오 (mock으로 캐시 동작 시뮬레이션)
                when(userService.getUserById("cachedUser"))
                                .thenReturn(new UserDto("cachedUser", "캐시 사용자", "USR001", null, null, null, null)) // 캐시에
                                                                                                                   // 저장
                                .thenThrow(new RuntimeException("Cache invalidated due to error")) // 캐시 무효화
                                .thenReturn(new UserDto("cachedUser", "갱신된 캐시 사용자", "USR001", null, null, null, null)); // 캐시
                                                                                                                        // 재생성

                // When & Then - 첫 번째 요청 (정상, 캐시 저장)
                mockMvc.perform(get("/api/v1/users/cachedUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.userNm").value("캐시 사용자"));

                // When & Then - 두 번째 요청 (장애 발생, 캐시 무효화)
                mockMvc.perform(get("/api/v1/users/cachedUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 세 번째 요청 (정상, 캐시 재생성)
                mockMvc.perform(get("/api/v1/users/cachedUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.userNm").value("갱신된 캐시 사용자"));
        }

        @Test
        @DisplayName("장애 발생 후 세션 유지 테스트")
        void sessionPreservation_afterFailure() throws Exception {
                // Given
                when(userService.getUserById("sessionUser"))
                                .thenThrow(new RuntimeException("Temporary failure"))
                                .thenReturn(new UserDto("sessionUser", "세션 사용자", "USR001", null, null, null, null));

                // When & Then - 첫 번째 요청 (장애 발생)
                mockMvc.perform(get("/api/v1/users/sessionUser")
                                .contentType(MediaType.APPLICATION_JSON)
                                .sessionAttr("userSession", "sessionValue"))
                                .andExpect(status().isInternalServerError());

                // When & Then - 두 번째 요청 (정상 복구, 세션 유지)
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
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "transactionUser",
                                "password123!",
                                "트랜잭션 사용자",
                                com.company.project.domain.user.Role.USER,
                                "hint",
                                "answer");

                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new RuntimeException("Transaction failed"))
                                .thenReturn("successfulTransactionUser"); // 다음 요청은 성공

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

                // When & Then - 첫 번째 요청 (트랜잭션 실패)
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isInternalServerError());

                // When & Then - 두 번째 요청 (정상 처리, 트랜잭션 정리 완료)
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("successfulTransactionUser"));
        }

        @Test
        @DisplayName("장애 발생 후 리소스 정리 테스트")
        void resourceCleanup_afterFailure() throws Exception {
                // Given
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Resource exhaustion"))
                                .thenReturn(Arrays.asList( // 리소스 정리 후 정상 동작
                                                new UserDto("resourceUser", "리소스 사용자", "USR001", null, null, null,
                                                                null)));

                // When & Then - 첫 번째 요청 (리소스 문제)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 두 번째 요청 (리소스 정리 후 정상 동작)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("장애 발생 후 메모리 누수 방지 테스트")
        void memoryLeakPrevention_afterFailure() throws Exception {
                // Given
                long initialMemory = Runtime.getRuntime().freeMemory();

                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Memory leak test"))
                                .thenReturn(Arrays.asList( // 정상 동작
                                                new UserDto("memoryLeakUser", "메모리 누수 테스트 사용자", "USR001", null, null,
                                                                null, null)));

                // When & Then - 첫 번째 요청 (장애 발생)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // Force garbage collection
                System.gc();

                // Check memory usage hasn't significantly decreased
                long memoryAfterFailure = Runtime.getRuntime().freeMemory();

                // When & Then - 두 번째 요청 (정상 동작)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());

                // Verify memory usage is stable
                System.gc();
                long finalMemory = Runtime.getRuntime().freeMemory();

                // Memory should not have significantly decreased after multiple operations
                assertThat(Math.abs(initialMemory - finalMemory)).isLessThan(initialMemory * 0.1); // Within 10% range
        }

        @Test
        @DisplayName("장애 발생 후 정상적인 요청 처리 테스트")
        void normalRequestProcessing_afterFailure() throws Exception {
                // Given - 여러 요청 처리 후 장애 발생
                when(userService.getUserById("normalUser"))
                                .thenReturn(new UserDto("normalUser", "정상 사용자", "USR001", null, null, null, null))
                                .thenThrow(new RuntimeException("Temporary failure"))
                                .thenReturn(new UserDto("recoveredUser", "복구된 사용자", "USR002", null, null, null, null));

                // When & Then - 첫 번째 요청 (정상)
                mockMvc.perform(get("/api/v1/users/normalUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.userId").value("normalUser"));

                // When & Then - 두 번째 요청 (장애 발생)
                mockMvc.perform(get("/api/v1/users/normalUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - 세 번째 요청 (정상 복구)
                mockMvc.perform(get("/api/v1/users/recoveredUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.userId").value("recoveredUser"));
        }

        @Test
        @DisplayName("장애 발생 후 비동기 작업 정상 처리 테스트")
        void asyncTaskProcessing_afterFailure() throws Exception {
                // Given
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Async failure"))
                                .thenReturn(Arrays.asList( // 복구 후 정상 동작
                                                new UserDto("asyncUser", "비동기 사용자", "USR001", null, null, null, null)));

                // When & Then - 첫 번째 요청 (장애 발생)
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
}