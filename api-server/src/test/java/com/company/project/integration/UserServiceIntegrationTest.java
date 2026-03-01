package com.company.project.integration;

import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
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
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(classes = com.company.project.config.MinimalTestConfig.class)
@Transactional
@ActiveProfiles("test")
class UserServiceIntegrationTest {

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
                "integrationTestUser",
                "password123!",
                "???????????",
                Role.USER,
                "hint",
                "answer");
    }

    @Test
    @DisplayName("?????Îπ??- ?????Î°????????Î≥? Í∂åÌïú ?Î≥¥Í? ?Íª?????)
    void signup_createsUserAndAuthority() {
        // When
        userService.signup(signupRequest);

        // Then
        // ?????Î≥¥Í? ?????îÏ? ???        Optional<User> savedUser = userRepository.findById("integrationTestUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUserNm()).isEqualTo("???????????");
        assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);

        // Í∂åÌïú ?Î≥¥Í? ?????îÏ? ???        Optional<UserAuthority> savedAuthority = userAuthorityRepository.findById(savedUser.get().getEsntlId());
        assertThat(savedAuthority).isPresent();
        assertThat(savedAuthority.get().getAuthorCode()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("?????Îπ??- ????Î™©Î°ù Ï°∞Ìöå ??Í∂åÌïú ?Î≥???Íª?Ï°∞Ìöå??")
    void getUserList_retrievesUsersWithAuthority() {
        // Given
        userService.signup(signupRequest);

        // When
        List<UserDto> userList = userService.getUserList();

        // Then
        assertThat(userList).isNotEmpty();
        UserDto user = userList.get(0);
        assertThat(user.getUserId()).isEqualTo("integrationTestUser");
        assertThat(user.getUserNm()).isEqualTo("???????????");
        // Í∂åÌïú ?Î≥¥Í? ???????îÏ? ???(Í∂åÌïú ÏΩîÎìúÍ∞Ä UserAuthority???Í∞Ä???Í≤ÉÏù∏ÏßÄ ???
    }

    @Test
    @DisplayName("?????Îπ??- ?????Î°???Î∞îÎ°ú Ï°∞Ìöå Í∞Ä??")
    void signup_thenGetUserById_success() {
        // Given
        UserResponse signupResponse = userService.signup(signupRequest);

        // When
        UserDto retrievedUser = userService.getUserById(signupResponse.userId());

        // Then
        assertThat(retrievedUser).isNotNull();
        assertThat(retrievedUser.getUserId()).isEqualTo("integrationTestUser");
        assertThat(retrievedUser.getUserNm()).isEqualTo("???????????");
    }

    @Test
    @DisplayName("?????Îπ??- ????????Î°???Î™©Î°ù Ï°∞Ìöå")
    void multipleUsers_signup_thenGetList_success() {
        // Given
        UserSignupRequest request1 = new UserSignupRequest(
                "user1",
                "password123!",
                "????",
                Role.USER,
                "hint",
                "answer");
        UserSignupRequest request2 = new UserSignupRequest(
                "user2",
                "password123!",
                "????",
                Role.ADMIN,
                "hint",
                "answer");

        // When
        userService.signup(request1);
        userService.signup(request2);
        List<UserDto> userList = userService.getUserList();

        // Then
        assertThat(userList).hasSize(2);
        assertThat(userList).extracting(UserDto::getUserId).containsExactlyInAnyOrder("user1", "user2");
        assertThat(userList).extracting(UserDto::getUserNm).containsExactlyInAnyOrder("????", "????");
    }

    @Test
    @DisplayName("?????Îπ??- ?????Î°??????Î≤???????????)
    void signup_persistsToDatabase() {
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

        // ???????????        Optional<User> savedUser = userRepository.findById("integrationTestUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUserId()).isEqualTo("integrationTestUser");
        assertThat(savedUser.get().getUserNm()).isEqualTo("???????????");
        assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);
    }

    @Test
    @DisplayName("?????Îπ??- ????ID????Ï°∞Ìöå ?Í≥?)
    void getUserById_success_withValidId() {
        // Given
        userService.signup(signupRequest);

        // When
        UserDto result = userService.getUserById("integrationTestUser");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo("integrationTestUser");
        assertThat(result.getUserNm()).isEqualTo("???????????");
    }

    @Test
    @DisplayName("?????Îπ??- Ï°¥Ïû¨?? ???????ID?Ï°∞Ìöå ?????Î∞úÏÉù")
    void getUserById_fail_withNonExistentId() {
        // When & Then
        assertThatThrownBy(() -> userService.getUserById("nonexistent"))
                .isInstanceOf(com.company.project.core.exception.BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", com.company.project.core.exception.ErrorCode.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("?????Îπ??- ?????Î°???Ï§ëÎ≥µ ID???????Î∞úÏÉù")
    void signup_fail_withDuplicateId() {
        // Given
        userService.signup(signupRequest);

        // When & Then
        assertThatThrownBy(() -> userService.signup(signupRequest))
                .isInstanceOf(com.company.project.core.exception.BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode",
                        com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID);
    }

    @Test
    @DisplayName("?????Îπ??- ?????Î≥?????Í≥?)
    void updateUser_success() {
        // Given
        userService.signup(signupRequest);
        UserDto updatedUserDto = new UserDto("integrationTestUser", "????????", "USR_TEST", "ADMIN", null, null, null);

        // When
        userService.updateUser("integrationTestUser", updatedUserDto);

        // Then
        UserDto result = userService.getUserById("integrationTestUser");
        assertThat(result.getUserNm()).isEqualTo("????????");
    }

    @Test
    @DisplayName("?????Îπ??- Îπ?Î≤àÌò∏ Î≥Ä??Í≥?)
    void changePassword_success() {
        // Given
        userService.signup(signupRequest);

        // When & Then
        // Îπ?Î≤àÌò∏ Î≥ÄÍ≤ΩÏù¥ ?Í≥???????îÏ? ???        assertThatNoException()
                .isThrownBy(() -> userService.changePassword("integrationTestUser", "password123!", "newPassword123!"));
    }

    @Test
    @DisplayName("?????Îπ??- ?Î™?????Îπ?Î≤àÌò∏?Î≥Ä??????Î∞úÏÉù")
    void changePassword_fail_withWrongOldPassword() {
        // Given
        userService.signup(signupRequest);

        // When & Then
        assertThatThrownBy(() -> userService.changePassword("integrationTestUser", "wrongPassword", "newPassword123!"))
                .isInstanceOf(com.company.project.core.exception.BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode",
                        com.company.project.core.exception.ErrorCode.INVALID_PASSWORD);
    }

    @Test
    @DisplayName("?????Îπ??- ??¥Ïßï??????Î™©Î°ù Ï°∞Ìöå ?Í≥?)
    void getPagedUserList_success() {
        // Given
        for (int i = 0; i < 15; i++) {
            UserSignupRequest request = new UserSignupRequest(
                    "pagedUser" + i,
                    "password123!",
                    "??????????? + i",
                    Role.USER,
                    "hint",
                    "answer");
            userService.signup(request);
        }

        // When
        Pageable pageable = PageRequest.of(0, 10);
        Page<UserDto> result = userService.getPagedUserList(pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(10);
        assertThat(result.getTotalElements()).isEqualTo(15);
        assertThat(result.getNumber()).isEqualTo(0);
        assertThat(result.isFirst()).isTrue();
    }
}
