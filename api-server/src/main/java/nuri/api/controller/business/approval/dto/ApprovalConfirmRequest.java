package nuri.api.controller.business.approval.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 승인·반려 입력 계약. 응답 모델이나 도메인 DTO를 재정의하지 않는다. */
@Schema(description = "전자결재 승인·반려 요청")
public class ApprovalConfirmRequest {

    @Schema(description = "결재 상태 코드", allowableValues = {"C", "R"}, minLength = 1, maxLength = 1)
    @NotBlank
    @Size(min = 1, max = 1)
    @Pattern(regexp = "^[CR]$")
    private String status;

    @Schema(description = "반려 사유. status가 R이면 필수", maxLength = 4000)
    @Size(max = 4000)
    private String reason;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    @AssertTrue(message = "반려 사유는 필수입니다.")
    @JsonIgnore
    @Schema(hidden = true)
    public boolean isRejectionReasonValid() {
        return !"R".equals(status) || (reason != null && !reason.isBlank());
    }
}
