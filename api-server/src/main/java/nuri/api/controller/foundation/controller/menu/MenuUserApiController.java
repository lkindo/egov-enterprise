package nuri.api.controller.foundation.controller.menu;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.domain.menu.Menu;
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

    @Operation(summary = "메뉴 목록 테스트 - Menu 엔티티 직접 반환")
    @GetMapping("/test/raw")
    public ResponseEntity<Map<String, Object>> getRawMenus() {
        log.info("getRawMenus called");
        try {
            List<Menu> menus = menuService.getAllMenusCached();
            log.info("getRawMenus returned {} items", menus.size());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("count", menus.size());
            result.put("menus", menus);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            throw new nuri.foundation.core.exception.BusinessException("처리 중 오류가 발생했습니다.", nuri.foundation.core.exception.ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "메뉴 목록 테스트 - Program 조회")
    @GetMapping("/test/programs")
    public ResponseEntity<Map<String, Object>> getPrograms() {
        log.info("getPrograms called");
        try {
            List<nuri.business.domain.program.Program> programs = menuService.getAllPrograms();
            log.info("getPrograms returned {} items", programs.size());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("count", programs.size());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            throw new nuri.foundation.core.exception.BusinessException("처리 중 오류가 발생했습니다.", nuri.foundation.core.exception.ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
