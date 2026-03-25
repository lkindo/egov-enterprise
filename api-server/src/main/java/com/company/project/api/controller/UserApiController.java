package com.company.project.api.controller;

import com.company.project.foundation.core.response.ApiResponse;
import com.company.project.foundation.core.response.PageResponse;
import com.company.project.foundation.security.annotation.LoginUser;
import com.company.project.foundation.security.service.CustomUserDetails;
import com.company.project.foundation.service.user.UserService;
import com.company.project.foundation.service.user.dto.UserDto;
import com.company.project.foundation.service.user.dto.UserResponse;
import com.company.project.foundation.service.user.dto.UserSignupRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "User", description = "사용자 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserApiController {

    private final UserService userService;

    @Operation(summary = "내 프로필 조회", description = "현재 로그인한 사용자의 프로필 정보를 조회합니다.")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getMe(@LoginUser CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(userDetails.getUserId())));
    }

    @Operation(summary = "내 프로필 수정", description = "현재 로그인한 사용자의 프로필 정보를 수정합니다.")
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<Void>> updateMe(
            @LoginUser CustomUserDetails userDetails,
            @RequestBody UserDto userDto) {
        userService.updateUser(userDetails.getUserId(), userDto) ;
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "비밀번호 변경", description = "현재 로그인한 사용자의 비밀번호를 변경합니다.")
    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @LoginUser CustomUserDetails userDetails,
            @RequestBody java.util.Map<String, String> request) {
        userService.changePassword(
                userDetails.getUserId(),
                request.get("oldPassword"),
                request.get("newPassword")
        );
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "회원가입", description = "새로운 사용자 계정을 생성합니다.")
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<UserResponse>> signup(@RequestBody @Valid UserSignupRequest request) {
        log.info("User signup request: {}", request.userId());
        return ResponseEntity.ok(ApiResponse.success(userService.signup(request)));
    }

    @Operation(summary = "사용자 목록 조회 (전체)", description = "페이징 없이 모든 사용자 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<UserDto>>> getUserList() {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserList()));
    }

    @Operation(summary = "사용자 목록 조회 (페이징)", description = "사용자 목록을 페이징하여 조회합니다.")
    @GetMapping("/paged")
    public ResponseEntity<ApiResponse<PageResponse<UserDto>>> getPagedUserList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "userId") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<UserDto> result = userService.getPagedUserList(pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "사용자 상세 조회", description = "특정 사용자의 상세 정보를 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable String id) {
        log.info("User lookup request: {}", id);
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(id)));
    }

    @Operation(summary = "사용자 정보 수정", description = "관리자 권한으로 사용자 정보를 수정합니다.")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateUser(@PathVariable String id, @RequestBody UserDto userDto) {
        userService.updateUser(id, userDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 삭제", description = "사용자 계정을 삭제합니다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
