package nuri.foundation.api.controller.system.log;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.service.log.LogManageService;
import nuri.foundation.service.log.dto.SysLogDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @Operation(summary = "시스템 로그 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SysLogDto>>> getSysLogList(
            @ModelAttribute BaseSearchDto searchDto) throws Exception {
        
        List<SysLogDto> list = logManageService.selectSysLogList(searchDto);
        int totCnt = logManageService.selectSysLogListTotCnt(searchDto);
        
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchDto.getPageIndex(), searchDto.getPageUnit(), totCnt)));
    }

    @Operation(summary = "시스템 로그 상세 조회")
    @GetMapping("/{requestId}")
    public ResponseEntity<ApiResponse<SysLogDto>> getSysLog(
            @PathVariable("requestId") String requestId) throws Exception {
        SysLogDto result = logManageService.selectSysLog(requestId.trim());
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
