package nuri.api.controller.business.approval.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** [2026-10-03 D7] 결재자가 반려하지 않고 기안자에게 보완을 요청한다. */
@Schema(description = "보완 요청")
public class ApprovalSupplementRequest {

    @Schema(description = "기안자에게 묻거나 보완을 요청할 내용", maxLength = 4000)
    @NotBlank
    @Size(max = 4000)
    private String question;

    @Schema(description = "상세 조회 시 받은 문서 버전")
    @NotNull
    @Min(0)
    private Integer version;

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
}
