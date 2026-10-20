package nuri.api.controller.foundation.controller.system.dashboard;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import nuri.business.service.system.signal.OperationalSignalService;
import nuri.foundation.core.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자 홈(/admin)의 서버 집계(2026-10-20). 진입은 관리자 홈 권한(DASHBOARD_ADMIN_READ)이고, 응답의 신호는 보는 사람이 그 원천을
 * 조회할 수 있는 것만 싣는다 — 판정은 {@link OperationalSignalService} 가 한다(H3).
 */
@Tag(name = "Admin Dashboard", description = "관리자 홈의 운영 신호 요약")
@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardApiController {
    private final OperationalSignalService operationalSignalService;

    @Operation(operationId = "adminOperationalSignals", summary = "운영 신호 요약 조회",
            description = "실패한 후속 작업 수·잠긴 계정 수·오늘 실패 요청 수를 DB 에서 세어 관측 시각과 함께 돌려준다. "
                    + "원천을 조회할 권한(DWORK_READ·USER_READ·SYS_LOG_READ)이 없는 신호는 싣지 않는다.")
    @GetMapping("/operational-signals")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.dashboard.AdminDashboardApiController#getOperationalSignals')")
    public ResponseEntity<ApiResponse<OperationalSignalService.OperationalSignals>> getOperationalSignals() {
        return ResponseEntity.ok(ApiResponse.success(operationalSignalService.currentSignals()));
    }
}
