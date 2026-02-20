package com.company.project.api.controller.batch;

import com.company.project.service.batch.EgovBatchResultService;

import com.company.project.service.batch.dto.BatchResultDto;

import egovframework.com.cmm.EgovMessageSource;

import egovframework.com.cmm.annotation.IncludedInfo;

import egovframework.com.cmm.util.EgovUserDetailsHelper;

import egovframework.com.sym.bat.service.BatchResult;

import jakarta.annotation.Resource;

import org.egovframe.rte.fdl.property.EgovPropertyService;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.PageRequest;

import org.springframework.stereotype.Controller;

import org.springframework.ui.ModelMap;

import org.springframework.web.bind.annotation.ModelAttribute;

import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;

import java.util.stream.Collectors;

/**

 *          ?               ?     ?          ????controller ??  ???(Modernized)

 */

@Controller

public class EgovBatchResultController {

    @Resource(name = "batchResultService")

    private EgovBatchResultService batchResultService;

    @Resource(name = "propertiesService")

    private EgovPropertyService propertyService;

    @Resource(name = "egovMessageSource")

    private EgovMessageSource egovMessageSource;

    /**

     *          ?               ???????      .

     */

    @RequestMapping("/sym/bat/deleteBatchResult.do")

    public String deleteBatchResult(BatchResult batchResult, ModelMap model) throws Exception {

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        batchResultService.deleteBatchResult(batchResult.getBatchResultId());

        return "forward:/sym/bat/getBatchResultList.do";

    }

    /**

     *          ?               ?         ???                  ???      .

     */

    @RequestMapping("/sym/bat/getBatchResult.do")

    public String selectBatchResult(@ModelAttribute("searchVO") BatchResult searchVO, ModelMap model) throws Exception {

        BatchResultDto resultDto = batchResultService.getBatchResult(searchVO.getBatchResultId());

        // Map DTO to legacy VO for JSP compatibility

        BatchResult result = convertToVo(resultDto);

        model.addAttribute("resultInfo", result);

        return "egovframework/com/sym/bat/EgovBatchResultDetail";

    }

    /**

     *          ?                            ??         ???      .

     */

    @IncludedInfo(name = "         ?               ?     ??", listUrl = "/sym/bat/getBatchResultList.do", order = 1130, gid = 60)

    @RequestMapping("/sym/bat/getBatchResultList.do")

    public String selectBatchResultList(@ModelAttribute("searchVO") BatchResult searchVO, ModelMap model)

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

        Page<BatchResultDto> resultPage = batchResultService.getBatchResultList(

                searchVO.getSttus(),

                searchVO.getSearchKeywordFrom(),

                searchVO.getSearchKeywordTo(),

                searchVO.getSearchCondition(),

                searchVO.getSearchKeyword(),

                PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit()));

        List<BatchResult> resultList = resultPage.getContent().stream()

                .map(this::convertToVo)

                .collect(Collectors.toList());

        paginationInfo.setTotalRecordCount((int) resultPage.getTotalElements());

        model.addAttribute("resultList", resultList);

        model.addAttribute("resultCnt", resultPage.getTotalElements());

        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/bat/EgovBatchResultList";

    }

    private BatchResult convertToVo(BatchResultDto dto) {

        BatchResult vo = new BatchResult();

        vo.setBatchResultId(dto.getBatchResultId());

        vo.setBatchSchdulId(dto.getBatchSchdulId());

        vo.setBatchOpertId(dto.getBatchOpertId());

        vo.setBatchOpertNm(dto.getBatchOpertNm());

        vo.setBatchProgrm(dto.getBatchProgrm());

        vo.setParamtr(dto.getParamtr());

        vo.setSttus(dto.getSttus());

        vo.setSttusNm(dto.getSttusNm());

        vo.setErrorInfo(dto.getErrorInfo());

        vo.setExecutBeginTime(dto.getExecutBeginTime());

        vo.setExecutEndTime(dto.getExecutEndTime());

        vo.setFrstRegisterId(dto.getFrstRegisterId());

        if (dto.getFrstRegistPnttm() != null) {

            vo.setFrstRegisterPnttm(dto.getFrstRegistPnttm().toString());

        }

        return vo;

    }

}

