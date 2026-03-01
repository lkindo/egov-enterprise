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

@Tag(name = "Menu (Admin)", description = "?œìŠ¤??ë©”ë‰´ ê´€ë¦?API (ê´€ë¦¬ì??")
@RestController("systemMenuAdminController")
@RequestMapping("/api/v1/admin/system/menus")
@RequiredArgsConstructor
public class MenuAdminController {

    private final MenuService menuService;

    @Operation(summary = "ë©”ë‰´ ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤???„ì²´ ë©”ë‰´ ëª©ë¡???˜ì´ì§•í•˜??ì¡°íšŒ?©ë‹ˆ??")
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

    @Operation(summary = "ë©”ë‰´ ?„ì²´ ?¸ë¦¬ ì¡°íšŒ", description = "?œìŠ¤??ë©”ë‰´ë¥??¸ë¦¬ êµ¬ì¡° êµ¬ì„±???„í•œ ?„ì²´ ëª©ë¡?¼ë¡œ ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<MenuDto>>> getAllMenus() throws Exception {
        return ResponseEntity.ok(ApiResponse.success(menuService.getAllMenus()));
    }

    @Operation(summary = "ë©”ë‰´ ?ì„¸ ì¡°íšŒ", description = "?¹ì • ë©”ë‰´???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{menuNo}")
    public ResponseEntity<ApiResponse<MenuDto>> getMenu(@PathVariable Long menuNo) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(menuService.selectMenuManage(menuNo)));
    }

    @Operation(summary = "ë©”ë‰´ ?±ë¡", description = "?ˆë¡œ???œìŠ¤??ë©”ë‰´ë¥??±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createMenu(@RequestBody MenuDto dto) throws Exception {
        menuService.insertMenuManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ë©”ë‰´ ?•ë³´ ?˜ì •", description = "ê¸°ì¡´ ?œìŠ¤??ë©”ë‰´ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{menuNo}")
    public ResponseEntity<ApiResponse<Void>> updateMenu(@PathVariable Long menuNo, @RequestBody MenuDto dto)
            throws Exception {
        dto.setMenuNo(menuNo);
        menuService.updateMenuManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ë©”ë‰´ ?œì„œ ?¼ê´„ ë³€ê²?, description = "?¬ëŸ¬ ë©”ë‰´???œì„œë¥??¼ê´„?ìœ¼ë¡??…ë°?´íŠ¸?©ë‹ˆ??")
    @PutMapping("/batch-order")
    public ResponseEntity<ApiResponse<Void>> updateMenuOrder(@RequestBody List<MenuDto> menuList) throws Exception {
        for (MenuDto dto : menuList) {
            menuService.updateMenuManage(dto);
        }
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ë©”ë‰´ ?? œ", description = "?œìŠ¤??ë©”ë‰´ë¥??? œ?©ë‹ˆ??")
    @DeleteMapping("/{menuNo}")
    public ResponseEntity<ApiResponse<Void>> deleteMenu(@PathVariable Long menuNo) throws Exception {
        MenuDto dto = MenuDto.builder().menuNo(menuNo).build();
        menuService.deleteMenuManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
