package com.company.project.api.controller.digitalassetmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.dam.KnowledgeInfSearchResult;
import com.company.project.service.digitalassetmanagement.KnowledgeManagementService;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeDto;
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

@Tag(name = "DigitalAssetManagement", description = "지식 자산 관리 API (관리자용)")
@RestController
@RequestMapping("/api/v1/admin/digital-assets")
@RequiredArgsConstructor
public class KnowledgeManagementController {

    private final KnowledgeManagementService managementService;

    @Operation(summary = "전체 지식 목록 조회", description = "시스템에 등록된 전체 지식 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<KnowledgeInfSearchResult>>> getManagementList(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                managementService.selectKnowledgeManagementList(searchCondition, searchKeyword, pageable)));
    }

    @Operation(summary = "지식 상세 조회", description = "특정 지식의 상세 정보를 조회합니다.")
    @GetMapping("/{knoId}")
    public ResponseEntity<ApiResponse<KnowledgeDto>> getManagementDetail(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "지식 ID") @PathVariable String knoId) {
        return ResponseEntity.ok(ApiResponse.success(
                managementService.selectKnowledgeManagementDetail(knoId, userDetails.getUsername())));
    }

    @Operation(summary = "지식 정보 수정", description = "지식의 폐기 일자, 평가 점수 등 관리자 정보를 수정합니다.")
    @PutMapping("/{knoId}")
    public ResponseEntity<ApiResponse<Void>> updateManagement(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String knoId,
            @RequestBody KnowledgeDto knowledgeDto) {
        knowledgeDto.setKnoId(knoId);
        knowledgeDto.setLastUpdusrId(userDetails.getUsername());
        managementService.updateKnowledgeManagement(knowledgeDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
