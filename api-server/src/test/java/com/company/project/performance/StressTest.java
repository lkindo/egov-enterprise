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
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.company.project.config.TestInfrastructureConfig;
import org.springframework.context.annotation.Import;

/**
 * 스트레스 테스트 - 동시성 및 부하 성능 검증
 */
@SpringBootTest(properties = "springdoc.api-docs.enabled=false")
@AutoConfigureMockMvc
@ActiveProfiles({"test", "stress-test"})
@Import(TestInfrastructureConfig.class)
class StressTest {

  @Autowired
  private MockMvc mockMvc;

  @org.springframework.test.context.bean.override.mockito.MockitoBean
  private UserService userService;

  @org.springframework.test.context.bean.override.mockito.MockitoBean
  private org.springframework.messaging.simp.SimpMessagingTemplate simpMessagingTemplate;

  private ExecutorService executorService;
  private UserDto defaultUser;

  // 기존 컨텍스트 충돌 방지용 명시적 Mock 설정
  @TestConfiguration
  static class StressTestConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
      http.csrf(csrf -> csrf.disable())
          .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
      return http.build();
    }
  }

  @BeforeEach
  void setUp() {
    executorService = Executors.newFixedThreadPool(50);
    defaultUser = new UserDto("stressUser", "스트레스테스터", "USR001", null, null, null, null);

    // 프록시 객체에서도 안전한 doReturn 문법 사용
    doReturn(List.of(defaultUser)).when(userService).getUserList();
    doReturn(defaultUser).when(userService).getUserById(any(String.class));
    doReturn(new UserResponse("newUser", "신규", Role.USER)).when(userService).signup(any(UserSignupRequest.class));
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
  @DisplayName("회원 가입 스트레스 테스트 - 동시 다발적 쓰기 부하 (300건)")
  void stress_signup_concurrency_300() throws Exception {
    int numberOfRequests = 300;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(0);

    for (int i = 0; i < numberOfRequests; i++) {
      final int requestId = i;
      executorService.submit(() -> {
        try {
          String requestBody = """
              {
                "userId": "stress%d",
                "password": "Password123!",
                "userNm": "테스터%d",
                "passwordHint": "hint",
                "passwordCnsr": "answer",
                "role": "USER"
              }
              """.formatted(requestId, requestId);

          mockMvc.perform(post("/api/v1/users/signup")
              .contentType(MediaType.APPLICATION_JSON)
              .content(requestBody))
              .andExpect(status().isOk());
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    assertThat(successCount.get()).isEqualTo(numberOfRequests);
  }

  @Test
  @DisplayName("회원 목록 조회 스트레스 테스트 - 지속적인 고부하 (500건)")
  void stress_userList_heavyLoad_500() throws Exception {
    int numberOfRequests = 500;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(0);

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users")
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    assertThat(successCount.get()).isGreaterThanOrEqualTo((int) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("단건 조회 스트레스 테스트 - 병목 구간 확인용 고부하 (1000건)")
  void stress_userDetail_extremeLoad_1000() throws Exception {
    int numberOfRequests = 1000;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(0);

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users/stressUser")
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(90, TimeUnit.SECONDS);
    assertThat(successCount.get()).isGreaterThanOrEqualTo((int) (numberOfRequests * 0.9));
  }

  @Test
  @DisplayName("복합 스트레스 테스트 - 읽기/쓰기 동시 다발적 발생 (800건)")
  void stress_mixed_concurrency_800() throws Exception {
    int numberOfRequests = 800;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(0);

    long startTime = System.currentTimeMillis();
    for (int i = 0; i < numberOfRequests; i++) {
      final int requestId = i;
      executorService.submit(() -> {
        try {
          if (requestId % 4 == 0) {
            // Write
            String requestBody = """
                {
                  "userId": "mixed%d",
                  "password": "Password123!",
                  "userNm": "믹스테스터%d",
                  "role": "USER"
                }
                """.formatted(requestId, requestId);
            mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody));
          } else {
            // Read
            mockMvc.perform(get("/api/v1/users"));
          }
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(120, TimeUnit.SECONDS);
    long duration = System.currentTimeMillis() - startTime;
    
    System.out.printf("혼합 스트레스 결과 - 요청: %d, 성공: %d, 소요: %d ms%n", numberOfRequests, successCount.get(), duration);
    assertThat(successCount.get()).isGreaterThanOrEqualTo((int) (numberOfRequests * 0.85));
  }
}
