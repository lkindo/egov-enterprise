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
                "?µí•© ?ŒìŠ¤???¬ìš©??,
                Role.USER,
                "hint",
                "answer");
    }

    @Test
    @DisplayName("?¬ìš©???œë¹„??- ?¬ìš©???±ë¡ ???¬ìš©???•ë³´?€ ê¶Œí•œ ?•ë³´ê°€ ?¨ê»˜ ?€?¥ë¨")
    void signup_createsUserAndAuthority() {
        // When
        userService.signup(signupRequest);

        // Then
        // ?¬ìš©???•ë³´ê°€ ?€?¥ë˜?ˆëŠ”ì§€ ?•ì¸
        Optional<User> savedUser = userRepository.findById("integrationTestUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUserNm()).isEqualTo("?µí•© ?ŒìŠ¤???¬ìš©??);
        assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);

        // ê¶Œí•œ ?•ë³´ê°€ ?€?¥ë˜?ˆëŠ”ì§€ ?•ì¸
        Optional<UserAuthority> savedAuthority = userAuthorityRepository.findById(savedUser.get().getEsntlId());
        assertThat(savedAuthority).isPresent();
        assertThat(savedAuthority.get().getAuthorCode()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("?¬ìš©???œë¹„??- ?¬ìš©??ëª©ë¡ ì¡°íšŒ ??ê¶Œí•œ ?•ë³´???¨ê»˜ ì¡°íšŒ??)
    void getUserList_retrievesUsersWithAuthority() {
        // Given
        userService.signup(signupRequest);

        // When
        List<UserDto> userList = userService.getUserList();

        // Then
        assertThat(userList).isNotEmpty();
        UserDto user = userList.get(0);
        assertThat(user.getUserId()).isEqualTo("integrationTestUser");
        assertThat(user.getUserNm()).isEqualTo("?µí•© ?ŒìŠ¤???¬ìš©??);
        // ê¶Œí•œ ?•ë³´ê°€ ?¬í•¨?˜ì–´ ?ˆëŠ”ì§€ ?•ì¸ (ê¶Œí•œ ì½”ë“œê°€ UserAuthority?ì„œ ê°€?¸ì˜¨ ê²ƒì¸ì§€ ?•ì¸)
    }

    @Test
    @DisplayName("?¬ìš©???œë¹„??- ?¬ìš©???±ë¡ ??ë°”ë¡œ ì¡°íšŒ ê°€??)
    void signup_thenGetUserById_success() {
        // Given
        UserResponse signupResponse = userService.signup(signupRequest);

        // When
        UserDto retrievedUser = userService.getUserById(signupResponse.userId());

        // Then
        assertThat(retrievedUser).isNotNull();
        assertThat(retrievedUser.getUserId()).isEqualTo("integrationTestUser");
        assertThat(retrievedUser.getUserNm()).isEqualTo("?µí•© ?ŒìŠ¤???¬ìš©??);
    }

    @Test
    @DisplayName("?¬ìš©???œë¹„??- ?¬ëŸ¬ ?¬ìš©???±ë¡ ??ëª©ë¡ ì¡°íšŒ")
    void multipleUsers_signup_thenGetList_success() {
        // Given
        UserSignupRequest request1 = new UserSignupRequest(
                "user1",
                "password123!",
                "?¬ìš©??",
                Role.USER,
                "hint",
                "answer");
        UserSignupRequest request2 = new UserSignupRequest(
                "user2",
                "password123!",
                "?¬ìš©??",
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
        assertThat(userList).extracting(UserDto::getUserNm).containsExactlyInAnyOrder("?¬ìš©??", "?¬ìš©??");
    }

    @Test
    @DisplayName("?¬ìš©???œë¹„??- ?¬ìš©???±ë¡ ???°ì´?°ë² ?´ìŠ¤???¤ì œ ?€?¥ë¨")
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

        // ?€?¥ëœ ?¬ìš©???•ì¸
        Optional<User> savedUser = userRepository.findById("integrationTestUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUserId()).isEqualTo("integrationTestUser");
        assertThat(savedUser.get().getUserNm()).isEqualTo("?µí•© ?ŒìŠ¤???¬ìš©??);
        assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);
    }

    @Test
    @DisplayName("?¬ìš©???œë¹„??- ?¬ìš©??IDë¡??ì„¸ ì¡°íšŒ ?±ê³µ")
    void getUserById_success_withValidId() {
        // Given
        userService.signup(signupRequest);

        // When
        UserDto result = userService.getUserById("integrationTestUser");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo("integrationTestUser");
        assertThat(result.getUserNm()).isEqualTo("?µí•© ?ŒìŠ¤???¬ìš©??);
    }

    @Test
    @DisplayName("?¬ìš©???œë¹„??- ì¡´ì¬?˜ì? ?ŠëŠ” ?¬ìš©??IDë¡?ì¡°íšŒ ???ˆì™¸ ë°œìƒ")
    void getUserById_fail_withNonExistentId() {
        // When & Then
        assertThatThrownBy(() -> userService.getUserById("nonexistent"))
                .isInstanceOf(com.company.project.core.exception.BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", com.company.project.core.exception.ErrorCode.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("?¬ìš©???œë¹„??- ?¬ìš©???±ë¡ ??ì¤‘ë³µ IDë¡??¸í•œ ?ˆì™¸ ë°œìƒ")
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
    @DisplayName("?¬ìš©???œë¹„??- ?¬ìš©???•ë³´ ?˜ì • ?±ê³µ")
    void updateUser_success() {
        // Given
        userService.signup(signupRequest);
        UserDto updatedUserDto = new UserDto("integrationTestUser", "?˜ì •???¬ìš©??, "USR_TEST", "ADMIN", null, null, null);

        // When
        userService.updateUser("integrationTestUser", updatedUserDto);

        // Then
        UserDto result = userService.getUserById("integrationTestUser");
        assertThat(result.getUserNm()).isEqualTo("?˜ì •???¬ìš©??);
    }

    @Test
    @DisplayName("?¬ìš©???œë¹„??- ë¹„ë?ë²ˆí˜¸ ë³€ê²??±ê³µ")
    void changePassword_success() {
        // Given
        userService.signup(signupRequest);

        // When & Then
        // ë¹„ë?ë²ˆí˜¸ ë³€ê²½ì´ ?±ê³µ?ìœ¼ë¡??˜í–‰?˜ëŠ”ì§€ ?•ì¸
        assertThatNoException()
                .isThrownBy(() -> userService.changePassword("integrationTestUser", "password123!", "newPassword123!"));
    }

    @Test
    @DisplayName("?¬ìš©???œë¹„??- ?˜ëª»???´ì „ ë¹„ë?ë²ˆí˜¸ë¡?ë³€ê²????ˆì™¸ ë°œìƒ")
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
    @DisplayName("?¬ìš©???œë¹„??- ?˜ì´ì§•ëœ ?¬ìš©??ëª©ë¡ ì¡°íšŒ ?±ê³µ")
    void getPagedUserList_success() {
        // Given
        for (int i = 0; i < 15; i++) {
            UserSignupRequest request = new UserSignupRequest(
                    "pagedUser" + i,
                    "password123!",
                    "?˜ì´ì§??ŒìŠ¤???¬ìš©?? + i,
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
