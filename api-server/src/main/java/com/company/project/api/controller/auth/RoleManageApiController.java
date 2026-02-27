package com.company.project.api.controller.auth;

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

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/security/roles")
@RequiredArgsConstructor
@Tag(name = "RoleManage", description = "롤 관리 API")
public class RoleManageApiController {

    private final RoleManageService roleManageService;

    @Operation(summary = "롤 목록 조회")
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

    @Operation(summary = "롤 상세 조회")
    @GetMapping("/{roleCode}")
    public ResponseEntity<ApiResponse<RoleManageDto>> getRole(@PathVariable String roleCode) {
        return ResponseEntity.ok(ApiResponse.success(roleManageService.selectRole(roleCode)));
    }

    @Operation(summary = "롤 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createRole(@RequestBody RoleManageDto dto) {
        roleManageService.insertRole(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "롤 수정")
    @PutMapping("/{roleCode}")
    public ResponseEntity<ApiResponse<Void>> updateRole(
            @PathVariable String roleCode,
            @RequestBody RoleManageDto dto) {
        dto.setRoleCode(roleCode);
        roleManageService.updateRole(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "롤 삭제")
    @DeleteMapping("/{roleCode}")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable String roleCode) {
        roleManageService.deleteRole(roleCode);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
