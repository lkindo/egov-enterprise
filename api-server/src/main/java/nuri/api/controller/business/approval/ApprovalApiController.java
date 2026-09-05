package nuri.api.controller.business.approval;

import nuri.api.controller.business.approval.dto.ApprovalConfirmRequest;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.security.annotation.LoginUser;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.business.service.informalsanction.InformalSanctionService;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Approval", description = "Unified Electronic Approval APIs")
@nuri.foundation.security.annotation.Authenticated
@RestController
@RequestMapping("/api/v1/approvals")
@RequiredArgsConstructor
public class ApprovalApiController {

    private final InformalSanctionService approvalService;

    /**
     * 결재 대기함.
     *
     * <p>[2026-09-02] 종전에는 상태 조건이 없는 {@code getReceivedInformalSanctionList} 를 불러
     * <b>이미 승인·반려한 건까지 대기함에 남았다.</b> 결재자는 처리한 문서를 다시 열어 보고서야
     * 끝난 건임을 알게 됐다. 이름이 약속하는 것(pending)과 실제 질의가 어긋난 자리다.
     */
    @Operation(summary = "Get Pending Approvals (Inbox)",
            description = "결재자 본인에게 온 결재 중 **대기(신청) 상태**만 조회합니다. 처리 완료 건은 제외됩니다.")
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<PageResponse<InformalSanctionDto>>> getPending(
            @LoginUser CustomUserDetails userDetails,
            Pageable pageable) {
        Page<InformalSanctionDto> result = approvalService.getPendingApprovalList(userDetails.getEsntlId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    /**
     * 내가 <b>올린</b> 결재(신청자 기준). 이름이 'history' 인 것은 종전 계약의 잔재이며,
     * 결재자로서 처리한 이력이 아니다 — 그 목록은 {@link #getProcessed} 다.
     */
    @Operation(summary = "Get My Submitted Approvals",
            description = "내가 신청자인 결재 목록입니다(대기·승인·반려 전부). 결재자로서 처리한 이력은 /processed 입니다.")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<PageResponse<InformalSanctionDto>>> getMyHistory(
            @LoginUser CustomUserDetails userDetails,
            Pageable pageable) {
        Page<InformalSanctionDto> result = approvalService.getInformalSanctionList(userDetails.getEsntlId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "Get Approvals I Processed",
            description = "결재자 본인이 이미 **승인·반려한** 결재만 조회합니다. 대기 건은 /pending 입니다.")
    @GetMapping("/processed")
    public ResponseEntity<ApiResponse<PageResponse<InformalSanctionDto>>> getProcessed(
            @LoginUser CustomUserDetails userDetails,
            Pageable pageable) {
        Page<InformalSanctionDto> result = approvalService.getProcessedApprovalList(userDetails.getEsntlId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "Get Approval Task Types",
            description = "기안 시 고르는 업무 구분(공통코드 COM075 의 사용 중 상세코드)입니다. 등록된 코드가 없으면 빈 목록입니다.")
    @GetMapping("/task-types")
    public ResponseEntity<ApiResponse<java.util.List<nuri.business.service.code.dto.CommonCodeDto>>> getTaskTypes() {
        return ResponseEntity.ok(ApiResponse.success(approvalService.getTaskTypes()));
    }

    /**
     * 결재 기안(상신). 신청자는 요청 본문이 아니라 인증 주체다.
     *
     * <p>[2026-09-05] 종전에는 결재를 <b>올릴</b> 화면이 없었다 — 등록 API 와 프런트 서비스 메서드는
     * 있었지만 호출부가 0건이었고, 기안 화면은 목업이었다. 결재함의 '새 결재 기안' 이 이 경로를 부른다.
     */
    @Operation(summary = "Create Approval Draft",
            description = "현재 사용자를 신청자로 결재를 상신합니다. 업무 구분은 /task-types 의 코드여야 하고 결재자는 사용자 검색의 esntlId 입니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> createApproval(
            @LoginUser CustomUserDetails userDetails,
            @Valid @RequestBody nuri.api.controller.business.approval.dto.ApprovalDraftRequest request) {
        String reqYmd = request.getReqYmd() == null || request.getReqYmd().isBlank()
                ? java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))
                        .format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE)
                : request.getReqYmd();
        InformalSanctionDto dto = InformalSanctionDto.builder()
                .taskSeCd(request.getTaskSeCd())
                .aprvrId(request.getAprvrId())
                .reqYmd(reqYmd)
                .aplcntId(userDetails.getEsntlId())
                .build();
        return ResponseEntity.ok(ApiResponse.success(approvalService.registerInformalSanction(dto)));
    }

    @Operation(summary = "Confirm Approval (Approve/Reject)")
    @PutMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<Void>> confirm(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalConfirmRequest request) {
        approvalService.confirmInformalSanction(id, request.getStatus(), request.getReason());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
