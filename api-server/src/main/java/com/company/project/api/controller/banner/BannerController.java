package com.company.project.api.controller.banner;

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

@Tag(name = "Banner (User)", description = "ë°°ë„ˆ ê´€ë¦?API (?¬ìš©?ìš©)")
@RestController
@RequestMapping("/api/v1/banners")
@RequiredArgsConstructor
public class BannerController {

    private final EgovBannerService bannerService;

    @Operation(summary = "ë°°ë„ˆ ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤?œì— ?±ë¡??ë°°ë„ˆ?¤ì„ ê²€??ì¡°ê±´???°ë¼ ?˜ì´ì§?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<BannerDto>>> getBanners(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getBannerList(keyword, pageable)));
    }

    @Operation(summary = "ë°°ë„ˆ ?ì„¸ ì¡°íšŒ", description = "?¹ì • ë°°ë„ˆ???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<BannerDto>> getBanner(
            @Parameter(description = "ë°°ë„ˆ ID") @PathVariable String bannerId) {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getBanner(bannerId)));
    }

    @Operation(summary = "ë°°ë„ˆ ?±ë¡", description = "?ˆë¡œ??ë°°ë„ˆ ?•ë³´ë¥??±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertBanner(@RequestBody BannerDto dto) {
        bannerService.insertBanner(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ë°°ë„ˆ ?•ë³´ ?˜ì •", description = "ê¸°ì¡´ ë°°ë„ˆ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<Void>> updateBanner(
            @PathVariable String bannerId,
            @RequestBody BannerDto dto) {
        dto.setBannerId(bannerId);
        bannerService.updateBanner(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ë°°ë„ˆ ?? œ", description = "?±ë¡??ë°°ë„ˆ ?•ë³´ë¥??? œ?©ë‹ˆ??")
    @DeleteMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<Void>> deleteBanner(@PathVariable String bannerId) {
        bannerService.deleteBanner(bannerId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ë©”ì¸?”ë©´ ?œì¶œ??ë°°ë„ˆ ì¡°íšŒ", description = "ë©”ì¸ ?”ë©´???¸ì¶œ?˜ë„ë¡??¤ì •??ë°°ë„ˆ ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/reflected")
    public ResponseEntity<ApiResponse<List<BannerDto>>> getReflectedBanners() {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getReflectedBanners()));
    }
}
