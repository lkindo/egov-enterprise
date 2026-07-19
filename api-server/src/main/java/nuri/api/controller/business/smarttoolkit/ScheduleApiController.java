package nuri.api.controller.business.smarttoolkit;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.schedule.ScheduleService;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.business.security.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
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

    private final ScheduleService egovScheduleService;

    @Operation(summary = "일정 목록 조회", description = "사용자가 담당자인 일정 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ScheduleDto>>> getScheduleList(
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit,
            @RequestParam(required = false) String schdlNm) {
        String userId = currentLoginId();
        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<ScheduleDto> pageResult = egovScheduleService.getScheduleList(userId, schdlNm, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "부서 일정 목록 조회",
            description = "로그인 사용자와 같은 부서의 일정 목록을 페이징하여 조회합니다. schdlNm 으로 부분일치 검색할 수 있습니다.")
    @GetMapping("/dept")
    public ResponseEntity<ApiResponse<PageResponse<ScheduleDto>>> getDeptScheduleList(
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit,
            @RequestParam(required = false) String schdlNm) {
        String userId = currentLoginId();
        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        // schdlSeCd = "1" is Dept in eGov. 필터축은 담당자가 아니라 부서(schdlDeptId)다.
        Page<ScheduleDto> pageResult = egovScheduleService.getDeptScheduleList("1", userId, schdlNm, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "월별 일정 조회", description = "사용자의 월별 일정 목록을 조회합니다.")
    @GetMapping("/monthly")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> getMonthlySchedule(
            @RequestParam String yearMonth) {
        String userId = currentLoginId();
        List<ScheduleDto> schedules = egovScheduleService.getMonthlySchedule(userId, yearMonth);
        return ResponseEntity.ok(ApiResponse.success(schedules));
    }

    @Operation(summary = "기간별 일정 조회", description = "사용자의 특정 기간 내 일정 목록을 조회합니다.")
    @GetMapping("/range")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> getScheduleByDateRange(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        String userId = currentLoginId();
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
    public ResponseEntity<ApiResponse<String>> createSchedule(@Valid @RequestBody ScheduleDto dto) {
        // [H2] 엔벨로프를 우회하던 수동 빈-401 제거 — 인증은 Spring Security가 이미 강제한다.
        String userId = currentLoginId();
        String newId = egovScheduleService.createSchedule(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(newId));
    }

    @Operation(summary = "일정 수정", description = "기존 일정을 수정합니다.")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateSchedule(@PathVariable String id, @Valid @RequestBody ScheduleDto dto) {
        String userId = currentLoginId();
        egovScheduleService.updateSchedule(id, userId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "일정 삭제", description = "일정을 삭제합니다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSchedule(@PathVariable String id) {
        String userId = currentLoginId();
        egovScheduleService.deleteSchedule(id, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /** 현재 인증 주체의 loginId(일정 소유/필터/감사 frstRgtrId 저장 축). 미인증 폴백 "anonymous"(기존 동작 보존; 프로덕션은 Security 가 미인증을 선차단). */
    private String currentLoginId() {
        return SecurityUtil.getCurrentLoginId().orElse("anonymous");
    }
}
