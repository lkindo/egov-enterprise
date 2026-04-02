package com.company.project.foundation.service.user;

import com.company.project.foundation.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * UserValidator ê¸°ëŠ¥ ë°??œì•½ ì¡°ê±´ ?ŒìŠ¤??
 */
class UserValidatorTest {

  @Test
  @DisplayName("?Œì›ê°€???”ì²­ ê²€ì¦?- null ?”ì²­??ê²½ìš° ?ˆì™¸ ë°œìƒ")
  void validateUserSignupRequest_fail_withNullRequest() {
    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(null))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User signup request cannot be null");
  }

  @Test
  @DisplayName("?Œì›ê°€???”ì²­ ê²€ì¦?- ?¬ìš©??ID ?„ë½ ?ëŠ” ?•ì‹ ?„ë°˜ ???ˆì™¸ ë°œìƒ")
  void validateUserSignupRequest_fail_withNullUserId() {
    UserSignupRequest request = new UserSignupRequest(
        null,
        "password123!",
        "?ŒìŠ¤?¸ì‚¬?©ì",
        com.company.project.foundation.domain.user.entity.Role.USER,
        "hint",
        "answer");

    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("User ID must be 4-20 alphanumeric characters");
  }

  @Test
  @DisplayName("?Œì›ê°€???”ì²­ ê²€ì¦?- ë¹„ë?ë²ˆí˜¸ ë³µì¡???„ë°˜ ???ˆì™¸ ë°œìƒ")
  void validateUserSignupRequest_fail_withInvalidPassword() {
    UserSignupRequest request = new UserSignupRequest(
        "validUserId",
        "short",
        "?ŒìŠ¤?¸ì‚¬?©ì",
        com.company.project.foundation.domain.user.entity.Role.USER,
        "hint",
        "answer");

    assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Password must be at least 8 characters with letters, numbers, and special characters");
  }

  @Test
  @DisplayName("?´ë©”???•ì‹ ê²€ì¦?- ?˜ëª»???•ì‹???´ë©”?¼ì¸ ê²½ìš° ?ˆì™¸ ë°œìƒ")
  void validateEmail_fail_withInvalidEmailFormat() {
    assertThatThrownBy(() -> UserValidator.validateEmail("invalid-email"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Invalid email format");
  }

  @Test
  @DisplayName("?´ë©”???•ì‹ ê²€ì¦?- ? íš¨???´ë©”???•ì‹??ê²½ìš° ?µê³¼")
  void validateEmail_success() {
    UserValidator.validateEmail("test@example.com");
  }
}
