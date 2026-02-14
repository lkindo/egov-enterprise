package com.company.project.performance.test;

import com.company.project.api.controller.UserController;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
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
 * 압력 테스트: 시스템이 최대 성능에 도달했을 때의 동작 테스트
 * 시스템이 고부하 상황에서 어떻게 동작하는지 평가
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
        // 고성능 테스트를 위해 더 큰 스레드 풀 사용
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
    @DisplayName("사용자 목록 조회 - 고부하 압력 테스트 (500개 동시 요청)")
    void stressTest_getUserList_500ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 500;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // Warm-up
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // When: 500개의 동시 요청 실행
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
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

        // Then: 모든 요청이 완료될 때까지 대기 (고부하 테스트이므로 더 긴 시간 대기)
        boolean allCompleted = latch.await(120, TimeUnit.SECONDS); // 최대 120초 대기

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

        System.out.printf("고부하 테스트 결과 - 요청 수: %d, 성공: %d, 실패: %d, 시간: %d ms, TPS: %.2f, 완료 여부: %b%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond, allCompleted);

        // 고부하 상황이므로 80% 이상의 요청이 성공하면 성공으로 간주
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.80));
    }

    @Test
    @DisplayName("사용자 등록 - 고부하 압력 테스트 (200개 동시 요청)")
    void stressTest_userSignup_200ConcurrentRequests() throws Exception {
        // Given
        int numberOfRequests = 200;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 200개의 동시 사용자 등록 요청 실행
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    String requestBody = """
                            {
                                "userId": "stressTestUser%d",
                                "password": "Password123!",
                                "userNm": "고부하 테스트 사용자%d",
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
        boolean allCompleted = latch.await(180, TimeUnit.SECONDS); // 고부하 등록 요청이므로 180초 대기
        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

        // 결과 확인
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

        System.out.printf("사용자 등록 고부하 테스트 결과 - 요청 수: %d, 성공: %d, 실패: %d, 시간: %d ms, TPS: %.2f, 완료 여부: %b%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond, allCompleted);

        // 등록 요청은 중복 ID로 인해 일부 실패할 수 있으므로 70% 이상 성공을 목표로 함
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.70));
    }

    @Test
    @DisplayName("사용자 단일 조회 - 고부하 압력 테스트 (300개 동시 요청)")
    void stressTest_getUserById_300ConcurrentRequests() throws Exception {
        // Given: 먼저 테스트 사용자 생성
        for (int i = 0; i < 50; i++) {
            try {
                UserSignupRequest request = new UserSignupRequest(
                        "stressUser" + i,
                        "Password123!",
                        "고부하 테스트 사용자" + i,
                        com.company.project.domain.user.Role.USER,
                        "hint",
                        "answer");
                userService.signup(request);
            } catch (Exception e) {
                // 이미 존재하는 경우 무시
            }
        }

        int numberOfRequests = 300;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 300개의 동시 사용자 조회 요청 실행 (라운드 로빈으로 다른 사용자 조회)
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfRequests; i++) {
            final String userId = "stressUser" + (i % 50); // 50명의 사용자 중 하나를 순환
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
        boolean allCompleted = latch.await(120, TimeUnit.SECONDS); // 최대 120초 대기
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

        System.out.printf("사용자 단일 조회 고부하 테스트 결과 - 요청 수: %d, 성공: %d, 실패: %d, 시간: %d ms, TPS: %.2f, 완료 여부: %b%n",
                numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
                requestsPerSecond, allCompleted);

        // 고부하 상황이므로 85% 이상의 요청이 성공하면 성공으로 간주
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.85));
    }

    @Test
    @DisplayName("지속적인 고부하 테스트 - 5분간 지속적인 요청")
    void stressTest_continuousHighLoad_5Minutes() throws Exception {
        // Given
        int threads = 20; // 20개의 스레드로 지속적인 요청
        int requestsPerThread = 50; // 각 스레드당 50개 요청
        int totalRequests = threads * requestsPerThread; // 총 1000개 요청
        CountDownLatch latch = new CountDownLatch(totalRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        ExecutorService continuousExecutor = Executors.newFixedThreadPool(threads);

        // When: 5분간 지속적인 요청
        long testStartTime = System.currentTimeMillis();
        long testDuration = 5 * 60 * 1000; // 5 minutes in milliseconds

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
                                    "userNm": "지속 테스트 사용자%d",
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

        // Then: 모든 요청이 완료되기를 대기
        boolean allCompleted = latch.await(400, TimeUnit.SECONDS); // 5분 이상 대기 (6분 40초)
        long testEndTime = System.currentTimeMillis();

        long duration = testEndTime - testStartTime;
        double requestsPerSecond = (double) totalRequests / (duration / 1000.0);

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

        System.out.printf("지속 고부하 테스트 결과 - 요청 수: %d, 성공: %d, 실패: %d, 시간: %d ms, TPS: %.2f, 완료 여부: %b%n",
                totalRequests, successfulRequests, totalRequests - successfulRequests, duration, requestsPerSecond,
                allCompleted);

        // 지속적인 고부하 상황이므로 75% 이상의 요청이 성공하면 성공으로 간주
        assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (totalRequests * 0.75));

        continuousExecutor.shutdown();
    }

    @Test
    @DisplayName("고부하 상황에서의 응답 시간 변화 추이")
    void stressTest_responseTimeTrend_underHighLoad() throws Exception {
        // Given
        int numberOfRequests = 100;
        List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();
        CountDownLatch latch = new CountDownLatch(numberOfRequests);

        // When: 고부하 상황에서 응답 시간 측정
        long testStartTime = System.currentTimeMillis();

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
                } catch (Exception e) {
                    e.printStackTrace();
                    responseTimes.add(-1L); // Error marker
                } finally {
                    latch.countDown();
                }
            });
        }

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(60, TimeUnit.SECONDS);
        long testEndTime = System.currentTimeMillis();

        // 응답 시간 분석
        long successfulRequests = responseTimes.stream().filter(time -> time > 0).count();
        long avgResponseTime = responseTimes.stream()
                .filter(time -> time > 0)
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0)
                .longValue();
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

        System.out.printf("고부하 응답 시간 분석 - 평균: %d ms, 최대: %d ms, 최소: %d ms, 성공 요청: %d/%d%n",
                avgResponseTime, maxResponseTime, minResponseTime, successfulRequests, numberOfRequests);

        // 고부하 상황에서도 평균 응답 시간이 2000ms 이하여야 함
        assertThat(avgResponseTime).isLessThan(2000L);
    }

    @Test
    @DisplayName("고부하 상황에서의 메모리 사용량 변화")
    void stressTest_memoryUsage_underHighLoad() throws Exception {
        // Given
        Runtime runtime = Runtime.getRuntime();
        System.gc(); // Force garbage collection before test
        long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

        int numberOfRequests = 100;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);

        // When: 고부하 상황에서 메모리 사용량 모니터링
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

        System.out.printf("고부하 메모리 사용량 - 초기: %d bytes, 최종: %d bytes, 증가: %d bytes%n",
                initialUsedMemory, finalUsedMemory, memoryIncrease);

        // 고부하 상황에서도 메모리 증가량이 100MB 이하여야 함 (메모리 누수 방지 기준)
        assertThat(memoryIncrease).isLessThan(100 * 1024 * 1024L); // 100MB
    }

    @Test
    @DisplayName("고부하 상황에서의 오류율 측정")
    void stressTest_errorRate_underHighLoad() throws Exception {
        // Given
        int numberOfRequests = 250;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Integer>> futures = new ArrayList<>();

        // When: 고부하 상황에서 오류율 측정
        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            Future<Integer> future = executorService.submit(() -> {
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(90, TimeUnit.SECONDS);

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

        System.out.printf("고부하 오류율 측정 - 성공: %d, 실패: %d, 오류율: %.2f%%%n",
                successCount, errorCount, errorRate);

        // 고부하 상황에서도 오류율이 20% 미만이어야 함
        assertThat(errorRate).isLessThan(20.0);
    }

    @Test
    @DisplayName("고부하 상황에서의 데이터 정합성 확인")
    void stressTest_dataIntegrity_underHighLoad() throws Exception {
        // Given
        String testUserId = "dataIntegrityUser";
        int numberOfRequests = 50;
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        List<Future<Boolean>> futures = new ArrayList<>();

        // When: 동일한 사용자에 대한 고부하 업데이트 요청
        for (int i = 0; i < numberOfRequests; i++) {
            final int updateValue = i;
            Future<Boolean> future = executorService.submit(() -> {
                try {
                    // 사용자 등록 요청 (처음만 성공, 이후는 실패 또는 업데이트)
                    String requestBody = """
                            {
                                "userId": "%s",
                                "password": "Password123!",
                                "userNm": "데이터 무결성 테스트 사용자%d",
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

        // Then: 모든 요청이 완료될 때까지 대기
        latch.await(60, TimeUnit.SECONDS);

        // 결과 확인: 최소한 하나 이상의 요청은 성공해야 함
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

        // 사용자 정보 확인
        mockMvc.perform(get("/api/v1/users/" + testUserId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(testUserId));

        System.out.printf("데이터 무결성 테스트 - 요청 수: %d, 성공: %d%n", numberOfRequests, successfulRequests);

        // 최소한 하나 이상의 요청은 성공해야 함 (중복 ID로 인해 나머지는 실패)
        assertThat(successfulRequests).isGreaterThan(0);
    }
}