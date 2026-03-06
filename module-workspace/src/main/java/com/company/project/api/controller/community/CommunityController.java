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

@Tag(name = "Community", description = "?호??커??티 관?API")
@RestController
@RequestMapping("/api/v1/communities")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    @Operation(summary = "?호??목록 조회", description = "?스?에 ?록???체 ?호??목록??조회?니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CommunityDto>>> getCommunities(
            @RequestParam(required = false) String searchCnd,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity
                .ok(ApiResponse.success(communityService.getCommunityList(searchCnd, searchWrd, pageable)));
    }

    @Operation(summary = "?호???세 조회", description = "?정 ?호?의 ?세 기본 ?보?조회?니??")
    @GetMapping("/{cmmntyId}")
    public ResponseEntity<ApiResponse<CommunityDto>> getCommunity(
            @Parameter(description = "?호??ID") @PathVariable String cmmntyId) {
        return ResponseEntity.ok(ApiResponse.success(communityService.getCommunity(cmmntyId)));
    }

    @Operation(summary = "?호??개설 ?청/?록", description = "?로???호??개설???청?거???록?니??")
    @PostMapping
    public ResponseEntity<ApiResponse<CommunityDto>> createCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CommunityDto communityDto) {
        return ResponseEntity
                .ok(ApiResponse.success(communityService.createCommunity(userDetails.getUsername(), communityDto)));
    }

    @Operation(summary = "?호???보 ?정", description = "?호??명칭, ?개 ??기본 ?보??정?니??")
    @PutMapping("/{cmmntyId}")
    public ResponseEntity<ApiResponse<Void>> updateCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?호??ID") @PathVariable String cmmntyId,
            @RequestBody CommunityDto communityDto) {
        communityDto.setCmmntyId(cmmntyId);
        communityService.updateCommunity(userDetails.getUsername(), communityDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?호???쇄/??", description = "?호?? ?쇄 처리?거?????니??")
    @DeleteMapping("/{cmmntyId}")
    public ResponseEntity<ApiResponse<Void>> deleteCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?호??ID") @PathVariable String cmmntyId) {
        communityService.deleteCommunity(cmmntyId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "??릿용 ?호??목록", description = "메인 ?면 ????시??최적?된 ?호??목록??조회?니??")
    @GetMapping("/portlet")
    public ResponseEntity<ApiResponse<List<CommunityDto>>> getCommunityPortlet() {
        return ResponseEntity.ok(ApiResponse.success(communityService.getCommunityListPortlet()));
    }
}
