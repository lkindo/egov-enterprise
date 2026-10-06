package nuri.api.controller;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.security.annotation.LoginUser;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.business.domain.user.repository.UserListFilter;
import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.*;
import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.groups.Default;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import nuri.foundation.core.annotation.PrivacyAccess;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 사용자 관리 통합 API 컨트롤러
 * 일반 사용자 기능(/api/v1/users)과 관리자용 기능(/api/v1/admin/users)을 통합하여 관리합니다.
 */
@Tag(name = "User", description = "사용자 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class UserApiController {

    private final UserService userService;

    // --- [일반 사용자 기능] /api/v1/users ---

    @Operation(summary = "내 프로필 조회", description = "현재 로그인한 사용자의 프로필 정보를 조회합니다.")
    @GetMapping("/users/me")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#getMe')")
    public ResponseEntity<ApiResponse<UserDto>> getMe(@LoginUser CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(userDetails.getUserId())));
    }

    @Operation(summary = "내 프로필 수정",
            description = "현재 로그인한 사용자의 프로필 정보를 수정합니다. "
                    + "사용자 식별자와 소속 조직은 서버가 소유하며 비밀번호 변경은 PUT /users/me/password를 사용합니다.")
    @PutMapping("/users/me")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#updateMe')")
    public ResponseEntity<ApiResponse<Void>> updateMe(
            @LoginUser CustomUserDetails userDetails,
            @RequestBody @Valid UserSelfProfileUpdateRequest request) {
        userService.updateUser(userDetails.getUserId(), request.toUserDto());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "비밀번호 변경", description = "현재 로그인한 사용자의 비밀번호를 변경합니다.")
    @PutMapping("/users/me/password")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#changePassword')")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @LoginUser CustomUserDetails userDetails,
            @RequestBody @Valid PasswordChangeRequest request) {
        userService.changePassword(
                userDetails.getUserId(),
                request.getOldPassword(),
                request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success(null));
    }


    // [2026-09-25 DIP D1] 공개 가입을 두지 않는다(DEC-OPS-069 — 관리자 프로비저닝만). 이 경로는 미인증 요청을
    //   받아 즉시 활성 계정을 만들고 있었다. 제거 대신 사용자 등록 권한(USER_CREATE)에 결속한다 — 역할을 USER 로
    //   고정하는 계약(SignupContractLinterTest)은 그대로 유효하다.
    @Operation(summary = "일반 사용자 계정 생성(관리자)", description = "일반 사용자(USER) 계정을 생성합니다. "
            + "공개 가입은 제공하지 않으며 사용자 등록 권한(USER_CREATE)이 필요합니다.")
    @PostMapping("/users/signup")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#signup')")
    public ResponseEntity<ApiResponse<UserResponse>> signup(@RequestBody @Valid UserSignupRequest request) {
        log.info("User signup request: {}", request.getUserId());
        return ResponseEntity.ok(ApiResponse.success(userService.signup(request)));
    }

    // [2026-09-25 DIP D1] 미인증 요청이 로그인 ID 의 존재를 확인할 수 있는 계정 열거 경로였다.
    @Operation(summary = "아이디 중복 확인", description = "사용자 아이디가 시스템에 이미 존재하는지 확인합니다. "
            + "사용자 등록 권한(USER_CREATE)이 필요합니다.")
    @GetMapping("/users/check-id")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#checkIdDplct')")
    public ResponseEntity<ApiResponse<Boolean>> checkIdDplct(@RequestParam String userId) {
        return ResponseEntity.ok(ApiResponse.success(userService.checkIdDplct(userId)));
    }

    /**
     * 담당자 지정 UI(부서 업무 등록·수정 등)를 위한 사용자 검색.
     *
     * <p>종전에는 사용자 목록 API 가 아래 {@code /admin/system/users}(관리자 전용) 하나뿐이라
     * 담당자 선택 UI 를 만들 수 없었다. 그 경로를 일반 사용자에게 개방하는 대안은 기각됐다 —
     * {@code UserDto} 는 주소·휴대폰·이메일·생년월일까지 실어 나르는 전체 인적사항 레코드라
     * 담당자 한 명 고르자고 전 직원 개인정보를 여는 꼴이 되기 때문이다.
     *
     * <p>대신 <b>최소 정보만</b>({@link UserSearchDto} — esntlId·성명·부서명) 돌려주는 전용 창구를 둔다.
     * 인가는 로그인 사용자 전체(operation binding {@code AUTHENTICATED})이고, 인명부 전량 수집은
     * 검색어 최소 길이·건수 상한·offset 부재로 서비스 레이어에서 막는다
     * ({@code UserService#searchAssignableUsers}).
     *
     * <p>응답을 {@code PageResponse} 로 감싸지 않은 것은 의도다. 페이지 번호를 받는 순간
     * 넘겨가며 전부 긁는 경로가 생기고, 총 건수는 그 자체로 조직 규모 정보다.
     */
    @Operation(summary = "담당자 검색", description = """
            담당자 지정용 사용자 검색. 성명 부분일치로 조회하며 식별자·성명·부서명만 반환합니다.
            검색어는 2자 이상이어야 하고(미달 시 빈 목록), 최대 20건까지만 반환합니다.
            개인정보(연락처·이메일·주소·생년월일)는 포함하지 않습니다.""")
    @GetMapping("/users/search")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#searchAssignableUsers')")
    public ResponseEntity<ApiResponse<List<UserSearchDto>>> searchAssignableUsers(
            @Parameter(description = "성명 검색어(2자 이상)") @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.success(userService.searchAssignableUsers(keyword)));
    }

    // --- [관리자 전용 기능] /api/v1/admin/system/users ---

    @Operation(summary = "사용자 목록 조회", description = "전체 사용자 목록을 페이징하여 조회합니다. "
            + "계정 상태(userSttsCd: P 정상·A 승인 대기·D 비활성)·소속 부서(ognzId, 직속만)·로그인 잠금(lckYn: Y·N)으로 좁힐 수 있고, "
            + "어휘 밖 값은 400 입니다.")
    @PrivacyAccess("사용자 목록(생년월일·휴대전화·이메일·주소)")
    @GetMapping("/admin/system/users")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#getUsers')")
    public ResponseEntity<ApiResponse<PageResponse<UserDto>>> getUsers(
            @RequestParam(required = false) String searchKeyword,
            @RequestParam(required = false) String userSttsCd,
            @RequestParam(required = false) String ognzId,
            @RequestParam(required = false) String lckYn,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<UserDto> result = userService.getPagedUserList(searchKeyword,
                UserListFilter.of(userSttsCd, ognzId, lckYn), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    /**
     * 부서 단위 수신자 선택(2026-09-27 DIP B5 F5). 메일·문자·알림 발송 화면의 수신자 피커가 한 부서를 통째로 고를 때 쓴다.
     *
     * <p>관리자 사용자 목록({@link #getUsers})과 같은 권한(USER_READ)이다 — 그 목록이 같은 사람을 연락처까지 실어 보여 주므로
     * 권한을 넓히지 않는다. 응답은 {@link UserSearchDto} 최소 필드라 개인정보 접근이 아니다(연락처는 발송 때 서버가 해석한다).
     * 일반 사용자에게 여는 {@code /users/search} 에 부서 조회를 붙이지 않은 것은 의도다 — 그 창구는 검색어·건수로 인명부 수집을 막는다.</p>
     */
    @Operation(summary = "부서 소속 수신자 조회", description = """
            한 부서의 사용 중(P) 계정인 직속 소속 인원을 성명 순으로 반환합니다(하위 부서 제외).
            식별자·성명·부서명·부재만 담고 연락처는 담지 않습니다. 최대 200명이며 넘으면 truncated 가 true 입니다.
            없는 부서는 404 입니다.""")
    @GetMapping("/admin/system/users/by-department/{ognzId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#getDepartmentRecipients')")
    public ResponseEntity<ApiResponse<DepartmentRecipientsDto>> getDepartmentRecipients(
            @Parameter(description = "부서 ID") @PathVariable String ognzId) {
        return ResponseEntity.ok(ApiResponse.success(userService.getDepartmentRecipients(ognzId)));
    }

    @Operation(summary = "사용자 상세 조회", description = "특정 사용자 ID에 해당하는 상세 정보를 조회합니다.")
    @PrivacyAccess("사용자 상세(생년월일·휴대전화·이메일·주소)")
    @GetMapping("/admin/system/users/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#getUser')")
    public ResponseEntity<ApiResponse<UserDto>> getUser(
            @Parameter(description = "사용자 ID") @PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(userId)));
    }

    // [2026-08-11] 등록만 비밀번호 제약(OnCreate)을 함께 요구한다.
    //   ⚠ `@Validated(OnCreate.class)` 단독으로 쓰면 **기본 그룹의 모든 제약(@Size·@Pattern 등)이
    //     통째로 꺼진다.** Default 를 반드시 함께 명시할 것.
    @Operation(summary = "사용자 등록", description = "새로운 시스템 사용자를 등록합니다. (관리자 권한)")
    @PostMapping("/admin/system/users")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#insertUser')")
    public ResponseEntity<ApiResponse<String>> insertUser(
            @RequestBody @Validated({ Default.class, UserValidationGroups.OnCreate.class }) UserDto dto) {
        // [2026-08-11] DTO 를 통째로 넘긴다. 종전에는 6개 필드만 뽑아 넘겨서 폼이 보낸
        //   이메일·연락처·소속 부서가 서비스에 **도달조차 하지 못했다**(UserService.registerUser 주석 참조).
        String resultId = userService.registerUser(dto);
        return ResponseEntity.ok(ApiResponse.success(resultId));
    }


    @Operation(summary = "사용자 정보 수정",
            description = "기존 시스템 사용자의 정보를 수정합니다. (관리자 권한) "
                    + "사용자 식별자는 경로가 소유하며 비밀번호 변경은 PATCH /admin/system/users/{userId}/password를 사용합니다.")
    @PutMapping("/admin/system/users/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#updateUser')")
    public ResponseEntity<ApiResponse<Void>> updateUser(
            @PathVariable String userId,
            @RequestBody @Valid UserProfileUpdateRequest request) {
        userService.updateUser(userId, request.toUserDto());
        return ResponseEntity.ok(ApiResponse.success(null));
    }


    @Operation(summary = "사용자 삭제", description = "시스템에서 사용자를 삭제합니다. (관리자 권한)")
    @DeleteMapping("/admin/system/users/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#deleteUser')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @Parameter(description = "사용자 ID") @PathVariable String userId) {
        userService.deleteUser(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 다중 삭제", description = "시스템에서 여러 명의 사용자를 한꺼번에 삭제합니다. (관리자 권한)")
    @DeleteMapping("/admin/system/users")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#deleteUsers')")
    public ResponseEntity<ApiResponse<Void>> deleteUsers(@RequestBody List<String> userIds) {
        userService.deleteUserList(userIds);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "비밀번호 강제 변경", description = "특정 사용자의 비밀번호를 관리자 권한으로 변경합니다.")
    @nuri.foundation.core.annotation.SensitiveOperation("관리자 비밀번호 초기화")
    @PatchMapping("/admin/system/users/{userId}/password")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#updatePasswordByAdmin')")
    public ResponseEntity<ApiResponse<Void>> updatePasswordByAdmin(
            @PathVariable String userId,
            @RequestBody @Valid AdminPasswordChangeRequest request) {
        userService.updatePasswordByAdmin(userId, request.newPassword());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "계정 잠금 해제", description = "연속 로그인 실패로 잠긴 계정의 잠금을 풉니다. 비밀번호와 세션은 바꾸지 않습니다. (관리자 권한)")
    @PatchMapping("/admin/system/users/{userId}/unlock")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#unlockUser')")
    public ResponseEntity<ApiResponse<Void>> unlockUser(@PathVariable String userId) {
        userService.unlockUser(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 상태 일괄 변경", description = "여러 명의 사용자 상태를 한꺼번에 변경합니다. (관리자 권한)")
    @PatchMapping("/admin/system/users/status")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#updateUsersStatus')")
    public ResponseEntity<ApiResponse<Void>> updateUsersStatus(
            @RequestBody @Valid BulkStatusRequest request) {
        userService.updateUsersStatus(request.getUserIds(), request.getStatus());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 부서 일괄 이동", description = "여러 명의 사용자 소속 부서를 한꺼번에 변경합니다. (관리자 권한)")
    @PatchMapping("/admin/system/users/dept")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#moveUsersToDept')")
    public ResponseEntity<ApiResponse<Void>> moveUsersToDept(
            @RequestBody @Valid BulkDeptMoveRequest request) {
        userService.moveUsersToDept(request.getUserIds(), request.getOgnzId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 권한 일괄 변경", description = "여러 명의 사용자 권한을 한꺼번에 변경합니다. (관리자 권한)")
    @PatchMapping("/admin/system/users/role")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.UserApiController#updateUsersRole')")
    public ResponseEntity<ApiResponse<Void>> updateUsersRole(
            @RequestBody @Valid BulkRoleRequest request) {
        userService.updateUsersRole(request.getUserIds(), request.getRole());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

}
