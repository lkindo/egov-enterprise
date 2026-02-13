package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.system.EventService;
import com.company.project.service.system.dto.EventAttendeeDto;
import com.company.project.service.system.dto.EventDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Event Management", description = "Internal/General Event Management APIs")
@RestController
@RequestMapping("/api/v1/admin/system/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final EgovIdGnrService egovEventIdGnrService;

    @Operation(summary = "Get Event List")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventDto>>> getEventList(
            @RequestParam(required = false) String eventNm,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEventList(eventNm, pageable)));
    }

    @Operation(summary = "Get Event Detail")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventDto>> getEvent(@PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEvent(eventId)));
    }

    @Operation(summary = "Create Event")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEvent(@RequestBody EventDto dto) throws Exception {
        String id = egovEventIdGnrService.getNextStringId();
        dto.setEventId(id);
        eventService.createEvent(dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "Update Event")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(@PathVariable String eventId, @RequestBody EventDto dto) {
        dto.setEventId(eventId);
        eventService.updateEvent(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Delete Event")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable String eventId) {
        eventService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // Attendance APIs
    @Operation(summary = "Get Event Attendee List")
    @GetMapping("/{eventId}/attendees")
    public ResponseEntity<ApiResponse<Page<EventAttendeeDto>>> getEventAttendeeList(
            @PathVariable String eventId,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEventAttendeeList(eventId, pageable)));
    }

    @Operation(summary = "Apply for Event Attendance")
    @PostMapping("/{eventId}/apply")
    public ResponseEntity<ApiResponse<Void>> applyForEvent(
            @PathVariable String eventId,
            @RequestBody EventAttendeeDto dto) {
        dto.setEventId(eventId);
        eventService.applyForEvent(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Approve Event Attendance")
    @PostMapping("/{eventId}/attendees/{applcntId}/approve")
    public ResponseEntity<ApiResponse<Void>> approveAttendance(
            @PathVariable String eventId,
            @PathVariable String applcntId) {
        eventService.approveAttendance(applcntId, eventId, "ADMIN");
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
