package com.company.project.api.controller.backup;

import com.company.project.service.backup.EgovBackupResultService;
import com.company.project.service.backup.dto.BackupResultDto;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.sym.bak.service.BackupResult;
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
 * 백업결과관리에 대한 controller 클래스 (Modernized)
 */
@Controller
public class EgovBackupResultController {

    @Resource(name = "backupResultService")
    private EgovBackupResultService backupResultService;

    @Resource(name = "propertiesService")
    private EgovPropertyService propertyService;

    @Resource(name = "egovMessageSource")
    private EgovMessageSource egovMessageSource;

    /**
     * 백업결과을 삭제한다.
     */
    @RequestMapping("/sym/sym/bak/deleteBackupResult.do")
    public String deleteBackupResult(BackupResult backupResult, ModelMap model) throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!isAuthenticated) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        backupResultService.deleteBackupResult(backupResult.getBackupResultId());

        return "forward:/sym/sym/bak/getBackupResultList.do";
    }

    /**
     * 백업결과정보을 상세조회한다.
     */
    @RequestMapping("/sym/sym/bak/getBackupResult.do")
    public String selectBackupResult(@ModelAttribute("searchVO") BackupResult backupResult, ModelMap model)
            throws Exception {
        BackupResultDto dto = backupResultService.getBackupResult(backupResult.getBackupResultId());
        model.addAttribute("resultInfo", convertToVo(dto));
        return "egovframework/com/sym/sym/bak/EgovBackupResultDetail";
    }

    /**
     * 백업결과 목록을 조회한다.
     */
    @IncludedInfo(name = "백업결과관리", order = 1151, gid = 60)
    @RequestMapping({ "/sym/sym/bak/getBackupResultList.do", "/sym/sym/bak/EgovBackupResultList.do" })
    public String selectBackupResultList(@ModelAttribute("searchVO") BackupResult searchVO, ModelMap model)
            throws Exception {
        searchVO.setPageUnit(propertyService.getInt("pageUnit"));
        searchVO.setPageSize(propertyService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        Page<BackupResultDto> page = backupResultService.getBackupResultList(
                searchVO.getSttus(),
                searchVO.getSearchKeywordFrom(),
                searchVO.getSearchKeywordTo(),
                searchVO.getSearchCondition(),
                searchVO.getSearchKeyword(),
                PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit()));

        List<BackupResult> resultList = page.getContent().stream()
                .map(this::convertToVo)
                .collect(Collectors.toList());

        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        model.addAttribute("resultList", resultList);
        model.addAttribute("resultCnt", page.getTotalElements());
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/sym/bak/EgovBackupResultList";
    }

    private BackupResult convertToVo(BackupResultDto dto) {
        BackupResult vo = new BackupResult();
        vo.setBackupResultId(dto.getBackupResultId());
        vo.setBackupOpertId(dto.getBackupOpertId());
        vo.setBackupOpertNm(dto.getBackupOpertNm());
        vo.setBackupFile(dto.getBackupFile());
        vo.setSttus(dto.getSttus());
        vo.setSttusNm(dto.getSttusNm());
        vo.setExecutBeginTime(dto.getExecutBeginTime());
        vo.setExecutEndTime(dto.getExecutEndTime());
        vo.setErrorInfo(dto.getErrorInfo());
        vo.setBackupOrginlDrctry(dto.getBackupOrginlDrctry());
        vo.setBackupStreDrctry(dto.getBackupStreDrctry());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        return vo;
    }
}
