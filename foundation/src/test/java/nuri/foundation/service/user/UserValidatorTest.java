package nuri.foundation.service.user;

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
    UserSignupRequest request = UserSignupRequest.builder()
        .userId(null)
        .password("password123!")
        .userNm("테스트사용자")
        .role("USER")
        .passwordHint("hint")
        .passwordCnsr("answer")
        .build();

    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User ID must be 4-20 alphanumeric characters");
  }

  @Test
  @DisplayName("회원가입 요청 검증 - 비밀번호 복잡성 위반 시 예외 발생")
  void validateUserSignupRequest_fail_withInvalidPassword() {
    UserSignupRequest request = UserSignupRequest.builder()
        .userId("validUserId")
        .password("short")
        .userNm("테스트사용자")
        .role("USER")
        .passwordHint("hint")
        .passwordCnsr("answer")
        .build();

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

  @Test
  @DisplayName("이메일 형식 검증 - null 또는 빈 문자열")
  void validateEmail_fail_empty() {
    assertThatThrownBy(() -> UserValidator.validateEmail(null))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> UserValidator.validateEmail(""))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  @DisplayName("회원가입 요청 검증 - 이름 누락 시 예외 발생")
  void validateUserSignupRequest_fail_withNullUserNm() {
    UserSignupRequest request = UserSignupRequest.builder()
        .userId("validUserId")
        .password("password123!")
        .userNm(null)
        .build();
    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User name cannot be null or empty");
  }

  @Test
  @DisplayName("회원가입 요청 검증 - 잘못된 이름 형식 시 예외 발생")
  void validateUserSignupRequest_fail_withInvalidUserNm() {
    UserSignupRequest request = UserSignupRequest.builder()
        .userId("validUserId")
        .password("password123!")
        .userNm("a") // 너무 짧음
        .build();
    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User name contains invalid characters");
  }

  @Test
  @DisplayName("회원가입 요청 검증 - 비밀번호 힌트/정답 길이 초과 시 예외 발생")
  void validateUserSignupRequest_fail_withLongHintOrAnswer() {
    String longString = "a".repeat(301);
    
    UserSignupRequest request1 = UserSignupRequest.builder()
        .userId("validUserId")
        .password("password123!")
        .userNm("홍길동")
        .passwordHint(longString)
        .build();
    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request1))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Password hint is too long");

    UserSignupRequest request2 = UserSignupRequest.builder()
        .userId("validUserId")
        .password("password123!")
        .userNm("홍길동")
        .passwordHint("hint")
        .passwordCnsr(longString)
        .build();
    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request2))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Password answer is too long");
  }

  @Test
  @DisplayName("회원가입 요청 검증 - 성공")
  void validateUserSignupRequest_success() {
    UserSignupRequest request = UserSignupRequest.builder()
        .userId("validUserId")
        .password("password123!")
        .userNm("홍길동")
        .build();
    UserValidator.validateUserSignupRequest(request);
  }

  @Test
  @DisplayName("사용자 검증 - 예외 발생 조건들")
  void validateUser_failures() {
    assertThatThrownBy(() -> UserValidator.validateUser(null))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User cannot be null");

    assertThatThrownBy(() -> UserValidator.validateUser(nuri.foundation.domain.user.entity.User.builder().userId("").esntlId("").userNm("홍길동").password("1234").build()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User ID cannot be null or empty");

    assertThatThrownBy(() -> UserValidator.validateUser(nuri.foundation.domain.user.entity.User.builder().userId("a").esntlId("esntl1").userNm("홍길동").password("1234").build()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User ID must be 4-20 alphanumeric characters");

    assertThatThrownBy(() -> UserValidator.validateUser(nuri.foundation.domain.user.entity.User.builder().userId("user1").esntlId("esntl1").userNm("").password("1234").build()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User name cannot be null or empty");

    assertThatThrownBy(() -> UserValidator.validateUser(nuri.foundation.domain.user.entity.User.builder().userId("user1").esntlId("esntl1").userNm("a").password("1234").build()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User name contains invalid characters");

    assertThatThrownBy(() -> UserValidator.validateUser(nuri.foundation.domain.user.entity.User.builder().userId("user1").esntlId("esntl1").userNm("홍길동").password("1234").emailAdres("invalid").build()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Invalid email format");
  }

  @Test
  @DisplayName("사용자 검증 - 성공")
  void validateUser_success() {
    nuri.foundation.domain.user.entity.User user = nuri.foundation.domain.user.entity.User.builder()
        .userId("user1")
        .esntlId("esntl1")
        .userNm("홍길동")
        .password("1234")
        .emailAdres("test@example.com")
        .build();
    UserValidator.validateUser(user);
  }
}
