package com.company.project.api.controller.lsm;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.schedule.EgovLeaderScheduleService;
import com.company.project.service.schedule.dto.LeaderScheduleDto;
import com.company.project.service.schedule.dto.LeaderStatusDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "LeaderSchedule", description = "Leader Schedule Management APIs")

@RestController

@RequestMapping("/api/v1/leader-schedules")

@RequiredArgsConstructor

public class LeaderScheduleController {

    private final EgovLeaderScheduleService leaderScheduleService;

@Operation(summary = "         ???                   ?         ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<LeaderScheduleDto>>> getLeaderSchedules(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(leaderScheduleService.getLeaderScheduleList(keyword, pageable)));

    }

@Operation(summary = "         ???       ?                   ??")

    @GetMapping("/{scheduleId}")

    public ResponseEntity<ApiResponse<LeaderScheduleDto>> getLeaderSchedule(

            @Parameter(description = "??       ID") @PathVariable String scheduleId) {

        return ResponseEntity.ok(ApiResponse.success(leaderScheduleService.getLeaderSchedule(scheduleId)));

    }

@Operation(summary = "         ???       ?         ")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> insertLeaderSchedule(@RequestBody LeaderScheduleDto dto) {

        String id = leaderScheduleService.createLeaderSchedule("ADMIN", dto);

        return ResponseEntity.ok(ApiResponse.success(id));

    }

@Operation(summary = "         ???       ??      ")

    @PutMapping("/{scheduleId}")

    public ResponseEntity<ApiResponse<Void>> updateLeaderSchedule(

            @PathVariable String scheduleId,

            @RequestBody LeaderScheduleDto dto) {

        leaderScheduleService.updateLeaderSchedule(scheduleId, "ADMIN", dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ???       ????")

    @DeleteMapping("/{scheduleId}")

    public ResponseEntity<ApiResponse<Void>> deleteLeaderSchedule(

            @PathVariable String scheduleId) {

        leaderScheduleService.deleteLeaderSchedule(scheduleId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ??                      ?         ??")

    @GetMapping("/status")

    public ResponseEntity<ApiResponse<Page<LeaderStatusDto>>> getLeaderStatuses(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(leaderScheduleService.getLeaderStatusList(keyword, pageable)));

    }

}
