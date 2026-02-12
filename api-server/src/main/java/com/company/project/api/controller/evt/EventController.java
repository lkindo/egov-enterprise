package com.company.project.api.controller.evt;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.evt.EventService;
import com.company.project.service.evt.dto.EventAttendanceDto;
import com.company.project.service.evt.dto.EventDto;
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

@Tag(name = "Event", description = "Event Management and Attendance APIs")
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @Operation(summary = "행사 목록 조회", description = "등록된 행사 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventDto>>> getEvents(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEventList(searchWrd, pageable)));
    }

    @Operation(summary = "행사 상세 조회", description = "특정 행사의 상세 정보를 조회합니다.")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventDto>> getEvent(
            @Parameter(description = "행사 ID") @PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEvent(eventId)));
    }

    @Operation(summary = "행사 등록", description = "새로운 행사를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEvent(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody EventDto eventDto) {
        return ResponseEntity.ok(ApiResponse.success(eventService.createEvent(userDetails.getUsername(), eventDto)));
    }

    @Operation(summary = "행사 수정", description = "기존 행사 정보를 수정합니다.")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "행사 ID") @PathVariable String eventId,
            @RequestBody EventDto eventDto) {
        eventService.updateEvent(eventId, userDetails.getUsername(), eventDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "행사 삭제", description = "특정 행사를 삭제 처리합니다.")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(
            @Parameter(description = "행사 ID") @PathVariable String eventId) {
        eventService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Attendance ---

    @Operation(summary = "행사 참석 신청 목록 조회", description = "특정 행사의 참석 신청 목록을 조회합니다.")
    @GetMapping("/{eventId}/attendance")
    public ResponseEntity<ApiResponse<Page<EventAttendanceDto>>> getAttendanceList(
            @Parameter(description = "행사 ID") @PathVariable String eventId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getAttendanceList(eventId, pageable)));
    }

    @Operation(summary = "행사 참석 신청", description = "특정 행사에 참석을 신청합니다.")
    @PostMapping("/{eventId}/attendance")
    public ResponseEntity<ApiResponse<Void>> applyAttendance(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "행사 ID") @PathVariable String eventId,
            @RequestBody EventAttendanceDto dto) {
        dto.setEventId(eventId);
        eventService.applyAttendance(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "행사 참석 승인/반려", description = "행사 참석 신청을 승인하거나 반려합니다.")
    @PutMapping("/{eventId}/attendance/{applcntId}/approval")
    public ResponseEntity<ApiResponse<Void>> approveAttendance(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "행사 ID") @PathVariable String eventId,
            @Parameter(description = "신청자 ID") @PathVariable String applcntId,
            @RequestParam String confmAt,
            @RequestParam(required = false) String returnResn) {
        eventService.approveAttendance(eventId, applcntId, userDetails.getUsername(), confmAt, returnResn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
