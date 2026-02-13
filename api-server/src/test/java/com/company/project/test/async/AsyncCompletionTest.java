package com.company.project.test.async;

import com.company.project.api.controller.AsyncController;
import com.company.project.service.async.AsyncService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class AsyncCompletionTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AsyncService asyncService;

    private static final int DEFAULT_TIMEOUT = 10; // seconds

    @BeforeEach
    void setUp() {
        // Mock the async method to return a CompletableFuture that completes after a delay
        when(asyncService.processAsync(anyInt())).thenAnswer(invocation -> {
            int delayMs = invocation.getArgument(0);
            return CompletableFuture.supplyAsync(() -> {
                try {
                    Thread.sleep(delayMs);
                    return "Completed after " + delayMs + "ms";
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(e);
                }
            });
        });

        when(asyncService.processAsyncWithError(anyInt())).thenAnswer(invocation -> {
            int delayMs = invocation.getArgument(0);
            return CompletableFuture.supplyAsync(() -> {
                try {
                    Thread.sleep(delayMs);
                    throw new RuntimeException("Simulated error in async operation");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(e);
                }
            });
        });
    }

    @Test
    @DisplayName("비동기 작업 정상 완료 테스트")
    void asyncOperation_completion_success() throws Exception {
        // Given
        int delayMs = 100; // 100ms delay
        when(asyncService.processAsync(delayMs)).thenReturn(CompletableFuture.completedFuture("Completed after " + delayMs + "ms"));

        // When & Then
        mockMvc.perform(get("/api/v1/async/process")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.result").value("Completed after " + delayMs + "ms"));

        // Verify that the async method was called
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processAsync(delayMs);
    }

    @Test
    @DisplayName("여러 비동기 작업 동시 완료 테스트")
    void multipleAsyncOperations_completion_success() throws Exception {
        // Given
        int delay1 = 50;
        int delay2 = 100;
        int delay3 = 150;

        when(asyncService.processAsync(delay1)).thenReturn(CompletableFuture.completedFuture("Completed after " + delay1 + "ms"));
        when(asyncService.processAsync(delay2)).thenReturn(CompletableFuture.completedFuture("Completed after " + delay2 + "ms"));
        when(asyncService.processAsync(delay3)).thenReturn(CompletableFuture.completedFuture("Completed after " + delay3 + "ms"));

        // When & Then - Multiple requests
        mockMvc.perform(get("/api/v1/async/process")
                .param("delay", String.valueOf(delay1))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/async/process")
                .param("delay", String.valueOf(delay2))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/async/process")
                .param("delay", String.valueOf(delay3))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Verify that all async methods were called
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processAsync(delay1);
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processAsync(delay2);
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processAsync(delay3);
    }

    @Test
    @DisplayName("비동기 작업 예외 발생 시 적절한 처리 테스트")
    void asyncOperation_exception_handling() throws Exception {
        // Given
        int delayMs = 100;
        CompletableFuture<String> errorFuture = new CompletableFuture<>();
        errorFuture.completeExceptionally(new RuntimeException("Async operation failed"));
        when(asyncService.processAsyncWithError(delayMs)).thenReturn(errorFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-error")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));

        // Verify that the async method with error was called
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processAsyncWithError(delayMs);
    }

    @Test
    @DisplayName("비동기 작업 완료 대기 테스트")
    void asyncOperation_waitForCompletion() throws Exception {
        // Given
        int delayMs = 200;
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                return "Delayed completion";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "Interrupted";
            }
        });

        when(asyncService.processAsync(delayMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Wait for the async operation to complete
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processAsync(delayMs);
                });
    }

    @Test
    @DisplayName("비동기 작업 완료 상태 확인 테스트")
    void asyncOperation_completionStatus_check() throws Exception {
        // Given
        int delayMs = 100;
        CompletableFuture<String> future = asyncService.processAsync(delayMs);
        
        // Initially, the future should not be completed
        assertThat(future.isDone()).isFalse();
        assertThat(future.isCompletedExceptionally()).isFalse();

        // When
        mockMvc.perform(get("/api/v1/async/process")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Then - Wait for completion and verify
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .until(() -> future.isDone());
        
        assertThat(future.isDone()).isTrue();
        assertThat(future.isCompletedExceptionally()).isFalse();
    }

    @Test
    @DisplayName("비동기 작업 취소 후 상태 확인 테스트")
    void asyncOperation_cancel_statusCheck() throws Exception {
        // Given
        int delayMs = 1000; // Longer delay to allow for cancellation
        CompletableFuture<String> cancellableFuture = new CompletableFuture<>();
        
        when(asyncService.processAsyncWithCancellation(anyInt())).thenReturn(cancellableFuture);

        // Start the async operation
        var mvcResult = mockMvc.perform(get("/api/v1/async/process-with-cancel")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        // Cancel the future
        cancellableFuture.cancel(true);

        // Verify that the future is cancelled
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .until(() -> cancellableFuture.isCancelled());
        
        assertThat(cancellableFuture.isCancelled()).isTrue();
        assertThat(cancellableFuture.isDone()).isTrue();
        assertThat(cancellableFuture.isCompletedExceptionally()).isFalse();
    }

    @Test
    @DisplayName("비동기 작업 결과 반환 확인 테스트")
    void asyncOperation_resultReturn_verification() throws Exception {
        // Given
        int delayMs = 150;
        String expectedResult = "Expected result after " + delayMs + "ms";
        CompletableFuture<String> future = CompletableFuture.completedFuture(expectedResult);
        when(asyncService.processAsync(delayMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.result").value(expectedResult));

        // Verify the async operation completed with expected result
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processAsync(delayMs);
    }

    @Test
    @DisplayName("비동기 작업 체이닝 완료 테스트")
    void asyncOperation_chaining_completion() throws Exception {
        // Given
        int delayMs = 100;
        CompletableFuture<String> future = asyncService.processAsync(delayMs)
                .thenApply(result -> result + " - Chained")
                .thenApply(result -> result + " - Completed");

        when(asyncService.processAsyncWithChaining(delayMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-chained")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Wait for the chained async operation to complete
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processAsyncWithChaining(delayMs);
                });
    }

    @Test
    @DisplayName("비동기 작업 병렬 실행 완료 테스트")
    void asyncOperation_parallelExecution_completion() throws Exception {
        // Given
        int delay1 = 100, delay2 = 150, delay3 = 200;
        
        when(asyncService.processAsync(delay1)).thenReturn(CompletableFuture.completedFuture("Task 1 completed"));
        when(asyncService.processAsync(delay2)).thenReturn(CompletableFuture.completedFuture("Task 2 completed"));
        when(asyncService.processAsync(delay3)).thenReturn(CompletableFuture.completedFuture("Task 3 completed"));

        // When - Execute all tasks in parallel
        var result1 = mockMvc.perform(get("/api/v1/async/process")
                .param("delay", String.valueOf(delay1))
                .contentType(MediaType.APPLICATION_JSON));

        var result2 = mockMvc.perform(get("/api/v1/async/process")
                .param("delay", String.valueOf(delay2))
                .contentType(MediaType.APPLICATION_JSON));

        var result3 = mockMvc.perform(get("/api/v1/async/process")
                .param("delay", String.valueOf(delay3))
                .contentType(MediaType.APPLICATION_JSON));

        // Then - All should complete successfully
        result1.andExpect(status().isOk());
        result2.andExpect(status().isOk());
        result3.andExpect(status().isOk());

        // Verify all operations were called
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processAsync(delay1);
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processAsync(delay2);
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processAsync(delay3);
    }

    @Test
    @DisplayName("비동기 작업 완료 후 콜백 실행 테스트")
    void asyncOperation_callbackExecution_afterCompletion() throws Exception {
        // Given
        int delayMs = 100;
        CompletableFuture<String> future = asyncService.processAsync(delayMs)
                .whenComplete((result, throwable) -> {
                    if (throwable != null) {
                        System.err.println("Async operation failed: " + throwable.getMessage());
                    } else {
                        System.out.println("Async operation completed: " + result);
                    }
                });

        when(asyncService.processAsyncWithCallback(delayMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-callback")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Wait for the async operation and callback to complete
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processAsyncWithCallback(delayMs);
                });
    }

    @Test
    @DisplayName("비동기 작업 완료 후 예외 발생 시 처리 테스트")
    void asyncOperation_exceptionHandling_afterCompletion() throws Exception {
        // Given
        int delayMs = 100;
        CompletableFuture<String> future = asyncService.processAsyncWithError(delayMs)
                .handle((result, throwable) -> {
                    if (throwable != null) {
                        return "Handled error: " + throwable.getMessage();
                    }
                    return result;
                });

        when(asyncService.processAsyncWithErrorHandling(delayMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-error-handling")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.result").value(containsString("Handled error")));

        // Verify the async operation with error handling was called
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processAsyncWithErrorHandling(delayMs);
    }

    @Test
    @DisplayName("비동기 작업이 실제 비동기로 실행되는지 확인 테스트")
    void asyncOperation_trulyAsynchronous_execution() throws Exception {
        // Given
        int delayMs = 500; // Longer delay to clearly see async behavior
        long startTime = System.currentTimeMillis();

        // When
        mockMvc.perform(get("/api/v1/async/process")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Then - The request should return quickly, not wait for the full delay
        long responseTime = System.currentTimeMillis() - startTime;
        
        // The response time should be much less than the delay (showing it's truly async)
        assertThat(responseTime).isLessThan(delayMs); // Should return almost immediately

        // But the async operation should still complete eventually
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processAsync(delayMs);
                });
    }

    @Test
    @DisplayName("비동기 작업 완료 대기 시간 초과 테스트")
    void asyncOperation_waitTimeout_completion() throws Exception {
        // Given
        int delayMs = 100;
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                return "Completed";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });

        when(asyncService.processAsync(delayMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Wait with timeout for the async operation to complete
        await().atMost(5, TimeUnit.SECONDS)  // Shorter timeout to test timeout handling
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processAsync(delayMs);
                });
    }

    @Test
    @DisplayName("비동기 작업 여러 번 반복 실행 후 완료 확인")
    void asyncOperation_repeatedExecution_completion() throws Exception {
        // Given
        int delayMs = 50;
        int repeatCount = 5;

        for (int i = 0; i < repeatCount; i++) {
            when(asyncService.processAsync(delayMs)).thenReturn(CompletableFuture.completedFuture("Completed task " + i));
        }

        // When & Then - Execute multiple times
        for (int i = 0; i < repeatCount; i++) {
            mockMvc.perform(get("/api/v1/async/process")
                    .param("delay", String.valueOf(delayMs))
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }

        // Verify that the async method was called multiple times
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(repeatCount)).processAsync(delayMs);
    }

    @Test
    @DisplayName("비동기 작업 완료 후 리소스 정리 테스트")
    void asyncOperation_resourceCleanup_afterCompletion() throws Exception {
        // Given
        int delayMs = 100;
        CompletableFuture<String> future = asyncService.processAsync(delayMs);

        when(asyncService.processAsyncWithCleanup(delayMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-cleanup")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Wait for the async operation to complete and resources to be cleaned up
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processAsyncWithCleanup(delayMs);
                    // Additional assertions for resource cleanup can be added here
                });
    }

    @Test
    @DisplayName("비동기 작업 완료 후 상태 업데이트 테스트")
    void asyncOperation_statusUpdate_afterCompletion() throws Exception {
        // Given
        int delayMs = 100;
        String taskId = "task-" + delayMs;
        
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                // Simulate status update after completion
                asyncService.updateTaskStatus(taskId, "COMPLETED");
                return "Task " + taskId + " completed";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });

        when(asyncService.processAsyncWithStatusUpdate(taskId, delayMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-status-update")
                .param("taskId", taskId)
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Wait for the async operation and status update to complete
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processAsyncWithStatusUpdate(taskId, delayMs);
                    verify(asyncService, times(1)).updateTaskStatus(taskId, "COMPLETED");
                });
    }

    @Test
    @DisplayName("비동기 작업 예외 발생 후 복구 테스트")
    void asyncOperation_recovery_afterException() throws Exception {
        // Given
        int delayMs = 100;
        
        // First call throws exception, second call succeeds
        when(asyncService.processAsyncWithErrorRecovery(delayMs))
                .thenThrow(new RuntimeException("First attempt failed"))
                .thenReturn(CompletableFuture.completedFuture("Recovered successfully"));

        // When & Then - First call (should fail)
        mockMvc.perform(get("/api/v1/async/process-with-recovery")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - Second call (should succeed after recovery)
        mockMvc.perform(get("/api/v1/async/process-with-recovery")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(asyncService, times(2)).processAsyncWithErrorRecovery(delayMs);
    }

    @Test
    @DisplayName("비동기 작업 완료 후 콜백에서 예외 발생 시 처리 테스트")
    void asyncOperation_callbackException_handling() throws Exception {
        // Given
        int delayMs = 100;
        CompletableFuture<String> future = asyncService.processAsync(delayMs)
                .whenComplete((result, throwable) -> {
                    // Simulate an exception in the callback
                    throw new RuntimeException("Exception in callback");
                });

        when(asyncService.processAsyncWithCallbackException(delayMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-callback-exception")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // The main operation should still complete despite callback exception
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processAsyncWithCallbackException(delayMs);
                });
    }

    @Test
    @DisplayName("비동기 작업 완료 후 데이터베이스 반영 확인 테스트")
    void asyncOperation_databaseReflection_afterCompletion() throws Exception {
        // Given
        int delayMs = 100;
        String userId = "asyncUser";
        
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                // Simulate async database operation
                asyncService.createUserAsync(userId, "Async User", "async@example.com");
                return "User " + userId + " created asynchronously";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });

        when(asyncService.processAsyncWithDatabaseOp(delayMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-db-op")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Wait for the async operation and database update to complete
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processAsyncWithDatabaseOp(delayMs);
                    verify(asyncService, times(1)).createUserAsync(eq(userId), anyString(), anyString());
                });
    }

    @Test
    @DisplayName("비동기 작업 완료 후 이메일 전송 확인 테스트")
    void asyncOperation_emailSending_afterCompletion() throws Exception {
        // Given
        int delayMs = 100;
        String recipient = "test@example.com";
        
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                // Simulate async email sending
                asyncService.sendEmailAsync(recipient, "Test Subject", "Test Message");
                return "Email sent to " + recipient;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });

        when(asyncService.processAsyncWithEmail(delayMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-email")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Wait for the async operation and email sending to complete
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processAsyncWithEmail(delayMs);
                    verify(asyncService, times(1)).sendEmailAsync(eq(recipient), anyString(), anyString());
                });
    }

    @Test
    @DisplayName("비동기 작업 완료 후 파일 업로드 확인 테스트")
    void asyncOperation_fileUpload_afterCompletion() throws Exception {
        // Given
        int delayMs = 100;
        String fileName = "test-file.txt";
        
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                // Simulate async file upload
                asyncService.uploadFileAsync(fileName, "File content...");
                return "File " + fileName + " uploaded";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });

        when(asyncService.processAsyncWithFileUpload(delayMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-file-upload")
                .param("delay", String.valueOf(delayMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Wait for the async operation and file upload to complete
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processAsyncWithFileUpload(delayMs);
                    verify(asyncService, times(1)).uploadFileAsync(eq(fileName), anyString());
                });
    }
}