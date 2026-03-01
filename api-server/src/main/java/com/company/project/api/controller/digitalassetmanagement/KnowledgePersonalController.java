package com.company.project.api.controller.digitalassetmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.digitalassetmanagement.KnowledgeInf;
import com.company.project.service.digitalassetmanagement.KnowledgePersonalService;
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

@Tag(name = "DigitalAssetPersonal", description = "ê°œì¸ ì§€??ê´€ë¦?API")
@RestController
@RequestMapping("/api/v1/digital-assets/personal")
@RequiredArgsConstructor
public class KnowledgePersonalController {

    private final KnowledgePersonalService personalService;

    @Operation(summary = "?˜ì˜ ì§€??ëª©ë¡ ì¡°íšŒ", description = "ë¡œê·¸?¸í•œ ?¬ìš©?ê? ?±ë¡??ì§€??ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<KnowledgeInf>>> getPersonalList(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(
                personalService.selectKnowledgePersonalList(searchCondition, searchKeyword, userDetails.getUsername(),
                        pageable)));
    }

    @Operation(summary = "?˜ì˜ ì§€???ì„¸ ì¡°íšŒ", description = "?´ê? ?±ë¡???¹ì • ì§€?ì˜ ?ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{knoId}")
    public ResponseEntity<ApiResponse<KnowledgeDto>> getPersonalDetail(
            @Parameter(description = "ì§€??ID") @PathVariable String knoId) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(personalService.selectKnowledgePersonalDetail(knoId)));
    }

    @Operation(summary = "ì§€???±ë¡", description = "?ˆë¡œ??ì§€?ì„ ?±ë¡?©ë‹ˆ?? (?Œì¼?€ ë³„ë„ ?…ë¡œ??API ?¬ìš©)")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createPersonal(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody KnowledgeDto knowledgeDto) throws Exception {
        knowledgeDto.setFrstRegisterId(userDetails.getUsername());
        personalService.insertKnowledgePersonal(knowledgeDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ì§€???•ë³´ ?˜ì •", description = "?´ê? ?±ë¡??ì§€???•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{knoId}")
    public ResponseEntity<ApiResponse<Void>> updatePersonal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String knoId,
            @RequestBody KnowledgeDto knowledgeDto) throws Exception {
        knowledgeDto.setKnoId(knoId);
        knowledgeDto.setLastUpdusrId(userDetails.getUsername());
        personalService.updateKnowledgePersonal(knowledgeDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ì§€???? œ", description = "?´ê? ?±ë¡??ì§€?ì„ ?? œ?©ë‹ˆ??")
    @DeleteMapping("/{knoId}")
    public ResponseEntity<ApiResponse<Void>> deletePersonal(@PathVariable String knoId) throws Exception {
        personalService.deleteKnowledgePersonal(knoId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
