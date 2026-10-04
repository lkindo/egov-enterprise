package nuri.business.service.informalsanction.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
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
 * 결재 기안 임시저장 요청(2026-10-03 결재 동선 개선 D3, DEC-OPS-219).
 *
 * <p>상신 요청({@code ApprovalDraftRequest})과 따로 둔다 — 미완성 기안을 저장하므로 업무 구분·결재선이 없어도 된다.
 * 길이는 {@code tb_ifml_atrz_tmpr_strg} 컬럼(12·256·4000)의 미러다. 결재선은 상신과 같은 단계 모양을 쓰며, 결재자가 없는
 * 단계는 저장하지 않는다(화면이 저장 전에 빼고 알린다). 결재자 자격은 저장할 때 보지 않고 다시 열 때 판정한다.
 *
 * <p>[pack 경계] 컨트롤러는 api-server 에 있지만 이 DTO 는 결재 도메인 패키지에 둔다 — 결재 타입을 참조하지 않는 요청
 * DTO 가 api-server 에 있으면 축소 프로필에 참조처 없이 남는다(DEC-OPS-122 의 메모 지시 DTO 선례).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "결재 기안 임시저장 요청 — 기안자는 현재 사용자로 고정된다")
public class ApprovalTemporaryDraftRequest {

    @Schema(description = "업무 구분 코드(공통코드 COM075). 비울 수 있다", maxLength = 12)
    @Size(max = 12)
    private String taskSeCd;

    @Schema(description = "문서 제목. 비울 수 있다", maxLength = 256)
    @Size(max = 256)
    private String docTtl;

    @Schema(description = "문서 내용. 비울 수 있다", maxLength = 4000)
    @Size(max = 4000)
    private String docCn;

    @Schema(description = "진행 순서대로 나열한 결재 단계(최대 10단계). 결재자가 없는 단계는 보낼 수 없다")
    @Size(max = 10)
    private List<@NotNull @Valid ApprovalStageRequest> stages;

    @Schema(description = "참조자 esntlId 목록(최대 20명, 2026-10-04 D4). 결재선과 겹칠 수 없고, 자격은 다시 열 때 판정한다")
    @Size(max = 20)
    private List<@NotBlank @Size(max = 20) String> references;

    @Schema(description = "고치려는 임시저장의 버전. 수정할 때만 필요하며 다르면 409 다")
    @Min(0)
    private Integer version;
}
