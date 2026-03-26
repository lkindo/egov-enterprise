package com.company.project.performance;

import com.company.project.foundation.service.user.UserService;
import com.company.project.foundation.service.user.dto.UserDto;
import com.company.project.foundation.service.user.dto.UserResponse;
import com.company.project.foundation.service.user.dto.UserSignupRequest;
import com.company.project.foundation.domain.user.entity.Role;
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
 * ?ㅽ듃?덉뒪 ?뚯뒪??- ?숈떆??諛?遺???깅뒫 寃利? */
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

  // 湲곗〈 而⑦뀓?ㅽ듃 異⑸룎 諛⑹???紐낆떆??Mock ?ㅼ젙
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
    defaultUser = new UserDto("stressUser", "?ㅽ듃?덉뒪?뚯뒪??, "USR001", null, null, null, null);

    // ?꾨줉??媛앹껜?먯꽌???덉쟾??doReturn 臾몃쾿 ?ъ슜
    doReturn(List.of(defaultUser)).when(userService).getUserList();
    doReturn(defaultUser).when(userService).getUserById(any(String.class));
    doReturn(new UserResponse("newUser", "?좉퇋", Role.USER)).when(userService).signup(any(UserSignupRequest.class));
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
  @DisplayName("?뚯썝 媛???ㅽ듃?덉뒪 ?뚯뒪??- ?숈떆 ?ㅻ컻???곌린 遺??(300嫄?")
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
                "userNm": "?뚯뒪??d",
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
  @DisplayName("?뚯썝 紐⑸줉 議고쉶 ?ㅽ듃?덉뒪 ?뚯뒪??- 吏?띿쟻??怨좊???(500嫄?")
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
  @DisplayName("?④굔 議고쉶 ?ㅽ듃?덉뒪 ?뚯뒪??- 蹂묐ぉ 援ш컙 ?뺤씤??怨좊???(1000嫄?")
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
  @DisplayName("蹂듯빀 ?ㅽ듃?덉뒪 ?뚯뒪??- ?쎄린/?곌린 ?숈떆 ?ㅻ컻??諛쒖깮 (800嫄?")
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
                  "userNm": "誘뱀뒪?뚯뒪??d",
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
    
    System.out.printf("?쇳빀 ?ㅽ듃?덉뒪 寃곌낵 - ?붿껌: %d, ?깃났: %d, ?뚯슂: %d ms%n", numberOfRequests, successCount.get(), duration);
    assertThat(successCount.get()).isGreaterThanOrEqualTo((int) (numberOfRequests * 0.85));
  }
}
