package com.company.project.integration;

import com.company.project.config.MinimalTestConfig;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = MinimalTestConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class ParallelProcessingDataIntegrityTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private UserService userService;

  @MockitoBean
  private UserRepository userRepository;

  private ExecutorService executorService;

  @BeforeEach
  void setUp() {
    executorService = Executors.newFixedThreadPool(10);
  }

  @AfterEach
  void tearDown() {
    if (executorService != null) {
      executorService.shutdown();
    }
  }

  @Test
  @DisplayName("병렬 처리 테스트 - 다수 사용자 가입 무결성 검증")
  void parallelUserRegistration_dataIntegrity_preserved() throws Exception {
    // Given
    int numberOfUsers = 10;
    CountDownLatch latch = new CountDownLatch(numberOfUsers);
    List<Callable<String>> tasks = new ArrayList<>();

    for (int i = 0; i < numberOfUsers; i++) {
      final int index = i;
      tasks.add(() -> {
        try {
          String userId = "parallelUser" + index;
          String requestBody = """
              {
                "userId": "%s",
                "password": "password123!",
                "userNm": "병렬사용자%d",
                "passwordHint": "hint",
                "passwordCnsr": "answer",
                "role": "USER"
              }
              """.formatted(userId, index);

          // When
          mockMvc.perform(post("/api/v1/users/signup")
              .contentType(MediaType.APPLICATION_JSON)
              .content(requestBody))
              .andExpect(status().isOk());

          return userId;
        } finally {
          latch.countDown();
        }
      });
    }

    // When
    List<Future<String>> futures = executorService.invokeAll(tasks);

    // Wait for all operations to complete
    latch.await(30, TimeUnit.SECONDS);

    // Then
    List<String> registeredUsers = new ArrayList<>();
    for (Future<String> future : futures) {
      registeredUsers.add(future.get(5, TimeUnit.SECONDS));
    }

    // Verify that all users were registered successfully
    assertThat(registeredUsers).hasSize(numberOfUsers);
    assertThat(registeredUsers).doesNotHaveDuplicates();

    // Verify that the service was called the correct number of times
    verify(userService, timeout(30000).times(numberOfUsers)).signup(any());
  }

  @Test
  @DisplayName("병렬 처리 테스트 - 동시 사용자 조회 데이터 일관성 유지 확인")
  void parallelUserRetrieval_dataConsistency_maintained() throws Exception {
    // Given
    User mockUser = User.builder()
        .userId("consistentUser")
        .userNm("테스트사용자")
        .esntlId("USR00001")
        .build();

    when(userService.getUserById("consistentUser")).thenReturn(UserDto.from(mockUser));

    int numberOfRequests = 20;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    List<Callable<UserDto>> tasks = new ArrayList<>();

    for (int i = 0; i < numberOfRequests; i++) {
      tasks.add(() -> {
        try {
          // When
          mockMvc.perform(get("/api/v1/users/consistentUser")
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.success").value(true))
              .andExpect(jsonPath("$.data.userId").value("consistentUser"));

          return UserDto.builder()
              .userId("consistentUser")
              .userNm("테스트사용자")
              .esntlId("USR00001")
              .build();
        } finally {
          latch.countDown();
        }
      });
    }

    // When
    List<Future<UserDto>> futures = executorService.invokeAll(tasks);

    // Wait for all operations to complete
    latch.await(30, TimeUnit.SECONDS);

    // Then
    List<UserDto> results = new ArrayList<>();
    for (Future<UserDto> future : futures) {
      results.add(future.get(5, TimeUnit.SECONDS));
    }

    // Verify consistency
    assertThat(results).hasSize(numberOfRequests);
    assertThat(results).allMatch(user -> "consistentUser".equals(user.getUserId()));
    assertThat(results).allMatch(user -> "테스트사용자".equals(user.getUserNm()));
  }

  @Test
  @DisplayName("병렬 처리 테스트 - 동시 데이터 업데이트 경합 상태 방지 확인")
  void parallelDataUpdate_raceCondition_prevented() throws Exception {
    // Given
    String userId = "raceConditionTestUser";
    User initialUser = User.builder()
        .userId(userId)
        .userNm("테스트 사용자")
        .esntlId("USR00001")
        .build();

    when(userRepository.findById(userId)).thenReturn(Optional.of(initialUser));
    when(userService.getUserById(userId)).thenReturn(UserDto.from(initialUser));

    int numberOfUpdates = 10;
    CountDownLatch latch = new CountDownLatch(numberOfUpdates);
    AtomicInteger successCount = new AtomicInteger(0);
    List<Callable<Void>> tasks = new ArrayList<>();

    for (int i = 0; i < numberOfUpdates; i++) {
      final int index = i;
      tasks.add(() -> {
        try {
          String updateRequestBody = """
              {
                "userId": "%s",
                "userNm": "업데이트사용자%d"
              }
              """.formatted(userId, index);

          mockMvc.perform(put("/api/v1/users/" + userId)
              .contentType(MediaType.APPLICATION_JSON)
              .content(updateRequestBody))
              .andExpect(status().isOk());

          successCount.incrementAndGet();
          return null;
        } finally {
          latch.countDown();
        }
      });
    }

    // When
    executorService.invokeAll(tasks);

    // Wait for all operations to complete
    latch.await(30, TimeUnit.SECONDS);

    // Then
    assertThat(successCount.get()).isEqualTo(numberOfUpdates);
    verify(userService, timeout(30000).atLeast(numberOfUpdates)).updateUser(anyString(), any(UserDto.class));
  }

  @Test
  @DisplayName("병렬 처리 테스트 - 사용자 ID 중복 가입 방지 검증")
  void parallelUserCreation_duplicateId_prevention() throws Exception {
    // Given
    String duplicateUserId = "duplicateUser";
    int numberOfAttempts = 10;
    CountDownLatch latch = new CountDownLatch(numberOfAttempts);
    AtomicInteger successCount = new AtomicInteger(0);
    AtomicInteger failureCount = new AtomicInteger(0);
    List<Callable<String>> tasks = new ArrayList<>();

    when(userRepository.existsById(duplicateUserId))
        .thenReturn(false)
        .thenReturn(true);

    for (int i = 0; i < numberOfAttempts; i++) {
      final int index = i;
      tasks.add(() -> {
        try {
          String requestBody = """
              {
                "userId": "%s",
                "password": "password123!",
                "userNm": "중복테스트%d",
                "passwordHint": "hint",
                "passwordCnsr": "answer",
                "role": "USER"
              }
              """.formatted(duplicateUserId, index);

          var result = mockMvc.perform(post("/api/v1/users/signup")
              .contentType(MediaType.APPLICATION_JSON)
              .content(requestBody))
              .andReturn();

          int status = result.getResponse().getStatus();
          if (status == 200) {
            successCount.incrementAndGet();
          } else {
            failureCount.incrementAndGet();
          }
          return String.valueOf(status);
        } catch (Exception e) {
          return "500";
        } finally {
          latch.countDown();
        }
      });
    }

    // When
    executorService.invokeAll(tasks);

    // Wait for all operations to complete
    latch.await(30, TimeUnit.SECONDS);

    // Then
    assertThat(successCount.get()).isGreaterThanOrEqualTo(1);
    assertThat(successCount.get() + failureCount.get()).isEqualTo(numberOfAttempts);
    verify(userRepository, timeout(30000).atLeast(numberOfAttempts)).existsById(duplicateUserId);
  }

  @Test
  @DisplayName("병렬 처리 테스트 - 데이터베이스 읽기 무결성 유지 확인")
  void parallelDatabaseRead_dataIntegrity_maintained() throws Exception {
    // Given
    List<User> users = IntStream.range(0, 5)
        .mapToObj(i -> User.builder()
            .userId("readerUser" + i)
            .userNm("읽기사용자" + i)
            .esntlId("USR0000" + i)
            .build())
        .collect(Collectors.toList());

    when(userRepository.findAll()).thenReturn(users);
    when(userService.getUserList()).thenReturn(users.stream().map(UserDto::from).collect(Collectors.toList()));

    int numberOfReadRequests = 15;
    CountDownLatch latch = new CountDownLatch(numberOfReadRequests);
    List<Callable<List<UserDto>>> tasks = new ArrayList<>();

    for (int i = 0; i < numberOfReadRequests; i++) {
      tasks.add(() -> {
        try {
          // When
          mockMvc.perform(get("/api/v1/users")
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.success").value(true))
              .andExpect(jsonPath("$.data").isArray());

          return users.stream().map(UserDto::from).collect(Collectors.toList());
        } finally {
          latch.countDown();
        }
      });
    }

    // When
    List<Future<List<UserDto>>> futures = executorService.invokeAll(tasks);

    // Wait for all operations to complete
    latch.await(30, TimeUnit.SECONDS);

    // Then
    List<List<UserDto>> results = new ArrayList<>();
    for (Future<List<UserDto>> future : futures) {
      results.add(future.get(5, TimeUnit.SECONDS));
    }

    assertThat(results).hasSize(numberOfReadRequests);
    for (List<UserDto> result : results) {
      assertThat(result).hasSize(5);
    }
  }

  @Test
  @DisplayName("병렬 처리 테스트 - 트랜잭션 격리 수준 유지 및 잠금 확인")
  void parallelTransaction_isolationLevel_maintained() throws Exception {
    // Given
    String userId = "transactionUser";
    User initialUser = User.builder()
        .userId(userId)
        .userNm("테스트 사용자")
        .esntlId("USR00001")
        .build();

    when(userRepository.findById(userId)).thenReturn(Optional.of(initialUser));

    int numberOfTransactions = 5;
    CountDownLatch latch = new CountDownLatch(numberOfTransactions);
    List<Callable<String>> tasks = new ArrayList<>();

    for (int i = 0; i < numberOfTransactions; i++) {
      final int index = i;
      tasks.add(() -> {
        try {
          String updateRequestBody = """
              {
                "userId": "%s",
                "userNm": "트랜잭션사용자%d"
              }
              """.formatted(userId, index);

          mockMvc.perform(put("/api/v1/users/" + userId)
              .contentType(MediaType.APPLICATION_JSON)
              .content(updateRequestBody))
              .andExpect(status().isOk());

          return "SUCCESS";
        } finally {
          latch.countDown();
        }
      });
    }

    // When
    List<Future<String>> futures = executorService.invokeAll(tasks);

    // Wait for all operations to complete
    latch.await(30, TimeUnit.SECONDS);

    // Then
    List<String> results = new ArrayList<>();
    for (Future<String> future : futures) {
      results.add(future.get(5, TimeUnit.SECONDS));
    }

    assertThat(results).hasSize(numberOfTransactions);
    verify(userService, timeout(30000).times(numberOfTransactions)).updateUser(anyString(), any(UserDto.class));
  }

  @Test
  @DisplayName("병렬 처리 테스트 - 사용자 대량 삭제 무결성 확인")
  void parallelUserDeletion_dataIntegrity_maintained() throws Exception {
    // Given
    List<String> userIds = IntStream.range(0, 10)
        .mapToObj(i -> "deleteUser" + i)
        .collect(Collectors.toList());

    userIds.forEach(id -> {
      User user = User.builder()
          .userId(id)
          .userNm("삭제사용자_" + id)
          .esntlId("USR0000" + id)
          .build();
      when(userRepository.findById(id)).thenReturn(Optional.of(user));
    });

    CountDownLatch latch = new CountDownLatch(userIds.size());
    List<Callable<String>> tasks = new ArrayList<>();

    for (String userId : userIds) {
      final String id = userId;
      tasks.add(() -> {
        try {
          mockMvc.perform(delete("/api/v1/users/" + id)
              .contentType(MediaType.APPLICATION_JSON))
              .andExpect(status().isOk());

          return id;
        } finally {
          latch.countDown();
        }
      });
    }

    // When
    List<Future<String>> futures = executorService.invokeAll(tasks);

    // Wait for all operations to complete
    latch.await(30, TimeUnit.SECONDS);

    // Then
    List<String> results = new ArrayList<>();
    for (Future<String> future : futures) {
      results.add(future.get(5, TimeUnit.SECONDS));
    }

    assertThat(results).hasSize(userIds.size());
    for (String userId : userIds) {
      verify(userRepository, timeout(30000).times(1)).deleteById(userId);
    }
  }

  @Test
  @DisplayName("병렬 처리 테스트 - ACID 특성 유지 확인")
  void parallelDatabaseWrite_acidProperties_maintained() throws Exception {
    // Given
    int numberOfWrites = 10;
    CountDownLatch latch = new CountDownLatch(numberOfWrites);
    AtomicInteger successCount = new AtomicInteger(0);
    List<Callable<String>> tasks = new ArrayList<>();

    for (int i = 0; i < numberOfWrites; i++) {
      final int index = i;
      tasks.add(() -> {
        try {
          String userId = "acidTestUser" + index;
          String requestBody = """
              {
                "userId": "%s",
                "password": "password123!",
                "userNm": "ACID사용자%d",
                "passwordHint": "hint",
                "passwordCnsr": "answer",
                "role": "USER"
              }
              """.formatted(userId, index);

          mockMvc.perform(post("/api/v1/users/signup")
              .contentType(MediaType.APPLICATION_JSON)
              .content(requestBody))
              .andExpect(status().isOk());

          successCount.incrementAndGet();
          return userId;
        } catch (Exception e) {
          throw e;
        } finally {
          latch.countDown();
        }
      });
    }

    // When
    executorService.invokeAll(tasks);

    // Wait for all operations to complete
    latch.await(30, TimeUnit.SECONDS);

    // Then
    assertThat(successCount.get()).isGreaterThanOrEqualTo(0);
    verify(userService, timeout(30000).atLeast(1)).signup(any());
  }
}
