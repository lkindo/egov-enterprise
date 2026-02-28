package com.company.project.api.controller.meeting;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.meeting.MeetingService;
import com.company.project.service.meeting.dto.MeetingPlaceDto;
import com.company.project.service.meeting.dto.MeetingReservationDto;
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

@Tag(name = "MeetingRoom", description = "회의실 및 예약 관리 API")
@RestController
@RequestMapping("/api/v1/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;

    // --- Meeting Places ---

    @Operation(summary = "회의실 목록 조회", description = "시스템에 등록된 회의실 목록을 페이징하여 조회합니다.")
    @GetMapping("/places")
    public ResponseEntity<ApiResponse<Page<MeetingPlaceDto>>> getMeetingPlaces(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingPlaceList(searchWrd, pageable)));
    }

    @Operation(summary = "회의실 상세 조회", description = "특정 회의실의 상세 정보를 조회합니다.")
    @GetMapping("/places/{mtgPlaceId}")
    public ResponseEntity<ApiResponse<MeetingPlaceDto>> getMeetingPlace(
            @Parameter(description = "회의실 ID") @PathVariable String mtgPlaceId) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingPlace(mtgPlaceId)));
    }

    @Operation(summary = "회의실 등록", description = "새로운 회의실 정보를 등록합니다.")
    @PostMapping("/places")
    public ResponseEntity<ApiResponse<String>> createMeetingPlace(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MeetingPlaceDto dto) {
        return ResponseEntity
                .ok(ApiResponse.success(meetingService.createMeetingPlace(userDetails.getUsername(), dto)));
    }

    @Operation(summary = "회의실 정보 수정", description = "회의실의 명칭, 오픈 시간 등 정보를 수정합니다.")
    @PutMapping("/places/{mtgPlaceId}")
    public ResponseEntity<ApiResponse<Void>> updateMeetingPlace(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "회의실 ID") @PathVariable String mtgPlaceId,
            @RequestBody MeetingPlaceDto dto) {
        meetingService.updateMeetingPlace(mtgPlaceId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "회의실 삭제", description = "등록된 회의실 정보를 삭제합니다.")
    @DeleteMapping("/places/{mtgPlaceId}")
    public ResponseEntity<ApiResponse<Void>> deleteMeetingPlace(
            @Parameter(description = "회의실 ID") @PathVariable String mtgPlaceId) {
        meetingService.deleteMeetingPlace(mtgPlaceId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Reservations ---

    @Operation(summary = "회의실 예약 목록 조회", description = "시스템의 회의실 예약 현황을 페이징하여 조회합니다.")
    @GetMapping("/reservations")
    public ResponseEntity<ApiResponse<Page<MeetingReservationDto>>> getMeetingReservations(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingReservationList(searchWrd, pageable)));
    }

    @Operation(summary = "회의실 예약 상세 조회", description = "특정 회의실 예약의 상세 정보를 조회합니다.")
    @GetMapping("/reservations/{resveId}")
    public ResponseEntity<ApiResponse<MeetingReservationDto>> getMeetingReservation(
            @Parameter(description = "예약 ID") @PathVariable String resveId) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingReservation(resveId)));
    }

    @Operation(summary = "회의실 예약 신청", description = "특정 회의실에 대한 예약을 신청합니다.")
    @PostMapping("/reservations")
    public ResponseEntity<ApiResponse<String>> reserveMeetingPlace(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MeetingReservationDto dto) {
        return ResponseEntity
                .ok(ApiResponse.success(meetingService.reserveMeetingPlace(userDetails.getUsername(), dto)));
    }

    @Operation(summary = "회의실 예약 정보 수정", description = "등록된 회의실 예약 정보를 수정합니다.")
    @PutMapping("/reservations/{resveId}")
    public ResponseEntity<ApiResponse<Void>> updateMeetingReservation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "예약 ID") @PathVariable String resveId,
            @RequestBody MeetingReservationDto dto) {
        meetingService.updateMeetingReservation(resveId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "회의실 예약 취소", description = "등록된 회의실 예약을 취소합니다.")
    @DeleteMapping("/reservations/{resveId}")
    public ResponseEntity<ApiResponse<Void>> cancelMeetingReservation(
            @Parameter(description = "예약 ID") @PathVariable String resveId) {
        meetingService.cancelMeetingReservation(resveId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
