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

@Operation(summary = "?         ?????            ?         ??", description = "?         ???         ??????            ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<RecomendSiteDto>>> getRecomendSites(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(recomendSiteService.getRecomendSiteList(keyword, pageable)));

    }

@Operation(summary = "?         ??????                   ??", description = "?     ???         ?????          ?          ?         ??         ???      ??")

    @GetMapping("/{recomendSiteId}")

    public ResponseEntity<ApiResponse<RecomendSiteDto>> getRecomendSite(

            @Parameter(description = "?         ?????ID") @PathVariable String recomendSiteId) {

        return ResponseEntity.ok(ApiResponse.success(recomendSiteService.getRecomendSite(recomendSiteId)));

    }

@Operation(summary = "?         ??????         ", description = "??      ???         ?????   ? ?         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> insertRecomendSite(

            @RequestBody RecomendSiteDto dto) {

        String id = recomendSiteService.createRecomendSite("ADMIN", dto);

        return ResponseEntity.ok(ApiResponse.success(id));

    }

@Operation(summary = "?         ???????      ", description = "         ???         ???????         ????      ??      ??")

    @PutMapping("/{recomendSiteId}")

    public ResponseEntity<ApiResponse<Void>> updateRecomendSite(

            @PathVariable String recomendSiteId,

            @RequestBody RecomendSiteDto dto) {

        recomendSiteService.updateRecomendSite(recomendSiteId, "ADMIN", dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "?         ?????????", description = "?     ???         ?????   ? ?????      ??")

    @DeleteMapping("/{recomendSiteId}")

    public ResponseEntity<ApiResponse<Void>> deleteRecomendSite(

            @PathVariable String recomendSiteId) {

        recomendSiteService.deleteRecomendSite(recomendSiteId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}
