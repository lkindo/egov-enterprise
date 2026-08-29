package nuri.api.controller.foundation.controller.system.log;

import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.log.UserLogManageService;
import nuri.business.service.log.dto.UserLogDto;
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
 * 사용자 활동 로그 조회 API (Admin).
 *
 * <p>[D-1 이행] 관리 화면 {@code /admin/system/logs/user} 는 이미 존재했고
 * {@code systemLogAdminService.getUserLogs()} 를 호출하고 있었으나 대응 엔드포인트가 없었다.
 *
 * <p>이 로그는 <b>사용자 × 서비스 × 메서드 × 일자 단위 집계</b>이며 값의 본체는 행위 카운터
 * 6종(생성·수정·조회·삭제·출력·오류)이다. 개별 요청 추적이 아니므로 개인정보 로그
 * ({@code @AdminOnly})보다는 넓은 {@code @AdminOrSystem} 을 쓴다 — 웹·시스템·로그인 로그와 동일 등급이다.
 *
 * <p><b>조회만 노출한다.</b> 적재는 활동 집계 지점이, 삭제는 보존기간 정책과 회원 탈퇴 정리가
 * 담당한다. 감사 성격의 기록을 관리자가 임의로 수정·삭제할 수 있으면 증적 가치가 사라진다.
 */
@Slf4j
@Tag(name = "UserLog", description = "사용자 활동 로그 조회 API (Admin)")
@RestController("systemUserLogApiController")
@RequestMapping("/api/v1/admin/system/logs/user")
@RequiredArgsConstructor
public class UserLogApiController {

    private final UserLogManageService userLogManageService;

    @Operation(summary = "사용자 활동 로그 목록",
            description = "사용자명 부분일치 검색과 페이징을 지원한다. 검색 대상은 연관 사용자의 이름이다.")
    @AdminOrSystem
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<UserLogDto>>> getUserLogList(
            @Valid @ModelAttribute BaseSearchDto searchDto) {
        Page<UserLogDto> page = userLogManageService.selectUserLogList(searchDto);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    /**
     * 사용자 로그 전체 결과 xlsx export.
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
    @Operation(summary = "사용자 로그 전체 결과 xlsx export",
            description = "검색 조건(검색어·기간)은 목록 API 와 동일하게 바인딩하되 페이지 파라미터는 무시하고 "
                    + "조건 일치 전체 결과를 xlsx 로 스트리밍한다. 행 수가 상한을 초과하면 400 을 반환한다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "xlsx 바이너리 스트림",
            content = @Content(mediaType = LogExcelExport.XLSX_MEDIA_TYPE,
                    schema = @Schema(type = "string", format = "binary")))
    @AdminOrSystem
    @GetMapping(value = "/export.xlsx", produces = LogExcelExport.XLSX_MEDIA_TYPE)
    public ResponseEntity<StreamingResponseBody> exportUserLogs(
            @Valid @ModelAttribute BaseSearchDto searchDto) {

        searchDto.setPageIndex(1);
        searchDto.setPageUnit(1);
        int totalCount = (int) userLogManageService.selectUserLogList(searchDto).getTotalElements();
        LogExcelExport.assertWithinCap(totalCount);

        searchDto.setPageUnit(Math.max(totalCount, 1));
        List<UserLogDto> rows = userLogManageService.selectUserLogList(searchDto).getContent();

        return LogExcelExport.attachment("user-logs.xlsx", "user-logs",
                new String[]{"발생일자", "요청자 ID", "성명", "서비스명", "메서드명", "등록", "수정", "조회", "삭제", "출력", "오류"},
                rows,
                (row, dto) -> {
                    row.createCell(0).setCellValue(LogExcelExport.nullSafe(dto.ocrnYmd()));
                    row.createCell(1).setCellValue(LogExcelExport.nullSafe(dto.dmndUserId()));
                    row.createCell(2).setCellValue(LogExcelExport.nullSafe(dto.userNm()));
                    row.createCell(3).setCellValue(LogExcelExport.nullSafe(dto.srvcNm()));
                    row.createCell(4).setCellValue(LogExcelExport.nullSafe(dto.mthdNm()));
                    row.createCell(5).setCellValue(LogExcelExport.nullSafe(dto.crtCnt()));
                    row.createCell(6).setCellValue(LogExcelExport.nullSafe(dto.mdfcnCnt()));
                    row.createCell(7).setCellValue(LogExcelExport.nullSafe(dto.inqCnt()));
                    row.createCell(8).setCellValue(LogExcelExport.nullSafe(dto.delCnt()));
                    row.createCell(9).setCellValue(LogExcelExport.nullSafe(dto.otptCnt()));
                    row.createCell(10).setCellValue(LogExcelExport.nullSafe(dto.errCnt()));
                });
    }
}
