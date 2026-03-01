package com.company.project.integration;

import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ???�??? ?�??간의 ???????
 */
@SpringBootTest(classes = com.company.project.config.MinimalTestConfig.class)
@Transactional
@ActiveProfiles("test")
class DatabaseServiceIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    private UserSignupRequest signupRequest;

    @BeforeEach
    void setUp() {
        signupRequest = new UserSignupRequest(
                "dbIntegrationUser",
                "password123!",
                "DB ???????????",
                Role.USER,
                "hint",
                "answer");
    }

    @Test
    @DisplayName("?????�??- ?????�??????�???????????)
    void signup_persistsToDatabase() {
        // Given
        long initialCount = userRepository.count();

        // When
        UserResponse response = userService.signup(signupRequest);
        assertThat(response).isNotNull();
        assertThat(response.userId()).isEqualTo("dbIntegrationUser");

        // Then
        long finalCount = userRepository.count();
        assertThat(finalCount).isEqualTo(initialCount + 1);

        // Verify that user was actually persisted to database
        User savedUser = userRepository.findById("dbIntegrationUser")
                .orElseThrow(() -> new AssertionError("User was not saved to database"));
        assertThat(savedUser.getUserId()).isEqualTo("dbIntegrationUser");
        assertThat(savedUser.getUserNm()).isEqualTo("DB ???????????");
        assertThat(savedUser.getRole()).isEqualTo(Role.USER);
    }

    @Test
    @DisplayName("?????�??- ????조회 ?????�????????????가???)
    void getUserById_retrievesFromDatabase() {
        // Given
        userService.signup(signupRequest);

        // When
        UserDto retrievedUser = userService.getUserById("dbIntegrationUser");

        // Then
        // Verify that the service returned data from the database
        assertThat(retrievedUser).isNotNull();
        assertThat(retrievedUser.getUserId()).isEqualTo("dbIntegrationUser");
        assertThat(retrievedUser.getUserNm()).isEqualTo("DB ???????????");

        // Also verify directly from database
        User dbUser = userRepository.findById("dbIntegrationUser")
                .orElseThrow(() -> new AssertionError("User not found in database"));
        assertThat(dbUser.getUserNm()).isEqualTo("DB ???????????");
    }

    @Test
    @DisplayName("?????�??- ????목록 조회 ?????�????????????가???)
    void getUserList_retrievesFromDatabase() {
        // Given
        UserSignupRequest request1 = new UserSignupRequest(
                "listUser1",
                "password123!",
                "리스??????",
                Role.USER,
                "hint",
                "answer");
        UserSignupRequest request2 = new UserSignupRequest(
                "listUser2",
                "password123!",
                "리스??????",
                Role.ADMIN,
                "hint",
                "answer");

        userService.signup(request1);
        userService.signup(request2);

        // When
        List<UserDto> userList = userService.getUserList();

        // Then
        // Verify that the service returned data from the database
        assertThat(userList).hasSize(2);
        assertThat(userList).extracting(UserDto::getUserId).containsExactlyInAnyOrder("listUser1", "listUser2");
        assertThat(userList).extracting(UserDto::getUserNm).containsExactlyInAnyOrder("리스??????", "리스??????");

        // Also verify directly from database
        List<User> dbUsers = userRepository.findAll();
        assertThat(dbUsers).hasSize(2);
        assertThat(dbUsers).extracting(User::getUserId).containsExactlyInAnyOrder("listUser1", "listUser2");
        assertThat(dbUsers).extracting(User::getUserNm).containsExactlyInAnyOrder("리스??????", "리스??????");
    }

    @Test
    @DisplayName("?????�??- ??�징??????목록 조회 ?????�????????????가???)
    void getPagedUserList_retrievesFromDatabase() {
        // Given
        // Create multiple users for pagination test
        for (int i = 0; i < 15; i++) {
            UserSignupRequest request = new UserSignupRequest(
                    "pagedUser" + i,
                    "password123!",
                    "??????? + i",
                    Role.USER,
                    "hint",
                    "answer");
            userService.signup(request);
        }

        // When
        Page<UserDto> userPage = userService.getPagedUserList(PageRequest.of(0, 10));

        // Then
        // Verify that the service returned data from the database
        assertThat(userPage).isNotNull();
        assertThat(userPage.getContent()).hasSize(10);
        assertThat(userPage.getTotalElements()).isEqualTo(15);
        assertThat(userPage.getNumber()).isEqualTo(0);
        assertThat(userPage.isFirst()).isTrue();

        // Verify that the content matches database content
        List<User> dbUsers = userRepository.findAll(PageRequest.of(0, 10)).getContent();
        assertThat(userPage.getContent()).hasSize(dbUsers.size());
    }

    @Test
    @DisplayName("?????�??- ?????�??????�???????????)
    void signup_verifyPersistenceInDatabase() {
        // Given
        String userId = "persistenceTestUser";

        // When
        String returnedUserId = userService.registerUser(
                "persistenceTestUser",
                "password123!",
                "????????????",
                "hint",
                "answer",
                Role.USER);
        assertThat(returnedUserId).isEqualTo(userId);

        // Then
        // Verify that user exists in database
        assertThat(userRepository.existsById(userId)).isTrue();

        User user = userRepository.findById(userId).orElse(null);
        assertThat(user).isNotNull();
        assertThat(user.getUserId()).isEqualTo(userId);
        assertThat(user.getUserNm()).isEqualTo("????????????");
        assertThat(user.getRole()).isEqualTo(Role.USER);
    }

    @Test
    @DisplayName("?????�??- ?????�?????????�????반영??")
    void updateUser_updatesDatabase() {
        // Given
        UserSignupRequest request = new UserSignupRequest(
                "updateUser",
                "password123!",
                "?????????",
                Role.USER,
                "hint",
                "answer");
        userService.signup(request);

        // When
        UserDto updatedUserDto = new UserDto("updateUser", "?????????", "USR_TEST", "ADMIN", null, null, null);
        userService.updateUser("updateUser", updatedUserDto);

        // Then
        // Verify that the update was reflected in the database
        User updatedUser = userRepository.findById("updateUser")
                .orElseThrow(() -> new AssertionError("Updated user not found in database"));
        assertThat(updatedUser.getUserNm()).isEqualTo("?????????");
    }

    @Test
    @DisplayName("?????�??- ?????? ?????�?????????")
    void deleteUser_removesFromDatabase() {
        // Given
        userService.signup(signupRequest);
        assertThat(userRepository.existsById("dbIntegrationUser")).isTrue();

        // When
        userService.deleteUser("dbIntegrationUser");

        // Then
        // Verify that user was removed from database
        assertThat(userRepository.existsById("dbIntegrationUser")).isFalse();
        assertThat(userRepository.findById("dbIntegrationUser")).isEmpty();
    }

    @Test
    @DisplayName("?????�??- 중복 ????ID??�?????????�?????중복 ???)
    void signup_duplicateId_validationThroughDatabase() {
        // Given
        userService.signup(signupRequest);

        // When & Then - Second signup with same ID should fail
        UserSignupRequest duplicateRequest = new UserSignupRequest(
                "dbIntegrationUser", // Same ID as before
                "password456!",
                "중복 ????????",
                Role.USER,
                "hint",
                "answer");

        try {
            userService.signup(duplicateRequest);
            throw new AssertionError("Expected BusinessException for duplicate user ID");
        } catch (com.company.project.core.exception.BusinessException e) {
            assertThat(e.getErrorCode().name()).contains("DUPLICATE");
        }

        // Verify that only one user exists in database
        List<User> allUsers = userRepository.findAll();
        long dbIntegrationUsers = allUsers.stream()
                .filter(user -> "dbIntegrationUser".equals(user.getUserId()))
                .count();
        assertThat(dbIntegrationUsers).isEqualTo(1);
    }

    @Test
    @DisplayName("?????�??- ???? ????- ?????롤백 ???)
    void transaction_rollbackOnFailure() {
        // Given
        long initialCount = userRepository.count();

        // When - Attempt to create user with invalid data that causes service to fail
        UserSignupRequest invalidRequest = new UserSignupRequest(
                null, // Invalid: null user ID
                "password123!",
                "???? ????????",
                Role.USER,
                "hint",
                "answer");

        try {
            userService.signup(invalidRequest);
            throw new AssertionError("Expected validation exception");
        } catch (Exception e) {
            // Expected to fail
        }

        // Then - Verify that no user was added to database (transaction rolled back)
        long finalCount = userRepository.count();
        assertThat(finalCount).isEqualTo(initialCount);
    }

    @Test
    @DisplayName("?????�??- ????????�??????�?????????�?????)
    void multipleUsers_signup_consistentPersistence() {
        // Given
        int numberOfUsers = 5;
        long initialCount = userRepository.count();

        // When
        for (int i = 0; i < numberOfUsers; i++) {
            UserSignupRequest request = new UserSignupRequest(
                    "multiUser" + i,
                    "password123!",
                    "?�????? + i",
                    Role.USER,
                    "hint",
                    "answer");
            userService.signup(request);
        }

        // Then
        long finalCount = userRepository.count();
        assertThat(finalCount).isEqualTo(initialCount + numberOfUsers);

        // Verify that all users were saved correctly
        for (int i = 0; i < numberOfUsers; i++) {
            String userId = "multiUser" + i;
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new AssertionError("User " + userId + " not found in database"));
            assertThat(user.getUserNm()).isEqualTo("?�????? + i");
        }
    }

    @Test
    @DisplayName("?????�??- ???�?????직접 ?????????보�? ?�????????조회??")
    void databaseDirectUpdate_reflectedInService() {
        // Given
        userService.signup(signupRequest);
        User user = userRepository.findById("dbIntegrationUser")
                .orElseThrow(() -> new AssertionError("User not found in database"));

        // Direct database update (bypassing service)
        user.update("직접 ????????", "newHint", "newAnswer", null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, Role.ADMIN, null);
        userRepository.save(user);

        // When
        UserDto retrievedUser = userService.getUserById("dbIntegrationUser");

        // Then
        // Verify that the service returns the updated data from database
        assertThat(retrievedUser.getUserNm()).isEqualTo("직접 ????????");
        // Note: Role might not be directly mapped to the role field in UserDto
    }

    @Test
    @DisplayName("?????�??- ????????????조회 ???????")
    void getUserList_performanceWithLargeDataset() {
        // Given
        int datasetSize = 100;
        for (int i = 0; i < datasetSize; i++) {
            UserSignupRequest request = new UserSignupRequest(
                    "perfUser" + i,
                    "password123!",
                    "??????????? + i",
                    Role.USER,
                    "hint",
                    "answer");
            userService.signup(request);
        }

        // When
        long startTime = System.currentTimeMillis();
        List<UserDto> userList = userService.getUserList();
        long endTime = System.currentTimeMillis();

        // Then
        assertThat(userList).hasSize(datasetSize + 1); // +1 for the initial signupRequest user
        long executionTime = endTime - startTime;
        System.out.println("Retrieved " + userList.size() + " users in " + executionTime + " ms");

        // Performance should be reasonable (under 2 seconds for 100+ users)
        assertThat(executionTime).isLessThan(2000);
    }
}
