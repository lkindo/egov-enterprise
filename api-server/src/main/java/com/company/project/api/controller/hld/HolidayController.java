package com.company.project.api.controller.hld;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.hld.HolidayService;

import com.company.project.service.hld.dto.HolidayDto;

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

import java.util.List;

@Tag(name = "Holiday", description = "Holiday Management APIs")

@RestController

@RequestMapping("/api/v1/holidays")

@RequiredArgsConstructor

public class HolidayController {

    private final HolidayService holidayService;

@Operation(summary = "??                   ?         ??", description = "??                   ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<HolidayDto>>> getHolidays(

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(holidayService.getHolidayList(searchWrd, pageable)));

    }

@Operation(summary = "?        ???                ??", description = "?     ???         ????                   ??         ???      ??")

    @GetMapping("/calendar")

    public ResponseEntity<ApiResponse<List<HolidayDto>>> getHolidaysByMonth(

            @RequestParam String year,

            @RequestParam String month) {

        return ResponseEntity.ok(ApiResponse.success(holidayService.getHolidaysByYearMonth(year, month)));

    }

@Operation(summary = "??       ?                   ??", description = "?     ????      ???          ?         ??         ???      ??")

    @GetMapping("/{restdeNo}")

    public ResponseEntity<ApiResponse<HolidayDto>> getHoliday(

            @Parameter(description = "??                ??") @PathVariable Integer restdeNo) {

        return ResponseEntity.ok(ApiResponse.success(holidayService.getHoliday(restdeNo)));

    }

@Operation(summary = "??       ?         ", description = "??      ????      ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Integer>> createHoliday(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody HolidayDto holidayDto) {

        return ResponseEntity.ok(ApiResponse.success(holidayService.createHoliday(userDetails.getUsername(), holidayDto)));

    }

@Operation(summary = "??       ??      ", description = "         ????       ?         ????      ??      ??")

    @PutMapping("/{restdeNo}")

    public ResponseEntity<ApiResponse<Void>> updateHoliday(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "??                ??") @PathVariable Integer restdeNo,

            @RequestBody HolidayDto holidayDto) {

        holidayService.updateHoliday(restdeNo, userDetails.getUsername(), holidayDto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??       ????", description = "?     ????      ??????         ???      ??")

    @DeleteMapping("/{restdeNo}")

    public ResponseEntity<ApiResponse<Void>> deleteHoliday(

            @Parameter(description = "??                ??") @PathVariable Integer restdeNo) {

        holidayService.deleteHoliday(restdeNo);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}
