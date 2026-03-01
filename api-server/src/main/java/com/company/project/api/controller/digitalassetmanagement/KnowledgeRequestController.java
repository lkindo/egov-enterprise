package com.company.project.api.controller.digitalassetmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.digitalassetmanagement.KnowledgeRequest;
import com.company.project.service.digitalassetmanagement.KnowledgeRequestService;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeRequestDto;
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

@Tag(name = "DigitalAssetRequest", description = "ì§€???”ì²­ ê´€ë¦?API")
@RestController
@RequestMapping("/api/v1/digital-assets/requests")
@RequiredArgsConstructor
public class KnowledgeRequestController {

    private final KnowledgeRequestService requestService;

    @Operation(summary = "ì§€???”ì²­ ëª©ë¡ ì¡°íšŒ", description = "?¬ìš©?ë“¤???±ë¡??ì§€???”ì²­ ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<KnowledgeRequest>>> getRequestList(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(
                requestService.selectKnowledgeRequestList(searchCondition, searchKeyword, pageable)));
    }

    @Operation(summary = "ì§€???”ì²­ ?ì„¸ ì¡°íšŒ", description = "?¹ì • ì§€???”ì²­???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{knoId}")
    public ResponseEntity<ApiResponse<KnowledgeRequestDto>> getRequestDetail(
            @Parameter(description = "ì§€???”ì²­ ID") @PathVariable String knoId) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(requestService.selectKnowledgeRequestDetail(knoId)));
    }

    @Operation(summary = "ì§€???”ì²­ ?±ë¡", description = "?ˆë¡œ??ì§€???”ì²­???±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody KnowledgeRequestDto requestDto) throws Exception {
        requestDto.setFrstRegisterId(userDetails.getUsername());
        requestDto.setEmplyrId(userDetails.getUsername());
        requestService.insertKnowledgeRequest(requestDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ì§€???”ì²­ ?˜ì •", description = "?´ê? ?±ë¡??ì§€???”ì²­ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{knoId}")
    public ResponseEntity<ApiResponse<Void>> updateRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String knoId,
            @RequestBody KnowledgeRequestDto requestDto) throws Exception {
        requestDto.setKnoId(knoId);
        requestDto.setLastUpdusrId(userDetails.getUsername());
        requestService.updateKnowledgeRequest(requestDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ì§€???”ì²­ ?? œ", description = "?´ê? ?±ë¡??ì§€???”ì²­???? œ?©ë‹ˆ?? (?µë????ˆëŠ” ê²½ìš° ?? œ ë¶ˆê?)")
    @DeleteMapping("/{knoId}")
    public ResponseEntity<ApiResponse<Void>> deleteRequest(@PathVariable String knoId) throws Exception {
        if (requestService.getReplyCount(knoId) > 0) {
            throw new IllegalStateException("?µë????±ë¡???”ì²­?€ ?? œ?????†ìŠµ?ˆë‹¤.");
        }
        requestService.deleteKnowledgeRequest(knoId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
