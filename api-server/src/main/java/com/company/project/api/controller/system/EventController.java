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

@Tag(name = "Event (Admin)", description = "?œìŠ¤???´ë²¤??ê´€ë¦?API (ê´€ë¦¬ì??")
@RestController("systemEventController")
@RequestMapping("/api/v1/admin/system/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @Operation(summary = "?„ì²´ ?´ë²¤??ëª©ë¡ ì¡°íšŒ", description = "ê´€ë¦¬ìê°€ ?œìŠ¤?œì— ?±ë¡??ëª¨ë“  ?´ë²¤?¸ë? ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventDto>>> getEventList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEventList(searchWrd, pageable)));
    }

    @Operation(summary = "?´ë²¤???ì„¸ ì¡°íšŒ", description = "?¹ì • ?´ë²¤?¸ì˜ ?ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventDto>> getEvent(@PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getEvent(eventId)));
    }

    @Operation(summary = "?´ë²¤??ì§ì ‘ ?±ë¡", description = "ê´€ë¦¬ìê°€ ?œìŠ¤??ê³µí†µ ?´ë²¤?¸ë? ?±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEvent(@RequestBody EventDto dto) {
        return ResponseEntity.ok(ApiResponse.success(eventService.createEvent("ADMIN", dto)));
    }

    @Operation(summary = "?´ë²¤???•ë³´ ?˜ì •", description = "ê¸°ì¡´ ?´ë²¤???•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(@PathVariable String eventId, @RequestBody EventDto dto) {
        eventService.updateEvent(eventId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?´ë²¤???•ë³´ ?? œ", description = "?´ë²¤???•ë³´ë¥??œìŠ¤?œì—???? œ?©ë‹ˆ??")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable String eventId) {
        eventService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?´ë²¤??ì°¸ì—¬??ëª©ë¡ ì¡°íšŒ", description = "?¹ì • ?´ë²¤?¸ì— ?€??ì°¸ì—¬ ? ì²­??ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{eventId}/attendees")
    public ResponseEntity<ApiResponse<Page<EventAttendanceDto>>> getEventAttendeeList(
            @PathVariable String eventId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventService.getAttendanceList(eventId, pageable)));
    }

    @Operation(summary = "?´ë²¤??ì°¸ì—¬ ?¹ì¸ ì²˜ë¦¬", description = "?¬ìš©?ì˜ ?´ë²¤??ì°¸ì—¬ ? ì²­???¹ì¸ ?ëŠ” ë°˜ë ¤ ì²˜ë¦¬?©ë‹ˆ??")
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
