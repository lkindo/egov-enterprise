package com.company.project.api.controller.digitalassetmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.digitalassetmanagement.KnowledgeInfSearchResult;
import com.company.project.service.digitalassetmanagement.KnowledgeAppraisalService;
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

@Tag(name = "DigitalAssetAppraisal", description = "ì§€???‰ê? ê´€ë¦?API")
@RestController
@RequestMapping("/api/v1/admin/digital-assets/appraisals")
@RequiredArgsConstructor
public class KnowledgeAppraisalController {

    private final KnowledgeAppraisalService appraisalService;

    @Operation(summary = "ì§€???‰ê? ëª©ë¡ ì¡°íšŒ", description = "?„ë¬¸ê°€ê°€ ?‰ê??´ì•¼ ??ì§€??ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<KnowledgeInfSearchResult>>> getAppraisalList(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                appraisalService.selectKnowledgeAppraisalList(userDetails.getUsername(), searchCondition, searchKeyword,
                        pageable)));
    }

    @Operation(summary = "ì§€???‰ê? ?ì„¸ ì¡°íšŒ", description = "?‰ê? ?€??ì§€?ì˜ ?ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{knoId}")
    public ResponseEntity<ApiResponse<KnowledgeDto>> getAppraisalDetail(
            @Parameter(description = "ì§€??ID") @PathVariable String knoId) {
        return ResponseEntity.ok(ApiResponse.success(appraisalService.selectKnowledgeAppraisalDetail(knoId)));
    }

    @Operation(summary = "ì§€???‰ê? ?˜í–‰", description = "ì§€?ì— ?€???‰ê? ?ìˆ˜ ë°??„ë¬¸ê°€ ?˜ê²¬???±ë¡?©ë‹ˆ??")
    @PutMapping("/{knoId}")
    public ResponseEntity<ApiResponse<Void>> updateAppraisal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String knoId,
            @RequestBody KnowledgeDto knowledgeDto) {
        knowledgeDto.setKnoId(knoId);
        knowledgeDto.setLastUpdusrId(userDetails.getUsername());
        appraisalService.updateKnowledgeAppraisal(knowledgeDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
