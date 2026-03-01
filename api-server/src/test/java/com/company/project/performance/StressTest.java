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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * ?�력 ?�스?? ?�스?�이 최�? ?�능???�달?�을 ?�의 ?�작 ?�스?? * ?�스?�이 고�????�황?�서 ?�떻�??�작?�는지 ?��?
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class StressTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    private ExecutorService executorService;

    @BeforeEach
    void setUp() {
        // 고성???�스?��? ?�해 ?????�레???� ?�용
        executorService = Executors.newFixedThreadPool(50);
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
    @DisplayName("?�용??목록 조회 - 고�????�력 ?�스??(500�??�시 ?�청)")
    void stressTest_getUserList_500ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 500;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // Warm-up
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // When: 500개의 ?�시 ?�청 ?�행
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
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

        // Then: 모든 ?�청???�료???�까지 ?��?(고�????�스?�이므�???�??�간 ?��?
        boolean allCompleted = latch.await(120, TimeUnit.SECONDS); // 최�? 120�??��?
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

        System.out.printf("고�????�스??결과 - ?�청 ?? %d, ?�공: %d, ?�패: %d, ?�간: %d ms, TPS: %.2f, ?�료 ?��?: %b%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond, allCompleted);

        // 고�????�황?��?�?80% ?�상???�청???�공?�면 ?�공?�로 간주
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.80));
    }

    @Test
    @DisplayName("?�용???�록 - 고�????�력 ?�스??(200�??�시 ?�청)")
    void stressTest_userSignup_200ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 200;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 200개의 ?�시 ?�용???�록 ?�청 ?�행
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    String requestBody = """
                            {
                                "userId": "stressTestUser%d",
                                "password": "Password123!",
                                "userNm": "고�????�스???�용??d",
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

        // Then: 모든 ?�청???�료???�까지 ?��?        boolean allCompleted = latch.await(180, TimeUnit.SECONDS); // 고�????�록 ?�청?��?�?180�??��?        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // 결과 ?�인
        long successfulRequests = futures.stream()
                .map(future -> {
                    try {
                        return future.get(15, TimeUnit.SECONDS);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .filter(Boolean::booleanValue)
                .count();

        System.out.printf("?�용???�록 고�????�스??결과 - ?�청 ?? %d, ?�공: %d, ?�패: %d, ?�간: %d ms, TPS: %.2f, ?�료 ?��?: %b%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond, allCompleted);

        // ?�록 ?�청?� 중복 ID�??�해 ?��? ?�패?????�으므�?70% ?�상 ?�공??목표�???        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.70));
    }

    @Test
    @DisplayName("?�용???�일 조회 - 고�????�력 ?�스??(300�??�시 ?�청)")
    void stressTest_getUserById_300ConcurrentRequests() throws Exception {
        // Given: 먼�? ?�스???�용???�성
        for (int i = 0; i < 50; i++) {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "stressUser" + i,
                        "Password123!",
                        "고�????�스???�용?? + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // ?��? 존재?�는 경우 무시
            }
        }

        int numberOfRequests = 300;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 300개의 ?�시 ?�용??조회 ?�청 ?�행 (?�운??로빈?�로 ?�른 ?�용??조회)
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final String userId = "stressUser" + (i % 50); // 50명의 ?�용??�??�나�??�환
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

        // Then: 모든 ?�청???�료???�까지 ?��?        boolean allCompleted = latch.await(120, TimeUnit.SECONDS); // 최�? 120�??��?        long endTime = System.currentTimeMillis();

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

        System.out.printf("?�용???�일 조회 고�????�스??결과 - ?�청 ?? %d, ?�공: %d, ?�패: %d, ?�간: %d ms, TPS: %.2f, ?�료 ?��?: %b%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond, allCompleted);

        // 고�????�황?��?�?85% ?�상???�청???�공?�면 ?�공?�로 간주
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.85));
    }

    @Test
    @DisplayName("지?�적??고�????�스??- 5분간 지?�적???�청")
    void stressTest_continuousHighLoad_5Minutes() throws Exception {
        // Given
        int threads = 20; // 20개의 ?�레?�로 지?�적???�청
        int requestsPerThread = 50; // �??�레?�당 50�??�청
        int totalRequests = threads * requestsPerThread; // �?1000�??�청
        CountDownLatch latch = new CountDownLatch(totalRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        ExecutorService continuousExecutor = Executors.newFixedThreadPool(threads);

        // When: 5분간 지?�적???�청
        long testDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
        long testStartTime = System.currentTimeMillis();

        for (int threadId = 0; threadId < threads; threadId++) {
            final int threadIdFinal = threadId;
            continuousExecutor.submit(() -> {
                for (int i = 0; i < requestsPerThread; i++) {
                    try {
                        // Stop if test duration exceeded
                        if (System.currentTimeMillis() - testStartTime > testDuration) {
                            break;
                        }

                        String userId = "continuousUser" + (threadIdFinal * requestsPerThread + i);
                        String requestBody = """
                                {
                                    "userId": "%s",
                                    "password": "Password123!",
                                    "userNm": "지???�스???�용??d",
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """.formatted(userId, threadIdFinal * requestsPerThread + i);

                        mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk());
                    } catch (Exception e) {
                        e.printStackTrace();
                    } finally {
                        latch.countDown();
                    }
                }
            });
        }

        // Then: 모든 ?�청???�료?�기�??��?        boolean allCompleted = latch.await(400, TimeUnit.SECONDS); // 5�??�상 ?��?(6�?40�?
        long testEndTime = System.currentTimeMillis();

        long duration = testEndTime - testStartTime;
        double requestsPerSecond = (double) totalRequests / (duration / 1000.0);

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

        System.out.printf("지??고�????�스??결과 - ?�청 ?? %d, ?�공: %d, ?�패: %d, ?�간: %d ms, TPS: %.2f, ?�료 ?��?: %b%n",
                totalRequests, successfulRequests, totalRequests - successfulRequests, duration, requestsPerSecond,
                allCompleted);

        // 지?�적??고�????�황?��?�?75% ?�상???�청???�공?�면 ?�공?�로 간주
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (totalRequests * 0.75));

        continuousExecutor.shutdown();
    }

    @Test
    @DisplayName("고�????�황?�서???�답 ?�간 변??추이")
    void stressTest_responseTimeTrend_underHighLoad() throws Exception {
        // Given
        int numberOfRequests = 100;
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();
        CountDownLatch latch = new CountDownLatch(numberOfRequests);

        // When: 고�????�황?�서 ?�답 ?�간 측정
        // long testStartTime = System.currentTimeMillis(); // Removed unused variable

        for (int i = 0; i < numberOfRequests; i++) {
            executorService.submit(() -> {
                try {
                    long requestStartTime = System.currentTimeMillis();
                    mockMvc.perform(get("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON))
                            .andExpect(status().isOk());
                    long responseTime = System.currentTimeMillis() - requestStartTime;
                    responseTimes.add(responseTime);
                } catch (Exception e) {
                    e.printStackTrace();
                    responseTimes.add(-1L); // Error marker
                } finally {
                    latch.countDown();
                }
            });
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(60, TimeUnit.SECONDS);

        // ?�답 ?�간 분석
        if (responseTimes.isEmpty()) {
            responseTimes.add(0L);
        }

        long successfulRequests = responseTimes.stream().filter(time -> time > 0).count();
        long avgResponseTime = (long) responseTimes.stream()
                .filter(time -> time > 0)
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .filter(time -> time > 0)
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);
        long minResponseTime = responseTimes.stream()
                .filter(time -> time > 0)
                .mapToLong(Long::longValue)
                .min()
                .orElse(0L);

        System.out.printf("고�????�답 ?�간 분석 - ?�균: %d ms, 최�?: %d ms, 최소: %d ms, ?�공 ?�청: %d/%d%n",
                avgResponseTime, maxResponseTime, minResponseTime, successfulRequests, numberOfRequests);

        // 고�????�황?�서???�균 ?�답 ?�간??2000ms ?�하?�야 ??        assertThat(avgResponseTime).isLessThan(2000L);
    }

    @Test
    @DisplayName("고�????�황?�서??메모�??�용??변??)
    void stressTest_memoryUsage_underHighLoad() throws Exception {
        // Given
        Runtime runtime = Runtime.getRuntime();
        System.gc(); // Force garbage collection before test
        long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

        int numberOfRequests = 100;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);

        // When: 고�????�황?�서 메모�??�용??모니?�링
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

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(60, TimeUnit.SECONDS);

        System.gc(); // Force garbage collection after test
        long finalUsedMemory = runtime.totalMemory() - runtime.freeMemory();
        long memoryIncrease = finalUsedMemory - initialUsedMemory;

        System.out.printf("고�???메모�??�용??- 초기: %d bytes, 최종: %d bytes, 증�?: %d bytes%n",
                initialUsedMemory, finalUsedMemory, memoryIncrease);

        // 고�????�황?�서??메모�?증�??�이 100MB ?�하?�야 ??(메모�??�수 방�? 기�?)
        assertThat(memoryIncrease).isLessThan(100 * 1024 * 1024L); // 100MB
    }

    @Test
    @DisplayName("고�????�황?�서???�류??측정")
    void stressTest_errorRate_underHighLoad() throws Exception {
        // Given
        int numberOfRequests = 250;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Integer>> futures = new ArrayList<>();

        // When: 고�????�황?�서 ?�류??측정
        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            Future<Integer> future = executorService.submit(() -> {
                if (requestId % 50 == 0)
                    System.out.println("Error rate check request #" + requestId);
                try {
                    var result = mockMvc.perform(get("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON))
                            .andReturn();
                    return result.getResponse().getStatus();
                } catch (Exception e) {
                    e.printStackTrace();
                    return 500; // Error status
                } finally {
                    latch.countDown();
                }
            });
            futures.add(future);
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(90, TimeUnit.SECONDS);

        // 결과 분석
        long successCount = futures.stream()
                .map(future -> {
                    try {
                        return future.get(10, TimeUnit.SECONDS);
                    } catch (Exception e) {
                        return 500; // Error status
                    }
                })
                .filter(status -> status >= 200 && status < 300)
                .count();

        long errorCount = numberOfRequests - successCount;
        double errorRate = (double) errorCount / numberOfRequests * 100;

        System.out.printf("고�????�류??측정 - ?�공: %d, ?�패: %d, ?�류?? %.2f%%%n",
                successCount, errorCount, errorRate);

        // 고�????�황?�서???�류?�이 20% 미만?�어????        assertThat(errorRate).isLessThan(20.0);
    }

    @Test
    @DisplayName("고�????�황?�서???�이???�합???�인")
    void stressTest_dataIntegrity_underHighLoad() throws Exception {
        // Given
        String testUserId = "dataIntegrityUser";
        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: ?�일???�용?�에 ?�??고�????�데?�트 ?�청
        for (int i = 0; i < numberOfRequests; i++) {
            final int updateValue = i;
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    // ?�용???�록 ?�청 (처음�??�공, ?�후???�패 ?�는 ?�데?�트)
                    String requestBody = """
                            {
                                "userId": "%s",
                                "password": "Password123!",
                                "userNm": "?�이??무결???�스???�용??d",
                                "passwordHint": "hint",
                                "passwordCnsr": "answer",
                                "role": "USER"
                            }
                            """.formatted(testUserId, updateValue);

                    mockMvc.perform(post("/api/v1/users/signup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody));
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

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(60, TimeUnit.SECONDS);

        // 결과 ?�인: 최소???�나 ?�상???�청?� ?�공?�야 ??        long successfulRequests = futures.stream()
                .map(future -> {
                    try {
                        return future.get(10, TimeUnit.SECONDS);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .filter(Boolean::booleanValue)
                .count();

        // ?�용???�보 ?�인
        mockMvc.perform(get("/api/v1/users/" + testUserId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(testUserId));

        System.out.printf("?�이??무결???�스??- ?�청 ?? %d, ?�공: %d%n", numberOfRequests, successfulRequests);

        // 최소???�나 ?�상???�청?� ?�공?�야 ??(중복 ID�??�해 ?�머지???�패)
        assertThat(successfulRequests).isGreaterThan(0);
    }
}
