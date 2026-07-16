package nuri.api.controller.foundation.controller.system.stats;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.service.stats.ReportStatsService;
import nuri.business.service.stats.dto.StatsDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 통계 사용자용 API 컨트롤러.
 * 사용자 홈 대시보드(UnifiedDashboardClient)의 접속 추이 차트가 관리자 전용
 * (/api/v1/admin/system/statistics/*, ROLE_ADMIN)을 호출해 403이 나던 것을 분리한다.
 * 집계 접속 통계는 비민감 데이터라 인증 사용자에게 노출한다(배너/팝업 사용자 API와 동일 패턴).
 */
@Tag(name = "Statistics User", description = "통계 사용자 API")
@RestController("systemStatisticsUserApiController")
@RequestMapping("/api/v1/statistics")
@RequiredArgsConstructor
public class StatisticsUserApiController {

    private final ReportStatsService reportStatsService;

    @Operation(summary = "접속 통계 조회(사용자)", description = "사용자 홈 대시보드용 접속(로그인) 추이 통계.")
    @GetMapping("/connect")
    public ResponseEntity<ApiResponse<List<StatsDto>>> getConnectStats(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) throws Exception {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMdd");
        if (toDate == null || toDate.isEmpty()) {
            toDate = LocalDate.now().format(fmt);
        }
        if (fromDate == null || fromDate.isEmpty()) {
            fromDate = LocalDate.now().minusMonths(1).format(fmt);
        }
        List<Object[]> stats = reportStatsService.getConnectStatsByDate(fromDate, toDate);
        List<StatsDto> result = stats.stream()
                .map(row -> StatsDto.builder()
                        .statsDate((String) row[0])
                        .statsCo(((Number) row[1]).intValue())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
