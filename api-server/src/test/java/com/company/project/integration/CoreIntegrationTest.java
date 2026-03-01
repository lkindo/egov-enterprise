package com.company.project.integration;

import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ?µÏã¨ Í∏∞Îä• Ï§ëÏã¨???µÌï© ?åÏä§?? * MinimalTestConfigÎ•??¨Ïö©?òÏó¨ ?ÑÏöî??Ïª¥Ìè¨?åÌä∏Îß?Î°úÎìú
 */
@SpringBootTest(classes = com.company.project.config.MinimalTestConfig.class, properties = {
                "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
})
@Transactional
@ActiveProfiles("test")
class CoreIntegrationTest {

        @Autowired
        private UserService userService;

        private UserSignupRequest signupRequest;

        @BeforeEach
        void setUp() {
                signupRequest = new UserSignupRequest(
                                "coreIntegrationUser",
                                "password123!",
                                "?µÏã¨ ?µÌï© ?åÏä§???¨Ïö©??,
                                com.company.project.domain.user.entity.Role.USER,
                                "hint",
                                "answer");
        }

        @Test
        @DisplayName("?¨Ïö©???úÎπÑ??- ?¨Ïö©???±Î°ù Î∞?Ï°∞Ìöå ?µÌï© ?åÏä§??)
        void userSignupAndRetrieval_integrationTest() {
                // Given
                long initialCount = userService.getUserList().size();

                // When - ?¨Ïö©???±Î°ù
                UserResponse response = userService.signup(signupRequest);

                // Then - ?±Î°ù ?ïÏù∏
                assertThat(response).isNotNull();
                assertThat(response.userId()).isEqualTo("coreIntegrationUser");
                assertThat(response.userNm()).isEqualTo("?µÏã¨ ?µÌï© ?åÏä§???¨Ïö©??);

                // When - ?¨Ïö©??Î™©Î°ù Ï°∞Ìöå
                List<UserDto> userList = userService.getUserList();

                // Then - Î™©Î°ù?????¨Ïö©???¨Ìï® ?ïÏù∏
                assertThat(userList.size()).isEqualTo(initialCount + 1);
                UserDto newUser = userList.stream()
                                .filter(u -> "coreIntegrationUser".equals(u.getUserId()))
                                .findFirst()
                                .orElse(null);
                assertThat(newUser).isNotNull();
                assertThat(newUser.getUserNm()).isEqualTo("?µÏã¨ ?µÌï© ?åÏä§???¨Ïö©??);
        }

        @Test
        @DisplayName("?¨Ïö©???úÎπÑ??- ?±Î°ù???¨Ïö©???ÅÏÑ∏ Ï°∞Ìöå")
        void getUserById_integrationTest() {
                // Given
                userService.signup(signupRequest);

                // When
                UserDto retrievedUser = userService.getUserById("coreIntegrationUser");

                // Then
                assertThat(retrievedUser).isNotNull();
                assertThat(retrievedUser.getUserId()).isEqualTo("coreIntegrationUser");
                assertThat(retrievedUser.getUserNm()).isEqualTo("?µÏã¨ ?µÌï© ?åÏä§???¨Ïö©??);
                assertThat(retrievedUser.getRole()).isEqualTo("USER");
        }

        @Test
        @DisplayName("?¨Ïö©???úÎπÑ??- Ï§ëÎ≥µ ?¨Ïö©??ID ?±Î°ù ???àÏô∏ Î∞úÏÉù")
        void duplicateUserSignup_integrationTest() {
                // Given
                userService.signup(signupRequest);

                // When & Then - Ï§ëÎ≥µ IDÎ°??§Ïãú ?±Î°ù ?úÎèÑ
                UserSignupRequest duplicateRequest = new UserSignupRequest(
                                "coreIntegrationUser", // ?ôÏùº??ID
                                "password456!",
                                "Ï§ëÎ≥µ ?åÏä§???¨Ïö©??,
                                com.company.project.domain.user.entity.Role.USER,
                                "hint",
                                "answer");

                assertThat(org.junit.jupiter.api.Assertions.assertThrows(
                                com.company.project.core.exception.BusinessException.class,
                                () -> userService.signup(duplicateRequest)))
                                .hasFieldOrPropertyWithValue("errorCode",
                                                com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID);
        }

        @Test
        @DisplayName("?¨Ïö©???úÎπÑ??- ?¨Îü¨ ?¨Ïö©???±Î°ù ??Î™©Î°ù Ï°∞Ìöå")
        void multipleUsers_signupAndListRetrieval_integrationTest() {
                // Given
                UserSignupRequest request1 = new UserSignupRequest(
                                "multiUser1",
                                "password123!",
                                "?§Ï§ë ?¨Ïö©??",
                                com.company.project.domain.user.entity.Role.USER,
                                "hint",
                                "answer");
                UserSignupRequest request2 = new UserSignupRequest(
                                "multiUser2",
                                "password123!",
                                "?§Ï§ë ?¨Ïö©??",
                                com.company.project.domain.user.entity.Role.ADMIN,
                                "hint",
                                "answer");

                // When
                userService.signup(request1);
                userService.signup(request2);
                List<UserDto> userList = userService.getUserList();

                // Then
                assertThat(userList).hasSizeGreaterThanOrEqualTo(2);
                assertThat(userList).extracting(UserDto::getUserId)
                                .contains("multiUser1", "multiUser2");
                assertThat(userList).extracting(UserDto::getUserNm)
                                .contains("?§Ï§ë ?¨Ïö©??", "?§Ï§ë ?¨Ïö©??");
        }
}
