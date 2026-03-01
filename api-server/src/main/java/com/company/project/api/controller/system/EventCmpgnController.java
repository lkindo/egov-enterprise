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

@Tag(name = "EventCampaign (Admin)", description = "?�스???�사/캠페??관�?API (관리자??")
@RestController("systemEventCmpgnController")
@RequestMapping("/api/v1/admin/system/event-campaigns")
@RequiredArgsConstructor
public class EventCmpgnController {

    private final EventCmpgnService eventCmpgnService;

    @Operation(summary = "?�체 ?�사 목록 조회", description = "관리자가 ?�스?�에 ?�록??모든 ?�사 ?�역??조회?�니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventCmpgnDto>>> getEventCmpgnList(
            @RequestParam(required = false) String eventCn,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventCmpgnList(eventCn, pageable)));
    }

    @Operation(summary = "?�사 ?�세 조회", description = "?�사 ?�세 ?�용??조회?�니??")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventCmpgnDto>> getEventCmpgn(
            @Parameter(description = "?�사 ID") @PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventCmpgn(eventId)));
    }

    @Operation(summary = "?�사 ?�록", description = "관리자가 ?�로???�사 ?�는 캠페?�을 ?�록?�니??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEventCmpgn(@RequestBody EventCmpgnDto dto) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.createEventCmpgn(dto)));
    }

    @Operation(summary = "?�사 ?�보 ?�정", description = "기존 ?�사 ?�보�??�정?�니??")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEventCmpgn(
            @PathVariable String eventId,
            @RequestBody EventCmpgnDto dto) {
        dto.setEventId(eventId);
        eventCmpgnService.updateEventCmpgn(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?�사 ?�보 ??��", description = "?�사 ?�역???�스?�에????��?�니??")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEventCmpgn(@PathVariable String eventId) {
        eventCmpgnService.deleteEventCmpgn(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
