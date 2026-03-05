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
 * 사용자 가입 및 정보 조회 통합 테스트
 * MinimalTestConfig를 통한 통합 테스트
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
                                "테스트사용자",
                                com.company.project.domain.user.entity.Role.USER,
                                "hint",
                                "answer");
        }

        @Test
        @DisplayName("사용자 테스트 - 회원가입 및 목록 조회")
        void userSignupAndRetrieval_integrationTest() {
                // Given
                long initialCount = userService.getUserList().size();

                // When - 사용자 가입
                UserResponse response = userService.signup(signupRequest);

                // Then - 가입 결과 확인
                assertThat(response).isNotNull();
                assertThat(response.userId()).isEqualTo("coreIntegrationUser");
                assertThat(response.userNm()).isEqualTo("테스트사용자");

                // When - 전체 사용자 목록 조회
                List<UserDto> userList = userService.getUserList();

                // Then - 가입된 회원 포함 여부 확인
                assertThat(userList.size()).isEqualTo(initialCount + 1);
                UserDto newUser = userList.stream()
                                .filter(u -> "coreIntegrationUser".equals(u.getUserId()))
                                .findFirst()
                                .orElse(null);
                assertThat(newUser).isNotNull();
                assertThat(newUser.getUserNm()).isEqualTo("테스트사용자");
        }

        @Test
        @DisplayName("사용자 테스트 - ID로 사용자 조회")
        void getUserById_integrationTest() {
                // Given
                userService.signup(signupRequest);

                // When
                UserDto retrievedUser = userService.getUserById("coreIntegrationUser");

                // Then
                assertThat(retrievedUser).isNotNull();
                assertThat(retrievedUser.getUserId()).isEqualTo("coreIntegrationUser");
                assertThat(retrievedUser.getUserNm()).isEqualTo("테스트사용자");
                assertThat(retrievedUser.getRole()).isEqualTo("USER");
        }

        @Test
        @DisplayName("사용자 테스트 - 중복 ID 가입 시 예외 발생")
        void duplicateUserSignup_integrationTest() {
                // Given
                userService.signup(signupRequest);

                // When & Then - 중복 ID로 가입 시도
                UserSignupRequest duplicateRequest = new UserSignupRequest(
                                "coreIntegrationUser",
                                "password456!",
                                "중복사용자",
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
        @DisplayName("사용자 테스트 - 다수 사용자 가입 및 목록 조회")
        void multipleUsers_signupAndListRetrieval_integrationTest() {
                // Given
                UserSignupRequest request1 = new UserSignupRequest(
                                "multiUser1",
                                "password123!",
                                "멀티 사용자1",
                                com.company.project.domain.user.entity.Role.USER,
                                "hint",
                                "answer");
                UserSignupRequest request2 = new UserSignupRequest(
                                "multiUser2",
                                "password123!",
                                "멀티 사용자2",
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
        }
}
