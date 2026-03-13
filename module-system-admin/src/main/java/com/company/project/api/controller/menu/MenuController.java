package com.company.project.api.controller.menu;

import com.company.project.domain.menu.Menu;
import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/menu")
@RequiredArgsConstructor
@Tag(name = "Menu", description = "메뉴 ?보 관??API")
public class MenuController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MenuController.class);
    private final MenuService menuService;

    @Operation(summary = "GNB ?메뉴 목록 조회")
    @GetMapping("/head")
    public ResponseEntity<com.company.project.core.response.ApiResponse<Map<String, Object>>> getHeadMenu() {
        log.info("getHeadMenu called");
        List<MenuDto> resultList = menuService.getMenuHierarchy();
        log.info("getHeadMenu returned {} items", resultList.size());
        Map<String, Object> data = new HashMap<>();
        data.put("list", resultList);
        return ResponseEntity.ok(com.company.project.core.response.ApiResponse.success(data));
    }

    @Operation(summary = "?정 메뉴???위 메뉴 목록 조회")
    @GetMapping("/left")
    public ResponseEntity<com.company.project.core.response.ApiResponse<Map<String, Object>>> getLeftMenu(
            @RequestParam("menuNo") Long menuNo) {
        log.info("getLeftMenu called with menuNo={}", menuNo);
        List<MenuDto> resultList = menuService.getSubMenus(menuNo);
        log.info("getLeftMenu returned {} items", resultList.size());
        Map<String, Object> data = new HashMap<>();
        data.put("list", resultList);
        return ResponseEntity.ok(com.company.project.core.response.ApiResponse.success(data));
    }

    @Operation(summary = "메뉴 목록 ?스??- Menu ?티??직접 반환")
    @GetMapping("/test/raw")
    public ResponseEntity<Map<String, Object>> getRawMenus() {
        log.info("getRawMenus called");
        try {
            List<Menu> menus = menuService.getAllMenusCached();
            log.info("getRawMenus returned {} items", menus.size());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("count", menus.size());
            result.put("menus", menus);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("getRawMenus failed", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            error.put("exception", e.getClass().getName());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @Operation(summary = "메뉴 목록 ?스??- Program 조회")
    @GetMapping("/test/programs")
    public ResponseEntity<Map<String, Object>> getPrograms() {
        log.info("getPrograms called");
        try {
            List<com.company.project.domain.program.Program> programs = menuService.getAllPrograms();
            log.info("getPrograms returned {} items", programs.size());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("count", programs.size());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("getPrograms failed", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            error.put("exception", e.getClass().getName());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
