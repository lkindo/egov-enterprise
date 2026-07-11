package nuri.business.service.user.dto;

import lombok.Builder;
import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.domain.user.entity.User;

@Builder
@Schema(description = "사용자 응답 DTO")
public record UserResponse(
    @Schema(description = "사용자 아이디")
    String userId,

    @Schema(description = "사용자 이름")
    String userNm,

    @Schema(description = "사용자 역할")
    String role
) {
    public static UserResponse from(User user) {
        if (user == null) return null;
        return new UserResponse(
            user.getUserId(),
            user.getUserNm(),
            user.getRole() != null ? user.getRole().name() : null
        );
    }
}

