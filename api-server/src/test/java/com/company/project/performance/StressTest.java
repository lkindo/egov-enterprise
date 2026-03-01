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
 * ?•ë ¥ ?ŒìŠ¤?? ?œìŠ¤?œì´ ìµœë? ?±ëŠ¥???„ë‹¬?ˆì„ ?Œì˜ ?™ì‘ ?ŒìŠ¤?? * ?œìŠ¤?œì´ ê³ ë????í™©?ì„œ ?´ë–»ê²??™ì‘?˜ëŠ”ì§€ ?‰ê?
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
        // ê³ ì„±???ŒìŠ¤?¸ë? ?„í•´ ?????¤ë ˆ???€ ?¬ìš©
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
    @DisplayName("?¬ìš©??ëª©ë¡ ì¡°íšŒ - ê³ ë????•ë ¥ ?ŒìŠ¤??(500ê°??™ì‹œ ?”ì²­)")
    void stressTest_getUserList_500ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 500;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // Warm-up
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // When: 500ê°œì˜ ?™ì‹œ ?”ì²­ ?¤í–‰
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?(ê³ ë????ŒìŠ¤?¸ì´ë¯€ë¡???ê¸??œê°„ ?€ê¸?
        boolean allCompleted = latch.await(120, TimeUnit.SECONDS); // ìµœë? 120ì´??€ê¸?
        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // ê²°ê³¼ ?•ì¸
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

        System.out.printf("ê³ ë????ŒìŠ¤??ê²°ê³¼ - ?”ì²­ ?? %d, ?±ê³µ: %d, ?¤íŒ¨: %d, ?œê°„: %d ms, TPS: %.2f, ?„ë£Œ ?¬ë?: %b%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond, allCompleted);

        // ê³ ë????í™©?´ë?ë¡?80% ?´ìƒ???”ì²­???±ê³µ?˜ë©´ ?±ê³µ?¼ë¡œ ê°„ì£¼
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.80));
    }

    @Test
    @DisplayName("?¬ìš©???±ë¡ - ê³ ë????•ë ¥ ?ŒìŠ¤??(200ê°??™ì‹œ ?”ì²­)")
    void stressTest_userSignup_200ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 200;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 200ê°œì˜ ?™ì‹œ ?¬ìš©???±ë¡ ?”ì²­ ?¤í–‰
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    String requestBody = """
                            {
                                "userId": "stressTestUser%d",
                                "password": "Password123!",
                                "userNm": "ê³ ë????ŒìŠ¤???¬ìš©??d",
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        boolean allCompleted = latch.await(180, TimeUnit.SECONDS); // ê³ ë????±ë¡ ?”ì²­?´ë?ë¡?180ì´??€ê¸?        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // ê²°ê³¼ ?•ì¸
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

        System.out.printf("?¬ìš©???±ë¡ ê³ ë????ŒìŠ¤??ê²°ê³¼ - ?”ì²­ ?? %d, ?±ê³µ: %d, ?¤íŒ¨: %d, ?œê°„: %d ms, TPS: %.2f, ?„ë£Œ ?¬ë?: %b%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond, allCompleted);

        // ?±ë¡ ?”ì²­?€ ì¤‘ë³µ IDë¡??¸í•´ ?¼ë? ?¤íŒ¨?????ˆìœ¼ë¯€ë¡?70% ?´ìƒ ?±ê³µ??ëª©í‘œë¡???        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.70));
    }

    @Test
    @DisplayName("?¬ìš©???¨ì¼ ì¡°íšŒ - ê³ ë????•ë ¥ ?ŒìŠ¤??(300ê°??™ì‹œ ?”ì²­)")
    void stressTest_getUserById_300ConcurrentRequests() throws Exception {
        // Given: ë¨¼ì? ?ŒìŠ¤???¬ìš©???ì„±
        for (int i = 0; i < 50; i++) {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "stressUser" + i,
                        "Password123!",
                        "ê³ ë????ŒìŠ¤???¬ìš©?? + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // ?´ë? ì¡´ì¬?˜ëŠ” ê²½ìš° ë¬´ì‹œ
            }
        }

        int numberOfRequests = 300;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 300ê°œì˜ ?™ì‹œ ?¬ìš©??ì¡°íšŒ ?”ì²­ ?¤í–‰ (?¼ìš´??ë¡œë¹ˆ?¼ë¡œ ?¤ë¥¸ ?¬ìš©??ì¡°íšŒ)
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final String userId = "stressUser" + (i % 50); // 50ëª…ì˜ ?¬ìš©??ì¤??˜ë‚˜ë¥??œí™˜
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        boolean allCompleted = latch.await(120, TimeUnit.SECONDS); // ìµœë? 120ì´??€ê¸?        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // ê²°ê³¼ ?•ì¸
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

        System.out.printf("?¬ìš©???¨ì¼ ì¡°íšŒ ê³ ë????ŒìŠ¤??ê²°ê³¼ - ?”ì²­ ?? %d, ?±ê³µ: %d, ?¤íŒ¨: %d, ?œê°„: %d ms, TPS: %.2f, ?„ë£Œ ?¬ë?: %b%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond, allCompleted);

        // ê³ ë????í™©?´ë?ë¡?85% ?´ìƒ???”ì²­???±ê³µ?˜ë©´ ?±ê³µ?¼ë¡œ ê°„ì£¼
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.85));
    }

    @Test
    @DisplayName("ì§€?ì ??ê³ ë????ŒìŠ¤??- 5ë¶„ê°„ ì§€?ì ???”ì²­")
    void stressTest_continuousHighLoad_5Minutes() throws Exception {
        // Given
        int threads = 20; // 20ê°œì˜ ?¤ë ˆ?œë¡œ ì§€?ì ???”ì²­
        int requestsPerThread = 50; // ê°??¤ë ˆ?œë‹¹ 50ê°??”ì²­
        int totalRequests = threads * requestsPerThread; // ì´?1000ê°??”ì²­
        CountDownLatch latch = new CountDownLatch(totalRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        ExecutorService continuousExecutor = Executors.newFixedThreadPool(threads);

        // When: 5ë¶„ê°„ ì§€?ì ???”ì²­
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
                                    "userNm": "ì§€???ŒìŠ¤???¬ìš©??d",
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ?˜ê¸°ë¥??€ê¸?        boolean allCompleted = latch.await(400, TimeUnit.SECONDS); // 5ë¶??´ìƒ ?€ê¸?(6ë¶?40ì´?
        long testEndTime = System.currentTimeMillis();

        long duration = testEndTime - testStartTime;
        double requestsPerSecond = (double) totalRequests / (duration / 1000.0);

        // ê²°ê³¼ ?•ì¸
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

        System.out.printf("ì§€??ê³ ë????ŒìŠ¤??ê²°ê³¼ - ?”ì²­ ?? %d, ?±ê³µ: %d, ?¤íŒ¨: %d, ?œê°„: %d ms, TPS: %.2f, ?„ë£Œ ?¬ë?: %b%n",
                totalRequests, successfulRequests, totalRequests - successfulRequests, duration, requestsPerSecond,
                allCompleted);

        // ì§€?ì ??ê³ ë????í™©?´ë?ë¡?75% ?´ìƒ???”ì²­???±ê³µ?˜ë©´ ?±ê³µ?¼ë¡œ ê°„ì£¼
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (totalRequests * 0.75));

        continuousExecutor.shutdown();
    }

    @Test
    @DisplayName("ê³ ë????í™©?ì„œ???‘ë‹µ ?œê°„ ë³€??ì¶”ì´")
    void stressTest_responseTimeTrend_underHighLoad() throws Exception {
        // Given
        int numberOfRequests = 100;
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();
        CountDownLatch latch = new CountDownLatch(numberOfRequests);

        // When: ê³ ë????í™©?ì„œ ?‘ë‹µ ?œê°„ ì¸¡ì •
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(60, TimeUnit.SECONDS);

        // ?‘ë‹µ ?œê°„ ë¶„ì„
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

        System.out.printf("ê³ ë????‘ë‹µ ?œê°„ ë¶„ì„ - ?‰ê· : %d ms, ìµœë?: %d ms, ìµœì†Œ: %d ms, ?±ê³µ ?”ì²­: %d/%d%n",
                avgResponseTime, maxResponseTime, minResponseTime, successfulRequests, numberOfRequests);

        // ê³ ë????í™©?ì„œ???‰ê·  ?‘ë‹µ ?œê°„??2000ms ?´í•˜?¬ì•¼ ??        assertThat(avgResponseTime).isLessThan(2000L);
    }

    @Test
    @DisplayName("ê³ ë????í™©?ì„œ??ë©”ëª¨ë¦??¬ìš©??ë³€??)
    void stressTest_memoryUsage_underHighLoad() throws Exception {
        // Given
        Runtime runtime = Runtime.getRuntime();
        System.gc(); // Force garbage collection before test
        long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

        int numberOfRequests = 100;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);

        // When: ê³ ë????í™©?ì„œ ë©”ëª¨ë¦??¬ìš©??ëª¨ë‹ˆ?°ë§
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

        System.out.printf("ê³ ë???ë©”ëª¨ë¦??¬ìš©??- ì´ˆê¸°: %d bytes, ìµœì¢…: %d bytes, ì¦ê?: %d bytes%n",
                initialUsedMemory, finalUsedMemory, memoryIncrease);

        // ê³ ë????í™©?ì„œ??ë©”ëª¨ë¦?ì¦ê??‰ì´ 100MB ?´í•˜?¬ì•¼ ??(ë©”ëª¨ë¦??„ìˆ˜ ë°©ì? ê¸°ì?)
        assertThat(memoryIncrease).isLessThan(100 * 1024 * 1024L); // 100MB
    }

    @Test
    @DisplayName("ê³ ë????í™©?ì„œ???¤ë¥˜??ì¸¡ì •")
    void stressTest_errorRate_underHighLoad() throws Exception {
        // Given
        int numberOfRequests = 250;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Integer>> futures = new ArrayList<>();

        // When: ê³ ë????í™©?ì„œ ?¤ë¥˜??ì¸¡ì •
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(90, TimeUnit.SECONDS);

        // ê²°ê³¼ ë¶„ì„
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

        System.out.printf("ê³ ë????¤ë¥˜??ì¸¡ì • - ?±ê³µ: %d, ?¤íŒ¨: %d, ?¤ë¥˜?? %.2f%%%n",
                successCount, errorCount, errorRate);

        // ê³ ë????í™©?ì„œ???¤ë¥˜?¨ì´ 20% ë¯¸ë§Œ?´ì–´????        assertThat(errorRate).isLessThan(20.0);
    }

    @Test
    @DisplayName("ê³ ë????í™©?ì„œ???°ì´???•í•©???•ì¸")
    void stressTest_dataIntegrity_underHighLoad() throws Exception {
        // Given
        String testUserId = "dataIntegrityUser";
        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: ?™ì¼???¬ìš©?ì— ?€??ê³ ë????…ë°?´íŠ¸ ?”ì²­
        for (int i = 0; i < numberOfRequests; i++) {
            final int updateValue = i;
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    // ?¬ìš©???±ë¡ ?”ì²­ (ì²˜ìŒë§??±ê³µ, ?´í›„???¤íŒ¨ ?ëŠ” ?…ë°?´íŠ¸)
                    String requestBody = """
                            {
                                "userId": "%s",
                                "password": "Password123!",
                                "userNm": "?°ì´??ë¬´ê²°???ŒìŠ¤???¬ìš©??d",
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(60, TimeUnit.SECONDS);

        // ê²°ê³¼ ?•ì¸: ìµœì†Œ???˜ë‚˜ ?´ìƒ???”ì²­?€ ?±ê³µ?´ì•¼ ??        long successfulRequests = futures.stream()
                .map(future -> {
                    try {
                        return future.get(10, TimeUnit.SECONDS);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .filter(Boolean::booleanValue)
                .count();

        // ?¬ìš©???•ë³´ ?•ì¸
        mockMvc.perform(get("/api/v1/users/" + testUserId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(testUserId));

        System.out.printf("?°ì´??ë¬´ê²°???ŒìŠ¤??- ?”ì²­ ?? %d, ?±ê³µ: %d%n", numberOfRequests, successfulRequests);

        // ìµœì†Œ???˜ë‚˜ ?´ìƒ???”ì²­?€ ?±ê³µ?´ì•¼ ??(ì¤‘ë³µ IDë¡??¸í•´ ?˜ë¨¸ì§€???¤íŒ¨)
        assertThat(successfulRequests).isGreaterThan(0);
    }
}
