package com.company.project.integration;

import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = com.company.project.config.MinimalTestConfig.class)
@Transactional
@ActiveProfiles("test")
class UserServiceDatabaseIntegrationTest {

  @Autowired
  private UserService userService;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private UserAuthorityRepository userAuthorityRepository;

  private UserSignupRequest signupRequest;

  @BeforeEach
  void setUp() {
    signupRequest = new UserSignupRequest(
        "dbIntegrationUser",
        "password123!",
        "DB Integration User",
        Role.USER,
        "hint",
        "answer");
  }

  @Test
  @DisplayName("Signup - Persists to Database")
  void signup_persistsToDatabase() {
    // When
    userService.signup(signupRequest);

    // Then
    Optional<User> savedUser = userRepository.findById("dbIntegrationUser");
    assertThat(savedUser).isPresent();
    assertThat(savedUser.get().getUserNm()).isEqualTo("DB Integration User");
    assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);

    Optional<UserAuthority> savedAuthority = userAuthorityRepository.findById(savedUser.get().getEsntlId());
    assertThat(savedAuthority).isPresent();
    assertThat(savedAuthority.get().getAuthorCode()).isEqualTo("ROLE_USER");
  }

  @Test
  @DisplayName("Get User Info - Retrieves from Database")
  void getUserById_retrievesFromDatabase() {
    // Given
    userService.signup(signupRequest);

    // When
    UserDto retrievedUser = userService.getUserById("dbIntegrationUser");

    // Then
    assertThat(retrievedUser).isNotNull();
    assertThat(retrievedUser.getUserId()).isEqualTo("dbIntegrationUser");
    assertThat(retrievedUser.getUserNm()).isEqualTo("DB Integration User");

    Optional<User> dbUser = userRepository.findById("dbIntegrationUser");
    assertThat(dbUser).isPresent();
    assertThat(dbUser.get().getUserNm()).isEqualTo("DB Integration User");
  }

  @Test
  @DisplayName("Get User List - Retrieves from Database")
  void getUserList_retrievesFromDatabase() {
    // Given
    userService.signup(signupRequest);

    UserSignupRequest request2 = new UserSignupRequest(
        "dbIntegrationUser2",
        "password123!",
        "DB Integration User 2",
        Role.ADMIN,
        "hint",
        "answer");
    userService.signup(request2);

    // When
    List<UserDto> userList = userService.getUserList();

    // Then
    assertThat(userList).hasSize(2);
    assertThat(userList).extracting(UserDto::getUserId).containsExactlyInAnyOrder("dbIntegrationUser",
        "dbIntegrationUser2");

    List<User> dbUsers = userRepository.findAll();
    assertThat(dbUsers).hasSize(2);
  }

  @Test
  @DisplayName("Signup - Verify Persistence Integrity")
  void signup_verifyPersistence() {
    // Given
    long initialUserCount = userRepository.count();
    long initialAuthorityCount = userAuthorityRepository.count();

    // When
    userService.signup(signupRequest);

    // Then
    long currentUserCount = userRepository.count();
    long currentAuthorityCount = userAuthorityRepository.count();

    assertThat(currentUserCount).isEqualTo(initialUserCount + 1);
    assertThat(currentAuthorityCount).isEqualTo(initialAuthorityCount + 1);

    Optional<User> savedUser = userRepository.findById("dbIntegrationUser");
    assertThat(savedUser).isPresent();
    assertThat(savedUser.get().getUserId()).isEqualTo("dbIntegrationUser");

    Optional<UserAuthority> savedAuthority = userAuthorityRepository.findById(savedUser.get().getEsntlId());
    assertThat(savedAuthority).isPresent();
    assertThat(savedAuthority.get().getAuthorCode()).isEqualTo("ROLE_USER");
  }

  @Test
  @DisplayName("Update User - Reflects in Database")
  void updateUser_updatesDatabase() {
    // Given
    userService.signup(signupRequest);

    // When
    userService.registerUser(
        "dbIntegrationUser",
        "newPassword123!",
        "Updated Name",
        "newHint",
        "newAnswer",
        Role.ADMIN);

    // Then
    Optional<User> updatedUser = userRepository.findById("dbIntegrationUser");
    assertThat(updatedUser).isPresent();
    assertThat(updatedUser.get().getUserNm()).isEqualTo("Updated Name");
    assertThat(updatedUser.get().getRole()).isEqualTo(Role.ADMIN);

    UserDto serviceUser = userService.getUserById("dbIntegrationUser");
    assertThat(serviceUser).isNotNull();
    assertThat(serviceUser.getUserNm()).isEqualTo("Updated Name");
  }

  @Test
  @DisplayName("Delete User - Removes from Database")
  void deleteUser_removesFromDatabase() {
    // Given
    userService.signup(signupRequest);
    Optional<User> initialUser = userRepository.findById("dbIntegrationUser");
    assertThat(initialUser).isPresent();

    // When
    userRepository.deleteById("dbIntegrationUser");

    // Then
    Optional<User> deletedUser = userRepository.findById("dbIntegrationUser");
    assertThat(deletedUser).isEmpty();
  }

  @Test
  @DisplayName("Signup - Duplicate ID Violation")
  void signup_duplicateId_violatesDatabaseConstraint() {
    // Given
    userService.signup(signupRequest);

    // When & Then
    assertThat(org.junit.jupiter.api.Assertions.assertThrows(
        com.company.project.core.exception.BusinessException.class,
        () -> userService.signup(signupRequest)))
        .hasFieldOrPropertyWithValue("errorCode",
            com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID);
  }

  @Test
  @DisplayName("Signup - Auto Set Created Date")
  void signup_autoSetCreatedAt() {
    // When
    userService.signup(signupRequest);

    // Then
    Optional<User> savedUser = userRepository.findById("dbIntegrationUser");
    assertThat(savedUser).isPresent();
    assertThat(savedUser.get().getSbscrbDe()).isNotNull();
  }
}
