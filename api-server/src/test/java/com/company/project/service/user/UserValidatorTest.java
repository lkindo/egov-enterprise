package com.company.project.service.user;

import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserValidatorTest {

    @Test
    @DisplayName("사용자 등록 요청 - null 값 입력 시 예외 발생")
    void validateUserSignupRequest_fail_withNullRequest() {
        assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User signup request cannot be null");
    }

    @Test
    @DisplayName("사용자 등록 요청 - 사용자 ID null 입력 시 예외 발생")
    void validateUserSignupRequest_fail_withNullUserId() {
        UserSignupRequest request = new UserSignupRequest(
                null,
                "password123!",
                "신규 사용자",
                com.company.project.domain.user.entity.Role.USER,
                "hint",
                "answer");

        assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User ID must be 4-20 alphanumeric characters");
    }

    @Test
    @DisplayName("사용자 등록 요청 - 비밀번호 형식이 잘못된 경우 예외 발생")
    void validateUserSignupRequest_fail_withInvalidPassword() {
        UserSignupRequest request = new UserSignupRequest(
                "validUserId",
                "short",
                "신규 사용자",
                com.company.project.domain.user.entity.Role.USER,
                "hint",
                "answer");

        assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Password must be at least 8 characters with letters, numbers, and special characters");
    }

    @Test
    @DisplayName("이메일 주소 검증 - 잘못된 이메일 형식 입력 시 예외 발생")
    void validateEmail_fail_withInvalidEmailFormat() {
        assertThatThrownBy(() -> UserValidator.validateEmail("invalid-email"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid email format");
    }

    @Test
    @DisplayName("이메일 주소 검증 - 올바른 이메일 형식")
    void validateEmail_success() {
        UserValidator.validateEmail("test@example.com");
    }
}
