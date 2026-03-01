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

@Tag(name = "Meeting", description = "?Œì˜???ˆì•½ ë°??Œì˜ ê´€ë¦?API")
@RestController
@RequestMapping("/api/v1/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;

    // --- Meeting Places (?Œì˜?? ---

    @Operation(summary = "?Œì˜??ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤?œì— ?±ë¡???Œì˜??ëª©ë¡???˜ì´ì§•í•˜??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/places")
    public ResponseEntity<ApiResponse<Page<MeetingPlaceDto>>> getMeetingPlaces(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingPlaceList(searchWrd, pageable)));
    }

    @Operation(summary = "?Œì˜???ì„¸ ì¡°íšŒ", description = "?¹ì • ?Œì˜?¤ì˜ ?ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/places/{mtgPlaceId}")
    public ResponseEntity<ApiResponse<MeetingPlaceDto>> getMeetingPlace(
            @Parameter(description = "?Œì˜??ID") @PathVariable String mtgPlaceId) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingPlace(mtgPlaceId)));
    }

    @Operation(summary = "?Œì˜???±ë¡", description = "?ˆë¡œ???Œì˜???•ë³´ë¥??±ë¡?©ë‹ˆ??")
    @PostMapping("/places")
    public ResponseEntity<ApiResponse<String>> createMeetingPlace(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MeetingPlaceDto dto) {
        return ResponseEntity
                .ok(ApiResponse.success(meetingService.createMeetingPlace(userDetails.getUsername(), dto)));
    }

    @Operation(summary = "?Œì˜???•ë³´ ?˜ì •", description = "?Œì˜?¤ì˜ ëª…ì¹­, ?¤í”ˆ ?œê°„ ???•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/places/{mtgPlaceId}")
    public ResponseEntity<ApiResponse<Void>> updateMeetingPlace(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?Œì˜??ID") @PathVariable String mtgPlaceId,
            @RequestBody MeetingPlaceDto dto) {
        meetingService.updateMeetingPlace(mtgPlaceId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?Œì˜???? œ", description = "?±ë¡???Œì˜???•ë³´ë¥??? œ?©ë‹ˆ??")
    @DeleteMapping("/places/{mtgPlaceId}")
    public ResponseEntity<ApiResponse<Void>> deleteMeetingPlace(
            @Parameter(description = "?Œì˜??ID") @PathVariable String mtgPlaceId) {
        meetingService.deleteMeetingPlace(mtgPlaceId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Reservations (?Œì˜???ˆì•½) ---

    @Operation(summary = "?Œì˜???ˆì•½ ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤?œì˜ ?Œì˜???ˆì•½ ?„í™©???˜ì´ì§•í•˜??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/reservations")
    public ResponseEntity<ApiResponse<Page<MeetingReservationDto>>> getMeetingReservations(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingReservationList(searchWrd, pageable)));
    }

    @Operation(summary = "?Œì˜???ˆì•½ ?ì„¸ ì¡°íšŒ", description = "?¹ì • ?Œì˜???ˆì•½???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/reservations/{resveId}")
    public ResponseEntity<ApiResponse<MeetingReservationDto>> getMeetingReservation(
            @Parameter(description = "?ˆì•½ ID") @PathVariable String resveId) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingReservation(resveId)));
    }

    @Operation(summary = "?Œì˜???ˆì•½ ? ì²­", description = "?¹ì • ?Œì˜?¤ì— ?€???ˆì•½??? ì²­?©ë‹ˆ??")
    @PostMapping("/reservations")
    public ResponseEntity<ApiResponse<String>> reserveMeetingPlace(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MeetingReservationDto dto) {
        return ResponseEntity
                .ok(ApiResponse.success(meetingService.reserveMeetingPlace(userDetails.getUsername(), dto)));
    }

    @Operation(summary = "?Œì˜???ˆì•½ ?•ë³´ ?˜ì •", description = "?±ë¡???Œì˜???ˆì•½ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/reservations/{resveId}")
    public ResponseEntity<ApiResponse<Void>> updateMeetingReservation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?ˆì•½ ID") @PathVariable String resveId,
            @RequestBody MeetingReservationDto dto) {
        meetingService.updateMeetingReservation(resveId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?Œì˜???ˆì•½ ì·¨ì†Œ", description = "?±ë¡???Œì˜???ˆì•½??ì·¨ì†Œ?©ë‹ˆ??")
    @DeleteMapping("/reservations/{resveId}")
    public ResponseEntity<ApiResponse<Void>> cancelMeetingReservation(
            @Parameter(description = "?ˆì•½ ID") @PathVariable String resveId) {
        meetingService.cancelMeetingReservation(resveId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Meeting Management (?Œì˜ ê´€ë¦? ---

    @Operation(summary = "?Œì˜ ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤?œì— ?±ë¡???Œì˜ ëª©ë¡???˜ì´ì§•í•˜??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/manage")
    public ResponseEntity<ApiResponse<Page<MeetingManageDto>>> getMeetings(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingList(keyword, pageable)));
    }

    @Operation(summary = "?Œì˜ ?ì„¸ ì¡°íšŒ", description = "?¹ì • ?Œì˜???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/manage/{mtgId}")
    public ResponseEntity<ApiResponse<MeetingManageDto>> getMeeting(
            @Parameter(description = "?Œì˜ ID") @PathVariable String mtgId) {
        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeeting(mtgId)));
    }

    @Operation(summary = "?Œì˜ ?±ë¡", description = "?ˆë¡œ???Œì˜ ?•ë³´ë¥??±ë¡?©ë‹ˆ??")
    @PostMapping("/manage")
    public ResponseEntity<ApiResponse<Void>> insertMeeting(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MeetingManageDto dto) {
        dto.setFrstRegisterId(userDetails.getUsername());
        meetingService.insertMeeting(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?Œì˜ ?•ë³´ ?˜ì •", description = "?±ë¡???Œì˜ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
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

    @Operation(summary = "?Œì˜ ?•ë³´ ?? œ", description = "?±ë¡???Œì˜ ?•ë³´ë¥??? œ?©ë‹ˆ??")
    @DeleteMapping("/manage/{mtgId}")
    public ResponseEntity<ApiResponse<Void>> deleteMeeting(@PathVariable String mtgId) {
        meetingService.deleteMeeting(mtgId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
