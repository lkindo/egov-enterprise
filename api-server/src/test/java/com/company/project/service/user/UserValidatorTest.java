package com.company.project.service.user;

import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserValidatorTest {

    @Test
    @DisplayName("?�용???�록 ?�청 - null �??�력 ???�외 발생")
    void validateUserSignupRequest_fail_withNullRequest() {
        assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User signup request cannot be null");
    }

    @Test
    @DisplayName("?�용???�록 ?�청 - ?�용??ID null ?�력 ???�외 발생")
    void validateUserSignupRequest_fail_withNullUserId() {
        UserSignupRequest request = new UserSignupRequest(
                null,
                "password123!",
                "?�규 ?�용??,
                com.company.project.domain.user.entity.Role.USER,
                "hint",
                "answer");

        assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User ID must be 4-20 alphanumeric characters");
    }

    @Test
    @DisplayName("?�용???�록 ?�청 - 비�?번호 ?�식???�못??경우 ?�외 발생")
    void validateUserSignupRequest_fail_withInvalidPassword() {
        UserSignupRequest request = new UserSignupRequest(
                "validUserId",
                "short",
                "?�규 ?�용??,
                com.company.project.domain.user.entity.Role.USER,
                "hint",
                "answer");

        assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Password must be at least 8 characters with letters, numbers, and special characters");
    }

    @Test
    @DisplayName("?�메??주소 검�?- ?�못???�메???�식 ?�력 ???�외 발생")
    void validateEmail_fail_withInvalidEmailFormat() {
        assertThatThrownBy(() -> UserValidator.validateEmail("invalid-email"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid email format");
    }

    @Test
    @DisplayName("?�메??주소 검�?- ?�바�??�메???�식")
    void validateEmail_success() {
        UserValidator.validateEmail("test@example.com");
    }
}
