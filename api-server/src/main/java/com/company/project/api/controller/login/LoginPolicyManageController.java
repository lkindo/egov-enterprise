package com.company.project.api.controller.login;

import com.company.project.service.login.LoginPolicyManageService;
import com.company.project.service.login.dto.LoginPolicyDto;
import com.company.project.service.login.dto.LoginPolicyVO;
import egovframework.com.cmm.EgovMessageSource;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 로그인 정책 관리 컨트롤러
 */
@Controller
@RequiredArgsConstructor
public class LoginPolicyManageController {

    private final LoginPolicyManageService loginPolicyManageService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
     * 로그인 정책 목록 화면
     */
    @RequestMapping("/uat/uap/selectLoginPolicyListView.do")
    public String selectLoginPolicyListView() throws Exception {
        return "uat/uap/EgovLoginPolicyList";
    }

    /**
     * 로그인 정책 목록 조회
     */
    @RequestMapping("/uat/uap/selectLoginPolicyList.do")
    public String selectLoginPolicyList(@ModelAttribute("loginPolicyVO") LoginPolicyVO searchVO, ModelMap model)
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

        model.addAttribute("loginPolicyList", loginPolicyManageService.selectLoginPolicyList(searchVO));

        int totCnt = loginPolicyManageService.selectLoginPolicyListTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "uat/uap/EgovLoginPolicyList";
    }

    /**
     * 로그인 정책 상세/수정 화면
     */
    @RequestMapping("/uat/uap/getLoginPolicy.do")
    public String selectLoginPolicy(@RequestParam("emplyrId") String emplyrId, ModelMap model)
            throws Exception {
        LoginPolicyDto policy = loginPolicyManageService.selectLoginPolicy(emplyrId);
        model.addAttribute("loginPolicy", policy);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        if (policy != null && "N".equals(policy.getRegYn())) {
            return "uat/uap/EgovLoginPolicyRegist";
        } else {
            return "uat/uap/EgovLoginPolicyUpdt";
        }
    }

    /**
     * 로그인 정책 등록 화면
     */
    @RequestMapping("/uat/uap/addLoginPolicyView.do")
    public String insertLoginPolicyView(@RequestParam("emplyrId") String emplyrId, ModelMap model)
            throws Exception {
        LoginPolicyDto policy = loginPolicyManageService.selectLoginPolicy(emplyrId);
        model.addAttribute("loginPolicy", policy);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
        return "uat/uap/EgovLoginPolicyRegist";
    }

    /**
     * 로그인 정책 등록 처리
     */
    @PostMapping("/uat/uap/addLoginPolicy.do")
    public String insertLoginPolicy(@Valid @ModelAttribute("loginPolicy") LoginPolicyDto loginPolicy,
            BindingResult bindingResult, ModelMap model, RedirectAttributes redirectAttributes) throws Exception {

        if (bindingResult.hasErrors()) {
            model.addAttribute("loginPolicy", loginPolicy);
            return "uat/uap/EgovLoginPolicyRegist";
        }

        loginPolicyManageService.insertLoginPolicy(loginPolicy);
        redirectAttributes.addFlashAttribute("message", egovMessageSource.getMessage("success.common.insert"));
        redirectAttributes.addAttribute("emplyrId", loginPolicy.getEmplyrId());
        return "redirect:/uat/uap/getLoginPolicy.do";
    }

    /**
     * 로그인 정책 수정 처리
     */
    @PostMapping("/uat/uap/updtLoginPolicy.do")
    public String updateLoginPolicy(@Valid @ModelAttribute("loginPolicy") LoginPolicyDto loginPolicy,
            BindingResult bindingResult, Model model, RedirectAttributes redirectAttributes) throws Exception {

        if (bindingResult.hasErrors()) {
            model.addAttribute("loginPolicy", loginPolicy);
            return "uat/uap/EgovLoginPolicyUpdt";
        }

        loginPolicyManageService.updateLoginPolicy(loginPolicy);
        redirectAttributes.addFlashAttribute("message", egovMessageSource.getMessage("success.common.update"));
        return "redirect:/uat/uap/selectLoginPolicyList.do";
    }

    /**
     * 로그인 정책 삭제 처리
     */
    @PostMapping("/uat/uap/removeLoginPolicy.do")
    public String deleteLoginPolicy(@RequestParam("emplyrId") String emplyrId,
            RedirectAttributes redirectAttributes) throws Exception {
        loginPolicyManageService.deleteLoginPolicy(emplyrId);
        redirectAttributes.addFlashAttribute("message", egovMessageSource.getMessage("success.common.delete"));
        return "redirect:/uat/uap/selectLoginPolicyList.do";
    }
}
