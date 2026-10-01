package nuri.api.controller.foundation.controller.system.log;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
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

/**
 * 민감 작업 감사 원장 열람 API(2026-10-01 결정 19).
 *
 * <p>조회만 노출한다 — 원장은 민감 작업마다 서버가 추가하고, 보존기간 정책이 지운다. 원장을 연 것도 민감 작업으로
 * 원장에 남는다(행위자 로그인 ID·접속 IP 를 담는다). 권한 {@code ADT_LOG_READ} 는 기본 그룹에 없다.
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
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                service.search(actorId, operation, fromDate, toDate, page, size))));
    }
}
