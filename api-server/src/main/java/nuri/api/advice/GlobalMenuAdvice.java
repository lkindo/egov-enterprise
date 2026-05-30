package nuri.api.advice;

import nuri.business.service.menu.MenuIntegrationService;
import nuri.business.service.menu.dto.MenuUIContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@Slf4j
@ControllerAdvice(basePackages = "nuri.web")
@RequiredArgsConstructor
public class GlobalMenuAdvice {
    private final MenuIntegrationService menuIntegrationService;

    @ModelAttribute
    public void addAttributes(HttpServletRequest request, HttpSession session, Model model) {
        String uri = request.getRequestURI();
        String queryString = request.getQueryString();
        String contextPath = request.getContextPath();
        String bbsId = request.getParameter("bbsId");

        MenuUIContext context = menuIntegrationService.processMenuContext(uri, queryString, contextPath, bbsId);

        if (context.getActiveRootMenuId() != null) {
            log.debug("GlobalMenuAdvice - Identified rootMenuId: {} for URI: {}", context.getActiveRootMenuId(), uri);
            model.addAttribute("activeRootMenuId", context.getActiveRootMenuId());
            session.setAttribute("baseMenuNo", context.getActiveRootMenuId().toString());
        }

        model.addAttribute("list_headmenu", context.getRootMenus());
        model.addAttribute("menuList", context.getRootMenus());
        model.addAttribute("list_menulist", context.getFlatMenus());
        model.addAttribute("subMenu", context.getSubMenus());
    }
}

