package com.company.project.api.controller.rec;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.recomendsite.EgovRecomendSiteService;
import com.company.project.service.recomendsite.dto.RecomendSiteDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "RecomendSite", description = "Recommended Site Management APIs")
@RestController
@RequestMapping("/api/v1/recomend-sites")
@RequiredArgsConstructor
public class RecomendSiteController {

    private final EgovRecomendSiteService recomendSiteService;

    @Operation(summary = "추천사이트 목록 조회", description = "등록된 추천 사이트 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<RecomendSiteDto>>> getRecomendSites(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(recomendSiteService.getRecomendSiteList(keyword, pageable)));
    }

    @Operation(summary = "추천사이트 상세 조회", description = "특정 추천 사이트의 상세 정보를 조회합니다.")
    @GetMapping("/{recomendSiteId}")
    public ResponseEntity<ApiResponse<RecomendSiteDto>> getRecomendSite(
            @Parameter(description = "추천사이트 ID") @PathVariable String recomendSiteId) {
        return ResponseEntity.ok(ApiResponse.success(recomendSiteService.getRecomendSite(recomendSiteId)));
    }

    @Operation(summary = "추천사이트 등록", description = "새로운 추천 사이트를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> insertRecomendSite(
            @RequestBody RecomendSiteDto dto) {
        String id = recomendSiteService.createRecomendSite("ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "추천사이트 수정", description = "기존 추천 사이트 정보를 수정합니다.")
    @PutMapping("/{recomendSiteId}")
    public ResponseEntity<ApiResponse<Void>> updateRecomendSite(
            @PathVariable String recomendSiteId,
            @RequestBody RecomendSiteDto dto) {
        recomendSiteService.updateRecomendSite(recomendSiteId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "추천사이트 삭제", description = "특정 추천 사이트를 삭제합니다.")
    @DeleteMapping("/{recomendSiteId}")
    public ResponseEntity<ApiResponse<Void>> deleteRecomendSite(
            @PathVariable String recomendSiteId) {
        recomendSiteService.deleteRecomendSite(recomendSiteId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
