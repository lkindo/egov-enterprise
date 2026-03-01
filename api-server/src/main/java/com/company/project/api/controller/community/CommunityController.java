package com.company.project.api.controller.community;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.community.CommunityService;
import com.company.project.service.community.dto.CommunityDto;
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

import java.util.List;

@Tag(name = "Community", description = "?™í˜¸??ì»¤ë??ˆí‹° ê´€ë¦?API")
@RestController
@RequestMapping("/api/v1/communities")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    @Operation(summary = "?™í˜¸??ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤?œì— ?±ë¡???„ì²´ ?™í˜¸??ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CommunityDto>>> getCommunities(
            @RequestParam(required = false) String searchCnd,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity
                .ok(ApiResponse.success(communityService.getCommunityList(searchCnd, searchWrd, pageable)));
    }

    @Operation(summary = "?™í˜¸???ì„¸ ì¡°íšŒ", description = "?¹ì • ?™í˜¸?Œì˜ ?ì„¸ ê¸°ë³¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{cmmntyId}")
    public ResponseEntity<ApiResponse<CommunityDto>> getCommunity(
            @Parameter(description = "?™í˜¸??ID") @PathVariable String cmmntyId) {
        return ResponseEntity.ok(ApiResponse.success(communityService.getCommunity(cmmntyId)));
    }

    @Operation(summary = "?™í˜¸??ê°œì„¤ ? ì²­/?±ë¡", description = "?ˆë¡œ???™í˜¸??ê°œì„¤??? ì²­?˜ê±°???±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<CommunityDto>> createCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CommunityDto communityDto) {
        return ResponseEntity
                .ok(ApiResponse.success(communityService.createCommunity(userDetails.getUsername(), communityDto)));
    }

    @Operation(summary = "?™í˜¸???•ë³´ ?˜ì •", description = "?™í˜¸??ëª…ì¹­, ?Œê°œ ??ê¸°ë³¸ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{cmmntyId}")
    public ResponseEntity<ApiResponse<Void>> updateCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?™í˜¸??ID") @PathVariable String cmmntyId,
            @RequestBody CommunityDto communityDto) {
        communityDto.setCmmntyId(cmmntyId);
        communityService.updateCommunity(userDetails.getUsername(), communityDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?™í˜¸???ì‡„/?? œ", description = "?™í˜¸?Œë? ?ì‡„ ì²˜ë¦¬?˜ê±°???? œ?©ë‹ˆ??")
    @DeleteMapping("/{cmmntyId}")
    public ResponseEntity<ApiResponse<Void>> deleteCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?™í˜¸??ID") @PathVariable String cmmntyId) {
        communityService.deleteCommunity(cmmntyId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?¬í?ë¦¿ìš© ?™í˜¸??ëª©ë¡", description = "ë©”ì¸ ?”ë©´ ?¬í?ë¦??œì‹œ??ìµœì ?”ëœ ?™í˜¸??ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/portlet")
    public ResponseEntity<ApiResponse<List<CommunityDto>>> getCommunityPortlet() {
        return ResponseEntity.ok(ApiResponse.success(communityService.getCommunityListPortlet()));
    }
}
