package nuri.business.service.user.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import nuri.business.domain.user.entity.Role;
import java.util.List;

/**
 * 사용자 권한 일괄 변경 요청 DTO
 */
@Getter
@Setter
public class BulkRoleRequest {
    @NotEmpty(message = "사용자 ID 목록은 필수입니다.")
    private List<String> userIds;

    @NotNull(message = "권한은 필수입니다.")
    private Role role;
}
