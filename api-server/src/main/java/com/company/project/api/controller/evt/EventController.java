package com.company.project.api.controller.evt;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.evt.EventService;

import com.company.project.service.evt.dto.EventAttendanceDto;

import com.company.project.service.evt.dto.EventDto;

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

@Tag(name = "Event", description = "Event Management and Attendance APIs")

@RestController

@RequestMapping("/api/v1/events")

@RequiredArgsConstructor

public class EventController {

    private final EventService eventService;

@Operation(summary = "??                   ?         ??", description = "?         ????                   ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<EventDto>>> getEvents(

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(eventService.getEventList(searchWrd, pageable)));

    }

@Operation(summary = "??       ?                   ??", description = "?     ????      ???          ?         ??         ???      ??")

    @GetMapping("/{eventId}")

    public ResponseEntity<ApiResponse<EventDto>> getEvent(

            @Parameter(description = "??       ID") @PathVariable String eventId) {

        return ResponseEntity.ok(ApiResponse.success(eventService.getEvent(eventId)));

    }

@Operation(summary = "??       ?         ", description = "??      ????      ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createEvent(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody EventDto eventDto) {

        return ResponseEntity.ok(ApiResponse.success(eventService.createEvent(userDetails.getUsername(), eventDto)));

    }

@Operation(summary = "??       ??      ", description = "         ????       ?         ????      ??      ??")

    @PutMapping("/{eventId}")

    public ResponseEntity<ApiResponse<Void>> updateEvent(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "??       ID") @PathVariable String eventId,

            @RequestBody EventDto eventDto) {

        eventService.updateEvent(eventId, userDetails.getUsername(), eventDto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??       ????", description = "?     ????      ??????         ???      ??")

    @DeleteMapping("/{eventId}")

    public ResponseEntity<ApiResponse<Void>> deleteEvent(

            @Parameter(description = "??       ID") @PathVariable String eventId) {

        eventService.deleteEvent(eventId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

    // --- Attendance ---

@Operation(summary = "??                   ??                      ?         ??", description = "?     ????      ??            ??                      ??         ???      ??")

    @GetMapping("/{eventId}/attendance")

    public ResponseEntity<ApiResponse<Page<EventAttendanceDto>>> getAttendanceList(

            @Parameter(description = "??       ID") @PathVariable String eventId,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(eventService.getAttendanceList(eventId, pageable)));

    }

@Operation(summary = "??                   ??         ", description = "?     ????      ??            ???         ??      ??")

    @PostMapping("/{eventId}/attendance")

    public ResponseEntity<ApiResponse<Void>> applyAttendance(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "??       ID") @PathVariable String eventId,

            @RequestBody EventAttendanceDto dto) {

        dto.setEventId(eventId);

        eventService.applyAttendance(userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??                   ??     ??         ??", description = "??                   ??         ???     ???      ??         ???      ??")

    @PutMapping("/{eventId}/attendance/{applcntId}/approval")

    public ResponseEntity<ApiResponse<Void>> approveAttendance(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "??       ID") @PathVariable String eventId,

            @Parameter(description = "?         ??ID") @PathVariable String applcntId,

            @RequestParam String confmAt,

            @RequestParam(required = false) String returnResn) {

        eventService.approveAttendance(eventId, applcntId, userDetails.getUsername(), confmAt, returnResn);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

