package com.company.project.service.user.dto;

import com.company.project.domain.user.Role;

public record UserSignupRequest(String userId, String password, String userNm, Role role, String passwordHint,
        String passwordCnsr) {
}
