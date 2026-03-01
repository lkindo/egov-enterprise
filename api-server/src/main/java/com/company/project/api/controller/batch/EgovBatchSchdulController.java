package com.company.project.api.controller.batch;

import com.company.project.service.batch.EgovBatchSchdulService;
import com.company.project.service.batch.dto.BatchSchdulDto;
import com.company.project.service.code.EgovCommonCodeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import jakarta.validation.Valid;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Î∞∞Ïπò?§Ï?Ï§?Í¥ÄÎ¶¨Î? ?ÑÌïú Ïª®Ìä∏Î°§Îü¨ ?¥Îûò?? */
@Slf4j
@Controller
@RequiredArgsConstructor
public class EgovBatchSchdulController {

    private final EgovBatchSchdulService batchSchdulService;
    private final EgovPropertyService propertyService;
    private final MessageSource messageSource;
    private final EgovCommonCodeService commonCodeService;

    private static final Map<String, String> HOURS;
    private static final Map<String, String> MINUTES;

    static {
        Map<String, String> hours = new LinkedHashMap<>();
        for (int i = 0; i < 24; i++) {
            String s = String.format("%02d", i);
            hours.put(s, s);
        }
        HOURS = Collections.unmodifiableMap(hours);
        Map<String, String> minutes = new LinkedHashMap<>();
        for (int i = 0; i < 60; i++) {
            String s = String.format("%02d", i);
            minutes.put(s, s);
        }
        MINUTES = Collections.unmodifiableMap(minutes);
    }

    /**
     * Î∞∞Ïπò?§Ï?Ï§?Î™©Î°ù??Ï°∞Ìöå?úÎã§.
     */
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

    /**
     * Î∞∞Ïπò?§Ï?Ï§??ÅÏÑ∏ ?ïÎ≥¥Î•?Ï°∞Ìöå?úÎã§.
     */
    @RequestMapping("/sym/bat/getBatchSchdul.do")
    public String selectBatchSchdul(@ModelAttribute("searchVO") BatchSchdul batchSchdul, ModelMap model)
            throws Exception {
        BatchSchdulDto dto = batchSchdulService.getBatchSchdul(batchSchdul.getBatchSchdulId());
        model.addAttribute("resultInfo", convertToVo(dto));
        return "egovframework/com/sym/bat/EgovBatchSchdulDetail";
    }

    /**
     * Î∞∞Ïπò?§Ï?Ï§??ïÎ≥¥Î•???†ú?úÎã§.
     */
    @RequestMapping("/sym/bat/deleteBatchSchdul.do")
    public String deleteBatchSchdul(BatchSchdul batchSchdul, ModelMap model) throws Exception {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            model.addAttribute("message", messageSource.getMessage("fail.common.login", null, LocaleContextHolder.getLocale()));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        // batchScheduler.deleteBatchSchdul(batchSchdul); // Legacy Quartz scheduler removed
        batchSchdulService.deleteBatchSchdul(batchSchdul.getBatchSchdulId());
        return "forward:/sym/bat/getBatchSchdulList.do";
    }

    /**
     * Î∞∞Ïπò?§Ï?Ï§??±Î°ù ?îÎ©¥?ºÎ°ú ?¥Îèô?úÎã§.
     */
    @RequestMapping("/sym/bat/getBatchSchdulForRegist.do")
    public String selectBatchSchdulForRegist(@ModelAttribute("searchVO") BatchSchdul batchSchdul, ModelMap model)
            throws Exception {
        referenceData(model);
        model.addAttribute("batchSchdul", batchSchdul);
        return "egovframework/com/sym/bat/EgovBatchSchdulRegist";
    }

    /**
     * Î∞∞Ïπò?§Ï?Ï§??ïÎ≥¥Î•??±Î°ù?úÎã§.
     */
    @RequestMapping("/sym/bat/addBatchSchdul.do")
    public String insertBatchSchdul(@Valid @ModelAttribute("batchSchdul") BatchSchdul batchSchdul,
            BindingResult bindingResult, ModelMap model) throws Exception {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            model.addAttribute("message", messageSource.getMessage("fail.common.login", null, LocaleContextHolder.getLocale()));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        if (bindingResult.hasErrors()) {
            referenceData(model);
            return "egovframework/com/sym/bat/EgovBatchSchdulRegist";
        }

        String userId = auth.getName();
        batchSchdulService.createBatchSchdul(userId, convertToDto(batchSchdul));

        // batchScheduler.insertBatchSchdul(...); // Legacy Quartz scheduler removed

        model.addAttribute("resultMsg", "success.common.insert");
        return "forward:/sym/bat/getBatchSchdulList.do";
    }

    /**
     * Î∞∞Ïπò?§Ï?Ï§??òÏ†ï ?îÎ©¥?ºÎ°ú ?¥Îèô?úÎã§.
     */
    @RequestMapping("/sym/bat/getBatchSchdulForUpdate.do")
    public String selectBatchSchdulForUpdate(@ModelAttribute("searchVO") BatchSchdul batchSchdul, ModelMap model)
            throws Exception {
        referenceData(model);
        BatchSchdulDto dto = batchSchdulService.getBatchSchdul(batchSchdul.getBatchSchdulId());
        model.addAttribute("batchSchdul", convertToVo(dto));
        return "egovframework/com/sym/bat/EgovBatchSchdulUpdt";
    }

    /**
     * Î∞∞Ïπò?§Ï?Ï§??ïÎ≥¥Î•??òÏ†ï?úÎã§.
     */
    @RequestMapping("/sym/bat/updateBatchSchdul.do")
    public String updateBatchSchdul(@Valid @ModelAttribute("batchSchdul") BatchSchdul batchSchdul,
            BindingResult bindingResult, ModelMap model) throws Exception {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            model.addAttribute("message", messageSource.getMessage("fail.common.login", null, LocaleContextHolder.getLocale()));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        if (bindingResult.hasErrors()) {
            referenceData(model);
            return "egovframework/com/sym/bat/EgovBatchSchdulUpdt";
        }

        String userId = auth.getName();
        batchSchdulService.updateBatchSchdul(batchSchdul.getBatchSchdulId(), userId, convertToDto(batchSchdul));

        // batchScheduler.updateBatchSchdul(...); // Legacy Quartz scheduler removed

        return "forward:/sym/bat/getBatchSchdulList.do";
    }

    private void referenceData(ModelMap model) throws Exception {
        model.addAttribute("executCycleList", commonCodeService.getCodesByGroup("COM047"));
        model.addAttribute("executSchdulDfkSeList", commonCodeService.getCodesByGroup("COM074"));
        model.addAttribute("executSchdulHourList", HOURS);
        model.addAttribute("executSchdulMntList", MINUTES);
        model.addAttribute("executSchdulSecndList", MINUTES);
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
