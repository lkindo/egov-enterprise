package nuri.business.service.informalsanction.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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

    /*
     * [2026-10-04 D4] 참조자. 아래 셋은 응답 전용이다 — 이 DTO 는 레거시 등록(POST /informal-sanctions)의 요청 본문이기도 해서,
     * 요청으로 들어온 값은 바인딩하지 않는다(참조자는 상신·재상신 요청과 결재자 추가 요청으로만 받는다).
     */
    /**
     * 이 문서의 참조자 중 보는 사람이 볼 수 있는 가장 높은 차수까지 지정된 사람 — 사람마다 한 줄, 그 사람에게 보이는 가장 최근
     * 지정(상세만, 목록은 빈 목록).
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Schema(description = "참조자(상세만). 보는 사람이 볼 수 있는 가장 높은 차수까지 지정된 사람을 사람마다 한 줄로 싣는다",
            accessMode = Schema.AccessMode.READ_ONLY)
    private List<ApprovalReferenceDto> references;
    /** 보는 사람이 이 문서의 참조자다 — 화면이 '참조로 받은 문서·읽기만' 을 서버 판정으로 말한다. */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Schema(description = "보는 사람이 이 문서의 참조자인가", accessMode = Schema.AccessMode.READ_ONLY)
    private boolean referenceViewer;
    /** 지금 차례인 결재자가 참조자를 더할 수 있다(기안자가 이 차수에 아무도 지정하지 않았고 20명이 차지 않았을 때). */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Schema(description = "지금 차례인 결재자가 참조자를 더할 수 있는가", accessMode = Schema.AccessMode.READ_ONLY)
    private boolean canAddReference;
}

