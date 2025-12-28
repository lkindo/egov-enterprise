package com.company.project.api.controller.log;

import com.company.project.service.log.LoginLogManageService;
import com.company.project.service.log.dto.LoginLogDto;
import egovframework.com.cmm.ComDefaultVO;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 로그인 로그 관리 REST 컨트롤러
 */
@Slf4j
@Controller
@RequestMapping("/sym/log/clg")
@RequiredArgsConstructor
public class LoginLogManageController {

    private final LoginLogManageService loginLogManageService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    /**
     * 로그인 로그 목록 조회 (JSP)
     */
    @RequestMapping("/SelectLoginLogList.do")
    public String selectLoginLogListJsp(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
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

        return "sym/log/clg/EgovLoginLogList";
    }

    /**
     * 로그인 로그 목록 조회 (API)
     */
    @GetMapping("/api/v1/list")
    @ResponseBody
    public ResponseEntity<?> selectLoginLogList(@ModelAttribute("searchVO") ComDefaultVO searchVO) throws Exception {
        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        List<LoginLogDto> list = loginLogManageService.selectLoginLogList(searchVO);
        int totCnt = loginLogManageService.selectLoginLogListTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);

        Map<String, Object> result = new HashMap<>();
        result.put("list", list);
        result.put("paginationInfo", paginationInfo);

        return ResponseEntity.ok(result);
    }

    /**
     * 로그인 로그 상세 조회 (API)
     */
    @GetMapping("/api/v1/{logId}")
    @ResponseBody
    public ResponseEntity<?> selectLoginLog(@PathVariable("logId") String logId) throws Exception {
        LoginLogDto result = loginLogManageService.selectLoginLog(logId.trim());
        if (result == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(result);
    }
}
