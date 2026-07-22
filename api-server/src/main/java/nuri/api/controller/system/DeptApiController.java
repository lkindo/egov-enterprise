package nuri.api.controller.system;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.department.DeptManageService;
import nuri.business.service.department.dto.DeptManageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
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
public class DeptApiController {

    private final DeptManageService deptManageService;

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

    /**
     * 조직도(트리) 전용 전량 조회. 조직도는 페이징과 본질적으로 상극이므로 Pageable.unpaged() 로 전량을 반환한다.
     * 프론트엔드가 size=1000 같은 임의값에 의존하지 않게 하여, 부서가 늘어나도 누락 없이 트리를 구성할 수 있다.
     * (D-11: 종전에는 size=10 기본값으로 11건 초과 시 트리가 잘렸고, 계층 저장 시 sortOrdr 충돌 위험이 잠복했다.)
     */
    @Operation(summary = "부서 전량 조회 (조직도 트리용)", description = "페이징 없이 전체 부서 목록을 조회합니다. 조직도 편집 화면 전용.")
    @GetMapping("/tree")
    public ResponseEntity<ApiResponse<java.util.List<DeptManageDto>>> getDeptTree(
            @RequestParam(required = false) String keyword) {

        Page<DeptManageDto> result = deptManageService.getDeptManageList(keyword, Pageable.unpaged());
        return ResponseEntity.ok(ApiResponse.success(result.getContent()));
    }

    @Operation(summary = "부서 상세 조회", description = "특정 부서 ID에 해당하는 상세 정보를 조회합니다.")
    @GetMapping("/{deptId}")
    public ResponseEntity<ApiResponse<DeptManageDto>> getDept(
            @Parameter(description = "부서 ID (OgnzId)") @PathVariable String deptId) {
        return ResponseEntity.ok(ApiResponse.success(deptManageService.getDeptManage(deptId)));
    }

    @Operation(summary = "부서 등록",
            description = "새로운 시스템 부서를 등록하고 생성된 부서 ID 를 반환합니다. ognzId 는 서버가 채번하므로 보내지 않습니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> insertDept(@Valid @RequestBody DeptManageDto dto) {
        return ResponseEntity.ok(ApiResponse.success(deptManageService.insertDeptManage(dto)));
    }

    @Operation(summary = "조직 계층 일괄 저장",
            description = "조직도 편집 결과(상위 부서·정렬 순서)를 일괄 반영합니다. 각 항목의 ognzId 는 필수입니다.")
    @PutMapping("/batch-hierarchy")
    public ResponseEntity<ApiResponse<Void>> updateDeptHierarchy(@RequestBody java.util.List<DeptManageDto> items) {
        deptManageService.updateDeptHierarchy(items);
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
