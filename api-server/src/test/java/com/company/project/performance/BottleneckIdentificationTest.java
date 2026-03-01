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
 * ë³‘ëª© ì§€???ë³„ ë°?ê°œì„  ?ŒìŠ¤?? * ?±ëŠ¥ ?€?˜ì˜ ?ì¸??ë¶„ì„?˜ê³  ê°œì„  ë°©ì•ˆ???œì‹œ
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
    @DisplayName("ë³‘ëª© ì§€???ë³„ - ?¨ì¼ ?¤ë ˆ??vs ?¤ì¤‘ ?¤ë ˆ???±ëŠ¥ ë¹„êµ")
    void bottleneck_identification_singleVsMultiThreadPerformance() throws Exception {
        // Given
        int numberOfRequests = 100;

        // ?¨ì¼ ?¤ë ˆ???±ëŠ¥ ì¸¡ì •
        long singleThreadStartTime = System.currentTimeMillis();
        for (int i = 0; i < numberOfRequests; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
        long singleThreadDuration = System.currentTimeMillis() - singleThreadStartTime;

        // ?¤ì¤‘ ?¤ë ˆ???±ëŠ¥ ì¸¡ì •
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

        // ê²°ê³¼ ë¶„ì„
        double singleThreadTPS = (double) numberOfRequests / (singleThreadDuration / 1000.0);
        double multiThreadTPS = (double) numberOfRequests / (multiThreadDuration / 1000.0);
        double performanceRatio = multiThreadTPS / singleThreadTPS;

        System.out.printf("?±ëŠ¥ ë¹„êµ ê²°ê³¼ - ?¨ì¼ ?¤ë ˆ?? %d ms (%.2f TPS), ?¤ì¤‘ ?¤ë ˆ?? %d ms (%.2f TPS), ë¹„ìœ¨: %.2fx%n",
                singleThreadDuration, singleThreadTPS, multiThreadDuration, multiThreadTPS, performanceRatio);

        // ?¤ì¤‘ ?¤ë ˆ?œê? ?¨ì¼ ?¤ë ˆ?œë³´??ë¹¨ë¼????(ë³‘ëª©???†ë‹¤ë©?
        assertThat(multiThreadDuration).isLessThan(singleThreadDuration);
    }

    @Test
    @DisplayName("ë³‘ëª© ì§€???ë³„ - ?°ì´?°ë² ?´ìŠ¤ ?°ê²° ?€ ?¬ìš©??ëª¨ë‹ˆ?°ë§")
    void bottleneck_identification_databaseConnectionPoolUsage() throws Exception {
        // Given
        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: ?°ì´?°ë² ?´ìŠ¤ ?°ê²° ?€ ?¬ìš©??ëª¨ë‹ˆ?°ë§
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(60, TimeUnit.SECONDS);

        // ?‘ë‹µ ?œê°„ ë¶„ì„
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("DB ?°ê²° ?€ ë³‘ëª© ë¶„ì„ - ?”ì²­ ?? %d, ?‰ê·  ?‘ë‹µ ?œê°„: %d ms, ìµœë? ?‘ë‹µ ?œê°„: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // DB ?°ê²° ?€ ë³‘ëª©???†ë‹¤ë©??‰ê·  ?‘ë‹µ ?œê°„??500ms ?´í•˜?¬ì•¼ ??        assertThat(avgResponseTime).isLessThan(500L);
    }

    @Test
    @DisplayName("ë³‘ëª© ì§€???ë³„ - ìºì‹œ ë¯¸ì‚¬??vs ìºì‹œ ?¬ìš© ?±ëŠ¥ ë¹„êµ")
    void bottleneck_identification_cacheUsagePerformanceComparison() throws Exception {
        // Given
        int numberOfRequests = 50;

        // ìºì‹œê°€ ?†ëŠ” ?íƒœ?ì„œ???±ëŠ¥ ì¸¡ì •
        long noCacheStartTime = System.currentTimeMillis();
        for (int i = 0; i < numberOfRequests; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
        long noCacheDuration = System.currentTimeMillis() - noCacheStartTime;

        // ìºì‹œê°€ ?ˆëŠ” ?íƒœ?ì„œ???±ëŠ¥ ì¸¡ì • (?´ë? ìºì‹œ???°ì´???¬ìš©)
        long withCacheStartTime = System.currentTimeMillis();
        for (int i = 0; i < numberOfRequests; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
        long withCacheDuration = System.currentTimeMillis() - withCacheStartTime;

        // ê²°ê³¼ ë¶„ì„
        double noCacheTPS = (double) numberOfRequests / (noCacheDuration / 1000.0);
        double withCacheTPS = (double) numberOfRequests / (withCacheDuration / 1000.0);
        double improvementRatio = withCacheTPS / noCacheTPS;

        System.out.printf("ìºì‹œ ?±ëŠ¥ ë¹„êµ - ìºì‹œ ë¯¸ì‚¬?? %d ms (%.2f TPS), ìºì‹œ ?¬ìš©: %d ms (%.2f TPS), ?¥ìƒ ë¹„ìœ¨: %.2fx%n",
                noCacheDuration, noCacheTPS, withCacheDuration, withCacheTPS, improvementRatio);

        // ìºì‹œ ?¬ìš© ???±ëŠ¥???¥ìƒ?˜ì–´????        assertThat(withCacheTPS).isGreaterThanOrEqualTo(noCacheTPS);
    }

    @Test
    @DisplayName("ë³‘ëª© ì§€???ë³„ - N+1 ì¿¼ë¦¬ ë¬¸ì œ ?ŒìŠ¤??)
    void bottleneck_identification_nPlusOneQueryProblem() throws Exception {
        // Given: ë¨¼ì? ëª?ëª…ì˜ ?¬ìš©???ì„±
        for (int i = 0; i < 20; i++) {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "nPlusOneUser" + i,
                        "Password123!",
                        "N+1 ì¿¼ë¦¬ ?ŒìŠ¤???¬ìš©?? + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // ?´ë? ì¡´ì¬?˜ëŠ” ê²½ìš° ë¬´ì‹œ
            }
        }

        int numberOfRequests = 30;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: ?¬ìš©??ëª©ë¡ ì¡°íšŒ (N+1 ì¿¼ë¦¬ê°€ ë°œìƒ?????ˆëŠ” ?í™©)
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(60, TimeUnit.SECONDS);

        // ?‘ë‹µ ?œê°„ ë¶„ì„
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("N+1 ì¿¼ë¦¬ ë³‘ëª© ë¶„ì„ - ?”ì²­ ?? %d, ?‰ê·  ?‘ë‹µ ?œê°„: %d ms, ìµœë? ?‘ë‹µ ?œê°„: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // N+1 ì¿¼ë¦¬ ë¬¸ì œê°€ ?´ê²°?˜ì—ˆ?¤ë©´ ?‰ê·  ?‘ë‹µ ?œê°„??300ms ?´í•˜?¬ì•¼ ??        assertThat(avgResponseTime).isLessThan(300L);
    }

    @Test
    @DisplayName("ë³‘ëª© ì§€???ë³„ - ë©”ëª¨ë¦??¬ìš©??ì¦ê? ì¶”ì„¸ ë¶„ì„")
    void bottleneck_identification_memoryUsageTrend() throws Exception {
        // Given
        Runtime runtime = Runtime.getRuntime();
        System.gc(); // Force garbage collection before test
        long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

        int numberOfRequests = 100;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);

        // When: ë©”ëª¨ë¦??¬ìš©??ì¦ê? ì¶”ì„¸ ë¶„ì„
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(60, TimeUnit.SECONDS);

        System.gc(); // Force garbage collection after test
        long finalUsedMemory = runtime.totalMemory() - runtime.freeMemory();
        long memoryIncrease = finalUsedMemory - initialUsedMemory;

        System.out.printf("ë©”ëª¨ë¦??¬ìš©??ë³‘ëª© ë¶„ì„ - ì´ˆê¸°: %d bytes, ìµœì¢…: %d bytes, ì¦ê?: %d bytes%n",
                initialUsedMemory, finalUsedMemory, memoryIncrease);

        // ë©”ëª¨ë¦??„ìˆ˜ê°€ ?†ë‹¤ë©?ì¦ê??‰ì´ 20MB ?´í•˜?¬ì•¼ ??        assertThat(memoryIncrease).isLessThan(20 * 1024 * 1024L); // 20MB
    }

    @Test
    @DisplayName("ë³‘ëª© ì§€???ë³„ - CPU ?¬ìš©??ì¦ê? ì¶”ì„¸ ë¶„ì„")
    void bottleneck_identification_cpuUsageTrend() throws Exception {
        // Given
        int numberOfRequests = 200;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: CPU ?¬ìš©??ì¦ê? ì¶”ì„¸ ë¶„ì„
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(120, TimeUnit.SECONDS); // ??ê¸??œê°„ ?€ê¸?
        // ?‘ë‹µ ?œê°„ ë¶„ì„
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

        System.out.printf("CPU ?¬ìš©??ë³‘ëª© ë¶„ì„ - ?”ì²­ ?? %d, ?‰ê·  ?‘ë‹µ ?œê°„: %d ms, ìµœë? ?‘ë‹µ ?œê°„: %d ms, ìµœì†Œ ?‘ë‹µ ?œê°„: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime, minResponseTime);

        // CPU ë³‘ëª©???†ë‹¤ë©??‰ê·  ?‘ë‹µ ?œê°„??1000ms ?´í•˜?¬ì•¼ ??        assertThat(avgResponseTime).isLessThan(1000L);
    }

    @Test
    @DisplayName("ë³‘ëª© ì§€???ë³„ - ?™ê¸°??vs ë¹„ë™ê¸°ì‹ ì²˜ë¦¬ ?±ëŠ¥ ë¹„êµ")
    void bottleneck_identification_syncVsAsyncProcessing() throws Exception {
        // Given
        int numberOfRequests = 75;

        // ?™ê¸°??ì²˜ë¦¬ ?±ëŠ¥ ì¸¡ì •
        long syncStartTime = System.currentTimeMillis();
        for (int i = 0; i < numberOfRequests; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
        long syncDuration = System.currentTimeMillis() - syncStartTime;

        // ë¹„ë™ê¸°ì‹ ì²˜ë¦¬ ?±ëŠ¥ ì¸¡ì • (?™ì‹œ ?”ì²­)
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

        // ê²°ê³¼ ë¶„ì„
        double syncTPS = (double) numberOfRequests / (syncDuration / 1000.0);
        double asyncTPS = (double) numberOfRequests / (asyncDuration / 1000.0);
        double performanceRatio = asyncTPS / syncTPS;

        System.out.printf("?™ê¸°/ë¹„ë™ê¸?ì²˜ë¦¬ ?±ëŠ¥ ë¹„êµ - ?™ê¸°: %d ms (%.2f TPS), ë¹„ë™ê¸? %d ms (%.2f TPS), ë¹„ìœ¨: %.2fx%n",
                syncDuration, syncTPS, asyncDuration, asyncTPS, performanceRatio);

        // ë¹„ë™ê¸?ì²˜ë¦¬ê°€ ??ë¹¨ë¼????(ë³‘ëª©???†ë‹¤ë©?
        assertThat(asyncDuration).isLessThan(syncDuration);
    }

    @Test
    @DisplayName("ë³‘ëª© ì§€???ë³„ - ?˜ì´ì§?ì²˜ë¦¬ ?±ëŠ¥ ë¶„ì„")
    void bottleneck_identification_pagingPerformanceAnalysis() throws Exception {
        // Given: ë¨¼ì? ë§ì? ?˜ì˜ ?¬ìš©???ì„±
        for (int i = 0; i < 100; i++) {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "pagingUser" + i,
                        "Password123!",
                        "?˜ì´ì§??ŒìŠ¤???¬ìš©?? + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // ?´ë? ì¡´ì¬?˜ëŠ” ê²½ìš° ë¬´ì‹œ
            }
        }

        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: ?˜ì´ì§?ì²˜ë¦¬ ?±ëŠ¥ ë¶„ì„
        for (int i = 0; i < numberOfRequests; i++) {
            final int page = i % 10; // 0~9 ?˜ì´ì§€ ?œí™˜
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(60, TimeUnit.SECONDS);

        // ?‘ë‹µ ?œê°„ ë¶„ì„
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("?˜ì´ì§?ì²˜ë¦¬ ë³‘ëª© ë¶„ì„ - ?”ì²­ ?? %d, ?‰ê·  ?‘ë‹µ ?œê°„: %d ms, ìµœë? ?‘ë‹µ ?œê°„: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // ?˜ì´ì§?ì²˜ë¦¬ ë³‘ëª©???†ë‹¤ë©??‰ê·  ?‘ë‹µ ?œê°„??400ms ?´í•˜?¬ì•¼ ??        assertThat(avgResponseTime).isLessThan(400L);
    }

    @Test
    @DisplayName("ë³‘ëª© ì§€???ë³„ - ê²€??ì¿¼ë¦¬ ?±ëŠ¥ ë¶„ì„")
    void bottleneck_identification_searchQueryPerformance() throws Exception {
        // Given: ë¨¼ì? ê²€?‰ì„ ?„í•œ ?¬ìš©???ì„±
        for (int i = 0; i < 50; i++) {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "searchUser" + i,
                        "Password123!",
                        "ê²€???ŒìŠ¤???¬ìš©?? + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // ?´ë? ì¡´ì¬?˜ëŠ” ê²½ìš° ë¬´ì‹œ
            }
        }

        int numberOfRequests = 40;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: ê²€??ì¿¼ë¦¬ ?±ëŠ¥ ë¶„ì„
        for (int i = 0; i < numberOfRequests; i++) {
            final String searchKeyword = "ê²€???ŒìŠ¤???¬ìš©?? + (i % 10); // ?¼ë? ?¤ì›Œ??ë°˜ë³µ
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(60, TimeUnit.SECONDS);

        // ?‘ë‹µ ?œê°„ ë¶„ì„
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("ê²€??ì¿¼ë¦¬ ë³‘ëª© ë¶„ì„ - ?”ì²­ ?? %d, ?‰ê·  ?‘ë‹µ ?œê°„: %d ms, ìµœë? ?‘ë‹µ ?œê°„: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // ê²€??ì¿¼ë¦¬ ë³‘ëª©???†ë‹¤ë©??‰ê·  ?‘ë‹µ ?œê°„??500ms ?´í•˜?¬ì•¼ ??        assertThat(avgResponseTime).isLessThan(500L);
    }

    @Test
    @DisplayName("ë³‘ëª© ì§€???ë³„ - ?¸ëœ??…˜ ì²˜ë¦¬ ?±ëŠ¥ ë¶„ì„")
    void bottleneck_identification_transactionProcessingPerformance() throws Exception {
        // Given
        int numberOfRequests = 60;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: ?¸ëœ??…˜ ì²˜ë¦¬ ?±ëŠ¥ ë¶„ì„
        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            executorService.submit(() -> {
                try {
                    String requestBody = """
                            {
                                "userId": "transUser%d",
                                "password": "Password123!",
                                "userNm": "?¸ëœ??…˜ ?ŒìŠ¤???¬ìš©??d",
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(90, TimeUnit.SECONDS); // ?¸ëœ??…˜ ì²˜ë¦¬????ë§ì? ?œê°„ ?„ìš”

        // ?‘ë‹µ ?œê°„ ë¶„ì„
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("?¸ëœ??…˜ ì²˜ë¦¬ ë³‘ëª© ë¶„ì„ - ?”ì²­ ?? %d, ?‰ê·  ?‘ë‹µ ?œê°„: %d ms, ìµœë? ?‘ë‹µ ?œê°„: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // ?¸ëœ??…˜ ì²˜ë¦¬ ë³‘ëª©???†ë‹¤ë©??‰ê·  ?‘ë‹µ ?œê°„??1500ms ?´í•˜?¬ì•¼ ??        assertThat(avgResponseTime).isLessThan(1500L);
    }

    @Test
    @DisplayName("ë³‘ëª© ì§€???ë³„ - ?¸ì¦ ì²˜ë¦¬ ?±ëŠ¥ ë¶„ì„")
    void bottleneck_identification_authenticationProcessingPerformance() throws Exception {
        // Given: ë¨¼ì? ?¸ì¦???„ìš”???¬ìš©???ì„±
        UserSignupRequest signupRequest = new UserSignupRequest(
                "authUser",
                "Password123!",
                "?¸ì¦ ?ŒìŠ¤???¬ìš©??,
                com.company.project.domain.user.entity.Role.USER,
                "hint",
                "answer");
        userService.signup(signupRequest);

        int numberOfRequests = 80;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

        // When: ?¸ì¦ ì²˜ë¦¬ ?±ëŠ¥ ë¶„ì„
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(60, TimeUnit.SECONDS);

        // ?‘ë‹µ ?œê°„ ë¶„ì„
        long avgResponseTime = (long) responseTimes.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
        long maxResponseTime = responseTimes.stream()
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        System.out.printf("?¸ì¦ ì²˜ë¦¬ ë³‘ëª© ë¶„ì„ - ?”ì²­ ?? %d, ?‰ê·  ?‘ë‹µ ?œê°„: %d ms, ìµœë? ?‘ë‹µ ?œê°„: %d ms%n",
                numberOfRequests, avgResponseTime, maxResponseTime);

        // ?¸ì¦ ì²˜ë¦¬ ë³‘ëª©???†ë‹¤ë©??‰ê·  ?‘ë‹µ ?œê°„??600ms ?´í•˜?¬ì•¼ ??        assertThat(avgResponseTime).isLessThan(600L);
    }
}
