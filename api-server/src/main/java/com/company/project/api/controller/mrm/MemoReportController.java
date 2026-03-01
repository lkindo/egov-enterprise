package com.company.project.api.controller.mrm;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.memoreport.EgovMemoReportService;

import com.company.project.service.memoreport.dto.MemoReportDto;

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

@Tag(name = "MemoReport", description = "Memo Report Management APIs")

@RestController

@RequestMapping("/api/v1/memo-reports")

@RequiredArgsConstructor

public class MemoReportController {

    private final EgovMemoReportService memoReportService;

@Operation(summary = "         ?      ?     ?            ?         ??", description = "         ?      ?     ?            ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<MemoReportDto>>> getMemoReports(

            @RequestParam(required = false) String searchKeyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(memoReportService.getMemoReportList(searchKeyword, pageable)));

    }

@Operation(summary = "??? ?         ??         ??            ?         ??", description = "??? ?         ??         ?      ?     ?            ??         ???      ??")

    @GetMapping("/my")

    public ResponseEntity<ApiResponse<Page<MemoReportDto>>> getMyReports(

            @AuthenticationPrincipal UserDetails userDetails,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(memoReportService.getMyReportList(userDetails.getUsername(), pageable)));

    }

@Operation(summary = "         ?          ??            ?         ??", description = "??         ?         ???         ?      ?     ?            ??         ???      ??")

    @GetMapping("/received")

    public ResponseEntity<ApiResponse<Page<MemoReportDto>>> getReceivedReports(

            @AuthenticationPrincipal UserDetails userDetails,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(memoReportService.getReceivedReportList(userDetails.getUsername(), pageable)));

    }

@Operation(summary = "         ?      ?     ??                   ??", description = "         ?      ?     ???          ??      ??         ???      ??")

    @GetMapping("/{reprtId}")

    public ResponseEntity<ApiResponse<MemoReportDto>> getMemoReport(

            @Parameter(description = "         ??ID") @PathVariable String reprtId) {

        // ?          ??       ??      ??       (??      ?   ?             ??

        memoReportService.readMemoReport(reprtId);

        return ResponseEntity.ok(ApiResponse.success(memoReportService.getMemoReport(reprtId)));

    }

@Operation(summary = "         ?      ?     ??         ", description = "??      ??         ?      ?          ??         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createMemoReport(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody MemoReportDto dto) {

        String reprtId = memoReportService.createMemoReport(userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(reprtId));

    }

@Operation(summary = "         ?      ?     ???      ", description = "?         ?   ?          ?      ?     ???      ????      ??      ??")

    @PutMapping("/{reprtId}")

    public ResponseEntity<ApiResponse<Void>> updateMemoReport(

            @AuthenticationPrincipal UserDetails userDetails,

            @PathVariable String reprtId,

            @RequestBody MemoReportDto dto) {

        memoReportService.updateMemoReport(reprtId, userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "        ??      ???         ", description = "         ????                           ????      ??????        ??      ?????         ??      ??")

    @PatchMapping("/{reprtId}/drct-matter")

    public ResponseEntity<ApiResponse<Void>> updateDrctMatter(

            @PathVariable String reprtId,

            @RequestBody String drctMatter) {

        memoReportService.updateDrctMatter(reprtId, drctMatter);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ?      ?     ?????", description = "         ?      ?          ??????      ??")

    @DeleteMapping("/{reprtId}")

    public ResponseEntity<ApiResponse<Void>> deleteMemoReport(

            @PathVariable String reprtId) {

        memoReportService.deleteMemoReport(reprtId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}
