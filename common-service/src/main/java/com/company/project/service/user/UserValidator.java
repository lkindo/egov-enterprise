package com.company.project.service.user;

import com.company.project.service.user.dto.UserSignupRequest;

/**
 * 사용자 관련 입력값 검증 유틸리티 클래스
 */
public class UserValidator {

    /**
     * 사용자 회원가입 요청 검증
     */
    public static void validateUserSignupRequest(UserSignupRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("User signup request cannot be null");
        }

        if (request.userId() == null || request.userId().trim().isEmpty()) {
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }

        if (request.password() == null || request.password().length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long");
        }

        if (request.userNm() == null || request.userNm().trim().isEmpty()) {
            throw new IllegalArgumentException("User name cannot be null or empty");
        }

        // Additional validations can be added here
    }
}