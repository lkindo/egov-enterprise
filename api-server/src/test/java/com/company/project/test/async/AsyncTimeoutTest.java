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
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class AsyncTimeoutTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AsyncService asyncService;

    private static final int DEFAULT_TIMEOUT = 10; // seconds
    private static final int SHORT_TIMEOUT = 2; // seconds for timeout tests

    @BeforeEach
    void setUp() {
        // Mock async methods that will timeout
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

        when(asyncService.processWithTimeout(anyInt(), anyInt())).thenAnswer(invocation -> {
            int delayMs = invocation.getArgument(0);
            int timeoutMs = invocation.getArgument(1);
            
            return CompletableFuture.supplyAsync(() -> {
                try {
                    Thread.sleep(delayMs);
                    if (delayMs > timeoutMs) {
                        // Simulate timeout by throwing exception
                        throw new RuntimeException("Operation timed out");
                    }
                    return "Completed after " + delayMs + "ms with timeout " + timeoutMs + "ms";
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(e);
                }
            });
        });
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 발생 테스트")
    void asyncOperation_timeout_occurs() throws Exception {
        // Given
        int delayMs = 5000; // 5 seconds delay
        int timeoutMs = 100; // 100ms timeout (much shorter than delay)
        
        CompletableFuture<String> slowFuture = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                return "This should not complete in time";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });

        when(asyncService.processWithTimeout(delayMs, timeoutMs)).thenReturn(slowFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout()); // Expect timeout response

        // Verify that the async operation was attempted
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processWithTimeout(delayMs, timeoutMs);
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 후 예외 처리 확인")
    void asyncOperation_timeout_exceptionHandling() throws Exception {
        // Given
        int delayMs = 3000; // 3 seconds delay
        int timeoutMs = 500; // 500ms timeout
        
        CompletableFuture<String> timeoutFuture = new CompletableFuture<>();
        // Don't complete the future to simulate timeout
        
        when(asyncService.processWithTimeoutForException(delayMs, timeoutMs)).thenReturn(timeoutFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-exception")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("TIMEOUT_ERROR"));

        // Verify that the async operation was attempted
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processWithTimeoutForException(delayMs, timeoutMs);
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 설정 테스트 - CompletableFuture.get() with timeout")
    void asyncOperation_withTimeoutSetting() throws Exception {
        // Given
        int delayMs = 2000; // 2 seconds delay
        int timeoutMs = 100; // 100ms timeout
        
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                return "Should timeout before completion";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });

        // Simulate timeout behavior in service
        when(asyncService.processWithTimeout(delayMs, timeoutMs)).thenAnswer(invocation -> {
            try {
                return future.get(timeoutMs, TimeUnit.MILLISECONDS);
            } catch (TimeoutException e) {
                throw new RuntimeException("Operation timed out after " + timeoutMs + "ms");
            } catch (InterruptedException | ExecutionException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout());

        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processWithTimeout(delayMs, timeoutMs);
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 후 리소스 정리 테스트")
    void asyncOperation_timeout_resourceCleanup() throws Exception {
        // Given
        int delayMs = 5000; // 5 seconds delay
        int timeoutMs = 100; // 100ms timeout
        
        CompletableFuture<String> slowFuture = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                return "Should not reach completion";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "Interrupted";
            }
        });

        when(asyncService.processWithTimeoutAndCleanup(delayMs, timeoutMs)).thenReturn(slowFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-cleanup")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout());

        // Wait to ensure timeout handling and resource cleanup occurred
        Thread.sleep(500); // Brief pause to allow timeout processing

        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processWithTimeoutAndCleanup(delayMs, timeoutMs);
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).cleanupResources(anyString());
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 발생 시 적절한 에러 응답 반환")
    void asyncOperation_timeout_properErrorResponse() throws Exception {
        // Given
        int delayMs = 3000; // 3 seconds delay
        int timeoutMs = 200; // 200ms timeout
        
        CompletableFuture<String> timeoutFuture = new CompletableFuture<>();
        // Future never completes to trigger timeout
        
        when(asyncService.processWithTimeoutResponse(delayMs, timeoutMs)).thenReturn(timeoutFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-response")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists())
                .andExpect(jsonPath("$.error.code").value("OPERATION_TIMEOUT"))
                .andExpect(jsonPath("$.error.message").value("Operation timed out after " + timeoutMs + "ms"));

        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processWithTimeoutResponse(delayMs, timeoutMs);
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 후 재시도 메커니즘 테스트")
    void asyncOperation_timeout_retryMechanism() throws Exception {
        // Given
        int delayMs = 2000; // 2 seconds delay
        int timeoutMs = 100; // 100ms timeout
        
        // First call times out, second call succeeds
        CompletableFuture<String> timeoutFuture = new CompletableFuture<>();
        CompletableFuture<String> successFuture = CompletableFuture.completedFuture("Success after retry");
        
        when(asyncService.processWithRetry(anyInt(), anyInt()))
                .thenReturn(timeoutFuture)  // First call times out
                .thenReturn(successFuture); // Second call succeeds

        // When & Then - First request (should timeout)
        mockMvc.perform(get("/api/v1/async/process-with-retry")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout());

        // When & Then - Second request (should succeed after retry)
        mockMvc.perform(get("/api/v1/async/process-with-retry")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(asyncService, times(2)).processWithRetry(delayMs, timeoutMs);
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 시 콜백 실행 확인")
    void asyncOperation_timeout_callbackExecution() throws Exception {
        // Given
        int delayMs = 3000; // 3 seconds delay
        int timeoutMs = 100; // 100ms timeout
        
        CompletableFuture<String> timeoutFuture = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                return "Should timeout before completion";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        }).orTimeout(timeoutMs, TimeUnit.MILLISECONDS);

        when(asyncService.processWithTimeoutCallback(delayMs, timeoutMs)).thenReturn(timeoutFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-callback")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout());

        // Wait for timeout to occur and callback to execute
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processWithTimeoutCallback(delayMs, timeoutMs);
                    verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).handleTimeout(anyString());
                });
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 후 예외 복구 테스트")
    void asyncOperation_timeout_exceptionRecovery() throws Exception {
        // Given
        int delayMs = 4000; // 4 seconds delay
        int timeoutMs = 200; // 200ms timeout
        
        CompletableFuture<String> timeoutFuture = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                return "Should timeout";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });

        when(asyncService.processWithTimeoutRecovery(delayMs, timeoutMs)).thenReturn(timeoutFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-recovery")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout());

        // Verify that the service handles the timeout gracefully
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processWithTimeoutRecovery(delayMs, timeoutMs);
        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).handleTimeoutRecovery(anyString(), any(Exception.class));
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 시 상태 업데이트 확인")
    void asyncOperation_timeout_statusUpdate() throws Exception {
        // Given
        int delayMs = 3500; // 3.5 seconds delay
        int timeoutMs = 150; // 150ms timeout
        
        CompletableFuture<String> timeoutFuture = new CompletableFuture<>();
        // Never complete to trigger timeout
        
        when(asyncService.processWithTimeoutStatusUpdate(delayMs, timeoutMs)).thenReturn(timeoutFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-status")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout())
                .andExpect(jsonPath("$.error.code").value("TASK_TIMEOUT"));

        // Verify that status was updated to reflect timeout
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processWithTimeoutStatusUpdate(delayMs, timeoutMs);
                    verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).updateTaskStatus(anyString(), eq("TIMEOUT"));
                });
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 시 리소스 누수 방지 테스트")
    void asyncOperation_timeout_resourceLeakPrevention() throws Exception {
        // Given
        int delayMs = 5000; // 5 seconds delay
        int timeoutMs = 100; // 100ms timeout
        
        CompletableFuture<String> slowFuture = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                return "Should timeout before completion";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "Interrupted and cleaned up";
            }
        });

        when(asyncService.processWithTimeoutResourceCleanup(delayMs, timeoutMs)).thenReturn(slowFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-resource-cleanup")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout());

        // Verify that resources were cleaned up after timeout
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processWithTimeoutResourceCleanup(delayMs, timeoutMs);
                    verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).atLeast(1)).cleanupResources(anyString());
                });
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 시 예외 전파 테스트")
    void asyncOperation_timeout_exceptionPropagation() throws Exception {
        // Given
        int delayMs = 4000; // 4 seconds delay
        int timeoutMs = 200; // 200ms timeout
        
        CompletableFuture<String> timeoutFuture = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                return "Should not complete";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Task interrupted due to timeout", e);
            }
        });

        when(asyncService.processWithTimeoutExceptionPropagation(delayMs, timeoutMs)).thenReturn(timeoutFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-exception-propagation")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout())
                .andExpect(jsonPath("$.error.code").value("ASYNC_OPERATION_TIMEOUT"));

        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processWithTimeoutExceptionPropagation(delayMs, timeoutMs);
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 시 쓰레드 중지 확인")
    void asyncOperation_timeout_threadTermination() throws Exception {
        // Given
        int delayMs = 6000; // 6 seconds delay
        int timeoutMs = 300; // 300ms timeout
        
        CompletableFuture<String> longRunningFuture = CompletableFuture.supplyAsync(() -> {
            try {
                for (int i = 0; i < delayMs / 100; i++) {
                    Thread.sleep(100);
                    // Check if thread was interrupted
                    if (Thread.currentThread().isInterrupted()) {
                        return "Thread interrupted";
                    }
                }
                return "Completed";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "Thread properly interrupted";
            }
        });

        when(asyncService.processWithTimeoutThreadTermination(delayMs, timeoutMs)).thenReturn(longRunningFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-thread-termination")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout());

        // Wait briefly to allow thread interruption to occur
        Thread.sleep(500);

        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processWithTimeoutThreadTermination(delayMs, timeoutMs);
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 시 데이터베이스 트랜잭션 롤백 확인")
    void asyncOperation_timeout_transactionRollback() throws Exception {
        // Given
        int delayMs = 3000; // 3 seconds delay
        int timeoutMs = 200; // 200ms timeout
        
        CompletableFuture<String> timeoutFuture = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                // Simulate database operation that should be rolled back on timeout
                asyncService.performDatabaseOperationAsync("testData");
                return "Should timeout before DB op completes";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });

        when(asyncService.processWithTimeoutTransaction(delayMs, timeoutMs)).thenReturn(timeoutFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-transaction")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout());

        // Verify that the async operation was attempted but should have been rolled back due to timeout
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processWithTimeoutTransaction(delayMs, timeoutMs);
                    // Verify that rollback was handled appropriately
                    verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).rollbackDatabaseOperation(anyString());
                });
    }

    @Test
    @DisplayName("짧은 타임아웃 설정으로 인한 즉시 타임아웃 테스트")
    void asyncOperation_immediateTimeout_dueToShortTimeout() throws Exception {
        // Given
        int delayMs = 1000; // 1 second delay
        int timeoutMs = 1; // 1ms timeout (very short)
        
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                return "Should timeout immediately";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });

        when(asyncService.processWithImmediateTimeout(delayMs, timeoutMs)).thenReturn(future);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-immediate-timeout")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout())
                .andExpect(jsonPath("$.error.code").value("IMMEDIATE_TIMEOUT"));

        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processWithImmediateTimeout(delayMs, timeoutMs);
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 시 메모리 누수 방지 테스트")
    void asyncOperation_timeout_memoryLeakPrevention() throws Exception {
        // Given
        int delayMs = 4000; // 4 seconds delay
        int timeoutMs = 100; // 100ms timeout
        
        // Record initial memory usage
        System.gc(); // Suggest garbage collection
        long initialMemory = Runtime.getRuntime().freeMemory();
        
        CompletableFuture<String> timeoutFuture = new CompletableFuture<>();
        // Never complete to trigger timeout
        
        when(asyncService.processWithTimeoutMemoryManagement(delayMs, timeoutMs)).thenReturn(timeoutFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-memory")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout());

        // Allow time for timeout handling and resource cleanup
        Thread.sleep(500);
        
        // Record final memory usage
        System.gc(); // Suggest garbage collection
        long finalMemory = Runtime.getRuntime().freeMemory();
        
        // Memory usage should not have significantly decreased (indicating no major leaks)
        assertThat(Math.abs(initialMemory - finalMemory)).isLessThan(initialMemory * 0.1); // Within 10% range

        verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).processWithTimeoutMemoryManagement(delayMs, timeoutMs);
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 시 연결된 리소스 해제 확인")
    void asyncOperation_timeout_connectedResourcesRelease() throws Exception {
        // Given
        int delayMs = 5000; // 5 seconds delay
        int timeoutMs = 200; // 200ms timeout
        
        CompletableFuture<String> timeoutFuture = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                return "Should timeout before completion";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "Interrupted";
            }
        });

        when(asyncService.processWithTimeoutConnectedResources(delayMs, timeoutMs)).thenReturn(timeoutFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-connected-resources")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout());

        // Verify that connected resources were released after timeout
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processWithTimeoutConnectedResources(delayMs, timeoutMs);
                    verify(asyncService, timeout(DEFAULT_TIMEOUT * 1000).times(1)).releaseConnectedResources(anyString());
                });
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 시 이메일 전송 취소 확인")
    void asyncOperation_timeout_emailSendCancellation() throws Exception {
        // Given
        int delayMs = 3000; // 3 seconds delay
        int timeoutMs = 100; // 100ms timeout
        
        CompletableFuture<String> timeoutFuture = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                // Simulate email sending operation that should be cancelled on timeout
                asyncService.sendEmailAsync("test@example.com", "Subject", "Message");
                return "Should timeout before email sends";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "Interrupted";
            }
        });

        when(asyncService.processWithTimeoutEmailSend(delayMs, timeoutMs)).thenReturn(timeoutFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-email-send")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout());

        // Verify that email sending was cancelled due to timeout
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processWithTimeoutEmailSend(delayMs, timeoutMs);
                    // Verify that email was not sent due to timeout
                    verify(asyncService, never()).sendEmailAsync(anyString(), anyString(), anyString());
                });
    }

    @Test
    @DisplayName("비동기 작업 타임아웃 시 파일 업로드 중단 확인")
    void asyncOperation_timeout_fileUploadCancellation() throws Exception {
        // Given
        int delayMs = 4000; // 4 seconds delay
        int timeoutMs = 150; // 150ms timeout
        
        CompletableFuture<String> timeoutFuture = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delayMs);
                // Simulate file upload operation that should be cancelled on timeout
                asyncService.uploadFileAsync("test.txt", "file content");
                return "Should timeout before file uploads";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "Interrupted";
            }
        });

        when(asyncService.processWithTimeoutFileUpload(delayMs, timeoutMs)).thenReturn(timeoutFuture);

        // When & Then
        mockMvc.perform(get("/api/v1/async/process-with-timeout-file-upload")
                .param("delay", String.valueOf(delayMs))
                .param("timeout", String.valueOf(timeoutMs))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isRequestTimeout());

        // Verify that file upload was cancelled due to timeout
        await().atMost(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    verify(asyncService, times(1)).processWithTimeoutFileUpload(delayMs, timeoutMs);
                    // Verify that file was not uploaded due to timeout
                    verify(asyncService, never()).uploadFileAsync(anyString(), anyString());
                });
    }
}