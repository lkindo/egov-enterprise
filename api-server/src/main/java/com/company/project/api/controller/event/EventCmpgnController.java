package com.company.project.api.controller.event;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.event.EgovEventCmpgnService;
import com.company.project.service.event.dto.EventInfoDto;
import com.company.project.service.event.dto.ExternalHrDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "EventCampaign (User)", description = "?‰ì‚¬/?´ë²¤??ê´€ë¦?API")
@RestController("userEventCmpgnController")
@RequestMapping("/api/v1/event-campaigns")
@RequiredArgsConstructor
public class EventCmpgnController {

    private final EgovEventCmpgnService eventCmpgnService;

    @Operation(summary = "?‰ì‚¬ ëª©ë¡ ì¡°íšŒ", description = "ì§„í–‰ ì¤‘ì´ê±°ë‚˜ ?ˆì •???‰ì‚¬ ë°?ìº í˜??ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventInfoDto>>> getEvents(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventList(keyword, pageable)));
    }

    @Operation(summary = "?‰ì‚¬ ?ì„¸ ì¡°íšŒ", description = "?¹ì • ?‰ì‚¬ ?ëŠ” ìº í˜?¸ì˜ ?ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventInfoDto>> getEvent(
            @Parameter(description = "?‰ì‚¬ ID") @PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEvent(eventId)));
    }

    @Operation(summary = "?‰ì‚¬ ?•ë³´ ?±ë¡", description = "?ˆë¡œ???‰ì‚¬ ?ëŠ” ìº í˜???•ë³´ë¥??±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertEvent(@RequestBody EventInfoDto dto) {
        eventCmpgnService.insertEvent(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?‰ì‚¬ ?•ë³´ ?˜ì •", description = "?±ë¡???‰ì‚¬ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(
            @PathVariable String eventId,
            @RequestBody EventInfoDto dto) {
        dto.setEventId(eventId);
        eventCmpgnService.updateEvent(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?‰ì‚¬ ?•ë³´ ?? œ", description = "?±ë¡???‰ì‚¬ ?•ë³´ë¥??? œ?©ë‹ˆ??")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable String eventId) {
        eventCmpgnService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- ?¸ë? ?¸ë ¥ ê´€ë¦?(External HR) ---

    @Operation(summary = "?‰ì‚¬ ê´€???¸ë? ?¸ë ¥ ëª©ë¡ ì¡°íšŒ", description = "?¹ì • ?‰ì‚¬??ì°¸ì—¬?˜ëŠ” ?¸ë? ?¸ë ¥ ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{eventId}/hrs")
    public ResponseEntity<ApiResponse<Page<ExternalHrDto>>> getExternalHrs(
            @PathVariable String eventId,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getExternalHrList(eventId, keyword, pageable)));
    }

    @Operation(summary = "?¸ë? ?¸ë ¥ ì¶”ê?", description = "?¹ì • ?‰ì‚¬???ˆë¡œ???¸ë? ?¸ë ¥??ì¶”ê??©ë‹ˆ??")
    @PostMapping("/{eventId}/hrs")
    public ResponseEntity<ApiResponse<Void>> insertExternalHr(
            @PathVariable String eventId,
            @RequestBody ExternalHrDto dto) {
        dto.setEventId(eventId);
        eventCmpgnService.insertExternalHr(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?¸ë? ?¸ë ¥ ?•ë³´ ?? œ", description = "?±ë¡???¸ë? ?¸ë ¥ ?•ë³´ë¥??? œ?©ë‹ˆ??")
    @DeleteMapping("/hrs/{extrlHrId}")
    public ResponseEntity<ApiResponse<Void>> deleteExternalHr(@PathVariable String extrlHrId) {
        eventCmpgnService.deleteExternalHr(extrlHrId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
