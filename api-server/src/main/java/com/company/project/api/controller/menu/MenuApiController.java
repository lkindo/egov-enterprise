package com.company.project.api.controller.menu;

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

@Tag(name = "Menu Admin", description = "System Menu Management APIs")

@RestController

@RequestMapping("/api/v1/admin/menus")

@RequiredArgsConstructor

public class MenuApiController {

    private final MenuService menuService;

@Operation(summary = "Get Menu List")

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

@Operation(summary = "Get All Menus (Tree Structure)")

    @GetMapping("/all")

    public ResponseEntity<ApiResponse<List<MenuDto>>> getAllMenus() throws Exception {

        return ResponseEntity.ok(ApiResponse.success(menuService.getAllMenus()));

    }

@Operation(summary = "Get Menu Detail")

    @GetMapping("/{menuNo}")

    public ResponseEntity<ApiResponse<MenuDto>> getMenu(@PathVariable Long menuNo) throws Exception {

        return ResponseEntity.ok(ApiResponse.success(menuService.selectMenuManage(menuNo)));

    }

@Operation(summary = "Create Menu")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> createMenu(@RequestBody MenuDto dto) throws Exception {

        menuService.insertMenuManage(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Update Menu")

    @PutMapping("/{menuNo}")

    public ResponseEntity<ApiResponse<Void>> updateMenu(@PathVariable Long menuNo, @RequestBody MenuDto dto) throws Exception {

        dto.setMenuNo(menuNo);

        menuService.updateMenuManage(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Update Menu Orders")

    @PutMapping("/batch-order")

    public ResponseEntity<ApiResponse<Void>> updateMenuOrder(@RequestBody List<MenuDto> menuList) throws Exception {

        for (MenuDto dto : menuList) {

            menuService.updateMenuManage(dto);

        }

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Menu")

    @DeleteMapping("/{menuNo}")

    public ResponseEntity<ApiResponse<Void>> deleteMenu(@PathVariable Long menuNo) throws Exception {

        MenuDto dto = MenuDto.builder().menuNo(menuNo).build();

        menuService.deleteMenuManage(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

