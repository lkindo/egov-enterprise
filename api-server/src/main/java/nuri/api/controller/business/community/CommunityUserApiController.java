package nuri.api.controller.business.community;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.system.content.community.CommunityService;
import nuri.business.service.system.content.community.dto.CommunityDto;
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
@nuri.foundation.security.annotation.Authenticated
@RestController
@RequestMapping("/api/v1/communities")
@RequiredArgsConstructor
public class CommunityUserApiController {

    private final CommunityService communityService;

    /**
     * [2026-09-02] 사용 중인 커뮤니티만 돌려준다. 종전에는 관리자 목록과 같은 메서드를 불러
     * 논리 삭제된(useYn='N') 커뮤니티가 일반 사용자에게 그대로 보였다.
     */
    @Operation(summary = "커뮤니티 목록 조회", description = "사용 중인 커뮤니티 목록을 페이징하여 조회합니다. 관리자가 사용 중지한 커뮤니티는 제외됩니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CommunityDto>>> getCommunities(
            @RequestParam(required = false) String searchCnd,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<CommunityDto> page = communityService.getActiveCommunityList(searchCnd, searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    /**
     * [2026-09-05] 목록(위 {@code getActiveCommunityList})과 같은 규칙을 상세에도 적용한다.
     * 종전에는 관리자 상세와 같은 {@code getCommunity} 를 불러, 논리 삭제된 커뮤니티가 cmntySn
     * 직접 지정으로 열리고 개설자 loginId 가 실렸다. 관리자 경로는 그대로 두고 여기만 갈아 끼운다.
     */
    @Operation(summary = "커뮤니티 상세 조회", description = "사용 중인 커뮤니티의 상세 정보를 조회합니다.")
    @GetMapping("/{cmntySn}")
    public ResponseEntity<ApiResponse<CommunityDto>> getCommunity(
            @Parameter(description = "커뮤니티 일련번호") @PathVariable Long cmntySn) {
        return ResponseEntity.ok(ApiResponse.success(communityService.getActiveCommunity(cmntySn)));
    }

    @Operation(summary = "커뮤니티 가입 신청", description = "사용자가 특정 커뮤니티에 가입을 신청합니다.")
    @PostMapping("/{cmntySn}/join")
    public ResponseEntity<ApiResponse<Void>> joinCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long cmntySn) {
        communityService.joinCommunity(cmntySn, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
