package com.company.project.api.controller.menu;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.mnu.mpm.service.EgovMenuManageService;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.annotation.Resource;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/menu")
@Tag(name = "Menu", description = "메뉴 관리 API")
public class MenuController {

    @Resource(name = "menuManageService")
    private EgovMenuManageService menuManageService;

    @Operation(summary = "GNB 헤더 메뉴 조회")
    @GetMapping("/head")
    public ResponseEntity<?> getHeadMenu() throws Exception {
        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        MenuManageVO menuManageVO = new MenuManageVO();
        menuManageVO.setTmpId(user == null ? "" : user.getId());
        menuManageVO.setTmpUserSe(user == null ? "" : user.getUserSe());

        List<?> resultList = menuManageService.selectMainMenuHead(menuManageVO);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("list", resultList);

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "사이드바 좌측 메뉴 조회")
    @GetMapping("/left")
    public ResponseEntity<?> getLeftMenu(@RequestParam("menuNo") int menuNo) throws Exception {
        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        MenuManageVO menuManageVO = new MenuManageVO();
        menuManageVO.setMenuNo(menuNo);
        menuManageVO.setTmpId(user == null ? "" : user.getId());
        menuManageVO.setTmpUserSe(user == null ? "" : user.getUserSe());

        List<?> resultList = menuManageService.selectMainMenuLeft(menuManageVO);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("list", resultList);

        return ResponseEntity.ok(result);
    }
}
