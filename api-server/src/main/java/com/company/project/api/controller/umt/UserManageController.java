package com.company.project.api.controller.umt;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.user.UserManageService;
import com.company.project.service.user.dto.UserManageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "UserManage", description = "Internal User Management APIs")
@RestController
@RequestMapping("/api/v1/manage/users")
@RequiredArgsConstructor
public class UserManageController {

    private final UserManageService userManageService;

    @Operation(summary = "업무 사용자 목록 조회", description = "시스템 업무 사용자 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<UserManageDto>>> getUsers(
            @PageableDefault(size = 10) Pageable pageable) {
        // Current implementation returns List, could be updated to Page
        return ResponseEntity.ok(ApiResponse.success(userManageService.selectUserList(new egovframework.com.cmm.ComDefaultVO())));
    }

    @Operation(summary = "업무 사용자 상세 조회", description = "특정 업무 사용자의 상세 정보를 조회합니다.")
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserManageDto>> getUser(
            @Parameter(description = "사용자 ID") @PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(userManageService.selectUser(userId)));
    }

    @Operation(summary = "업무 사용자 등록", description = "새로운 업무 사용자를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertUser(
            @RequestBody UserManageDto dto) {
        userManageService.insertUser(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "업무 사용자 수정", description = "기존 업무 사용자 정보를 수정합니다.")
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> updateUser(
            @PathVariable String userId,
            @RequestBody UserManageDto dto) {
        dto.setUserId(userId);
        userManageService.updateUser(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "업무 사용자 삭제", description = "특정 업무 사용자를 삭제합니다.")
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable String userId) {
        userManageService.deleteUser(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "아이디 중복 확인", description = "사용자 아이디 중복 여부를 확인합니다.")
    @GetMapping("/check-id")
    public ResponseEntity<ApiResponse<Boolean>> checkIdDplct(
            @RequestParam String userId) {
        return ResponseEntity.ok(ApiResponse.success(userManageService.checkIdDplct(userId) > 0));
    }
}
