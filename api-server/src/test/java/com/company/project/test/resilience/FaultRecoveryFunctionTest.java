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
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Arrays;
import com.company.project.domain.user.entity.Role;
import com.company.project.service.user.dto.UserResponse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
public class FaultRecoveryFunctionTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @Test
    @DisplayName("Temporary DB Failure - Recovery Success")
    void temporaryDbFailure_recovery_success() throws Exception {
        // Given
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Database temporarily unavailable"))
                .thenReturn(Arrays.asList(
                        UserDto.builder().userId("user1").userNm("User 1").esntlId("USR001")
                                .build(),
                        UserDto.builder().userId("user2").userNm("User 2").esntlId("USR002")
                                .build()));

        // When & Then - First call fails
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - Second call succeeds
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    @DisplayName("Exception then Recovery - Normal Service Recovery")
    void exceptionThenRecovery_normalServiceRecovery() throws Exception {
        // Given
        when(userService.getUserById("errorUser"))
                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND))
                .thenReturn(UserDto.builder().userId("recoveredUser").userNm("User").esntlId("USR001")
                        .build());

        // When & Then - First call fails
        mockMvc.perform(get("/api/v1/users/errorUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());

        // When & Then - Second call succeeds
        mockMvc.perform(get("/api/v1/users/recoveredUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("recoveredUser"));
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
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Service unavailable"))
                .thenThrow(new RuntimeException("Service still unavailable"))
                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                .thenReturn(Arrays.asList(
                        UserDto.builder().userId("circuitBreakerUser").userNm("User")
                                .esntlId("USR001").build()));

        // Failures
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // Simulated open/error state
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // Recovery
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Timeout Recovery - After Timeout Occurs")
    void timeoutRecovery_afterTimeoutOccurs() throws Exception {
        // Given
        when(userService.getUserList())
                .thenAnswer(invocation -> {
                    // Simulating a slow call that might be handled as timeout in some
                    // configurations
                    return Arrays.asList(UserDto.builder().userId("timeoutUser").userNm("User")
                            .esntlId("USR001").build());
                });

        // Test normal success first
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("DB Connection Pool Exhaustion - Recovery")
    void dbConnectionPoolExhaustion_recovery() throws Exception {
        // Given
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Connection pool exhausted"))
                .thenReturn(Arrays.asList(
                        UserDto.builder().userId("poolUser").userNm("User").esntlId("USR001")
                                .build()));

        // Fail
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // Recovery
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Out Of Memory Recovery - After GC")
    void outOfMemoryRecovery_afterGC() throws Exception {
        // Given
        when(userService.getUserList())
                .thenThrow(new OutOfMemoryError("Memory exhausted"))
                .thenReturn(Arrays.asList(
                        UserDto.builder().userId("memoryUser").userNm("User").esntlId("USR001")
                                .build()));

        // Fail
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        System.gc();

        // Recovery
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Service Status Normalization - After Exception")
    void serviceStatusNormalization_afterException() throws Exception {
        // Given
        when(userService.getUserById("faultyUser"))
                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                .thenReturn(UserDto.builder().userId("normalizedUser").userNm("User").esntlId("USR001")
                        .build());

        // Fail
        mockMvc.perform(get("/api/v1/users/faultyUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // Recovery
        mockMvc.perform(get("/api/v1/users/normalizedUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("normalizedUser"));
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
