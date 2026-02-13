package com.company.project.api.controller.batch;

import com.company.project.service.batch.EgovBatchOpertService;
import com.company.project.service.batch.dto.BatchOpertDto;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import jakarta.annotation.Resource;

/**
 * 배치작업관리에 대한 controller 클래스
 */
@Controller
@RequiredArgsConstructor
public class EgovBatchOpertController {

    private final EgovBatchOpertService batchOpertService;

    @Resource(name = "propertiesService")
    private EgovPropertyService propertyService;

    @Resource(name = "egovMessageSource")
    private EgovMessageSource egovMessageSource;

    @Resource(name = "batchOpertValidator")
    private BatchOpertValidator batchOpertValidator;

    /**
     * 배치작업 목록을 조회한다.
     */
    @IncludedInfo(name = "배치작업관리", listUrl = "/sym/bat/getBatchOpertList.do", order = 1120, gid = 60)
    @RequestMapping({ "/sym/bat/getBatchOpertList.do", "/sym/bat/EgovBatchOpertList.do" })
    public String selectBatchOpertList(@ModelAttribute("searchVO") BatchOpert searchVO, ModelMap model,
            @RequestParam(value = "popupAt", required = false) String popupAt)
            throws Exception {

        searchVO.setPageUnit(propertyService.getInt("pageUnit"));
        searchVO.setPageSize(propertyService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
                Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));

        String condition = searchVO.getSearchCondition();
        if (condition == null)
            condition = "";

        Page<BatchOpertDto> pageResult = batchOpertService.getBatchOpertList(condition, searchVO.getSearchKeyword(),
                pageable);

        model.addAttribute("resultList", pageResult.getContent());
        model.addAttribute("resultCnt", (int) pageResult.getTotalElements());
        paginationInfo.setTotalRecordCount((int) pageResult.getTotalElements());
        model.addAttribute("paginationInfo", paginationInfo);

        if ("Y".equals(popupAt)) {
            return "egovframework/com/sym/bat/EgovBatchOpertListPopup";
        } else {
            return "egovframework/com/sym/bat/EgovBatchOpertList";
        }
    }

    /**
     * 배치작업을 등록한다.
     */
    @RequestMapping("/sym/bat/addBatchOpert.do")
    public String insertBatchOpert(@ModelAttribute("searchVO") BatchOpert searchVO,
            @ModelAttribute BatchOpert batchOpert, BindingResult bindingResult, ModelMap model) throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!isAuthenticated) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        batchOpertValidator.validate(batchOpert, bindingResult);
        if (bindingResult.hasErrors()) {
            return "egovframework/com/sym/bat/EgovBatchOpertRegist";
        }

        BatchOpertDto dto = BatchOpertDto.builder()
                .batchOpertNm(batchOpert.getBatchOpertNm())
                .batchProgrm(batchOpert.getBatchProgrm())
                .paramtr(batchOpert.getParamtr())
                .useAt("Y")
                .build();

        batchOpertService.createBatchOpert(loginVO == null ? "" : loginVO.getUniqId(), dto);
        model.addAttribute("resultMsg", "success.common.insert");

        return "forward:/sym/bat/getBatchOpertList.do";
    }

    @RequestMapping("/sym/bat/getBatchOpertForRegist.do")
    public String selectBatchOpertForRegist(@ModelAttribute("searchVO") BatchOpert batchOpert, ModelMap model)
            throws Exception {
        model.addAttribute("batchOpert", new BatchOpert());
        return "egovframework/com/sym/bat/EgovBatchOpertRegist";
    }

    @RequestMapping("/sym/bat/getBatchOpert.do")
    public String selectBatchOpert(@ModelAttribute("searchVO") BatchOpert searchVO, ModelMap model) throws Exception {
        BatchOpertDto result = batchOpertService.getBatchOpert(searchVO.getBatchOpertId());

        BatchOpert vo = new BatchOpert();
        vo.setBatchOpertId(result.getBatchOpertId());
        vo.setBatchOpertNm(result.getBatchOpertNm());
        vo.setBatchProgrm(result.getBatchProgrm());
        vo.setParamtr(result.getParamtr());
        vo.setUseAt(result.getUseAt());
        vo.setFrstRegisterId(result.getBatchOpertId()); // Fallback
        vo.setFrstRegisterPnttm(result.getFrstRegisterPnttm() != null ? result.getFrstRegisterPnttm().toString() : "");

        model.addAttribute("resultInfo", vo);
        return "egovframework/com/sym/bat/EgovBatchOpertDetail";
    }

    @RequestMapping("/sym/bat/deleteBatchOpert.do")
    public String deleteBatchOpert(@ModelAttribute("searchVO") BatchOpert searchVO, ModelMap model) throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!isAuthenticated) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        batchOpertService.deleteBatchOpert(searchVO.getBatchOpertId());
        return "forward:/sym/bat/getBatchOpertList.do";
    }

    @RequestMapping("/sym/bat/getBatchOpertForUpdate.do")
    public String selectBatchOpertForUpdate(@ModelAttribute("searchVO") BatchOpert searchVO, ModelMap model)
            throws Exception {
        BatchOpertDto result = batchOpertService.getBatchOpert(searchVO.getBatchOpertId());

        BatchOpert vo = new BatchOpert();
        vo.setBatchOpertId(result.getBatchOpertId());
        vo.setBatchOpertNm(result.getBatchOpertNm());
        vo.setBatchProgrm(result.getBatchProgrm());
        vo.setParamtr(result.getParamtr());
        vo.setUseAt(result.getUseAt());

        model.addAttribute("batchOpert", vo);
        return "egovframework/com/sym/bat/EgovBatchOpertUpdt";
    }

    @RequestMapping("/sym/bat/updateBatchOpert.do")
    public String updateBatchOpert(@ModelAttribute("searchVO") BatchOpert searchVO,
            @ModelAttribute BatchOpert batchOpert, BindingResult bindingResult, ModelMap model) throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!isAuthenticated) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        batchOpertValidator.validate(batchOpert, bindingResult);
        if (bindingResult.hasErrors()) {
            model.addAttribute("batchOpert", batchOpert);
            return "egovframework/com/sym/bat/EgovBatchOpertUpdt";
        }

        BatchOpertDto dto = BatchOpertDto.builder()
                .batchOpertNm(batchOpert.getBatchOpertNm())
                .batchProgrm(batchOpert.getBatchProgrm())
                .paramtr(batchOpert.getParamtr())
                .useAt("Y")
                .build();

        batchOpertService.updateBatchOpert(batchOpert.getBatchOpertId(), loginVO == null ? "" : loginVO.getUniqId(), dto);

        return "forward:/sym/bat/getBatchOpertList.do";
    }
}
