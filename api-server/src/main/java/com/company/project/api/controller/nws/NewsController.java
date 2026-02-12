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

    @Operation(summary = "뉴스 목록 조회", description = "뉴스 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NewsDto>>> getNewsList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(newsService.getNewsList(searchWrd, pageable)));
    }

    @Operation(summary = "뉴스 상세 조회", description = "특정 뉴스의 상세 정보를 조회합니다.")
    @GetMapping("/{newsId}")
    public ResponseEntity<ApiResponse<NewsDto>> getNews(
            @Parameter(description = "뉴스 ID") @PathVariable String newsId) {
        return ResponseEntity.ok(ApiResponse.success(newsService.getNews(newsId)));
    }

    @Operation(summary = "뉴스 등록", description = "새로운 뉴스를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createNews(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody NewsDto newsDto) {
        return ResponseEntity.ok(ApiResponse.success(newsService.createNews(userDetails.getUsername(), newsDto)));
    }

    @Operation(summary = "뉴스 수정", description = "기존 뉴스 정보를 수정합니다.")
    @PutMapping("/{newsId}")
    public ResponseEntity<ApiResponse<Void>> updateNews(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "뉴스 ID") @PathVariable String newsId,
            @RequestBody NewsDto newsDto) {
        newsService.updateNews(newsId, userDetails.getUsername(), newsDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "뉴스 삭제", description = "특정 뉴스를 삭제 처리합니다.")
    @DeleteMapping("/{newsId}")
    public ResponseEntity<ApiResponse<Void>> deleteNews(
            @Parameter(description = "뉴스 ID") @PathVariable String newsId) {
        newsService.deleteNews(newsId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
