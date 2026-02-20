package com.company.project.api.controller.survey;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.meeting.EgovMeetingService;

import com.company.project.service.meeting.dto.MeetingManageDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "MeetingManage", description = "Meeting Management APIs")

@RestController

@RequestMapping("/api/v1/meetings/manage")

@RequiredArgsConstructor

public class MeetingManageController {

    private final EgovMeetingService meetingService;

@Operation(summary = "???                ?         ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<MeetingManageDto>>> getMeetings(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeetingList(keyword, pageable)));

    }

@Operation(summary = "???    ?                   ??")

    @GetMapping("/{mtgId}")

    public ResponseEntity<ApiResponse<MeetingManageDto>> getMeeting(@PathVariable String mtgId) {

        return ResponseEntity.ok(ApiResponse.success(meetingService.getMeeting(mtgId)));

    }

@Operation(summary = "???    ?         ")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertMeeting(@RequestBody MeetingManageDto dto) {

        meetingService.insertMeeting(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "???    ??      ")

    @PutMapping("/{mtgId}")

    public ResponseEntity<ApiResponse<Void>> updateMeeting(@PathVariable String mtgId, @RequestBody MeetingManageDto dto) {

        dto.setMtgId(mtgId);

        meetingService.updateMeeting(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "???    ????")

    @DeleteMapping("/{mtgId}")

    public ResponseEntity<ApiResponse<Void>> deleteMeeting(@PathVariable String mtgId) {

        meetingService.deleteMeeting(mtgId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

