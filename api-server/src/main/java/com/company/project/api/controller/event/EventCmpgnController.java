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

@Tag(name = "EventCampaign (User)", description = "행사/이벤트 관리 API")
@RestController("userEventCmpgnController")
@RequestMapping("/api/v1/event-campaigns")
@RequiredArgsConstructor
public class EventCmpgnController {

    private final EgovEventCmpgnService eventCmpgnService;

    @Operation(summary = "행사 목록 조회", description = "진행 중이거나 예정된 행사 및 캠페인 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventInfoDto>>> getEvents(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventList(keyword, pageable)));
    }

    @Operation(summary = "행사 상세 조회", description = "특정 행사 또는 캠페인의 상세 정보를 조회합니다.")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventInfoDto>> getEvent(
            @Parameter(description = "행사 ID") @PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEvent(eventId)));
    }

    @Operation(summary = "행사 정보 등록", description = "새로운 행사 또는 캠페인 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertEvent(@RequestBody EventInfoDto dto) {
        eventCmpgnService.insertEvent(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "행사 정보 수정", description = "등록된 행사 정보를 수정합니다.")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(
            @PathVariable String eventId,
            @RequestBody EventInfoDto dto) {
        dto.setEventId(eventId);
        eventCmpgnService.updateEvent(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "행사 정보 삭제", description = "등록된 행사 정보를 삭제합니다.")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable String eventId) {
        eventCmpgnService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- 외부 인력 관리 (External HR) ---

    @Operation(summary = "행사 관련 외부 인력 목록 조회", description = "특정 행사에 참여하는 외부 인력 목록을 조회합니다.")
    @GetMapping("/{eventId}/hrs")
    public ResponseEntity<ApiResponse<Page<ExternalHrDto>>> getExternalHrs(
            @PathVariable String eventId,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getExternalHrList(eventId, keyword, pageable)));
    }

    @Operation(summary = "외부 인력 추가", description = "특정 행사에 새로운 외부 인력을 추가합니다.")
    @PostMapping("/{eventId}/hrs")
    public ResponseEntity<ApiResponse<Void>> insertExternalHr(
            @PathVariable String eventId,
            @RequestBody ExternalHrDto dto) {
        dto.setEventId(eventId);
        eventCmpgnService.insertExternalHr(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "외부 인력 정보 삭제", description = "등록된 외부 인력 정보를 삭제합니다.")
    @DeleteMapping("/hrs/{extrlHrId}")
    public ResponseEntity<ApiResponse<Void>> deleteExternalHr(@PathVariable String extrlHrId) {
        eventCmpgnService.deleteExternalHr(extrlHrId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
