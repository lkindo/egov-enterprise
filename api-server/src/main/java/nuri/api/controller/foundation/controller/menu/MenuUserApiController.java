package nuri.api.controller.foundation.controller.menu;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.service.menu.MenuService;
import nuri.business.service.menu.dto.MenuDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/menus")
@RequiredArgsConstructor
@Tag(name = "Menu", description = "메뉴 정보 조회 API")
public class MenuUserApiController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MenuUserApiController.class);
    private final MenuService menuService;

    @Operation(summary = "GNB 메인 메뉴 목록 조회")
    @GetMapping("/head")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHeadMenu() {
        log.info("getHeadMenu called");
        List<MenuDto> resultList = menuService.getMenuHierarchy();
        log.info("getHeadMenu returned {} items", resultList.size());
        Map<String, Object> data = new HashMap<>();
        data.put("list", resultList);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @Operation(summary = "특정 메뉴의 하위 메뉴 목록 조회")
    @GetMapping("/left")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLeftMenu(
            @RequestParam("menuNo") Long menuNo) {
        log.info("getLeftMenu called with menuNo={}", menuNo);
        List<MenuDto> resultList = menuService.getSubMenus(menuNo);
        log.info("getLeftMenu returned {} items", resultList.size());
        Map<String, Object> data = new HashMap<>();
        data.put("list", resultList);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // [보안] 개발 중 임시 추가됐던 디버그 덤프(GET /test/raw, /test/programs)는 제거했다.
    // 권한 필터를 거치지 않는 getAllMenus()/getAllPrograms() 를 인증만 되면 노출해,
    // 비활성 메뉴와 관리자 전용 modernRoute 를 일반 사용자가 열거할 수 있는 정찰 창구였다.
    // 관리 목적의 전체 메뉴 조회는 /api/v1/admin/** (URL 시큐리티로 ADMIN 제한) 경로를 사용한다.
}
