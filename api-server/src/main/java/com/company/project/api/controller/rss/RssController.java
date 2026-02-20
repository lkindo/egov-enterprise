package com.company.project.api.controller.rss;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.rss.EgovRssService;

import com.company.project.service.rss.dto.RssDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Rss", description = "RSS Feed Management APIs")

@RestController

@RequestMapping("/api/v1/rss")

@RequiredArgsConstructor

public class RssController {

    private final EgovRssService rssService;

@Operation(summary = "RSS             ?         ??", description = "?         ??RSS ??                   ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<RssDto>>> getRssList(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(rssService.getRssList(keyword, pageable)));

    }

@Operation(summary = "RSS ?                   ??", description = "?     ??RSS ??      ???          ?         ??         ???      ??")

    @GetMapping("/{rssId}")

    public ResponseEntity<ApiResponse<RssDto>> getRss(

            @Parameter(description = "RSS ID") @PathVariable String rssId) {

        return ResponseEntity.ok(ApiResponse.success(rssService.getRss(rssId)));

    }

@Operation(summary = "RSS ??       ?         ", description = "??      ??RSS ??       ??      ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertRss(

            @RequestBody RssDto dto) {

        rssService.registerRss(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "RSS ??       ??      ", description = "         ??RSS ??       ??      ????      ??      ??")

    @PutMapping("/{rssId}")

    public ResponseEntity<ApiResponse<Void>> updateRss(

            @PathVariable String rssId,

            @RequestBody RssDto dto) {

        dto.setRssId(rssId);

        rssService.updateRss(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "RSS ??       ????", description = "?     ??RSS ??       ??      ???????      ??")

    @DeleteMapping("/{rssId}")

    public ResponseEntity<ApiResponse<Void>> deleteRss(

            @PathVariable String rssId) {

        rssService.deleteRss(rssId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

