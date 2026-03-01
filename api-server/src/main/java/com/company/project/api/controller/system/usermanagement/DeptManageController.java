package com.company.project.api.controller.system.usermanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.usermanagement.EgovDeptManageService;
import com.company.project.service.usermanagement.dto.DeptManageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Department (Admin)", description = "부서/조직 관리 API (관리자용)")
@RestController
@RequestMapping("/api/v1/admin/system/departments")
@RequiredArgsConstructor
public class DeptManageController {

    private final EgovDeptManageService deptManageService;

    @Operation(summary = "遺??紐⑸줉 議고쉶", description = "?쒖뒪?쒖뿉 ?깅줉??遺??紐⑸줉???섏씠吏뺥븯??議고쉶?⑸땲??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<DeptManageDto>>> getDepartments(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(deptManageService.getDeptManageList(keyword, pageable)));
    }

    @Operation(summary = "遺???곸꽭 議고쉶", description = "?뱀젙 遺?쒖쓽 ?곸꽭 ?뺣낫瑜?議고쉶?⑸땲??")
    @GetMapping("/{orgnztId}")
    public ResponseEntity<ApiResponse<DeptManageDto>> getDepartment(
            @Parameter(description = "遺??ID") @PathVariable String orgnztId) {
        return ResponseEntity.ok(ApiResponse.success(deptManageService.getDeptManage(orgnztId)));
    }

    @Operation(summary = "遺???깅줉", description = "?덈줈??遺???뺣낫瑜??깅줉?⑸땲??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertDepartment(
            @RequestBody DeptManageDto dto) {
        deptManageService.insertDeptManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "遺???뺣낫 ?섏젙", description = "湲곗〈 遺???뺣낫瑜??섏젙?⑸땲??")
    @PutMapping("/{orgnztId}")
    public ResponseEntity<ApiResponse<Void>> updateDepartment(
            @PathVariable String orgnztId,
            @RequestBody DeptManageDto dto) {
        dto.setOrgnztId(orgnztId);
        deptManageService.updateDeptManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "遺????젣", description = "遺???뺣낫瑜???젣?⑸땲??")
    @DeleteMapping("/{orgnztId}")
    public ResponseEntity<ApiResponse<Void>> deleteDepartment(
            @PathVariable String orgnztId) {
        deptManageService.deleteDeptManage(orgnztId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
