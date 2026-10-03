package nuri.business.service.informalsanction.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "비정형 결재 DTO (표준화)")
public class InformalSanctionDto {

    @Schema(description = "비정형 결재 일련번호", example = "1")
    private Long ifmlAtrzSn;

    @Schema(description = "업무 구분 코드")
    @Size(max = 12)
    @NotBlank
    private String taskSeCd;

    @Schema(description = "업무 구분 명")
    private String taskSeNm;

    @Schema(description = "신청자 ID")
    @Size(max = 20)
    @NotBlank
    private String aplcntId;

    @Schema(description = "신청자 명")
    private String aplcntNm;

    @Schema(description = "신청 일자")
    @Size(max = 8)
    private String reqYmd;

    @Schema(description = "결재자 ID")
    @Size(max = 20)
    private String aprvrId;

    @Schema(description = "결재자 명")
    private String aprvrNm;

    @Schema(description = "결재자 조직 명")
    private String aprvrOrgnztNm;

    @Schema(description = "승인 여부")
    @Size(max = 1)
    private String aprvYn;

    @Schema(description = "결재 일시")
    private LocalDateTime atrzDt;

    @Schema(description = "반려 사유")
    @Size(max = 4000)
    private String rjctRsnCn;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;

    @Size(max = 256)
    private String docTtl;

    @Size(max = 4000)
    private String docCn;

    @Min(0)
    private Integer version;

    private Integer atrzCycl;
    private List<ApprovalStageDto> stages;
    private List<ApprovalRevisionDto> history;
    private boolean canApprove;
    private boolean canWithdraw;
    private boolean canResubmit;

    /** [2026-10-03] 지금 단계가 시작된 시각(진행 중인 현재 차수만). 목록이 며칠째 기다리는지 말한다. */
    private LocalDateTime currentStageSince;
    /** [2026-10-03 D7] 아직 답하지 않은 보완 요청(진행 중인 현재 차수만). */
    private ApprovalSupplementDto openSupplement;
    /** [2026-10-03] 결재자 교체·보완 요청·답변·본문 수정·재알림 기록(상세만). */
    private List<ApprovalProcessDto> processHistory;
    /** 기안자가 지금 재알림을 보낼 수 있다(하루 한 번). */
    private boolean canRemind;
    /** 기안자가 오늘 이미 재알림을 보냈다. */
    private boolean remindedToday;
    /** [D6] 기안자가 아직 처리하지 않은 결재자를 바꿀 수 있다. */
    private boolean canReplaceApprover;
    /** [D7] 결재자가 보완을 요청할 수 있다(차례이고 열린 요청이 없을 때). */
    private boolean canRequestSupplement;
    /** [D7] 기안자가 열린 보완 요청에 답할 수 있다. */
    private boolean canAnswerSupplement;
}

