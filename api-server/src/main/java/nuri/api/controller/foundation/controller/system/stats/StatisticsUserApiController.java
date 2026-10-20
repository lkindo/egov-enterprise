package nuri.api.controller.foundation.controller.system.stats;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.service.stats.ReportStatsService;
import nuri.business.service.stats.dto.StatsPoint;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 통계 사용자용 API 컨트롤러.
 * 사용자 홈 대시보드(UnifiedDashboardClient)의 접속 추이 차트가 관리자 전용
 * (/api/v1/admin/system/statistics/*, ROLE_ADMIN)을 호출해 403이 나던 것을 분리한다.
 * 집계 접속 통계는 비민감 데이터라 인증 사용자에게 노출한다(배너/팝업 사용자 API와 동일 패턴).
 *
 * <p>[2026-10-20] 관리자 접속 통계와 같은 서비스 경로라 같은 모양({@link StatsPoint} 날짜 오름차순, 빈 날 0, 366일 상한)을 낸다.
 * 기간 기본값은 서비스가 정한다. 이 API 는 지금 소비자가 없다(operation-consumer-census 의 superseded-surface) — 퇴역은 별도
 * 결정이다(GAP-WIRING-001).
 */
@Tag(name = "Statistics User", description = "통계 사용자 API")
@RestController("systemStatisticsUserApiController")
@RequestMapping("/api/v1/statistics")
@RequiredArgsConstructor
public class StatisticsUserApiController {

    private final ReportStatsService reportStatsService;

    @Operation(summary = "접속 통계 조회(사용자)",
            description = "사용자 홈 대시보드용 접속(로그인) 추이 통계. 기간 안의 날마다 한 칸이고 기록이 없는 날은 0 이다. "
                    + StatisticsApiController.PERIOD_RULE)
    @GetMapping("/connect")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.stats.StatisticsUserApiController#getConnectStats')")
    public ResponseEntity<ApiResponse<List<StatsPoint>>> getConnectStats(
            @Parameter(description = "조회 시작일(yyyy-MM-dd 또는 yyyyMMdd)") @RequestParam(required = false) String fromDate,
            @Parameter(description = "조회 종료일(yyyy-MM-dd 또는 yyyyMMdd). 그날을 포함한다") @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(ApiResponse.success(reportStatsService.getConnectStatsByDate(fromDate, toDate)));
    }
}
