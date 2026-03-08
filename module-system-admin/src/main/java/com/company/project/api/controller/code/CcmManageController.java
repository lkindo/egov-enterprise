package com.company.project.api.controller.code;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.service.code.dto.CmmnDetailCodeDto;
import egovframework.com.cmm.ComDefaultVO;
import com.company.project.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import com.company.project.core.response.ApiResponse;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.code.dto.CommonCodeSaveRequest;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**

 * ?      ?                ?     ?????? ?      ?      ?

 * - ?      ?               ?         ?ccc), ?      ?               (cca), ?      ??         ?         ?cde) ?     ??

 */

@Controller

@RequiredArgsConstructor

public class CcmManageController {

    private final CommonCodeService commonCodeService;

    private final EgovPropertyService propertiesService;

    // =====================================================

    // ?      ?               ?         ?(CmmnClCode) - /sym/ccm/ccc/...

    // =====================================================

    @RequestMapping(value = "/sym/ccm/ccc/EgovCcmCmmnClCodeList.do")

    public String selectCmmnClCodeList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)

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

        model.addAttribute("resultList", commonCodeService.selectCmmnClCodeList(searchVO));

        int totCnt = commonCodeService.selectCmmnClCodeListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("paginationInfo", paginationInfo);

        return "cmm/sym/ccm/EgovCcmCmmnClCodeList";

    }

    @RequestMapping(value = "/sym/ccm/ccc/EgovCcmCmmnClCodeDetail.do")

    public String selectCmmnClCodeDetail(CmmnClCodeDto cmmnClCode, ModelMap model) throws Exception {

        CmmnClCodeDto vo = commonCodeService.selectCmmnClCodeDetail(cmmnClCode);

        model.addAttribute("result", vo);

        return "cmm/sym/ccm/EgovCcmCmmnClCodeDetail";

    }

    @GetMapping(value = "/sym/ccm/ccc/EgovCcmCmmnClCodeRegist.do")

    public String insertCmmnClCodeView(ModelMap model) throws Exception {

        model.addAttribute("cmmnClCode", new CmmnClCodeDto());

        return "cmm/sym/ccm/EgovCcmCmmnClCodeRegist";

    }

    @PostMapping(value = "/sym/ccm/ccc/EgovCcmCmmnClCodeRegist.do")
    public String insertCmmnClCode(@Valid @ModelAttribute("cmmnClCode") CmmnClCodeDto cmmnClCode, BindingResult bindingResult, ModelMap model)
            throws Exception {

        if (bindingResult.hasErrors()) {
            model.addAttribute("cmmnClCode", cmmnClCode);
            return "cmm/sym/ccm/EgovCcmCmmnClCodeRegist";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        cmmnClCode.setFrstRegisterId(userDetails.getEsntlId());

        commonCodeService.insertCmmnClCode(cmmnClCode);
        return "forward:/sym/ccm/ccc/EgovCcmCmmnClCodeList.do";
    }

    @GetMapping(value = "/sym/ccm/ccc/EgovCcmCmmnClCodeModify.do")

    public String updateCmmnClCodeView(@ModelAttribute("cmmnClCode") CmmnClCodeDto cmmnClCode, ModelMap model)

            throws Exception {

        CmmnClCodeDto vo = commonCodeService.selectCmmnClCodeDetail(cmmnClCode);

        model.addAttribute("cmmnClCode", vo);

        return "cmm/sym/ccm/EgovCcmCmmnClCodeModify";

    }

    @PostMapping(value = "/sym/ccm/ccc/EgovCcmCmmnClCodeModify.do")
    public String updateCmmnClCode(@Valid @ModelAttribute("cmmnClCode") CmmnClCodeDto cmmnClCode, BindingResult bindingResult, ModelMap model)
            throws Exception {

        if (bindingResult.hasErrors()) {
            model.addAttribute("cmmnClCode", cmmnClCode);
            return "cmm/sym/ccm/EgovCcmCmmnClCodeModify";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        cmmnClCode.setLastUpdusrId(userDetails.getEsntlId());

        commonCodeService.updateCmmnClCode(cmmnClCode);
        return "forward:/sym/ccm/ccc/EgovCcmCmmnClCodeList.do";
    }

    @RequestMapping(value = "/sym/ccm/ccc/EgovCcmCmmnClCodeRemove.do")

    public String deleteCmmnClCode(CmmnClCodeDto cmmnClCode, ModelMap model) throws Exception {

        commonCodeService.deleteCmmnClCode(cmmnClCode);

        return "forward:/sym/ccm/ccc/EgovCcmCmmnClCodeList.do";

    }

    // =====================================================

    // ?      ?               (            ? (CmmnCode) - /sym/ccm/cca/...

    // =====================================================

    @RequestMapping(value = "/sym/ccm/cca/EgovCcmCmmnCodeList.do")

    public String selectCmmnCodeList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)

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

        model.addAttribute("resultList", commonCodeService.selectCmmnCodeList(searchVO));

        int totCnt = commonCodeService.selectCmmnCodeListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("paginationInfo", paginationInfo);

        return "cmm/sym/ccm/EgovCcmCmmnCodeList";

    }

    @RequestMapping(value = "/sym/ccm/cca/EgovCcmCmmnCodeDetail.do")

    public String selectCmmnCodeDetail(CmmnCodeDto cmmnCode, ModelMap model) throws Exception {

        CmmnCodeDto vo = commonCodeService.selectCmmnCodeDetail(cmmnCode);

        model.addAttribute("result", vo);

        return "cmm/sym/ccm/EgovCcmCmmnCodeDetail";

    }

    @GetMapping(value = "/sym/ccm/cca/EgovCcmCmmnCodeRegist.do")

    public String insertCmmnCodeView(ModelMap model) throws Exception {

        // ?                                     ?         ???       ?

        ComDefaultVO searchVO = new ComDefaultVO();

        searchVO.setRecordCountPerPage(999999);

        searchVO.setFirstIndex(0);

        searchVO.setSearchCondition("CodeList");

        model.addAttribute("cmmnClCode", commonCodeService.selectCmmnClCodeList(searchVO));

        model.addAttribute("cmmnCode", new CmmnCodeDto());

        return "cmm/sym/ccm/EgovCcmCmmnCodeRegist";

    }

    @PostMapping(value = "/sym/ccm/cca/EgovCcmCmmnCodeRegist.do")
    public String insertCmmnCode(@Valid @ModelAttribute("cmmnCode") CmmnCodeDto cmmnCode, BindingResult bindingResult, ModelMap model)
            throws Exception {

        if (bindingResult.hasErrors()) {
            ComDefaultVO searchVO = new ComDefaultVO();
            searchVO.setRecordCountPerPage(999999);
            searchVO.setFirstIndex(0);
            searchVO.setSearchCondition("CodeList");
            model.addAttribute("cmmnClCode", commonCodeService.selectCmmnClCodeList(searchVO));
            model.addAttribute("cmmnCode", cmmnCode);
            return "cmm/sym/ccm/EgovCcmCmmnCodeRegist";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        cmmnCode.setFrstRegisterId(userDetails.getEsntlId());

        commonCodeService.insertCmmnCode(cmmnCode);
        return "forward:/sym/ccm/cca/EgovCcmCmmnCodeList.do";
    }

    @GetMapping(value = "/sym/ccm/cca/EgovCcmCmmnCodeModify.do")

    public String updateCmmnCodeView(CmmnCodeDto cmmnCode, ModelMap model) throws Exception {

        CmmnCodeDto vo = commonCodeService.selectCmmnCodeDetail(cmmnCode);

        model.addAttribute("cmmnCode", vo);

        return "cmm/sym/ccm/EgovCcmCmmnCodeModify";

    }

    @PostMapping(value = "/sym/ccm/cca/EgovCcmCmmnCodeModify.do")
    public String updateCmmnCode(@Valid @ModelAttribute("cmmnCode") CmmnCodeDto cmmnCode, BindingResult bindingResult, ModelMap model)
            throws Exception {

        if (bindingResult.hasErrors()) {
            model.addAttribute("cmmnCode", cmmnCode);
            return "cmm/sym/ccm/EgovCcmCmmnCodeModify";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        cmmnCode.setLastUpdusrId(userDetails.getEsntlId());

        commonCodeService.updateCmmnCode(cmmnCode);
        return "forward:/sym/ccm/cca/EgovCcmCmmnCodeList.do";
    }

    @RequestMapping(value = "/sym/ccm/cca/EgovCcmCmmnCodeRemove.do")

    public String deleteCmmnCode(CmmnCodeDto cmmnCode, ModelMap model) throws Exception {

        commonCodeService.deleteCmmnCode(cmmnCode);

        return "forward:/sym/ccm/cca/EgovCcmCmmnCodeList.do";

    }

    // =====================================================

    // ?      ??         ?         ?(CmmnDetailCode) - /sym/ccm/cde/...

    // =====================================================

    @RequestMapping(value = "/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do")

    public String selectCmmnDetailCodeList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)

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

        model.addAttribute("resultList", commonCodeService.selectCmmnDetailCodeList(searchVO));

        int totCnt = commonCodeService.selectCmmnDetailCodeListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("paginationInfo", paginationInfo);

        return "cmm/sym/ccm/EgovCcmCmmnDetailCodeList";

    }

    @RequestMapping(value = "/sym/ccm/cde/EgovCcmCmmnDetailCodeDetail.do")

    public String selectCmmnDetailCodeDetail(CmmnDetailCodeDto cmmnDetailCode, ModelMap model) throws Exception {

        CmmnDetailCodeDto vo = commonCodeService.selectCmmnDetailCodeDetail(cmmnDetailCode);

        model.addAttribute("result", vo);

        return "cmm/sym/ccm/EgovCcmCmmnDetailCodeDetail";

    }

    @GetMapping(value = "/sym/ccm/cde/EgovCcmCmmnDetailCodeRegist.do")

    public String insertCmmnDetailCodeView(@RequestParam(value = "clCode", required = false) String clCode,

            ModelMap model) throws Exception {

        // ?                                     ?

        ComDefaultVO searchClCodeVO = new ComDefaultVO();

        searchClCodeVO.setRecordCountPerPage(999999);

        searchClCodeVO.setFirstIndex(0);

        searchClCodeVO.setSearchCondition("CodeList");

        model.addAttribute("cmmnClCodeList", commonCodeService.selectCmmnClCodeList(searchClCodeVO));

        // ?      ?                            ?(?                           ??            ?

        ComDefaultVO searchCodeVO = new ComDefaultVO();

        searchCodeVO.setRecordCountPerPage(999999);

        searchCodeVO.setFirstIndex(0);

        if (clCode != null && !clCode.isEmpty()) {

            searchCodeVO.setSearchCondition("clCode");

            searchCodeVO.setSearchKeyword(clCode);

        }

        model.addAttribute("cmmnCodeList", commonCodeService.selectCmmnCodeList(searchCodeVO));

        model.addAttribute("cmmnDetailCode", new CmmnDetailCodeDto());

        model.addAttribute("clCode", clCode);

        return "cmm/sym/ccm/EgovCcmCmmnDetailCodeRegist";

    }

    @PostMapping(value = "/sym/ccm/cde/EgovCcmCmmnDetailCodeRegist.do")
    public String insertCmmnDetailCode(@Valid @ModelAttribute("cmmnDetailCode") CmmnDetailCodeDto cmmnDetailCode, BindingResult bindingResult,
            ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {
            ComDefaultVO searchClCodeVO = new ComDefaultVO();
            searchClCodeVO.setRecordCountPerPage(999999);
            searchClCodeVO.setFirstIndex(0);
            searchClCodeVO.setSearchCondition("CodeList");
            model.addAttribute("cmmnClCodeList", commonCodeService.selectCmmnClCodeList(searchClCodeVO));

            ComDefaultVO searchCodeVO = new ComDefaultVO();
            searchCodeVO.setRecordCountPerPage(999999);
            searchCodeVO.setFirstIndex(0);
            model.addAttribute("cmmnCodeList", commonCodeService.selectCmmnCodeList(searchCodeVO));

            model.addAttribute("cmmnDetailCode", cmmnDetailCode);
            return "cmm/sym/ccm/EgovCcmCmmnDetailCodeRegist";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        cmmnDetailCode.setFrstRegisterId(userDetails.getEsntlId());

        commonCodeService.insertCmmnDetailCode(cmmnDetailCode);
        return "forward:/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do";
    }

    @GetMapping(value = "/sym/ccm/cde/EgovCcmCmmnDetailCodeModify.do")

    public String updateCmmnDetailCodeView(@ModelAttribute("cmmnDetailCode") CmmnDetailCodeDto cmmnDetailCode,

            ModelMap model) throws Exception {

        CmmnDetailCodeDto vo = commonCodeService.selectCmmnDetailCodeDetail(cmmnDetailCode);

        model.addAttribute("cmmnDetailCode", vo);

        return "cmm/sym/ccm/EgovCcmCmmnDetailCodeModify";

    }

    @PostMapping(value = "/sym/ccm/cde/EgovCcmCmmnDetailCodeModify.do")
    public String updateCmmnDetailCode(@Valid @ModelAttribute("cmmnDetailCode") CmmnDetailCodeDto cmmnDetailCode, BindingResult bindingResult,
            ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {
            return "cmm/sym/ccm/EgovCcmCmmnDetailCodeModify";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        cmmnDetailCode.setLastUpdusrId(userDetails.getEsntlId());

        commonCodeService.updateCmmnDetailCode(cmmnDetailCode);
        return "forward:/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do";
    }

    @RequestMapping(value = "/sym/ccm/cde/EgovCcmCmmnDetailCodeRemove.do")

    public String deleteCmmnDetailCode(CmmnDetailCodeDto cmmnDetailCode, ModelMap model) throws Exception {

        commonCodeService.deleteCmmnDetailCode(cmmnDetailCode);

        return "forward:/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do";

    }

    // --- REST API Integration (Unified Controller) ---

    // If the objective is to integrate, we move CommonCodeController logic here.

@Operation(summary = "?      ?                            ?         ??", description = "?          ?      ?                            ??         ???      ??")

    @GetMapping("/api/v1/codes")

    @ResponseBody

    public ResponseEntity<ApiResponse<List<CommonCodeDto>>> getCodes(@RequestParam String codeGroupId) {

        return ResponseEntity.ok(ApiResponse.success(commonCodeService.getCodesByGroup(codeGroupId)));

    }

@Operation(summary = "?      ?                ?         ", description = "??      ???      ?               ???         ??      ?? ?     ?                      ???         ??      ??")

    @PostMapping("/api/v1/codes")

    @ResponseBody

    public ResponseEntity<ApiResponse<CommonCodeDto>> createCode(@Valid @RequestBody CommonCodeSaveRequest request) {

        return ResponseEntity.ok(ApiResponse.success(commonCodeService.createCode(request)));

    }

}
