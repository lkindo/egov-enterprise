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
 * 핵심 기능 중심의 통합 테스트
 * MinimalTestConfig를 사용하여 필요한 컴포넌트만 로드
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
                                "핵심 통합 테스트 사용자",
                                com.company.project.domain.user.Role.USER,
                                "hint",
                                "answer");
        }

        @Test
        @DisplayName("사용자 서비스 - 사용자 등록 및 조회 통합 테스트")
        void userSignupAndRetrieval_integrationTest() {
                // Given
                long initialCount = userService.getUserList().size();

                // When - 사용자 등록
                UserResponse response = userService.signup(signupRequest);

                // Then - 등록 확인
                assertThat(response).isNotNull();
                assertThat(response.userId()).isEqualTo("coreIntegrationUser");
                assertThat(response.userNm()).isEqualTo("핵심 통합 테스트 사용자");

                // When - 사용자 목록 조회
                List<UserDto> userList = userService.getUserList();

                // Then - 목록에 새 사용자 포함 확인
                assertThat(userList.size()).isEqualTo(initialCount + 1);
                UserDto newUser = userList.stream()
                                .filter(u -> "coreIntegrationUser".equals(u.getUserId()))
                                .findFirst()
                                .orElse(null);
                assertThat(newUser).isNotNull();
                assertThat(newUser.getUserNm()).isEqualTo("핵심 통합 테스트 사용자");
        }

        @Test
        @DisplayName("사용자 서비스 - 등록된 사용자 상세 조회")
        void getUserById_integrationTest() {
                // Given
                userService.signup(signupRequest);

                // When
                UserDto retrievedUser = userService.getUserById("coreIntegrationUser");

                // Then
                assertThat(retrievedUser).isNotNull();
                assertThat(retrievedUser.getUserId()).isEqualTo("coreIntegrationUser");
                assertThat(retrievedUser.getUserNm()).isEqualTo("핵심 통합 테스트 사용자");
                assertThat(retrievedUser.getRole()).isEqualTo("USER");
        }

        @Test
        @DisplayName("사용자 서비스 - 중복 사용자 ID 등록 시 예외 발생")
        void duplicateUserSignup_integrationTest() {
                // Given
                userService.signup(signupRequest);

                // When & Then - 중복 ID로 다시 등록 시도
                UserSignupRequest duplicateRequest = new UserSignupRequest(
                                "coreIntegrationUser", // 동일한 ID
                                "password456!",
                                "중복 테스트 사용자",
                                com.company.project.domain.user.Role.USER,
                                "hint",
                                "answer");

                assertThat(org.junit.jupiter.api.Assertions.assertThrows(
                                com.company.project.core.exception.BusinessException.class,
                                () -> userService.signup(duplicateRequest)))
                                .hasFieldOrPropertyWithValue("errorCode",
                                                com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID);
        }

        @Test
        @DisplayName("사용자 서비스 - 여러 사용자 등록 후 목록 조회")
        void multipleUsers_signupAndListRetrieval_integrationTest() {
                // Given
                UserSignupRequest request1 = new UserSignupRequest(
                                "multiUser1",
                                "password123!",
                                "다중 사용자1",
                                com.company.project.domain.user.Role.USER,
                                "hint",
                                "answer");
                UserSignupRequest request2 = new UserSignupRequest(
                                "multiUser2",
                                "password123!",
                                "다중 사용자2",
                                com.company.project.domain.user.Role.ADMIN,
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
                                .contains("다중 사용자1", "다중 사용자2");
        }
}