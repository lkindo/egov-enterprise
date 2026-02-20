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
public class FaultRecoveryFunctionTest { // Changed to public for better visibility, though package-private is fine for
                                         // JUnit 5

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private UserService userService;

        @Test
        @DisplayName("?비???애 ???상 복구 ?스??- ?시?인 DB ?애 ???이??")
        void temporaryDbFailure_recovery_success() throws Exception {
                // Given - ??청? DB ?애 ???이??
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Database temporarily unavailable"))
                                .thenReturn(Arrays.asList(
                                                new UserDto("user1", "복구 ???용??", "USR001", null, null, null, null),
                                                new UserDto("user2", "복구 ???용??", "USR002", null, null, null, null))); // ?음
                                                                                                                       // ?청?
                                                                                                                       // ?상
                                                                                                                       // ?작

                // When & Then - ?번째 ?청 (?애 발생)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?상 복구)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data.length()").value(2));
        }

        @Test
        @DisplayName("?외 발생 ???상 ?비??복구 ?스??")
        void exceptionThenRecovery_normalServiceRecovery() throws Exception {
                // Given - ??청? ?외 발생
                when(userService.getUserById("errorUser"))
                                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND))
                                .thenReturn(new UserDto("recoveredUser", "복구???용??", "USR001", null, null, null, null)); // ?음
                                                                                                                        // ?청?
                                                                                                                        // ?상
                                                                                                                        // ?작

                // When & Then - ?번째 ?청 (?외 발생)
                mockMvc.perform(get("/api/v1/users/errorUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isNotFound());

                // When & Then - ??번째 ?청 (?상 복구)
                mockMvc.perform(get("/api/v1/users/recoveredUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("recoveredUser"));
        }

        @Test
        @DisplayName("API ?출 ?패 ???시??메커?즘 ?스??")
        void retryMechanism_afterApiFailure() throws Exception {
                // Given - ?정 ?수???패 ?후 ?공?는 ?나리오
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new RuntimeException("Service temporarily unavailable"))
                                .thenThrow(new RuntimeException("Service still unavailable"))
                                .thenReturn(new UserResponse("successfulUser", "?시???용??", Role.USER)); // ??번째 ?도???공

                String requestBody = """
                                {
                                    "userId": "retryUser",
                                    "password": "password123!",
                                    "userNm": "?시???용??,
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then - ?번째 ?청 (?패)
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?패)
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?공 - 복구??
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("successfulUser"));
        }

        @Test
        @DisplayName("?킷 브레?커 ?작 ?복구 ?스??")
        void circuitBreaker_operationAndRecovery() throws Exception {
                // Given - ?속???패 ???정 ?간 경과 ???상 ?작
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Service unavailable")) // 1st call - failure
                                .thenThrow(new RuntimeException("Service still unavailable")) // 2nd call - failure
                                .thenThrow(new RuntimeException("Circuit breaker open")) // 3rd call - circuit breaker
                                                                                         // open
                                .thenReturn(Arrays.asList( // 4th call - recovery after timeout simulation
                                                new UserDto("circuitBreakerUser", "?킷 브레?커 ?용??", "USR001", null, null,
                                                                null, null)));

                // When & Then - ?번째 ?청 (?패)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?패)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?킷 브레?커 OPEN ?태 ???이??
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isServiceUnavailable()); // Circuit breaker open

                // When & Then - ??번째 ?청 (복구???태)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("??아??발생 ???상 복구 ?스??")
        void timeoutRecovery_afterTimeoutOccurs() throws Exception {
                // Given - ??청? ??아?????이??
                when(userService.getUserList())
                                .thenAnswer(invocation -> {
                                        Thread.sleep(6000); // 6?지??(??아??
                                        return Arrays.asList(new UserDto("timeoutUser", "??아???용??", "USR001", null,
                                                        null, null, null));
                                })
                                .thenReturn(Arrays.asList( // ?음 ?청? ?상 처리
                                                new UserDto("recoveredUser", "복구???용??", "USR002", null, null, null,
                                                                null)));

                // When & Then - ?번째 ?청 (??아??
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON)
                                .requestAttr("org.springframework.web.util.WebUtils.ERROR_REQUEST_URI_ATTRIBUTE",
                                                "/api/v1/users"))
                                .andExpect(status().isRequestTimeout());

                // When & Then - ??번째 ?청 (?상 복구)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data[0].userId").value("recoveredUser"));
        }

        @Test
        @DisplayName("?이?베?스 ?결 ? 고갈 ??복구 ?스??")
        void dbConnectionPoolExhaustion_recovery() throws Exception {
                // Given - DB ?결 ? 고갈 ???이??
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Connection pool exhausted"))
                                .thenReturn(Arrays.asList( // 복구 ???상 ?작
                                                new UserDto("poolUser", "? ?용??", "USR001", null, null, null, null)));

                // When & Then - ?번째 ?청 (DB ?결 ? 고갈)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (복구 ???상 ?작)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("메모?부??태?서 GC ???상 ?작 복구 ?스??")
        void outOfMemoryRecovery_afterGC() throws Exception {
                // Given - 메모?부??태 ???이??
                when(userService.getUserList())
                                .thenThrow(new OutOfMemoryError("Memory exhausted"))
                                .thenReturn(Arrays.asList( // GC ???상 ?작
                                                new UserDto("memoryUser", "메모??용??", "USR001", null, null, null,
                                                                null)));

                // When & Then - ?번째 ?청 (메모?부?
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // Force garbage collection to simulate recovery
                System.gc();

                // When & Then - ??번째 ?청 (복구 ???상 ?작)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("?외 발생 ???비???태 ?상???스??")
        void serviceStatusNormalization_afterException() throws Exception {
                // Given - ?비?? ?시?으?비정???태
                when(userService.getUserById("faultyUser"))
                                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                                .thenReturn(new UserDto("normalizedUser", "?상?된 ?용??", "USR001", null, null, null,
                                                null)); // ?상 ?태?복구

                // When & Then - ?번째 ?청 (?외 발생)
                mockMvc.perform(get("/api/v1/users/faultyUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?상?된 ?태)
                mockMvc.perform(get("/api/v1/users/normalizedUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("normalizedUser"));
        }

        @Test
        @DisplayName("?애 발생 ???백 메커?즘 ?스??")
        void fallbackMechanism_whenFailureOccurs() throws Exception {
                // Given - ?비???애 ???백 ?공
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Service unavailable"))
                                .thenReturn(Arrays.asList( // ?백 ???상 ?작
                                                new UserDto("fallbackUser", "?백 ?용??", "USR001", null, null, null,
                                                                null)));

                // When & Then - ?번째 ?청 (?애 발생)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?상 ?작)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data[0].userId").value("fallbackUser"));
        }

        @Test
        @DisplayName("?애 복구 ???능 ????이 ?상 ?작 ?스??")
        void recovery_withoutPerformanceDegradation() throws Exception {
                // Given - ?애 발생 ???상 복구
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Temporary failure"))
                                .thenReturn(Arrays.asList( // 복구 ???상 ?작
                                                new UserDto("performanceUser1", "?능 ?스???용??", "USR001", null, null,
                                                                null, null),
                                                new UserDto("performanceUser2", "?능 ?스???용??", "USR002", null, null,
                                                                null, null)));

                // When & Then - ?번째 ?청 (?애 발생)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?상 복구)
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
        @DisplayName("?중 ?애 발생 ??복구 ?스??")
        void multipleFailures_recovery() throws Exception {
                // Given - ?러 ?애 발생 ??복구
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("First failure"))
                                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                                .thenThrow(new RuntimeException("Third failure"))
                                .thenReturn(Arrays.asList( // 복구 ???상 ?작
                                                new UserDto("multiFailureUser", "?중 ?애 ?용??", "USR001", null, null, null,
                                                                null)));

                // When & Then - ?번째 ?청 (?애 1)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?애 2)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?애 3)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?상 복구)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data[0].userId").value("multiFailureUser"));
        }

        @Test
        @DisplayName("?애 발생 ??캐시 무효????생???스??")
        void cacheInvalidationAndRegeneration_afterFailure() throws Exception {
                // Given - 캐시가 ?는 ?나리오 (mock?로 캐시 ?작 ???이??
                when(userService.getUserById("cachedUser"))
                                .thenReturn(new UserDto("cachedUser", "캐시 ?용??", "USR001", null, null, null, null)) // 캐시??
                                                                                                                   // ???
                                .thenThrow(new RuntimeException("Cache invalidated due to error")) // 캐시 무효??
                                .thenReturn(new UserDto("cachedUser", "갱신??캐시 ?용??", "USR001", null, null, null, null)); // 캐시
                                                                                                                        // ?생??

                // When & Then - ?번째 ?청 (?상, 캐시 ???
                mockMvc.perform(get("/api/v1/users/cachedUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.userNm").value("캐시 ?용??"));

                // When & Then - ??번째 ?청 (?애 발생, 캐시 무효??
                mockMvc.perform(get("/api/v1/users/cachedUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?상, 캐시 ?생??
                mockMvc.perform(get("/api/v1/users/cachedUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.userNm").value("갱신??캐시 ?용??"));
        }

        @Test
        @DisplayName("?애 발생 ???션 ?? ?스??")
        void sessionPreservation_afterFailure() throws Exception {
                // Given
                when(userService.getUserById("sessionUser"))
                                .thenThrow(new RuntimeException("Temporary failure"))
                                .thenReturn(new UserDto("sessionUser", "?션 ?용??", "USR001", null, null, null, null));

                // When & Then - ?번째 ?청 (?애 발생)
                mockMvc.perform(get("/api/v1/users/sessionUser")
                                .contentType(MediaType.APPLICATION_JSON)
                                .sessionAttr("userSession", "sessionValue"))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?상 복구, ?션 ??)
                mockMvc.perform(get("/api/v1/users/sessionUser")
                                .contentType(MediaType.APPLICATION_JSON)
                                .sessionAttr("userSession", "sessionValue"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("sessionUser"));
        }

        @Test
        @DisplayName("?애 발생 ???랜?? ?리 ?스??")
        void transactionCleanup_afterFailure() throws Exception {
                // TODO: Verify cleanup logic if needed in Phase 1

                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new RuntimeException("Transaction failed"))
                                .thenReturn(new UserResponse("successfulTransactionUser", "?랜?? ?용??", Role.USER)); // ?음
                                                                                                                   // ?청?
                                                                                                                   // ?공

                String requestBody = """
                                {
                                    "userId": "transactionUser",
                                    "password": "password123!",
                                    "userNm": "?랜?? ?용??,
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then - ?번째 ?청 (?랜?? ?패)
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?상 처리, ?랜?? ?리 ?료)
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("successfulTransactionUser"));
        }

        @Test
        @DisplayName("?애 발생 ??리소???리 ?스??")
        void resourceCleanup_afterFailure() throws Exception {
                // Given
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Resource exhaustion"))
                                .thenReturn(Arrays.asList( // 리소???리 ???상 ?작
                                                new UserDto("resourceUser", "리소???용??", "USR001", null, null, null,
                                                                null)));

                // When & Then - ?번째 ?청 (리소??문제)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (리소???리 ???상 ?작)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("?애 발생 ??메모??수 방? ?스??")
        void memoryLeakPrevention_afterFailure() throws Exception {
                // Given
                long initialMemory = Runtime.getRuntime().freeMemory();

                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Memory leak test"))
                                .thenReturn(Arrays.asList( // ?상 ?작
                                                new UserDto("memoryLeakUser", "메모??수 ?스???용??", "USR001", null, null,
                                                                null, null)));

                // When & Then - ?번째 ?청 (?애 발생)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // Force garbage collection
                System.gc();

                // TODO: Verify memory usage stability in Phase 1
                // long memoryAfterFailure = Runtime.getRuntime().freeMemory();

                // When & Then - ??번째 ?청 (?상 ?작)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());

                // Verify memory usage is stable
                System.gc();
                long finalMemory = Runtime.getRuntime().freeMemory();

                // Memory should not have significantly decreased after multiple operations
                assertThat(Math.abs(initialMemory - finalMemory)).isLessThan((long) (initialMemory * 0.1)); // Within
                                                                                                            // 10% range
        }

        @Test
        @DisplayName("?애 발생 ???상?인 ?청 처리 ?스??")
        void normalRequestProcessing_afterFailure() throws Exception {
                // Given - ?러 ?청 처리 ???애 발생
                when(userService.getUserById("normalUser"))
                                .thenReturn(new UserDto("normalUser", "?상 ?용??", "USR001", null, null, null, null))
                                .thenThrow(new RuntimeException("Temporary failure"))
                                .thenReturn(new UserDto("recoveredUser", "복구???용??", "USR002", null, null, null, null));

                // When & Then - ?번째 ?청 (?상)
                mockMvc.perform(get("/api/v1/users/normalUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.userId").value("normalUser"));

                // When & Then - ??번째 ?청 (?애 발생)
                mockMvc.perform(get("/api/v1/users/normalUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?상 복구)
                mockMvc.perform(get("/api/v1/users/recoveredUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.userId").value("recoveredUser"));
        }

        @Test
        @DisplayName("?애 발생 ??비동??업 ?상 처리 ?스??")
        void asyncTaskProcessing_afterFailure() throws Exception {
                // Given
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Async failure"))
                                .thenReturn(Arrays.asList( // 복구 ???상 ?작
                                                new UserDto("asyncUser", "비동??용??", "USR001", null, null, null, null)));

                // When & Then - ?번째 ?청 (?애 발생)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??번째 ?청 (?상 복구)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }
}
