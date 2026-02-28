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

@Tag(name = "EventCampaign (Admin)", description = "시스템 행사/캠페인 관리 API (관리자용)")
@RestController("systemEventCmpgnController")
@RequestMapping("/api/v1/admin/system/event-campaigns")
@RequiredArgsConstructor
public class EventCmpgnController {

    private final EventCmpgnService eventCmpgnService;

    @Operation(summary = "전체 행사 목록 조회", description = "관리자가 시스템에 등록된 모든 행사 내역을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventCmpgnDto>>> getEventCmpgnList(
            @RequestParam(required = false) String eventCn,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventCmpgnList(eventCn, pageable)));
    }

    @Operation(summary = "행사 상세 조회", description = "행사 상세 내용을 조회합니다.")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventCmpgnDto>> getEventCmpgn(
            @Parameter(description = "행사 ID") @PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventCmpgn(eventId)));
    }

    @Operation(summary = "행사 등록", description = "관리자가 새로운 행사 또는 캠페인을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEventCmpgn(@RequestBody EventCmpgnDto dto) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.createEventCmpgn(dto)));
    }

    @Operation(summary = "행사 정보 수정", description = "기존 행사 정보를 수정합니다.")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEventCmpgn(
            @PathVariable String eventId,
            @RequestBody EventCmpgnDto dto) {
        dto.setEventId(eventId);
        eventCmpgnService.updateEventCmpgn(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "행사 정보 삭제", description = "행사 내역을 시스템에서 삭제합니다.")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEventCmpgn(@PathVariable String eventId) {
        eventCmpgnService.deleteEventCmpgn(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
