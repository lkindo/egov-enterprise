package nuri.api.controller.business.approval.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** [2026-10-03 D6] 아직 처리하지 않은 결재자를 다른 사람으로 바꾸는 요청. 기안자만 보낼 수 있다. */
@Schema(description = "결재자 바꾸기 요청")
public class ApproverReplaceRequest {

    @Schema(description = "바꿀 결재자 esntlId(아직 처리하지 않은 사람)", maxLength = 20)
    @NotBlank
    @Size(max = 20)
    private String fromUserId;

    @Schema(description = "새 결재자 esntlId", maxLength = 20)
    @NotBlank
    @Size(max = 20)
    private String toUserId;

    @Schema(description = "상세 조회 시 받은 문서 버전")
    @NotNull
    @Min(0)
    private Integer version;

    public String getFromUserId() { return fromUserId; }
    public void setFromUserId(String fromUserId) { this.fromUserId = fromUserId; }
    public String getToUserId() { return toUserId; }
    public void setToUserId(String toUserId) { this.toUserId = toUserId; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
}
