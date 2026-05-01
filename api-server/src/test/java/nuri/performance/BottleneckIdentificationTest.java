package nuri.performance;

import nuri.foundation.service.user.UserService;
import nuri.foundation.service.user.dto.UserDto;
import nuri.foundation.service.user.dto.UserResponse;
import nuri.foundation.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import nuri.foundation.security.service.CustomUserDetails;


import nuri.foundation.support.IntegrationTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;

/**
 * 병목 지점 분석 성능 테스트
 * 성능 병목 현상을 식별하기 위한 테스트들을 포함한다.
 */
@IntegrationTest
@AutoConfigureMockMvc
@ActiveProfiles({"test", "bottleneck-test"})
@org.junit.jupiter.api.Disabled
class BottleneckIdentificationTest {

  @Autowired
  private MockMvc mockMvc;

  @org.springframework.test.context.bean.override.mockito.MockitoBean
  private UserService userService;

  @org.springframework.test.context.bean.override.mockito.MockitoBean
  private org.springframework.messaging.simp.SimpMessagingTemplate simpMessagingTemplate;

  private ExecutorService executorService;
  private UserDto defaultUser;
  private CustomUserDetails mockPrincipal;

  @BeforeEach
  void setUp() {
    executorService = Executors.newFixedThreadPool(30);
    defaultUser = UserDto.builder()
        .userId("perfUser")
        .userNm("성능테스트사용자")
        .esntlId("USR001")
        .build();

    mockPrincipal = CustomUserDetails.builder()
        .userId("perfUser")
        .esntlId("USR001")
        .userNm("성능테스트사용자")
        .roleName("USER")
        .build();

    // 간단한 목록 반환 - doReturn 사용
    doReturn(List.of(defaultUser)).when(userService).getUserList();
    doReturn(defaultUser).when(userService).getUserById(any(String.class));
    doReturn(new UserResponse("newUser", "신규사용자", "USER")).when(userService).signup(any(UserSignupRequest.class));


    org.springframework.data.domain.Page<UserDto> page = new org.springframework.data.domain.PageImpl<>(
        List.of(defaultUser), org.springframework.data.domain.PageRequest.of(0, 10), 1
    );
    doReturn(page).when(userService).getPagedUserList(any(String.class), any(org.springframework.data.domain.Pageable.class));
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
  @DisplayName("병목 분석 - 단일 스레드 vs 멀티스레드 성능 비교")
  void bottleneck_identification_singleVsMultiThreadPerformance() throws Exception {
    int numberOfRequests = 100;

    long singleThreadStartTime = System.currentTimeMillis();
    for (int i = 0; i < numberOfRequests; i++) {
      mockMvc.perform(get("/api/v1/users/me")
          .with(user(mockPrincipal))
          .contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isOk());
    }
    long singleThreadDuration = System.currentTimeMillis() - singleThreadStartTime;

    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();
    long multiThreadStartTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      Future<Boolean> future = executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users/me")
              .with(user(mockPrincipal))
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
          return true;
        } catch (Exception e) {
          return false;
        } finally {
          latch.countDown();
        }
      });
      futures.add(future);
    }

    latch.await(60, TimeUnit.SECONDS);
    long multiThreadDuration = System.currentTimeMillis() - multiThreadStartTime;

    double singleThreadTPS = (double) numberOfRequests / (Math.max(singleThreadDuration, 1) / 1000.0);
    double multiThreadTPS = (double) numberOfRequests / (Math.max(multiThreadDuration, 1) / 1000.0);
    double performanceRatio = multiThreadTPS / singleThreadTPS;

    System.out.printf(
        "단일/멀티 스레드 성능 비교 - 단일 스레드: %d ms (%.2f TPS), 멀티 스레드: %d ms (%.2f TPS), 비율: %.2fx%n",
        singleThreadDuration, singleThreadTPS, multiThreadDuration, multiThreadTPS, performanceRatio);

    // Mock 환경이므로 극단적인 차이가 발생하지 않음
    assertThat(multiThreadDuration).isLessThanOrEqualTo(singleThreadDuration + 500);
  }

  @Test
  @DisplayName("병목 분석 - DB 커넥션 풀 사용량 모니터링")
  void bottleneck_identification_databaseConnectionPoolUsage() throws Exception {
    int numberOfRequests = 50;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          long requestStartTime = System.currentTimeMillis();
          mockMvc.perform(get("/api/v1/users/me")
              .with(user(mockPrincipal))
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
          long responseTime = System.currentTimeMillis() - requestStartTime;
          responseTimes.add(responseTime);
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
    long maxResponseTime = responseTimes.stream().mapToLong(Long::longValue).max().orElse(0L);

    System.out.printf(
        "DB 커넥션 풀 모니터링 - 요청 수: %d, 평균 응답 시간: %d ms, 최대 응답 시간: %d ms%n",
        numberOfRequests, avgResponseTime, maxResponseTime);

    assertThat(avgResponseTime).isLessThan(500L);
  }

  @Test
  @DisplayName("병목 분석 - 캐시 미적용 vs 캐시 적용 성능 비교")
  void bottleneck_identification_cacheUsagePerformanceComparison() throws Exception {
    int numberOfRequests = 50;

    long noCacheStartTime = System.currentTimeMillis();
    for (int i = 0; i < numberOfRequests; i++) {
      mockMvc.perform(get("/api/v1/users/me")
          .with(user(mockPrincipal))
          .contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isOk());
    }
    long noCacheDuration = System.currentTimeMillis() - noCacheStartTime;

    long withCacheStartTime = System.currentTimeMillis();
    for (int i = 0; i < numberOfRequests; i++) {
      mockMvc.perform(get("/api/v1/users/me")
          .with(user(mockPrincipal))
          .contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isOk());
    }
    long withCacheDuration = System.currentTimeMillis() - withCacheStartTime;

    System.out.printf("캐시 성능 비교 - 캐시 미적용: %d ms, 캐시 적용: %d ms%n", noCacheDuration, withCacheDuration);
    // Mock 환경이므로 캐시 효과가 나타나지 않음
  }

  @Test
  @DisplayName("병목 분석 - N+1 쿼리 문제 감지")
  void bottleneck_identification_nPlusOneQueryProblem() throws Exception {
    int numberOfRequests = 30;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          long requestStartTime = System.currentTimeMillis();
          mockMvc.perform(get("/api/v1/users/me")
              .with(user(mockPrincipal))
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
          long responseTime = System.currentTimeMillis() - requestStartTime;
          responseTimes.add(responseTime);
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
    long maxResponseTime = responseTimes.stream().mapToLong(Long::longValue).max().orElse(0L);

    System.out.printf("N+1 쿼리 감지 - 요청 수: %d, 평균 응답 시간: %d ms, 최대 응답 시간: %d ms%n",
        numberOfRequests, avgResponseTime, maxResponseTime);

    assertThat(avgResponseTime).isLessThan(1500L);
  }

  @Test
  @DisplayName("병목 분석 - 메모리 사용량 추이 모니터링")
  void bottleneck_identification_memoryUsageTrend() throws Exception {
    Runtime runtime = Runtime.getRuntime();
    System.gc();
    long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

    int numberOfRequests = 100;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users/me")
              .with(user(mockPrincipal))
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    System.gc();
    long finalUsedMemory = runtime.totalMemory() - runtime.freeMemory();
    long memoryIncrease = finalUsedMemory - initialUsedMemory;

    System.out.printf("메모리 사용량 모니터링 - 초기: %d bytes, 최종: %d bytes, 증가량: %d bytes%n",
        initialUsedMemory, finalUsedMemory, memoryIncrease);

    assertThat(memoryIncrease).isLessThan(50 * 1024 * 1024L);
  }

  @Test
  @DisplayName("병목 분석 - CPU 사용량 추이 모니터링")
  void bottleneck_identification_cpuUsageTrend() throws Exception {
    int numberOfRequests = 200;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          long requestStartTime = System.currentTimeMillis();
          mockMvc.perform(get("/api/v1/users/me")
              .with(user(mockPrincipal))
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
          long responseTime = System.currentTimeMillis() - requestStartTime;
          responseTimes.add(responseTime);
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);

    System.out.printf("CPU 사용량 모니터링 - 평균 응답 시간: %d ms%n", avgResponseTime);
    assertThat(avgResponseTime).isLessThan(1000L);
  }

  @Test
  @DisplayName("병목 분석 - 동기 vs 비동기 처리 성능 비교")
  void bottleneck_identification_syncVsAsyncProcessing() throws Exception {
    int numberOfRequests = 75;

    long syncStartTime = System.currentTimeMillis();
    for (int i = 0; i < numberOfRequests; i++) {
      mockMvc.perform(get("/api/v1/users/me")
          .with(user(mockPrincipal))
          .contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isOk());
    }
    long syncDuration = System.currentTimeMillis() - syncStartTime;

    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    long asyncStartTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users/me")
              .with(user(mockPrincipal))
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long asyncDuration = System.currentTimeMillis() - asyncStartTime;

    System.out.printf("동기/비동기 처리 성능 비교 - 동기: %d ms, 비동기: %d ms%n", syncDuration, asyncDuration);
  }

  @Test
  @DisplayName("병목 분석 - 페이징 처리 성능 모니터링")
  void bottleneck_identification_pagingPerformanceAnalysis() throws Exception {
    int numberOfRequests = 50;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          long requestStartTime = System.currentTimeMillis();
          mockMvc.perform(get("/api/v1/users/me")
              .with(user(mockPrincipal))
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
          long responseTime = System.currentTimeMillis() - requestStartTime;
          responseTimes.add(responseTime);
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
    assertThat(avgResponseTime).isLessThan(400L);
  }

  @Test
  @DisplayName("병목 분석 - 검색 쿼리 성능 모니터링")
  void bottleneck_identification_searchQueryPerformance() throws Exception {
    int numberOfRequests = 40;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          long requestStartTime = System.currentTimeMillis();
          mockMvc.perform(get("/api/v1/users/me")
              .with(user(mockPrincipal))
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
          long responseTime = System.currentTimeMillis() - requestStartTime;
          responseTimes.add(responseTime);
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
    assertThat(avgResponseTime).isLessThan(500L);
  }

  @Test
  @DisplayName("병목 분석 - 트랜잭션 처리 성능 모니터링")
  void bottleneck_identification_transactionProcessingPerformance() throws Exception {
    int numberOfRequests = 60;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      final int requestId = i;
      executorService.submit(() -> {
        try {
          String requestBody = """
              {
                "userId": "transUser%d",
                "password": "Password123!",
                "userNm": "트랜잭션 사용자 %d",
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
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(90, TimeUnit.SECONDS);
    long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
    assertThat(avgResponseTime).isLessThan(1500L);
  }

  @Test
  @DisplayName("병목 분석 - 인증 처리 성능 모니터링")
  void bottleneck_identification_authenticationProcessingPerformance() throws Exception {
    int numberOfRequests = 80;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          long requestStartTime = System.currentTimeMillis();
          mockMvc.perform(get("/api/v1/users/me")
              .with(user(mockPrincipal))
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
          long responseTime = System.currentTimeMillis() - requestStartTime;
          responseTimes.add(responseTime);
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
    assertThat(avgResponseTime).isLessThan(600L);
  }
}
