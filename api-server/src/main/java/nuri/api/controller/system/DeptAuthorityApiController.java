package nuri.api.controller.system;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.auth.DeptAuthorProjection;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.auth.UserAuthorityManageService;
import nuri.business.service.auth.dto.DeptAuthorBatchRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 부서별 권한 매핑 관리 API 컨트롤러 (Admin)
 * /api/v1/admin/system/dept-authorities 경로로 매핑하여 프론트엔드와 맞춤
 */
@Tag(name = "Department-Authority Mapping", description = "시스템 부서별 권한 할당 관리 API (Admin)")
@Slf4j
@RestController("apiServerDeptAuthorityApiController")
@RequestMapping("/api/v1/admin/system/dept-authorities")
@RequiredArgsConstructor
public class DeptAuthorityApiController {

    private final UserAuthorityManageService userAuthorityManageService;

    @Operation(summary = "부서별 권한 목록 조회", description = "특정 부서 내 사용자들의 권한 할당 상태를 조회합니다.")
    @GetMapping("/{deptId}")
    public ResponseEntity<ApiResponse<PageResponse<DeptAuthorProjection>>> getDeptAuthorities(
            @PathVariable String deptId,
            @ModelAttribute BaseSearchDto searchDto) {

        Page<DeptAuthorProjection> result = userAuthorityManageService.selectDeptAuthorityList(deptId, searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                result.getContent(),
                result.getNumber() + 1,
                result.getSize(),
                (int) result.getTotalElements()
        )));
    }

    @Operation(summary = "부서 사용자 권한 일괄 저장", description = "해당 부서 사용자들에 대해 권한을 일괄 할당하거나 업데이트합니다.")
    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<Void>> saveDeptUserAuthorities(
            @Valid @RequestBody DeptAuthorBatchRequest request) {

        userAuthorityManageService.saveDeptAuthorities(request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
