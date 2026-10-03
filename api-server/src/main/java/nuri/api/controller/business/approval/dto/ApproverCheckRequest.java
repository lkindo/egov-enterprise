package nuri.api.controller.business.approval.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** 결재자로 고를 수 있는지 미리 확인할 사람들(2026-10-03 결재 동선 개선). 저장하지 않는 조회 요청이다. */
@Schema(description = "결재자 자격 확인 요청")
public class ApproverCheckRequest {

    @Schema(description = "확인할 사용자 esntlId 목록(최대 50명)")
    @NotNull
    @Size(min = 1, max = 50)
    private List<@NotBlank @Size(max = 20) String> approverIds;

    public List<String> getApproverIds() { return approverIds; }
    public void setApproverIds(List<String> approverIds) { this.approverIds = approverIds; }
}
