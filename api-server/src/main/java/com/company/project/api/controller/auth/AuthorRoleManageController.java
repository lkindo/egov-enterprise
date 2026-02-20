package com.company.project.api.controller.auth;

import com.company.project.service.auth.AuthorManageService;

import com.company.project.service.auth.RoleManageService;

import egovframework.com.cmm.ComDefaultVO;

import egovframework.com.cmm.EgovMessageSource;

import lombok.RequiredArgsConstructor;

import org.egovframe.rte.fdl.property.EgovPropertyService;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;

import org.springframework.stereotype.Controller;

import org.springframework.ui.ModelMap;

import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

/**

 * ????   ?  ?            ?   ? ?     ???      ?      ?      

 */

@Controller

@RequiredArgsConstructor

public class AuthorRoleManageController {

    private final AuthorManageService authorManageService;

    private final RoleManageService roleManageService;

    @Resource(name = "propertiesService")

    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")

    EgovMessageSource egovMessageSource;

    /**

     *                   ?   ??     ???         

     */

    @RequestMapping({ "/sec/ram/EgovAuthorRoleListView.do" })

    public String selectAuthorRoleListView() throws Exception {

        return "sec/ram/EgovAuthorRoleManage";

    }

    /**

     *                   ?   ?            ?         ??

     */

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

        //             ?            ?         ??

        model.addAttribute("authorList", authorManageService.selectAuthorList(searchVO));

        //    ?            ?         ??

        model.addAttribute("roleList", roleManageService.selectRoleList(searchVO));

        int totCnt = roleManageService.selectRoleListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("paginationInfo", paginationInfo);

        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "sec/ram/EgovAuthorRoleManage";

    }

    /**

     *                   ?   ??                   ??

     */

    @PostMapping("/sec/ram/EgovAuthorRoleInsert.do")

    public String insertAuthorRole(@RequestParam("authorCode") String authorCode,

            @RequestParam("roleCodes") String roleCodes,

            @RequestParam("regYns") String regYns,

            ModelMap model) throws Exception {

        //             ?   ?            ?         ???            ?AuthorRole ???   ???         

        // ?         ??            ???                 ??         ??  ???

        model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

        return "redirect:/sec/ram/EgovAuthorRoleList.do?searchKeyword=" + authorCode;

    }

}

