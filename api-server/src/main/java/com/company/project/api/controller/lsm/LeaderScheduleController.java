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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "LeaderSchedule", description = "Leader Schedule and Status Management APIs")
@RestController
@RequestMapping("/api/v1/leader-schedules")
@RequiredArgsConstructor
public class LeaderScheduleController {

    private final EgovLeaderScheduleService leaderScheduleService;

    @Operation(summary = "간부 일정 목록 조회", description = "간부 일정 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<LeaderScheduleDto>>> getLeaderSchedules(
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(leaderScheduleService.getLeaderScheduleList(searchKeyword, pageable)));
    }

    @Operation(summary = "간부 일정 상세 조회", description = "특정 간부 일정의 상세 정보를 조회합니다.")
    @GetMapping("/{scheduleId}")
    public ResponseEntity<ApiResponse<LeaderScheduleDto>> getLeaderSchedule(
            @Parameter(description = "일정 ID") @PathVariable String scheduleId) {
        return ResponseEntity.ok(ApiResponse.success(leaderScheduleService.getLeaderSchedule(scheduleId)));
    }

    @Operation(summary = "간부 일정 등록", description = "새로운 간부 일정을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> registerLeaderSchedule(
            @RequestBody LeaderScheduleDto dto) {
        leaderScheduleService.registerLeaderSchedule(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "간부 일정 수정", description = "기존 간부 일정 정보를 수정합니다.")
    @PutMapping("/{scheduleId}")
    public ResponseEntity<ApiResponse<Void>> updateLeaderSchedule(
            @PathVariable String scheduleId,
            @RequestBody LeaderScheduleDto dto) {
        dto.setScheduleId(scheduleId);
        leaderScheduleService.updateLeaderSchedule(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "간부 일정 삭제", description = "특정 간부 일정을 삭제합니다.")
    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<ApiResponse<Void>> deleteLeaderSchedule(
            @PathVariable String scheduleId) {
        leaderScheduleService.deleteLeaderSchedule(scheduleId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "간부 상태 목록 조회", description = "간부들의 현재 상태 목록을 조회합니다.")
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Page<LeaderStatusDto>>> getLeaderStatusList(
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(leaderScheduleService.getLeaderStatusList(searchKeyword, pageable)));
    }

    @Operation(summary = "간부 상태 수정/등록", description = "간부의 현재 상태를 업데이트합니다.")
    @PutMapping("/status/{leaderId}")
    public ResponseEntity<ApiResponse<Void>> updateLeaderStatus(
            @PathVariable String leaderId,
            @RequestBody LeaderStatusDto dto) {
        dto.setLeaderId(leaderId);
        leaderScheduleService.updateLeaderStatus(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
