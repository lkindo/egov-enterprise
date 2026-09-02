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

    @Operation(summary = "Get My Approval History")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<PageResponse<InformalSanctionDto>>> getMyHistory(
            @LoginUser CustomUserDetails userDetails,
            Pageable pageable) {
        Page<InformalSanctionDto> result = approvalService.getInformalSanctionList(userDetails.getEsntlId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
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
