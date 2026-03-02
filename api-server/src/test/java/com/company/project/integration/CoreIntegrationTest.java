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
 * 사용자リ옇???繞벿살탳????이후  사용자 * MinimalTestConfig를 통한 통합 테스트
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
                "사용자이후  사용자",
                com.company.project.domain.user.entity.Role.USER,
                "hint",
                "answer");
    }

    @Test
    @DisplayName("사용자테스트 - 사용자가입???브퀗????이후  사용자)")
    void userSignupAndRetrieval_integrationTest() {
        // Given
        long initialCount = userService.getUserList().size();

        // When - 사용자가입
        UserResponse response = userService.signup(signupRequest);

        // Then - 가입회원
        assertThat(response).isNotNull();
        assertThat(response.userId()).isEqualTo("coreIntegrationUser");
        assertThat(response.userNm()).isEqualTo("사용자이후  사용자");

        // When - 사용자嶺뚮ㅄ維뽨빳??브퀗???
        List<UserDto> userList = userService.getUserList();

        // Then - 嶺뚮ㅄ維뽨빳????인증회원
        assertThat(userList.size()).isEqualTo(initialCount + 1);
        UserDto newUser = userList.stream()
                .filter(u -> "coreIntegrationUser".equals(u.getUserId()))
                .findFirst()
                .orElse(null);
        assertThat(newUser).isNotNull();
        assertThat(newUser.getUserNm()).isEqualTo("사용자이후  사용자");
    }

    @Test
    @DisplayName("사용자테스트 - 가입사용자브퀗???)")
    void getUserById_integrationTest() {
        // Given
        userService.signup(signupRequest);

        // When
        UserDto retrievedUser = userService.getUserById("coreIntegrationUser");

        // Then
        assertThat(retrievedUser).isNotNull();
        assertThat(retrievedUser.getUserId()).isEqualTo("coreIntegrationUser");
        assertThat(retrievedUser.getUserNm()).isEqualTo("사용자이후  사용자");
        assertThat(retrievedUser.getRole()).isEqualTo("USER");
    }

    @Test
    @DisplayName("사용자 테스트 - 중복 ID 가입시 예외)")
    void duplicateUserSignup_integrationTest() {
        // Given
        userService.signup(signupRequest);

        // When & Then - 중복 ID로 가입 시도
        UserSignupRequest duplicateRequest = new UserSignupRequest(
                "coreIntegrationUser", // 사용자ID
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
    @DisplayName("사용자테스트 - 테스트사용자가입??嶺뚮ㅄ維뽨빳??브퀗???)")
    void multipleUsers_signupAndListRetrieval_integrationTest() {
        // Given
        UserSignupRequest request1 = new UserSignupRequest(
                "multiUser1",
                "password123!",
                "멀티 사용자",
                com.company.project.domain.user.entity.Role.USER,
                "hint",
                "answer");
        UserSignupRequest request2 = new UserSignupRequest(
                "multiUser2",
                "password123!",
                "멀티 사용자",
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
                .contains("멀티 사용자", "멀티 사용자");
    }
}
