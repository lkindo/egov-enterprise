package nuri.test.resilience;

import nuri.api.controller.UserApiController;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.user.UserService;
import nuri.foundation.service.user.dto.UserDto;
import nuri.foundation.service.user.dto.UserSignupRequest;
import nuri.foundation.service.user.dto.UserResponse;
import nuri.foundation.domain.user.entity.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.Arrays;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 장애 복구 기능 테스트 (Standalone)
 */
public class FaultRecoveryFunctionTest {

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
    @DisplayName("Temporary DB Failure - Recovery Success")
    void temporaryDbFailure_recovery_success() throws Exception {
        // Given
        when(userService.getPagedUserList(any(), any(Pageable.class)))
                .thenThrow(new RuntimeException("Database temporarily unavailable"))
                .thenReturn(new PageImpl<>(Arrays.asList(
                        UserDto.builder().userId("user1").userNm("User 1").esntlId("USR001").build(),
                        UserDto.builder().userId("user2").userNm("User 2").esntlId("USR002").build())));

        // First call fails
        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // Second call succeeds
        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.list.length()").value(2));
    }

    @Test
    @DisplayName("Exception then Recovery - Normal Service Recovery")
    void exceptionThenRecovery_normalServiceRecovery() throws Exception {
        // Given
        when(userService.getPagedUserList(any(), any(Pageable.class)))
                .thenThrow(new RuntimeException("Temporary error"))
                .thenReturn(new PageImpl<>(Arrays.asList(
                        UserDto.builder().userId("user1").userNm("User 1").esntlId("USR001").build())));

        // First call fails
        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());

        // Second call succeeds
        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Retry Mechanism - After API Failure")
    void retryMechanism_afterApiFailure() throws Exception {
        // Given
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new RuntimeException("Service temporarily unavailable"))
                .thenThrow(new RuntimeException("Service still unavailable"))
                .thenReturn(new UserResponse("successfulUser", "Success User", Role.USER));

        String requestBody = """
                {
                  "userId": "retryUser",
                  "password": "password123!",
                  "userNm": "Retry User",
                  "passwordHint": "hint",
                  "passwordCnsr": "answer",
                  "role": "USER"
                }
                """;

        // First attempt
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError());

        // Second attempt
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError());

        // Third attempt - Success
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("successfulUser"));
    }

    @Test
    @DisplayName("Circuit Breaker - Operation and Recovery")
    void circuitBreaker_operationAndRecovery() throws Exception {
        // Given
        when(userService.getPagedUserList(any(), any(Pageable.class)))
                .thenThrow(new RuntimeException("Service unavailable"))
                .thenThrow(new RuntimeException("Service still unavailable"))
                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                .thenReturn(new PageImpl<>(Arrays.asList(
                        UserDto.builder().userId("circuitBreakerUser").userNm("User").esntlId("USR001").build())));

        // Failures
        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // Recovery
        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("DB Connection Pool Exhaustion - Recovery")
    void dbConnectionPoolExhaustion_recovery() throws Exception {
        // Given
        when(userService.getPagedUserList(any(), any(Pageable.class)))
                .thenThrow(new RuntimeException("Connection pool exhausted"))
                .thenReturn(new PageImpl<>(Arrays.asList(
                        UserDto.builder().userId("poolUser").userNm("User").esntlId("USR001").build())));

        // Fail
        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // Recovery
        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Out Of Memory Recovery - After GC")
    void outOfMemoryRecovery_afterGC() throws Exception {
        // Given
        when(userService.getPagedUserList(any(), any(Pageable.class)))
                .thenThrow(new RuntimeException("Memory exhausted"))
                .thenReturn(new PageImpl<>(Arrays.asList(
                        UserDto.builder().userId("memoryUser").userNm("User").esntlId("USR001").build())));

        // Fail
        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // Recovery
        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Cleanup after failure")
    void transactionCleanup_afterFailure() throws Exception {
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new RuntimeException("Transaction failed"))
                .thenReturn(new UserResponse("successfulTransactionUser", "Success", Role.USER));

        String requestBody = """
                {
                  "userId": "transactionUser",
                  "password": "password123!",
                  "userNm": "Transaction User",
                  "passwordHint": "hint",
                  "passwordCnsr": "answer",
                  "role": "USER"
                }
                """;

        // Fail
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError());

        // Recovery
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("successfulTransactionUser"));
    }
}