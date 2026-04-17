package nuri.performance;

import nuri.api.controller.UserApiController;
import nuri.api.interceptor.OperationalAuditInterceptor;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.user.UserService;
import nuri.foundation.service.user.dto.UserDto;
import nuri.foundation.service.user.dto.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import nuri.foundation.domain.user.entity.Role;
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
 * 부하 테스트 (Standalone)
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
    defaultUser = UserDto.builder()
        .userId("perfUser")
        .userNm("성능테스트사용자")
        .esntlId("USR001")
        .build();

    when(userService.getUserList()).thenReturn(List.of(defaultUser));
    when(userService.getUserById(anyString())).thenReturn(defaultUser);

    Page<UserDto> page = new PageImpl<>(
        List.of(defaultUser), PageRequest.of(0, 10), 1
    );
    when(userService.getPagedUserList(any(String.class), any())).thenReturn(page);
    when(userService.signup(any())).thenReturn(new UserResponse("newUser", "신규사용자", Role.USER));
  }

  @AfterEach
  void tearDown() {
    if (executorService != null && !executorService.isShutdown()) {
      executorService.shutdown();
    }
  }

  @Test
  @DisplayName("사용자 목록 조회 부하 테스트 - 100 동시 요청")
  void loadTest_getUserList_100ConcurrentRequests() throws Exception {
    int numberOfRequests = 100;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Future<Boolean>> futures = new ArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      Future<Boolean> future = executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/users/me")
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
  @DisplayName("사용자 회원가입 부하 테스트 - 50 동시 요청")
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
                "userNm": "부하테스트 사용자 %d",
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
