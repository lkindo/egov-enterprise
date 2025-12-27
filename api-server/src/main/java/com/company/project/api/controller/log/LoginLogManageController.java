package com.company.project.api.controller.log;

import com.company.project.service.log.LoginLogManageService;
import com.company.project.service.log.dto.LoginLogDto;
import com.company.project.service.log.dto.LoginLogVO;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

/**
 * 로그인 로그 관리 컨트롤러
 */
@Controller
@RequiredArgsConstructor
public class LoginLogManageController {

    private final LoginLogManageService loginLogManageService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    /**
     * 로그인 로그 목록 조회
     */
    @RequestMapping("/sym/log/clg/SelectLoginLogList.do")
    public String selectLoginLogList(@ModelAttribute("searchVO") LoginLogVO searchVO, ModelMap model)
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

        model.addAttribute("resultList", loginLogManageService.selectLoginLogList(searchVO));

        int totCnt = loginLogManageService.selectLoginLogListTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("resultCnt", totCnt);

        return "sym/log/clg/EgovLoginLogList";
    }

    /**
     * 로그인 로그 상세 조회
     */
    @RequestMapping("/sym/log/clg/SelectLoginLogDetail.do")
    public String selectLoginLog(@RequestParam("logId") String logId, ModelMap model)
            throws Exception {
        LoginLogDto vo = loginLogManageService.selectLoginLog(logId.trim());
        model.addAttribute("result", vo);
        return "sym/log/clg/EgovLoginLogDetail";
    }
}
