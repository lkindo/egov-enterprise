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
 * 부하 테스트 클래스
 * 다양한 API 엔드포인트에 대한 동시 요청 처리 성능을 측정한다.
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
    executorService = Executors.newFixedThreadPool(20); // 스레드 풀 초기화
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
  @DisplayName("회원 목록 조회 부하 테스트 - 100건 동시 요청")
  void loadTest_getUserList_100ConcurrentRequests() throws Exception {
    // Given
    int numberOfRequests = 100;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // 사전 요청으로 JIT 워밍업
    mockMvc.perform(get("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    // 부하 테스트 시작
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

    // 모든 요청 완료 후 측정
    long endTime = System.currentTimeMillis();

    long duration = endTime - startTime;
    double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

    // 성공 요청 집계
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

    System.out.printf("목록 조회 부하 테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 소요: %d ms, TPS: %.2f%n",
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
      System.out.printf("단일 스레드 평균 응답 시간: %.2f ms%n", avg);
    }

    // 성공률 95% 이상 검증
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("회원가입 부하 테스트 - 50건 동시 요청")
  void loadTest_userSignup_50ConcurrentRequests() throws Exception {
    // Given
    int numberOfRequests = 50;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // 부하 테스트 시작
    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      final int requestId = i;
      Future<Boolean> future = executorService.submit(() -> {
        try {
          String requestBody = """
              {
                "userId": "loadTestUser%d",
                "password": "Password123!",
                "userNm": "부하테스트 사용자%d",
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

    // 완료 후 집계
    long endTime = System.currentTimeMillis();

    long duration = endTime - startTime;
    double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

    // 성공 요청 집계
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
        "회원가입 부하 테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 소요: %d ms, TPS: %.2f%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond);

    // 성공률 90% 이상 검증
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
  }

  @Test
  @DisplayName("단건 조회 부하 테스트 - 200건 동시 요청")
  void loadTest_getUserById_200ConcurrentRequests() throws Exception {
    // 테스트용 사용자 사전 등록
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
        // 이미 등록된 사용자는 무시
      }
    });

    int numberOfRequests = 200;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // 부하 테스트 시작
    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      final String userId = "perfUser" + (i % 10); // 등록된 10명의 사용자를 순환하여 조회
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

    // 완료 후 집계
    long endTime = System.currentTimeMillis();

    long duration = endTime - startTime;
    double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

    // 성공 요청 집계
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
        "단건 조회 부하 테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 소요: %d ms, TPS: %.2f%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond);

    // 성공률 95% 이상 검증
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("페이징 목록 조회 부하 테스트 - 75건 동시 요청")
  void loadTest_getPagedUserList_75ConcurrentRequests() throws Exception {
    // Given
    int numberOfRequests = 75;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // 부하 테스트 시작
    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      if (i % 50 == 0)
        System.out.println("Processing load id: " + i);
      final int pageNum = i % 5; // 0~4 페이지를 순환하여 요청
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

    // 완료 후 집계
    long endTime = System.currentTimeMillis();

    long duration = endTime - startTime;
    double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

    // 성공 요청 집계
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
        "페이징 목록 조회 부하 테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 소요: %d ms, TPS: %.2f%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond);

    // 성공률 95% 이상 검증
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("혼합 API 부하 테스트 - 150건 동시 요청")
  void loadTest_mixedApiRequests_150ConcurrentRequests() throws Exception {
    // 테스트용 사용자 사전 등록
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
        // 이미 등록된 사용자는 무시
      }
    });

    int numberOfRequests = 150;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // 부하 테스트 시작
    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      final int requestType = i % 10; // 0-9
      Future<Boolean> future;

      if (requestType < 6) { // 60% - 목록 조회
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
      } else if (requestType < 8) { // 20% - 단건 조회
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
      } else { // 20% - 회원가입
        final int userIdNum = numberOfRequests + i; // 기존 사용자와 ID 충돌 방지
        future = executorService.submit(() -> {
          try {
            String requestBody = """
                {
                  "userId": "mixedLoadUser%d",
                  "password": "Password123!",
                  "userNm": "혼합 부하 테스트 사용자%d",
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

    // 완료 후 집계
    long endTime = System.currentTimeMillis();

    long duration = endTime - startTime;
    double requestsPerSecond = (double) numberOfRequests / (duration / 1000.0);

    // 성공 요청 집계
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
        "혼합 API 부하 테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 소요: %d ms, TPS: %.2f%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond);

    // 성공률 90% 이상 검증
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
  }

  @Test
  @DisplayName("부하 테스트 - 응답 시간 분석")
  void loadTest_responseTimeAnalysis() throws Exception {
    // Given
    int numberOfRequests = 50;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new CopyOnWriteArrayList<>(); // 스레드 안전 리스트

    // 응답 시간 측정 요청 실행
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

    // 모든 요청 완료 대기

    latch.await(60, TimeUnit.SECONDS);
    if (!responseTimes.isEmpty()) {
      long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
      long maxResponseTime = responseTimes.stream().mapToLong(Long::longValue).max().orElse(0L);
      long minResponseTime = responseTimes.stream().mapToLong(Long::longValue).min().orElse(0L);

      System.out.printf("응답 시간 분석 - 평균: %d ms, 최대: %d ms, 최소: %d ms, 총 요청: %d%n",
          avgResponseTime, maxResponseTime, minResponseTime, responseTimes.size());

      // 평균 응답 시간 1초 미만 검증
      assertThat(avgResponseTime).isLessThan(1000L);
    }
  }

  @Test
  @DisplayName("부하 테스트 - 메모리 사용량 모니터링")
  void loadTest_memoryUsageMonitoring() throws Exception {
    // Given
    Runtime runtime = Runtime.getRuntime();
    System.gc(); // 테스트 전 GC 강제 실행
    long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

    int numberOfRequests = 30;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);

    // 메모리 사용량 측정 요청 실행
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

    // 모든 요청 완료 대기
    latch.await(30, TimeUnit.SECONDS);

    System.gc(); // 테스트 후 GC 강제 실행
    long finalUsedMemory = runtime.totalMemory() - runtime.freeMemory();
    long memoryIncrease = finalUsedMemory - initialUsedMemory;

    System.out.printf("메모리 사용량 - 초기: %d bytes, 최종: %d bytes, 증가량: %d bytes%n",
        initialUsedMemory, finalUsedMemory, memoryIncrease);

    // 메모리 증가량 50MB 미만 검증
    assertThat(memoryIncrease).isLessThan(50 * 1024 * 1024L); // 50MB
  }
}
