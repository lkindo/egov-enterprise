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

@Tag(name = "Banner (User)", description = "배너 관�?API (?�용?�용)")
@RestController
@RequestMapping("/api/v1/banners")
@RequiredArgsConstructor
public class BannerController {

    private final EgovBannerService bannerService;

    @Operation(summary = "배너 목록 조회", description = "?�스?�에 ?�록??배너?�을 검??조건???�라 ?�이�?조회?�니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<BannerDto>>> getBanners(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getBannerList(keyword, pageable)));
    }

    @Operation(summary = "배너 ?�세 조회", description = "?�정 배너???�세 ?�보�?조회?�니??")
    @GetMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<BannerDto>> getBanner(
            @Parameter(description = "배너 ID") @PathVariable String bannerId) {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getBanner(bannerId)));
    }

    @Operation(summary = "배너 ?�록", description = "?�로??배너 ?�보�??�록?�니??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertBanner(@RequestBody BannerDto dto) {
        bannerService.insertBanner(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "배너 ?�보 ?�정", description = "기존 배너 ?�보�??�정?�니??")
    @PutMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<Void>> updateBanner(
            @PathVariable String bannerId,
            @RequestBody BannerDto dto) {
        dto.setBannerId(bannerId);
        bannerService.updateBanner(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "배너 ??��", description = "?�록??배너 ?�보�???��?�니??")
    @DeleteMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<Void>> deleteBanner(@PathVariable String bannerId) {
        bannerService.deleteBanner(bannerId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메인?�면 ?�출??배너 조회", description = "메인 ?�면???�출?�도�??�정??배너 목록??조회?�니??")
    @GetMapping("/reflected")
    public ResponseEntity<ApiResponse<List<BannerDto>>> getReflectedBanners() {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getReflectedBanners()));
    }
}
