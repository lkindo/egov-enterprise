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

@Operation(summary = "??     ??            ?         ??", description = "?         ????     ??            ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<EventInfoDto>>> getEvents(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEventList(keyword, pageable)));

    }

@Operation(summary = "??     ???                   ??", description = "?     ????     ?          ?          ?         ??         ???      ??")

    @GetMapping("/{eventId}")

    public ResponseEntity<ApiResponse<EventInfoDto>> getEvent(

            @Parameter(description = "??     ??ID") @PathVariable String eventId) {

        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getEvent(eventId)));

    }

@Operation(summary = "??     ???         ", description = "??      ????     ?   ? ?         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertEvent(

            @RequestBody EventInfoDto dto) {

        eventCmpgnService.insertEvent(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??     ????      ", description = "         ????     ???         ????      ??      ??")

    @PutMapping("/{eventId}")

    public ResponseEntity<ApiResponse<Void>> updateEvent(

            @PathVariable String eventId,

            @RequestBody EventInfoDto dto) {

        dto.setEventId(eventId);

        eventCmpgnService.updateEvent(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??     ??????", description = "?     ????     ?   ? ?????      ??")

    @DeleteMapping("/{eventId}")

    public ResponseEntity<ApiResponse<Void>> deleteEvent(

            @PathVariable String eventId) {

        eventCmpgnService.deleteEvent(eventId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

    // --- External HR ---

@Operation(summary = "?   ? ?                      ?         ??", description = "?     ????     ?          ?         ???   ? ?                      ??         ???      ??")

    @GetMapping("/{eventId}/hrs")

    public ResponseEntity<ApiResponse<Page<ExternalHrDto>>> getExternalHrs(

            @PathVariable String eventId,

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(eventCmpgnService.getExternalHrList(eventId, keyword, pageable)));

    }

@Operation(summary = "?   ? ?          ?         ", description = "??     ?                      ???   ? ?         ???         ??      ??")

    @PostMapping("/{eventId}/hrs")

    public ResponseEntity<ApiResponse<Void>> insertExternalHr(

            @PathVariable String eventId,

            @RequestBody ExternalHrDto dto) {

        dto.setEventId(eventId);

        eventCmpgnService.insertExternalHr(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "?   ? ?          ????", description = "?     ???   ? ?          ?         ???????      ??")

    @DeleteMapping("/hrs/{extrlHrId}")

    public ResponseEntity<ApiResponse<Void>> deleteExternalHr(

            @PathVariable String extrlHrId) {

        eventCmpgnService.deleteExternalHr(extrlHrId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

