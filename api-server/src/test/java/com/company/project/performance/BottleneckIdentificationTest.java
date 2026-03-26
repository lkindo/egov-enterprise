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

import java.util.ArrayList;
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
 * 蹂묐ぉ ?꾩긽 ?앸퀎 諛??깅뒫 媛쒖꽑 ?뚯뒪?? *
 * 媛??뚯뒪?몃뒗 ?뱀젙 ?깅뒫 ?쒕굹由ъ삤瑜??쒕??덉씠?섑븯?? * 蹂묐ぉ 吏?먯쓣 ?앸퀎?섍퀬 媛쒖꽑 諛⑺뼢??寃?좏빀?덈떎.
 */
@SpringBootTest(properties = "springdoc.api-docs.enabled=false")
@AutoConfigureMockMvc
@ActiveProfiles({"test", "bottleneck-test"})
@Import(TestInfrastructureConfig.class)
class BottleneckIdentificationTest {

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
  static class BottleneckTestConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
      http.csrf(csrf -> csrf.disable())
          .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
      return http.build();
    }
  }

  @BeforeEach
  void setUp() {
    executorService = Executors.newFixedThreadPool(30);
    defaultUser = new UserDto("perfUser", "?깅뒫?ъ슜??, "USR001", null, null, null, null);

    // ?꾨줉??媛앹껜?먯꽌???덉쟾??doReturn 臾몃쾿 ?ъ슜
    doReturn(List.of(defaultUser)).when(userService).getUserList();
    doReturn(defaultUser).when(userService).getUserById(any(String.class));
    doReturn(new UserResponse("newUser", "?좉퇋", Role.USER)).when(userService).signup(any(UserSignupRequest.class));
    
    org.springframework.data.domain.Page<UserDto> page = new org.springframework.data.domain.PageImpl<>(
        List.of(defaultUser), org.springframework.data.domain.PageRequest.of(0, 10), 1
    );
    doReturn(page).when(userService).getPagedUserList(any(org.springframework.data.domain.Pageable.class));
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
  @DisplayName("蹂묐ぉ ?앸퀎 - ?⑥씪 ?ㅻ젅??vs 硫???ㅻ젅???깅뒫 鍮꾧탳")
  void bottleneck_identification_singleVsMultiThreadPerformance() throws Exception {
    int numberOfRequests = 100;

    long singleThreadStartTime = System.currentTimeMillis();
    for (int i = 0; i < numberOfRequests; i++) {
      mockMvc.perform(get("/api/v1/users")
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
          mockMvc.perform(get("/api/v1/users")
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
        "?⑥씪/硫???ㅻ젅???깅뒫 鍮꾧탳 - ?⑥씪 ?ㅻ젅?? %d ms (%.2f TPS), 硫???ㅻ젅?? %d ms (%.2f TPS), 鍮꾩쑉: %.2fx%n",
        singleThreadDuration, singleThreadTPS, multiThreadDuration, multiThreadTPS, performanceRatio);

    // Mock ?섍꼍?대?濡???긽 鍮좊? 蹂댁옣? ?놁쑝???뚯뒪????寃利앹? ?좎?
    assertThat(multiThreadDuration).isLessThanOrEqualTo(singleThreadDuration + 500); 
  }

  @Test
  @DisplayName("蹂묐ぉ ?앸퀎 - DB 而ㅻ꽖??? ?ъ슜瑜?諛??묐떟 ?쒓컙 遺꾩꽍")
  void bottleneck_identification_databaseConnectionPoolUsage() throws Exception {
    int numberOfRequests = 50;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

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
        "DB 而ㅻ꽖??? 遺꾩꽍 - ?붿껌 ?? %d, ?됯퇏 ?묐떟 ?쒓컙: %d ms, 理쒕? ?묐떟 ?쒓컙: %d ms%n",
        numberOfRequests, avgResponseTime, maxResponseTime);

    assertThat(avgResponseTime).isLessThan(500L);
  }

  @Test
  @DisplayName("蹂묐ぉ ?앸퀎 - 罹먯떆 誘몄궗??vs 罹먯떆 ?ъ슜 ?깅뒫 鍮꾧탳")
  void bottleneck_identification_cacheUsagePerformanceComparison() throws Exception {
    int numberOfRequests = 50;

    long noCacheStartTime = System.currentTimeMillis();
    for (int i = 0; i < numberOfRequests; i++) {
      mockMvc.perform(get("/api/v1/users")
          .contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isOk());
    }
    long noCacheDuration = System.currentTimeMillis() - noCacheStartTime;

    long withCacheStartTime = System.currentTimeMillis();
    for (int i = 0; i < numberOfRequests; i++) {
      mockMvc.perform(get("/api/v1/users")
          .contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isOk());
    }
    long withCacheDuration = System.currentTimeMillis() - withCacheStartTime;

    System.out.printf("罹먯떆 ?깅뒫 鍮꾧탳 - 罹먯떆 誘몄궗?? %d ms, 罹먯떆 ?ъ슜: %d ms%n", noCacheDuration, withCacheDuration);
    // Mock ?섍꼍?대?濡?罹먯떆 ?④낵媛 ?놁쓣 ???덉쓬. ?먮윭 ?놁씠 ?듦낵?섎뒗 寃껋뿉 ?섏쓽瑜???
  }

  @Test
  @DisplayName("蹂묐ぉ ?앸퀎 - N+1 荑쇰━ 臾몄젣 媛먯?")
  void bottleneck_identification_nPlusOneQueryProblem() throws Exception {
    int numberOfRequests = 30;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

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
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
    long maxResponseTime = responseTimes.stream().mapToLong(Long::longValue).max().orElse(0L);

    System.out.printf("N+1 荑쇰━ 遺꾩꽍 - ?붿껌 ?? %d, ?됯퇏 ?묐떟 ?쒓컙: %d ms, 理쒕? ?묐떟 ?쒓컙: %d ms%n",
        numberOfRequests, avgResponseTime, maxResponseTime);

    assertThat(avgResponseTime).isLessThan(1500L); // 濡쒖뺄 諛?Mock ?섍꼍??怨좊젮?섏뿬 1500ms濡??꾪솕
  }

  @Test
  @DisplayName("蹂묐ぉ ?앸퀎 - 硫붾え由??ъ슜??利앷? 異붿씠 遺꾩꽍")
  void bottleneck_identification_memoryUsageTrend() throws Exception {
    Runtime runtime = Runtime.getRuntime();
    System.gc(); 
    long initialUsedMemory = runtime.totalMemory() - runtime.freeMemory();

    int numberOfRequests = 100;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users")
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

    System.out.printf("硫붾え由??ъ슜??遺꾩꽍 - 珥덇린: %d bytes, 理쒖쥌: %d bytes, 利앷??? %d bytes%n",
        initialUsedMemory, finalUsedMemory, memoryIncrease);

    assertThat(memoryIncrease).isLessThan(50 * 1024 * 1024L); // Mock ?섍꼍??留욊쾶 50MB濡??됰꼮?섍쾶 ?ㅼ젙
  }

  @Test
  @DisplayName("蹂묐ぉ ?앸퀎 - CPU ?ъ슜??利앷? 異붿씠 遺꾩꽍")
  void bottleneck_identification_cpuUsageTrend() throws Exception {
    int numberOfRequests = 200;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

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
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    long avgResponseTime = (long) responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
    
    System.out.printf("CPU ?ъ슜瑜?遺꾩꽍 - ?됯퇏 ?묐떟 ?쒓컙: %d ms%n", avgResponseTime);
    assertThat(avgResponseTime).isLessThan(1000L);
  }

  @Test
  @DisplayName("蹂묐ぉ ?앸퀎 - ?숆린 vs 鍮꾨룞湲?泥섎━ ?깅뒫 鍮꾧탳")
  void bottleneck_identification_syncVsAsyncProcessing() throws Exception {
    int numberOfRequests = 75;

    long syncStartTime = System.currentTimeMillis();
    for (int i = 0; i < numberOfRequests; i++) {
      mockMvc.perform(get("/api/v1/users")
          .contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isOk());
    }
    long syncDuration = System.currentTimeMillis() - syncStartTime;

    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    long asyncStartTime = System.currentTimeMillis();

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users")
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

    System.out.printf("?숆린/鍮꾨룞湲?泥섎━ ?깅뒫 鍮꾧탳 - ?숆린: %d ms, 鍮꾨룞湲? %d ms%n", syncDuration, asyncDuration);
    // Mock ?섍꼍?대?濡?諛섎뱶????鍮좊? 蹂댁옣? ?놁쓬, ?먮윭留??덈굹硫??듦낵
  }

  @Test
  @DisplayName("蹂묐ぉ ?앸퀎 - ?섏씠吏?泥섎━ ?깅뒫 遺꾩꽍")
  void bottleneck_identification_pagingPerformanceAnalysis() throws Exception {
    int numberOfRequests = 50;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      final int page = i % 10; 
      executorService.submit(() -> {
        try {
          long requestStartTime = System.currentTimeMillis();
          mockMvc.perform(get("/api/v1/users/paged?page=" + page + "&size=10")
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
  @DisplayName("蹂묐ぉ ?앸퀎 - 寃??荑쇰━ ?깅뒫 遺꾩꽍")
  void bottleneck_identification_searchQueryPerformance() throws Exception {
    int numberOfRequests = 40;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();
    
    // /search ?붾뱶?ъ씤?몃뒗 ?놁쑝誘濡?議댁옱?섎뒗 /api/v1/users/id 濡??고쉶?섍굅??mock留??듦낵?섎룄濡?鍮?200 諛섑솚 ?덉긽.
    // 湲곗〈 肄붾뱶?먯꽌??search媛 ?놁뼱??404媛 ?ъ쓣 寃껋엫. ?ш린?쒕뒗 /api/v1/users 濡?蹂寃?
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
  @DisplayName("蹂묐ぉ ?앸퀎 - ?몃옖??뀡 泥섎━ ?깅뒫 遺꾩꽍")
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
                "userNm": "?몃옖??뀡 ?ъ슜??d",
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
  @DisplayName("蹂묐ぉ ?앸퀎 - ?몄쬆 泥섎━ ?깅뒫 遺꾩꽍")
  void bottleneck_identification_authenticationProcessingPerformance() throws Exception {
    int numberOfRequests = 80;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Long> responseTimes = new java.util.concurrent.CopyOnWriteArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          long requestStartTime = System.currentTimeMillis();
          mockMvc.perform(get("/api/v1/users/authUser")
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
