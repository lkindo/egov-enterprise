package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.system.EventCmpgnService;
import com.company.project.service.system.dto.EventCmpgnDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "EventCampaign (Admin)", description = "?œìŠ¤???‰ì‚¬/ìº í˜??ê´€ë¦?API (ê´€ë¦¬ì??")
@RestController("systemEventCmpgnController")
@RequestMapping("/api/v1/admin/system/event-campaigns")
@RequiredArgsConstructor
public class EventCmpgnController {

    private final EventCmpgnService eventCmpgnService;

    @Operation(summary = "?„ì²´ ?‰ì‚¬ ëª©ë¡ ì¡°íšŒ", description = "ê´€ë¦¬ìê°€ ?œìŠ¤?œì— ?±ë¡??ëª¨ë“  ?‰ì‚¬ ?´ì—­??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventCmpgnDto>>> getEventCmpgnList(
            @RequestParam(required = false) String eventCn,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventCmpgnList(eventCn, pageable)));
    }

    @Operation(summary = "?‰ì‚¬ ?ì„¸ ì¡°íšŒ", description = "?‰ì‚¬ ?ì„¸ ?´ìš©??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventCmpgnDto>> getEventCmpgn(
            @Parameter(description = "?‰ì‚¬ ID") @PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventCmpgn(eventId)));
    }

    @Operation(summary = "?‰ì‚¬ ?±ë¡", description = "ê´€ë¦¬ìê°€ ?ˆë¡œ???‰ì‚¬ ?ëŠ” ìº í˜?¸ì„ ?±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEventCmpgn(@RequestBody EventCmpgnDto dto) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.createEventCmpgn(dto)));
    }

    @Operation(summary = "?‰ì‚¬ ?•ë³´ ?˜ì •", description = "ê¸°ì¡´ ?‰ì‚¬ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEventCmpgn(
            @PathVariable String eventId,
            @RequestBody EventCmpgnDto dto) {
        dto.setEventId(eventId);
        eventCmpgnService.updateEventCmpgn(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?‰ì‚¬ ?•ë³´ ?? œ", description = "?‰ì‚¬ ?´ì—­???œìŠ¤?œì—???? œ?©ë‹ˆ??")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEventCmpgn(@PathVariable String eventId) {
        eventCmpgnService.deleteEventCmpgn(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
