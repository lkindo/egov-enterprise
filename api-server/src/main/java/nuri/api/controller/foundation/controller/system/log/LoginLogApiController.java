package nuri.api.controller.foundation.controller.system.log;

import jakarta.validation.Valid;
import nuri.api.support.XlsxExport;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.log.LoginLogManageService;
import nuri.business.service.log.dto.LoginLogDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

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
    static final String XLSX_MEDIA_TYPE = XlsxExport.XLSX_MEDIA_TYPE;

    /** 서버측 전체 결과 export 의 행 상한. */
    static final int MAX_EXPORT_ROWS = XlsxExport.MAX_EXPORT_ROWS;

    private final LoginLogManageService loginLogManageService;

    /**
     * [Wave 4 GAP-UI-001] 로그인 로그 정렬 허용 목록 — 접속일시(ix_tb_login_log_crt_dt) 하나다. 비우면 최신순이고, 같은 시각은 로그인
     * 일련번호로 끊는다. 그 밖의 열(로그인 ID·접속 방식)은 인덱스가 없어 받지 않는다(400).
     */
    private static final nuri.business.domain.common.ServerSortWhitelist LOGIN_LOG_SORT =
            nuri.business.domain.common.ServerSortWhitelist.of(java.util.Map.of("crtDt", "crtDt"));

    @Operation(summary = "로그인 로그 목록 조회",
            description = "정렬은 sortBy=crtDt(접속일시)와 sortDir(asc·desc)로 목록 전체에 걸린다. 비우면 접속일시 최신순이고 그 밖의 값은 400 입니다.")
    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.log.LoginLogApiController#getLoginLogList')")
    public ResponseEntity<ApiResponse<PageResponse<LoginLogDto>>> getLoginLogList(
            @Valid @ModelAttribute BaseSearchDto searchDto,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String sortBy,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String sortDir) throws Exception {

        org.springframework.data.domain.Page<LoginLogDto> page =
                loginLogManageService.selectLoginLogPage(searchDto, LOGIN_LOG_SORT.resolve(sortBy, sortDir));

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    /**
     * 로그인 로그 전체 결과 xlsx export.
     *
     * <p>[검색 조건 동일 바인딩] 목록 API 와 같은 {@link BaseSearchDto} 를 같은 서비스 메서드
     * ({@code selectLoginLogList}/{@code selectLoginLogListTotCnt})에 그대로 전달하므로
     * 화면에서 보던 필터(검색어·기간)와 정확히 같은 모집단이 내려간다. 페이지 파라미터만
     * 전체 결과로 덮어써 페이지와 무관하게 조건 일치 전량을 내보낸다.
     *
     * <p>[인가 — H3] 반출 전용 권한 {@code LOGIN_LOG_EXPORT} 다(목록은 {@code LOGIN_LOG_READ}, 기본 그룹은 둘 다
     * ROLE_ADMIN·ROLE_SYSTEM). HTTP·메서드 계층이 같은 operation binding 을 이중 집행한다
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
    @nuri.foundation.core.annotation.PrivacyAccess(value = "운영 로그 내보내기(사용자 식별자·접속 정보)", reasonParameter = "reason")
    @GetMapping(value = "/export.xlsx", produces = XLSX_MEDIA_TYPE)
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.log.LoginLogApiController#exportLoginLogs')")
    public ResponseEntity<StreamingResponseBody> exportLoginLogs(
            @Valid @ModelAttribute BaseSearchDto searchDto,
            @Parameter(description = "내보내기 사유(2~200자). 감사 원장의 내보내기 기록에 함께 남는다.")
            @RequestParam String reason) {

        int totalCount = loginLogManageService.selectLoginLogListTotCnt(searchDto);
        XlsxExport.assertWithinCap(totalCount);

        // 페이지 파라미터를 전체 결과로 덮어쓴다 — 화면 페이징 값이 무엇이든 export 는 전량이다.
        // (0건이어도 effectivePageUnit 이 기본값으로 대체하므로 안전하다.)
        searchDto.setPageIndex(1);
        searchDto.setPageUnit(Math.max(totalCount, 1));
        List<LoginLogDto> rows = loginLogManageService.selectLoginLogList(searchDto);

        return XlsxExport.attachment("login-logs.xlsx", "login-logs",
                new String[]{"로그인 일련번호", "접속 ID", "접속 IP", "접속방식", "오류발생여부", "오류코드", "생성일시"},
                rows,
                (row, dto) -> {
                    row.createCell(0).setCellValue(XlsxExport.nullSafe(dto.getLgnSn()));
                    row.createCell(1).setCellValue(XlsxExport.nullSafe(dto.getLoginId()));
                    row.createCell(2).setCellValue(XlsxExport.nullSafe(dto.getLoginIp()));
                    row.createCell(3).setCellValue(XlsxExport.nullSafe(dto.getLoginMthd()));
                    row.createCell(4).setCellValue(XlsxExport.nullSafe(dto.getErrOccrrAt()));
                    row.createCell(5).setCellValue(XlsxExport.nullSafe(dto.getErrorCode()));
                    row.createCell(6).setCellValue(XlsxExport.nullSafe(dto.getCreatDt()));
                });
    }

    @Operation(summary = "로그인 로그 상세 조회")
    @GetMapping("/{lgnSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.log.LoginLogApiController#getLoginLog')")
    public ResponseEntity<ApiResponse<LoginLogDto>> getLoginLog(
            @PathVariable("lgnSn") Long lgnSn) throws Exception {
        LoginLogDto result = loginLogManageService.selectLoginLogDetail(lgnSn);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
