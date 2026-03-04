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

@Tag(name = "Event (Admin)", description = "?스???벤??관?API (관리자??")
@RestController("systemEventController")
@RequestMapping("/api/v1/admin/system/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @Operation(summary = "?체 ?벤??목록 조회", description = "관리자가 ?스?에 ?록??모든 ?벤?? 조회?니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventDto>>> getEventList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEventList(searchWrd, pageable)));
    }

    @Operation(summary = "?벤???세 조회", description = "?정 ?벤?의 ?세 ?보?조회?니??")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventDto>> getEvent(@PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEvent(eventId)));
    }

    @Operation(summary = "?벤??직접 ?록", description = "관리자가 ?스??공통 ?벤?? ?록?니??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEvent(@RequestBody EventDto dto) {
        return ResponseEntity.ok(ApiResponse.success(eventService.createEvent("ADMIN", dto)));
    }

    @Operation(summary = "?벤???보 ?정", description = "기존 ?벤???보??정?니??")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(@PathVariable String eventId, @RequestBody EventDto dto) {
        eventService.updateEvent(eventId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?벤???보 ??", description = "?벤???보??스?에?????니??")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable String eventId) {
        eventService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?벤??참여??목록 조회", description = "?정 ?벤?에 ???참여 ?청??목록??조회?니??")
    @GetMapping("/{eventId}/attendees")
    public ResponseEntity<ApiResponse<Page<EventAttendanceDto>>> getEventAttendeeList(
            @PathVariable String eventId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getAttendanceList(eventId, pageable)));
    }

    @Operation(summary = "?벤??참여 ?인 처리", description = "?용?의 ?벤??참여 ?청???인 ?는 반려 처리?니??")
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
