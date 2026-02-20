package com.company.project.api.controller.rsm;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.rsm.EgovRecentSrchwrdService;

import com.company.project.service.rsm.dto.RecentSrchwrdDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "RecentSrchwrd", description = "Recent Search Word Management APIs")

@RestController

@RequestMapping("/api/v1/recent-search-words")

@RequiredArgsConstructor

public class RecentSrchwrdController {

    private final EgovRecentSrchwrdService recentSrchwrdService;

@Operation(summary = "        ??       ?     ??            ?         ??", description = "         ??        ??       ?     ????                   ????                  ??         ???      ??")

    @GetMapping("/manages")

    public ResponseEntity<ApiResponse<Page<RecentSrchwrdDto>>> getRecentSrchwrdManages(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(recentSrchwrdService.getRecentSrchwrdManageList(keyword, pageable)));

    }

@Operation(summary = "        ??       ?     ???                   ??", description = "?     ??        ??       ?     ????      ???          ?         ??         ???      ??")

    @GetMapping("/manages/{manageId}")

    public ResponseEntity<ApiResponse<RecentSrchwrdDto>> getRecentSrchwrdManage(

            @Parameter(description = "?     ??ID") @PathVariable String manageId) {

        return ResponseEntity.ok(ApiResponse.success(recentSrchwrdService.getRecentSrchwrdManage(manageId)));

    }

@Operation(summary = "        ??       ?     ???         ", description = "??      ??         ??        ??       ?     ????      ???         ??      ??")

    @PostMapping("/manages")

    public ResponseEntity<ApiResponse<Void>> insertRecentSrchwrdManage(

            @RequestBody RecentSrchwrdDto dto) {

        recentSrchwrdService.insertRecentSrchwrdManage(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "        ??       ?     ????      ", description = "         ??         ??        ??       ?     ????      ????      ??      ??")

    @PutMapping("/manages/{manageId}")

    public ResponseEntity<ApiResponse<Void>> updateRecentSrchwrdManage(

            @PathVariable String manageId,

            @RequestBody RecentSrchwrdDto dto) {

        dto.setSrchwrdManageId(manageId);

        recentSrchwrdService.updateRecentSrchwrdManage(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "        ??       ?     ??????", description = "?     ??         ??        ??       ?     ????      ???????      ??")

    @DeleteMapping("/manages/{manageId}")

    public ResponseEntity<ApiResponse<Void>> deleteRecentSrchwrdManage(

            @PathVariable String manageId) {

        recentSrchwrdService.deleteRecentSrchwrdManage(manageId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "        ??       ??  ??            ?         ??", description = "?     ???     ????      ???                   ??        ??       ??  ??            ??         ???      ??")

    @GetMapping("/manages/{manageId}/words")

    public ResponseEntity<ApiResponse<Page<RecentSrchwrdDto>>> getRecentSrchwrdList(

            @PathVariable String manageId,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(recentSrchwrdService.getRecentSrchwrdList(manageId, pageable)));

    }

@Operation(summary = "         ??        ??       ?         ", description = "????   ?         ??       ??     ??         ??        ??       ??  ???       ?         ??      ??")

    @PostMapping("/manages/{manageId}/words")

    public ResponseEntity<ApiResponse<Void>> insertRecentSrchwrd(

            @PathVariable String manageId,

            @RequestParam String srchwrdNm) {

        recentSrchwrdService.insertRecentSrchwrd(manageId, srchwrdNm);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ??        ??       ????", description = "?     ??         ??        ??       ??  ????????      ??")

    @DeleteMapping("/words/{srchwrdId}")

    public ResponseEntity<ApiResponse<Void>> deleteRecentSrchwrd(

            @PathVariable String srchwrdId) {

        recentSrchwrdService.deleteRecentSrchwrd(srchwrdId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

