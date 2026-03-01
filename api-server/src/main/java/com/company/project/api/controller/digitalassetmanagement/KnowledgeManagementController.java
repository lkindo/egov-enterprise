package com.company.project.api.controller.digitalassetmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.digitalassetmanagement.KnowledgeInfSearchResult;
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

@Tag(name = "DigitalAssetManagement", description = "ì§€???ì‚° ê´€ë¦?API (ê´€ë¦¬ì??")
@RestController
@RequestMapping("/api/v1/admin/digital-assets")
@RequiredArgsConstructor
public class KnowledgeManagementController {

    private final KnowledgeManagementService managementService;

    @Operation(summary = "?„ì²´ ì§€??ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤?œì— ?±ë¡???„ì²´ ì§€??ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<KnowledgeInfSearchResult>>> getManagementList(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                managementService.selectKnowledgeManagementList(searchCondition, searchKeyword, pageable)));
    }

    @Operation(summary = "ì§€???ì„¸ ì¡°íšŒ", description = "?¹ì • ì§€?ì˜ ?ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{knoId}")
    public ResponseEntity<ApiResponse<KnowledgeDto>> getManagementDetail(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "ì§€??ID") @PathVariable String knoId) {
        return ResponseEntity.ok(ApiResponse.success(
                managementService.selectKnowledgeManagementDetail(knoId, userDetails.getUsername())));
    }

    @Operation(summary = "ì§€???•ë³´ ?˜ì •", description = "ì§€?ì˜ ?ê¸° ?¼ì, ?‰ê? ?ìˆ˜ ??ê´€ë¦¬ì ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
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
