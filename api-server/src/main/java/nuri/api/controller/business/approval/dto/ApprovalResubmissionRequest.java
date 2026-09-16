package nuri.api.controller.business.approval.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** A new revision retains the preceding document and every participant's decision. */
@Schema(description = "반려·회수된 결재의 수정 후 재상신 요청")
public class ApprovalResubmissionRequest extends ApprovalDraftRequest {
    @Schema(description = "수정 화면에서 조회한 문서 버전")
    @NotNull
    @Min(0)
    private Integer version;

    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
}
