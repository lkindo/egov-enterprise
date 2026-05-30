package nuri.business.service.user.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

/**
 * 사용자 부서 일괄 이동 요청 DTO
 */
@Getter
@Setter
public class BulkDeptMoveRequest {
    @NotEmpty(message = "사용자 ID 목록은 필수입니다.")
    private List<String> userIds;

    @NotNull(message = "부서 ID는 필수입니다.")
    private String orgnztId;
}
