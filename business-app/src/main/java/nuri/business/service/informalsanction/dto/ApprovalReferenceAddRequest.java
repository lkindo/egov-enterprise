package nuri.business.service.informalsanction.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 결재자가 참조자를 더하는 요청(2026-10-04 결재 동선 개선 D4). 기안자가 그 차수에 참조자를 한 명도 지정하지 않았을 때만
 * 지금 차례인 결재자가 보낼 수 있다. 참조는 추가만 하므로 되돌릴 수 없다.
 *
 * <p>[pack 경계] 컨트롤러는 api-server 에 있지만 이 DTO 는 결재 도메인 패키지에 둔다 — 결재 타입을 참조하지 않는 요청
 * DTO 가 api-server 에 있으면 축소 프로필에 참조처 없이 남는다({@link ApprovalTemporaryDraftRequest} 와 같은 이유).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "결재 참조자 추가 요청 — 지금 차례인 결재자만 보낼 수 있다")
public class ApprovalReferenceAddRequest {

    @Schema(description = "더할 참조자 esntlId 목록(1~20명). 이 차수에 이미 참조자인 사람은 무시하고, 이전 차수 참조자는 이 차수의 지정이 된다")
    @NotNull
    @Size(min = 1, max = 20)
    private List<@NotBlank @Size(max = 20) String> references;

    @Schema(description = "상세 조회 시 받은 문서 버전. 다르면 409 다")
    @NotNull
    @Min(0)
    private Integer version;
}
