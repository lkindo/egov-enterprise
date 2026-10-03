package nuri.api.controller.business.approval.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * [2026-10-03 D7] 기안자가 열린 보완 요청에 답한다. 제목·본문을 보내면 함께 고친다(보내지 않으면 그대로).
 * 고치면 고치기 전 본문이 처리 이력에 남고 앞서 승인한 사람에게 알림이 간다.
 */
@Schema(description = "보완 답변")
public class ApprovalSupplementAnswerRequest {

    @Schema(description = "보완 요청에 대한 답", maxLength = 4000)
    @NotBlank
    @Size(max = 4000)
    private String answer;

    @Schema(description = "고친 제목(보내지 않으면 그대로)", maxLength = 256)
    @Size(max = 256)
    private String docTtl;

    @Schema(description = "고친 본문(보내지 않으면 그대로)", maxLength = 4000)
    @Size(max = 4000)
    private String docCn;

    @Schema(description = "상세 조회 시 받은 문서 버전")
    @NotNull
    @Min(0)
    private Integer version;

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }
    public String getDocTtl() { return docTtl; }
    public void setDocTtl(String docTtl) { this.docTtl = docTtl; }
    public String getDocCn() { return docCn; }
    public void setDocCn(String docCn) { this.docCn = docCn; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
}
