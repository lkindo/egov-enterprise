package com.company.project.api.controller.menu;

import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuCreateDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.egovframe.rte.fdl.property.EgovPropertyService;
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

    private final EgovPropertyService propertiesService;
    private final MessageSource messageSource;
    private final MenuService menuService;

    /**
     * 메뉴 생성 관리 목록 조회
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

        model.addAttribute("list_menumanage", menuService.selectMenuCreatManagList(searchVO));

        int totCnt = menuService.selectMenuCreatManagTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("resultMsg", resultMsg);

        return "sym/mnu/mcm/EgovMenuCreatManage";
    }

    /**
     * 메뉴 생성 목록 조회
     */
    @GetMapping(value = "/sym/mnu/mcm/EgovMenuCreatSelect.do")
    public String selectMenuCreatList(@ModelAttribute("menuCreatVO") MenuCreateDto menuCreatVO, Model model)
            throws Exception {

        model.addAttribute("list_menulist", menuService.selectMenuCreatList(menuCreatVO));
        model.addAttribute("resultVO", menuCreatVO);

        return "sym/mnu/mcm/EgovMenuCreat";
    }

    /**
     * 권한 및 메뉴 체크박스 선택 후 메뉴 생성 처리
     */
    @PostMapping("/sym/mnu/mcm/EgovMenuCreatInsert.do")
    public String insertMenuCreatList(@RequestParam("checkedAuthorForInsert") String checkedAuthorForInsert,
            @RequestParam("checkedMenuNoForInsert") String checkedMenuNoForInsert,
            @ModelAttribute("searchVO") ComDefaultVO searchVO,
            @ModelAttribute("menuCreatVO") MenuCreateDto menuCreatVO,
            Model model, RedirectAttributes redirectAttributes) throws Exception {

        // Security Check: Authentication is handled by ApiSecurityConfig
        // (FilterSecurityInterceptor). Explicit check is not required here.

        String resultMsg = "";

        if (checkedMenuNoForInsert == null || (checkedMenuNoForInsert.length() == 0)) {
            resultMsg = messageSource.getMessage("fail.common.insert", null, LocaleContextHolder.getLocale());
        } else {
            menuService.insertMenuCreatList(checkedAuthorForInsert, checkedMenuNoForInsert);
            resultMsg = messageSource.getMessage("success.common.insert", null, LocaleContextHolder.getLocale());
        }

        redirectAttributes.addAttribute("resultMsg", resultMsg);
        redirectAttributes.addAttribute("authorCode", menuCreatVO.getAuthorCode());
        redirectAttributes.addAttribute("searchCondition", searchVO.getSearchCondition());
        redirectAttributes.addAttribute("searchKeyword", searchVO.getSearchKeyword());
        redirectAttributes.addAttribute("pageIndex", searchVO.getPageIndex());

        return "redirect:/sym/mnu/mcm/EgovMenuCreatSelect.do";
    }

}
