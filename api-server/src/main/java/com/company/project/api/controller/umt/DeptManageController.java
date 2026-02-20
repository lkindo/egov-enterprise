package com.company.project.api.controller.umt;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.user.EgovDeptManageService;

import com.company.project.service.user.dto.DeptManageDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Department", description = "Department (Organization) Management APIs")

@RestController

@RequestMapping("/api/v1/departments")

@RequiredArgsConstructor

public class DeptManageController {

    private final EgovDeptManageService deptManageService;

@Operation(summary = "?     ??            ?         ??", description = "?         ???     ??            ?             ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<DeptManageDto>>> getDepartments(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(deptManageService.getDeptManageList(keyword, pageable)));

    }

@Operation(summary = "?     ???                   ??", description = "?     ???     ??       ?          ?         ??         ???      ??")

    @GetMapping("/{orgnztId}")

    public ResponseEntity<ApiResponse<DeptManageDto>> getDepartment(

            @Parameter(description = "            ?ID") @PathVariable String orgnztId) {

        return ResponseEntity.ok(ApiResponse.success(deptManageService.getDeptManage(orgnztId)));

    }

@Operation(summary = "?     ???         ", description = "??      ???     ??? ?         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertDepartment(

            @RequestBody DeptManageDto dto) {

        deptManageService.insertDeptManage(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "?     ????      ", description = "         ???     ???         ????      ??      ??")

    @PutMapping("/{orgnztId}")

    public ResponseEntity<ApiResponse<Void>> updateDepartment(

            @PathVariable String orgnztId,

            @RequestBody DeptManageDto dto) {

        dto.setOrgnztId(orgnztId);

        deptManageService.updateDeptManage(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "?     ??????", description = "?     ???     ??? ?????      ??")

    @DeleteMapping("/{orgnztId}")

    public ResponseEntity<ApiResponse<Void>> deleteDepartment(

            @PathVariable String orgnztId) {

        deptManageService.deleteDeptManage(orgnztId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

