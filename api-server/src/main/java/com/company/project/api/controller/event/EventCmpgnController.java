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

@Tag(name = "EventCampaign", description = "Event and Campaign Management APIs")
@RestController("eventEventCmpgnController")
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventCmpgnController {

    private final EgovEventCmpgnService eventCmpgnService;

    @Operation(summary = "이벤트 목록 조회", description = "등록된 이벤트 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventInfoDto>>> getEvents(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventList(keyword, pageable)));
    }

    @Operation(summary = "이벤트 상세 조회", description = "특정 이벤트의 상세 정보를 조회합니다.")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventInfoDto>> getEvent(
            @Parameter(description = "이벤트 ID") @PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEvent(eventId)));
    }

    @Operation(summary = "이벤트 등록", description = "새로운 이벤트를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertEvent(
            @RequestBody EventInfoDto dto) {
        eventCmpgnService.insertEvent(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "이벤트 수정", description = "기존 이벤트 정보를 수정합니다.")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(
            @PathVariable String eventId,
            @RequestBody EventInfoDto dto) {
        dto.setEventId(eventId);
        eventCmpgnService.updateEvent(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "이벤트 삭제", description = "특정 이벤트를 삭제합니다.")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(
            @PathVariable String eventId) {
        eventCmpgnService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- External HR ---

    @Operation(summary = "외부 인력 목록 조회", description = "특정 이벤트에 할당된 외부 인력 목록을 조회합니다.")
    @GetMapping("/{eventId}/hrs")
    public ResponseEntity<ApiResponse<Page<ExternalHrDto>>> getExternalHrs(
            @PathVariable String eventId,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getExternalHrList(eventId, keyword, pageable)));
    }

    @Operation(summary = "외부 인력 등록", description = "이벤트에 참여할 외부 인력을 등록합니다.")
    @PostMapping("/{eventId}/hrs")
    public ResponseEntity<ApiResponse<Void>> insertExternalHr(
            @PathVariable String eventId,
            @RequestBody ExternalHrDto dto) {
        dto.setEventId(eventId);
        eventCmpgnService.insertExternalHr(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "외부 인력 삭제", description = "특정 외부 인력 정보를 삭제합니다.")
    @DeleteMapping("/hrs/{extrlHrId}")
    public ResponseEntity<ApiResponse<Void>> deleteExternalHr(
            @PathVariable String extrlHrId) {
        eventCmpgnService.deleteExternalHr(extrlHrId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
