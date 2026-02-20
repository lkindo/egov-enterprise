package com.company.project.api.controller.umt;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.user.UserManageService;

import com.company.project.service.user.dto.UserManageDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import egovframework.com.cmm.ComDefaultVO;

import java.util.List;

@Tag(name = "UserManage", description = "Internal User Management APIs")

@RestController

@RequestMapping("/api/v1/manage/users")

@RequiredArgsConstructor

public class UserManageController {

    private final UserManageService userManageService;

@Operation(summary = "Get user list", description = "Retrieves a list of internal users.")

    @GetMapping

    public ResponseEntity<ApiResponse<List<UserManageDto>>> getUsers(

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(userManageService.selectUserList(new ComDefaultVO())));

    }

@Operation(summary = "Get user detail", description = "Retrieves details of a specific internal user.")

    @GetMapping("/{userId}")

    public ResponseEntity<ApiResponse<UserManageDto>> getUser(

            @Parameter(description = "User ID") @PathVariable String userId) {

        return ResponseEntity.ok(ApiResponse.success(userManageService.selectUser(userId)));

    }

@Operation(summary = "Create user", description = "Registers a new internal user.")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertUser(@RequestBody UserManageDto dto) {

        userManageService.insertUser(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Update user", description = "Updates an existing internal user.")

    @PutMapping("/{userId}")

    public ResponseEntity<ApiResponse<Void>> updateUser(

            @PathVariable String userId,

            @RequestBody UserManageDto dto) {

        dto.setUserId(userId);

        userManageService.updateUser(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete user", description = "Deletes an internal user.")

    @DeleteMapping("/{userId}")

    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String userId) {

        userManageService.deleteUser(userId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Check ID duplicate", description = "Checks if a user ID already exists.")

    @GetMapping("/check-id")

    public ResponseEntity<ApiResponse<Boolean>> checkIdDplct(@RequestParam String userId) {

        return ResponseEntity.ok(ApiResponse.success(userManageService.checkIdDplct(userId) > 0));

    }

}

