package nuri.business.api.controller.smarttoolkit;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.schedule.EgovScheduleService;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.foundation.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Tag(name = "Schedule", description = "일정 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
public class ScheduleApiController {

    private final EgovScheduleService egovScheduleService;

    @Operation(summary = "일정 목록 조회", description = "사용자의 일정 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ScheduleDto>>> getScheduleList(
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {
        String userId = getCurrentUserId();
        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<ScheduleDto> pageResult = egovScheduleService.getScheduleList(userId, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "월별 일정 조회", description = "사용자의 월별 일정 목록을 조회합니다.")
    @GetMapping("/monthly")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> getMonthlySchedule(
            @RequestParam String yearMonth) {
        String userId = getCurrentUserId();
        List<ScheduleDto> schedules = egovScheduleService.getMonthlySchedule(userId, yearMonth);
        return ResponseEntity.ok(ApiResponse.success(schedules));
    }

    @Operation(summary = "기간별 일정 조회", description = "사용자의 특정 기간 내 일정 목록을 조회합니다.")
    @GetMapping("/range")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> getScheduleByDateRange(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        String userId = getCurrentUserId();
        List<ScheduleDto> schedules = egovScheduleService.getScheduleListByDateRange(userId, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(schedules));
    }

    @Operation(summary = "일정 상세 조회", description = "특정 일정의 상세 정보를 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ScheduleDto>> getSchedule(@PathVariable String id) {
        ScheduleDto dto = egovScheduleService.getSchedule(id);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @Operation(summary = "일정 등록", description = "새로운 일정을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createSchedule(@RequestBody ScheduleDto dto) {
        String userId = getCurrentUserId();
        if ("anonymous".equals(userId)) {
            return ResponseEntity.status(401).build();
        }
        String newId = egovScheduleService.createSchedule(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(newId));
    }

    @Operation(summary = "일정 수정", description = "기존 일정을 수정합니다.")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateSchedule(@PathVariable String id, @RequestBody ScheduleDto dto) {
        String userId = getCurrentUserId();
        egovScheduleService.updateSchedule(id, userId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "일정 삭제", description = "일정을 삭제합니다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSchedule(@PathVariable String id) {
        String userId = getCurrentUserId();
        egovScheduleService.deleteSchedule(id, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getEsntlId();
        }
        return "anonymous";
    }
}
