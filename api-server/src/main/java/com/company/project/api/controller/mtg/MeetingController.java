package com.company.project.api.controller.mtg;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.mtg.MeetingService;

import com.company.project.service.mtg.dto.MeetingPlaceDto;

import com.company.project.service.mtg.dto.MeetingReservationDto;

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

@Tag(name = "MeetingRoom", description = "Meeting Room and Reservation Management APIs")

@RestController

@RequestMapping("/api/v1/meetings")

@RequiredArgsConstructor

public class MeetingController {

    private final MeetingService meetingService;

    // --- Meeting Places ---

@Operation(summary = "???   ??            ?         ??", description = "?         ?????   ??            ????                  ??         ???      ??")

    @GetMapping("/places")

    public ResponseEntity<ApiResponse<Page<MeetingPlaceDto>>> getMeetingPlaces(

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingPlaceList(searchWrd, pageable)));

    }

@Operation(summary = "???   ???                   ??", description = "?     ?????   ??       ?          ?         ??         ???      ??")

    @GetMapping("/places/{mtgPlaceId}")

    public ResponseEntity<ApiResponse<MeetingPlaceDto>> getMeetingPlace(

            @Parameter(description = "???   ??ID") @PathVariable String mtgPlaceId) {

        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingPlace(mtgPlaceId)));

    }

@Operation(summary = "???   ???         ", description = "??      ?????   ??       ?         ??      ??")

    @PostMapping("/places")

    public ResponseEntity<ApiResponse<String>> createMeetingPlace(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody MeetingPlaceDto dto) {

        return ResponseEntity.ok(ApiResponse.success(meetingService.createMeetingPlace(userDetails.getUsername(), dto)));

    }

@Operation(summary = "???   ????      ", description = "???   ???         ????      ??      ??")

    @PutMapping("/places/{mtgPlaceId}")

    public ResponseEntity<ApiResponse<Void>> updateMeetingPlace(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "???   ??ID") @PathVariable String mtgPlaceId,

            @RequestBody MeetingPlaceDto dto) {

        meetingService.updateMeetingPlace(mtgPlaceId, userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "???   ??????", description = "?     ?????   ??       ????         ???      ??")

    @DeleteMapping("/places/{mtgPlaceId}")

    public ResponseEntity<ApiResponse<Void>> deleteMeetingPlace(

            @Parameter(description = "???   ??ID") @PathVariable String mtgPlaceId) {

        meetingService.deleteMeetingPlace(mtgPlaceId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

    // --- Reservations ---

@Operation(summary = "???   ????                   ?         ??", description = "???   ????                   ????                  ??         ???      ??")

    @GetMapping("/reservations")

    public ResponseEntity<ApiResponse<Page<MeetingReservationDto>>> getMeetingReservations(

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingReservationList(searchWrd, pageable)));

    }

@Operation(summary = "???   ????       ?                   ??", description = "?     ????      ???          ?         ??         ???      ??")

    @GetMapping("/reservations/{resveId}")

    public ResponseEntity<ApiResponse<MeetingReservationDto>> getMeetingReservation(

            @Parameter(description = "??       ID") @PathVariable String resveId) {

        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingReservation(resveId)));

    }

@Operation(summary = "???   ????       ?         ", description = "?     ?????   ??       ??????      ???         ??      ??")

    @PostMapping("/reservations")

    public ResponseEntity<ApiResponse<String>> reserveMeetingPlace(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody MeetingReservationDto dto) {

        // Conflict check could be added here or in service

        return ResponseEntity.ok(ApiResponse.success(meetingService.reserveMeetingPlace(userDetails.getUsername(), dto)));

    }

@Operation(summary = "???   ????       ??      ", description = "         ????       ?         ????      ??      ??")

    @PutMapping("/reservations/{resveId}")

    public ResponseEntity<ApiResponse<Void>> updateMeetingReservation(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "??       ID") @PathVariable String resveId,

            @RequestBody MeetingReservationDto dto) {

        meetingService.updateMeetingReservation(resveId, userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "???   ????       ?      ??", description = "?     ????      ???      ??         ???      ??")

    @DeleteMapping("/reservations/{resveId}")

    public ResponseEntity<ApiResponse<Void>> cancelMeetingReservation(

            @Parameter(description = "??       ID") @PathVariable String resveId) {

        meetingService.cancelMeetingReservation(resveId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

