package nuri.api.controller.foundation.controller.menu;

import nuri.api.controller.foundation.controller.menu.dto.MenuListResponse;
import nuri.foundation.core.response.ApiResponse;
import nuri.business.security.annotation.LoginUser;
import nuri.business.service.menu.MenuBookmarkService;
import nuri.business.service.menu.MenuService;
import nuri.business.service.menu.dto.MenuBookmarkDto;
import nuri.business.service.menu.dto.MenuDto;
import nuri.foundation.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/v1/menus")
@RequiredArgsConstructor
@Tag(name = "Menu", description = "메뉴 정보 조회 API")
public class MenuUserApiController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MenuUserApiController.class);
    private final MenuService menuService;
    private final MenuBookmarkService menuBookmarkService;

    @Operation(summary = "GNB 메인 메뉴 목록 조회")
    @GetMapping("/head")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.menu.MenuUserApiController#getHeadMenu')")
    public ResponseEntity<ApiResponse<MenuListResponse>> getHeadMenu() {
        log.info("getHeadMenu called");
        List<MenuDto> resultList = menuService.getMenuHierarchy();
        log.info("getHeadMenu returned {} items", resultList.size());
        return ResponseEntity.ok(ApiResponse.success(MenuListResponse.of(resultList)));
    }

    @Operation(summary = "특정 메뉴의 하위 메뉴 목록 조회")
    @GetMapping("/left")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.menu.MenuUserApiController#getLeftMenu')")
    public ResponseEntity<ApiResponse<MenuListResponse>> getLeftMenu(
            @RequestParam("menuNo") Long menuNo) {
        log.info("getLeftMenu called with menuNo={}", menuNo);
        List<MenuDto> resultList = menuService.getSubMenus(menuNo);
        log.info("getLeftMenu returned {} items", resultList.size());
        return ResponseEntity.ok(ApiResponse.success(MenuListResponse.of(resultList)));
    }

    // [2026-09-26 DIP B5 F2] 내 메뉴 즐겨찾기. 대상은 인증 주체(esntlId)로 고정하고 다른 사람을 고르는 입력은 없다.
    @Operation(summary = "내 메뉴 즐겨찾기 목록", description = "지금 볼 수 있는 메뉴 가운데 즐겨찾기한 것을 즐겨찾기한 순서로 돌려줍니다.")
    @GetMapping("/bookmarks")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.menu.MenuUserApiController#getMyBookmarks')")
    public ResponseEntity<ApiResponse<List<MenuBookmarkDto>>> getMyBookmarks(
            @LoginUser CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(menuBookmarkService.getMyBookmarks(userDetails.getUsername())));
    }

    @Operation(summary = "메뉴 즐겨찾기 추가", description = "지금 볼 수 있는 메뉴를 내 즐겨찾기에 더합니다. 이미 있으면 그대로 둡니다. 30개를 넘으면 409 입니다.")
    @PutMapping("/bookmarks/{menuNo}")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.menu.MenuUserApiController#addBookmark')")
    public ResponseEntity<ApiResponse<Void>> addBookmark(
            @PathVariable Long menuNo,
            @LoginUser CustomUserDetails userDetails) {
        menuBookmarkService.addBookmark(userDetails.getUsername(), menuNo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메뉴 즐겨찾기 빼기", description = "내 즐겨찾기에서 메뉴를 뺍니다. 없으면 아무 일도 하지 않습니다.")
    @DeleteMapping("/bookmarks/{menuNo}")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.menu.MenuUserApiController#removeBookmark')")
    public ResponseEntity<ApiResponse<Void>> removeBookmark(
            @PathVariable Long menuNo,
            @LoginUser CustomUserDetails userDetails) {
        menuBookmarkService.removeBookmark(userDetails.getUsername(), menuNo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // [보안] 개발 중 임시 추가됐던 디버그 덤프(GET /test/raw, /test/programs)는 제거했다.
    // 권한 필터를 거치지 않는 getAllMenus()/getAllPrograms() 를 인증만 되면 노출해,
    // 비활성 메뉴와 관리자 전용 modernRoute 를 일반 사용자가 열거할 수 있는 정찰 창구였다.
    // 관리 목적의 전체 메뉴 조회는 /api/v1/admin/** (URL 시큐리티로 ADMIN 제한) 경로를 사용한다.
}
