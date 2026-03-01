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
                "DB ???????????",
                Role.USER,
                "hint",
                "answer");
    }

    @Test
    @DisplayName("?????�??- ?????�??????�???????????)
    void signup_persistsToDatabase() {
        // When
        userService.signup(signupRequest);

        // Then
        // ??????�블???????��? ???        Optional<User> savedUser = userRepository.findById("dbIntegrationUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUserNm()).isEqualTo("DB ???????????");
        assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);

        // 권한 ??�블???????��? ???        Optional<UserAuthority> savedAuthority = userAuthorityRepository.findById(savedUser.get().getEsntlId());
        assertThat(savedAuthority).isPresent();
        assertThat(savedAuthority.get().getAuthorCode()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("?????�??- ????조회 ?????�????????????가???)
    void getUserById_retrievesFromDatabase() {
        // Given
        userService.signup(signupRequest);

        // When
        UserDto retrievedUser = userService.getUserById("dbIntegrationUser");

        // Then
        assertThat(retrievedUser).isNotNull();
        assertThat(retrievedUser.getUserId()).isEqualTo("dbIntegrationUser");
        assertThat(retrievedUser.getUserNm()).isEqualTo("DB ???????????");

        // ???�?????직접 ???        Optional<User> dbUser = userRepository.findById("dbIntegrationUser");
        assertThat(dbUser).isPresent();
        assertThat(dbUser.get().getUserNm()).isEqualTo("DB ???????????");
    }

    @Test
    @DisplayName("?????�??- ????목록 조회 ?????�????????????가???)
    void getUserList_retrievesFromDatabase() {
        // Given
        userService.signup(signupRequest);

        UserSignupRequest request2 = new UserSignupRequest(
                "dbIntegrationUser2",
                "password123!",
                "DB ???????????",
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
        assertThat(userList).extracting(UserDto::getUserNm).containsExactlyInAnyOrder("DB ???????????",
                "DB ???????????");

        // ???�?????직접 ???        List<User> dbUsers = userRepository.findAll();
        assertThat(dbUsers).hasSize(2);
        assertThat(dbUsers).extracting(User::getUserNm).containsExactlyInAnyOrder("DB ???????????", "DB ???????????");
    }

    @Test
    @DisplayName("?????�??- ?????�??????�???????????)
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

        // ?????????무결?????        Optional<User> savedUser = userRepository.findById("dbIntegrationUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUserId()).isEqualTo("dbIntegrationUser");
        assertThat(savedUser.get().getUserNm()).isEqualTo("DB ???????????");
        assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);

        Optional<UserAuthority> savedAuthority = userAuthorityRepository.findById(savedUser.get().getEsntlId());
        assertThat(savedAuthority).isPresent();
        assertThat(savedAuthority.get().getUniqId()).isEqualTo(savedUser.get().getEsntlId());
        assertThat(savedAuthority.get().getAuthorCode()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("?????�??- ?????�?????????�????반영??")
    void updateUser_updatesDatabase() {
        // Given
        userService.signup(signupRequest);

        // When
        userService.registerUser(
                "updatedUser",
                "newPassword123!",
                "????????",
                "newHint",
                "newAnswer",
                Role.ADMIN);

        // Then
        Optional<User> updatedUser = userRepository.findById("updatedUser");
        assertThat(updatedUser).isPresent();
        assertThat(updatedUser.get().getUserNm()).isEqualTo("????????");
        assertThat(updatedUser.get().getRole()).isEqualTo(Role.ADMIN);

        // ?�??계층?????조회???????결과 ???        UserDto serviceUser = userService.getUserById("updatedUser");
        assertThat(serviceUser).isNotNull();
        assertThat(serviceUser.getUserNm()).isEqualTo("????????");
        assertThat(serviceUser.getRole()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("?????�??- ?????? ?????�?????????")
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

        // ?�??계층?????조회???존재?? ???????        UserDto serviceUser = userService.getUserById("dbIntegrationUser");
        assertThat(serviceUser).isNull();
    }

    @Test
    @DisplayName("?????�??- 중복 ????ID??�??????�??????조건 ?�?)
    void signup_duplicateId_violatesDatabaseConstraint() {
        // Given
        userService.signup(signupRequest);

        // When & Then
        assertThat(org.junit.jupiter.api.Assertions.assertThrows(
                com.company.project.core.exception.BusinessException.class,
                () -> userService.signup(signupRequest)))
                .hasFieldOrPropertyWithValue("errorCode",
                        com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID);

        // ???�????중복 ???? ???? ???? ???        List<User> allUsers = userRepository.findAll();
        assertThat(allUsers).hasSize(1);
        assertThat(allUsers.get(0).getUserId()).isEqualTo("dbIntegrationUser");
    }

    @Test
    @DisplayName("?????�??- ?????�?????????????????)
    void signup_autoSetCreatedAt() {
        // When
        userService.signup(signupRequest);

        // Then
        Optional<User> savedUser = userRepository.findById("dbIntegrationUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getSbscrbDe()).isNotNull(); // 가???????    
                    }

    @Test
    @DisplayName("?????�??- ????????�??????�????모두 ????)
    void signup_multipleUsers_allPersisted() {
        // Given
        UserSignupRequest request1 = new UserSignupRequest(
                "multiUser1",
                "password123!",
                "?�?????",
                Role.USER,
                "hint",
                "answer");
        UserSignupRequest request2 = new UserSignupRequest(
                "multiUser2",
                "password123!",
                "?�?????",
                Role.ADMIN,
                "hint",
                "answer");
        UserSignupRequest request3 = new UserSignupRequest(
                "multiUser3",
                "password123!",
                "?�?????",
                Role.USER,
                "hint",
                "answer");

        // When
        userService.signup(request1);
        userService.signup(request2);
        userService.signup(request3);

        // Then
        List<User> allUsers = userRepository.findAll();
        assertThat(allUsers).hasSize(3);
        assertThat(allUsers).extracting(User::getUserId).containsExactlyInAnyOrder("multiUser1", "multiUser2",
                "multiUser3");
        assertThat(allUsers).extracting(User::getUserNm).containsExactlyInAnyOrder("?�?????", "?�?????", "?�?????");

        // ??????권한 ?�?????        for (User user : allUsers) {
            Optional<UserAuthority> authority = userAuthorityRepository.findById(user.getEsntlId());
            assertThat(authority).isPresent();
        }
    }

    @Test
    @DisplayName("?????�??- ???�??????? ????")
    void signup_transactionRollbackOnFailure() {
        // Given
        long initialCount = userRepository.count();

        try {
            // When - ??????????            userService.signup(signupRequest);

            // 중복??ID???????????????            userService.signup(signupRequest);
        } catch (Exception e) {
            // ???발생? ???????        
                    }

        // Then - ??????롤백???초기 ??? 같아????
        long finalCount = userRepository.count();
        assertThat(finalCount).isEqualTo(initialCount + 1); // ?번째???�??��??1 �?
    }
}
