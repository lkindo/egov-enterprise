package nuri.api.controller.business.community;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nuri.business.domain.community.CommunityMemberStatus;
import nuri.business.service.community.CommunityService;
import nuri.business.service.community.dto.CommunityMemberDto;
import nuri.business.service.community.dto.CommunityOperatorRequests;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 커뮤니티 운영자 API(GAP-CMTY-001, DEC-OPS-416). 경로 권한(COMMUNITY_OPERATE)은 화면에 들어가는 문만 연다 — 무엇을 할 수 있는지는
 * 서비스가 판정한다: 그 커뮤니티가 사용 중이고 요청자가 그 커뮤니티의 승인 회원이면서 운영자(mngrYn=Y)여야 하며, 관리자 권한
 * 보유자는 운영자가 아니어도 통과한다. 다른 커뮤니티의 운영자·탈퇴(W)·신청(A) 상태·일반 회원은 403 이다.
 */
@Tag(name = "Community Operator", description = "커뮤니티 운영자(소속 커뮤니티 한정) API")
@RestController
@RequestMapping("/api/v1/communities/{cmntySn}/operator")
@RequiredArgsConstructor
public class CommunityOperatorApiController {

    private final CommunityService communityService;

    @Operation(summary = "운영자 회원·가입 신청 목록", description = "status(A 신청·P 회원·W 탈퇴)로 좁힐 수 있습니다. 운영자가 아니면 403 입니다.")
    @GetMapping("/members")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.community.CommunityOperatorApiController#getOperatorMembers')")
    public ResponseEntity<ApiResponse<PageResponse<CommunityMemberDto>>> getOperatorMembers(
            @PathVariable Long cmntySn, @RequestParam(required = false) String status,
            @org.springframework.data.web.PageableDefault(size = 20) Pageable pageable) {
        CommunityMemberStatus filter = status == null || status.isBlank() ? null : CommunityMemberStatus.fromCode(status)
                .orElseThrow(() -> new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE, "알 수 없는 회원 상태입니다."));
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                communityService.getMembersAsOperator(cmntySn, filter, pageable))));
    }

    @Operation(summary = "운영자 가입 승인", description = "신청 상태인 사람을 회원으로 승인합니다. 운영자가 아니면 403, 신청 상태가 아니면 400 입니다.")
    @PutMapping("/members/{userId}/approval")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.community.CommunityOperatorApiController#approveOperatorMember')")
    public ResponseEntity<ApiResponse<Void>> approveOperatorMember(@PathVariable Long cmntySn, @PathVariable String userId) {
        communityService.approveMember(cmntySn, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "운영자 가입 반려", description = "신청을 반려합니다(신청자는 다시 신청할 수 있습니다). 운영자가 아니면 403 입니다.")
    @DeleteMapping("/members/{userId}/request")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.community.CommunityOperatorApiController#rejectOperatorMember')")
    public ResponseEntity<ApiResponse<Void>> rejectOperatorMember(@PathVariable Long cmntySn, @PathVariable String userId) {
        communityService.rejectMember(cmntySn, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "운영자 강제 탈퇴",
            description = "일반 회원을 탈퇴시킵니다. 다른 운영자는 먼저 운영자를 해제해야 하며, 운영자가 아니면 403 입니다.")
    @DeleteMapping("/members/{userId}")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.community.CommunityOperatorApiController#withdrawOperatorMember')")
    public ResponseEntity<ApiResponse<Void>> withdrawOperatorMember(@PathVariable Long cmntySn, @PathVariable String userId) {
        communityService.withdrawMemberAsOperator(cmntySn, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "운영자 지정·해제",
            description = "승인된 회원을 운영자로 지정하거나 해제합니다. 마지막 남은 운영자는 해제할 수 없습니다(409). 운영자·관리자만 합니다.")
    @PutMapping("/members/{userId}/manager")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.community.CommunityOperatorApiController#designateOperator')")
    public ResponseEntity<ApiResponse<Void>> designateOperator(@PathVariable Long cmntySn, @PathVariable String userId,
            @Valid @RequestBody CommunityOperatorRequests.ManagerRequest request) {
        communityService.designateOperator(cmntySn, userId, request.manager());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "운영자 소개·기본 정보 수정",
            description = "커뮤니티 이름·소개를 고칩니다. 사용 여부·템플릿은 관리자만 바꿉니다. 버전이 다르면 409, 운영자가 아니면 403 입니다.")
    @PutMapping("/profile")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.community.CommunityOperatorApiController#updateOperatorProfile')")
    public ResponseEntity<ApiResponse<Void>> updateOperatorProfile(@PathVariable Long cmntySn,
            @Valid @RequestBody CommunityOperatorRequests.ProfileRequest request) {
        communityService.updateProfileAsOperator(cmntySn, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
