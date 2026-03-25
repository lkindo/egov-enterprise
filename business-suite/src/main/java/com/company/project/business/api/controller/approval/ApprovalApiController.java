package com.company.project.business.api.controller.approval;

import com.company.project.foundation.core.response.ApiResponse;
import com.company.project.foundation.core.response.PageResponse;
import com.company.project.foundation.security.annotation.LoginUser;
import com.company.project.foundation.security.service.CustomUserDetails;
import com.company.project.business.service.informalsanction.InformalSanctionService;
import com.company.project.business.service.informalsanction.dto.InformalSanctionDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Approval", description = "Unified Electronic Approval APIs")
@RestController
@RequestMapping("/api/v1/approvals")
@RequiredArgsConstructor
public class ApprovalApiController {

    private final InformalSanctionService approvalService;

    @Operation(summary = "Get Pending Approvals (Inbox)")
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<PageResponse<InformalSanctionDto>>> getPending(
            @LoginUser CustomUserDetails userDetails,
            Pageable pageable) {
        Page<InformalSanctionDto> result = approvalService.getReceivedInformalSanctionList(userDetails.getEsntlId(), pageable);
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
            @PathVariable String id,
            @RequestBody Map<String, String> request) {
        approvalService.confirmInformalSanction(id, request.get("status"), request.get("reason"));
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
