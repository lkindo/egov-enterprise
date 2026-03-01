package com.company.project.api.controller.meeting;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.meeting.MeetingService;
import com.company.project.service.meeting.dto.MeetingManageDto;
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

@Tag(name = "Meeting", description = "?�의???�약 �??�의 관�?API")
@RestController
@RequestMapping("/api/v1/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;

    // --- Meeting Places (?�의?? ---

    @Operation(summary = "?�의??목록 조회", description = "?�스?�에 ?�록???�의??목록???�이징하??조회?�니??")
    @GetMapping("/places")
    public ResponseEntity<ApiResponse<Page<MeetingPlaceDto>>> getMeetingPlaces(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingPlaceList(searchWrd, pageable)));
    }

    @Operation(summary = "?�의???�세 조회", description = "?�정 ?�의?�의 ?�세 ?�보�?조회?�니??")
    @GetMapping("/places/{mtgPlaceId}")
    public ResponseEntity<ApiResponse<MeetingPlaceDto>> getMeetingPlace(
            @Parameter(description = "?�의??ID") @PathVariable String mtgPlaceId) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingPlace(mtgPlaceId)));
    }

    @Operation(summary = "?�의???�록", description = "?�로???�의???�보�??�록?�니??")
    @PostMapping("/places")
    public ResponseEntity<ApiResponse<String>> createMeetingPlace(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MeetingPlaceDto dto) {
        return ResponseEntity
                .ok(ApiResponse.success(meetingService.createMeetingPlace(userDetails.getUsername(), dto)));
    }

    @Operation(summary = "?�의???�보 ?�정", description = "?�의?�의 명칭, ?�픈 ?�간 ???�보�??�정?�니??")
    @PutMapping("/places/{mtgPlaceId}")
    public ResponseEntity<ApiResponse<Void>> updateMeetingPlace(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?�의??ID") @PathVariable String mtgPlaceId,
            @RequestBody MeetingPlaceDto dto) {
        meetingService.updateMeetingPlace(mtgPlaceId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?�의????��", description = "?�록???�의???�보�???��?�니??")
    @DeleteMapping("/places/{mtgPlaceId}")
    public ResponseEntity<ApiResponse<Void>> deleteMeetingPlace(
            @Parameter(description = "?�의??ID") @PathVariable String mtgPlaceId) {
        meetingService.deleteMeetingPlace(mtgPlaceId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Reservations (?�의???�약) ---

    @Operation(summary = "?�의???�약 목록 조회", description = "?�스?�의 ?�의???�약 ?�황???�이징하??조회?�니??")
    @GetMapping("/reservations")
    public ResponseEntity<ApiResponse<Page<MeetingReservationDto>>> getMeetingReservations(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingReservationList(searchWrd, pageable)));
    }

    @Operation(summary = "?�의???�약 ?�세 조회", description = "?�정 ?�의???�약???�세 ?�보�?조회?�니??")
    @GetMapping("/reservations/{resveId}")
    public ResponseEntity<ApiResponse<MeetingReservationDto>> getMeetingReservation(
            @Parameter(description = "?�약 ID") @PathVariable String resveId) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingReservation(resveId)));
    }

    @Operation(summary = "?�의???�약 ?�청", description = "?�정 ?�의?�에 ?�???�약???�청?�니??")
    @PostMapping("/reservations")
    public ResponseEntity<ApiResponse<String>> reserveMeetingPlace(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MeetingReservationDto dto) {
        return ResponseEntity
                .ok(ApiResponse.success(meetingService.reserveMeetingPlace(userDetails.getUsername(), dto)));
    }

    @Operation(summary = "?�의???�약 ?�보 ?�정", description = "?�록???�의???�약 ?�보�??�정?�니??")
    @PutMapping("/reservations/{resveId}")
    public ResponseEntity<ApiResponse<Void>> updateMeetingReservation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?�약 ID") @PathVariable String resveId,
            @RequestBody MeetingReservationDto dto) {
        meetingService.updateMeetingReservation(resveId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?�의???�약 취소", description = "?�록???�의???�약??취소?�니??")
    @DeleteMapping("/reservations/{resveId}")
    public ResponseEntity<ApiResponse<Void>> cancelMeetingReservation(
            @Parameter(description = "?�약 ID") @PathVariable String resveId) {
        meetingService.cancelMeetingReservation(resveId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Meeting Management (?�의 관�? ---

    @Operation(summary = "?�의 목록 조회", description = "?�스?�에 ?�록???�의 목록???�이징하??조회?�니??")
    @GetMapping("/manage")
    public ResponseEntity<ApiResponse<Page<MeetingManageDto>>> getMeetings(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingList(keyword, pageable)));
    }

    @Operation(summary = "?�의 ?�세 조회", description = "?�정 ?�의???�세 ?�보�?조회?�니??")
    @GetMapping("/manage/{mtgId}")
    public ResponseEntity<ApiResponse<MeetingManageDto>> getMeeting(
            @Parameter(description = "?�의 ID") @PathVariable String mtgId) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeeting(mtgId)));
    }

    @Operation(summary = "?�의 ?�록", description = "?�로???�의 ?�보�??�록?�니??")
    @PostMapping("/manage")
    public ResponseEntity<ApiResponse<Void>> insertMeeting(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MeetingManageDto dto) {
        dto.setFrstRegisterId(userDetails.getUsername());
        meetingService.insertMeeting(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?�의 ?�보 ?�정", description = "?�록???�의 ?�보�??�정?�니??")
    @PutMapping("/manage/{mtgId}")
    public ResponseEntity<ApiResponse<Void>> updateMeeting(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String mtgId,
            @RequestBody MeetingManageDto dto) {
        dto.setMtgId(mtgId);
        dto.setLastUpdusrId(userDetails.getUsername());
        meetingService.updateMeeting(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?�의 ?�보 ??��", description = "?�록???�의 ?�보�???��?�니??")
    @DeleteMapping("/manage/{mtgId}")
    public ResponseEntity<ApiResponse<Void>> deleteMeeting(@PathVariable String mtgId) {
        meetingService.deleteMeeting(mtgId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
