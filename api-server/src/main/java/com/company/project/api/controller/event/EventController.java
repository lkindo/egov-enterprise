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

@Tag(name = "Event (User)", description = "?내 ?벤??참여 ??청 API (?용?용)")
@RestController("userEventController")
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @Operation(summary = "?벤??목록 조회", description = "진행 중이거나 종료???벤??목록??조회?니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventDto>>> getEvents(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEventList(searchWrd, pageable)));
    }

    @Operation(summary = "?벤???세 조회", description = "?정 ?벤?의 ?세 ?용??조회?니??")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventDto>> getEvent(
            @Parameter(description = "?벤??ID") @PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEvent(eventId)));
    }

    @Operation(summary = "?벤???록 ?청", description = "?로???벤?? 개최?기 ?해 ?청?니??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEvent(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody EventDto eventDto) {
        return ResponseEntity.ok(ApiResponse.success(eventService.createEvent(userDetails.getUsername(), eventDto)));
    }

    @Operation(summary = "?벤???보 ?정", description = "본인???성???벤???보??정?니??")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?벤??ID") @PathVariable String eventId,
            @RequestBody EventDto eventDto) {
        eventService.updateEvent(eventId, userDetails.getUsername(), eventDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?벤????/취소", description = "?청???벤?? 취소?거?????니??")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(
            @Parameter(description = "?벤??ID") @PathVariable String eventId) {
        eventService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?벤??참여 ?청 목록 조회", description = "?정 ?벤?에 ???참여 ?청 ?황??조회?니??")
    @GetMapping("/{eventId}/attendance")
    public ResponseEntity<ApiResponse<Page<EventAttendanceDto>>> getAttendanceList(
            @Parameter(description = "?벤??ID") @PathVariable String eventId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getAttendanceList(eventId, pageable)));
    }

    @Operation(summary = "?벤??참여 ?청", description = "진행 중인 ?벤?에 참여??청?니??")
    @PostMapping("/{eventId}/attendance")
    public ResponseEntity<ApiResponse<Void>> applyAttendance(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?벤??ID") @PathVariable String eventId,
            @RequestBody EventAttendanceDto dto) {
        dto.setEventId(eventId);
        eventService.applyAttendance(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
