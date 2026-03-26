package com.company.project.performance;

import com.company.project.api.controller.UserApiController;
import com.company.project.api.interceptor.OperationalAuditInterceptor;
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.user.UserService;
import com.company.project.foundation.service.user.dto.UserDto;
import com.company.project.foundation.service.user.dto.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import com.company.project.foundation.domain.user.entity.Role;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 遺???뚯뒪???대옒??(Standalone)
 */
class LoadTest {

  private MockMvc mockMvc;
  private UserService userService;
  private OperationalAuditInterceptor operationalAuditInterceptor;
  private ExecutorService executorService;
  private UserDto defaultUser;

  @BeforeEach
  void setUp() throws Exception {
    userService = mock(UserService.class);
    operationalAuditInterceptor = mock(OperationalAuditInterceptor.class);
    when(operationalAuditInterceptor.preHandle(any(), any(), any())).thenReturn(true);

    mockMvc = MockMvcBuilders.standaloneSetup(new UserApiController(userService))
        .addInterceptors(operationalAuditInterceptor)
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();

    executorService = Executors.newFixedThreadPool(20);
    defaultUser = new UserDto("perfUser", "?깅뒫?ъ슜??, "USR001", null, null, null, null);
    
    when(userService.getUserList()).thenReturn(List.of(defaultUser));
    when(userService.getUserById(anyString())).thenReturn(defaultUser);
    
    Page<UserDto> page = new PageImpl<>(
        List.of(defaultUser), PageRequest.of(0, 10), 1
    );
    when(userService.getPagedUserList(any())).thenReturn(page);
    when(userService.signup(any())).thenReturn(new UserResponse("newUser", "?좉퇋", Role.USER));
  }

  @AfterEach
  void tearDown() {
    if (executorService != null && !executorService.isShutdown()) {
      executorService.shutdown();
    }
  }

  @Test
  @DisplayName("?뚯썝 紐⑸줉 議고쉶 遺???뚯뒪??- 100嫄??숈떆 ?붿껌")
  void loadTest_getUserList_100ConcurrentRequests() throws Exception {
    int numberOfRequests = 100;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      Future<Boolean> future = executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users")
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
        .map(f -> { try { return f.get(1, TimeUnit.SECONDS); } catch (Exception e) { return false; } })
        .filter(Boolean::booleanValue)
        .count();

    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("?뚯썝媛??遺???뚯뒪??- 50嫄??숈떆 ?붿껌")
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
                "userNm": "遺?섑뀒?ㅽ듃 ?ъ슜??d",
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
          return false;
        } finally {
          latch.countDown();
        }
      });
      futures.add(future);
    }

    latch.await(30, TimeUnit.SECONDS);
    long successfulRequests = futures.stream().map(f -> {
      try { return f.get(1, TimeUnit.SECONDS); } catch (Exception e) { return false; }
    }).filter(b -> b).count();

    assertThat(successfulRequests).isGreaterThanOrEqualTo((long) (numberOfRequests * 0.90));
  }
}
