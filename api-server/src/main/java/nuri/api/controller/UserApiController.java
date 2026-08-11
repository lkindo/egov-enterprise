package nuri.api.controller;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.security.annotation.LoginUser;
import nuri.foundation.security.service.CustomUserDetails;
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
import nuri.foundation.security.annotation.Authenticated;
import nuri.foundation.security.annotation.PublicApi;
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
    @Authenticated
    @GetMapping("/users/me")
    public ResponseEntity<ApiResponse<UserDto>> getMe(@LoginUser CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(userDetails.getUserId())));
    }

    // ⚠ 스펙 주의: 요청 본문 스키마(UserDto)의 required 에는 `pswd` 가 남아 있다 — springdoc 이
    //   Bean Validation **그룹을 반영하지 않아** @NotBlank 만 보고 표시하기 때문이다. 이 엔드포인트는
    //   등록과 스키마를 공유할 뿐이며 비밀번호를 요구하지도, 사용하지도 않는다. 스키마가 그 차이를
    //   표현하지 못하므로 설명에 명시한다(스펙이 거짓을 말하게 두지 않는다).
    @Operation(summary = "내 프로필 수정",
            description = "현재 로그인한 사용자의 프로필 정보를 수정합니다. "
                    + "비밀번호는 이 API 의 대상이 아니며 보내더라도 무시됩니다(변경은 PUT /users/me/password). "
                    + "스키마의 required 에 pswd 가 표시되는 것은 등록과 스키마를 공유하기 때문이며, 실제로 요구되지 않습니다.")
    @Authenticated
    @PutMapping("/users/me")
    public ResponseEntity<ApiResponse<Void>> updateMe(
            @LoginUser CustomUserDetails userDetails,
            @RequestBody @Valid UserDto userDto) {
        userService.updateUser(userDetails.getUserId(), userDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "비밀번호 변경", description = "현재 로그인한 사용자의 비밀번호를 변경합니다.")
    @Authenticated
    @PutMapping("/users/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @LoginUser CustomUserDetails userDetails,
            @RequestBody @Valid PasswordChangeRequest request) {
        userService.changePassword(
                userDetails.getUserId(),
                request.getOldPassword(),
                request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success(null));
    }


    @Operation(summary = "회원가입", description = "새로운 사용자 계정을 생성합니다.")
    @PublicApi
    @PostMapping("/users/signup")
    public ResponseEntity<ApiResponse<UserResponse>> signup(@RequestBody @Valid UserSignupRequest request) {
        log.info("User signup request: {}", request.getUserId());
        return ResponseEntity.ok(ApiResponse.success(userService.signup(request)));
    }

    @Operation(summary = "아이디 중복 확인", description = "사용자 아이디가 시스템에 이미 존재하는지 확인합니다.")
    @PublicApi
    @GetMapping("/users/check-id")
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
     * 인가는 {@code @Authenticated}(로그인 사용자)이고, 인명부 전량 수집은
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
    @Authenticated
    @GetMapping("/users/search")
    public ResponseEntity<ApiResponse<List<UserSearchDto>>> searchAssignableUsers(
            @Parameter(description = "성명 검색어(2자 이상)") @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.success(userService.searchAssignableUsers(keyword)));
    }

    // --- [관리자 전용 기능] /api/v1/admin/system/users ---

    @Operation(summary = "사용자 목록 조회", description = "전체 사용자 목록을 페이징하여 조회합니다.")
    @GetMapping("/admin/system/users")
    public ResponseEntity<ApiResponse<PageResponse<UserDto>>> getUsers(
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<UserDto> result = userService.getPagedUserList(searchKeyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "사용자 상세 조회", description = "특정 사용자 ID에 해당하는 상세 정보를 조회합니다.")
    @GetMapping("/admin/system/users/{userId}")
    public ResponseEntity<ApiResponse<UserDto>> getUser(
            @Parameter(description = "사용자 ID") @PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(userId)));
    }

    // [2026-08-11] 등록만 비밀번호 제약(OnCreate)을 함께 요구한다.
    //   ⚠ `@Validated(OnCreate.class)` 단독으로 쓰면 **기본 그룹의 모든 제약(@Size·@Pattern 등)이
    //     통째로 꺼진다.** Default 를 반드시 함께 명시할 것.
    @Operation(summary = "사용자 등록", description = "새로운 시스템 사용자를 등록합니다. (관리자 권한)")
    @PostMapping("/admin/system/users")
    public ResponseEntity<ApiResponse<String>> insertUser(
            @RequestBody @Validated({ Default.class, UserValidationGroups.OnCreate.class }) UserDto dto) {
        String resultId = userService.registerUser(
                dto.userId(),
                dto.pswd(),
                dto.userNm(),
                dto.pswdHint(),
                dto.pswdCrans(),
                dto.role());
        return ResponseEntity.ok(ApiResponse.success(resultId));
    }


    // ⚠ 위 updateMe 와 동일 — 스키마 required 의 pswd 는 등록과의 공유 산물이며 이 경로는 요구하지 않는다.
    @Operation(summary = "사용자 정보 수정",
            description = "기존 시스템 사용자의 정보를 수정합니다. (관리자 권한) "
                    + "비밀번호는 이 API 의 대상이 아니며 보내더라도 무시됩니다(변경은 PATCH /admin/system/users/{userId}/password). "
                    + "스키마의 required 에 pswd 가 표시되는 것은 등록과 스키마를 공유하기 때문이며, 실제로 요구되지 않습니다.")
    @PutMapping("/admin/system/users/{userId}")
    public ResponseEntity<ApiResponse<Void>> updateUser(
            @PathVariable String userId,
            @RequestBody @Valid UserDto dto) {
        userService.updateUser(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }


    @Operation(summary = "사용자 삭제", description = "시스템에서 사용자를 삭제합니다. (관리자 권한)")
    @DeleteMapping("/admin/system/users/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @Parameter(description = "사용자 ID") @PathVariable String userId) {
        userService.deleteUser(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 다중 삭제", description = "시스템에서 여러 명의 사용자를 한꺼번에 삭제합니다. (관리자 권한)")
    @DeleteMapping("/admin/system/users")
    public ResponseEntity<ApiResponse<Void>> deleteUsers(@RequestBody List<String> userIds) {
        userService.deleteUserList(userIds);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "비밀번호 강제 변경", description = "특정 사용자의 비밀번호를 관리자 권한으로 변경합니다.")
    @PatchMapping("/admin/system/users/{userId}/password")
    public ResponseEntity<ApiResponse<Void>> updatePasswordByAdmin(
            @PathVariable String userId,
            @RequestBody @Valid AdminPasswordChangeRequest request) {
        userService.updatePasswordByAdmin(userId, request.newPassword());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 상태 일괄 변경", description = "여러 명의 사용자 상태를 한꺼번에 변경합니다. (관리자 권한)")
    @PatchMapping("/admin/system/users/status")
    public ResponseEntity<ApiResponse<Void>> updateUsersStatus(
            @RequestBody @Valid BulkStatusRequest request) {
        userService.updateUsersStatus(request.getUserIds(), request.getStatus());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 부서 일괄 이동", description = "여러 명의 사용자 소속 부서를 한꺼번에 변경합니다. (관리자 권한)")
    @PatchMapping("/admin/system/users/dept")
    public ResponseEntity<ApiResponse<Void>> moveUsersToDept(
            @RequestBody @Valid BulkDeptMoveRequest request) {
        userService.moveUsersToDept(request.getUserIds(), request.getOgnzId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 권한 일괄 변경", description = "여러 명의 사용자 권한을 한꺼번에 변경합니다. (관리자 권한)")
    @PatchMapping("/admin/system/users/role")
    public ResponseEntity<ApiResponse<Void>> updateUsersRole(
            @RequestBody @Valid BulkRoleRequest request) {
        userService.updateUsersRole(request.getUserIds(), request.getRole());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

}
