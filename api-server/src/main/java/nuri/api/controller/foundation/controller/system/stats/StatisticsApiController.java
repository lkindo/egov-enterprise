package nuri.api.controller.foundation.controller.system.stats;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.service.stats.ReportStatsService;
import nuri.business.service.stats.dto.StatsPoint;
import nuri.business.service.stats.dto.UserActivityStats;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 통계 관리를 위한 관리자용 컨트롤러
 *
 * <p>[2026-10-19] 보고서 통계 조회(GET /report)를 걷었다. 그 원장(tb_rptp_stats)에 쓰는 제품 경로가 없어 어떤 기간에도
 * 값이 없었다. 화면 탭·라우트와 메뉴(V2_134)도 함께 걷었고 물리 테이블은 남긴다.
 *
 * <p>[2026-10-20] 시계열 네 개가 {@link StatsPoint}({@code date}·{@code value}) 한 모양을 날짜 오름차순으로 낸다. 기간의 기본값·
 * 형식·상한(366일)·빈 날 채우기는 서비스({@link ReportStatsService}) 한 곳이 정하고 컨트롤러는 받은 값을 그대로 넘긴다.
 * 받고 버리던 접속 통계의 {@code statsKind} 를 걷었고, 응답에서 늘 0 이던 필드 20여 개({@code StatsDto})도 걷었다.
 */
@Tag(name = "Statistics", description = "통계 관리 API (Admin)")
@RestController("systemStatisticsApiController")
@RequestMapping("/api/v1/admin/system/statistics")
@RequiredArgsConstructor
public class StatisticsApiController {

    /** 네 시계열이 함께 따르는 기간 규칙. 서비스 {@code ReportStatsService#range} 가 집행한다. */
    static final String PERIOD_RULE = "기간(fromDate·toDate, yyyy-MM-dd 또는 yyyyMMdd)을 비우면 오늘(Asia/Seoul)까지 최근 1개월이다."
            + " 시작·종료일을 포함해 366일까지 묻고, 넘거나 시작일이 종료일보다 늦거나 형식이 틀리면 400 이다. 응답은 날짜 오름차순이다.";

    private final ReportStatsService reportStatsService;

    @Operation(summary = "자료이용현황 통계 조회",
            description = "기록이 있는 날만 싣는다 — 자료 이용 기록에는 쓰는 경로가 없어 빈 날을 0 으로 채우지 않는다. " + PERIOD_RULE)
    @GetMapping("/data-usage")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.stats.StatisticsApiController#getDataUsageStats')")
    public ResponseEntity<ApiResponse<List<StatsPoint>>> getDataUsageStats(
            @Parameter(description = "조회 시작일(yyyy-MM-dd 또는 yyyyMMdd)") @RequestParam(required = false) String fromDate,
            @Parameter(description = "조회 종료일(yyyy-MM-dd 또는 yyyyMMdd). 그날을 포함한다") @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(ApiResponse.success(reportStatsService.getDtaUseStatsByDate(fromDate, toDate)));
    }

    @Operation(summary = "게시물 통계 조회",
            description = "일자별 등록 게시글 수(삭제한 글 제외). 기간 안의 날마다 한 칸이고 기록이 없는 날은 0 이다. " + PERIOD_RULE)
    @GetMapping("/bbs")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.stats.StatisticsApiController#getBbsStats')")
    public ResponseEntity<ApiResponse<List<StatsPoint>>> getBbsStats(
            @Parameter(description = "조회 시작일(yyyy-MM-dd 또는 yyyyMMdd)") @RequestParam(required = false) String fromDate,
            @Parameter(description = "조회 종료일(yyyy-MM-dd 또는 yyyyMMdd). 그날을 포함한다") @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(ApiResponse.success(reportStatsService.getBbsStatsByDate(fromDate, toDate)));
    }

    @Operation(summary = "사용자 통계 조회",
            description = "인증 사용자의 일자별 API 요청 수를 요청 구분(조회·등록·수정·삭제)마다 한 계열로 낸다. 네 계열은 같은 날짜 축이고"
                    + " 기록이 없는 날은 0 이다. " + PERIOD_RULE)
    @GetMapping("/user")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.stats.StatisticsApiController#getUserStats')")
    public ResponseEntity<ApiResponse<UserActivityStats>> getUserStats(
            @Parameter(description = "조회 시작일(yyyy-MM-dd 또는 yyyyMMdd)") @RequestParam(required = false) String fromDate,
            @Parameter(description = "조회 종료일(yyyy-MM-dd 또는 yyyyMMdd). 그날을 포함한다") @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(ApiResponse.success(reportStatsService.getUserStatsByDate(fromDate, toDate)));
    }

    @Operation(summary = "접속 통계 조회",
            description = "일자별 성공 로그인 수(실패·결과 미상 시도 제외). 기간 안의 날마다 한 칸이고 기록이 없는 날은 0 이다. " + PERIOD_RULE)
    @GetMapping("/connect")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.stats.StatisticsApiController#getConnectStats')")
    public ResponseEntity<ApiResponse<List<StatsPoint>>> getConnectStats(
            @Parameter(description = "조회 시작일(yyyy-MM-dd 또는 yyyyMMdd)") @RequestParam(required = false) String fromDate,
            @Parameter(description = "조회 종료일(yyyy-MM-dd 또는 yyyyMMdd). 그날을 포함한다") @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(ApiResponse.success(reportStatsService.getConnectStatsByDate(fromDate, toDate)));
    }

    @Operation(summary = "요약 통계 조회")
    @GetMapping("/summary")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.stats.StatisticsApiController#getSummary')")
    public ResponseEntity<ApiResponse<nuri.business.service.stats.dto.SummaryStatsDto>> getSummary() {
        return ResponseEntity.ok(ApiResponse.success(reportStatsService.getSummary()));
    }
}
