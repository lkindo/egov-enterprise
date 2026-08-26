package nuri.api.controller.foundation.controller.system.log;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.log.WebLogManageService;
import nuri.business.service.log.dto.WebLogDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.security.annotation.AdminOrSystem;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 웹 로그 조회 API (Admin).
 *
 * <p>[D-1 이행] 관리 화면 {@code /admin/system/logs/web} 은 이미 존재했고
 * {@code systemLogAdminService.getWebLogs()} 를 호출하고 있었으나 <b>대응 엔드포인트가 없었다</b>.
 * 그 사이 {@code tb_web_log} 에는 28,104행이 쌓여 있었다(2026-08-05 실측) — 수집은 되는데
 * 볼 수 없는 상태였다.
 *
 * <p><b>조회만 노출한다.</b> 적재는 {@code WebAuditLogListener}, 삭제는 보존기간 정책
 * ({@code LogRetentionScheduler})이 담당한다. 감사 로그를 관리자가 임의로 수정·삭제할 수 있으면
 * 증적으로서의 가치가 사라지므로 쓰기 엔드포인트를 두지 않는다.
 *
 * <p>인가는 {@code @AdminOrSystem} 을 <b>메서드에 직접</b> 붙인다. 이 경로는
 * {@code /api/v1/admin/**} 이라 {@code secure-paths} URL 인가로도 덮이지만, 그것은 목록 한 줄이
 * 빠지면 함께 사라지는 단일 실패점이다(백엔드 헌법 제8조 이중 검증).
 */
@Slf4j
@Tag(name = "WebLog", description = "웹 로그 조회 API (Admin)")
@RestController("systemWebLogApiController")
@RequestMapping("/api/v1/admin/system/logs/web")
@RequiredArgsConstructor
public class WebLogApiController {

    private final WebLogManageService webLogManageService;

    @Operation(summary = "웹 로그 목록 조회", description = "URL 부분일치 검색과 페이징을 지원한다.")
    @AdminOrSystem
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<WebLogDto>>> getWebLogList(
            @ModelAttribute BaseSearchDto searchDto) {
        Page<WebLogDto> page = webLogManageService.selectWebLogList(searchDto);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    /**
     * 웹 로그 전체 결과 xlsx export.
     *
     * <p>[검색 조건 동일 바인딩] 목록 API 와 같은 {@link BaseSearchDto} 를 같은 서비스 메서드에 그대로
     * 전달하므로 화면에서 보던 필터(검색어·기간)와 정확히 같은 모집단이 내려간다. 페이지 파라미터만
     * 전체 결과로 덮어써 페이지와 무관하게 조건 일치 전량을 내보낸다.
     *
     * <p>[상한 판정] 이 서비스는 {@code Page} 를 돌려주므로 1건만 조회해 총 건수를 먼저 읽고,
     * 상한을 넘지 않을 때만 전량을 다시 조회한다 — 상한 초과 요청이 힙에 전량을 올리지 않게 한다.
     *
     * <p>[인가 — H3] 목록 API 와 동일한 ADMIN/SYSTEM 축이다. URL 게이트로도 덮이지만 그 목록 한 줄이
     * 빠지면 함께 사라지는 단일 실패점이므로 {@code @AdminOrSystem} 을 메서드에 직접 붙인다.
     *
     * <p>[헌법 제6조 3항] binary/stream 예외의 세 조건(attachment · 명시 produces · 허용 census)을 따른다.
     */
    @Operation(summary = "웹 로그 전체 결과 xlsx export",
            description = "검색 조건(검색어·기간)은 목록 API 와 동일하게 바인딩하되 페이지 파라미터는 무시하고 "
                    + "조건 일치 전체 결과를 xlsx 로 스트리밍한다. 행 수가 상한을 초과하면 400 을 반환한다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "xlsx 바이너리 스트림",
            content = @Content(mediaType = LogExcelExport.XLSX_MEDIA_TYPE,
                    schema = @Schema(type = "string", format = "binary")))
    @AdminOrSystem
    @GetMapping(value = "/export.xlsx", produces = LogExcelExport.XLSX_MEDIA_TYPE)
    public ResponseEntity<StreamingResponseBody> exportWebLogs(
            @ModelAttribute BaseSearchDto searchDto) {

        searchDto.setPageIndex(1);
        searchDto.setPageUnit(1);
        int totalCount = (int) webLogManageService.selectWebLogList(searchDto).getTotalElements();
        LogExcelExport.assertWithinCap(totalCount);

        searchDto.setPageUnit(Math.max(totalCount, 1));
        List<WebLogDto> rows = webLogManageService.selectWebLogList(searchDto).getContent();

        return LogExcelExport.attachment("web-logs.xlsx", "web-logs",
                new String[]{"웹 로그 일련번호", "URL", "요청자 ID", "요청 IP", "발생일자", "처리시간(ms)"},
                rows,
                (row, dto) -> {
                    row.createCell(0).setCellValue(LogExcelExport.nullSafe(dto.webLogSn()));
                    row.createCell(1).setCellValue(LogExcelExport.nullSafe(dto.url()));
                    row.createCell(2).setCellValue(LogExcelExport.nullSafe(dto.dmndUserId()));
                    row.createCell(3).setCellValue(LogExcelExport.nullSafe(dto.dmndUserIpAddr()));
                    row.createCell(4).setCellValue(LogExcelExport.nullSafe(dto.occrYmd()));
                    row.createCell(5).setCellValue(LogExcelExport.nullSafe(dto.prcsTm()));
                });
    }
}
