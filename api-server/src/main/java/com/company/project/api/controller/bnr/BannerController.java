package com.company.project.api.controller.bnr;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.banner.EgovBannerService;

import com.company.project.service.banner.dto.BannerDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Banner", description = "Banner Management APIs")

@RestController

@RequestMapping("/api/v1/banners")

@RequiredArgsConstructor

public class BannerController {

    private final EgovBannerService bannerService;

@Operation(summary = "            ?            ?         ??", description = "?         ??            ?            ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<BannerDto>>> getBanners(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(bannerService.getBannerList(keyword, pageable)));

    }

@Operation(summary = "            ??                   ??", description = "?     ??            ???          ?         ??         ???      ??")

    @GetMapping("/{bannerId}")

    public ResponseEntity<ApiResponse<BannerDto>> getBanner(

            @Parameter(description = "            ?ID") @PathVariable String bannerId) {

        return ResponseEntity.ok(ApiResponse.success(bannerService.getBanner(bannerId)));

    }

@Operation(summary = "            ??         ", description = "??      ??                  ??         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertBanner(

            @RequestBody BannerDto dto) {

        bannerService.insertBanner(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "            ???      ", description = "         ??            ??         ????      ??      ??")

    @PutMapping("/{bannerId}")

    public ResponseEntity<ApiResponse<Void>> updateBanner(

            @PathVariable String bannerId,

            @RequestBody BannerDto dto) {

        dto.setBannerId(bannerId);

        bannerService.updateBanner(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "            ?????", description = "?     ??                  ??????      ??")

    @DeleteMapping("/{bannerId}")

    public ResponseEntity<ApiResponse<Void>> deleteBanner(

            @PathVariable String bannerId) {

        bannerService.deleteBanner(bannerId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ???            ?            ?         ??", description = "??       ?         ??         ??reflctAt='Y')??            ?            ???          ??      ??   ?         ???      ??")

    @GetMapping("/reflected")

    public ResponseEntity<ApiResponse<List<BannerDto>>> getReflectedBanners() {

        return ResponseEntity.ok(ApiResponse.success(bannerService.getReflectedBanners()));

    }

}

