package nuri.api.controller;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import nuri.business.security.annotation.LoginUser;
import nuri.business.security.service.CustomUserDetails;
import nuri.business.service.user.EgovUserService;
import nuri.business.service.user.dto.*;
import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    private final EgovUserService userService;

    // --- [일반 사용자 기능] /api/v1/users ---

    @Operation(summary = "내 프로필 조회", description = "현재 로그인한 사용자의 프로필 정보를 조회합니다.")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/users/me")
    public ResponseEntity<ApiResponse<UserDto>> getMe(@LoginUser CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(userDetails.getUserId())));
    }

    @Operation(summary = "내 프로필 수정", description = "현재 로그인한 사용자의 프로필 정보를 수정합니다.")
    @PreAuthorize("isAuthenticated()")
    @PutMapping("/users/me")
    public ResponseEntity<ApiResponse<Void>> updateMe(
            @LoginUser CustomUserDetails userDetails,
            @RequestBody @Valid UserDto userDto) {
        userService.updateUser(userDetails.getUserId(), userDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "비밀번호 변경", description = "현재 로그인한 사용자의 비밀번호를 변경합니다.")
    @PreAuthorize("isAuthenticated()")
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
    @PreAuthorize("permitAll()")
    @PostMapping("/users/signup")
    public ResponseEntity<ApiResponse<UserResponse>> signup(@RequestBody @Valid UserSignupRequest request) {
        log.info("User signup request: {}", request.getUserId());
        return ResponseEntity.ok(ApiResponse.success(userService.signup(request)));
    }

    @Operation(summary = "아이디 중복 확인", description = "사용자 아이디가 시스템에 이미 존재하는지 확인합니다.")
    @PreAuthorize("permitAll()")
    @GetMapping("/users/check-id")
    public ResponseEntity<ApiResponse<Boolean>> checkIdDplct(@RequestParam String userId) {
        return ResponseEntity.ok(ApiResponse.success(userService.checkIdDplct(userId)));
    }

    // --- [관리자 전용 기능] /api/v1/admin/system/users ---

    @Operation(summary = "사용자 목록 조회", description = "전체 사용자 목록을 페이징하여 조회합니다.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/system/users")
    public ResponseEntity<ApiResponse<PageResponse<UserDto>>> getUsers(
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<UserDto> result = userService.getPagedUserList(searchKeyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "사용자 상세 조회", description = "특정 사용자 ID에 해당하는 상세 정보를 조회합니다.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/system/users/{userId}")
    public ResponseEntity<ApiResponse<UserDto>> getUser(
            @Parameter(description = "사용자 ID") @PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(userId)));
    }

    @Operation(summary = "사용자 등록", description = "새로운 시스템 사용자를 등록합니다. (관리자 권한)")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/admin/system/users")
    public ResponseEntity<ApiResponse<String>> insertUser(@RequestBody @Valid UserDto dto) {
        String resultId = userService.registerUser(
                dto.userId(),
                dto.pswd(),
                dto.userNm(),
                dto.pswdHint(),
                dto.pswdCrans(),
                dto.role());
        return ResponseEntity.ok(ApiResponse.success(resultId));
    }


    @Operation(summary = "사용자 정보 수정", description = "기존 시스템 사용자의 정보를 수정합니다. (관리자 권한)")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/admin/system/users/{userId}")
    public ResponseEntity<ApiResponse<Void>> updateUser(
            @PathVariable String userId,
            @RequestBody @Valid UserDto dto) {
        userService.updateUser(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }


    @Operation(summary = "사용자 삭제", description = "시스템에서 사용자를 삭제합니다. (관리자 권한)")
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/admin/system/users/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @Parameter(description = "사용자 ID") @PathVariable String userId) {
        userService.deleteUser(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 다중 삭제", description = "시스템에서 여러 명의 사용자를 한꺼번에 삭제합니다. (관리자 권한)")
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/admin/system/users")
    public ResponseEntity<ApiResponse<Void>> deleteUsers(@RequestBody List<String> userIds) {
        userService.deleteUserList(userIds);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "비밀번호 강제 변경", description = "특정 사용자의 비밀번호를 관리자 권한으로 변경합니다.")
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/admin/system/users/{userId}/password")
    public ResponseEntity<ApiResponse<Void>> updatePasswordByAdmin(
            @PathVariable String userId,
            @RequestBody @Valid AdminPasswordChangeRequest request) {
        userService.updatePasswordByAdmin(userId, request.newPassword());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 상태 일괄 변경", description = "여러 명의 사용자 상태를 한꺼번에 변경합니다. (관리자 권한)")
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/admin/system/users/status")
    public ResponseEntity<ApiResponse<Void>> updateUsersStatus(
            @RequestBody @Valid BulkStatusRequest request) {
        userService.updateUsersStatus(request.getUserIds(), request.getStatus());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 부서 일괄 이동", description = "여러 명의 사용자 소속 부서를 한꺼번에 변경합니다. (관리자 권한)")
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/admin/system/users/dept")
    public ResponseEntity<ApiResponse<Void>> moveUsersToDept(
            @RequestBody @Valid BulkDeptMoveRequest request) {
        userService.moveUsersToDept(request.getUserIds(), request.getOgnzId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 권한 일괄 변경", description = "여러 명의 사용자 권한을 한꺼번에 변경합니다. (관리자 권한)")
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/admin/system/users/role")
    public ResponseEntity<ApiResponse<Void>> updateUsersRole(
            @RequestBody @Valid BulkRoleRequest request) {
        userService.updateUsersRole(request.getUserIds(), request.getRole());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

}
