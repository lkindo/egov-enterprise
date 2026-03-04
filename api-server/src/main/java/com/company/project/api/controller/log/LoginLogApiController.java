package com.company.project.api.controller.log;

import com.company.project.service.log.LoginLogManageService;
import com.company.project.service.log.dto.LoginLogDto;
import egovframework.com.cmm.ComDefaultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
 * 로그??로그 관리? ?한 REST API 컨트롤러
 */
@Slf4j
@Tag(name = "LoginLog", description = "로그??로그 관?API")
@RestController
@RequestMapping("/api/v1/log/login")
@RequiredArgsConstructor
public class LoginLogApiController {

    private final LoginLogManageService loginLogManageService;
    private final EgovPropertyService propertiesService;

    /**
     * 로그??로그 목록??조회?다.
     */
    @Operation(summary = "로그??로그 목록 조회", description = "검??조건???른 로그??로그 목록??조회?니??")
    @GetMapping("/list")
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
     * 로그??로그 ?세 ?보?조회?다.
     */
    @Operation(summary = "로그??로그 ?세 조회", description = "로그 ID??정 로그??로그???세 ?보?조회?니??")
    @GetMapping("/{logId}")
    public ResponseEntity<?> selectLoginLog(@PathVariable("logId") String logId) throws Exception {
        LoginLogDto result = loginLogManageService.selectLoginLog(logId.trim());
        if (result == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(result);
    }
}