package nuri.business.service.menu;

import nuri.business.service.menu.dto.MenuDto;
import nuri.business.service.menu.dto.MenuUIContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * UI와 메뉴 서비스를 연계하여 레거시 UI에 필요한 데이터 매핑 및 처리를 담당하는 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MenuIntegrationService {

    private final MenuService menuService;

    /**
     * 현재 요청 정보를 바탕으로 메뉴 관련 UI 컨텍스트를 생성합니다.
     */
    public MenuUIContext processMenuContext(String uri, String queryString, String contextPath, String bbsId) {
        String fullUri = (queryString != null) ? (uri + "?" + queryString) : uri;
        log.debug("Processing menu context for URI: {}", fullUri);

        List<MenuDto> menuHierarchy = menuService.getMenuHierarchy();
        List<MenuDto> flatMenuList = new ArrayList<>();
        flattenMenu(menuHierarchy, flatMenuList);

        String relativeUri = fullUri;
        if (contextPath != null && !contextPath.isEmpty() && relativeUri.startsWith(contextPath)) {
            relativeUri = relativeUri.substring(contextPath.length());
        }

        Long rootMenuId = menuService.getRootMenuIdByUrl(relativeUri);
        if (rootMenuId == null) {
            String progrmFileNm = identifyProgrmFileNm(uri, bbsId);
            if (progrmFileNm != null) {
                rootMenuId = menuService.getRootMenuIdByProgrmFileNm(progrmFileNm);
            }
        }

        // Default value for main page
        if (rootMenuId == null && (relativeUri.equals("/") || relativeUri.contains("mainPage.do"))) {
            rootMenuId = 1000000L;
        }

        List<MenuDto> subMenus = (rootMenuId != null) ? menuService.getSubMenus(rootMenuId) : new ArrayList<>();

        return MenuUIContext.builder()
                .rootMenus(menuHierarchy)
                .flatMenus(flatMenuList)
                .activeRootMenuId(rootMenuId)
                .subMenus(subMenus)
                .build();
    }

    private void flattenMenu(List<MenuDto> menus, List<MenuDto> flatList) {
        if (menus == null) return;
        for (MenuDto menu : menus) {
            flatList.add(menu);
            if (menu.getChildren() != null && !menu.getChildren().isEmpty()) {
                flattenMenu(menu.getChildren(), flatList);
            }
        }
    }

    private String identifyProgrmFileNm(String uri, String bbsId) {
        if (uri == null) return null;

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
