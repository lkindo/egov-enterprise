package nuri.foundation.service.user;

import nuri.foundation.domain.user.entity.Role;
import nuri.foundation.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * UserValidator 기능 및 제약 조건 테스트
 */
@DisplayName("UserValidator (사용자 검증기) 테스트")
class UserValidatorTest {

  @Test
  @DisplayName("회원가입 요청 검증 - null 요청인 경우 예외 발생")
  void validateUserSignupRequest_fail_withNullRequest() {
    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(null))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User signup request cannot be null");
  }

  @Test
  @DisplayName("회원가입 요청 검증 - 사용자 ID 누락 또는 형식 위반 시 예외 발생")
  void validateUserSignupRequest_fail_withNullUserId() {
    UserSignupRequest request = new UserSignupRequest(
        null,
        "password123!",
        "테스트사용자",
        Role.USER,
        "hint",
        "answer");

    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User ID must be 4-20 alphanumeric characters");
  }

  @Test
  @DisplayName("회원가입 요청 검증 - 비밀번호 복잡성 위반 시 예외 발생")
  void validateUserSignupRequest_fail_withInvalidPassword() {
    UserSignupRequest request = new UserSignupRequest(
        "validUserId",
        "short",
        "테스트사용자",
        Role.USER,
        "hint",
        "answer");

    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Password must be at least 8 characters with letters, numbers, and special characters");
  }

  @Test
  @DisplayName("이메일 형식 검증 - 잘못된 형식의 이메일인 경우 예외 발생")
  void validateEmail_fail_withInvalidEmailFormat() {
    assertThatThrownBy(() -> UserValidator.validateEmail("invalid-email"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Invalid email format");
  }

  @Test
  @DisplayName("이메일 형식 검증 - 유효한 이메일 형식인 경우 통과")
  void validateEmail_success() {
    UserValidator.validateEmail("test@example.com");
  }
}
