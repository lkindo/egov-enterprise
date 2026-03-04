package com.company.project.api.controller.sanctn;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.informalsanction.InformalSanctionService;
import com.company.project.service.informalsanction.dto.InformalSanctionDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "InformalSanction", description = "Informal Sanction Management APIs")
@RestController
@RequestMapping("/api/v1/sanctions")
@RequiredArgsConstructor
public class InformalSanctnController {

    private final InformalSanctionService informalSanctnService;

    @Operation(summary = "내 신청 정보 목록 조회", description = "자신이 신청한 약식 결재 목록을 조회합니다.")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<InformalSanctionDto>>> getMySanctions(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(informalSanctnService.getInformalSanctionList(userDetails.getUsername(), pageable)));
    }

    @Operation(summary = "수신 결재 정보 목록 조회", description = "자신에게 수신된 약식 결재 목록을 조회합니다.")
    @GetMapping("/received")
    public ResponseEntity<ApiResponse<Page<InformalSanctionDto>>> getReceivedSanctions(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(informalSanctnService.getReceivedInformalSanctionList(userDetails.getUsername(), pageable)));
    }

    @Operation(summary = "약식 결재 상세 조회", description = "지정된 약식 결재 정보를 조회합니다.")
    @GetMapping("/{infrmlSanctnId}")
    public ResponseEntity<ApiResponse<InformalSanctionDto>> getSanction(
            @Parameter(description = "약식 결재 ID") @PathVariable String infrmlSanctnId) {
        return ResponseEntity.ok(ApiResponse.success(informalSanctnService.getInformalSanction(infrmlSanctnId)));
    }

    @Operation(summary = "약식 결재 신청", description = "약식 결재 정보를 신청합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> registerSanction(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody InformalSanctionDto dto) {
        dto.setApplicantId(userDetails.getUsername());
        informalSanctnService.registerInformalSanction(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "약식 결재 정보 수정", description = "지정된 약식 결재 정보를 수정합니다.")
    @PutMapping("/{infrmlSanctnId}")
    public ResponseEntity<ApiResponse<Void>> updateSanction(
            @PathVariable String infrmlSanctnId,
            @RequestBody InformalSanctionDto dto) {
        dto.setInformalSanctionId(infrmlSanctnId);
        informalSanctnService.updateInformalSanction(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "약식 결재 정보 삭제", description = "지정된 약식 결재 정보를 삭제합니다.")
    @DeleteMapping("/{infrmlSanctnId}")
    public ResponseEntity<ApiResponse<Void>> deleteSanction(
            @PathVariable String infrmlSanctnId) {
        informalSanctnService.deleteInformalSanction(infrmlSanctnId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "약식 결재 승인/반려 처리", description = "지정된 약식 결재를 승인 또는 반려 처리합니다.")
    @PatchMapping("/{infrmlSanctnId}/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmSanction(
            @PathVariable String infrmlSanctnId,
            @RequestParam String confmAt,
            @RequestParam(required = false) String returnResn) {
        informalSanctnService.confirmInformalSanction(infrmlSanctnId, confmAt, returnResn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
