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

import com.company.project.core.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;

import org.springframework.http.ResponseEntity;

import java.util.List;

import java.util.Map;

import java.util.HashMap;

/**

 *          ????          ?     ???      ?      ?      

 */

@Controller

@RequiredArgsConstructor

public class LoginPolicyManageController {

    private final LoginPolicyManageService loginPolicyManageService;

    @Resource(name = "propertiesService")

    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")

    EgovMessageSource egovMessageSource;

    // --- REST API Integration ---

    /**

     *          ????                      ?         ??(REST API)

     */

@Operation(summary = "         ????                      ?         ??", description = "??      ??????   ?             ????                      ??         ???      ??")

    @GetMapping("/admin/user/login-policies")

    @ResponseBody

    public ResponseEntity<ApiResponse<Map<String, Object>>> getLoginPolicyList(

            @ModelAttribute LoginPolicyVO searchVO) throws Exception {

        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));

        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());

        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());

        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());

        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());

        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        List<LoginPolicyDto> resultList = loginPolicyManageService.selectLoginPolicyList(searchVO);

        int totCnt = loginPolicyManageService.selectLoginPolicyListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        Map<String, Object> responseData = new HashMap<>();

        responseData.put("content", resultList);

        responseData.put("totalElements", totCnt);

        responseData.put("totalPages", paginationInfo.getTotalPageCount());

        responseData.put("page", searchVO.getPageIndex());

        return ResponseEntity.ok(ApiResponse.success(responseData));

    }

    /**

     *          ????          ?                   ??(REST API)

     */

@Operation(summary = "         ????          ?                   ??", description = "?     ??????   ?             ????          ?          ?         ??         ???      ??")

    @GetMapping("/admin/user/login-policies/{emplyrId}")

    @ResponseBody

    public ResponseEntity<ApiResponse<LoginPolicyDto>> getLoginPolicy(

            @PathVariable("emplyrId") String emplyrId) throws Exception {

        return ResponseEntity.ok(ApiResponse.success(loginPolicyManageService.selectLoginPolicy(emplyrId)));

    }

    /**

     *          ????          ??????       (REST API)

     */

@Operation(summary = "         ????          ????", description = "         ????         ???         ??      ????      ??      ??")

    @PutMapping("/admin/user/login-policies/{emplyrId}")

    @ResponseBody

    public ResponseEntity<ApiResponse<Void>> saveLoginPolicy(

            @PathVariable("emplyrId") String emplyrId,

            @RequestBody LoginPolicyDto loginPolicy) throws Exception {

        loginPolicy.setEmplyrId(emplyrId);

        // regYn??'Y'??  ????      , 'N'??  ???         

        LoginPolicyDto existing = loginPolicyManageService.selectLoginPolicy(emplyrId);

        if (existing != null && "Y".equals(existing.getRegYn())) {

            loginPolicyManageService.updateLoginPolicy(loginPolicy);

        } else {

            loginPolicyManageService.insertLoginPolicy(loginPolicy);

        }

        return ResponseEntity.ok(ApiResponse.success(null));

    }

    // --- Legacy JSP Endpoints ---

    /**

     *          ????                      ??         

     */

    @RequestMapping("/uat/uap/selectLoginPolicyListView.do")

    public String selectLoginPolicyListView() throws Exception {

        return "uat/uap/EgovLoginPolicyList";

    }

    /**

     *          ????                      ?         ??

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

     *          ????          ?         /??       ?         

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

     *          ????          ?          ?         

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

     *          ????          ?                   ??

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

     *          ????          ??                ??

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

     *          ????          ????         ??

     */

    @PostMapping("/uat/uap/removeLoginPolicy.do")

    public String deleteLoginPolicy(@RequestParam("emplyrId") String emplyrId,

            RedirectAttributes redirectAttributes) throws Exception {

        loginPolicyManageService.deleteLoginPolicy(emplyrId);

        redirectAttributes.addFlashAttribute("message", egovMessageSource.getMessage("success.common.delete"));

        return "redirect:/uat/uap/selectLoginPolicyList.do";

    }

}

