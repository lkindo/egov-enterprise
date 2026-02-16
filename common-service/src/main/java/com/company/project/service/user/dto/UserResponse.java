package com.company.project.service.user.dto;

import com.company.project.domain.user.Role;

public record UserResponse(String userId, String userNm, Role role) {
}
