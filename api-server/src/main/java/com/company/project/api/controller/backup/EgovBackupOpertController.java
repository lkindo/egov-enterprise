package com.company.project.api.controller.backup;

import com.company.project.service.backup.EgovBackupOpertService;
import com.company.project.service.backup.dto.BackupOpertDto;
import com.company.project.service.code.EgovCommonCodeService;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.sym.bak.service.BackupScheduler;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 백업작업관리에 대한 controller 클래스 (Modernized)
 */
@Controller
public class EgovBackupOpertController {

    @Resource(name = "backupOpertService")
    private EgovBackupOpertService backupOpertService;

    @Resource(name = "propertiesService")
    private EgovPropertyService propertyService;

    @Resource(name = "egovMessageSource")
    private EgovMessageSource egovMessageSource;

    @Resource(name = "egovBackupOpertIdGnrService")
    private EgovIdGnrService idgenService;

    @Resource(name = "backupScheduler")
    private BackupScheduler backupScheduler;

    @Resource(name = "egovCommonCodeService")
    private EgovCommonCodeService commonCodeService;

    /**
     * 백업작업을 삭제한다.
     */
    @RequestMapping({ "/sym/sym/bak/deleteBackupOpert.do" })
    public String deleteBackupOpert(@RequestParam("backupOpertId") String backupOpertId, ModelMap model)
            throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!isAuthenticated) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        BackupOpertDto dto = backupOpertService.getBackupOpert(backupOpertId);
        if (dto != null) {
            // Quartz 연동
            backupScheduler.deleteBackupOpert(dto);
            backupOpertService.deleteBackupOpert(backupOpertId);
        }

        return "forward:/sym/sym/bak/getBackupOpertList.do";
    }

    /**
     * 백업작업을 등록한다.
     */
    @RequestMapping("/sym/sym/bak/addBackupOpert.do")
    public String insertBackupOpert(@ModelAttribute("backupOpert") BackupOpertDto backupOpert,
            BindingResult bindingResult, ModelMap model)
            throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!isAuthenticated) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        if (bindingResult.hasErrors()) {
            referenceData(model);
            return "egovframework/com/sym/sym/bak/EgovBackupOpertRegist";
        }

        String nextId = idgenService.getNextStringId();
        backupOpert.setBackupOpertId(nextId);

        backupOpertService.createBackupOpert(loginVO.getUniqId(), backupOpert);

        // Quartz 연동
        backupScheduler.insertBackupOpert(backupOpert);

        model.addAttribute("resultMsg", "success.common.insert");
        return "forward:/sym/sym/bak/getBackupOpertList.do";
    }

    /**
     * 백업작업정보을 상세조회한다.
     */
    @RequestMapping("/sym/sym/bak/getBackupOpert.do")
    public String selectBackupOpert(@RequestParam("backupOpertId") String backupOpertId, ModelMap model)
            throws Exception {
        BackupOpertDto dto = backupOpertService.getBackupOpert(backupOpertId);
        model.addAttribute("resultInfo", dto);
        return "egovframework/com/sym/sym/bak/EgovBackupOpertDetail";
    }

    /**
     * 등록화면을 위한 백업작업정보을 조회한다.
     */
    @RequestMapping("/sym/sym/bak/getBackupOpertForRegist.do")
    public String selectBackupOpertForRegist(ModelMap model)
            throws Exception {
        referenceData(model);
        model.addAttribute("backupOpert", new BackupOpertDto());
        return "egovframework/com/sym/sym/bak/EgovBackupOpertRegist";
    }

    /**
     * 수정화면을 위한 백업작업정보을 조회한다.
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
     * 백업작업 목록을 조회한다.
     */
    @IncludedInfo(name = "백업관리", order = 1150, gid = 60)
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
     * 백업작업을 수정한다.
     */
    @RequestMapping("/sym/sym/bak/updateBackupOpert.do")
    public String updateBackupOpert(@ModelAttribute("backupOpert") BackupOpertDto backupOpert,
            BindingResult bindingResult, ModelMap model)
            throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!isAuthenticated) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }
        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        if (bindingResult.hasErrors()) {
            referenceData(model);
            return "egovframework/com/sym/sym/bak/EgovBackupOpertUpdt";
        }

        backupOpertService.updateBackupOpert(backupOpert.getBackupOpertId(), loginVO.getUniqId(), backupOpert);

        // Quartz 연동
        backupScheduler.updateBackupOpert(backupOpert);

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
