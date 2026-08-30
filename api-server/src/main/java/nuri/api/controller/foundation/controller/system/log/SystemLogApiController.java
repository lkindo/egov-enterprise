package nuri.api.controller.foundation.controller.system.log;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.log.LogManageService;
import nuri.business.service.log.dto.SysLogDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import nuri.foundation.security.annotation.AdminOrSystem;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
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
            @Valid @ModelAttribute BaseSearchDto searchDto) throws Exception {
        
        List<SysLogDto> list = logManageService.selectSysLogList(searchDto);
        int totCnt = logManageService.selectSysLogListTotCnt(searchDto);
        
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchDto.getPageIndex(), searchDto.getPageUnit(), totCnt)));
    }

    /**
     * 시스템 로그 전체 결과 xlsx export.
     *
     * <p>[검색 조건 동일 바인딩] 목록 API 와 같은 {@link BaseSearchDto} 를 같은 서비스 메서드에 그대로
     * 전달하므로 화면에서 보던 필터(검색어·기간)와 정확히 같은 모집단이 내려간다. 페이지 파라미터만
     * 전체 결과로 덮어써 페이지와 무관하게 조건 일치 전량을 내보낸다.
     *
     * <p>[인가 — H3] 목록 API 와 동일한 ADMIN/SYSTEM 축이다. URL 게이트로도 덮이지만 그 목록 한 줄이
     * 빠지면 함께 사라지는 단일 실패점이므로 {@code @AdminOrSystem} 을 메서드에 직접 붙인다.
     *
     * <p>[헌법 제6조 3항] binary/stream 예외의 세 조건(attachment · 명시 produces · 허용 census)을 따른다.
     */
    @Operation(summary = "시스템 로그 전체 결과 xlsx export",
            description = "검색 조건(검색어·기간)은 목록 API 와 동일하게 바인딩하되 페이지 파라미터는 무시하고 "
                    + "조건 일치 전체 결과를 xlsx 로 스트리밍한다. 행 수가 상한을 초과하면 400 을 반환한다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "xlsx 바이너리 스트림",
            content = @Content(mediaType = LogExcelExport.XLSX_MEDIA_TYPE,
                    schema = @Schema(type = "string", format = "binary")))
    @AdminOrSystem
    @GetMapping(value = "/export.xlsx", produces = LogExcelExport.XLSX_MEDIA_TYPE)
    public ResponseEntity<StreamingResponseBody> exportSystemLogs(
            @Valid @ModelAttribute BaseSearchDto searchDto) throws Exception {

        int totalCount = logManageService.selectSysLogListTotCnt(searchDto);
        LogExcelExport.assertWithinCap(totalCount);

        // 화면 페이징 값이 무엇이든 export 는 전량이다(0건이어도 pageUnit 하한 가드가 기본값으로 수렴).
        searchDto.setPageIndex(1);
        searchDto.setPageUnit(Math.max(totalCount, 1));
        List<SysLogDto> rows = logManageService.selectSysLogList(searchDto);

        return LogExcelExport.attachment("system-logs.xlsx", "system-logs",
                new String[]{"로그 일련번호", "요청 ID", "서비스명", "메서드명", "처리구분", "처리시간",
                        "요청자 ID", "요청 IP", "발생일자"},
                rows,
                (row, dto) -> {
                    row.createCell(0).setCellValue(LogExcelExport.nullSafe(dto.getSysLogSn()));
                    row.createCell(1).setCellValue(LogExcelExport.nullSafe(dto.getDmndId()));
                    row.createCell(2).setCellValue(LogExcelExport.nullSafe(dto.getSrvcNm()));
                    row.createCell(3).setCellValue(LogExcelExport.nullSafe(dto.getMethodNm()));
                    row.createCell(4).setCellValue(LogExcelExport.nullSafe(dto.getPrcsSeCd()));
                    row.createCell(5).setCellValue(LogExcelExport.nullSafe(dto.getPrcsTm()));
                    row.createCell(6).setCellValue(LogExcelExport.nullSafe(dto.getDmndUserId()));
                    row.createCell(7).setCellValue(LogExcelExport.nullSafe(dto.getRqesterIp()));
                    row.createCell(8).setCellValue(LogExcelExport.nullSafe(dto.getOcrnYmd()));
                });
    }

    @Operation(summary = "시스템 로그 상세 조회")
    @GetMapping("/{sysLogSn}")
    public ResponseEntity<ApiResponse<SysLogDto>> getSysLog(
            @PathVariable("sysLogSn") Long sysLogSn) throws Exception {
        SysLogDto result = logManageService.selectSysLogDetail(sysLogSn);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
