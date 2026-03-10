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
import org.mockito.Mockito;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "springdoc.api-docs.enabled=false")
@AutoConfigureMockMvc
@EnableWebMvc
@ActiveProfiles("test")
class StressTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private UserService userService;

  private ExecutorService executorService;
  private UserDto defaultUser;

  // 기존 컨텍스트 충돌 방지용 명시적 Mock 생성
  @TestConfiguration
  static class StressTestConfig {
    @Bean
    @Primary
    public UserService mockUserService() {
      return Mockito.mock(UserService.class);
    }
  }

  @BeforeEach
  void setUp() {
    executorService = Executors.newFixedThreadPool(50); // 스트레스 테스트를 위한 더 큰 스레드 풀
    defaultUser = new UserDto("stressUser", "스트레스사용자", "USR001", null, null, null, null);

    // 프록시 객체에서도 안전한 doReturn 문법 사용
    doReturn(List.of(defaultUser)).when(userService).getUserList();
    doReturn(defaultUser).when(userService).getUserById(any(String.class));
    
    org.springframework.data.domain.Page<UserDto> page = new org.springframework.data.domain.PageImpl<>(
        List.of(defaultUser), org.springframework.data.domain.PageRequest.of(0, 10), 1
    );
    doReturn(page).when(userService).getPagedUserList(any(org.springframework.data.domain.Pageable.class));
    
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
  @DisplayName("회원 목록 조회 스트레스 테스트 - 지속적인 고부하 (500건)")
  void stressTest_getUserList_500ConcurrentRequests() throws Exception {
    int numberOfRequests = 500;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    AtomicInteger successCount = new AtomicInteger(0);

    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users")
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignored for stress test
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long duration = System.currentTimeMillis() - startTime;
    
    System.out.printf("목록 조회 스트레스 결과 - 요청: %d, 성공: %d, 소요: %d ms%n", numberOfRequests, successCount.get(), duration);
    assertThat(successCount.get()).isGreaterThanOrEqualTo((int) (numberOfRequests * 0.90));
  }

  @Test
  @DisplayName("회원 가입 스트레스 테스트 - 동시 다발적 쓰기 부하 (300건)")
  void stressTest_userSignup_300ConcurrentRequests() throws Exception {
    int numberOfRequests = 300;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    AtomicInteger successCount = new AtomicInteger(0);

    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      final int id = i;
      executorService.submit(() -> {
        try {
          String requestBody = """
              {
                "userId": "stress%d",
                "password": "Password123!",
                "userNm": "사용자%d",
                "role": "USER"
              }
              """.formatted(id, id);

          mockMvc.perform(post("/api/v1/users/signup")
              .contentType(MediaType.APPLICATION_JSON)
              .content(requestBody))
              .andExpect(status().isOk());
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignored for stress test
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long duration = System.currentTimeMillis() - startTime;
    
    System.out.printf("회원 가입 스트레스 결과 - 요청: %d, 성공: %d, 소요: %d ms%n", numberOfRequests, successCount.get(), duration);
    assertThat(successCount.get()).isGreaterThanOrEqualTo((int) (numberOfRequests * 0.90));
  }

  @Test
  @DisplayName("단건 조회 스트레스 테스트 - 병목 구간 확인용 고부하 (1000건)")
  void stressTest_getUserById_1000ConcurrentRequests() throws Exception {
    int numberOfRequests = 1000;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    AtomicInteger successCount = new AtomicInteger(0);

    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      final String userId = "stressUser" + (i % 20);
      executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users/" + userId)
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignored for stress test
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long duration = System.currentTimeMillis() - startTime;
    
    System.out.printf("단건 조회 스트레스 결과 - 요청: %d, 성공: %d, 소요: %d ms%n", numberOfRequests, successCount.get(), duration);
    assertThat(successCount.get()).isGreaterThanOrEqualTo((int) (numberOfRequests * 0.90));
  }

  @Test
  @DisplayName("혼합 스트레스 테스트 - 읽기/쓰기 동시 다발적 발생 (800건)")
  void stressTest_mixedRequests_800Concurrent() throws Exception {
    int numberOfRequests = 800;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    AtomicInteger successCount = new AtomicInteger(0);

    long startTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      final int type = i % 10;
      executorService.submit(() -> {
        try {
          if (type < 7) { // 70% 단건 읽기
            mockMvc.perform(get("/api/v1/users/user1").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
          } else if (type < 9) { // 20% 목록 읽기
            mockMvc.perform(get("/api/v1/users").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
          } else { // 10% 쓰기
            String requestBody = """
                {
                  "userId": "mix%d",
                  "password": "Password123!",
                  "userNm": "혼합",
                  "role": "USER"
                }
                """.formatted(System.nanoTime());
            mockMvc.perform(post("/api/v1/users/signup").contentType(MediaType.APPLICATION_JSON).content(requestBody))
                .andExpect(status().isOk());
          }
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignored
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long duration = System.currentTimeMillis() - startTime;
    
    System.out.printf("혼합 스트레스 결과 - 요청: %d, 성공: %d, 소요: %d ms%n", numberOfRequests, successCount.get(), duration);
    assertThat(successCount.get()).isGreaterThanOrEqualTo((int) (numberOfRequests * 0.85));
  }
}
