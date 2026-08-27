package nuri.api.controller.foundation.controller.system;

import jakarta.validation.Valid;
import nuri.business.domain.common.BaseSearchDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.auth.RoleManageService;
import nuri.business.service.auth.dto.RoleManageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 시스템 권한(Role) 관리 API 컨트롤러
 */
@Tag(name = "Role Management", description = "시스템 권한(Role) 관리 API (Admin)")
@Slf4j
@RestController("systemRoleApiController")
@RequestMapping("/api/v1/admin/system/roles")
@RequiredArgsConstructor
public class RoleApiController {

    private final RoleManageService roleManageService;

    @Operation(summary = "롤 목록 조회", description = "시스템에 정의된 전체 권한(Role) 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<RoleManageDto>>> getRoles(
            @ModelAttribute BaseSearchDto searchDto) {

        // 목록과 총건수를 한 질의에서 얻는다. 종전에는 검색어를 무시한 전체 count() 가 총건수였다.
        Page<RoleManageDto> page = roleManageService.selectRoleList(searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "롤 상세 조회", description = "특정 권한(Role)의 상세 정보를 조회합니다.")
    @GetMapping("/{roleCode}")
    public ResponseEntity<ApiResponse<RoleManageDto>> getRole(@PathVariable String roleCode) {
        return ResponseEntity.ok(ApiResponse.success(roleManageService.selectRole(roleCode)));
    }

    @Operation(summary = "롤 등록", description = "새로운 시스템 권한(Role)을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createRole(@Valid @RequestBody RoleManageDto dto) {
        roleManageService.insertRole(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "롤 수정", description = "기존 시스템 권한(Role) 정보를 수정합니다.")
    @PutMapping("/{roleCode}")
    public ResponseEntity<ApiResponse<Void>> updateRole(
            @PathVariable String roleCode,
            @Valid @RequestBody RoleManageDto dto) {
        dto.setRoleId(roleCode);
        roleManageService.updateRole(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "롤 삭제", description = "시스템 권한(Role) 정보를 삭제합니다.")
    @DeleteMapping("/{roleCode}")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable String roleCode) {
        roleManageService.deleteRole(roleCode);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "롤 다중 삭제", description = "여러 권한(Role) 정보를 한꺼번에 삭제합니다.")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteRoles(@RequestBody List<String> roleCodes) {
        roleManageService.deleteRoles(roleCodes.toArray(new String[0]));
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
