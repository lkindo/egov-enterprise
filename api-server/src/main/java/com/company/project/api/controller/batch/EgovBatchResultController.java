package com.company.project.api.controller.batch;

import com.company.project.service.batch.EgovBatchResultService;
import com.company.project.service.batch.dto.BatchResultDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 배치결과 관리�? ?�한 컨트롤러 ?�래?? */
@Controller
@RequiredArgsConstructor
public class EgovBatchResultController {

    private final EgovBatchResultService batchResultService;
    private final EgovPropertyService propertyService;
    private final MessageSource messageSource;

    /**
     * 배치결과 ?�보�???��?�다.
     */
    @RequestMapping("/sym/bat/deleteBatchResult.do")
    public String deleteBatchResult(BatchResult batchResult, ModelMap model) throws Exception {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            model.addAttribute("message", messageSource.getMessage("fail.common.login", null, LocaleContextHolder.getLocale()));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        batchResultService.deleteBatchResult(batchResult.getBatchResultId());
        return "forward:/sym/bat/getBatchResultList.do";
    }

    /**
     * 배치결과 ?�세 ?�보�?조회?�다.
     */
    @RequestMapping("/sym/bat/getBatchResult.do")
    public String selectBatchResult(@ModelAttribute("searchVO") BatchResult searchVO, ModelMap model) throws Exception {
        BatchResultDto resultDto = batchResultService.getBatchResult(searchVO.getBatchResultId());
        
        BatchResult result = convertToVo(resultDto);
        model.addAttribute("resultInfo", result);
        return "egovframework/com/sym/bat/EgovBatchResultDetail";
    }

    /**
     * 배치결과 목록??조회?�다.
     */
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
