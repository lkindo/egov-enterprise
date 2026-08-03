package nuri.api.controller.business.admin.content.banner;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.service.system.content.banner.BannerService;
import nuri.business.service.system.content.banner.dto.BannerDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 배너 사용자용 API 컨트롤러.
 * 메인 화면 노출 배너는 일반 사용자도 봐야 하므로, 관리자 전용(/api/v1/admin/system/banners)과 분리해
 * PopupUserApiController(/api/v1/popups)와 동일한 패턴으로 인증 사용자에게 노출한다.
 */
@Tag(name = "Banner User", description = "배너 사용자 API")
@RestController("systemBannerUserApiController")
@RequestMapping("/api/v1/banners")
@org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class BannerUserApiController {

    private final BannerService bannerService;

    @Operation(summary = "메인화면 노출 배너 조회", description = "메인 화면에 노출하도록 설정된 활성 배너 목록을 조회합니다.")
    @GetMapping("/reflected")
    public ResponseEntity<ApiResponse<List<BannerDto>>> getReflectedBanners() {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getReflectedBanners()));
    }
}
