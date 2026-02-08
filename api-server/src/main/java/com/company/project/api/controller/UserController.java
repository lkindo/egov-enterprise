package com.company.project.api.controller;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "User", description = "User Management APIs")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "Signup")
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<UserResponse>> signup(@RequestBody @Valid UserSignupRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userService.signup(request)));
    }

    @Operation(summary = "Get All Users")
    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<UserDto>>> getUserList() {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserList()));
    }
}
