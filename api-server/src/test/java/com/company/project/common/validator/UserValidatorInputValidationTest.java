package com.company.project.common.validator;

import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserValidatorInputValidationTest {

        @Test
        @DisplayName("사용자 등록 요청 - null 값 입력 시 예외 발생")
        void validateUserSignupRequest_fail_withNullRequest() {
                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(null))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("User signup request cannot be null");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 사용자 ID null 입력 시 예외 발생")
        void validateUserSignupRequest_fail_withNullUserId() {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                null, // userId is null
                                "password123!",
                                "신규 사용자",
                                com.company.project.domain.user.Role.USER,
                                "hint",
                                "answer");

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("User ID cannot be null or empty");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 사용자 ID 빈 문자열 입력 시 예외 발생")
        void validateUserSignupRequest_fail_withEmptyUserId() {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "", // userId is empty
                                "password123!",
                                "신규 사용자",
                                com.company.project.domain.user.Role.USER,
                                "hint",
                                "answer");

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("User ID cannot be null or empty");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 사용자 ID 형식이 잘못된 경우 예외 발생")
        void validateUserSignupRequest_fail_withInvalidUserId() {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "invalid_user_id!", // Contains special characters
                                "password123!",
                                "신규 사용자",
                                com.company.project.domain.user.Role.USER,
                                "hint",
                                "answer");

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("User ID must be 4-20 alphanumeric characters");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 사용자 ID 길이가 너무 짧은 경우 예외 발생")
        void validateUserSignupRequest_fail_withShortUserId() {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "abc", // Less than 4 characters
                                "password123!",
                                "신규 사용자",
                                com.company.project.domain.user.Role.USER,
                                "hint",
                                "answer");

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("User ID must be 4-20 alphanumeric characters");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 사용자 ID 길이가 너무 긴 경우 예외 발생")
        void validateUserSignupRequest_fail_withLongUserId() {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "verylonguseridthatexceedstwentycharacters", // More than 20 characters
                                "password123!",
                                "신규 사용자",
                                com.company.project.domain.user.Role.USER,
                                "hint",
                                "answer");

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("User ID must be 4-20 alphanumeric characters");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 비밀번호가 null인 경우 예외 발생")
        void validateUserSignupRequest_fail_withNullPassword() {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "validUserId",
                                null, // password is null
                                "신규 사용자",
                                "hint",
                                "answer",
                                com.company.project.domain.user.Role.USER);

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Password must be at least 8 characters with letters, numbers, and special characters");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 비밀번호가 너무 짧은 경우 예외 발생")
        void validateUserSignupRequest_fail_withShortPassword() {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "validUserId",
                                "1234567", // Less than 8 characters
                                "신규 사용자",
                                "hint",
                                "answer",
                                com.company.project.domain.user.Role.USER);

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Password must be at least 8 characters with letters, numbers, and special characters");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 비밀번호에 특수문자가 없는 경우 예외 발생")
        void validateUserSignupRequest_fail_withPasswordWithoutSpecialChar() {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "validUserId",
                                "password123", // No special characters
                                "신규 사용자",
                                "hint",
                                "answer",
                                com.company.project.domain.user.Role.USER);

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Password must be at least 8 characters with letters, numbers, and special characters");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 비밀번호에 숫자가 없는 경우 예외 발생")
        void validateUserSignupRequest_fail_withPasswordWithoutNumber() {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "validUserId",
                                "password!", // No numbers
                                "신규 사용자",
                                "hint",
                                "answer",
                                com.company.project.domain.user.Role.USER);

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Password must be at least 8 characters with letters, numbers, and special characters");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 사용자 이름이 null인 경우 예외 발생")
        void validateUserSignupRequest_fail_withNullUserName() {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "validUserId",
                                "password123!",
                                null, // user name is null
                                "hint",
                                "answer",
                                com.company.project.domain.user.Role.USER);

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("User name cannot be null or empty");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 사용자 이름이 빈 문자열인 경우 예외 발생")
        void validateUserSignupRequest_fail_withEmptyUserName() {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "validUserId",
                                "password123!",
                                "", // user name is empty
                                "hint",
                                "answer",
                                com.company.project.domain.user.Role.USER);

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("User name cannot be null or empty");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 사용자 이름에 허용되지 않는 문자가 포함된 경우 예외 발생")
        void validateUserSignupRequest_fail_withInvalidUserNameChars() {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "validUserId",
                                "password123!",
                                "User@Name123", // Contains @ and numbers which are not allowed
                                "hint",
                                "answer",
                                com.company.project.domain.user.Role.USER);

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("User name contains invalid characters");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 비밀번호 힌트가 너무 긴 경우 예외 발생")
        void validateUserSignupRequest_fail_withLongPasswordHint() {
                // Given
                String longHint = "a".repeat(301); // More than 300 characters
                UserSignupRequest request = new UserSignupRequest(
                                "validUserId",
                                "password123!",
                                "신규 사용자",
                                longHint,
                                "answer",
                                com.company.project.domain.user.Role.USER);

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Password hint is too long");
        }

        @Test
        @DisplayName("사용자 등록 요청 - 비밀번호 답변이 너무 긴 경우 예외 발생")
        void validateUserSignupRequest_fail_withLongPasswordCnsr() {
                // Given
                String longCnsr = "a".repeat(301); // More than 300 characters
                UserSignupRequest request = new UserSignupRequest(
                                "validUserId",
                                "password123!",
                                "신규 사용자",
                                "hint",
                                longCnsr,
                                com.company.project.domain.user.Role.USER);

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateUserSignupRequest(request))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Password answer is too long");
        }

        @Test
        @DisplayName("이메일 주소 검증 - null 이메일 입력 시 예외 발생")
        void validateEmail_fail_withNullEmail() {
                // When & Then
                assertThatThrownBy(() -> UserValidator.validateEmail(null))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Invalid email format");
        }

        @Test
        @DisplayName("이메일 주소 검증 - 잘못된 이메일 형식 입력 시 예외 발생")
        void validateEmail_fail_withInvalidEmailFormat() {
                // Given
                String invalidEmail = "invalid-email";

                // When & Then
                assertThatThrownBy(() -> UserValidator.validateEmail(invalidEmail))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Invalid email format");
        }

        @Test
        @DisplayName("이메일 주소 검증 - 올바른 이메일 형식 입력 시 예외 발생하지 않음")
        void validateEmail_success_withValidEmailFormat() {
                // Given
                String validEmail = "test@example.com";

                // When & Then
                // Should not throw any exception
                UserValidator.validateEmail(validEmail);
        }
}