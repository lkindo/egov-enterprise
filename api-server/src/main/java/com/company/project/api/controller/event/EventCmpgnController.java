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

@Tag(name = "EventCampaign (User)", description = "?�사/?�벤??관�?API")
@RestController("userEventCmpgnController")
@RequestMapping("/api/v1/event-campaigns")
@RequiredArgsConstructor
public class EventCmpgnController {

    private final EgovEventCmpgnService eventCmpgnService;

    @Operation(summary = "?�사 목록 조회", description = "진행 중이거나 ?�정???�사 �?캠페??목록??조회?�니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventInfoDto>>> getEvents(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventList(keyword, pageable)));
    }

    @Operation(summary = "?�사 ?�세 조회", description = "?�정 ?�사 ?�는 캠페?�의 ?�세 ?�보�?조회?�니??")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventInfoDto>> getEvent(
            @Parameter(description = "?�사 ID") @PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEvent(eventId)));
    }

    @Operation(summary = "?�사 ?�보 ?�록", description = "?�로???�사 ?�는 캠페???�보�??�록?�니??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertEvent(@RequestBody EventInfoDto dto) {
        eventCmpgnService.insertEvent(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?�사 ?�보 ?�정", description = "?�록???�사 ?�보�??�정?�니??")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(
            @PathVariable String eventId,
            @RequestBody EventInfoDto dto) {
        dto.setEventId(eventId);
        eventCmpgnService.updateEvent(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?�사 ?�보 ??��", description = "?�록???�사 ?�보�???��?�니??")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable String eventId) {
        eventCmpgnService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- ?��? ?�력 관�?(External HR) ---

    @Operation(summary = "?�사 관???��? ?�력 목록 조회", description = "?�정 ?�사??참여?�는 ?��? ?�력 목록??조회?�니??")
    @GetMapping("/{eventId}/hrs")
    public ResponseEntity<ApiResponse<Page<ExternalHrDto>>> getExternalHrs(
            @PathVariable String eventId,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getExternalHrList(eventId, keyword, pageable)));
    }

    @Operation(summary = "?��? ?�력 추�?", description = "?�정 ?�사???�로???��? ?�력??추�??�니??")
    @PostMapping("/{eventId}/hrs")
    public ResponseEntity<ApiResponse<Void>> insertExternalHr(
            @PathVariable String eventId,
            @RequestBody ExternalHrDto dto) {
        dto.setEventId(eventId);
        eventCmpgnService.insertExternalHr(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?��? ?�력 ?�보 ??��", description = "?�록???��? ?�력 ?�보�???��?�니??")
    @DeleteMapping("/hrs/{extrlHrId}")
    public ResponseEntity<ApiResponse<Void>> deleteExternalHr(@PathVariable String extrlHrId) {
        eventCmpgnService.deleteExternalHr(extrlHrId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
