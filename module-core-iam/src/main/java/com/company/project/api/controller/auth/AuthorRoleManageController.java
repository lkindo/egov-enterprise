package com.company.project.api.controller.auth;

import com.company.project.service.auth.AuthorManageService;
import com.company.project.service.auth.RoleManageService;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.*;

/**
 * 권한??관리? ?한 컨트롤러 ?래?? */
@Deprecated
@Controller
@RequiredArgsConstructor
public class AuthorRoleManageController {

    private final AuthorManageService authorManageService;
    private final RoleManageService roleManageService;
    private final EgovPropertyService propertiesService;
    private final MessageSource messageSource;

    /**
     * 권한??목록 ?면?로 ?동?다.
     */
    @Deprecated
    @RequestMapping({ "/sec/ram/EgovAuthorRoleListView.do" })
    public String selectAuthorRoleListView() throws Exception {
        return "sec/ram/EgovAuthorRoleManage";
    }

    /**
     * 권한??목록??조회?다.
     */
    @Deprecated
    @RequestMapping({ "/sec/ram/EgovAuthorRoleList.do", "/sec/rgm/EgovAuthorGroupListView.do" })
    public String selectAuthorRoleList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
            throws Exception {

        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        // 권한 목록 조회
        model.addAttribute("authorList", authorManageService.selectAuthorList(searchVO));

        // ?목록 조회
        model.addAttribute("roleList", roleManageService.selectRoleList(searchVO));

        int totCnt = roleManageService.selectRoleListTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("message", messageSource.getMessage("success.common.select", null, LocaleContextHolder.getLocale()));

        return "sec/ram/EgovAuthorRoleManage";
    }

    /**
     * 권한???보??록?다.
     */
    @Deprecated
    @PostMapping("/sec/ram/EgovAuthorRoleInsert.do")
    public String insertAuthorRole(@RequestParam("authorCode") String authorCode,
            @RequestParam("roleCodes") String roleCodes,
            @RequestParam("regYns") String regYns,
            ModelMap model) throws Exception {

        // ?제 구현 로직? AuthorManageService ?는 별도??AuthorRoleManageService ?요
        // ?재??메시지?반환
        model.addAttribute("message", messageSource.getMessage("success.common.insert", null, LocaleContextHolder.getLocale()));

        return "redirect:/sec/ram/EgovAuthorRoleList.do?searchKeyword=" + authorCode;
    }
}
