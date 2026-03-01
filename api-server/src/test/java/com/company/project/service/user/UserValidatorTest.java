package com.company.project.service.user;

import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserValidatorTest {

    @Test
    @DisplayName("?¬ìš©???±ë¡ ?”ì²­ - null ê°??…ë ¥ ???ˆì™¸ ë°œìƒ")
    void validateUserSignupRequest_fail_withNullRequest() {
        assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User signup request cannot be null");
    }

    @Test
    @DisplayName("?¬ìš©???±ë¡ ?”ì²­ - ?¬ìš©??ID null ?…ë ¥ ???ˆì™¸ ë°œìƒ")
    void validateUserSignupRequest_fail_withNullUserId() {
        UserSignupRequest request = new UserSignupRequest(
                null,
                "password123!",
                "? ê·œ ?¬ìš©??,
                com.company.project.domain.user.entity.Role.USER,
                "hint",
                "answer");

        assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User ID must be 4-20 alphanumeric characters");
    }

    @Test
    @DisplayName("?¬ìš©???±ë¡ ?”ì²­ - ë¹„ë?ë²ˆí˜¸ ?•ì‹???˜ëª»??ê²½ìš° ?ˆì™¸ ë°œìƒ")
    void validateUserSignupRequest_fail_withInvalidPassword() {
        UserSignupRequest request = new UserSignupRequest(
                "validUserId",
                "short",
                "? ê·œ ?¬ìš©??,
                com.company.project.domain.user.entity.Role.USER,
                "hint",
                "answer");

        assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Password must be at least 8 characters with letters, numbers, and special characters");
    }

    @Test
    @DisplayName("?´ë©”??ì£¼ì†Œ ê²€ì¦?- ?˜ëª»???´ë©”???•ì‹ ?…ë ¥ ???ˆì™¸ ë°œìƒ")
    void validateEmail_fail_withInvalidEmailFormat() {
        assertThatThrownBy(() -> UserValidator.validateEmail("invalid-email"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid email format");
    }

    @Test
    @DisplayName("?´ë©”??ì£¼ì†Œ ê²€ì¦?- ?¬ë°”ë¥??´ë©”???•ì‹")
    void validateEmail_success() {
        UserValidator.validateEmail("test@example.com");
    }
}
