package nuri.api.controller.business.community;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.system.content.community.CommunityService;
import nuri.business.service.system.content.community.dto.CommunityDto;
import nuri.business.service.system.content.community.dto.CommunityMembershipDto;
import nuri.business.service.board.BoardMasterService;
import nuri.business.service.board.dto.CommunityBoardDto;
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
    /**
     * [2026-09-08 PD-CMTY-001] 커뮤니티 귀속 게시판 목록. 게시판 도메인이 소유하는 질의라
     * 커뮤니티 서비스를 거치지 않는다 — 커뮤니티가 게시판을 import 하면 서비스 계층 교차 결합
     * (GAP-ARCH-001)이 늘어나므로 조립은 컨트롤러에서 한다.
     */
    private final BoardMasterService boardMasterService;

    /**
     * [2026-09-02] 사용 중인 커뮤니티만 돌려준다. 종전에는 관리자 목록과 같은 메서드를 불러
     * 논리 삭제된(useYn='N') 커뮤니티가 일반 사용자에게 그대로 보였다.
     */
    @Operation(summary = "커뮤니티 목록 조회", description = "사용 중인 커뮤니티 목록을 페이징하여 조회합니다. 관리자가 사용 중지한 커뮤니티는 제외됩니다.")
    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.community.CommunityUserApiController#getCommunities')")
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
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.community.CommunityUserApiController#getCommunity')")
    public ResponseEntity<ApiResponse<CommunityDto>> getCommunity(
            @Parameter(description = "커뮤니티 일련번호") @PathVariable Long cmntySn) {
        return ResponseEntity.ok(ApiResponse.success(communityService.getActiveCommunity(cmntySn)));
    }

    /**
     * [2026-09-06 DEC-OPS-043] 상세 화면이 가입 버튼의 상태(신청 가능·승인 대기·회원)를 정하는 근거.
     * 자기 자신의 행만 돌려주며(principal = esntlId), 다른 사용자의 멤버십은 조회할 수 없다.
     */
    @Operation(summary = "내 커뮤니티 멤버십 상태", description = "현재 사용자의 특정 커뮤니티 멤버십 상태(NONE·REQUESTED·MEMBER)를 조회합니다.")
    @GetMapping("/{cmntySn}/membership")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.community.CommunityUserApiController#getMyMembership')")
    public ResponseEntity<ApiResponse<CommunityMembershipDto>> getMyMembership(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "커뮤니티 일련번호") @PathVariable Long cmntySn) {
        return ResponseEntity.ok(ApiResponse.success(
                communityService.getMembership(cmntySn, userDetails.getUsername())));
    }

    /**
     * [2026-09-08 PD-CMTY-001] 회원 자격이 처음으로 여는 기능.
     *
     * <p>승인된 회원(또는 관리자)만 목록을 받고 그 밖에는 403 이다. 판정은 게시판 서비스가
     * {@code CommunityBoardAccessPort} 로 수행하며 게시판 진입 시점에 같은 게이트가 다시 판정한다.
     */
    @Operation(summary = "커뮤니티 게시판 목록",
            description = "커뮤니티에 귀속된 사용 중인 게시판 목록을 조회합니다. 승인된 회원만 조회할 수 있습니다.")
    @GetMapping("/{cmntySn}/boards")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.community.CommunityUserApiController#getCommunityBoards')")
    public ResponseEntity<ApiResponse<java.util.List<CommunityBoardDto>>> getCommunityBoards(
            @Parameter(description = "커뮤니티 일련번호") @PathVariable Long cmntySn) {
        return ResponseEntity.ok(ApiResponse.success(boardMasterService.getCommunityBoards(cmntySn)));
    }

    @Operation(summary = "커뮤니티 가입 신청", description = "사용자가 특정 커뮤니티에 가입을 신청합니다. 관리자가 승인하면 회원이 됩니다.")
    @PostMapping("/{cmntySn}/join")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.community.CommunityUserApiController#joinCommunity')")
    public ResponseEntity<ApiResponse<Void>> joinCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long cmntySn) {
        communityService.joinCommunity(cmntySn, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
