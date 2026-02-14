package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.system.EventCmpgnService;
import com.company.project.service.system.dto.EventCmpgnDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Event/Campaign Management", description = "Collaboration Event/Campaign Management APIs")
@RestController("systemEventCmpgnController")
@RequestMapping("/api/v1/admin/system/event-campaigns")
@RequiredArgsConstructor
public class EventCmpgnController {

    private final EventCmpgnService eventCmpgnService;
    private final EgovIdGnrService egovEventCmpgnIdGnrService;

    @Operation(summary = "Get Event/Campaign List")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventCmpgnDto>>> getEventCmpgnList(
            @RequestParam(required = false) String eventCn,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventCmpgnList(eventCn, pageable)));
    }

    @Operation(summary = "Get Event/Campaign Detail")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventCmpgnDto>> getEventCmpgn(@PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventCmpgn(eventId)));
    }

    @Operation(summary = "Create Event/Campaign")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEventCmpgn(@RequestBody EventCmpgnDto dto) throws Exception {
        String id = egovEventCmpgnIdGnrService.getNextStringId();
        dto.setEventId(id);
        eventCmpgnService.createEventCmpgn(dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "Update Event/Campaign")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEventCmpgn(@PathVariable String eventId, @RequestBody EventCmpgnDto dto) {
        dto.setEventId(eventId);
        eventCmpgnService.updateEventCmpgn(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Delete Event/Campaign")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEventCmpgn(@PathVariable String eventId) {
        eventCmpgnService.deleteEventCmpgn(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
