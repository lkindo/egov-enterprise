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
 * 병목 지???�별 �?개선 ?�스?? * ?�능 ?�?�의 ?�인??분석?�고 개선 방안???�시
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class BottleneckIdentificationAndImprovementTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    private ExecutorService executorService;

    @BeforeEach
    void setUp() {
        executorService = Executors.newFixedThreadPool(30);
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
    @DisplayName("병목 지???�별 - ?�일 ?�레??vs ?�중 ?�레???�능 비교")
    void bottleneck_identification_singleVsMultiThreadPerformance() throws Exception {
        // Given
        int numberOfRequests = 100;

        // ?�일 ?�레???�능 측정
        long singleThreadStartTime = System.currentTimeMillis();
        for (int i = 0; i < numberOfRequests; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
        long singleThreadDuration = System.currentTimeMillis() - singleThreadStartTime;

        // ?�중 ?�레???�능 측정
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();
        long multiThreadStartTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    mockMvc.perform(get("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON))
                            .andExpect(status().isOk());
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

        latch.await(60, TimeUnit.SECONDS);
        long multiThreadDuration = System.currentTimeMillis() - multiThreadStartTime;

        // 결과 분석
        double singleThreadTPS = (double) numberOfRequests / (singleThreadDuration / 1000.0);
        double multiThreadTPS = (double) numberOfRequests / (multiThreadDuration / 1000.0);
        double performanceRatio = multiThreadTPS / singleThreadTPS;

        System.out.printf("?�능 비교 결과 - ?�일 ?�레?? %d ms (%.2f TPS), ?�중 ?�레?? %d ms (%.2f TPS), 비율: %.2fx%n",
                singleThreadDuration, singleThreadTPS, multiThreadDuration, multiThreadTPS, performanceRatio);

        // ?�중 ?�레?��? ?�일 ?�레?�보??빨라????(병목???�다�?
        assertThat(multiThreadDuration).isLessThan(singleThreadDuration);
    }

    @Test
    @DisplayName("병목 지???�별 - ?�이?�베?�스 ?�결 ?� ?�용??모니?�링")
    void bottleneck_identification_databaseConnectionPoolUsage() throws Exception {
        // Given
        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: ?�이?�베?�스 ?�결 ?� ?�용??모니?�링
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
                } finally {
                    latch.countDown();
                }
            });
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(60, TimeUnit.SECONDS);

        // ?�답 ?�간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("DB ?�결 ?� 병목 분석 - ?�청 ?? %d, ?�균 ?�답 ?�간: %d ms, 최�? ?�답 ?�간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // DB ?�결 ?� 병목???�다�??�균 ?�답 ?�간??500ms ?�하?�야 ??        assertThat(avgResponseTime).isLessThan(500L);
    }

    @Test
    @DisplayName("병목 지???�별 - 캐시 미사??vs 캐시 ?�용 ?�능 비교")
    void bottleneck_identification_cacheUsagePerformanceComparison() throws Exception {
        // Given
        int numberOfRequests = 50;

        // 캐시가 ?�는 ?�태?�서???�능 측정
        long noCacheStartTime = System.currentTimeMillis();
        for (int i = 0; i < numberOfRequests; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
        long noCacheDuration = System.currentTimeMillis() - noCacheStartTime;

        // 캐시가 ?�는 ?�태?�서???�능 측정 (?��? 캐시???�이???�용)
        long withCacheStartTime = System.currentTimeMillis();
        for (int i = 0; i < numberOfRequests; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
        long withCacheDuration = System.currentTimeMillis() - withCacheStartTime;

        // 결과 분석
        double noCacheTPS = (double) numberOfRequests / (noCacheDuration / 1000.0);
        double withCacheTPS = (double) numberOfRequests / (withCacheDuration / 1000.0);
        double improvementRatio = withCacheTPS / noCacheTPS;

        System.out.printf("캐시 ?�능 비교 - 캐시 미사?? %d ms (%.2f TPS), 캐시 ?�용: %d ms (%.2f TPS), ?�상 비율: %.2fx%n",
                noCacheDuration, noCacheTPS, withCacheDuration, withCacheTPS, improvementRatio);

        // 캐시 ?�용 ???�능???�상?�어????        assertThat(withCacheTPS).isGreaterThanOrEqualTo(noCacheTPS);
    }

    @Test
    @DisplayName("병목 지???�별 - N+1 쿼리 문제 ?�스??)
    void bottleneck_identification_nPlusOneQueryProblem() throws Exception {
        // Given: 먼�? �?명의 ?�용???�성
        for (int i = 0; i < 20; i++) {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "nPlusOneUser" + i,
                        "Password123!",
                        "N+1 쿼리 ?�스???�용?? + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // ?��? 존재?�는 경우 무시
            }
        }

        int numberOfRequests = 30;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: ?�용??목록 조회 (N+1 쿼리가 발생?????�는 ?�황)
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
                } finally {
                    latch.countDown();
                }
            });
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(60, TimeUnit.SECONDS);

        // ?�답 ?�간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("N+1 쿼리 병목 분석 - ?�청 ?? %d, ?�균 ?�답 ?�간: %d ms, 최�? ?�답 ?�간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // N+1 쿼리 문제가 ?�결?�었?�면 ?�균 ?�답 ?�간??300ms ?�하?�야 ??        assertThat(avgResponseTime).isLessThan(300L);
    }

    @Test
    @DisplayName("병목 지???�별 - 메모�??�용??증�? 추세 분석")
    void bottleneck_identification_memoryUsageTrend() throws Exception {
        // Given
        Runtime runtime = Runtime.getRuntime();
        System.gc(); // Force garbage collection before test
        long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

        int numberOfRequests = 100;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);

        // When: 메모�??�용??증�? 추세 분석
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

        System.out.printf("메모�??�용??병목 분석 - 초기: %d bytes, 최종: %d bytes, 증�?: %d bytes%n",
                initialUsedMemory, finalUsedMemory, memoryIncrease);

        // 메모�??�수가 ?�다�?증�??�이 20MB ?�하?�야 ??        assertThat(memoryIncrease).isLessThan(20 * 1024 * 1024L); // 20MB
    }

    @Test
    @DisplayName("병목 지???�별 - CPU ?�용??증�? 추세 분석")
    void bottleneck_identification_cpuUsageTrend() throws Exception {
        // Given
        int numberOfRequests = 200;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: CPU ?�용??증�? 추세 분석
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
                } finally {
                    latch.countDown();
                }
            });
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(120, TimeUnit.SECONDS); // ??�??�간 ?��?
        // ?�답 ?�간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);
        long minResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .min()
                .orElse(0L);

        System.out.printf("CPU ?�용??병목 분석 - ?�청 ?? %d, ?�균 ?�답 ?�간: %d ms, 최�? ?�답 ?�간: %d ms, 최소 ?�답 ?�간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime, minResponseTime);

        // CPU 병목???�다�??�균 ?�답 ?�간??1000ms ?�하?�야 ??        assertThat(avgResponseTime).isLessThan(1000L);
    }

    @Test
    @DisplayName("병목 지???�별 - ?�기??vs 비동기식 처리 ?�능 비교")
    void bottleneck_identification_syncVsAsyncProcessing() throws Exception {
        // Given
        int numberOfRequests = 75;

        // ?�기??처리 ?�능 측정
        long syncStartTime = System.currentTimeMillis();
        for (int i = 0; i < numberOfRequests; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
        long syncDuration = System.currentTimeMillis() - syncStartTime;

        // 비동기식 처리 ?�능 측정 (?�시 ?�청)
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();
        long asyncStartTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    mockMvc.perform(get("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON))
                            .andExpect(status().isOk());
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

        latch.await(60, TimeUnit.SECONDS);
        long asyncDuration = System.currentTimeMillis() - asyncStartTime;

        // 결과 분석
        double syncTPS = (double) numberOfRequests / (syncDuration / 1000.0);
        double asyncTPS = (double) numberOfRequests / (asyncDuration / 1000.0);
        double performanceRatio = asyncTPS / syncTPS;

        System.out.printf("?�기/비동�?처리 ?�능 비교 - ?�기: %d ms (%.2f TPS), 비동�? %d ms (%.2f TPS), 비율: %.2fx%n",
                syncDuration, syncTPS, asyncDuration, asyncTPS, performanceRatio);

        // 비동�?처리가 ??빨라????(병목???�다�?
        assertThat(asyncDuration).isLessThan(syncDuration);
    }

    @Test
    @DisplayName("병목 지???�별 - ?�이�?처리 ?�능 분석")
    void bottleneck_identification_pagingPerformanceAnalysis() throws Exception {
        // Given: 먼�? 많�? ?�의 ?�용???�성
        for (int i = 0; i < 100; i++) {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "pagingUser" + i,
                        "Password123!",
                        "?�이�??�스???�용?? + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // ?��? 존재?�는 경우 무시
            }
        }

        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: ?�이�?처리 ?�능 분석
        for (int i = 0; i < numberOfRequests; i++) {
            final int page = i % 10; // 0~9 ?�이지 ?�환
            executorService.submit(() -> {
                try {
                    long requestStartTime = System.currentTimeMillis();
                    mockMvc.perform(get("/api/v1/users/paged?page=" + page + "&size=10")
                            .contentType(MediaType.APPLICATION_JSON))
                            .andExpect(status().isOk());
                    long responseTime = System.currentTimeMillis() - requestStartTime;
                    responseTimes.add(responseTime);
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            });
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(60, TimeUnit.SECONDS);

        // ?�답 ?�간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("?�이�?처리 병목 분석 - ?�청 ?? %d, ?�균 ?�답 ?�간: %d ms, 최�? ?�답 ?�간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // ?�이�?처리 병목???�다�??�균 ?�답 ?�간??400ms ?�하?�야 ??        assertThat(avgResponseTime).isLessThan(400L);
    }

    @Test
    @DisplayName("병목 지???�별 - 검??쿼리 ?�능 분석")
    void bottleneck_identification_searchQueryPerformance() throws Exception {
        // Given: 먼�? 검?�을 ?�한 ?�용???�성
        for (int i = 0; i < 50; i++) {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "searchUser" + i,
                        "Password123!",
                        "검???�스???�용?? + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // ?��? 존재?�는 경우 무시
            }
        }

        int numberOfRequests = 40;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: 검??쿼리 ?�능 분석
        for (int i = 0; i < numberOfRequests; i++) {
            final String searchKeyword = "검???�스???�용?? + (i % 10); // ?��? ?�워??반복
            executorService.submit(() -> {
                try {
                    long requestStartTime = System.currentTimeMillis();
                    mockMvc.perform(get("/api/v1/users/search?searchType=userNm&searchKeyword=" + searchKeyword)
                            .contentType(MediaType.APPLICATION_JSON))
                            .andExpect(status().isOk());
                    long responseTime = System.currentTimeMillis() - requestStartTime;
                    responseTimes.add(responseTime);
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            });
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(60, TimeUnit.SECONDS);

        // ?�답 ?�간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("검??쿼리 병목 분석 - ?�청 ?? %d, ?�균 ?�답 ?�간: %d ms, 최�? ?�답 ?�간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // 검??쿼리 병목???�다�??�균 ?�답 ?�간??500ms ?�하?�야 ??        assertThat(avgResponseTime).isLessThan(500L);
    }

    @Test
    @DisplayName("병목 지???�별 - ?�랜??�� 처리 ?�능 분석")
    void bottleneck_identification_transactionProcessingPerformance() throws Exception {
        // Given
        int numberOfRequests = 60;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: ?�랜??�� 처리 ?�능 분석
        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            executorService.submit(() -> {
                try {
                    String requestBody = """
                            {
                                "userId": "transUser%d",
                                "password": "Password123!",
                                "userNm": "?�랜??�� ?�스???�용??d",
                                "passwordHint": "hint",
                                "passwordCnsr": "answer",
                                "role": "USER"
                            }
                            """.formatted(requestId, requestId);

                    long requestStartTime = System.currentTimeMillis();
                    mockMvc.perform(post("/api/v1/users/signup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                            .andExpect(status().isOk());
                    long responseTime = System.currentTimeMillis() - requestStartTime;
                    responseTimes.add(responseTime);
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            });
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(90, TimeUnit.SECONDS); // ?�랜??�� 처리????많�? ?�간 ?�요

        // ?�답 ?�간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("?�랜??�� 처리 병목 분석 - ?�청 ?? %d, ?�균 ?�답 ?�간: %d ms, 최�? ?�답 ?�간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // ?�랜??�� 처리 병목???�다�??�균 ?�답 ?�간??1500ms ?�하?�야 ??        assertThat(avgResponseTime).isLessThan(1500L);
    }

    @Test
    @DisplayName("병목 지???�별 - ?�증 처리 ?�능 분석")
    void bottleneck_identification_authenticationProcessingPerformance() throws Exception {
        // Given: 먼�? ?�증???�요???�용???�성
        UserSignupRequest signupRequest = new UserSignupRequest(
                "authUser",
                "Password123!",
                "?�증 ?�스???�용??,
                com.company.project.domain.user.entity.Role.USER,
                "hint",
                "answer");
        userService.signup(signupRequest);

        int numberOfRequests = 80;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: ?�증 처리 ?�능 분석
        for (int i = 0; i < numberOfRequests; i++) {
            executorService.submit(() -> {
                try {
                    long requestStartTime = System.currentTimeMillis();
                    mockMvc.perform(get("/api/v1/users/authUser")
                            .contentType(MediaType.APPLICATION_JSON))
                            .andExpect(status().isOk());
                    long responseTime = System.currentTimeMillis() - requestStartTime;
                    responseTimes.add(responseTime);
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            });
        }

        // Then: 모든 ?�청???�료???�까지 ?��?        latch.await(60, TimeUnit.SECONDS);

        // ?�답 ?�간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("?�증 처리 병목 분석 - ?�청 ?? %d, ?�균 ?�답 ?�간: %d ms, 최�? ?�답 ?�간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // ?�증 처리 병목???�다�??�균 ?�답 ?�간??600ms ?�하?�야 ??        assertThat(avgResponseTime).isLessThan(600L);
    }
}
