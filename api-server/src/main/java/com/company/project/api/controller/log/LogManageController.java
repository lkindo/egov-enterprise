package com.company.project.api.controller.log;

import com.company.project.service.log.LogManageService;
import com.company.project.service.log.dto.SysLogDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

/**
 * 로그 관리 컨트롤러
 */
@Controller
@RequiredArgsConstructor
public class LogManageController {

    private final LogManageService logManageService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    /**
     * 시스템 로그 목록 조회
     */
    @RequestMapping("/sym/log/lgm/SelectSysLogList.do")
    public String selectSysLogList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
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

        model.addAttribute("resultList", logManageService.selectSysLogList(searchVO));

        int totCnt = logManageService.selectSysLogListTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("resultCnt", String.valueOf(totCnt));

        return "sym/log/lgm/EgovSysLogList";
    }

    /**
     * 시스템 로그 상세 조회
     */
    @RequestMapping("/sym/log/lgm/InqireSysLog.do")
    public String selectSysLog(@RequestParam("requstId") String requstId, ModelMap model)
            throws Exception {
        SysLogDto vo = logManageService.selectSysLog(requstId.trim());
        model.addAttribute("result", vo);
        return "sym/log/lgm/EgovSysLogInqire";
    }
}
