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
 * 부하사용자 사용자 醫롫윪??嶺뚳퐣瑗?테스트사용자 *
 * 사용자사용자테스트사용자嶺뚳퐣瑗????테스트 ??
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
    executorService = Executors.newFixedThreadPool(20); // Korean comment removed
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
  @DisplayName("사용자嶺뚮ㅄ維뽨빳??브퀗???- 100?사용자부하 테스트)")
  void loadTest_getUserList_100ConcurrentRequests() throws Exception {
    // Given
    int numberOfRequests = 100;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // Korean comment removed
    mockMvc.perform(get("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    // Korean comment removed
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

    // Korean comment removed
    long endTime = System.currentTimeMillis();

    long duration = endTime - startTime;
    double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

    // Korean comment removed
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

    System.out.printf("부하사용자테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 평균: %d ms, TPS: %.2f%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond);

    List<Long> responseTimes = futures.stream()
        .map(f -> {
          try {
            return Boolean.TRUE.equals(f.get())  0L : -1L;
          } catch (Exception e) {
            return -1L;
          }
        })
        .filter(t -> t >= 0)
        .toList();

    if (!responseTimes.isEmpty()) {
      double avg = responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
      System.out.printf("성공롫윥??嶺뚯솘????怨뺣뾼??용쐻? %.2f ms (성공 リ옇???)%n", avg);
    }

    // Korean comment removed
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("사용자가입- 50?사용자부하 테스트)")
  void loadTest_userSignup_50ConcurrentRequests() throws Exception {
    // Given
    int numberOfRequests = 50;
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
                "userId": "loadTestUser%d",
                "password": "Password123!",
                "userNm": "부하사용자d",
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

    // Korean comment removed
    long endTime = System.currentTimeMillis();

    long duration = endTime - startTime;
    double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

    // Korean comment removed
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

    System.out.printf(
        "사용자가입부하사용자테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 평균: %d ms, TPS: %.2f%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond);

    // Korean comment removed
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
  }

  @Test
  @DisplayName("사용자브퀗???- 200?사용자부하 테스트)")
  void loadTest_getUserById_200ConcurrentRequests() throws Exception {
    // Korean comment removed
    IntStream.range(0, 10).forEach(i -> {
      try {
        UserSignupRequest request = new UserSignupRequest(
            "perfUser" + i,
            "Password123!",
            "테스트사용자 + i",
            com.company.project.domain.user.entity.Role.USER,
            "hint",
            "answer");
        userService.signup(request);
      } catch (Exception e) {
        // Korean comment removed
      }
    });

    int numberOfRequests = 200;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // Korean comment removed
    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      final String userId = "perfUser" + (i % 10); // Korean comment removed
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

    // Korean comment removed
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
        "사용자브퀗???부하사용자테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 평균: %d ms, TPS: %.2f%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond);

    // Korean comment removed
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("사용자嶺뚮ㅄ維뽨빳?페이징?브퀗???- 75?사용자부하 테스트)")
  void loadTest_getPagedUserList_75ConcurrentRequests() throws Exception {
    // Given
    int numberOfRequests = 75;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // Korean comment removed
    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      if (i % 50 == 0)
        System.out.println("Processing load id: " + i);
      final int pageNum = i % 5; // Korean comment removed
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

    // Korean comment removed
    long endTime = System.currentTimeMillis();

    long duration = endTime - startTime;
    double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

    // Korean comment removed
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

    System.out.printf(
        "페이징사용자嶺뚮ㅄ維뽨빳?부하사용자테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 평균: %d ms, TPS: %.2f%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond);

    // Korean comment removed
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("?이후  API 회원- 150?사용자부하 테스트)")
  void loadTest_mixedApiRequests_150ConcurrentRequests() throws Exception {
    // Korean comment removed
    IntStream.range(0, 20).forEach(i -> {
      try {
        UserSignupRequest request = new UserSignupRequest(
            "mixedUser" + i,
            "Password123!",
            "?이후  사용자 + i",
            com.company.project.domain.user.entity.Role.USER,
            "hint",
            "answer");
        userService.signup(request);
      } catch (Exception e) {
        // Korean comment removed
      }
    });

    int numberOfRequests = 150;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // Korean comment removed
    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      final int requestType = i % 10; // 0-9
      Future<Boolean> future;

      if (requestType < 6) { // Korean comment removed
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
      } else if (requestType < 8) { // Korean comment removed
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
      } else { // Korean comment removed
        final int userIdNum = numberOfRequests + i; // Korean comment removed
        future = executorService.submit(() -> {
          try {
            String requestBody = """
                {
                  "userId": "mixedLoadUser%d",
                  "password": "Password123!",
                  "userNm": "?이후  부하사용자d",
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

    // Korean comment removed
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
        "?이후  API 사용자부하 테스트테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 평균: %d ms, TPS: %.2f%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond);

    // Korean comment removed
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
  }

  @Test
  @DisplayName("부하 - 응답 시간 분석)")
  void loadTest_responseTimeAnalysis() throws Exception {
    // Given
    int numberOfRequests = 50;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new CopyOnWriteArrayList<>(); // Thread-safe list for response times

    // Korean comment removed
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

    // Korean comment removed

    latch.await(60, TimeUnit.SECONDS);
    if (!responseTimes.isEmpty()) {
      long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
      long maxResponseTime = responseTimes.stream().mapToLong(Long::longValue).max().orElse(0L);
      long minResponseTime = responseTimes.stream().mapToLong(Long::longValue).min().orElse(0L);

      System.out.printf("테스트 醫롫윞??분석- 성공 %d ms, 嶺뚣끉裕??: %d ms, 嶺뚣끉裕?? %d ms, 사용자 %d%n",
          avgResponseTime, maxResponseTime, minResponseTime, responseTimes.size());

      // Korean comment removed
      assertThat(avgResponseTime).isLessThan(1000L);
    }
  }

  @Test
  @DisplayName("부하 테스트 - 嶺뚮∥???귣쐻사용자嶺뚮ㅄ維???醫롫윥壤?)")
  void loadTest_memoryUsageMonitoring() throws Exception {
    // Given
    Runtime runtime = Runtime.getRuntime();
    System.gc(); // Force garbage collection before test
    long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

    int numberOfRequests = 30;
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

    // Korean comment removed
    latch.await(30, TimeUnit.SECONDS);

    System.gc(); // Force garbage collection after test
    long finalUsedMemory = runtime.totalMemory() - runtime.freeMemory();
    long memoryIncrease = finalUsedMemory - initialUsedMemory;

    System.out.printf("嶺뚮∥???귣쐻사용자- 초기 %d bytes, 嶺뚣끉裕뉏펺? %d bytes, 嶺뚯빘鍮??: %d bytes%n",
        initialUsedMemory, finalUsedMemory, memoryIncrease);

    // Korean comment removed
    assertThat(memoryIncrease).isLessThan(50 * 1024 * 1024L); // 50MB
  }
}
