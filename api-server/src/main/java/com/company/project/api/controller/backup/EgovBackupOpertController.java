package com.company.project.api.controller.backup;

import com.company.project.service.backup.EgovBackupOpertService;
import com.company.project.service.backup.dto.BackupOpertDto;
import com.company.project.service.code.EgovCommonCodeService;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.beans.factory.annotation.Qualifier;
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
import org.springframework.web.bind.annotation.RequestParam;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 백업?�업 관리�? ?�한 컨트롤러 ?�래?? */
@Controller
@RequiredArgsConstructor
public class EgovBackupOpertController {

    private final EgovBackupOpertService backupOpertService;
    private final EgovPropertyService propertyService;
    private final MessageSource messageSource;
    @Qualifier("egovBackupOpertIdGnrService")
    private final EgovIdGnrService idgenService;
    private final EgovCommonCodeService commonCodeService;

    /**
     * 백업?�업 ?�보�???��?�다.
     */
    @RequestMapping({ "/sym/sym/bak/deleteBackupOpert.do" })
    public String deleteBackupOpert(@RequestParam("backupOpertId") String backupOpertId, ModelMap model)
            throws Exception {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            model.addAttribute("message", messageSource.getMessage("fail.common.login", null, LocaleContextHolder.getLocale()));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        BackupOpertDto dto = backupOpertService.getBackupOpert(backupOpertId);
        if (dto != null) {
            // backupScheduler.deleteBackupOpert(dto); // Legacy Quartz scheduler removed
            backupOpertService.deleteBackupOpert(backupOpertId);
        }
        return "forward:/sym/sym/bak/getBackupOpertList.do";
    }

    /**
     * 백업?�업 ?�보�??�록?�다.
     */
    @RequestMapping("/sym/sym/bak/addBackupOpert.do")
    public String insertBackupOpert(@ModelAttribute("backupOpert") BackupOpertDto backupOpert,
            BindingResult bindingResult, ModelMap model)
            throws Exception {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            model.addAttribute("message", messageSource.getMessage("fail.common.login", null, LocaleContextHolder.getLocale()));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        if (bindingResult.hasErrors()) {
            referenceData(model);
            return "egovframework/com/sym/sym/bak/EgovBackupOpertRegist";
        }

        String nextId = idgenService.getNextStringId();
        backupOpert.setBackupOpertId(nextId);
        backupOpertService.createBackupOpert(auth.getName(), backupOpert);

        // backupScheduler.insertBackupOpert(backupOpert); // Legacy Quartz scheduler removed
        model.addAttribute("resultMsg", "success.common.insert");

        return "forward:/sym/sym/bak/getBackupOpertList.do";
    }

    /**
     * 백업?�업 ?�세 ?�보�?조회?�다.
     */
    @RequestMapping("/sym/sym/bak/getBackupOpert.do")
    public String selectBackupOpert(@RequestParam("backupOpertId") String backupOpertId, ModelMap model)
            throws Exception {
        BackupOpertDto dto = backupOpertService.getBackupOpert(backupOpertId);
        model.addAttribute("resultInfo", dto);
        return "egovframework/com/sym/sym/bak/EgovBackupOpertDetail";
    }

    /**
     * 백업?�업 ?�록 ?�면?�로 ?�동?�다.
     */
    @RequestMapping("/sym/sym/bak/getBackupOpertForRegist.do")
    public String selectBackupOpertForRegist(ModelMap model)
            throws Exception {
        referenceData(model);
        model.addAttribute("backupOpert", new BackupOpertDto());
        return "egovframework/com/sym/sym/bak/EgovBackupOpertRegist";
    }

    /**
     * 백업?�업 ?�정 ?�면?�로 ?�동?�다.
     */
    @RequestMapping("/sym/sym/bak/getBackupOpertForUpdate.do")
    public String selectBackupOpertForUpdate(@RequestParam("backupOpertId") String backupOpertId, ModelMap model)
            throws Exception {
        referenceData(model);
        BackupOpertDto dto = backupOpertService.getBackupOpert(backupOpertId);
        model.addAttribute("backupOpert", dto);
        return "egovframework/com/sym/sym/bak/EgovBackupOpertUpdt";
    }

    /**
     * 백업?�업 목록??조회?�다.
     */
    @RequestMapping({ "/sym/sym/bak/getBackupOpertList.do", "/sym/sym/bak/EgovBackupOpertList.do" })
    public String selectBackupOpertList(
            @RequestParam(value = "searchCondition", required = false) String searchCondition,
            @RequestParam(value = "searchKeyword", required = false) String searchKeyword,
            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex,
            ModelMap model)
            throws Exception {
        int pageUnit = propertyService.getInt("pageUnit");
        int pageSize = propertyService.getInt("pageSize");

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(pageIndex);
        paginationInfo.setRecordCountPerPage(pageUnit);
        paginationInfo.setPageSize(pageSize);

        Page<BackupOpertDto> page = backupOpertService.getBackupOpertList(
                searchCondition,
                searchKeyword,
                PageRequest.of(pageIndex - 1, pageUnit));

        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        model.addAttribute("resultList", page.getContent());
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("searchCondition", searchCondition);
        model.addAttribute("searchKeyword", searchKeyword);

        return "egovframework/com/sym/sym/bak/EgovBackupOpertList";
    }

    /**
     * 백업?�업 ?�보�??�정?�다.
     */
    @RequestMapping("/sym/sym/bak/updateBackupOpert.do")
    public String updateBackupOpert(@ModelAttribute("backupOpert") BackupOpertDto backupOpert,
            BindingResult bindingResult, ModelMap model)
            throws Exception {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            model.addAttribute("message", messageSource.getMessage("fail.common.login", null, LocaleContextHolder.getLocale()));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        if (bindingResult.hasErrors()) {
            referenceData(model);
            return "egovframework/com/sym/sym/bak/EgovBackupOpertUpdt";
        }

        backupOpertService.updateBackupOpert(backupOpert.getBackupOpertId(), auth.getName(), backupOpert);
        // backupScheduler.updateBackupOpert(backupOpert); // Legacy Quartz scheduler removed

        return "forward:/sym/sym/bak/getBackupOpertList.do";
    }

    private void referenceData(ModelMap model) throws Exception {
        model.addAttribute("executCycleList", commonCodeService.getCodesByGroup("COM047"));
        model.addAttribute("executSchdulDfkSeList", commonCodeService.getCodesByGroup("COM074"));
        model.addAttribute("cmprsSeList", commonCodeService.getCodesByGroup("COM049"));

        Map<String, String> hours = new LinkedHashMap<>();
        for (int i = 0; i < 24; i++) {
            String val = String.format("%02d", i);
            hours.put(val, val);
        }
        model.addAttribute("executSchdulHourList", hours);

        Map<String, String> minutes = new LinkedHashMap<>();
        for (int i = 0; i < 60; i++) {
            String val = String.format("%02d", i);
            minutes.put(val, val);
        }
        model.addAttribute("executSchdulMntList", minutes);
        model.addAttribute("executSchdulSecndList", minutes);
    }
}
