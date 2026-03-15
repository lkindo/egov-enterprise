package com.company.project.api.controller.system.log;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.log.LoginLogManageService;
import com.company.project.service.log.dto.LoginLogDto;
import egovframework.com.cmm.ComDefaultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 로그인 로그 관리를 위한 REST API 컨트롤러 (Admin)
 */
@Slf4j
@Tag(name = "LoginLog", description = "로그인 로그 관리 API (Admin)")
@RestController("systemLoginLogApiController")
@RequestMapping("/api/v1/admin/system/logs/login")
@RequiredArgsConstructor
public class LoginLogApiController {

    private final LoginLogManageService loginLogManageService;
    private final EgovPropertyService propertiesService;

    @Operation(summary = "로그인 로그 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LoginLogDto>>> getLoginLogList(
            @ModelAttribute ComDefaultVO searchVO) throws Exception {
        
        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        searchVO.setFirstIndex((searchVO.getPageIndex() - 1) * searchVO.getPageUnit());
        searchVO.setLastIndex(searchVO.getPageIndex() * searchVO.getPageUnit());
        searchVO.setRecordCountPerPage(searchVO.getPageUnit());

        List<LoginLogDto> list = loginLogManageService.selectLoginLogList(searchVO);
        int totCnt = loginLogManageService.selectLoginLogListTotCnt(searchVO);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchVO.getPageIndex(), searchVO.getPageUnit(), totCnt)));
    }

    @Operation(summary = "로그인 로그 상세 조회")
    @GetMapping("/{logId}")
    public ResponseEntity<ApiResponse<LoginLogDto>> getLoginLog(
            @PathVariable("logId") String logId) throws Exception {
        LoginLogDto result = loginLogManageService.selectLoginLog(logId.trim());
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
