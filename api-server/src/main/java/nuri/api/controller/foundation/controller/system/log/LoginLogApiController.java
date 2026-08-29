package nuri.api.controller.foundation.controller.system.log;

import jakarta.validation.Valid;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.security.annotation.AdminOrSystem;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.log.LoginLogManageService;
import nuri.business.service.log.dto.LoginLogDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.OutputStream;
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

    /** export 미디어 타입 — OOXML 스프레드시트(.xlsx). */
    static final String XLSX_MEDIA_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    /**
     * 서버측 전체 결과 export 의 행 상한.
     *
     * <p>[왜 상한인가 — 무제한 스트리밍 금지] 이 엔드포인트는 페이지 무관 <b>전체</b> 결과를 내보낸다.
     * 상한이 없으면 검색 조건이 느슨할 때 단일 HTTP 요청 하나가 수백만 행을 조회·직렬화하며
     * DB 커넥션과 서블릿 스레드를 무기한 점유한다(헌법 제9조 2항 — 커넥션 점유 시간 최소화,
     * 제14조 — OOM 방어). SXSSF 가 워크북 메모리는 창(window) 크기로 억제하지만
     * <b>조회 결과 List 자체는 힙에 실린다</b>. 그래서 행 수를 먼저 세고, 상한 초과면
     * 400 으로 즉시 실패시켜 기간 필터 등으로 조건을 좁히도록 강제한다.
     */
    static final int MAX_EXPORT_ROWS = 100_000;

    /** SXSSF 메모리 창 — 이 행 수를 넘는 행은 임시 파일로 flush 되어 힙에 남지 않는다. */
    private static final int SXSSF_ROW_WINDOW = 200;

    private final LoginLogManageService loginLogManageService;

    @Operation(summary = "로그인 로그 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LoginLogDto>>> getLoginLogList(
            @Valid @ModelAttribute BaseSearchDto searchDto) throws Exception {

        List<LoginLogDto> list = loginLogManageService.selectLoginLogList(searchDto);
        int totCnt = loginLogManageService.selectLoginLogListTotCnt(searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchDto.getPageIndex(), searchDto.getPageUnit(), totCnt)));
    }

    /**
     * 로그인 로그 전체 결과 xlsx export.
     *
     * <p>[검색 조건 동일 바인딩] 목록 API 와 같은 {@link BaseSearchDto} 를 같은 서비스 메서드
     * ({@code selectLoginLogList}/{@code selectLoginLogListTotCnt})에 그대로 전달하므로
     * 화면에서 보던 필터(검색어·기간)와 정확히 같은 모집단이 내려간다. 페이지 파라미터만
     * 전체 결과로 덮어써 페이지와 무관하게 조건 일치 전량을 내보낸다.
     *
     * <p>[인가 — H3] 기존 목록 API 와 동일한 ADMIN/SYSTEM 축이다. 이 경로는
     * {@code /api/v1/admin/**} secure-paths URL 게이트로도 덮이지만, 그 목록 한 줄이 빠지면
     * 함께 사라지는 단일 실패점이므로 {@code @AdminOrSystem} 을 메서드에 직접 붙인다
     * (헌법 제8조 이중 검증 — {@code WebLogApiController} 와 같은 패턴).
     *
     * <p>[헌법 제6조 3항 binary/stream 예외] 공통 래퍼 밖 반환은
     * ① {@code Content-Disposition: attachment} ② 명시적 {@code produces}
     * ③ {@code ResponseContractLinterTest} binary 허용 census 등재의 세 조건으로 허용된다.
     */
    @Operation(summary = "로그인 로그 전체 결과 xlsx export",
            description = "검색 조건(검색어·기간)은 목록 API 와 동일하게 바인딩하되 페이지 파라미터는 무시하고 "
                    + "조건 일치 전체 결과를 xlsx 로 스트리밍한다. 행 수가 " + MAX_EXPORT_ROWS
                    + " 을 초과하면 400 을 반환한다(조건을 좁혀 재시도).")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "xlsx 바이너리 스트림",
            content = @Content(mediaType = XLSX_MEDIA_TYPE,
                    schema = @Schema(type = "string", format = "binary")))
    @AdminOrSystem
    @GetMapping(value = "/export.xlsx", produces = XLSX_MEDIA_TYPE)
    public ResponseEntity<StreamingResponseBody> exportLoginLogs(
            @Valid @ModelAttribute BaseSearchDto searchDto) {

        int totalCount = loginLogManageService.selectLoginLogListTotCnt(searchDto);
        if (totalCount > MAX_EXPORT_ROWS) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "export 대상이 " + totalCount + "행으로 상한(" + MAX_EXPORT_ROWS
                            + "행)을 초과합니다. 검색 기간이나 조건을 좁혀 다시 시도하십시오.");
        }

        // 페이지 파라미터를 전체 결과로 덮어쓴다 — 화면 페이징 값이 무엇이든 export 는 전량이다.
        // (0건이어도 effectivePageUnit 이 기본값으로 대체하므로 안전하다.)
        searchDto.setPageIndex(1);
        searchDto.setPageUnit(Math.max(totalCount, 1));
        List<LoginLogDto> rows = loginLogManageService.selectLoginLogList(searchDto);

        // 조회는 요청 스레드(트랜잭션·보안 컨텍스트 유효 구간)에서 끝내고,
        // 스트리밍 램다는 이미 확보한 rows 의 직렬화만 담당한다.
        StreamingResponseBody body = out -> writeXlsx(out, rows);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"login-logs.xlsx\"")
                .contentType(MediaType.parseMediaType(XLSX_MEDIA_TYPE))
                .body(body);
    }

    @Operation(summary = "로그인 로그 상세 조회")
    @GetMapping("/{lgnSn}")
    public ResponseEntity<ApiResponse<LoginLogDto>> getLoginLog(
            @PathVariable("lgnSn") Long lgnSn) throws Exception {
        LoginLogDto result = loginLogManageService.selectLoginLogDetail(lgnSn);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /** 확보된 행을 SXSSF(스트리밍 워크북)로 직렬화한다. try-with-resources 가 임시 파일까지 정리한다. */
    private static void writeXlsx(OutputStream out, List<LoginLogDto> rows) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(SXSSF_ROW_WINDOW)) {
            Sheet sheet = workbook.createSheet("login-logs");
            String[] headers = {"로그인 일련번호", "접속 ID", "접속 IP", "접속방식", "오류발생여부", "오류코드", "생성일시"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }
            int rowIndex = 1;
            for (LoginLogDto dto : rows) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(dto.getLgnSn() != null ? String.valueOf(dto.getLgnSn()) : "");
                row.createCell(1).setCellValue(nullSafe(dto.getLoginId()));
                row.createCell(2).setCellValue(nullSafe(dto.getLoginIp()));
                row.createCell(3).setCellValue(nullSafe(dto.getLoginMthd()));
                row.createCell(4).setCellValue(nullSafe(dto.getErrOccrrAt()));
                row.createCell(5).setCellValue(nullSafe(dto.getErrorCode()));
                row.createCell(6).setCellValue(nullSafe(dto.getCreatDt()));
            }
            workbook.write(out);
        }
    }

    private static String nullSafe(String value) {
        return value != null ? value : "";
    }
}
