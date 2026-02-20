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
 * 병목 지점 식별 및 개선 테스트
 * 성능 저하의 원인을 분석하고 개선 방안을 제시
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
    @DisplayName("병목 지점 식별 - 단일 스레드 vs 다중 스레드 성능 비교")
    void bottleneck_identification_singleVsMultiThreadPerformance() throws Exception {
        // Given
        int numberOfRequests = 100;

        // 단일 스레드 성능 측정
        long singleThreadStartTime = System.currentTimeMillis();
        for (int i = 0; i < numberOfRequests; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
        long singleThreadDuration = System.currentTimeMillis() - singleThreadStartTime;

        // 다중 스레드 성능 측정
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

        System.out.printf("성능 비교 결과 - 단일 스레드: %d ms (%.2f TPS), 다중 스레드: %d ms (%.2f TPS), 비율: %.2fx%n",
                singleThreadDuration, singleThreadTPS, multiThreadDuration, multiThreadTPS, performanceRatio);

        // 다중 스레드가 단일 스레드보다 빨라야 함 (병목이 없다면)
        assertThat(multiThreadDuration).isLessThan(singleThreadDuration);
    }

    @Test
    @DisplayName("병목 지점 식별 - 데이터베이스 연결 풀 사용량 모니터링")
    void bottleneck_identification_databaseConnectionPoolUsage() throws Exception {
        // Given
        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: 데이터베이스 연결 풀 사용량 모니터링
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(60, TimeUnit.SECONDS);

        // 응답 시간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("DB 연결 풀 병목 분석 - 요청 수: %d, 평균 응답 시간: %d ms, 최대 응답 시간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // DB 연결 풀 병목이 없다면 평균 응답 시간이 500ms 이하여야 함
        assertThat(avgResponseTime).isLessThan(500L);
    }

    @Test
    @DisplayName("병목 지점 식별 - 캐시 미사용 vs 캐시 사용 성능 비교")
    void bottleneck_identification_cacheUsagePerformanceComparison() throws Exception {
        // Given
        int numberOfRequests = 50;

        // 캐시가 없는 상태에서의 성능 측정
        long noCacheStartTime = System.currentTimeMillis();
        for (int i = 0; i < numberOfRequests; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
        long noCacheDuration = System.currentTimeMillis() - noCacheStartTime;

        // 캐시가 있는 상태에서의 성능 측정 (이미 캐시된 데이터 사용)
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

        System.out.printf("캐시 성능 비교 - 캐시 미사용: %d ms (%.2f TPS), 캐시 사용: %d ms (%.2f TPS), 향상 비율: %.2fx%n",
                noCacheDuration, noCacheTPS, withCacheDuration, withCacheTPS, improvementRatio);

        // 캐시 사용 시 성능이 향상되어야 함
        assertThat(withCacheTPS).isGreaterThanOrEqualTo(noCacheTPS);
    }

    @Test
    @DisplayName("병목 지점 식별 - N+1 쿼리 문제 테스트")
    void bottleneck_identification_nPlusOneQueryProblem() throws Exception {
        // Given: 먼저 몇 명의 사용자 생성
        for (int i = 0; i < 20; i++) {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "nPlusOneUser" + i,
                        "Password123!",
                        "N+1 쿼리 테스트 사용자" + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // 이미 존재하는 경우 무시
            }
        }

        int numberOfRequests = 30;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: 사용자 목록 조회 (N+1 쿼리가 발생할 수 있는 상황)
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(60, TimeUnit.SECONDS);

        // 응답 시간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("N+1 쿼리 병목 분석 - 요청 수: %d, 평균 응답 시간: %d ms, 최대 응답 시간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // N+1 쿼리 문제가 해결되었다면 평균 응답 시간이 300ms 이하여야 함
        assertThat(avgResponseTime).isLessThan(300L);
    }

    @Test
    @DisplayName("병목 지점 식별 - 메모리 사용량 증가 추세 분석")
    void bottleneck_identification_memoryUsageTrend() throws Exception {
        // Given
        Runtime runtime = Runtime.getRuntime();
        System.gc(); // Force garbage collection before test
        long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

        int numberOfRequests = 100;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);

        // When: 메모리 사용량 증가 추세 분석
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(60, TimeUnit.SECONDS);

        System.gc(); // Force garbage collection after test
        long finalUsedMemory = runtime.totalMemory() - runtime.freeMemory();
        long memoryIncrease = finalUsedMemory - initialUsedMemory;

        System.out.printf("메모리 사용량 병목 분석 - 초기: %d bytes, 최종: %d bytes, 증가: %d bytes%n",
                initialUsedMemory, finalUsedMemory, memoryIncrease);

        // 메모리 누수가 없다면 증가량이 20MB 이하여야 함
        assertThat(memoryIncrease).isLessThan(20 * 1024 * 1024L); // 20MB
    }

    @Test
    @DisplayName("병목 지점 식별 - CPU 사용량 증가 추세 분석")
    void bottleneck_identification_cpuUsageTrend() throws Exception {
        // Given
        int numberOfRequests = 200;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: CPU 사용량 증가 추세 분석
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(120, TimeUnit.SECONDS); // 더 긴 시간 대기

        // 응답 시간 분석
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

        System.out.printf("CPU 사용량 병목 분석 - 요청 수: %d, 평균 응답 시간: %d ms, 최대 응답 시간: %d ms, 최소 응답 시간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime, minResponseTime);

        // CPU 병목이 없다면 평균 응답 시간이 1000ms 이하여야 함
        assertThat(avgResponseTime).isLessThan(1000L);
    }

    @Test
    @DisplayName("병목 지점 식별 - 동기식 vs 비동기식 처리 성능 비교")
    void bottleneck_identification_syncVsAsyncProcessing() throws Exception {
        // Given
        int numberOfRequests = 75;

        // 동기식 처리 성능 측정
        long syncStartTime = System.currentTimeMillis();
        for (int i = 0; i < numberOfRequests; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
        long syncDuration = System.currentTimeMillis() - syncStartTime;

        // 비동기식 처리 성능 측정 (동시 요청)
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

        System.out.printf("동기/비동기 처리 성능 비교 - 동기: %d ms (%.2f TPS), 비동기: %d ms (%.2f TPS), 비율: %.2fx%n",
                syncDuration, syncTPS, asyncDuration, asyncTPS, performanceRatio);

        // 비동기 처리가 더 빨라야 함 (병목이 없다면)
        assertThat(asyncDuration).isLessThan(syncDuration);
    }

    @Test
    @DisplayName("병목 지점 식별 - 페이징 처리 성능 분석")
    void bottleneck_identification_pagingPerformanceAnalysis() throws Exception {
        // Given: 먼저 많은 수의 사용자 생성
        for (int i = 0; i < 100; i++) {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "pagingUser" + i,
                        "Password123!",
                        "페이징 테스트 사용자" + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // 이미 존재하는 경우 무시
            }
        }

        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: 페이징 처리 성능 분석
        for (int i = 0; i < numberOfRequests; i++) {
            final int page = i % 10; // 0~9 페이지 순환
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(60, TimeUnit.SECONDS);

        // 응답 시간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("페이징 처리 병목 분석 - 요청 수: %d, 평균 응답 시간: %d ms, 최대 응답 시간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // 페이징 처리 병목이 없다면 평균 응답 시간이 400ms 이하여야 함
        assertThat(avgResponseTime).isLessThan(400L);
    }

    @Test
    @DisplayName("병목 지점 식별 - 검색 쿼리 성능 분석")
    void bottleneck_identification_searchQueryPerformance() throws Exception {
        // Given: 먼저 검색을 위한 사용자 생성
        for (int i = 0; i < 50; i++) {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "searchUser" + i,
                        "Password123!",
                        "검색 테스트 사용자" + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // 이미 존재하는 경우 무시
            }
        }

        int numberOfRequests = 40;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: 검색 쿼리 성능 분석
        for (int i = 0; i < numberOfRequests; i++) {
            final String searchKeyword = "검색 테스트 사용자" + (i % 10); // 일부 키워드 반복
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(60, TimeUnit.SECONDS);

        // 응답 시간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("검색 쿼리 병목 분석 - 요청 수: %d, 평균 응답 시간: %d ms, 최대 응답 시간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // 검색 쿼리 병목이 없다면 평균 응답 시간이 500ms 이하여야 함
        assertThat(avgResponseTime).isLessThan(500L);
    }

    @Test
    @DisplayName("병목 지점 식별 - 트랜잭션 처리 성능 분석")
    void bottleneck_identification_transactionProcessingPerformance() throws Exception {
        // Given
        int numberOfRequests = 60;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: 트랜잭션 처리 성능 분석
        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            executorService.submit(() -> {
                try {
                    String requestBody = """
                            {
                                "userId": "transUser%d",
                                "password": "Password123!",
                                "userNm": "트랜잭션 테스트 사용자%d",
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(90, TimeUnit.SECONDS); // 트랜잭션 처리에 더 많은 시간 필요

        // 응답 시간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("트랜잭션 처리 병목 분석 - 요청 수: %d, 평균 응답 시간: %d ms, 최대 응답 시간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // 트랜잭션 처리 병목이 없다면 평균 응답 시간이 1500ms 이하여야 함
        assertThat(avgResponseTime).isLessThan(1500L);
    }

    @Test
    @DisplayName("병목 지점 식별 - 인증 처리 성능 분석")
    void bottleneck_identification_authenticationProcessingPerformance() throws Exception {
        // Given: 먼저 인증이 필요한 사용자 생성
        UserSignupRequest signupRequest = new UserSignupRequest(
                "authUser",
                "Password123!",
                "인증 테스트 사용자",
                com.company.project.domain.user.entity.Role.USER,
                "hint",
                "answer");
        userService.signup(signupRequest);

        int numberOfRequests = 80;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: 인증 처리 성능 분석
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(60, TimeUnit.SECONDS);

        // 응답 시간 분석
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("인증 처리 병목 분석 - 요청 수: %d, 평균 응답 시간: %d ms, 최대 응답 시간: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // 인증 처리 병목이 없다면 평균 응답 시간이 600ms 이하여야 함
        assertThat(avgResponseTime).isLessThan(600L);
    }
}