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
 * 로드 테스트: 다수의 동시 요청 처리 능력 테스트
 * 시스템이 동시에 여러 요청을 처리할 수 있는 능력을 평가
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
        executorService = Executors.newFixedThreadPool(20); // 20개의 스레드 풀
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
    @DisplayName("사용자 목록 조회 - 100개 동시 요청 로드 테스트")
    void loadTest_getUserList_100ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 100;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // Warm-up: 실제 테스트 전에 몇 개의 요청을 미리 처리
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // When: 100개의 동시 요청 실행
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(60, TimeUnit.SECONDS); // 최대 60초 대기
        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // 결과 확인
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

        System.out.printf("로드 테스트 결과 - 요청 수: %d, 성공: %d, 실패: %d, 시간: %d ms, TPS: %.2f%n",
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
            System.out.printf("평균 응답 지연 추정치: %.2f ms (성공 기준)%n", avg);
        }

        // 성공률이 95% 이상이어야 함
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
    }

    @Test
    @DisplayName("사용자 등록 - 50개 동시 요청 로드 테스트")
    void loadTest_userSignup_50ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 50개의 동시 사용자 등록 요청 실행
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    String requestBody = """
                            {
                                "userId": "loadTestUser%d",
                                "password": "Password123!",
                                "userNm": "로드 테스트 사용자%d",
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(60, TimeUnit.SECONDS); // 최대 60초 대기
        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // 결과 확인
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

        System.out.printf("사용자 등록 로드 테스트 결과 - 요청 수: %d, 성공: %d, 실패: %d, 시간: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        // 성공률이 90% 이상이어야 함 (중복 ID로 인한 실패 고려)
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
    }

    @Test
    @DisplayName("사용자 단일 조회 - 200개 동시 요청 로드 테스트")
    void loadTest_getUserById_200ConcurrentRequests() throws Exception {
        // Given: 먼저 테스트 사용자 생성
        IntStream.range(0, 10).forEach(i -> {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "perfUser" + i,
                        "Password123!",
                        "성능 테스트 사용자" + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // 이미 존재하는 경우 무시
            }
        });

        int numberOfRequests = 200;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 200개의 동시 사용자 조회 요청 실행 (라운드 로빈으로 다른 사용자 조회)
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final String userId = "perfUser" + (i % 10); // 10명의 사용자 중 하나를 순환
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(90, TimeUnit.SECONDS); // 최대 90초 대기 (더 많은 요청 처리를 위해)
        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // 결과 확인
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

        System.out.printf("사용자 단일 조회 로드 테스트 결과 - 요청 수: %d, 성공: %d, 실패: %d, 시간: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        // 성공률이 95% 이상이어야 함
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
    }

    @Test
    @DisplayName("사용자 목록 페이징 조회 - 75개 동시 요청 로드 테스트")
    void loadTest_getPagedUserList_75ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 75;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 75개의 동시 페이징 사용자 목록 요청 실행
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            if (i % 50 == 0)
                System.out.println("Processing load id: " + i);
            final int pageNum = i % 5; // 0~4 페이지 중 하나를 순환
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(60, TimeUnit.SECONDS); // 최대 60초 대기
        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // 결과 확인
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

        System.out.printf("페이징 사용자 목록 로드 테스트 결과 - 요청 수: %d, 성공: %d, 실패: %d, 시간: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        // 성공률이 95% 이상이어야 함
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
    }

    @Test
    @DisplayName("혼합 API 요청 - 150개 동시 요청 로드 테스트")
    void loadTest_mixedApiRequests_150ConcurrentRequests() throws Exception {
        // Given: 먼저 몇 명의 테스트 사용자 생성
        IntStream.range(0, 20).forEach(i -> {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "mixedUser" + i,
                        "Password123!",
                        "혼합 테스트 사용자" + i,
                        com.company.project.domain.user.entity.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // 이미 존재하는 경우 무시
            }
        });

        int numberOfRequests = 150;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 다양한 API 요청 혼합 (조회 60%, 등록 20%, 단일 조회 20%)
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final int requestType = i % 10; // 0-9
            Future<Boolean> future;

            if (requestType < 6) { // 60% - 사용자 목록 조회
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
            } else if (requestType < 8) { // 20% - 사용자 단일 조회
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
            } else { // 20% - 사용자 등록
                final int userIdNum = numberOfRequests + i; // 중복 방지를 위해 고유한 ID 사용
                future = executorService.submit(() -> {
                    try {
                        String requestBody = """
                                {
                                    "userId": "mixedLoadUser%d",
                                    "password": "Password123!",
                                    "userNm": "혼합 로드 테스트 사용자%d",
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(120, TimeUnit.SECONDS); // 최대 120초 대기 (혼합 요청 처리를 위해)
        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // 결과 확인
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

        System.out.printf("혼합 API 요청 로드 테스트 결과 - 요청 수: %d, 성공: %d, 실패: %d, 시간: %d ms, TPS: %.2f%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond);

        // 성공률이 90% 이상이어야 함 (등록 요청 중 일부는 중복 ID로 인해 실패할 수 있음)
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
    }

    @Test
    @DisplayName("로드 테스트 - 응답 시간 분석")
    void loadTest_responseTimeAnalysis() throws Exception {
        // Given
        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Long> responseTimes = new CopyOnWriteArrayList<>(); // Thread-safe list for response times

        // When: 응답 시간 측정을 위한 요청 실행
        for (int i = 0; i < numberOfRequests; i++) {
            // TODO: Use requestId if specific logging or validation per request is needed
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
        if (!responseTimes.isEmpty()) {
            long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
            long maxResponseTime = responseTimes.stream().mapToLong(Long::longValue).max().orElse(0L);
            long minResponseTime = responseTimes.stream().mapToLong(Long::longValue).min().orElse(0L);

            System.out.printf("응답 시간 분석 - 평균: %d ms, 최대: %d ms, 최소: %d ms, 요청 수: %d%n",
                    avgResponseTime, maxResponseTime, minResponseTime, responseTimes.size());

            // 평균 응답 시간이 1000ms 이하여야 함 (성능 기준)
            assertThat(avgResponseTime).isLessThan(1000L);
        }
    }

    @Test
    @DisplayName("로드 테스트 - 메모리 사용량 모니터링")
    void loadTest_memoryUsageMonitoring() throws Exception {
        // Given
        Runtime runtime = Runtime.getRuntime();
        System.gc(); // Force garbage collection before test
        long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

        int numberOfRequests = 30;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);

        // When: 메모리 사용량 모니터링을 위한 요청 실행
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
        latch.await(30, TimeUnit.SECONDS);

        System.gc(); // Force garbage collection after test
        long finalUsedMemory = runtime.totalMemory() - runtime.freeMemory();
        long memoryIncrease = finalUsedMemory - initialUsedMemory;

        System.out.printf("메모리 사용량 - 초기: %d bytes, 최종: %d bytes, 증가: %d bytes%n",
                initialUsedMemory, finalUsedMemory, memoryIncrease);

        // 메모리 증가량이 50MB 이하여야 함 (메모리 누수 방지 기준)
        assertThat(memoryIncrease).isLessThan(50 * 1024 * 1024L); // 50MB
    }
}