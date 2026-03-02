package com.company.project.service.user;

import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserValidatorTest {

  @Test
  @DisplayName("사용자가입회원- null 테스트 사용자꾩룇裕뉑틦?)")
  void validateUserSignupRequest_fail_withNullRequest() {
    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(null))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User signup request cannot be null");
  }

  @Test
  @DisplayName("사용자가입회원- 사용자ID null 테스트 사용자꾩룇裕뉑틦?)")
  void validateUserSignupRequest_fail_withNullUserId() {
    UserSignupRequest request = new UserSignupRequest(
        null,
        "password123!",
        "성공사용자",
        com.company.project.domain.user.entity.Role.USER,
        "hint",
        "answer");

    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User ID must be 4-20 alphanumeric characters");
  }

  @Test
  @DisplayName("사용자가입회원- ??비밀번호사용자테스트 경로사용자꾩룇裕뉑틦?)")
  void validateUserSignupRequest_fail_withInvalidPassword() {
    UserSignupRequest request = new UserSignupRequest(
        "validUserId",
        "short",
        "성공사용자",
        com.company.project.domain.user.entity.Role.USER,
        "hint",
        "answer");

    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Password must be at least 8 characters with letters, numbers, and special characters");
  }

  @Test
  @DisplayName("실패??낅슣???검증?- 테스트 실패사용자꾩룇裕뉑틦?)")
  void validateEmail_fail_withInvalidEmailFormat() {
    assertThatThrownBy(() -> UserValidator.validateEmail("invalid-email"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Invalid email format");
  }

  @Test
  @DisplayName("실패??낅슣???검증?- 테스트 실패?)")
  void validateEmail_success() {
    UserValidator.validateEmail("test@example.com");
  }
}
