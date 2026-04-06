package nuri.foundation.api.controller.system.log;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.service.log.LogManageService;
import nuri.foundation.service.log.dto.SysLogDto;
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
 * 시스템 로그 관리를 위한 REST 컨트롤러 (Admin)
 */
@Slf4j
@Tag(name = "SystemLog", description = "시스템 로그 관리 API (Admin)")
@RestController("systemLogApiController")
@RequestMapping("/api/v1/admin/system/logs/system")
@RequiredArgsConstructor
public class SystemLogApiController {

    private final LogManageService logManageService;
    private final EgovPropertyService propertiesService;

    @Operation(summary = "시스템 로그 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SysLogDto>>> getSysLogList(
            @ModelAttribute ComDefaultVO searchVO) throws Exception {
        
        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
        searchVO.setPageSize(propertiesService.getInt("pageSize"));
        
        searchVO.setFirstIndex((searchVO.getPageIndex() - 1) * searchVO.getPageUnit());
        searchVO.setLastIndex(searchVO.getPageIndex() * searchVO.getPageUnit());
        searchVO.setRecordCountPerPage(searchVO.getPageUnit());
        
        List<SysLogDto> list = logManageService.selectSysLogList(searchVO);
        int totCnt = logManageService.selectSysLogListTotCnt(searchVO);
        
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchVO.getPageIndex(), searchVO.getPageUnit(), totCnt)));
    }

    @Operation(summary = "시스템 로그 상세 조회")
    @GetMapping("/{requestId}")
    public ResponseEntity<ApiResponse<SysLogDto>> getSysLog(
            @PathVariable("requestId") String requestId) throws Exception {
        SysLogDto result = logManageService.selectSysLog(requestId.trim());
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
