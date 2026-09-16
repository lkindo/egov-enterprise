package nuri.api.controller.business.approval.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import nuri.business.service.informalsanction.dto.ApprovalStageRequest;
import java.util.List;

/**
 * 결재 기안(상신) 입력 계약.
 *
 * <p>신청자는 항상 현재 사용자다 — 요청 본문으로 받지 않는다. 종전 {@code POST /informal-sanctions} 는
 * 도메인 DTO 를 그대로 받아 {@code aplcntId} 가 {@code @NotBlank} 인 채 검증된 뒤 서버가 덮어썼으므로,
 * 클라이언트가 <b>덮어써질 값을 채워 보내야 통과하는</b> 계약이었다. 이 요청은 화면이 실제로 아는 세
 * 값만 받는다.
 */
@Schema(description = "전자결재 기안 요청 — 신청자는 현재 사용자로 고정된다")
public class ApprovalDraftRequest {

    @Schema(description = "업무 구분 코드(공통코드 COM075 의 사용 중 상세코드)", maxLength = 12)
    @NotBlank
    @Size(max = 12)
    private String taskSeCd;

    @Schema(description = "결재자 esntlId(사용자 검색이 돌려주는 식별자)", maxLength = 20)
    @Size(max = 20)
    private String aprvrId;

    @Schema(description = "문서 제목", maxLength = 256)
    @Size(max = 256)
    private String docTtl;

    @Schema(description = "결재를 요청하는 문서 내용", maxLength = 4000)
    @Size(max = 4000)
    private String docCn;

    @Schema(description = "진행 순서대로 나열한 결재 단계. 생략하면 aprvrId의 단일 결재로 처리합니다.")
    @Valid
    @Size(min = 1, max = 10)
    private List<@jakarta.validation.constraints.NotNull ApprovalStageRequest> stages;

    @Schema(description = "신청 일자(yyyyMMdd). 비우면 서버가 오늘(Asia/Seoul)로 채운다", pattern = "^\\d{8}$")
    @Pattern(regexp = "^\\d{8}$")
    private String reqYmd;

    public String getTaskSeCd() {
        return taskSeCd;
    }

    public void setTaskSeCd(String taskSeCd) {
        this.taskSeCd = taskSeCd;
    }

    public String getAprvrId() {
        return aprvrId;
    }

    public void setAprvrId(String aprvrId) {
        this.aprvrId = aprvrId;
    }

    public String getReqYmd() {
        return reqYmd;
    }

    public void setReqYmd(String reqYmd) {
        this.reqYmd = reqYmd;
    }

    public String getDocTtl() { return docTtl; }
    public void setDocTtl(String docTtl) { this.docTtl = docTtl; }
    public String getDocCn() { return docCn; }
    public void setDocCn(String docCn) { this.docCn = docCn; }
    public List<ApprovalStageRequest> getStages() { return stages; }
    public void setStages(List<ApprovalStageRequest> stages) { this.stages = stages; }

    @jakarta.validation.constraints.AssertTrue(message = "결재자를 지정하거나 결재선을 구성해 주세요.")
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Schema(hidden = true)
    public boolean isApprovalLinePresent() {
        return (stages != null && !stages.isEmpty()) || (aprvrId != null && !aprvrId.isBlank());
    }
}
