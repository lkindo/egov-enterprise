package nuri.business.api.controller.community;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.service.system.content.community.CommunityService;
import nuri.foundation.service.system.content.community.dto.CommunityDto;
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

@Tag(name = "Community User", description = "커뮤니티 사용자 API")
@RestController
@RequestMapping("/api/v1/communities")
@RequiredArgsConstructor
public class CommunityUserApiController {

    private final CommunityService communityService;

    @Operation(summary = "커뮤니티 목록 조회", description = "시스템에 등록된 전체 커뮤니티 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CommunityDto>>> getCommunities(
            @RequestParam(required = false) String searchCnd,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<CommunityDto> page = communityService.getCommunityList(searchCnd, searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "커뮤니티 상세 조회", description = "특정 커뮤니티의 상세 정보를 조회합니다.")
    @GetMapping("/{cmntyId}")
    public ResponseEntity<ApiResponse<CommunityDto>> getCommunity(
            @Parameter(description = "커뮤니티 ID") @PathVariable String cmntyId) {
        return ResponseEntity.ok(ApiResponse.success(communityService.getCommunity(cmntyId)));
    }

    @Operation(summary = "커뮤니티 가입 신청", description = "사용자가 특정 커뮤니티에 가입을 신청합니다.")
    @PostMapping("/{cmntyId}/join")
    public ResponseEntity<ApiResponse<Void>> joinCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String cmntyId) {
        communityService.joinCommunity(cmntyId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
