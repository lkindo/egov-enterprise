package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.auth.RoleManageService;
import com.company.project.service.auth.dto.RoleManageDto;
import egovframework.com.cmm.ComDefaultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 시스템 권한(Role) 관리 API 컨트롤러
 */
@Tag(name = "Role Management", description = "시스템 권한(Role) 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/roles")
@RequiredArgsConstructor
public class RoleApiController {

    private final RoleManageService roleManageService;

    @Operation(summary = "롤 목록 조회", description = "시스템에 정의된 전체 권한(Role) 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<RoleManageDto>>> getRoles(
            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex,
            @RequestParam(value = "searchKeyword", defaultValue = "") String searchKeyword) {

        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(pageIndex);
        searchVO.setSearchKeyword(searchKeyword);
        searchVO.setPageUnit(10);

        List<RoleManageDto> list = roleManageService.selectRoleList(searchVO);
        int total = roleManageService.selectRoleListTotCnt(searchVO);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, pageIndex, 10, total)));
    }

    @Operation(summary = "롤 상세 조회", description = "특정 권한(Role)의 상세 정보를 조회합니다.")
    @GetMapping("/{roleCode}")
    public ResponseEntity<ApiResponse<RoleManageDto>> getRole(@PathVariable String roleCode) {
        return ResponseEntity.ok(ApiResponse.success(roleManageService.selectRole(roleCode)));
    }

    @Operation(summary = "롤 등록", description = "새로운 시스템 권한(Role)을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createRole(@RequestBody RoleManageDto dto) {
        roleManageService.insertRole(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "롤 수정", description = "기존 시스템 권한(Role) 정보를 수정합니다.")
    @PutMapping("/{roleCode}")
    public ResponseEntity<ApiResponse<Void>> updateRole(
            @PathVariable String roleCode,
            @RequestBody RoleManageDto dto) {
        dto.setRoleCode(roleCode);
        roleManageService.updateRole(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "롤 삭제", description = "시스템 권한(Role) 정보를 삭제합니다.")
    @DeleteMapping("/{roleCode}")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable String roleCode) {
        roleManageService.deleteRole(roleCode);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
