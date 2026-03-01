package com.company.project.api.controller.log;

import com.company.project.service.log.LoginLogManageService;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * 로그??로그 관리�? ?�한 컨트롤러 (Legacy JSP ?�용)
 */
@Slf4j
@Controller
@RequestMapping("/sym/log/clg")
@RequiredArgsConstructor
public class LoginLogManageController {

    private final LoginLogManageService loginLogManageService;
    private final EgovPropertyService propertiesService;

    /**
     * 로그??로그 목록??조회?�다. (JSP 방식)
     */
    @RequestMapping("/SelectLoginLogList.do")
    public String selectLoginLogListJsp(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model) throws Exception {
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
        return "sym/log/clg/EgovLoginLogList";
    }
}
