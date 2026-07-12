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
 * 통계 관리를 위한 관리자용 컨트롤러
 */
@Tag(name = "Statistics", description = "통계 관리 API (Admin)")
@RestController("systemStatisticsApiController")
@RequestMapping("/api/v1/admin/system/statistics")
@RequiredArgsConstructor
public class StatisticsApiController {

    private final ReportStatsService reportStatsService;

    @Operation(summary = "보고서 통계 조회")
    @GetMapping("/report")
    public ResponseEntity<ApiResponse<List<StatsDto>>> getReportStats(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) throws Exception {

        String[] dates = setDefaultDates(fromDate, toDate);
        List<Object[]> stats = reportStatsService.getReprtStatsByDate(dates[0], dates[1]);
        return ResponseEntity.ok(ApiResponse.success(convertToStatsDto(stats)));
    }

    @Operation(summary = "자료이용현황 통계 조회")
    @GetMapping("/data-usage")
    public ResponseEntity<ApiResponse<List<StatsDto>>> getDataUsageStats(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) throws Exception {

        String[] dates = setDefaultDates(fromDate, toDate);
        List<Object[]> stats = reportStatsService.getDtaUseStatsByDate(dates[0], dates[1]);
        return ResponseEntity.ok(ApiResponse.success(convertToStatsDto(stats)));
    }

    @Operation(summary = "게시물 통계 조회")
    @GetMapping("/bbs")
    public ResponseEntity<ApiResponse<List<StatsDto>>> getBbsStats(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) throws Exception {

        String[] dates = setDefaultDates(fromDate, toDate);
        List<Object[]> stats = reportStatsService.getBbsStatsByDate(dates[0], dates[1]);
        return ResponseEntity.ok(ApiResponse.success(convertToStatsDto(stats)));
    }

    @Operation(summary = "사용자 통계 조회")
    @GetMapping("/user")
    public ResponseEntity<ApiResponse<List<StatsDto>>> getUserStats(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) throws Exception {

        String[] dates = setDefaultDates(fromDate, toDate);
        List<Object[]> stats = reportStatsService.getUserStatsByDate(dates[0], dates[1]);
        return ResponseEntity.ok(ApiResponse.success(convertToStatsDto(stats)));
    }

    @Operation(summary = "접속 통계 조회")
    @GetMapping("/connect")
    public ResponseEntity<ApiResponse<List<StatsDto>>> getConnectStats(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String statsKind) throws Exception {

        String[] dates = setDefaultDates(fromDate, toDate);
        List<Object[]> stats = reportStatsService.getConnectStatsByDate(dates[0], dates[1]);
        return ResponseEntity.ok(ApiResponse.success(convertToStatsDto(stats)));
    }

    @Operation(summary = "요약 통계 조회")
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<nuri.business.service.stats.dto.SummaryStatsDto>> getSummary() {
        return ResponseEntity.ok(ApiResponse.success(reportStatsService.getSummary()));
    }


    private List<StatsDto> convertToStatsDto(List<Object[]> stats) {
        return stats.stream()
                .map(row -> StatsDto.builder()
                        .statsDate((String) row[0])
                        .statsCo(((Number) row[1]).intValue())
                        .build())
                .toList();
    }

    private String[] setDefaultDates(String fromDate, String toDate) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");
        if (toDate == null || toDate.isEmpty()) {
            toDate = LocalDate.now().format(formatter);
        }
        if (fromDate == null || fromDate.isEmpty()) {
            fromDate = LocalDate.now().minusMonths(1).format(formatter);
        }
        return new String[]{fromDate, toDate};
    }
}
