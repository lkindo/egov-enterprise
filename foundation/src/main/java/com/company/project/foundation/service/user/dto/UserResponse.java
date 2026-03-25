package com.company.project.foundation.service.user.dto;

import com.company.project.foundation.domain.user.entity.Role;

public record UserResponse(String userId, String userNm, Role role) {
}
