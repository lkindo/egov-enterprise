package com.company.project.common.validator;

import com.company.project.domain.user.User;
import com.company.project.service.user.dto.UserSignupRequest;

import java.util.regex.Pattern;

/**
 * 사용자 관련 검증 유틸리티 클래스
 */
public class UserValidator {
    
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[a-zA-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$");
    private static final Pattern USER_ID_PATTERN = Pattern.compile("^[a-zA-Z0-9]{4,20}$");
    private static final Pattern NAME_PATTERN = Pattern.compile("^[a-zA-Z가-힣\\s]{2,50}$");
    
    /**
     * 사용자 등록 요청 검증
     */
    public static void validateUserSignupRequest(UserSignupRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("User signup request cannot be null");
        }
        
        if (request.userId() == null || request.userId().trim().isEmpty()) {
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }
        
        if (!USER_ID_PATTERN.matcher(request.userId()).matches()) {
            throw new IllegalArgumentException("User ID must be 4-20 alphanumeric characters");
        }
        
        if (request.password() == null || !PASSWORD_PATTERN.matcher(request.password()).matches()) {
            throw new IllegalArgumentException("Password must be at least 8 characters with letters, numbers, and special characters");
        }
        
        if (request.userNm() == null || request.userNm().trim().isEmpty()) {
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
        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) {
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
        
        if (user.getUserId() == null || user.getUserId().trim().isEmpty()) {
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }
        
        if (!USER_ID_PATTERN.matcher(user.getUserId()).matches()) {
            throw new IllegalArgumentException("User ID must be 4-20 alphanumeric characters");
        }
        
        if (user.getUserNm() == null || user.getUserNm().trim().isEmpty()) {
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