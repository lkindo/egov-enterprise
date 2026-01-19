package com.company.project.api.controller.batch;

import com.company.project.service.batch.EgovBatchSchdulService;
import com.company.project.service.batch.dto.BatchSchdulDto;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.bat.service.BatchSchdul;
import egovframework.com.sym.bat.service.BatchScheduler;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 배치스케줄관리에 대한 현대화된 controller 클래스
 */
@Slf4j
@Controller
public class EgovBatchSchdulController {

    @Resource(name = "batchSchdulService")
    private EgovBatchSchdulService batchSchdulService;

    @Resource(name = "propertiesService")
    private EgovPropertyService propertyService;

    @Resource(name = "egovMessageSource")
    private EgovMessageSource egovMessageSource;

    @Resource(name = "batchScheduler")
    private BatchScheduler batchScheduler;

    @Resource(name = "egovCommonCodeService")
    private EgovCommonCodeService commonCodeService;

    @IncludedInfo(name = "스케줄처리", listUrl = "/sym/bat/getBatchSchdulList.do", order = 1140, gid = 60)
    @RequestMapping({ "/sym/bat/getBatchSchdulList.do", "/sym/bat/EgovBatchSchdulList.do" })
    public String selectBatchSchdulList(@ModelAttribute("searchVO") BatchSchdul searchVO, ModelMap model)
            throws Exception {
        searchVO.setPageUnit(propertyService.getInt("pageUnit"));
        searchVO.setPageSize(propertyService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        Page<BatchSchdulDto> resultPage = batchSchdulService.getBatchSchdulList(
                searchVO.getSearchCondition(),
                searchVO.getSearchKeyword(),
                PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit()));

        List<BatchSchdul> resultList = resultPage.getContent().stream()
                .map(this::convertToVo)
                .collect(Collectors.toList());

        paginationInfo.setTotalRecordCount((int) resultPage.getTotalElements());

        model.addAttribute("resultList", resultList);
        model.addAttribute("resultCnt", resultPage.getTotalElements());
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/bat/EgovBatchSchdulList";
    }

    @RequestMapping("/sym/bat/getBatchSchdul.do")
    public String selectBatchSchdul(@ModelAttribute("searchVO") BatchSchdul batchSchdul, ModelMap model)
            throws Exception {
        BatchSchdulDto dto = batchSchdulService.getBatchSchdul(batchSchdul.getBatchSchdulId());
        model.addAttribute("resultInfo", convertToVo(dto));
        return "egovframework/com/sym/bat/EgovBatchSchdulDetail";
    }

    @RequestMapping("/sym/bat/deleteBatchSchdul.do")
    public String deleteBatchSchdul(BatchSchdul batchSchdul, ModelMap model) throws Exception {
        if (!EgovUserDetailsHelper.isAuthenticated()) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        // Quartz 연동은 레거시 VO 사용
        batchScheduler.deleteBatchSchdul(batchSchdul);
        batchSchdulService.deleteBatchSchdul(batchSchdul.getBatchSchdulId());

        return "forward:/sym/bat/getBatchSchdulList.do";
    }

    @RequestMapping("/sym/bat/getBatchSchdulForRegist.do")
    public String selectBatchSchdulForRegist(@ModelAttribute("searchVO") BatchSchdul batchSchdul, ModelMap model)
            throws Exception {
        referenceData(model);
        model.addAttribute("batchSchdul", batchSchdul);
        return "egovframework/com/sym/bat/EgovBatchSchdulRegist";
    }

    @RequestMapping("/sym/bat/addBatchSchdul.do")
    public String insertBatchSchdul(@Valid @ModelAttribute("batchSchdul") BatchSchdul batchSchdul,
            BindingResult bindingResult, ModelMap model) throws Exception {
        if (!EgovUserDetailsHelper.isAuthenticated()) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        if (bindingResult.hasErrors()) {
            referenceData(model);
            return "egovframework/com/sym/bat/EgovBatchSchdulRegist";
        }

        String userId = EgovUserDetailsHelper.getAuthenticatedUser() != null
                ? ((egovframework.com.cmm.LoginVO) EgovUserDetailsHelper.getAuthenticatedUser()).getUniqId()
                : "";

        String id = batchSchdulService.createBatchSchdul(userId, convertToDto(batchSchdul));

        // Quartz 연동을 위해 상세 조회 후 스케줄러 등록
        BatchSchdulDto savedDto = batchSchdulService.getBatchSchdul(id);
        batchScheduler.insertBatchSchdul(convertToVo(savedDto));

        model.addAttribute("resultMsg", "success.common.insert");
        return "forward:/sym/bat/getBatchSchdulList.do";
    }

    @RequestMapping("/sym/bat/getBatchSchdulForUpdate.do")
    public String selectBatchSchdulForUpdate(@ModelAttribute("searchVO") BatchSchdul batchSchdul, ModelMap model)
            throws Exception {
        referenceData(model);
        BatchSchdulDto dto = batchSchdulService.getBatchSchdul(batchSchdul.getBatchSchdulId());
        model.addAttribute("batchSchdul", convertToVo(dto));
        return "egovframework/com/sym/bat/EgovBatchSchdulUpdt";
    }

    @RequestMapping("/sym/bat/updateBatchSchdul.do")
    public String updateBatchSchdul(@Valid @ModelAttribute("batchSchdul") BatchSchdul batchSchdul,
            BindingResult bindingResult, ModelMap model) throws Exception {
        if (!EgovUserDetailsHelper.isAuthenticated()) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        if (bindingResult.hasErrors()) {
            referenceData(model);
            return "egovframework/com/sym/bat/EgovBatchSchdulUpdt";
        }

        String userId = EgovUserDetailsHelper.getAuthenticatedUser() != null
                ? ((egovframework.com.cmm.LoginVO) EgovUserDetailsHelper.getAuthenticatedUser()).getUniqId()
                : "";

        batchSchdulService.updateBatchSchdul(batchSchdul.getBatchSchdulId(), userId, convertToDto(batchSchdul));

        // Quartz 연동
        BatchSchdulDto savedDto = batchSchdulService.getBatchSchdul(batchSchdul.getBatchSchdulId());
        batchScheduler.updateBatchSchdul(convertToVo(savedDto));

        return "forward:/sym/bat/getBatchSchdulList.do";
    }

    private void referenceData(ModelMap model) throws Exception {
        model.addAttribute("executCycleList", convertToLegacyCodes(commonCodeService.getCodesByGroup("COM047")));
        model.addAttribute("executSchdulDfkSeList", convertToLegacyCodes(commonCodeService.getCodesByGroup("COM074")));

        Map<String, String> hours = new LinkedHashMap<>();
        for (int i = 0; i < 24; i++) {
            String s = String.format("%02d", i);
            hours.put(s, s);
        }
        model.addAttribute("executSchdulHourList", hours);

        Map<String, String> minutes = new LinkedHashMap<>();
        for (int i = 0; i < 60; i++) {
            String s = String.format("%02d", i);
            minutes.put(s, s);
        }
        model.addAttribute("executSchdulMntList", minutes);
        model.addAttribute("executSchdulSecndList", minutes);
    }

    private List<CmmnDetailCode> convertToLegacyCodes(List<CommonCodeDto> codes) {
        return codes.stream().map(c -> {
            CmmnDetailCode dc = new CmmnDetailCode();
            dc.setCode(c.getCode());
            dc.setCodeNm(c.getCodeNm());
            return dc;
        }).collect(Collectors.toList());
    }

    private BatchSchdul convertToVo(BatchSchdulDto dto) {
        BatchSchdul vo = new BatchSchdul();
        vo.setBatchSchdulId(dto.getBatchSchdulId());
        vo.setBatchOpertId(dto.getBatchOpertId());
        vo.setExecutCycle(dto.getExecutCycle());
        vo.setExecutSchdulDe(dto.getExecutSchdulDe());
        vo.setExecutSchdulHour(dto.getExecutSchdulHour());
        vo.setExecutSchdulMnt(dto.getExecutSchdulMnt());
        vo.setExecutSchdulSecnd(dto.getExecutSchdulSecnd());
        vo.setBatchOpertNm(dto.getBatchOpertNm());
        vo.setBatchProgrm(dto.getBatchProgrm());
        vo.setExecutCycleNm(dto.getExecutCycleNm());
        vo.setExecutSchdul(dto.getExecutSchdul());
        if (dto.getExecutSchdulDfkSes() != null) {
            vo.setExecutSchdulDfkSes(dto.getExecutSchdulDfkSes().toArray(new String[0]));
        }
        return vo;
    }

    private BatchSchdulDto convertToDto(BatchSchdul vo) {
        return BatchSchdulDto.builder()
                .batchOpertId(vo.getBatchOpertId())
                .executCycle(vo.getExecutCycle())
                .executSchdulDe(vo.getExecutSchdulDe())
                .executSchdulHour(vo.getExecutSchdulHour())
                .executSchdulMnt(vo.getExecutSchdulMnt())
                .executSchdulSecnd(vo.getExecutSchdulSecnd())
                .executSchdulDfkSes(
                        vo.getExecutSchdulDfkSes() != null ? java.util.Arrays.asList(vo.getExecutSchdulDfkSes()) : null)
                .build();
    }
}
