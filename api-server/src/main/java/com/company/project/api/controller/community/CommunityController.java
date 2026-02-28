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

@Tag(name = "Community", description = "동호회/커뮤니티 관리 API")
@RestController
@RequestMapping("/api/v1/communities")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    @Operation(summary = "동호회 목록 조회", description = "시스템에 등록된 전체 동호회 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CommunityDto>>> getCommunities(
            @RequestParam(required = false) String searchCnd,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity
                .ok(ApiResponse.success(communityService.getCommunityList(searchCnd, searchWrd, pageable)));
    }

    @Operation(summary = "동호회 상세 조회", description = "특정 동호회의 상세 기본 정보를 조회합니다.")
    @GetMapping("/{cmmntyId}")
    public ResponseEntity<ApiResponse<CommunityDto>> getCommunity(
            @Parameter(description = "동호회 ID") @PathVariable String cmmntyId) {
        return ResponseEntity.ok(ApiResponse.success(communityService.getCommunity(cmmntyId)));
    }

    @Operation(summary = "동호회 개설 신청/등록", description = "새로운 동호회 개설을 신청하거나 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<CommunityDto>> createCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CommunityDto communityDto) {
        return ResponseEntity
                .ok(ApiResponse.success(communityService.createCommunity(userDetails.getUsername(), communityDto)));
    }

    @Operation(summary = "동호회 정보 수정", description = "동호회 명칭, 소개 등 기본 정보를 수정합니다.")
    @PutMapping("/{cmmntyId}")
    public ResponseEntity<ApiResponse<Void>> updateCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "동호회 ID") @PathVariable String cmmntyId,
            @RequestBody CommunityDto communityDto) {
        communityDto.setCmmntyId(cmmntyId);
        communityService.updateCommunity(userDetails.getUsername(), communityDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "동호회 폐쇄/삭제", description = "동호회를 폐쇄 처리하거나 삭제합니다.")
    @DeleteMapping("/{cmmntyId}")
    public ResponseEntity<ApiResponse<Void>> deleteCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "동호회 ID") @PathVariable String cmmntyId) {
        communityService.deleteCommunity(cmmntyId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "포틀릿용 동호회 목록", description = "메인 화면 포틀릿 표시에 최적화된 동호회 목록을 조회합니다.")
    @GetMapping("/portlet")
    public ResponseEntity<ApiResponse<List<CommunityDto>>> getCommunityPortlet() {
        return ResponseEntity.ok(ApiResponse.success(communityService.getCommunityListPortlet()));
    }
}
