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

@Slf4j
@RestController("systemRoleController")
@RequestMapping("/api/v1/admin/system/roles")
@RequiredArgsConstructor
@Tag(name = "Role (Admin)", description = "?œìŠ¤??ê¶Œí•œ(ë¡? ê´€ë¦?API (ê´€ë¦¬ì??")
public class RoleController {

    private final RoleManageService roleManageService;

    @Operation(summary = "ë¡?ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤?œì— ?•ì˜???„ì²´ ê¶Œí•œ(ë¡? ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
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

    @Operation(summary = "ë¡??ì„¸ ì¡°íšŒ", description = "?¹ì • ê¶Œí•œ(ë¡????ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{roleCode}")
    public ResponseEntity<ApiResponse<RoleManageDto>> getRole(@PathVariable String roleCode) {
        return ResponseEntity.ok(ApiResponse.success(roleManageService.selectRole(roleCode)));
    }

    @Operation(summary = "ë¡??±ë¡", description = "?ˆë¡œ???œìŠ¤??ê¶Œí•œ(ë¡????±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createRole(@RequestBody RoleManageDto dto) {
        roleManageService.insertRole(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ë¡??˜ì •", description = "ê¸°ì¡´ ?œìŠ¤??ê¶Œí•œ(ë¡? ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{roleCode}")
    public ResponseEntity<ApiResponse<Void>> updateRole(
            @PathVariable String roleCode,
            @RequestBody RoleManageDto dto) {
        dto.setRoleCode(roleCode);
        roleManageService.updateRole(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ë¡??? œ", description = "?œìŠ¤??ê¶Œí•œ(ë¡? ?•ë³´ë¥??? œ?©ë‹ˆ??")
    @DeleteMapping("/{roleCode}")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable String roleCode) {
        roleManageService.deleteRole(roleCode);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
