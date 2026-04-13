package nuri.foundation.service.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.user.entity.Role;
import io.swagger.v3.oas.annotations.media.Schema;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "사용자 응답 DTO")
public class UserResponse {
    @Schema(description = "사용자 아이디")
    private String userId;

    @Schema(description = "사용자 이름")
    private String userNm;

    @Schema(description = "사용자 역할")
    private Role role;
}
