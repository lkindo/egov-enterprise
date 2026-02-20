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
                "DB ?합 ?스???용??",
                Role.USER,
                "hint",
                "answer");
    }

    @Test
    @DisplayName("?용???비??- ?용???록 ???이?베?스???제 ??됨")
    void signup_persistsToDatabase() {
        // When
        userService.signup(signupRequest);

        // Then
        // ?용???이블에 ??되?는지 ?인
        Optional<User> savedUser = userRepository.findById("dbIntegrationUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUserNm()).isEqualTo("DB ?합 ?스???용??");
        assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);

        // 권한 ?이블에 ??되?는지 ?인
        Optional<UserAuthority> savedAuthority = userAuthorityRepository.findById(savedUser.get().getEsntlId());
        assertThat(savedAuthority).isPresent();
        assertThat(savedAuthority.get().getAuthorCode()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("?용???비??- ?용??조회 ???이?베?스?서 ?제 ?이??가?옴")
    void getUserById_retrievesFromDatabase() {
        // Given
        userService.signup(signupRequest);

        // When
        UserDto retrievedUser = userService.getUserById("dbIntegrationUser");

        // Then
        assertThat(retrievedUser).isNotNull();
        assertThat(retrievedUser.getUserId()).isEqualTo("dbIntegrationUser");
        assertThat(retrievedUser.getUserNm()).isEqualTo("DB ?합 ?스???용??");

        // ?이?베?스?서 직접 ?인
        Optional<User> dbUser = userRepository.findById("dbIntegrationUser");
        assertThat(dbUser).isPresent();
        assertThat(dbUser.get().getUserNm()).isEqualTo("DB ?합 ?스???용??");
    }

    @Test
    @DisplayName("?용???비??- ?용??목록 조회 ???이?베?스?서 ?제 ?이??가?옴")
    void getUserList_retrievesFromDatabase() {
        // Given
        userService.signup(signupRequest);

        UserSignupRequest request2 = new UserSignupRequest(
                "dbIntegrationUser2",
                "password123!",
                "DB ?합 ?스???용??",
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
        assertThat(userList).extracting(UserDto::getUserNm).containsExactlyInAnyOrder("DB ?합 ?스???용??",
                "DB ?합 ?스???용??");

        // ?이?베?스?서 직접 ?인
        List<User> dbUsers = userRepository.findAll();
        assertThat(dbUsers).hasSize(2);
        assertThat(dbUsers).extracting(User::getUserNm).containsExactlyInAnyOrder("DB ?합 ?스???용??", "DB ?합 ?스???용??");
    }

    @Test
    @DisplayName("?용???비??- ?용???록 ???이?베?스???속???인")
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

        // ??된 ?이?의 무결???인
        Optional<User> savedUser = userRepository.findById("dbIntegrationUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUserId()).isEqualTo("dbIntegrationUser");
        assertThat(savedUser.get().getUserNm()).isEqualTo("DB ?합 ?스???용??");
        assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);

        Optional<UserAuthority> savedAuthority = userAuthorityRepository.findById(savedUser.get().getEsntlId());
        assertThat(savedAuthority).isPresent();
        assertThat(savedAuthority.get().getUniqId()).isEqualTo(savedUser.get().getEsntlId());
        assertThat(savedAuthority.get().getAuthorCode()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("?용???비??- ?용???보 ?정 ???이?베?스??반영??")
    void updateUser_updatesDatabase() {
        // Given
        userService.signup(signupRequest);

        // When
        userService.registerUser(
                "updatedUser",
                "newPassword123!",
                "?정???용??",
                "newHint",
                "newAnswer",
                Role.ADMIN);

        // Then
        Optional<User> updatedUser = userRepository.findById("updatedUser");
        assertThat(updatedUser).isPresent();
        assertThat(updatedUser.get().getUserNm()).isEqualTo("?정???용??");
        assertThat(updatedUser.get().getRole()).isEqualTo(Role.ADMIN);

        // ?비??계층???해 조회?도 ?일??결과 ?인
        UserDto serviceUser = userService.getUserById("updatedUser");
        assertThat(serviceUser).isNotNull();
        assertThat(serviceUser.getUserNm()).isEqualTo("?정???용??");
        assertThat(serviceUser.getRole()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("?용???비??- ?용???? ???이?베?스?서 ????")
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

        // ?비??계층???해 조회?도 존재?? ?음???인
        UserDto serviceUser = userService.getUserById("dbIntegrationUser");
        assertThat(serviceUser).isNull();
    }

    @Test
    @DisplayName("?용???비??- 중복 ?용??ID??록 ???이?베?스 ?약 조건 ?반")
    void signup_duplicateId_violatesDatabaseConstraint() {
        // Given
        userService.signup(signupRequest);

        // When & Then
        assertThat(org.junit.jupiter.api.Assertions.assertThrows(
                com.company.project.core.exception.BusinessException.class,
                () -> userService.signup(signupRequest)))
                .hasFieldOrPropertyWithValue("errorCode",
                        com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID);

        // ?이?베?스??중복 ?이?? ?입?? ?았?? ?인
        List<User> allUsers = userRepository.findAll();
        assertThat(allUsers).hasSize(1);
        assertThat(allUsers.get(0).getUserId()).isEqualTo("dbIntegrationUser");
    }

    @Test
    @DisplayName("?용???비??- ?용???록 ???성?자 ?동 ?정 ?인")
    void signup_autoSetCreatedAt() {
        // When
        userService.signup(signupRequest);

        // Then
        Optional<User> savedUser = userRepository.findById("dbIntegrationUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getSbscrbDe()).isNotNull(); // 가?일???인
    }

    @Test
    @DisplayName("?용???비??- ?러 ?용???록 ???이?베?스??모두 ??됨")
    void signup_multipleUsers_allPersisted() {
        // Given
        UserSignupRequest request1 = new UserSignupRequest(
                "multiUser1",
                "password123!",
                "?중 ?용??",
                Role.USER,
                "hint",
                "answer");
        UserSignupRequest request2 = new UserSignupRequest(
                "multiUser2",
                "password123!",
                "?중 ?용??",
                Role.ADMIN,
                "hint",
                "answer");
        UserSignupRequest request3 = new UserSignupRequest(
                "multiUser3",
                "password123!",
                "?중 ?용??",
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
        assertThat(allUsers).extracting(User::getUserNm).containsExactlyInAnyOrder("?중 ?용??", "?중 ?용??", "?중 ?용??");

        // ??용?의 권한 ?보???인
        for (User user : allUsers) {
            Optional<UserAuthority> authority = userAuthorityRepository.findById(user.getEsntlId());
            assertThat(authority).isPresent();
        }
    }

    @Test
    @DisplayName("?용???비??- ?이?베?스 ?랜?? ?스??")
    void signup_transactionRollbackOnFailure() {
        // Given
        long initialCount = userRepository.count();

        try {
            // When - ?????패 ?도
            userService.signup(signupRequest);

            // 중복??ID??시 ?도?여 ?패 ?도
            userService.signup(signupRequest);
        } catch (Exception e) {
            // ?외 발생? ?상???작
        }

        // Then - ?랜????롤백?어 초기 ?태? 같아????
        long finalCount = userRepository.count();
        assertThat(finalCount).isEqualTo(initialCount + 1); // ?번째???공?으므?1 증?
    }
}
