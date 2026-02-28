package com.company.project.api.controller.event;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.event.EventService;
import com.company.project.service.event.dto.EventAttendanceDto;
import com.company.project.service.event.dto.EventDto;
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

@Tag(name = "Event (User)", description = "사내 이벤트 참여 및 신청 API (사용자용)")
@RestController("userEventController")
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @Operation(summary = "이벤트 목록 조회", description = "진행 중이거나 종료된 이벤트 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventDto>>> getEvents(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEventList(searchWrd, pageable)));
    }

    @Operation(summary = "이벤트 상세 조회", description = "특정 이벤트의 상세 내용을 조회합니다.")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventDto>> getEvent(
            @Parameter(description = "이벤트 ID") @PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEvent(eventId)));
    }

    @Operation(summary = "이벤트 등록 신청", description = "새로운 이벤트를 개최하기 위해 신청합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEvent(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody EventDto eventDto) {
        return ResponseEntity.ok(ApiResponse.success(eventService.createEvent(userDetails.getUsername(), eventDto)));
    }

    @Operation(summary = "이벤트 정보 수정", description = "본인이 작성한 이벤트 정보를 수정합니다.")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "이벤트 ID") @PathVariable String eventId,
            @RequestBody EventDto eventDto) {
        eventService.updateEvent(eventId, userDetails.getUsername(), eventDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "이벤트 삭제/취소", description = "신청한 이벤트를 취소하거나 삭제합니다.")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(
            @Parameter(description = "이벤트 ID") @PathVariable String eventId) {
        eventService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "이벤트 참여 신청 목록 조회", description = "특정 이벤트에 대한 참여 신청 현황을 조회합니다.")
    @GetMapping("/{eventId}/attendance")
    public ResponseEntity<ApiResponse<Page<EventAttendanceDto>>> getAttendanceList(
            @Parameter(description = "이벤트 ID") @PathVariable String eventId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getAttendanceList(eventId, pageable)));
    }

    @Operation(summary = "이벤트 참여 신청", description = "진행 중인 이벤트에 참여를 신청합니다.")
    @PostMapping("/{eventId}/attendance")
    public ResponseEntity<ApiResponse<Void>> applyAttendance(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "이벤트 ID") @PathVariable String eventId,
            @RequestBody EventAttendanceDto dto) {
        dto.setEventId(eventId);
        eventService.applyAttendance(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
