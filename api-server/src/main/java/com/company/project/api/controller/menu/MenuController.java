package com.company.project.api.controller.menu;

import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
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
@Tag(name = "Menu", description = "메뉴 정보 관련 API")
public class MenuController {

    private final MenuService menuService;

    @Operation(summary = "GNB 대메뉴 목록 조회")
    @GetMapping("/head")
    public ResponseEntity<?> getHeadMenu() {
        // MenuService.getMenuHierarchy()는 최상위 메뉴 리스트를 반환함
        List<MenuDto> resultList = menuService.getMenuHierarchy();
        
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("list", resultList);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "특정 메뉴의 하위 메뉴 목록 조회")
    @GetMapping("/left")
    public ResponseEntity<?> getLeftMenu(@RequestParam("menuNo") Long menuNo) {
        // MenuService.getSubMenus(parentId)를 사용하여 하위 메뉴 조회
        List<MenuDto> resultList = menuService.getSubMenus(menuNo);
        
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("list", resultList);
        return ResponseEntity.ok(result);
    }
}
