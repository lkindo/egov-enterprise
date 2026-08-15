package nuri.api.controller.foundation.controller.system.log;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.log.LoginLogManageService;
import nuri.business.service.log.dto.LoginLogDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @Operation(summary = "로그인 로그 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LoginLogDto>>> getLoginLogList(
            @ModelAttribute BaseSearchDto searchDto) throws Exception {
        
        List<LoginLogDto> list = loginLogManageService.selectLoginLogList(searchDto);
        int totCnt = loginLogManageService.selectLoginLogListTotCnt(searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchDto.getPageIndex(), searchDto.getPageUnit(), totCnt)));
    }

    @Operation(summary = "로그인 로그 상세 조회")
    @GetMapping("/{lgnSn}")
    public ResponseEntity<ApiResponse<LoginLogDto>> getLoginLog(
            @PathVariable("lgnSn") Long lgnSn) throws Exception {
        LoginLogDto result = loginLogManageService.selectLoginLogDetail(lgnSn);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
