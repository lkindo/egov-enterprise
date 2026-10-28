package nuri.api.controller.business.approval.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nuri.business.domain.informalsanction.SanctionStatus;

/** 승인·반려 입력 계약. 응답 모델이나 도메인 DTO를 재정의하지 않는다. */
@Schema(description = "전자결재 승인·반려 요청")
public class ApprovalConfirmRequest {

    @Schema(description = "결재 상태 코드", allowableValues = {"C", "R"}, minLength = 1, maxLength = 1)
    @NotBlank
    @Size(min = 1, max = 1)
    @Pattern(regexp = "^[CR]$")
    private String status;

    @Schema(description = "처리 의견. 반려(status=R)일 때는 필수", maxLength = 4000)
    @Size(max = 4000)
    private String reason;

    // [2026-10-27] 다른 결재 쓰기(재상신·보완·결재자 교체)와 같이 필수다 — 비우면 서비스가 버전 대조를 건너뛰어,
    //   다른 사람이 먼저 처리한 문서를 낡은 화면으로 덮을 수 있었다. 화면의 두 경로(결재함·알림 카드)는 늘 보낸다.
    @Schema(description = "상세 조회 시 받은 문서 버전. 달라졌으면 최신 상태를 확인해야 합니다.")
    @NotNull
    @jakarta.validation.constraints.Min(0)
    private Integer version;

    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }

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
        return !SanctionStatus.REJECTED.getCode().equals(status) || (reason != null && !reason.isBlank());
    }
}
