package com.company.project.service.user.dto;

import com.company.project.domain.user.Role;
import com.company.project.domain.user.User;

public record UserResponse(String userId, String userNm, Role role) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getUserId(), user.getUserNm(), user.getRole());
    }
}
