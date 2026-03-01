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

@Tag(name = "DigitalAssetAppraisal", description = "지식 평가 관리 API")
@RestController
@RequestMapping("/api/v1/admin/digital-assets/appraisals")
@RequiredArgsConstructor
public class KnowledgeAppraisalController {

    private final KnowledgeAppraisalService appraisalService;

    @Operation(summary = "지식 평가 목록 조회", description = "전문가가 평가해야 할 지식 목록을 조회합니다.")
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

    @Operation(summary = "지식 평가 상세 조회", description = "평가 대상 지식의 상세 정보를 조회합니다.")
    @GetMapping("/{knowledgeId}")
    public ResponseEntity<ApiResponse<KnowledgeDto>> getAppraisalDetail(
            @Parameter(description = "지식 ID") @PathVariable String knowledgeId) {
        return ResponseEntity.ok(ApiResponse.success(appraisalService.selectKnowledgeAppraisalDetail(knowledgeId)));
    }

    @Operation(summary = "지식 평가 수행", description = "지식에 대한 평가 점수 및 전문가 의견을 등록합니다.")
    @PutMapping("/{knowledgeId}")
    public ResponseEntity<ApiResponse<Void>> updateAppraisal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String knowledgeId,
            @RequestBody KnowledgeDto knowledgeDto) {
        knowledgeDto.setKnowledgeId(knowledgeId);
        knowledgeDto.setFirstRegisterId(userDetails.getUsername());
        appraisalService.updateKnowledgeAppraisal(knowledgeDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
