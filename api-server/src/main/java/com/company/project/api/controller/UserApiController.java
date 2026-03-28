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
        userService.updateUser(userDetails.getUserId(), userDto);
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
}
