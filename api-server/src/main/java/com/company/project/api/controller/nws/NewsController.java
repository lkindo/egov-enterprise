package com.company.project.api.controller.nws;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.nws.NewsService;

import com.company.project.service.nws.dto.NewsDto;

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

@Tag(name = "News", description = "News Management APIs")

@RestController

@RequestMapping("/api/v1/news")

@RequiredArgsConstructor

public class NewsController {

    private final NewsService newsService;

@Operation(summary = "??                   ?         ??", description = "??                   ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<NewsDto>>> getNewsList(

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(newsService.getNewsList(searchWrd, pageable)));

    }

@Operation(summary = "??       ?                   ??", description = "?     ????      ???          ?         ??         ???      ??")

    @GetMapping("/{newsId}")

    public ResponseEntity<ApiResponse<NewsDto>> getNews(

            @Parameter(description = "??       ID") @PathVariable String newsId) {

        return ResponseEntity.ok(ApiResponse.success(newsService.getNews(newsId)));

    }

@Operation(summary = "??       ?         ", description = "??      ????      ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createNews(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody NewsDto newsDto) {

        return ResponseEntity.ok(ApiResponse.success(newsService.createNews(userDetails.getUsername(), newsDto)));

    }

@Operation(summary = "??       ??      ", description = "         ????       ?         ????      ??      ??")

    @PutMapping("/{newsId}")

    public ResponseEntity<ApiResponse<Void>> updateNews(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "??       ID") @PathVariable String newsId,

            @RequestBody NewsDto newsDto) {

        newsService.updateNews(newsId, userDetails.getUsername(), newsDto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??       ????", description = "?     ????      ??????         ???      ??")

    @DeleteMapping("/{newsId}")

    public ResponseEntity<ApiResponse<Void>> deleteNews(

            @Parameter(description = "??       ID") @PathVariable String newsId) {

        newsService.deleteNews(newsId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

