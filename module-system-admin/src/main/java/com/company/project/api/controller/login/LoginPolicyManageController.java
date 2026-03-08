package com.company.project.api.controller.login;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.login.LoginPolicyManageService;
import com.company.project.service.login.dto.LoginPolicyDto;
import com.company.project.service.login.dto.LoginPolicyVO;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.ResponseEntity;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 로그인 정책 관리를 위한 컨트롤러
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class LoginPolicyManageController {

    private final LoginPolicyManageService loginPolicyManageService;
    private final EgovPropertyService propertiesService;
    private final MessageSource messageSource;

    // --- REST API Integration ---

    /**
     * 로그인 정책 목록을 조회한다 (REST API)
     */
    @Operation(summary = "로그인 정책 목록 조회")
    @GetMapping("/api/v1/admin/user/login-policies")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLoginPolicyList(
            @ModelAttribute LoginPolicyVO searchVO) throws Exception {

        // Use properties if available, otherwise use defaults to prevent 500 errors
        try {
            searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
            searchVO.setPageSize(propertiesService.getInt("pageSize"));
        } catch (Exception e) {
            log.warn("Failed to load pageUnit/pageSize from properties, using defaults");
            searchVO.setPageUnit(10);
            searchVO.setPageSize(10);
        }

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
     * 로그인 정책 상세 정보를 조회한다 (REST API)
     */
    @Operation(summary = "로그인 정책 상세 조회")
    @GetMapping("/api/v1/admin/user/login-policies/{emplyrId}")
    public ResponseEntity<ApiResponse<LoginPolicyDto>> getLoginPolicy(
            @PathVariable("emplyrId") String emplyrId) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(loginPolicyManageService.selectLoginPolicy(emplyrId)));
    }

    /**
     * 로그인 정책 정보를 등록 또는 수정한다 (REST API)
     */
    @Operation(summary = "로그인 정책 저장")
    @PutMapping("/api/v1/admin/user/login-policies/{emplyrId}")
    public ResponseEntity<ApiResponse<Void>> saveLoginPolicy(
            @PathVariable("emplyrId") String emplyrId,
            @RequestBody LoginPolicyDto loginPolicy) throws Exception {
        loginPolicy.setEmplyrId(emplyrId);

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
     * 로그인 정책 목록 화면으로 이동한다
     */
    @RequestMapping("/uat/uap/selectLoginPolicyListView.do")
    public String selectLoginPolicyListView() throws Exception {
        return "uat/uap/EgovLoginPolicyList";
    }

    /**
     * 로그인 정책 목록을 조회한다 (JSP)
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
        model.addAttribute("message",
                messageSource.getMessage("success.common.select", null, LocaleContextHolder.getLocale()));

        return "uat/uap/EgovLoginPolicyList";
    }

    /**
     * 로그인 정책 상세 정보를 조회한다 (JSP)
     */
    @RequestMapping("/uat/uap/getLoginPolicy.do")
    public String selectLoginPolicy(@RequestParam("emplyrId") String emplyrId, ModelMap model)
            throws Exception {
        LoginPolicyDto policy = loginPolicyManageService.selectLoginPolicy(emplyrId);
        model.addAttribute("loginPolicy", policy);
        model.addAttribute("message",
                messageSource.getMessage("success.common.select", null, LocaleContextHolder.getLocale()));

        if (policy != null && "N".equals(policy.getRegYn())) {
            return "uat/uap/EgovLoginPolicyRegist";
        } else {
            return "uat/uap/EgovLoginPolicyUpdt";
        }
    }

    /**
     * 로그인 정책 등록 화면으로 이동한다
     */
    @RequestMapping("/uat/uap/addLoginPolicyView.do")
    public String insertLoginPolicyView(@RequestParam("emplyrId") String emplyrId, ModelMap model)
            throws Exception {
        LoginPolicyDto policy = loginPolicyManageService.selectLoginPolicy(emplyrId);
        model.addAttribute("loginPolicy", policy);
        model.addAttribute("message",
                messageSource.getMessage("success.common.select", null, LocaleContextHolder.getLocale()));
        return "uat/uap/EgovLoginPolicyRegist";
    }

    /**
     * 로그인 정책 정보를 등록한다
     */
    @PostMapping("/uat/uap/addLoginPolicy.do")
    public String insertLoginPolicy(@Valid @ModelAttribute("loginPolicy") LoginPolicyDto loginPolicy,
            BindingResult bindingResult, ModelMap model, RedirectAttributes redirectAttributes) throws Exception {
        if (bindingResult.hasErrors()) {
            model.addAttribute("loginPolicy", loginPolicy);
            return "uat/uap/EgovLoginPolicyRegist";
        }
        loginPolicyManageService.insertLoginPolicy(loginPolicy);
        redirectAttributes.addFlashAttribute("message",
                messageSource.getMessage("success.common.insert", null, LocaleContextHolder.getLocale()));
        redirectAttributes.addAttribute("emplyrId", loginPolicy.getEmplyrId());
        return "redirect:/uat/uap/getLoginPolicy.do";
    }

    /**
     * 로그인 정책 정보를 수정한다
     */
    @PostMapping("/uat/uap/updtLoginPolicy.do")
    public String updateLoginPolicy(@Valid @ModelAttribute("loginPolicy") LoginPolicyDto loginPolicy,
            BindingResult bindingResult, Model model, RedirectAttributes redirectAttributes) throws Exception {
        if (bindingResult.hasErrors()) {
            model.addAttribute("loginPolicy", loginPolicy);
            return "uat/uap/EgovLoginPolicyUpdt";
        }
        loginPolicyManageService.updateLoginPolicy(loginPolicy);
        redirectAttributes.addFlashAttribute("message",
                messageSource.getMessage("success.common.update", null, LocaleContextHolder.getLocale()));
        return "redirect:/uat/uap/selectLoginPolicyList.do";
    }

    /**
     * 로그인 정책 정보를 삭제한다
     */
    @PostMapping("/uat/uap/removeLoginPolicy.do")
    public String deleteLoginPolicy(@RequestParam("emplyrId") String emplyrId,
            RedirectAttributes redirectAttributes) throws Exception {
        loginPolicyManageService.deleteLoginPolicy(emplyrId);
        redirectAttributes.addFlashAttribute("message",
                messageSource.getMessage("success.common.delete", null, LocaleContextHolder.getLocale()));
        return "redirect:/uat/uap/selectLoginPolicyList.do";
    }
}
