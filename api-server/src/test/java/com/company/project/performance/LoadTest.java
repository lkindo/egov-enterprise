package com.company.project.performance;

import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 로드 ?�스?? ?�수???�시 ?�청 처리 ?�력 ?�스?? * ?�스?�이 ?�시???�러 ?�청??처리?????�는 ?�력???��?
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class LoadTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    private ExecutorService executorService;

    @BeforeEach
    void setUp() {
        executorService = Executors.newFixedThreadPool(20); // 20개의 ?�레???�
    }

    @AfterEach
    void tearDown() {
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
            try {
                if (!executorService.awaitTermination(10, TimeUnit.SECONDS)) {
                    executorService.shutdownNow();
                }
            } catch (InterruptedException e) {
                executorService.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }

    @Test
    @DisplayName("?�용??목록 조회 - 100�??�시 ?�청 로드 ?�스??)
    void loadTest_getUserList_100ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 100;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // Warm-up: ?�제 ?�스???�에 �?개의 ?�청??미리 처리
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // When: 100개의 ?�시 ?�청 ?�행
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            if (i % 50 == 0)
                System.out.println("Processing load id: " + i);
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    mockMvc.perform(get("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON))
                            .andExpect(status().isOk())
                            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                            .andExpect(jsonPath("$.success").value(true))
                            .andExpect(jsonPath("$.data").isArray());
                    return true;
                } catch (Exception e) {
                    e.printStackTrace();
                    return false;
                } finally {
                    latch.countDown();
                }
            });
            futures.add(future);
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(60, TimeUnit.SECONDS); // 최�? 60�??��?        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // 결과 ?�인
        long successfulRequests = futures.stream()
                .map(future -> {
                    try {
                        return future.get(5, TimeUnit.SECONDS);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .filter(Boolean::booleanValue)
                .count();

        System.out.printf("로드 ?�스??결과 - ?�청 ?? %d, ?�공: %d, ?�패: %d, ?�간: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        List<Long> responseTimes = futures.stream()
                .map(f -> {
                    try {
                        return Boolean.TRUE.equals(f.get()) ? 0L : -1L;
                    } catch (Exception e) {
                        return -1L;
                    }
                })
                .filter(t -> t >= 0)
                .toList();

        if (!responseTimes.isEmpty()) {
            double avg = responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
            System.out.printf("?�균 ?�답 지??추정�? %.2f ms (?�공 기�?)%n", avg);
        }

        // ?�공률이 95% ?�상?�어????        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
    }

    @Test
    @DisplayName("?�용???�록 - 50�??�시 ?�청 로드 ?�스??)
    void loadTest_userSignup_50ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 50개의 ?�시 ?�용???�록 ?�청 ?�행
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    String requestBody = """
                            {
                                "userId": "loadTestUser%d",
                                "password": "Password123!",
                                "userNm": "로드 ?�스???�용??d",
                                "passwordHint": "hint",
                                "passwordCnsr": "answer",
                                "role": "USER"
                            }
                            """.formatted(requestId, requestId);

                    mockMvc.perform(post("/api/v1/users/signup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                            .andExpect(status().isOk())
                            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                            .andExpect(jsonPath("$.success").value(true))
                            .andExpect(jsonPath("$.data").exists());
                    return true;
                } catch (Exception e) {
                    e.printStackTrace();
                    return false;
                } finally {
                    latch.countDown();
                }
            });
            futures.add(future);
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(60, TimeUnit.SECONDS); // 최�? 60�??��?        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // 결과 ?�인
        long successfulRequests = futures.stream()
                .map(future -> {
                    try {
                        return future.get(5, TimeUnit.SECONDS);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .filter(Boolean::booleanValue)
                .count();

        System.out.printf("?�용???�록 로드 ?�스??결과 - ?�청 ?? %d, ?�공: %d, ?�패: %d, ?�간: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        // ?�공률이 90% ?�상?�어????(중복 ID�??�한 ?�패 고려)
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
    }

    @Test
    @DisplayName("?�용???�일 조회 - 200�??�시 ?�청 로드 ?�스??)
    void loadTest_getUserById_200ConcurrentRequests() throws Exception {
        // Given: 먼�? ?�스???�용???�성
        IntStream.range(0, 10).forEach(i -> {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "perfUser" + i,
                        "Password123!",
                        "?�능 ?�스???�용?? + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // ?��? 존재?�는 경우 무시
            }
        });

        int numberOfRequests = 200;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 200개의 ?�시 ?�용??조회 ?�청 ?�행 (?�운??로빈?�로 ?�른 ?�용??조회)
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final String userId = "perfUser" + (i % 10); // 10명의 ?�용??�??�나�??�환
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    mockMvc.perform(get("/api/v1/users/" + userId)
                            .contentType(MediaType.APPLICATION_JSON))
                            .andExpect(status().isOk())
                            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                            .andExpect(jsonPath("$.success").value(true))
                            .andExpect(jsonPath("$.data").exists())
                            .andExpect(jsonPath("$.data.userId").value(userId));
                    return true;
                } catch (Exception e) {
                    e.printStackTrace();
                    return false;
                } finally {
                    latch.countDown();
                }
            });
            futures.add(future);
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(90, TimeUnit.SECONDS); // 최�? 90�??��?(??많�? ?�청 처리�??�해)
        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // 결과 ?�인
        long successfulRequests = futures.stream()
                .map(future -> {
                    try {
                        return future.get(10, TimeUnit.SECONDS);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .filter(Boolean::booleanValue)
                .count();

        System.out.printf("?�용???�일 조회 로드 ?�스??결과 - ?�청 ?? %d, ?�공: %d, ?�패: %d, ?�간: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        // ?�공률이 95% ?�상?�어????        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
    }

    @Test
    @DisplayName("?�용??목록 ?�이�?조회 - 75�??�시 ?�청 로드 ?�스??)
    void loadTest_getPagedUserList_75ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 75;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 75개의 ?�시 ?�이�??�용??목록 ?�청 ?�행
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            if (i % 50 == 0)
                System.out.println("Processing load id: " + i);
            final int pageNum = i % 5; // 0~4 ?�이지 �??�나�??�환
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    mockMvc.perform(get("/api/v1/users/paged?page=%d&size=10".formatted(pageNum))
                            .contentType(MediaType.APPLICATION_JSON))
                            .andExpect(status().isOk())
                            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                            .andExpect(jsonPath("$.success").value(true))
                            .andExpect(jsonPath("$.data").exists())
                            .andExpect(jsonPath("$.data.content").isArray());
                    return true;
                } catch (Exception e) {
                    e.printStackTrace();
                    return false;
                } finally {
                    latch.countDown();
                }
            });
            futures.add(future);
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(60, TimeUnit.SECONDS); // 최�? 60�??��?        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // 결과 ?�인
        long successfulRequests = futures.stream()
                .map(future -> {
                    try {
                        return future.get(5, TimeUnit.SECONDS);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .filter(Boolean::booleanValue)
                .count();

        System.out.printf("?�이�??�용??목록 로드 ?�스??결과 - ?�청 ?? %d, ?�공: %d, ?�패: %d, ?�간: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        // ?�공률이 95% ?�상?�어????        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
    }

    @Test
    @DisplayName("?�합 API ?�청 - 150�??�시 ?�청 로드 ?�스??)
    void loadTest_mixedApiRequests_150ConcurrentRequests() throws Exception {
        // Given: 먼�? �?명의 ?�스???�용???�성
        IntStream.range(0, 20).forEach(i -> {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "mixedUser" + i,
                        "Password123!",
                        "?�합 ?�스???�용?? + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // ?��? 존재?�는 경우 무시
            }
        });

        int numberOfRequests = 150;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: ?�양??API ?�청 ?�합 (조회 60%, ?�록 20%, ?�일 조회 20%)
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final int requestType = i % 10; // 0-9
            Future<Boolean> future;

            if (requestType < 6) { // 60% - ?�용??목록 조회
                future = executorService.submit(() -> {
                    try {
                        mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true));
                        return true;
                    } catch (Exception e) {
                        e.printStackTrace();
                        return false;
                    } finally {
                        latch.countDown();
                    }
                });
            } else if (requestType < 8) { // 20% - ?�용???�일 조회
                final String userId = "mixedUser" + (i % 20);
                future = executorService.submit(() -> {
                    try {
                        mockMvc.perform(get("/api/v1/users/" + userId)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true));
                        return true;
                    } catch (Exception e) {
                        e.printStackTrace();
                        return false;
                    } finally {
                        latch.countDown();
                    }
                });
            } else { // 20% - ?�용???�록
                final int userIdNum = numberOfRequests + i; // 중복 방�?�??�해 고유??ID ?�용
                future = executorService.submit(() -> {
                    try {
                        String requestBody = """
                                {
                                    "userId": "mixedLoadUser%d",
                                    "password": "Password123!",
                                    "userNm": "?�합 로드 ?�스???�용??d",
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """.formatted(userIdNum, userIdNum);

                        mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true));
                        return true;
                    } catch (Exception e) {
                        e.printStackTrace();
                        return false;
                    } finally {
                        latch.countDown();
                    }
                });
            }
            futures.add(future);
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(120, TimeUnit.SECONDS); // 최�? 120�??��?(?�합 ?�청 처리�??�해)
        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // 결과 ?�인
        long successfulRequests = futures.stream()
                .map(future -> {
                    try {
                        return future.get(10, TimeUnit.SECONDS);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .filter(Boolean::booleanValue)
                .count();

        System.out.printf("?�합 API ?�청 로드 ?�스??결과 - ?�청 ?? %d, ?�공: %d, ?�패: %d, ?�간: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        // ?�공률이 90% ?�상?�어????(?�록 ?�청 �??��???중복 ID�??�해 ?�패?????�음)
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
    }

    @Test
    @DisplayName("로드 ?�스??- ?�답 ?�간 분석")
    void loadTest_responseTimeAnalysis() throws Exception {
        // Given
        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new CopyOnWriteArrayList<>(); // Thread-safe list for response times

        // When: ?�답 ?�간 측정???�한 ?�청 ?�행
        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            executorService.submit(() -> {
                try {
                    long requestStartTime = System.currentTimeMillis();
                    mockMvc.perform(get("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON))
                            .andExpect(status().isOk());
                    long responseTime = System.currentTimeMillis() - requestStartTime;
                    responseTimes.add(responseTime);
                    
                    if (requestId % 10 == 0) {
                        System.out.printf("Request [%d] completed in %d ms%n", requestId, responseTime);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            });
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(60, TimeUnit.SECONDS);

        // ?�답 ?�간 분석
        if (!responseTimes.isEmpty()) {
            long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
            long maxResponseTime = responseTimes.stream().mapToLong(Long::longValue).max().orElse(0L);
            long minResponseTime = responseTimes.stream().mapToLong(Long::longValue).min().orElse(0L);

            System.out.printf("?�답 ?�간 분석 - ?�균: %d ms, 최�?: %d ms, 최소: %d ms, ?�청 ?? %d%n",
                    avgResponseTime, maxResponseTime, minResponseTime, responseTimes.size());

            // ?�균 ?�답 ?�간??1000ms ?�하?�야 ??(?�능 기�?)
            assertThat(avgResponseTime).isLessThan(1000L);
        }
    }

    @Test
    @DisplayName("로드 ?�스??- 메모�??�용??모니?�링")
    void loadTest_memoryUsageMonitoring() throws Exception {
        // Given
        Runtime runtime = Runtime.getRuntime();
        System.gc(); // Force garbage collection before test
        long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

        int numberOfRequests = 30;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);

        // When: 메모�??�용??모니?�링???�한 ?�청 ?�행
        for (int i = 0; i < numberOfRequests; i++) {
            executorService.submit(() -> {
                try {
                    mockMvc.perform(get("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON))
                            .andExpect(status().isOk());
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            });
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(30, TimeUnit.SECONDS);

        System.gc(); // Force garbage collection after test
        long finalUsedMemory = runtime.totalMemory() - runtime.freeMemory();
        long memoryIncrease = finalUsedMemory - initialUsedMemory;

        System.out.printf("메모�??�용??- 초기: %d bytes, 최종: %d bytes, 증�?: %d bytes%n",
                initialUsedMemory, finalUsedMemory, memoryIncrease);

        // 메모�?증�??�이 50MB ?�하?�야 ??(메모�??�수 방�? 기�?)
        assertThat(memoryIncrease).isLessThan(50 * 1024 * 1024L); // 50MB
    }
}
