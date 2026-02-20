package com.company.project.api.controller.log;

import com.company.project.service.log.LogManageService;

import com.company.project.service.log.dto.SysLogDto;

import egovframework.com.cmm.ComDefaultVO;

import jakarta.annotation.Resource;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

import org.egovframe.rte.fdl.property.EgovPropertyService;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.HashMap;

import java.util.List;

import java.util.Map;

/**

 * ??      ??         ???     ??REST ?      ?      ?      

 */

@Slf4j

@RestController

@RequestMapping("/api/v1/log/sys")

@RequiredArgsConstructor

public class LogManageController {

    private final LogManageService logManageService;

    @Resource(name = "propertiesService")

    protected EgovPropertyService propertiesService;

    /**

     * ??      ??         ??            ?         ??

     */

    @GetMapping("/list")

    public ResponseEntity<?> selectSysLogList(@ModelAttribute("searchVO") ComDefaultVO searchVO) throws Exception {

        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));

        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());

        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());

        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());

        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());

        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        List<SysLogDto> list = logManageService.selectSysLogList(searchVO);

        int totCnt = logManageService.selectSysLogListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        Map<String, Object> result = new HashMap<>();

        result.put("list", list);

        result.put("paginationInfo", paginationInfo);

        return ResponseEntity.ok(result);

    }

    /**

     * ??      ??         ???                   ??

     */

    @GetMapping("/{requestId}")

    public ResponseEntity<?> selectSysLog(@PathVariable("requestId") String requestId) throws Exception {

        SysLogDto result = logManageService.selectSysLog(requestId.trim());

        if (result == null) {

            return ResponseEntity.notFound().build();

        }

        return ResponseEntity.ok(result);

    }

}

