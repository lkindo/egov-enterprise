package com.company.project.api.controller.news;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.news.NewsService;
import com.company.project.service.news.dto.NewsDto;
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

@Tag(name = "News", description = "?´ìŠ¤ ê´€ë¦?API")
@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    @Operation(summary = "?´ìŠ¤ ëª©ë¡ ì¡°íšŒ", description = "?±ë¡???´ìŠ¤ ëª©ë¡???˜ì´ì§•í•˜??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NewsDto>>> getNewsList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(newsService.getNewsList(searchWrd, pageable)));
    }

    @Operation(summary = "?´ìŠ¤ ?ì„¸ ì¡°íšŒ", description = "?´ìŠ¤???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{newsId}")
    public ResponseEntity<ApiResponse<NewsDto>> getNews(
            @Parameter(description = "?´ìŠ¤ ID") @PathVariable String newsId) {
        return ResponseEntity.ok(ApiResponse.success(newsService.getNews(newsId)));
    }

    @Operation(summary = "?´ìŠ¤ ?±ë¡", description = "?ˆë¡œ???´ìŠ¤ë¥??±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createNews(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody NewsDto newsDto) {
        return ResponseEntity.ok(ApiResponse.success(newsService.createNews(userDetails.getUsername(), newsDto)));
    }

    @Operation(summary = "?´ìŠ¤ ?•ë³´ ?˜ì •", description = "?±ë¡???´ìŠ¤???•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{newsId}")
    public ResponseEntity<ApiResponse<Void>> updateNews(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?´ìŠ¤ ID") @PathVariable String newsId,
            @RequestBody NewsDto newsDto) {
        newsService.updateNews(newsId, userDetails.getUsername(), newsDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?´ìŠ¤ ?? œ", description = "?±ë¡???´ìŠ¤ë¥??œìŠ¤?œì—???? œ?©ë‹ˆ??")
    @DeleteMapping("/{newsId}")
    public ResponseEntity<ApiResponse<Void>> deleteNews(
            @Parameter(description = "?´ìŠ¤ ID") @PathVariable String newsId) {
        newsService.deleteNews(newsId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
