package com.company.project.api.advice;

import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class GlobalMenuAdvice {

    private final MenuService menuService;

    @ModelAttribute
    public void addAttributes(HttpServletRequest request, HttpSession session, Model model) {
        String uri = request.getRequestURI();
        String queryString = request.getQueryString();
        String fullUri = (queryString != null) ? (uri + "?" + queryString) : uri;

        log.info(">>> GlobalMenuAdvice starting for URI: {}", fullUri);

        List<MenuDto> menuHierarchy = menuService.getMenuHierarchy();
        log.info(">>> GlobalMenuAdvice - menuHierarchy size: {}",
                (menuHierarchy != null ? menuHierarchy.size() : "NULL"));
        model.addAttribute("list_headmenu", menuHierarchy);
        model.addAttribute("menuList", menuHierarchy);

        List<MenuDto> flatMenuList = new ArrayList<>();
        flattenMenu(menuHierarchy, flatMenuList);
        model.addAttribute("list_menulist", flatMenuList);

        // Remove context path if present
        String contextPath = request.getContextPath();
        String relativeUri = fullUri;
        if (contextPath != null && !contextPath.isEmpty() && relativeUri.startsWith(contextPath)) {
            relativeUri = relativeUri.substring(contextPath.length());
        }

        Long rootMenuId = menuService.getRootMenuIdByUrl(relativeUri);

        // Fallback for special cases
        if (rootMenuId == null) {
            String progrmFileNm = identifyProgrmFileNm(uri, request.getParameter("bbsId"));
            if (progrmFileNm != null) {
                rootMenuId = menuService.getRootMenuIdByProgrmFileNm(progrmFileNm);
            }
        }

        if (rootMenuId != null) {
            log.debug("GlobalMenuAdvice - Identified rootMenuId: {} for relativeUri: {}", rootMenuId, relativeUri);
            model.addAttribute("activeRootMenuId", rootMenuId);
            model.addAttribute("subMenu", menuService.getSubMenus(rootMenuId));
            session.setAttribute("baseMenuNo", rootMenuId.toString());
        } else {
            // Default to first menu if on main page or unknown
            if (relativeUri.equals("/") || relativeUri.contains("mainPage.do")) {
                session.setAttribute("baseMenuNo", "1000000");
                model.addAttribute("activeRootMenuId", 1000000L);
            }
        }
    }

    private void flattenMenu(List<MenuDto> menus, List<MenuDto> flatList) {
        for (MenuDto menu : menus) {
            flatList.add(menu);
            if (!menu.getChildren().isEmpty()) {
                flattenMenu(menu.getChildren(), flatList);
            }
        }
    }

    private String identifyProgrmFileNm(String uri, String bbsId) {
        if (uri.contains("selectBoardList.do") || uri.contains("selectBoardArticle.do")) {
            if ("BBSMSTR_AAAAAAAAAAAA".equals(bbsId)) {
                return "EgovInfoNotice";
            } else if ("BBSMSTR_CCCCCCCCCCCC".equals(bbsId)) {
                return "EgovInfoWork";
            }
        }
        if (uri.contains("mainPage.do") || uri.equals("/")) {
            return "MainPage";
        }
        return null;
    }
}
