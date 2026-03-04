package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import egovframework.com.cmm.ComDefaultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Menu (Admin)", description = "시스템 메뉴 관리 API (관리자용)")
@RestController("systemMenuAdminController")
@RequestMapping("/api/v1/admin/system/menus")
@RequiredArgsConstructor
public class MenuAdminController {

    private final MenuService menuService;

    @Operation(summary = "메뉴 목록 조회", description = "시스템 전체 메뉴 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<MenuDto>>> getMenuList(
            @RequestParam(required = false) String searchWrd,
            Pageable pageable) throws Exception {

        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchKeyword(searchWrd);
        searchVO.setFirstIndex((int) pageable.getOffset());
        searchVO.setRecordCountPerPage(pageable.getPageSize());

        List<MenuDto> list = menuService.selectMenuManageList(searchVO);
        int total = menuService.selectMenuManageListTotCnt(searchVO);

        return ResponseEntity.ok(ApiResponse.success(new PageImpl<>(list, pageable, total)));
    }

    @Operation(summary = "메뉴 전체 트리 조회", description = "시스템 메뉴를 트리 구조 구성을 위한 전체 목록으로 조회합니다.")
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<MenuDto>>> getAllMenus() throws Exception {
        return ResponseEntity.ok(ApiResponse.success(menuService.getAllMenus()));
    }

    @Operation(summary = "메뉴 상세 조회", description = "특정 메뉴의 상세 정보를 조회합니다.")
    @GetMapping("/{menuNo}")
    public ResponseEntity<ApiResponse<MenuDto>> getMenu(@PathVariable Long menuNo) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(menuService.selectMenuManage(menuNo)));
    }

    @Operation(summary = "메뉴 등록", description = "새로운 시스템 메뉴를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createMenu(@RequestBody MenuDto dto) throws Exception {
        menuService.insertMenuManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메뉴 정보 수정", description = "기존 시스템 메뉴 정보를 수정합니다.")
    @PutMapping("/{menuNo}")
    public ResponseEntity<ApiResponse<Void>> updateMenu(@PathVariable Long menuNo, @RequestBody MenuDto dto)
            throws Exception {
        dto.setMenuNo(menuNo);
        menuService.updateMenuManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메뉴 순서 일괄 변경", description = "여러 메뉴의 순서를 일괄적으로 업데이트합니다.")
    @PutMapping("/batch-order")
    public ResponseEntity<ApiResponse<Void>> updateMenuOrder(@RequestBody List<MenuDto> menuList) throws Exception {
        for (MenuDto dto : menuList) {
            menuService.updateMenuManage(dto);
        }
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메뉴 삭제", description = "시스템 메뉴를 삭제합니다.")
    @DeleteMapping("/{menuNo}")
    public ResponseEntity<ApiResponse<Void>> deleteMenu(@PathVariable Long menuNo) throws Exception {
        MenuDto dto = MenuDto.builder().menuNo(menuNo).build();
        menuService.deleteMenuManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}