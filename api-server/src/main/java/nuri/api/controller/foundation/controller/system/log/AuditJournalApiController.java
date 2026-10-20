package nuri.api.controller.foundation.controller.system.log;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import nuri.api.support.XlsxExport;
import nuri.business.service.log.SensitiveAuditQueryService;
import nuri.business.service.log.dto.AuditJournalEntry;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.List;

/**
 * 민감 작업 감사 원장 열람 API(2026-10-01 결정 19).
 *
 * <p>조회·내보내기만 노출한다 — 원장은 민감 작업마다 서버가 추가하고, 보존기간 정책이 지운다. 원장을 연 것도 민감 작업으로
 * 원장에 남는다(행위자 로그인 ID·접속 IP 를 담는다). 권한 {@code ADT_LOG_READ} 는 기본 그룹에 없다. 내보내기·작업 종류도 같은
 * 권한이다 — 원장을 읽을 수 있는 사람이 같은 조건으로 파일을 받을 뿐이라 권한을 따로 두지 않는다(H3, 넓히지도 좁히지도 않는다).
 */
@Tag(name = "AuditJournal", description = "민감 작업 감사 원장 열람")
@RestController
@RequestMapping("/api/v1/admin/system/logs/audit")
@RequiredArgsConstructor
public class AuditJournalApiController {

    private final SensitiveAuditQueryService service;

    @Operation(operationId = "auditJournalList", summary = "민감 작업 감사 원장 목록",
            description = "최신순이다. 행위자 로그인 ID·작업 이름은 정확히 일치하는 값으로, 기간은 시작·종료를 함께 주어야 거른다.")
    @nuri.foundation.core.annotation.SensitiveOperation("민감 작업 감사 원장 조회")
    @GetMapping
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.log.AuditJournalApiController#getAuditJournal')")
    public ResponseEntity<ApiResponse<PageResponse<AuditJournalEntry>>> getAuditJournal(
            @RequestParam(required = false) String actorId,
            @RequestParam(required = false) String operation,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @org.springframework.data.web.PageableDefault(size = 20) @nuri.api.support.UnsortedPageable
            org.springframework.data.domain.Pageable page) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                service.search(actorId, operation, fromDate, toDate, page.getPageNumber(), page.getPageSize()))));
    }

    /** [2026-10-20] 조건 검색의 '작업 종류' 선택지 — 원장에 실제로 남은 작업 이름이다. 개인정보가 없어 원장에 남기지 않는다. */
    @Operation(operationId = "auditJournalOperations", summary = "민감 작업 감사 원장의 작업 종류",
            description = "원장에 남은 작업 이름을 중복 없이 이름 순으로 돌려준다. 목록·내보내기의 operation 조건에 그대로 쓴다.")
    @GetMapping("/operations")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.log.AuditJournalApiController#getAuditJournalOperations')")
    public ResponseEntity<ApiResponse<List<String>>> getAuditJournalOperations() {
        return ResponseEntity.ok(ApiResponse.success(service.operations()));
    }

    /**
     * [2026-10-20] 목록과 같은 조건의 전체 결과 xlsx 내보내기.
     *
     * <p>[감사] 다른 로그 내보내기와 같이 개인정보 접근({@code @PrivacyAccess})이다 — 원장 행에는 행위자 로그인 ID·접속 IP 가 있다.
     * 감사 경계({@code SensitiveAuditInterceptor})가 핸들러를 부르기 전에 사유를 검사하고 시도(사유 포함)를 원장에 남기며, 파일
     * 바이트를 쓰기 전에 응답 준비 단계와 개인정보 접근 기록을 남긴다 — 어느 기록이 실패해도 파일은 없다. 응답 상태는 완료 단계로 남는다.
     * [상한] 로그 내보내기와 같은 {@link XlsxExport#MAX_EXPORT_ROWS} 행 상한이다. 행 수를 먼저 세고 넘으면 파일을 만들기 전에 400 이다.
     * [헌법 제6조 3항] binary/stream 예외의 세 조건(attachment · 명시 produces · 허용 census)을 따른다.
     */
    @Operation(operationId = "exportAuditJournal", summary = "민감 작업 감사 원장 전체 결과 xlsx 내보내기",
            description = "조건(행위자 로그인 ID·작업 이름·기간)은 목록과 같다. 사유(reason, 2~200자)가 필수이고 내보내기 시도와 사유가 "
                    + "원장에 남는다. 조건 일치 전체 결과를 xlsx 로 스트리밍하며 행 수가 상한을 넘으면 400 이다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "xlsx 바이너리 스트림",
            content = @Content(mediaType = XlsxExport.XLSX_MEDIA_TYPE,
                    schema = @Schema(type = "string", format = "binary")))
    @nuri.foundation.core.annotation.PrivacyAccess(value = "민감 작업 감사 원장 내보내기(행위자 로그인 ID·접속 IP)", reasonParameter = "reason")
    @GetMapping(value = "/export.xlsx", produces = XlsxExport.XLSX_MEDIA_TYPE)
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.log.AuditJournalApiController#exportAuditJournal')")
    public ResponseEntity<StreamingResponseBody> exportAuditJournal(
            @RequestParam(required = false) String actorId,
            @RequestParam(required = false) String operation,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @Parameter(description = "내보내기 사유(2~200자). 원장의 내보내기 기록에 함께 남는다.")
            @RequestParam String reason) {
        List<AuditJournalEntry> rows = service.exportEntries(actorId, operation, fromDate, toDate, XlsxExport::assertWithinCap);
        return XlsxExport.attachment("audit-journal.xlsx", "audit-journal",
                new String[]{"일련번호", "일시", "작업", "설명", "단계", "행위자 로그인 ID", "대상", "접속 IP", "응답 상태", "요청 ID"},
                rows,
                (row, entry) -> {
                    row.createCell(0).setCellValue(XlsxExport.nullSafe(entry.id()));
                    row.createCell(1).setCellValue(entry.occurredAt() != null ? entry.occurredAt().toString() : "");
                    row.createCell(2).setCellValue(XlsxExport.nullSafe(entry.operation()));
                    row.createCell(3).setCellValue(XlsxExport.nullSafe(entry.description()));
                    row.createCell(4).setCellValue(XlsxExport.nullSafe(entry.stage()));
                    row.createCell(5).setCellValue(XlsxExport.nullSafe(entry.actorId()));
                    row.createCell(6).setCellValue(XlsxExport.nullSafe(entry.targetId()));
                    row.createCell(7).setCellValue(XlsxExport.nullSafe(entry.clientIp()));
                    row.createCell(8).setCellValue(XlsxExport.nullSafe(entry.httpStatus()));
                    row.createCell(9).setCellValue(XlsxExport.nullSafe(entry.requestId()));
                });
    }
}
