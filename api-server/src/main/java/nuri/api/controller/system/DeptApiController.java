package nuri.api.controller.system;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.usermanagement.EgovDeptManageService;
import nuri.business.service.usermanagement.dto.DeptManageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 부서 관리 API 컨트롤러 (Admin)
 * /api/v1/admin/system/departments 경로로 매핑하여 프론트엔드와 맞춤
 */
@Tag(name = "Department Management", description = "시스템 부서 관리 API (Admin)")
@Slf4j
@RestController("apiServerDeptApiController")
@RequestMapping("/api/v1/admin/system/departments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DeptApiController {

    private final EgovDeptManageService deptManageService;

    @Operation(summary = "부서 목록 조회", description = "시스템 부서 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<DeptManageDto>>> getDepts(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {

        Page<DeptManageDto> result = deptManageService.getDeptManageList(keyword, pageable);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                result.getContent(),
                result.getNumber() + 1,
                result.getSize(),
                (int) result.getTotalElements()
        )));
    }

    @Operation(summary = "부서 상세 조회", description = "특정 부서 ID에 해당하는 상세 정보를 조회합니다.")
    @GetMapping("/{deptId}")
    public ResponseEntity<ApiResponse<DeptManageDto>> getDept(
            @Parameter(description = "부서 ID (OgnzId)") @PathVariable String deptId) {
        return ResponseEntity.ok(ApiResponse.success(deptManageService.getDeptManage(deptId)));
    }

    @Operation(summary = "부서 등록", description = "새로운 시스템 부서를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertDept(@Valid @RequestBody DeptManageDto dto) {
        deptManageService.insertDeptManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "부서 정보 수정", description = "기존 시스템 부서의 정보를 수정합니다.")
    @PutMapping("/{deptId}")
    public ResponseEntity<ApiResponse<Void>> updateDept(
            @PathVariable String deptId,
            @Valid @RequestBody DeptManageDto dto) {
        dto.setOgnzId(deptId);
        deptManageService.updateDeptManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "부서 삭제", description = "시스템에서 부서를 삭제합니다.")
    @DeleteMapping("/{deptId}")
    public ResponseEntity<ApiResponse<Void>> deleteDept(
            @Parameter(description = "부서 ID (OgnzId)") @PathVariable String deptId) {
        deptManageService.deleteDeptManage(deptId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
