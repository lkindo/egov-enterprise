package com.company.project.api.controller.auth;

import com.company.project.service.auth.RoleManageService;
import com.company.project.service.auth.dto.RoleManageDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

/**
 * Î°?Í¥ÄÎ¶¨Î? ?ÑÌïú Ïª®Ìä∏Î°§Îü¨ ?¥Îûò?? */
@Controller
@RequiredArgsConstructor
public class RoleManageController {

    private final RoleManageService roleManageService;
    private final EgovPropertyService propertiesService;
    private final MessageSource messageSource;

    /**
     * Î°?Î™©Î°ù ?îÎ©¥?ºÎ°ú ?¥Îèô?úÎã§.
     */
    @RequestMapping("/sec/rmt/EgovRoleListView.do")
    public String selectRoleListView() throws Exception {
        return "sec/rmt/EgovRoleManage";
    }

    /**
     * Î°?Î™©Î°ù??Ï°∞Ìöå?úÎã§.
     */
    @RequestMapping({ "/sec/rmt/EgovRoleList.do", "/sec/rmt/EgovRoleManage.do" })
    public String selectRoleList(@ModelAttribute("roleManageVO") ComDefaultVO searchVO, ModelMap model)
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

        model.addAttribute("roleList", roleManageService.selectRoleList(searchVO));

        int totCnt = roleManageService.selectRoleListTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("message", messageSource.getMessage("success.common.select", null, LocaleContextHolder.getLocale()));

        return "sec/rmt/EgovRoleManage";
    }

    /**
     * Î°??∏Î??ïÎ≥¥Î•?Ï°∞Ìöå?úÎã§.
     */
    @RequestMapping(value = { "/api/v1/auth/roles", "/sec/rmt/EgovRole.do" })
    public String selectRole(@RequestParam("roleCode") String roleCode, ModelMap model)
            throws Exception {
        model.addAttribute("roleManage", roleManageService.selectRole(roleCode));
        return "sec/rmt/EgovRoleUpdate";
    }

    /**
     * Î°??±Î°ù ?îÎ©¥?ºÎ°ú ?¥Îèô?úÎã§.
     */
    @RequestMapping("/sec/rmt/EgovRoleInsertView.do")
    public String insertRoleView(Model model) throws Exception {
        model.addAttribute("roleManage", new RoleManageDto());
        return "sec/rmt/EgovRoleInsert";
    }

    /**
     * Î°??ïÎ≥¥Î•??±Î°ù?úÎã§.
     */
    @PostMapping("/sec/rmt/EgovRoleInsert.do")
    public String insertRole(@Valid @ModelAttribute("roleManage") RoleManageDto roleManage,
            BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {
            return "sec/rmt/EgovRoleInsert";
        }

        roleManageService.insertRole(roleManage);
        model.addAttribute("message", messageSource.getMessage("success.common.insert", null, LocaleContextHolder.getLocale()));

        return "forward:/sec/rmt/EgovRoleList.do";
    }

    /**
     * Î°??ïÎ≥¥Î•???†ú?úÎã§.
     */
    @PostMapping("/sec/rmt/EgovRoleDelete.do")
    public String deleteRole(@RequestParam("roleCode") String roleCode, ModelMap model)
            throws Exception {

        roleManageService.deleteRole(roleCode);
        model.addAttribute("message", messageSource.getMessage("success.common.delete", null, LocaleContextHolder.getLocale()));

        return "forward:/sec/rmt/EgovRoleList.do";
    }

    /**
     * Î°?Î™©Î°ù??Î©Ä????†ú?úÎã§.
     */
    @PostMapping("/sec/rmt/EgovRoleListDelete.do")
    public String deleteRoleList(@RequestParam("roleCodes") String roleCodes, Model model)
            throws Exception {

        String[] strRoleCodes = roleCodes.split(";");
        roleManageService.deleteRoles(strRoleCodes);
        model.addAttribute("message", messageSource.getMessage("success.common.delete", null, LocaleContextHolder.getLocale()));

        return "forward:/sec/rmt/EgovRoleList.do";
    }
}
