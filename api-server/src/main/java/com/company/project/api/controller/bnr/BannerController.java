package com.company.project.api.controller.bnr;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.bnr.BannerService;
import com.company.project.service.bnr.dto.BannerDto;
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

import java.util.List;

@Tag(name = "Banner", description = "Banner Management APIs")
@RestController
@RequestMapping("/api/v1/banners")
@RequiredArgsConstructor
public class BannerController {

    private final BannerService bannerService;

    @Operation(summary = "배너 목록 조회", description = "배너 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<BannerDto>>> getBanners(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getBannerList(searchWrd, pageable)));
    }

    @Operation(summary = "활성 배너 목록 조회", description = "메인 화면 등에 표시될 활성 배너 목록을 조회합니다.")
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<BannerDto>>> getActiveBanners() {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getActiveBanners()));
    }

    @Operation(summary = "배너 상세 조회", description = "특정 배너의 상세 정보를 조회합니다.")
    @GetMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<BannerDto>> getBanner(
            @Parameter(description = "배너 ID") @PathVariable String bannerId) {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getBanner(bannerId)));
    }

    @Operation(summary = "배너 등록", description = "새로운 배너를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createBanner(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody BannerDto bannerDto) {
        return ResponseEntity.ok(ApiResponse.success(bannerService.createBanner(userDetails.getUsername(), bannerDto)));
    }

    @Operation(summary = "배너 수정", description = "기존 배너 정보를 수정합니다.")
    @PutMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<Void>> updateBanner(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "배너 ID") @PathVariable String bannerId,
            @RequestBody BannerDto bannerDto) {
        bannerService.updateBanner(bannerId, userDetails.getUsername(), bannerDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "배너 삭제", description = "특정 배너를 삭제 처리합니다.")
    @DeleteMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<Void>> deleteBanner(
            @Parameter(description = "배너 ID") @PathVariable String bannerId) {
        bannerService.deleteBanner(bannerId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
