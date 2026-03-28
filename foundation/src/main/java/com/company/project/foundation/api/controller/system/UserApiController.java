package com.company.project.foundation.api.controller.system;

import com.company.project.foundation.core.response.ApiResponse;
import com.company.project.foundation.core.response.PageResponse;
import com.company.project.foundation.service.user.UserService;
import com.company.project.foundation.service.user.dto.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 시스템 사용자 관리 API 컨트롤러 (Admin 전용)
 */
@Tag(name = "User Management", description = "시스템 사용자 관리 API (Admin)")
@RestController("systemUserApiController")
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class UserApiController {

    private final UserService userService;

    @Operation(summary = "사용자 목록 조회", description = "시스템 사용자 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<UserDto>>> getUsers(
            @PageableDefault(size = 10) Pageable pageable) {
        Page<UserDto> result = userService.getPagedUserList(pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "사용자 상세 조회", description = "특정 사용자 ID에 해당하는 상세 정보를 조회합니다.")
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserDto>> getUser(
            @Parameter(description = "사용자 ID") @PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(userId)));
    }

    @Operation(summary = "사용자 등록", description = "새로운 시스템 사용자를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> insertUser(@RequestBody UserDto dto) {
        String resultId = userService.registerUser(
            dto.getUserId(), 
            dto.getPassword(), 
            dto.getUserNm(), 
            dto.getPasswordHint(), 
            dto.getPasswordCnsr(), 
            dto.getRole() != null ? com.company.project.foundation.domain.user.entity.Role.valueOf(dto.getRole()) : null
        );
        return ResponseEntity.ok(ApiResponse.success(resultId));
    }

    @Operation(summary = "사용자 정보 수정", description = "기존 시스템 사용자의 정보를 수정합니다.")
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> updateUser(
            @PathVariable String userId,
            @RequestBody UserDto dto) {
        userService.updateUser(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 삭제", description = "시스템에서 사용자를 삭제합니다.")
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @Parameter(description = "사용자 ID") @PathVariable String userId) {
        userService.deleteUser(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 다중 삭제", description = "시스템에서 여러 명의 사용자를 한꺼번에 삭제합니다.")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteUsers(@RequestBody List<String> userIds) {
        userService.deleteUserList(userIds);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "비밀번호 변경", description = "특정 사용자의 비밀번호를 관리자 권한으로 변경합니다.")
    @PatchMapping("/{userId}/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @PathVariable String userId,
            @RequestBody java.util.Map<String, String> request) {
        userService.updatePasswordByAdmin(userId, request.get("newPassword"));
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "아이디 중복 확인", description = "사용자 아이디가 시스템에 이미 존재하는지 확인합니다.")
    @GetMapping("/check-id")
    public ResponseEntity<ApiResponse<Boolean>> checkIdDplct(@RequestParam String userId) {
        return ResponseEntity.ok(ApiResponse.success(userService.checkIdDplct(userId)));
    }
}
