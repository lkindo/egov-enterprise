package com.company.project.api.controller.backup;

import com.company.project.service.backup.EgovBackupOpertService;
import com.company.project.service.backup.dto.BackupOpertDto;
import com.company.project.service.code.EgovCommonCodeService;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.sym.bak.service.BackupOpert;
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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    public String deleteBackupOpert(BackupOpert backupOpert, ModelMap model) throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!isAuthenticated) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        // Quartz 연동 (레거시 코드 활용)
        backupScheduler.deleteBackupOpert(backupOpert);

        backupOpertService.deleteBackupOpert(backupOpert.getBackupOpertId());

        return "forward:/sym/sym/bak/getBackupOpertList.do";
    }

    /**
     * 백업작업을 등록한다.
     */
    @RequestMapping("/sym/sym/bak/addBackupOpert.do")
    public String insertBackupOpert(BackupOpert backupOpert, BindingResult bindingResult, ModelMap model)
            throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!isAuthenticated) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        // Validator 생략 (DTO 변환 및 서비스 호출로 대체)
        if (bindingResult.hasErrors()) {
            referenceData(model);
            return "egovframework/com/sym/sym/bak/EgovBackupOpertRegist";
        }

        String nextId = idgenService.getNextStringId();
        backupOpert.setBackupOpertId(nextId);

        BackupOpertDto dto = convertToDto(backupOpert);
        backupOpertService.createBackupOpert(loginVO.getUniqId(), dto);

        // Quartz 연동
        backupScheduler.insertBackupOpert(backupOpert);

        model.addAttribute("resultMsg", "success.common.insert");
        return "forward:/sym/sym/bak/getBackupOpertList.do";
    }

    /**
     * 백업작업정보을 상세조회한다.
     */
    @RequestMapping("/sym/sym/bak/getBackupOpert.do")
    public String selectBackupOpert(@ModelAttribute("searchVO") BackupOpert backupOpert, ModelMap model)
            throws Exception {
        BackupOpertDto dto = backupOpertService.getBackupOpert(backupOpert.getBackupOpertId());
        model.addAttribute("resultInfo", convertToVo(dto));
        return "egovframework/com/sym/sym/bak/EgovBackupOpertDetail";
    }

    /**
     * 등록화면을 위한 백업작업정보을 조회한다.
     */
    @RequestMapping("/sym/sym/bak/getBackupOpertForRegist.do")
    public String selectBackupOpertForRegist(@ModelAttribute("searchVO") BackupOpert backupOpert, ModelMap model)
            throws Exception {
        referenceData(model);
        model.addAttribute("backupOpert", backupOpert);
        return "egovframework/com/sym/sym/bak/EgovBackupOpertRegist";
    }

    /**
     * 수정화면을 위한 백업작업정보을 조회한다.
     */
    @RequestMapping("/sym/sym/bak/getBackupOpertForUpdate.do")
    public String selectBackupOpertForUpdate(@ModelAttribute("searchVO") BackupOpert backupOpert, ModelMap model)
            throws Exception {
        referenceData(model);
        BackupOpertDto dto = backupOpertService.getBackupOpert(backupOpert.getBackupOpertId());
        model.addAttribute("backupOpert", convertToVo(dto));
        return "egovframework/com/sym/sym/bak/EgovBackupOpertUpdt";
    }

    /**
     * 백업작업 목록을 조회한다.
     */
    @IncludedInfo(name = "백업관리", order = 1150, gid = 60)
    @RequestMapping({ "/sym/sym/bak/getBackupOpertList.do", "/sym/sym/bak/EgovBackupOpertList.do" })
    public String selectBackupOpertList(@ModelAttribute("searchVO") BackupOpert searchVO, ModelMap model)
            throws Exception {
        searchVO.setPageUnit(propertyService.getInt("pageUnit"));
        searchVO.setPageSize(propertyService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        Page<BackupOpertDto> page = backupOpertService.getBackupOpertList(
                searchVO.getSearchCondition(),
                searchVO.getSearchKeyword(),
                PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit()));

        List<BackupOpert> resultList = page.getContent().stream()
                .map(this::convertToVo)
                .collect(Collectors.toList());

        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        model.addAttribute("resultList", resultList);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/sym/bak/EgovBackupOpertList";
    }

    /**
     * 백업작업을 수정한다.
     */
    @RequestMapping("/sym/sym/bak/updateBackupOpert.do")
    public String updateBackupOpert(BackupOpert backupOpert, BindingResult bindingResult, ModelMap model)
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

        backupOpertService.updateBackupOpert(backupOpert.getBackupOpertId(), loginVO.getUniqId(),
                convertToDto(backupOpert));

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

    private BackupOpertDto convertToDto(BackupOpert vo) {
        return BackupOpertDto.builder()
                .backupOpertId(vo.getBackupOpertId())
                .backupOpertNm(vo.getBackupOpertNm())
                .backupOrginlDrctry(vo.getBackupOrginlDrctry())
                .backupStreDrctry(vo.getBackupStreDrctry())
                .cmprsSe(vo.getCmprsSe())
                .executCycle(vo.getExecutCycle())
                .executSchdulDe(vo.getExecutSchdulDe())
                .executSchdulHour(vo.getExecutSchdulHour())
                .executSchdulMnt(vo.getExecutSchdulMnt())
                .executSchdulSecnd(vo.getExecutSchdulSecnd())
                .executSchdulDfkSes(vo.getExecutSchdulDfkSes())
                .build();
    }

    private BackupOpert convertToVo(BackupOpertDto dto) {
        BackupOpert vo = new BackupOpert();
        vo.setBackupOpertId(dto.getBackupOpertId());
        vo.setBackupOpertNm(dto.getBackupOpertNm());
        vo.setBackupOrginlDrctry(dto.getBackupOrginlDrctry());
        vo.setBackupStreDrctry(dto.getBackupStreDrctry());
        vo.setCmprsSe(dto.getCmprsSe());
        vo.setCmprsSeNm(dto.getCmprsSeNm());
        vo.setExecutCycle(dto.getExecutCycle());
        vo.setExecutCycleNm(dto.getExecutCycleNm());
        vo.setExecutSchdulDe(dto.getExecutSchdulDe());
        vo.setExecutSchdulHour(dto.getExecutSchdulHour());
        vo.setExecutSchdulMnt(dto.getExecutSchdulMnt());
        vo.setExecutSchdulSecnd(dto.getExecutSchdulSecnd());
        vo.setExecutSchdulDfkSes(dto.getExecutSchdulDfkSes());
        vo.setExecutSchdul(dto.getExecutSchdul());
        return vo;
    }
}
