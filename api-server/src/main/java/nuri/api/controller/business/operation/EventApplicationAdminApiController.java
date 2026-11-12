package nuri.api.controller.business.operation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nuri.business.domain.event.EventApplicationStatus;
import nuri.business.service.event.EventApplicationService;
import nuri.business.service.event.dto.EventApplicationDecisionRequest;
import nuri.business.service.event.dto.EventApplicationDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * [V2_152] 행사 신청자 관리(관리자). 서비스가 행사 등록자(로그인 ID 축)이거나 행사 수정 대행 권한 보유자인지 다시 본다 — 행사 수정과
 * 같은 판정이다. 경로 변수에 제약 어노테이션을 달지 않는다(본문 필드 오류가 메서드 검증으로 옮겨 사라지지 않게, 결재 컨트롤러 선례).
 */
@Tag(name = "Event Applications", description = "행사 참가 신청자 관리 API(관리자)")
@RestController
@RequestMapping("/api/v1/admin/operation/events/{evntSn}/applications")
@RequiredArgsConstructor
public class EventApplicationAdminApiController {

    private final EventApplicationService applicationService;

    @Operation(summary = "행사 신청자 목록",
            description = "신청 시각 순입니다. status(APPLIED·APPROVED·REJECTED·CANCELLED)로 좁힐 수 있습니다. 행사 등록자가 아니고 수정 대행 권한도 "
                    + "없으면 403 입니다.")
    @GetMapping
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.operation.EventApplicationAdminApiController#getEventApplications')")
    public ResponseEntity<ApiResponse<PageResponse<EventApplicationDto>>> getEventApplications(
            @PathVariable Long evntSn,
            @RequestParam(required = false) EventApplicationStatus status,
            @org.springframework.data.web.PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                applicationService.getApplications(evntSn, status, pageable))));
    }

    @Operation(summary = "행사 참가 신청 승인", description = "신청 상태인 신청만 승인합니다. 이미 처리됐거나 버전이 다르면 409 입니다. 신청자에게 알림이 갑니다.")
    @PutMapping("/{evntAplySn}/approval")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.operation.EventApplicationAdminApiController#approveEventApplication')")
    public ResponseEntity<ApiResponse<Void>> approveEventApplication(@PathVariable Long evntSn, @PathVariable Long evntAplySn,
            @Valid @RequestBody EventApplicationDecisionRequest request) {
        applicationService.approve(evntSn, evntAplySn, request.version());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "행사 참가 신청 반려",
            description = "신청·승인된 신청을 반려합니다(자리를 돌려줍니다). 반려된 신청은 다시 신청할 수 없습니다. 버전이 다르면 409 입니다.")
    @PutMapping("/{evntAplySn}/rejection")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.operation.EventApplicationAdminApiController#rejectEventApplication')")
    public ResponseEntity<ApiResponse<Void>> rejectEventApplication(@PathVariable Long evntSn, @PathVariable Long evntAplySn,
            @Valid @RequestBody EventApplicationDecisionRequest request) {
        applicationService.reject(evntSn, evntAplySn, request.version());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
