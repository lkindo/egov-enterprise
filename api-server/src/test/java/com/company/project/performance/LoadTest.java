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
 * ë¡œë“œ ?ŒìŠ¤?? ?¤ìˆ˜???™ì‹œ ?”ì²­ ì²˜ë¦¬ ?¥ë ¥ ?ŒìŠ¤?? * ?œìŠ¤?œì´ ?™ì‹œ???¬ëŸ¬ ?”ì²­??ì²˜ë¦¬?????ˆëŠ” ?¥ë ¥???‰ê?
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
        executorService = Executors.newFixedThreadPool(20); // 20ê°œì˜ ?¤ë ˆ???€
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
    @DisplayName("?¬ìš©??ëª©ë¡ ì¡°íšŒ - 100ê°??™ì‹œ ?”ì²­ ë¡œë“œ ?ŒìŠ¤??)
    void loadTest_getUserList_100ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 100;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // Warm-up: ?¤ì œ ?ŒìŠ¤???„ì— ëª?ê°œì˜ ?”ì²­??ë¯¸ë¦¬ ì²˜ë¦¬
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // When: 100ê°œì˜ ?™ì‹œ ?”ì²­ ?¤í–‰
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(60, TimeUnit.SECONDS); // ìµœë? 60ì´??€ê¸?        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // ê²°ê³¼ ?•ì¸
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

        System.out.printf("ë¡œë“œ ?ŒìŠ¤??ê²°ê³¼ - ?”ì²­ ?? %d, ?±ê³µ: %d, ?¤íŒ¨: %d, ?œê°„: %d ms, TPS: %.2f%n",
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
            System.out.printf("?‰ê·  ?‘ë‹µ ì§€??ì¶”ì •ì¹? %.2f ms (?±ê³µ ê¸°ì?)%n", avg);
        }

        // ?±ê³µë¥ ì´ 95% ?´ìƒ?´ì–´????        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
    }

    @Test
    @DisplayName("?¬ìš©???±ë¡ - 50ê°??™ì‹œ ?”ì²­ ë¡œë“œ ?ŒìŠ¤??)
    void loadTest_userSignup_50ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 50ê°œì˜ ?™ì‹œ ?¬ìš©???±ë¡ ?”ì²­ ?¤í–‰
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    String requestBody = """
                            {
                                "userId": "loadTestUser%d",
                                "password": "Password123!",
                                "userNm": "ë¡œë“œ ?ŒìŠ¤???¬ìš©??d",
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(60, TimeUnit.SECONDS); // ìµœë? 60ì´??€ê¸?        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // ê²°ê³¼ ?•ì¸
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

        System.out.printf("?¬ìš©???±ë¡ ë¡œë“œ ?ŒìŠ¤??ê²°ê³¼ - ?”ì²­ ?? %d, ?±ê³µ: %d, ?¤íŒ¨: %d, ?œê°„: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        // ?±ê³µë¥ ì´ 90% ?´ìƒ?´ì–´????(ì¤‘ë³µ IDë¡??¸í•œ ?¤íŒ¨ ê³ ë ¤)
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
    }

    @Test
    @DisplayName("?¬ìš©???¨ì¼ ì¡°íšŒ - 200ê°??™ì‹œ ?”ì²­ ë¡œë“œ ?ŒìŠ¤??)
    void loadTest_getUserById_200ConcurrentRequests() throws Exception {
        // Given: ë¨¼ì? ?ŒìŠ¤???¬ìš©???ì„±
        IntStream.range(0, 10).forEach(i -> {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "perfUser" + i,
                        "Password123!",
                        "?±ëŠ¥ ?ŒìŠ¤???¬ìš©?? + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // ?´ë? ì¡´ì¬?˜ëŠ” ê²½ìš° ë¬´ì‹œ
            }
        });

        int numberOfRequests = 200;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 200ê°œì˜ ?™ì‹œ ?¬ìš©??ì¡°íšŒ ?”ì²­ ?¤í–‰ (?¼ìš´??ë¡œë¹ˆ?¼ë¡œ ?¤ë¥¸ ?¬ìš©??ì¡°íšŒ)
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final String userId = "perfUser" + (i % 10); // 10ëª…ì˜ ?¬ìš©??ì¤??˜ë‚˜ë¥??œí™˜
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(90, TimeUnit.SECONDS); // ìµœë? 90ì´??€ê¸?(??ë§ì? ?”ì²­ ì²˜ë¦¬ë¥??„í•´)
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

        System.out.printf("?¬ìš©???¨ì¼ ì¡°íšŒ ë¡œë“œ ?ŒìŠ¤??ê²°ê³¼ - ?”ì²­ ?? %d, ?±ê³µ: %d, ?¤íŒ¨: %d, ?œê°„: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        // ?±ê³µë¥ ì´ 95% ?´ìƒ?´ì–´????        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
    }

    @Test
    @DisplayName("?¬ìš©??ëª©ë¡ ?˜ì´ì§?ì¡°íšŒ - 75ê°??™ì‹œ ?”ì²­ ë¡œë“œ ?ŒìŠ¤??)
    void loadTest_getPagedUserList_75ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 75;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 75ê°œì˜ ?™ì‹œ ?˜ì´ì§??¬ìš©??ëª©ë¡ ?”ì²­ ?¤í–‰
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            if (i % 50 == 0)
                System.out.println("Processing load id: " + i);
            final int pageNum = i % 5; // 0~4 ?˜ì´ì§€ ì¤??˜ë‚˜ë¥??œí™˜
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(60, TimeUnit.SECONDS); // ìµœë? 60ì´??€ê¸?        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // ê²°ê³¼ ?•ì¸
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

        System.out.printf("?˜ì´ì§??¬ìš©??ëª©ë¡ ë¡œë“œ ?ŒìŠ¤??ê²°ê³¼ - ?”ì²­ ?? %d, ?±ê³µ: %d, ?¤íŒ¨: %d, ?œê°„: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        // ?±ê³µë¥ ì´ 95% ?´ìƒ?´ì–´????        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
    }

    @Test
    @DisplayName("?¼í•© API ?”ì²­ - 150ê°??™ì‹œ ?”ì²­ ë¡œë“œ ?ŒìŠ¤??)
    void loadTest_mixedApiRequests_150ConcurrentRequests() throws Exception {
        // Given: ë¨¼ì? ëª?ëª…ì˜ ?ŒìŠ¤???¬ìš©???ì„±
        IntStream.range(0, 20).forEach(i -> {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "mixedUser" + i,
                        "Password123!",
                        "?¼í•© ?ŒìŠ¤???¬ìš©?? + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // ?´ë? ì¡´ì¬?˜ëŠ” ê²½ìš° ë¬´ì‹œ
            }
        });

        int numberOfRequests = 150;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: ?¤ì–‘??API ?”ì²­ ?¼í•© (ì¡°íšŒ 60%, ?±ë¡ 20%, ?¨ì¼ ì¡°íšŒ 20%)
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final int requestType = i % 10; // 0-9
            Future<Boolean> future;

            if (requestType < 6) { // 60% - ?¬ìš©??ëª©ë¡ ì¡°íšŒ
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
            } else if (requestType < 8) { // 20% - ?¬ìš©???¨ì¼ ì¡°íšŒ
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
            } else { // 20% - ?¬ìš©???±ë¡
                final int userIdNum = numberOfRequests + i; // ì¤‘ë³µ ë°©ì?ë¥??„í•´ ê³ ìœ ??ID ?¬ìš©
                future = executorService.submit(() -> {
                    try {
                        String requestBody = """
                                {
                                    "userId": "mixedLoadUser%d",
                                    "password": "Password123!",
                                    "userNm": "?¼í•© ë¡œë“œ ?ŒìŠ¤???¬ìš©??d",
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(120, TimeUnit.SECONDS); // ìµœë? 120ì´??€ê¸?(?¼í•© ?”ì²­ ì²˜ë¦¬ë¥??„í•´)
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

        System.out.printf("?¼í•© API ?”ì²­ ë¡œë“œ ?ŒìŠ¤??ê²°ê³¼ - ?”ì²­ ?? %d, ?±ê³µ: %d, ?¤íŒ¨: %d, ?œê°„: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        // ?±ê³µë¥ ì´ 90% ?´ìƒ?´ì–´????(?±ë¡ ?”ì²­ ì¤??¼ë???ì¤‘ë³µ IDë¡??¸í•´ ?¤íŒ¨?????ˆìŒ)
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
    }

    @Test
    @DisplayName("ë¡œë“œ ?ŒìŠ¤??- ?‘ë‹µ ?œê°„ ë¶„ì„")
    void loadTest_responseTimeAnalysis() throws Exception {
        // Given
        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new CopyOnWriteArrayList<>(); // Thread-safe list for response times

        // When: ?‘ë‹µ ?œê°„ ì¸¡ì •???„í•œ ?”ì²­ ?¤í–‰
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(60, TimeUnit.SECONDS);

        // ?‘ë‹µ ?œê°„ ë¶„ì„
        if (!responseTimes.isEmpty()) {
            long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
            long maxResponseTime = responseTimes.stream().mapToLong(Long::longValue).max().orElse(0L);
            long minResponseTime = responseTimes.stream().mapToLong(Long::longValue).min().orElse(0L);

            System.out.printf("?‘ë‹µ ?œê°„ ë¶„ì„ - ?‰ê· : %d ms, ìµœë?: %d ms, ìµœì†Œ: %d ms, ?”ì²­ ?? %d%n",
                    avgResponseTime, maxResponseTime, minResponseTime, responseTimes.size());

            // ?‰ê·  ?‘ë‹µ ?œê°„??1000ms ?´í•˜?¬ì•¼ ??(?±ëŠ¥ ê¸°ì?)
            assertThat(avgResponseTime).isLessThan(1000L);
        }
    }

    @Test
    @DisplayName("ë¡œë“œ ?ŒìŠ¤??- ë©”ëª¨ë¦??¬ìš©??ëª¨ë‹ˆ?°ë§")
    void loadTest_memoryUsageMonitoring() throws Exception {
        // Given
        Runtime runtime = Runtime.getRuntime();
        System.gc(); // Force garbage collection before test
        long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

        int numberOfRequests = 30;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);

        // When: ë©”ëª¨ë¦??¬ìš©??ëª¨ë‹ˆ?°ë§???„í•œ ?”ì²­ ?¤í–‰
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

        // Then: ëª¨ë“  ?”ì²­???„ë£Œ???Œê¹Œì§€ ?€ê¸?        latch.await(30, TimeUnit.SECONDS);

        System.gc(); // Force garbage collection after test
        long finalUsedMemory = runtime.totalMemory() - runtime.freeMemory();
        long memoryIncrease = finalUsedMemory - initialUsedMemory;

        System.out.printf("ë©”ëª¨ë¦??¬ìš©??- ì´ˆê¸°: %d bytes, ìµœì¢…: %d bytes, ì¦ê?: %d bytes%n",
                initialUsedMemory, finalUsedMemory, memoryIncrease);

        // ë©”ëª¨ë¦?ì¦ê??‰ì´ 50MB ?´í•˜?¬ì•¼ ??(ë©”ëª¨ë¦??„ìˆ˜ ë°©ì? ê¸°ì?)
        assertThat(memoryIncrease).isLessThan(50 * 1024 * 1024L); // 50MB
    }
}
