package com.company.project.api.controller.sanctn;

import com.company.project.core.response.ApiResponse;
import com.company.project.security.annotation.LoginUser;
import com.company.project.security.service.CustomUserDetails;
import com.company.project.service.informalsanction.InformalSanctionService;
import com.company.project.service.informalsanction.dto.InformalSanctionDto;
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
    public ResponseEntity<ApiResponse<Page<InformalSanctionDto>>> getPending(
            @LoginUser CustomUserDetails userDetails,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                approvalService.getReceivedInformalSanctionList(userDetails.getEsntlId(), pageable)));
    }

    @Operation(summary = "Get My Approval History")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<InformalSanctionDto>>> getMyHistory(
            @LoginUser CustomUserDetails userDetails,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                approvalService.getInformalSanctionList(userDetails.getEsntlId(), pageable)));
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
