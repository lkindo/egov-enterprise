package nuri.business.api.controller.admin.content.banner;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.service.system.content.banner.EgovBannerService;
import nuri.foundation.service.system.content.banner.dto.BannerDto;
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

/**
 * 배너 관리 API 컨트롤러 (Admin)
 */
@Tag(name = "Banner", description = "배너 관리 API (Admin)")
@RestController("systemBannerApiController")
@RequestMapping("/api/v1/admin/system/banners")
@RequiredArgsConstructor
public class BannerApiController {

    private final EgovBannerService bannerService;

    @Operation(summary = "배너 목록 조회", description = "시스템에 등록된 배너들을 검색 조건에 따라 페이징 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<BannerDto>>> getBanners(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<BannerDto> pageResult = bannerService.getBannerList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "배너 상세 조회", description = "특정 배너의 상세 정보를 조회합니다.")
    @GetMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<BannerDto>> getBanner(
            @Parameter(description = "배너 ID") @PathVariable String bannerId) {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getBanner(bannerId)));
    }

    @Operation(summary = "배너 등록", description = "새로운 배너 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertBanner(@RequestBody BannerDto dto) {
        bannerService.insertBanner(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "배너 정보 수정", description = "기존 배너 정보를 수정합니다.")
    @PutMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<Void>> updateBanner(
            @PathVariable String bannerId,
            @RequestBody BannerDto dto) {
        dto.setBnrId(bannerId);
        bannerService.updateBanner(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "배너 삭제", description = "등록된 배너 정보를 삭제합니다.")
    @DeleteMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<Void>> deleteBanner(@PathVariable String bannerId) {
        bannerService.deleteBanner(bannerId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메인화면 호출용 배너 조회", description = "메인 화면에 노출하도록 설정된 배너 목록을 조회합니다.")
    @GetMapping("/reflected")
    public ResponseEntity<ApiResponse<List<BannerDto>>> getReflectedBanners() {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getReflectedBanners()));
    }
}
