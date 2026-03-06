package com.company.project.api.controller.stats;

import com.company.project.service.stats.StatsService;
import com.company.project.service.stats.dto.StatsDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Tag(name = "Stats", description = "?계 관?API")
@RestController
@RequestMapping("/api/v1/admin/stats")
@RequiredArgsConstructor
public class StatisticsApiController {

    private final StatsService statsService;

    @Operation(summary = "?속 ?계 조회")
    @GetMapping("/connect")
    public ResponseEntity<List<StatsDto>> getConnectStats(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "SERVICE") String statsKind) throws Exception {

        String[] dates = setDefaultDates(fromDate, toDate);
        return ResponseEntity.ok(statsService.getConnectionStats(dates[0], dates[1], statsKind));
    }

    @Operation(summary = "게시??계 조회")
    @GetMapping("/bbs")
    public ResponseEntity<List<StatsDto>> getBbsStats(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "COM101") String statsKind) throws Exception {

        String[] dates = setDefaultDates(fromDate, toDate);
        return ResponseEntity.ok(statsService.getBoardStats(dates[0], dates[1], statsKind));
    }

    @Operation(summary = "?용???계 조회")
    @GetMapping("/user")
    public ResponseEntity<List<StatsDto>> getUserStats(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String statsKind) throws Exception {

        String[] dates = setDefaultDates(fromDate, toDate);
        return ResponseEntity.ok(statsService.getUserStats(dates[0], dates[1], statsKind));
    }

    @Operation(summary = "?면(?청) ?계 조회")
    @GetMapping("/screen")
    public ResponseEntity<List<StatsDto>> getScreenStats(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String statsKind) throws Exception {

        String[] dates = setDefaultDates(fromDate, toDate);
        return ResponseEntity.ok(statsService.getRequestStats(dates[0], dates[1], statsKind));
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
