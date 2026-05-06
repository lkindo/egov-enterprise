package nuri.foundation.service.user.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

/**
 * 사용자 상태 일괄 변경 요청 DTO
 */
@Getter
@Setter
public class BulkStatusRequest {
    @NotEmpty(message = "사용자 ID 목록은 필수입니다.")
    private List<String> userIds;

    @NotNull(message = "상태 코드는 필수입니다.")
    private String status;
}
