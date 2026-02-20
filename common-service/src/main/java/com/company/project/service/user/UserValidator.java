package com.company.project.service.user;

import com.company.project.service.user.dto.UserSignupRequest;
import org.springframework.lang.NonNull;

/**
 * ?ъ슜??愿???낅젰媛?寃利??좏떥由ы떚 ?대옒??
 */
public class UserValidator {

    /**
     * ?ъ슜???뚯썝媛???붿껌 寃利?
     */
    public static void validateUserSignupRequest(@NonNull UserSignupRequest request) {
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
