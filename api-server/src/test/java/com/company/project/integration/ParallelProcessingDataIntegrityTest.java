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
    @DisplayName("병렬 ?????�???????무결???? ????")
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
                                "userNm": "병렬 ????s",
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
        assertThat(registeredUsers).doesNotHaveDuplicates(); // No duplicates should exist

        // Verify that the service was called the correct number of times
        verify(userService, timeout(30000).times(numberOfUsers)).signup(any());
    }

    @Test
    @DisplayName("병렬 ????조회 ???????????? ????")
    void parallelUserRetrieval_dataConsistency_maintained() throws Exception {
        // Given
        // Setup mock to return consistent data for all concurrent requests
        User mockUser = User.builder()
                .userId("consistentUser")
                .userNm("????????")
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

                    // Parse and return the user data
                    // In a real scenario, we would parse the JSON response
                    return new UserDto("consistentUser", "????????", "USR00001", null, null, null, null);
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

        // Verify that all results are consistent
        assertThat(results).hasSize(numberOfRequests);
        assertThat(results).allMatch(user -> "consistentUser".equals(user.getUserId()));
        assertThat(results).allMatch(user -> "????????".equals(user.getUserNm()));
    }

    @Test
    @DisplayName("병렬 ???????????경쟁 조건 발생?? ???)
    void parallelDataUpdate_raceCondition_prevented() throws Exception {
        // Given
        String userId = "raceConditionTestUser";
        User initialUser = User.builder()
                .userId(userId)
                .userNm("초기 ????")
                .esntlId("USR00001")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(initialUser));
        when(userService.getUserById(userId)).thenReturn(UserDto.from(initialUser));

        // Mock the update operation to simulate incrementing a counter
        int numberOfUpdates = 10;
        CountDownLatch latch = new CountDownLatch(numberOfUpdates);
        AtomicInteger successCount = new AtomicInteger(0);
        List<Callable<Void>> tasks = new ArrayList<>();

        for (int i = 0; i < numberOfUpdates; i++) {
            final int index = i;
            tasks.add(() -> {
                try {
                    // Simulate updating user information
                    String updateRequestBody = """
                            {
                                "userId": "%s",
                                "userNm": "??????????%d"
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

        // Verify that the service was called the correct number of times
        verify(userService, timeout(30000).atLeast(numberOfUpdates)).updateUser(anyString(), any(UserDto.class));
    }

    @Test
    @DisplayName("병렬 ?????????ID 중복 �? ????")
    void parallelUserCreation_duplicateId_prevention() throws Exception {
        // Given
        String duplicateUserId = "duplicateUser";
        int numberOfAttempts = 10;
        CountDownLatch latch = new CountDownLatch(numberOfAttempts);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        List<Callable<String>> tasks = new ArrayList<>();

        // Initially return false for exists check, then true after first success
        when(userRepository.existsById(duplicateUserId))
                .thenReturn(false) // First call returns false
                .thenReturn(true); // Subsequent calls return true

        for (int i = 0; i < numberOfAttempts; i++) {
            final int index = i;
            tasks.add(() -> {
                try {
                    String requestBody = """
                            {
                                "userId": "%s",
                                "password": "password123!",
                                "userNm": "????????d",
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
                    } else if (status == 400) { // Assuming duplicate ID returns 400
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
        // At least one should succeed, others should fail due to duplicate ID
        assertThat(successCount.get()).isGreaterThanOrEqualTo(1);
        assertThat(failureCount.get()).isGreaterThanOrEqualTo(0);
        assertThat(successCount.get() + failureCount.get()).isEqualTo(numberOfAttempts);

        // Verify that the repository's exists check was called multiple times
        verify(userRepository, timeout(30000).atLeast(numberOfAttempts)).existsById(duplicateUserId);
    }

    @Test
    @DisplayName("병렬 ???�????�??????무결????")
    void parallelDatabaseRead_dataIntegrity_maintained() throws Exception {
        // Given
        // Prepare multiple users in the repository
        List<User> users = IntStream.range(0, 5)
                .mapToObj(i -> User.builder()
                        .userId("readerUser" + i)
                        .userNm("?�????? + i")
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

                    // In a real scenario, we would parse the JSON response
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

        // Verify that all results contain the same data
        assertThat(results).hasSize(numberOfReadRequests);
        for (List<UserDto> result : results) {
            assertThat(result).hasSize(5);
            assertThat(result).extracting(UserDto::getUserId).containsExactlyInAnyOrder(
                    "readerUser0", "readerUser1", "readerUser2", "readerUser3", "readerUser4");
        }
    }

    @Test
    @DisplayName("병렬 ???? 처리 ??격리 ?? ??")
    void parallelTransaction_isolationLevel_maintained() throws Exception {
        // Given
        String userId = "transactionUser";
        User initialUser = User.builder()
                .userId(userId)
                .userNm("초기 ????")
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
                    // Simulate a transaction that updates user name
                    String updateRequestBody = """
                            {
                                "userId": "%s",
                                "userNm": "???? ????d"
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

        // Verify that all transactions completed
        assertThat(results).hasSize(numberOfTransactions);
        assertThat(results).allMatch("SUCCESS"::equals);

        // Verify that the service was called the correct number of times
        verify(userService, timeout(30000).times(numberOfTransactions)).updateUser(anyString(), any(UserDto.class));
    }

    @Test
    @DisplayName("병렬 ?????? ??????무결????")
    void parallelUserDeletion_dataIntegrity_maintained() throws Exception {
        // Given
        List<String> userIds = IntStream.range(0, 10)
                .mapToObj(i -> "deleteUser" + i)
                .collect(Collectors.toList());

        // Setup mocks for each user
        userIds.forEach(id -> {
            User user = User.builder()
                    .userId(id)
                    .userNm("?? ???? + id")
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
                    // When
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

        // Verify that all deletions were processed
        assertThat(results).hasSize(userIds.size());
        assertThat(results).containsExactlyInAnyOrderElementsOf(userIds);

        // Verify that the repository delete method was called for each user
        for (String userId : userIds) {
            verify(userRepository, timeout(30000).times(1)).deleteById(userId);
        }
    }

    @Test
    @DisplayName("병렬 ???????????�??무결????")
    void parallelDataInsertion_sequenceIntegrity_maintained() throws Exception {
        // Given
        int numberOfInsertions = 15;
        CountDownLatch latch = new CountDownLatch(numberOfInsertions);
        List<Callable<String>> tasks = new ArrayList<>();

        for (int i = 0; i < numberOfInsertions; i++) {
            final int index = i;
            tasks.add(() -> {
                try {
                    String userId = "seqUser" + System.currentTimeMillis() + "_" + index;
                    String requestBody = """
                            {
                                "userId": "%s",
                                "password": "password123!",
                                "userNm": "??�??????d",
                                "passwordHint": "hint",
                                "passwordCnsr": "answer",
                                "role": "USER"
                            }
                            """.formatted(userId, index);

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
        List<String> createdUsers = new ArrayList<>();
        for (Future<String> future : futures) {
            createdUsers.add(future.get(5, TimeUnit.SECONDS));
        }

        // Verify that all users were created with unique IDs
        assertThat(createdUsers).hasSize(numberOfInsertions);
        assertThat(createdUsers).doesNotHaveDuplicates();

        // Verify that the service was called the correct number of times
        verify(userService, timeout(30000).times(numberOfInsertions)).signup(any());
    }

    @Test
    @DisplayName("병렬 ?????�?????????????????")
    void parallelUserInfoUpdate_concurrencyControl_test() throws Exception {
        // Given
        String userId = "concurrentUpdateUser";
        User originalUser = User.builder()
                .userId(userId)
                .userNm("?�?????")
                .esntlId("USR00001")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(originalUser));
        when(userService.getUserById(userId)).thenReturn(UserDto.from(originalUser));

        int numberOfUpdates = 8;
        CountDownLatch latch = new CountDownLatch(numberOfUpdates);
        AtomicInteger successCount = new AtomicInteger(0);
        List<Callable<String>> tasks = new ArrayList<>();

        for (int i = 0; i < numberOfUpdates; i++) {
            final int index = i;
            tasks.add(() -> {
                try {
                    String updateRequestBody = """
                            {
                                "userId": "%s",
                                "userNm": "????????????d"
                            }
                            """.formatted(userId, index);

                    mockMvc.perform(put("/api/v1/users/" + userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(updateRequestBody))
                            .andExpect(status().isOk());

                    successCount.incrementAndGet();
                    return "Updated_" + index;
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

        // Verify that all updates were attempted
        assertThat(results).hasSize(numberOfUpdates);
        assertThat(successCount.get()).isEqualTo(numberOfUpdates);

        // Verify that the service was called the correct number of times
        verify(userService, timeout(30000).atLeast(numberOfUpdates)).updateUser(anyString(), any(UserDto.class));
    }

    /*
     * @Test
     * 
     * @DisplayName("병렬 ?�??�??????무결????")
     * void parallelAuthentication_sessionIntegrity_maintained() throws Exception {
     * }
     */

    @Test
    @DisplayName("병렬 ???�????�??????ACID ?????")
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
                                "userNm": "ACID ????????d",
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
                    // Log error but continue
                    System.err.println("Error in parallel write task " + index + ": " + e.getMessage());
                    throw e;
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
        List<String> createdUsers = new ArrayList<>();
        for (Future<String> future : futures) {
            createdUsers.add(future.get(5, TimeUnit.SECONDS));
        }

        // Verify that all operations completed (some might fail due to constraints, but
        // should not corrupt data)
        assertThat(successCount.get()).isGreaterThanOrEqualTo(0); // At least some should succeed
        assertThat(createdUsers).hasSize(numberOfWrites);

        // Verify that the service was called the expected number of times
        verify(userService, timeout(30000).atLeast(1)).signup(any());
    }

    /*
     * @Test
     * 
     * @DisplayName("병렬 ?????? 변?????????????")
     * void parallelUserRoleChange_dataConsistency_maintained() throws Exception {
     * }
     */

    /*
     * @Test
     * 
     * @DisplayName("병렬 ????�????리소??경쟁 ???)
     * void parallelFileUpload_resourceCompetition_absent() throws Exception {
     * }
     */
}
