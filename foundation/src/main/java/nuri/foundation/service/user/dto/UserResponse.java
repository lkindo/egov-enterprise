package nuri.foundation.service.user.dto;

import nuri.foundation.domain.user.entity.Role;

public record UserResponse(String userId, String userNm, Role role) {
}
