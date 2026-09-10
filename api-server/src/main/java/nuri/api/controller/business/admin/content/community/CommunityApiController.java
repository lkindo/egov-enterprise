package nuri.api.controller.business.admin.content.community;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.system.content.community.CommunityService;
import nuri.business.service.system.content.community.dto.CommunityDto;
import nuri.business.service.system.content.community.dto.CommunityMemberDto;
import nuri.business.domain.system.content.community.CommunityMemberStatus;
import nuri.foundation.security.annotation.AdminOrSystem;
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

@Tag(name = "Community", description = "커뮤니티 관리 API (Admin)")
@RestController("systemCommunityApiController")
@RequestMapping("/api/v1/admin/content/community")
@RequiredArgsConstructor
public class CommunityApiController {

    private final CommunityService communityService;

    @Operation(summary = "커뮤니티 목록 조회", description = "시스템에 등록된 전체 커뮤니티 목록을 페이징하여 조회합니다.")
    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.community.CommunityApiController#getCommunities')")
    public ResponseEntity<ApiResponse<PageResponse<CommunityDto>>> getCommunities(
            @RequestParam(required = false) String searchCnd,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<CommunityDto> page = communityService.getCommunityList(searchCnd, searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "커뮤니티 상세 조회", description = "특정 커뮤니티의 상세 기본 정보를 조회합니다.")
    @GetMapping("/{cmntySn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.community.CommunityApiController#getCommunity')")
    public ResponseEntity<ApiResponse<CommunityDto>> getCommunity(
            @Parameter(description = "커뮤니티 일련번호") @PathVariable Long cmntySn) {
        return ResponseEntity.ok(ApiResponse.success(communityService.getCommunity(cmntySn)));
    }

    @Operation(summary = "커뮤니티 개설 신청/등록", description = "새로운 커뮤니티 개설을 신청하거나 등록합니다.")
    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.community.CommunityApiController#createCommunity')")
    public ResponseEntity<ApiResponse<CommunityDto>> createCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CommunityDto communityDto) {
        return ResponseEntity
                .ok(ApiResponse.success(communityService.createCommunity(userDetails.getUsername(), communityDto)));
    }

    @Operation(summary = "커뮤니티 정보 수정", description = "커뮤니티 명칭, 소개 등 기본 정보를 수정합니다.")
    @PutMapping("/{cmntySn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.community.CommunityApiController#updateCommunity')")
    public ResponseEntity<ApiResponse<Void>> updateCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "커뮤니티 일련번호") @PathVariable Long cmntySn,
            @Valid @RequestBody CommunityDto communityDto) {
        communityDto.setCmntySn(cmntySn);
        communityService.updateCommunity(userDetails.getUsername(), communityDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "커뮤니티 폐쇄/삭제", description = "커뮤니티를 폐쇄 처리하거나 삭제합니다.")
    @DeleteMapping("/{cmntySn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.community.CommunityApiController#deleteCommunity')")
    public ResponseEntity<ApiResponse<Void>> deleteCommunity(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "커뮤니티 일련번호") @PathVariable Long cmntySn) {
        communityService.deleteCommunity(cmntySn, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ─── 멤버십 (2026-09-06 DEC-OPS-043) ──────────────────────────────────────────────────────────
    //   가입 신청(mbrSttsCd='A')을 읽고 승인·반려로 옮기는 첫 경로다(GAP-CMTY-001). 이 컨트롤러의 다른 핸들러는
    //   URL 게이트(/api/v1/admin/**)만 믿지만, 멤버십 전이는 사람의 소속을 바꾸는 쓰기라 메서드 인가와
    //   서비스 2차 가드(SecurityUtil.assertAdmin)까지 함께 둔다(백엔드 헌법 제8조).

    @Operation(summary = "커뮤니티 회원·가입 신청 목록",
            description = "커뮤니티의 회원과 가입 신청을 페이징 조회합니다. status 를 주면 그 상태만(REQUESTED=가입 신청, APPROVED=회원). 이름은 사용자 도메인에서 해석하며 연락처는 싣지 않습니다.")
    @GetMapping("/{cmntySn}/members")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.community.CommunityApiController#getMembers')")
    public ResponseEntity<ApiResponse<PageResponse<CommunityMemberDto>>> getMembers(
            @Parameter(description = "커뮤니티 일련번호") @PathVariable Long cmntySn,
            @Parameter(description = "멤버십 상태 필터(REQUESTED·APPROVED). 생략하면 전체")
            @RequestParam(required = false) CommunityMemberStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<CommunityMemberDto> page = communityService.getMembers(cmntySn, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "커뮤니티 가입 신청 승인", description = "가입 신청 상태(REQUESTED)인 사용자를 회원으로 승인합니다. 신청 상태가 아니면 400 입니다.")
    @PatchMapping("/{cmntySn}/members/{userId}/approve")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.community.CommunityApiController#approveMember')")
    public ResponseEntity<ApiResponse<Void>> approveMember(
            @Parameter(description = "커뮤니티 일련번호") @PathVariable Long cmntySn,
            @Parameter(description = "사용자 식별자(esntlId)") @PathVariable String userId) {
        communityService.approveMember(cmntySn, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "커뮤니티 가입 신청 반려", description = "가입 신청 상태(REQUESTED)인 행을 삭제합니다. 사용자는 다시 신청할 수 있습니다. 이미 회원인 행은 반려 대상이 아니라 400 입니다(탈퇴 처리는 별도).")
    @DeleteMapping("/{cmntySn}/members/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.community.CommunityApiController#rejectMember')")
    public ResponseEntity<ApiResponse<Void>> rejectMember(
            @Parameter(description = "커뮤니티 일련번호") @PathVariable Long cmntySn,
            @Parameter(description = "사용자 식별자(esntlId)") @PathVariable String userId) {
        communityService.rejectMember(cmntySn, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "포틀릿용 커뮤니티 목록", description = "메인 화면 포틀릿 표시에 최적화된 커뮤니티 목록을 조회합니다.")
    @GetMapping("/portlet")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.community.CommunityApiController#getCommunityPortlet')")
    public ResponseEntity<ApiResponse<List<CommunityDto>>> getCommunityPortlet() {
        return ResponseEntity.ok(ApiResponse.success(communityService.getCommunityListPortlet()));
    }
}
