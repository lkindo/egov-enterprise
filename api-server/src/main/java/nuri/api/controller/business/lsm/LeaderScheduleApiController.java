package nuri.api.controller.business.lsm;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.schedule.EgovLeaderScheduleService;
import nuri.business.service.schedule.dto.LeaderScheduleDto;
import nuri.business.service.schedule.dto.LeaderStatusDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "LeaderSchedule", description = "간부 일정 관리 API")
@RestController
@RequestMapping("/api/v1/leader-schedules")
@RequiredArgsConstructor
public class LeaderScheduleApiController {

    private final EgovLeaderScheduleService leaderScheduleService;

    @Operation(summary = "간부 일정 목록 조회", description = "간부 일정 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LeaderScheduleDto>>> getLeaderSchedules(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<LeaderScheduleDto> result = leaderScheduleService.getLeaderScheduleList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "간부 일정 상세 조회", description = "특정 간부 일정의 상세 정보를 조회합니다.")
    @GetMapping("/{schdlId}")
    public ResponseEntity<ApiResponse<LeaderScheduleDto>> getLeaderSchedule(
            @Parameter(description = "일정 ID") @PathVariable String schdlId) {
        return ResponseEntity.ok(ApiResponse.success(leaderScheduleService.getLeaderSchedule(schdlId)));
    }

    @Operation(summary = "간부 일정 등록", description = "새로운 간부 일정을 등록합니다.")
    @PreAuthorize("hasAnyRole('ADMIN','SYSTEM')")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> insertLeaderSchedule(@Valid @RequestBody LeaderScheduleDto dto) {
        String id = leaderScheduleService.createLeaderSchedule("ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "간부 일정 수정", description = "간부 일정 정보를 수정합니다.")
    @PreAuthorize("hasAnyRole('ADMIN','SYSTEM')")
    @PutMapping("/{schdlId}")
    public ResponseEntity<ApiResponse<Void>> updateLeaderSchedule(
            @PathVariable String schdlId,
            @Valid @RequestBody LeaderScheduleDto dto) {
        leaderScheduleService.updateLeaderSchedule(schdlId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "간부 일정 삭제", description = "간부 일정 정보를 삭제합니다.")
    @PreAuthorize("hasAnyRole('ADMIN','SYSTEM')")
    @DeleteMapping("/{schdlId}")
    public ResponseEntity<ApiResponse<Void>> deleteLeaderSchedule(@PathVariable String schdlId) {
        leaderScheduleService.deleteLeaderSchedule(schdlId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "간부 상태 목록 조회", description = "간부 상태 목록을 페이징하여 조회합니다.")
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<PageResponse<LeaderStatusDto>>> getLeaderStatuses(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<LeaderStatusDto> result = leaderScheduleService.getLeaderStatusList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }
}
