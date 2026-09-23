package nuri.business.service.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

/**
 * 사용자 상태 일괄 변경 요청 DTO
 *
 * <p>상태 코드는 화면의 세 값(P 정상·A 승인 대기·D 비활성)만 받는다. 로그인은 {@code P} 만 통과시키므로
 * 어휘 밖 코드도 계정을 막는데, 상세 화면은 그 코드를 배지로 그리지 못해 '-' 로 남는다.
 */
@Getter
@Setter
public class BulkStatusRequest {
    @NotEmpty(message = "사용자 ID 목록은 필수입니다.")
    @NotNull
    private List<String> userIds;

    @NotNull(message = "상태 코드는 필수입니다.")
    @Schema(description = "계정 상태 코드(P 정상 · A 승인 대기 · D 비활성)", allowableValues = { "P", "A", "D" })
    @Pattern(regexp = "^(?:P|A|D)$")
    private String status;
}
