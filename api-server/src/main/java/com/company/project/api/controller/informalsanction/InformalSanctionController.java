package com.company.project.api.controller.informalsanction;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.informalsanction.InformalSanctionService;
import com.company.project.service.informalsanction.dto.InformalSanctionDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * 비정형 결재 관리를 위한 API 컨트롤러
 */
@Tag(name = "Informal Sanction", description = "비정형 결재 관리 API")
@RestController
@RequestMapping("/api/v1/informal-sanctions")
@RequiredArgsConstructor
public class InformalSanctionController {

    private final InformalSanctionService informalSanctionService;
    private final EgovIdGnrService egovInfrmlSanctnIdGnrService;

    @Operation(summary = "비정형 결재 목록 조회", description = "신청자 또는 결재자 기준의 결재 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<InformalSanctionDto>>> getInformalSanctionList(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String type,
            @PageableDefault(size = 10) Pageable pageable) {

        Page<InformalSanctionDto> list;
        if ("received".equals(type)) {
            list = informalSanctionService.getReceivedInformalSanctionList(userDetails.getUsername(), pageable);
        } else {
            list = informalSanctionService.getInformalSanctionList(userDetails.getUsername(), pageable);
        }
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @Operation(summary = "비정형 결재 상세 조회", description = "비정형 결재 상세 정보를 조회합니다.")
    @GetMapping("/{informalSanctionId}")
    public ResponseEntity<ApiResponse<InformalSanctionDto>> getInformalSanction(
            @Parameter(description = "결재 ID") @PathVariable String informalSanctionId) {
        return ResponseEntity.ok(ApiResponse.success(informalSanctionService.getInformalSanction(informalSanctionId)));
    }

    @Operation(summary = "비정형 결재 등록", description = "새로운 비정형 결재를 요청합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> registerInformalSanction(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody InformalSanctionDto dto) throws Exception {

        String id = egovInfrmlSanctnIdGnrService.getNextStringId();
        dto.setInformalSanctionId(id);
        dto.setApplicantId(userDetails.getUsername());

        informalSanctionService.registerInformalSanction(dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "비정형 결재 수정", description = "비정형 결재 정보를 수정합니다.")
    @PutMapping("/{informalSanctionId}")
    public ResponseEntity<ApiResponse<Void>> updateInformalSanction(
            @Parameter(description = "결재 ID") @PathVariable String informalSanctionId,
            @RequestBody InformalSanctionDto dto) {
        dto.setInformalSanctionId(informalSanctionId);
        informalSanctionService.updateInformalSanction(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "비정형 결재 승인/반려", description = "결재자가 결재를 승인 또는 반려 처리합니다.")
    @PatchMapping("/{informalSanctionId}/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmInformalSanction(
            @Parameter(description = "결재 ID") @PathVariable String informalSanctionId,
            @RequestParam String confmAt,
            @RequestParam(required = false) String returnResn) {
        informalSanctionService.confirmInformalSanction(informalSanctionId, confmAt, returnResn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "비정형 결재 삭제", description = "비정형 결재 정보를 삭제합니다.")
    @DeleteMapping("/{informalSanctionId}")
    public ResponseEntity<ApiResponse<Void>> deleteInformalSanction(
            @Parameter(description = "결재 ID") @PathVariable String informalSanctionId) {
        informalSanctionService.deleteInformalSanction(informalSanctionId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}