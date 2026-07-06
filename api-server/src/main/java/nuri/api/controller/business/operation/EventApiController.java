package nuri.api.controller.business.operation;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import nuri.business.service.operation.EventInfoService;
import nuri.business.service.operation.dto.EventInfoDto;
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

@Tag(name = "Event", description = "행사관리 API")
@RestController
@RequestMapping("/api/v1/admin/operation/events")
@RequiredArgsConstructor
public class EventApiController {

    private final EventInfoService eventInfoService;

    @Operation(summary = "행사 목록 조회", description = "기능별 행사 정보를 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<EventInfoDto>>> getEventList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<EventInfoDto> result = eventInfoService.getEventList(searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "행사 상세 조회", description = "행사 상세 정보를 조회합니다.")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventInfoDto>> getEvent(
            @Parameter(description = "행사 ID", example = "EVT_12345678") @PathVariable String eventId) {
        return ResponseEntity.ok(ApiResponse.success(eventInfoService.getEvent(eventId)));
    }

    @Operation(summary = "행사 정보 등록", description = "새로운 행사 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createEvent(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody EventInfoDto request) {
        return ResponseEntity.ok(ApiResponse.success(eventInfoService.createEvent(userDetails.getUsername(), request)));
    }

    @Operation(summary = "행사 정보 수정", description = "행사 정보를 수정합니다.")
    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> updateEvent(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String eventId,
            @Valid @RequestBody EventInfoDto request) {
        eventInfoService.updateEvent(eventId, userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "행사 정보 삭제", description = "행사 정보를 삭제합니다.")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String eventId) {
        eventInfoService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
