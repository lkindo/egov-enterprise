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
 * ?�심 기능 중심???�합 ?�스?? * MinimalTestConfig�??�용?�여 ?�요??컴포?�트�?로드
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
                                "?�심 ?�합 ?�스???�용??,
                                com.company.project.domain.user.entity.Role.USER,
                                "hint",
                                "answer");
        }

        @Test
        @DisplayName("?�용???�비??- ?�용???�록 �?조회 ?�합 ?�스??)
        void userSignupAndRetrieval_integrationTest() {
                // Given
                long initialCount = userService.getUserList().size();

                // When - ?�용???�록
                UserResponse response = userService.signup(signupRequest);

                // Then - ?�록 ?�인
                assertThat(response).isNotNull();
                assertThat(response.userId()).isEqualTo("coreIntegrationUser");
                assertThat(response.userNm()).isEqualTo("?�심 ?�합 ?�스???�용??);

                // When - ?�용??목록 조회
                List<UserDto> userList = userService.getUserList();

                // Then - 목록?????�용???�함 ?�인
                assertThat(userList.size()).isEqualTo(initialCount + 1);
                UserDto newUser = userList.stream()
                                .filter(u -> "coreIntegrationUser".equals(u.getUserId()))
                                .findFirst()
                                .orElse(null);
                assertThat(newUser).isNotNull();
                assertThat(newUser.getUserNm()).isEqualTo("?�심 ?�합 ?�스???�용??);
        }

        @Test
        @DisplayName("?�용???�비??- ?�록???�용???�세 조회")
        void getUserById_integrationTest() {
                // Given
                userService.signup(signupRequest);

                // When
                UserDto retrievedUser = userService.getUserById("coreIntegrationUser");

                // Then
                assertThat(retrievedUser).isNotNull();
                assertThat(retrievedUser.getUserId()).isEqualTo("coreIntegrationUser");
                assertThat(retrievedUser.getUserNm()).isEqualTo("?�심 ?�합 ?�스???�용??);
                assertThat(retrievedUser.getRole()).isEqualTo("USER");
        }

        @Test
        @DisplayName("?�용???�비??- 중복 ?�용??ID ?�록 ???�외 발생")
        void duplicateUserSignup_integrationTest() {
                // Given
                userService.signup(signupRequest);

                // When & Then - 중복 ID�??�시 ?�록 ?�도
                UserSignupRequest duplicateRequest = new UserSignupRequest(
                                "coreIntegrationUser", // ?�일??ID
                                "password456!",
                                "중복 ?�스???�용??,
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
        @DisplayName("?�용???�비??- ?�러 ?�용???�록 ??목록 조회")
        void multipleUsers_signupAndListRetrieval_integrationTest() {
                // Given
                UserSignupRequest request1 = new UserSignupRequest(
                                "multiUser1",
                                "password123!",
                                "?�중 ?�용??",
                                com.company.project.domain.user.entity.Role.USER,
                                "hint",
                                "answer");
                UserSignupRequest request2 = new UserSignupRequest(
                                "multiUser2",
                                "password123!",
                                "?�중 ?�용??",
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
                                .contains("?�중 ?�용??", "?�중 ?�용??");
        }
}
