package nuri.business.service.user.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import nuri.business.domain.user.entity.Role;
import nuri.business.service.user.UserService;
import java.util.List;

/**
 * 사용자 권한 일괄 변경 요청 DTO
 */
@Getter
@Setter
public class BulkRoleRequest {
    @ArraySchema(
            arraySchema = @Schema(description = "대상 사용자 ID 목록"),
            schema = @Schema(implementation = String.class),
            minItems = 1,
            maxItems = UserService.MAX_BULK_USERS)
    @NotEmpty(message = "사용자 ID 목록은 필수입니다.")
    @NotNull
    @Size(min = 1, max = UserService.MAX_BULK_USERS, message = "한 번에 처리할 사용자 ID는 {min}개 이상 {max}개 이하여야 합니다.")
    private List<String> userIds;

    @NotNull(message = "권한은 필수입니다.")
    private Role role;
}
