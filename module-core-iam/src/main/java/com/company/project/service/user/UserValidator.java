package com.company.project.service.user;

import com.company.project.domain.user.entity.User;
import com.company.project.service.user.dto.UserSignupRequest;
import org.springframework.lang.NonNull;
import org.springframework.util.StringUtils;

import java.util.regex.Pattern;

/**
 * 사용자 관련 입력 검증 유틸리티 클래스
 */
public class UserValidator {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");
    private static final Pattern PASSWORD_PATTERN = Pattern
            .compile("^(?=.*[a-zA-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$");
    private static final Pattern USER_ID_PATTERN = Pattern.compile("^[a-zA-Z0-9]{4,20}$");
    private static final Pattern NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9가-힣\\s]{2,50}$");

    /**
     * 사용자 회원가입 요청 검증
     */
    public static void validateUserSignupRequest(@NonNull UserSignupRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("User signup request cannot be null");
        }
        if (!StringUtils.hasText(request.userId())) {
            throw new IllegalArgumentException("User ID must be 4-20 alphanumeric characters");
        }

        if (!StringUtils.hasText(request.password()) || !PASSWORD_PATTERN.matcher(request.password()).matches()) {
            throw new IllegalArgumentException(
                    "Password must be at least 8 characters with letters, numbers, and special characters");
        }

        if (!StringUtils.hasText(request.userNm())) {
            throw new IllegalArgumentException("User name cannot be null or empty");
        }

        if (!NAME_PATTERN.matcher(request.userNm()).matches()) {
            throw new IllegalArgumentException("User name contains invalid characters");
        }

        if (request.passwordHint() != null && request.passwordHint().length() > 300) {
            throw new IllegalArgumentException("Password hint is too long");
        }

        if (request.passwordCnsr() != null && request.passwordCnsr().length() > 300) {
            throw new IllegalArgumentException("Password answer is too long");
        }
    }

    /**
     * 이메일 주소 검증
     */
    public static void validateEmail(String email) {
        if (!StringUtils.hasText(email) || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("Invalid email format");
        }
    }

    /**
     * 사용자 엔티티 검증
     */
    public static void validateUser(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null");
        }

        if (!StringUtils.hasText(user.getUserId())) {
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }

        if (!USER_ID_PATTERN.matcher(user.getUserId()).matches()) {
            throw new IllegalArgumentException("User ID must be 4-20 alphanumeric characters");
        }

        if (!StringUtils.hasText(user.getUserNm())) {
            throw new IllegalArgumentException("User name cannot be null or empty");
        }

        if (!NAME_PATTERN.matcher(user.getUserNm()).matches()) {
            throw new IllegalArgumentException("User name contains invalid characters");
        }

        if (user.getEmailAdres() != null && !EMAIL_PATTERN.matcher(user.getEmailAdres()).matches()) {
            throw new IllegalArgumentException("Invalid email format");
        }
    }
}
