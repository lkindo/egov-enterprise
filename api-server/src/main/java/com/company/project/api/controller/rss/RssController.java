package com.company.project.api.controller.rss;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.rss.RssService;
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

@Tag(name = "Rss", description = "RSS 관리 API")
@RestController
@RequestMapping("/api/v1/admin/system/rss")
@RequiredArgsConstructor
public class RssController {

    private final RssService rssService;

    @Operation(summary = "RSS 목록 조회", description = "RSS 피드 정보 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<RssDto>>> getRssList(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(rssService.getRssList(keyword, pageable)));
    }

    @Operation(summary = "RSS 상세 조회", description = "RSS 피드 상세 정보를 조회합니다.")
    @GetMapping("/{rssId}")
    public ResponseEntity<ApiResponse<RssDto>> getRss(
            @Parameter(description = "RSS ID") @PathVariable String rssId) {
        return ResponseEntity.ok(ApiResponse.success(rssService.getRss(rssId)));
    }

    @Operation(summary = "RSS 정보 등록", description = "새로운 RSS 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertRss(
            @RequestBody RssDto dto) {
        rssService.registerRss(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "RSS 정보 수정", description = "기존 RSS 정보를 수정합니다.")
    @PutMapping("/{rssId}")
    public ResponseEntity<ApiResponse<Void>> updateRss(
            @PathVariable String rssId,
            @RequestBody RssDto dto) {
        dto.setRssId(rssId);
        rssService.updateRss(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "RSS 정보 삭제", description = "지정된 RSS 정보를 삭제합니다.")
    @DeleteMapping("/{rssId}")
    public ResponseEntity<ApiResponse<Void>> deleteRss(
            @PathVariable String rssId) {
        rssService.deleteRss(rssId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}