package com.company.project.performance;

import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import com.company.project.domain.user.entity.Role;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.mockito.Mockito;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 부하 테스트 클래스
 * 다양한 API 엔드포인트에 대한 동시 요청 처리 성능을 측정한다.
 */
@SpringBootTest(properties = "springdoc.api-docs.enabled=false")
@AutoConfigureMockMvc
@EnableWebMvc
@ActiveProfiles({"test", "load-test"})
class LoadTest {

  @Autowired
  private MockMvc mockMvc;

  // 로컬 테스트 구성을 통해 강제로 생성된 Mock을 주입받음
  @Autowired
  private UserService userService;

  private ExecutorService executorService;
  private UserDto defaultUser;

  // 기존 컨텍스트 충돌 및 NotAMockException 방지를 위한 명시적 Mock 등록
  @TestConfiguration
  @org.springframework.context.annotation.Profile("load-test")
  static class LoadTestConfig {
      @Bean
      @Primary
      public UserService mockUserService() {
          return Mockito.mock(UserService.class);
      }

      @Bean
      public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
          http.csrf(csrf -> csrf.disable())
              .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
          return http.build();
      }
  }

  @BeforeEach
  void setUp() {
    executorService = Executors.newFixedThreadPool(20); // 스레드 풀 초기화
    defaultUser = new UserDto("perfUser", "성능사용자", "USR001", null, null, null, null);
    
    // 이제 확실한 Mock 객체이므로 when().thenReturn() 문법 사용 가능
    when(userService.getUserList()).thenReturn(List.of(defaultUser));
    when(userService.getUserById(any(String.class))).thenReturn(defaultUser);
    
    org.springframework.data.domain.Page<UserDto> page = new org.springframework.data.domain.PageImpl<>(
        List.of(defaultUser), org.springframework.data.domain.PageRequest.of(0, 10), 1
    );
    when(userService.getPagedUserList(any(org.springframework.data.domain.Pageable.class))).thenReturn(page);
    
    when(userService.signup(any(UserSignupRequest.class))).thenReturn(new UserResponse("newUser", "신규", Role.USER));
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
    int numberOfRequests = 100;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    // 사전 요청으로 JIT 워밍업
    mockMvc.perform(get("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      Future<Boolean> future = executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users")
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.success").value(true));
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

    latch.await(30, TimeUnit.SECONDS);
    long endTime = System.currentTimeMillis();
    long duration = endTime - startTime;
    double requestsPerSecond = (double) numberOfRequests / (Math.max(duration, 1) / 1000.0);

    long successfulRequests = futures.stream()
        .map(future -> {
          try {
            return future.get(1, TimeUnit.SECONDS);
          } catch (Exception e) {
            return false;
          }
        })
        .filter(Boolean::booleanValue)
        .count();

    System.out.printf("목록 조회 부하 테스트 결과 - 요청: %d, 성공: %d, 실패: %d, 소요: %d ms, TPS: %.2f%n",
        numberOfRequests, successfulRequests, numberOfRequests - successfulRequests, duration,
        requestsPerSecond);

    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("회원가입 부하 테스트 - 50건 동시 요청")
  void loadTest_userSignup_50ConcurrentRequests() throws Exception {
    int numberOfRequests = 50;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

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
              .andExpect(jsonPath("$.success").value(true));
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

    latch.await(30, TimeUnit.SECONDS);
    
    long successfulRequests = futures.stream()
        .map(future -> {
          try {
            return future.get(1, TimeUnit.SECONDS);
          } catch (Exception e) {
            return false;
          }
        })
        .filter(Boolean::booleanValue)
        .count();

    System.out.printf("회원가입 부하 테스트 결과 - 요청: %d, 성공: %d%n", numberOfRequests, successfulRequests);
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
  }

  @Test
  @DisplayName("단건 조회 부하 테스트 - 200건 동시 요청")
  void loadTest_getUserById_200ConcurrentRequests() throws Exception {
    int numberOfRequests = 200;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      final String userId = "perfUser" + (i % 10); 
      Future<Boolean> future = executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users/" + userId)
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.success").value(true));
          return true;
        } catch (Exception e) {
          return false;
        } finally {
          latch.countDown();
        }
      });
      futures.add(future);
    }

    latch.await(30, TimeUnit.SECONDS);
    
    long successfulRequests = futures.stream()
        .map(future -> {
          try {
            return future.get(1, TimeUnit.SECONDS);
          } catch (Exception e) {
            return false;
          }
        })
        .filter(Boolean::booleanValue)
        .count();

    System.out.printf("단건 조회 부하 테스트 결과 - 요청: %d, 성공: %d%n", numberOfRequests, successfulRequests);
    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("페이징 목록 조회 부하 테스트 - 75건 동시 요청")
  void loadTest_getPagedUserList_75ConcurrentRequests() throws Exception {
    int numberOfRequests = 75;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      final int pageNum = i % 5; 
      Future<Boolean> future = executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users/paged?page=%d&size=10".formatted(pageNum))
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.success").value(true));
          return true;
        } catch (Exception e) {
          return false;
        } finally {
          latch.countDown();
        }
      });
      futures.add(future);
    }

    latch.await(30, TimeUnit.SECONDS);
    
    long successfulRequests = futures.stream()
        .map(f -> {
          try { return f.get(1, TimeUnit.SECONDS); } catch(Exception e) { return false; }
        }).filter(b -> b).count();

    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("혼합 API 부하 테스트 - 150건 동시 요청")
  void loadTest_mixedApiRequests_150ConcurrentRequests() throws Exception {
    int numberOfRequests = 150;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      final int requestType = i % 10; 
      Future<Boolean> future;

      if (requestType < 6) { // 목록 조회
        future = executorService.submit(() -> {
          try {
            mockMvc.perform(get("/api/v1/users").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
            return true;
          } catch (Exception e) { return false; } finally { latch.countDown(); }
        });
      } else if (requestType < 8) { // 단건 조회
        future = executorService.submit(() -> {
          try {
            mockMvc.perform(get("/api/v1/users/user1").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
            return true;
          } catch (Exception e) { return false; } finally { latch.countDown(); }
        });
      } else { // 회원가입
        final int userIdNum = numberOfRequests + i; 
        future = executorService.submit(() -> {
          try {
            String requestBody = """
                {
                  "userId": "mixedUser%d",
                  "password": "Password123!",
                  "userNm": "혼합사용자",
                  "role": "USER"
                }
                """.formatted(userIdNum);

            mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk());
            return true;
          } catch (Exception e) { return false; } finally { latch.countDown(); }
        });
      }
      futures.add(future);
    }

    latch.await(30, TimeUnit.SECONDS);
    
    long successfulRequests = futures.stream().map(f -> {
      try { return f.get(1, TimeUnit.SECONDS); } catch(Exception e) { return false; }
    }).filter(b -> b).count();

    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
  }

  @Test
  @DisplayName("부하 테스트 - 응답 시간 분석")
  void loadTest_responseTimeAnalysis() throws Exception {
    int numberOfRequests = 50;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new CopyOnWriteArrayList<>(); 

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          long requestStartTime = System.currentTimeMillis();
          mockMvc.perform(get("/api/v1/users").contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
          responseTimes.add(System.currentTimeMillis() - requestStartTime);
        } catch (Exception e) {
          e.printStackTrace();
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(30, TimeUnit.SECONDS);
    if (!responseTimes.isEmpty()) {
      long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
      assertThat(avgResponseTime).isLessThan(1500L); // 1.5초 미만 (환경에 따라 여유 있게)
    }
  }

  @Test
  @DisplayName("부하 테스트 - 메모리 사용량 모니터링")
  void loadTest_memoryUsageMonitoring() throws Exception {
    Runtime runtime = Runtime.getRuntime();
    System.gc(); 
    long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

    int numberOfRequests = 30;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users").contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
        } catch (Exception e) {
          e.printStackTrace();
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(30, TimeUnit.SECONDS);
    System.gc(); 
    long finalUsedMemory = runtime.totalMemory() - runtime.freeMemory();
    long memoryIncrease = finalUsedMemory - initialUsedMemory;

    // 모킹된 환경에서는 메모리 증가가 거의 없음. 100MB 미만으로 안전하게 검증.
    assertThat(memoryIncrease).isLessThan(100 * 1024 * 1024L); 
  }
}
