package com.company.project.api.controller.menu;

import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuCreateDto;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cmm.LoginVO;
import egovframework.com.sym.mnu.mcm.service.EgovMenuCreateManageService;
import egovframework.com.sym.mnu.mcm.service.MenuSiteMapVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import java.util.List;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequiredArgsConstructor
public class MenuCreateController {

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    private final MenuService menuService;
    private final EgovMenuCreateManageService menuCreateManageService;

    /**
     * *메뉴생성목록을 조회한다.
     */
    @GetMapping(value = "/sym/mnu/mcm/EgovMenuCreatManageSelect.do")
    public String selectMenuCreatManagList(@ModelAttribute("searchVO") ComDefaultVO searchVO, Model model)
            throws Exception {
        String resultMsg = "";

        // Pagination
        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        if (searchVO.getSearchKeyword() != null && !searchVO.getSearchKeyword().equals("")) {
            // Logic for searching by user ID if needed, but for now focusing on list of
            // Authorities
        }

        model.addAttribute("list_menumanage", menuService.selectMenuCreatManagList(searchVO));

        int totCnt = menuService.selectMenuCreatManagTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("resultMsg", resultMsg);

        return "sym/mnu/mcm/EgovMenuCreatManage";
    }

    /* 메뉴사이트맵 생성조회 */
    @GetMapping(value = "/sym/mnu/mcm/EgovMenuCreatSiteMapSelect.do")
    public String selectMenuCreatSiteMap(@ModelAttribute("menuSiteMapVO") MenuSiteMapVO menuSiteMapVO, Model model)
            throws Exception {

        List<EgovMap> resultList = menuCreateManageService.selectMenuCreatSiteMapList(menuSiteMapVO);
        model.addAttribute("list_menulist", resultList);

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        menuSiteMapVO.setCreatPersonId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
        model.addAttribute("resultVO", menuSiteMapVO);
        return "egovframework/com/sym/mnu/mcm/EgovMenuCreatSiteMap";
    }

    /* 메뉴사이트맵 생성조회 (Fragment for Embedding) */
    @GetMapping(value = "/sym/mnu/mcm/EgovMenuCreatSiteMapSelectFragment.do")
    public String selectMenuCreatSiteMapFragment(@ModelAttribute("menuSiteMapVO") MenuSiteMapVO menuSiteMapVO,
            Model model)
            throws Exception {

        List<EgovMap> resultList = menuCreateManageService.selectMenuCreatSiteMapList(menuSiteMapVO);
        model.addAttribute("list_menulist", resultList);

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        menuSiteMapVO.setCreatPersonId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
        model.addAttribute("resultVO", menuSiteMapVO);
        return "egovframework/com/sym/mnu/mcm/EgovMenuCreatSiteMapFragment";
    }

    /* 메뉴생성 세부조회 */
    @GetMapping(value = "/sym/mnu/mcm/EgovMenuCreatSelect.do")
    public String selectMenuCreatList(@ModelAttribute("menuCreatVO") MenuCreateDto menuCreatVO, Model model)
            throws Exception {
        model.addAttribute("list_menulist", menuService.selectMenuCreatList(menuCreatVO));
        model.addAttribute("resultVO", menuCreatVO);
        return "sym/mnu/mcm/EgovMenuCreat";
    }

    /**
     * 메뉴생성처리 및 메뉴생성내역을 등록한다.
     */
    @PostMapping("/sym/mnu/mcm/EgovMenuCreatInsert.do")
    public String insertMenuCreatList(@RequestParam("checkedAuthorForInsert") String checkedAuthorForInsert,
            @RequestParam("checkedMenuNoForInsert") String checkedMenuNoForInsert,
            @ModelAttribute("searchVO") ComDefaultVO searchVO,
            @ModelAttribute("menuCreatVO") MenuCreateDto menuCreatVO,
            Model model, RedirectAttributes redirectAttributes) throws Exception {

        // Security Check: Authentication is handled by ApiSecurityConfig
        // (FilterSecurityInterceptor).
        // Explicit EgovUserDetailsHelper.isAuthenticated() check is not required here.

        String resultMsg = "";
        if (checkedMenuNoForInsert == null || (checkedMenuNoForInsert.length() == 0)) {
            resultMsg = egovMessageSource.getMessage("fail.common.insert");
        } else {
            menuService.insertMenuCreatList(checkedAuthorForInsert, checkedMenuNoForInsert);
            resultMsg = egovMessageSource.getMessage("success.common.insert");
        }

        redirectAttributes.addAttribute("resultMsg", resultMsg);
        redirectAttributes.addAttribute("authorCode", menuCreatVO.getAuthorCode());

        redirectAttributes.addAttribute("searchCondition", searchVO.getSearchCondition());
        redirectAttributes.addAttribute("searchKeyword", searchVO.getSearchKeyword());
        redirectAttributes.addAttribute("pageIndex", searchVO.getPageIndex());

        return "redirect:/sym/mnu/mcm/EgovMenuCreatSelect.do";
    }
}
