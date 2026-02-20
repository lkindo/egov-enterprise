package com.company.project.web;

import java.util.ArrayList;

import java.util.HashMap;

import java.util.List;

import java.util.Map;

import java.util.stream.Collectors;

import org.slf4j.Logger;

import org.slf4j.LoggerFactory;

import jakarta.annotation.Resource;

import jakarta.servlet.http.HttpServletRequest;

import org.egovframe.rte.fdl.security.userdetails.util.EgovUserDetailsHelper;

import org.springframework.data.domain.PageRequest;

import org.springframework.stereotype.Controller;

import org.springframework.ui.ModelMap;

import org.springframework.web.bind.annotation.RequestMapping;

import com.company.project.service.board.BoardService;

import com.company.project.service.board.dto.BoardDto;

import com.company.project.service.menu.MenuService;

/**

 * Hybrid Main Controller

 * Replaces EgovMainController (Let) with a modern implementation using

 * BoardService and MenuService.

 */

@Controller

public class MainController {

    @Resource(name = "menuService")

    private MenuService menuService;

    @Resource(name = "egovBoardService")

    private BoardService boardService;

    private static final Logger LOGGER = LoggerFactory.getLogger(MainController.class);

    private Map<String, Object> convertToMap(BoardDto dto) {

        Map<String, Object> map = new HashMap<>();

        map.put("nttSj", dto.getNttSj());

        map.put("ntcrNm", dto.getNtcrNm());

        map.put("frstRegisterNm", dto.getNtcrNm());

        map.put("frstRegisterPnttm", dto.getFrstRegisterPnttm() != null

                ? dto.getFrstRegisterPnttm().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd"))

                : "");

        map.put("inqireCo", dto.getInqireCo());

        map.put("isExpired", dto.getIsExpired());

        map.put("useAt", dto.getUseAt());

        map.put("replyLc", dto.getReplyLc());

        return map;

    }

    @RequestMapping(value = "/cmm/main/debugPage.do")

    public String getMgtMainPage(HttpServletRequest request, ModelMap model) throws Exception {

        // Hybrid: Use JPA BoardService

        try {

            List<BoardDto> notiList = boardService.getBoardPosts("BBSMSTR_AAAAAAAAAAAA", PageRequest.of(0, 10))

                    .getContent();

            List<Map<String, Object>> notiMapList = notiList.stream().map(this::convertToMap)

                    .collect(Collectors.toList());

            model.addAttribute("notiList", notiMapList);

            List<BoardDto> bbsList = boardService.getBoardPosts("BBSMSTR_CCCCCCCCCCCC", PageRequest.of(0, 5))

                    .getContent();

            List<Map<String, Object>> bbsMapList = bbsList.stream().map(this::convertToMap)

                    .collect(Collectors.toList());

            model.addAttribute("bbsList", bbsMapList);

        } catch (Exception e) {

            // Fail graciously if DB tables not ready

            LOGGER.error("Failed to load main page data", e);

        }

        return "main/EgovMainView";

    }

    @RequestMapping(value = "/sym/mms/EgovHeader.do")

    public String selectHeader(ModelMap model) throws Exception {

        // Expose menus only if authenticated to prevent information disclosure

        if (EgovUserDetailsHelper.isAuthenticated()) {

            model.addAttribute("list_headmenu", menuService.getMenuHierarchy());

            model.addAttribute("list_menulist", menuService.getAllMenus());

        } else {

            // Unauthenticated users get empty lists to prevent view errors

            model.addAttribute("list_headmenu", new ArrayList<>());

            model.addAttribute("list_menulist", new ArrayList<>());

        }

        return "main/inc/EgovIncHeader";

    }

    @RequestMapping(value = "/sym/mms/EgovFooter.do")

    public String selectFooter(ModelMap model) throws Exception {

        return "main/inc/EgovIncFooter";

    }

    @RequestMapping(value = "/sym/mms/EgovMenuLeft.do")

    public String selectMenuLeft(ModelMap model) throws Exception {

        if (EgovUserDetailsHelper.isAuthenticated()) {

            model.addAttribute("lastLogoutDateTime", "2025-01-01 00:00");

        }

        return "main/inc/EgovIncLeftmenu";

    }

    @RequestMapping(value = "/sym/mms/EgovMainMenuHead.do")

    public String selectMainMenuHead(ModelMap model) throws Exception {

        if (EgovUserDetailsHelper.isAuthenticated()) {

            model.addAttribute("list_headmenu", menuService.getMenuHierarchy());

            model.addAttribute("list_menulist", menuService.getAllMenus());

        }

        return "main/inc/EgovIncTopnav";

    }

    @RequestMapping(value = "/sym/mms/EgovMainMenuLeft.do")

    public String selectMainMenuLeft(ModelMap model) throws Exception {

        return "main/inc/EgovIncLeftmenu";

    }

}

