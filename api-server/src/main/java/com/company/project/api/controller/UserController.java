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

import org.springframework.data.domain.Page;

import org.springframework.data.domain.PageRequest;

import org.springframework.data.domain.Pageable;

import org.springframework.data.domain.Sort;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.security.core.userdetails.UserDetails;

@Tag(name = "User", description = "User Management APIs")

@RestController

@RequestMapping("/api/v1/users")

@RequiredArgsConstructor

public class UserController {

    private final UserService userService;

@Operation(summary = "Get Current User Profile")

    @GetMapping("/me")

    public ResponseEntity<ApiResponse<UserDto>> getMe(@AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(userDetails.getUsername())));

    }

@Operation(summary = "Update Current User Profile")

    @PutMapping("/me")

    public ResponseEntity<ApiResponse<Void>> updateMe(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody UserDto userDto) {

        userService.updateUser(userDetails.getUsername(), userDto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Change Password")

    @PutMapping("/me/password")

    public ResponseEntity<ApiResponse<Void>> changePassword(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody java.util.Map<String, String> request) {

        userService.changePassword(

                userDetails.getUsername(),

                request.get("oldPassword"),

                request.get("newPassword")

        );

        return ResponseEntity.ok(ApiResponse.success(null));

    }

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

@Operation(summary = "Get Paged Users")

    @GetMapping("/paged")

    public ResponseEntity<ApiResponse<Page<UserDto>>> getPagedUserList(

            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "10") int size,

            @RequestParam(defaultValue = "userId") String sortBy,

            @RequestParam(defaultValue = "asc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        return ResponseEntity.ok(ApiResponse.success(userService.getPagedUserList(pageable)));

    }

}
