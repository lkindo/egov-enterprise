package com.company.project.api.controller.system.usermanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.usermanagement.EgovDeptManageService;
import com.company.project.service.usermanagement.dto.DeptManageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Department Management (Admin)", description = "부서/조직 관리 API (관리자용)")
@RestController
@RequestMapping("/api/v1/admin/system/departments")
@RequiredArgsConstructor
public class DeptManageController {

    private final EgovDeptManageService deptManageService;

    @Operation(summary = "부서 목록 조회", description = "시스템에 등록된 부서 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<DeptManageDto>>> getDepartments(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(deptManageService.getDeptManageList(keyword, pageable)));
    }

    @Operation(summary = "부서 상세 조회", description = "특정 부서 ID의 상세 정보를 조회합니다.")
    @GetMapping("/{orgnztId}")
    public ResponseEntity<ApiResponse<DeptManageDto>> getDepartment(
            @PathVariable String orgnztId) {
        return ResponseEntity.ok(ApiResponse.success(deptManageService.getDeptManage(orgnztId)));
    }

    @Operation(summary = "부서 등록", description = "새로운 부서 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertDepartment(
            @RequestBody DeptManageDto dto) {
        deptManageService.insertDeptManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "부서 수정", description = "기존 부서 정보를 수정합니다.")
    @PutMapping("/{orgnztId}")
    public ResponseEntity<ApiResponse<Void>> updateDepartment(
            @PathVariable String orgnztId,
            @RequestBody DeptManageDto dto) {
        dto.setOrgnztId(orgnztId);
        deptManageService.updateDeptManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "부서 삭제", description = "부서 정보를 삭제합니다.")
    @DeleteMapping("/{orgnztId}")
    public ResponseEntity<ApiResponse<Void>> deleteDepartment(
            @PathVariable String orgnztId) {
        deptManageService.deleteDeptManage(orgnztId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}