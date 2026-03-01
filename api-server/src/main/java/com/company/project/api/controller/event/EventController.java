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

@Tag(name = "Event (User)", description = "?¬ë‚´ ?´ë²¤??ì°¸ì—¬ ë°?? ì²­ API (?¬ìš©?ìš©)")
@RestController("userEventController")
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @Operation(summary = "?´ë²¤??ëª©ë¡ ì¡°íšŒ", description = "ì§„í–‰ ì¤‘ì´ê±°ë‚˜ ì¢…ë£Œ???´ë²¤??ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventDto>>> getEvents(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEventList(searchWrd, pageable)));
    }

    @Operation(summary = "?´ë²¤???ì„¸ ì¡°íšŒ", description = "?¹ì • ?´ë²¤?¸ì˜ ?ì„¸ ?´ìš©??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventDto>> getEvent(
            @Parameter(description = "?´ë²¤??ID") @PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEvent(eventId)));
    }

    @Operation(summary = "?´ë²¤???±ë¡ ? ì²­", description = "?ˆë¡œ???´ë²¤?¸ë? ê°œìµœ?˜ê¸° ?„í•´ ? ì²­?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEvent(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody EventDto eventDto) {
        return ResponseEntity.ok(ApiResponse.success(eventService.createEvent(userDetails.getUsername(), eventDto)));
    }

    @Operation(summary = "?´ë²¤???•ë³´ ?˜ì •", description = "ë³¸ì¸???‘ì„±???´ë²¤???•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?´ë²¤??ID") @PathVariable String eventId,
            @RequestBody EventDto eventDto) {
        eventService.updateEvent(eventId, userDetails.getUsername(), eventDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?´ë²¤???? œ/ì·¨ì†Œ", description = "? ì²­???´ë²¤?¸ë? ì·¨ì†Œ?˜ê±°???? œ?©ë‹ˆ??")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(
            @Parameter(description = "?´ë²¤??ID") @PathVariable String eventId) {
        eventService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?´ë²¤??ì°¸ì—¬ ? ì²­ ëª©ë¡ ì¡°íšŒ", description = "?¹ì • ?´ë²¤?¸ì— ?€??ì°¸ì—¬ ? ì²­ ?„í™©??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{eventId}/attendance")
    public ResponseEntity<ApiResponse<Page<EventAttendanceDto>>> getAttendanceList(
            @Parameter(description = "?´ë²¤??ID") @PathVariable String eventId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getAttendanceList(eventId, pageable)));
    }

    @Operation(summary = "?´ë²¤??ì°¸ì—¬ ? ì²­", description = "ì§„í–‰ ì¤‘ì¸ ?´ë²¤?¸ì— ì°¸ì—¬ë¥?? ì²­?©ë‹ˆ??")
    @PostMapping("/{eventId}/attendance")
    public ResponseEntity<ApiResponse<Void>> applyAttendance(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?´ë²¤??ID") @PathVariable String eventId,
            @RequestBody EventAttendanceDto dto) {
        dto.setEventId(eventId);
        eventService.applyAttendance(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
