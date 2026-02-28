package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.event.EventService;
import com.company.project.service.event.dto.EventAttendanceDto;
import com.company.project.service.event.dto.EventDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Event (Admin)", description = "시스템 이벤트 관리 API (관리자용)")
@RestController("systemEventController")
@RequestMapping("/api/v1/admin/system/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @Operation(summary = "전체 이벤트 목록 조회", description = "관리자가 시스템에 등록된 모든 이벤트를 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventDto>>> getEventList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEventList(searchWrd, pageable)));
    }

    @Operation(summary = "이벤트 상세 조회", description = "특정 이벤트의 상세 정보를 조회합니다.")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventDto>> getEvent(@PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEvent(eventId)));
    }

    @Operation(summary = "이벤트 직접 등록", description = "관리자가 시스템 공통 이벤트를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEvent(@RequestBody EventDto dto) {
        return ResponseEntity.ok(ApiResponse.success(eventService.createEvent("ADMIN", dto)));
    }

    @Operation(summary = "이벤트 정보 수정", description = "기존 이벤트 정보를 수정합니다.")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(@PathVariable String eventId, @RequestBody EventDto dto) {
        eventService.updateEvent(eventId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "이벤트 정보 삭제", description = "이벤트 정보를 시스템에서 삭제합니다.")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable String eventId) {
        eventService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "이벤트 참여자 목록 조회", description = "특정 이벤트에 대한 참여 신청자 목록을 조회합니다.")
    @GetMapping("/{eventId}/attendees")
    public ResponseEntity<ApiResponse<Page<EventAttendanceDto>>> getEventAttendeeList(
            @PathVariable String eventId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getAttendanceList(eventId, pageable)));
    }

    @Operation(summary = "이벤트 참여 승인 처리", description = "사용자의 이벤트 참여 신청을 승인 또는 반려 처리합니다.")
    @PutMapping("/{eventId}/attendees/{applcntId}/approval")
    public ResponseEntity<ApiResponse<Void>> approveAttendance(
            @PathVariable String eventId,
            @PathVariable String applcntId,
            @RequestParam String confmAt,
            @RequestParam(required = false) String returnResn) {
        eventService.approveAttendance(eventId, applcntId, "ADMIN", confmAt, returnResn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
