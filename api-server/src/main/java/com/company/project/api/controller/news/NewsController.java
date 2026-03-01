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

@Tag(name = "News", description = "?�스 관�?API")
@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    @Operation(summary = "?�스 목록 조회", description = "?�록???�스 목록???�이징하??조회?�니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NewsDto>>> getNewsList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(newsService.getNewsList(searchWrd, pageable)));
    }

    @Operation(summary = "?�스 ?�세 조회", description = "?�스???�세 ?�보�?조회?�니??")
    @GetMapping("/{newsId}")
    public ResponseEntity<ApiResponse<NewsDto>> getNews(
            @Parameter(description = "?�스 ID") @PathVariable String newsId) {
        return ResponseEntity.ok(ApiResponse.success(newsService.getNews(newsId)));
    }

    @Operation(summary = "?�스 ?�록", description = "?�로???�스�??�록?�니??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createNews(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody NewsDto newsDto) {
        return ResponseEntity.ok(ApiResponse.success(newsService.createNews(userDetails.getUsername(), newsDto)));
    }

    @Operation(summary = "?�스 ?�보 ?�정", description = "?�록???�스???�보�??�정?�니??")
    @PutMapping("/{newsId}")
    public ResponseEntity<ApiResponse<Void>> updateNews(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?�스 ID") @PathVariable String newsId,
            @RequestBody NewsDto newsDto) {
        newsService.updateNews(newsId, userDetails.getUsername(), newsDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?�스 ??��", description = "?�록???�스�??�스?�에????��?�니??")
    @DeleteMapping("/{newsId}")
    public ResponseEntity<ApiResponse<Void>> deleteNews(
            @Parameter(description = "?�스 ID") @PathVariable String newsId) {
        newsService.deleteNews(newsId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
