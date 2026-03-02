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
 * 사용자 목록 조회 스트레스 테스트
 * 다수의 사용자가 동시에 시스템에 접근할 때의 성능을 측정합니다.
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
    // 50개의 스레드를 가진 스레드 풀 생성
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
  @DisplayName("사용자 목록 조회 스트레스 테스트 - 동시 요청 처리 성능 확인 (500회 요청)")
  void stressTest_getUserList_500ConcurrentRequests() throws Exception {
    // Given
    int numberOfRequests = 500;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // Warm-up
    mockMvc.perform(get("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    // 성능 측정을 위한 시작 시간 기록
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

    // Korean comment removed
    boolean allCompleted = latch.await(120, TimeUnit.SECONDS);
    long endTime = System.currentTimeMillis();
    long duration = endTime - startTime;
    double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

    // Korean comment removed
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

    System.out.printf(
        "스트레스사용자테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 평균: %d ms, TPS: %.2f, 모두완료: %b%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond, allCompleted);

    // Korean comment removed
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.80));
  }

  @Test
  @DisplayName("사용자가입- 스트레스 테스트 사용자 (200건)")
  void stressTest_userSignup_200ConcurrentRequests() throws Exception {
    // Given
    int numberOfRequests = 200;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // Korean comment removed
    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      final int requestId = i;
      Future<Boolean> future = executorService.submit(() -> {
        try {
          String requestBody = """
              {
                "userId": "stressTestUser%d",
                "password": "Password123!",
                "userNm": "스트레스사용자d",
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

    boolean allCompleted = latch.await(180, TimeUnit.SECONDS);
    long endTime = System.currentTimeMillis();

    long duration = endTime - startTime;
    double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

    // Korean comment removed
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

    System.out.printf(
        "사용자가입스트레스사용자테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 평균: %d ms, TPS: %.2f, 모두완료: %b%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond, allCompleted);

    // Korean comment removed
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.70));
  }

  @Test
  @DisplayName("사용자브퀗???- 스트레스 테스트 사용자 (300건)")
  void stressTest_getUserById_300ConcurrentRequests() throws Exception {
    // Korean comment removed
    for (int i = 0; i < 50; i++) {
      try {
        UserSignupRequest request = new UserSignupRequest(
            "stressUser" + i,
            "Password123!",
            "스트레스사용자 + i",
            com.company.project.domain.user.entity.Role.USER,
            "hint",
            "answer");
        userService.signup(request);
      } catch (Exception e) {
        // Korean comment removed
      }
    }

    int numberOfRequests = 300;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // Korean comment removed
    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      final String userId = "stressUser" + (i % 50); // Korean comment removed
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

    boolean allCompleted = latch.await(120, TimeUnit.SECONDS);
    long endTime = System.currentTimeMillis();

    long duration = endTime - startTime;
    double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

    // Korean comment removed
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

    System.out.printf(
        "사용자브퀗???스트레스사용자테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 평균: %d ms, TPS: %.2f, 모두완료: %b%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond, allCompleted);

    // Korean comment removed
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.85));
  }

  @Test
  @DisplayName("嶺뚯솘사용자스트레스사용자- 5?釉뚯뫅??嶺뚯솘사용자)")
  void stressTest_continuousHighLoad_5Minutes() throws Exception {
    // Given
    int threads = 20; // Korean comment removed
    int requestsPerThread = 50; // Korean comment removed
    int totalRequests = threads * requestsPerThread; // Korean comment removed
    CountDownLatch latch = new CountDownLatch(totalRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    ExecutorService continuousExecutor = Executors.newFixedThreadPool(threads);

    // Korean comment removed
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
                  "userNm": "嶺뚯솘??사용자d",
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

    boolean allCompleted = latch.await(400, TimeUnit.SECONDS);
    long endTime = System.currentTimeMillis();
    long testEndTime = endTime;

    long duration = testEndTime - testStartTime;
    double requestsPerSecond = (double) totalRequests / (duration / 1000.0);

    // Korean comment removed
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

    System.out.printf(
        "嶺뚯솘???스트레스사용자테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 평균: %d ms, TPS: %.2f, 모두완료: %b%n",
        totalRequests, successfulRequests, totalRequests - successfulRequests, duration, requestsPerSecond,
        allCompleted);

    // Korean comment removed
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (totalRequests * 0.75));

    continuousExecutor.shutdown();
  }

  @Test
  @DisplayName("스트레스?이후 사용자테스트 醫롫윞???곌떠????怨뺣뾼??)")
  void stressTest_responseTimeTrend_underHighLoad() throws Exception {
    // Given
    int numberOfRequests = 100;
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();
    CountDownLatch latch = new CountDownLatch(numberOfRequests);

    // Korean comment removed
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

    boolean allCompleted = latch.await(60, TimeUnit.SECONDS);
    if (!allCompleted) {
      System.out.println("Warning: Not all threads completed within timeout");
    }
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

    System.out.printf(
        "스트레스 테스트 응답 시간 분석- 성공 %d ms, 嶺뚣끉裕??: %d ms, 嶺뚣끉裕?? %d ms, 성공/실패 %d/%d%n",
        avgResponseTime, maxResponseTime, minResponseTime, successfulRequests, numberOfRequests);

    // Korean comment removed
    assertThat(avgResponseTime).isLessThan(2000L);
  }

  @Test
  @DisplayName("스트레스?이후 사용자嶺뚮∥???귣쐻사용자 곌떠???)")
  void stressTest_memoryUsage_underHighLoad() throws Exception {
    // Given
    Runtime runtime = Runtime.getRuntime();
    System.gc(); // Force garbage collection before test
    long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

    int numberOfRequests = 100;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);

    // Korean comment removed
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

    boolean allCompleted = latch.await(60, TimeUnit.SECONDS);
    if (!allCompleted) {
      System.out.println("Warning: Not all threads completed within timeout");
    }

    System.gc(); // Force garbage collection after test
    long finalUsedMemory = runtime.totalMemory() - runtime.freeMemory();
    long memoryIncrease = finalUsedMemory - initialUsedMemory;

    System.out.printf("스트레스嶺뚮∥???귣쐻사용자- 초기 %d bytes, 嶺뚣끉裕뉏펺? %d bytes, 嶺뚯빘鍮??: %d bytes%n",
        initialUsedMemory, finalUsedMemory, memoryIncrease);

    // Korean comment removed
    assertThat(memoryIncrease).isLessThan(100 * 1024 * 1024L); // 100MB
  }

  @Test
  @DisplayName("스트레스?이후 사용자실패?嶺뚋뀀룱??)")
  void stressTest_errorRate_underHighLoad() throws Exception {
    // Given
    int numberOfRequests = 250;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Integer>> futures = new ArrayList<>();

    // Korean comment removed
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

    boolean allCompleted = latch.await(90, TimeUnit.SECONDS);
    if (!allCompleted) {
      System.out.println("Warning: Not all threads completed within 90s timeout");
    }
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

    System.out.printf("스트레스실패?嶺뚋뀀룱??- 성공 %d, 실패: %d, 실패? %.2f%%%n",
        successCount, errorCount, errorRate);

    // Korean comment removed
    assertThat(errorRate).isLessThan(20.0);
  }

  @Test
  @DisplayName("스트레스?이후 인증??)")
  void stressTest_dataIntegrity_underHighLoad() throws Exception {
    // Given
    String testUserId = "dataIntegrityUser";
    int numberOfRequests = 50;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // Korean comment removed
    for (int i = 0; i < numberOfRequests; i++) {
      final int updateValue = i;
      Future<Boolean> future = executorService.submit(() -> {
        try {
          // Korean comment removed
          String requestBody = """
              {
                "userId": "%s",
                "password": "Password123!",
                "userNm": "쒕뼬??사용자d",
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

    latch.await(60, TimeUnit.SECONDS);
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

    // Korean comment removed
    mockMvc.perform(get("/api/v1/users/" + testUserId)
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.userId").value(testUserId));

    System.out.printf("쒕뼬??사용자- 사용자 %d, 성공 %d%n", numberOfRequests, successfulRequests);

    // Korean comment removed
    assertThat(successfulRequests).isGreaterThan(0);
  }
}
