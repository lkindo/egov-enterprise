package nuri.api.controller.foundation.controller.system;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.auth.AuthorManageService;
import nuri.business.service.auth.dto.AuthorManageDto;
import nuri.business.service.menu.MenuService;
import nuri.business.service.menu.dto.MenuCreateDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.data.domain.Page;

/**
 * 시스템 권한 그룹(Author) 관리 API 컨트롤러
 */
@Tag(name = "Authority Management", description = "시스템 권한 그룹 관리 API (Admin)")
@Slf4j
@RestController("systemAuthorApiController")
@RequestMapping("/api/v1/admin/system/authorities")
@RequiredArgsConstructor
public class AuthorApiController {

    private final AuthorManageService authorManageService;
    private final MenuService menuService;

    @Operation(summary = "권한 그룹 목록 조회", description = "시스템에 정의된 권한 그룹(Author) 목록을 조회합니다.")
    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorApiController#getAuthors')")
    public ResponseEntity<ApiResponse<PageResponse<AuthorManageDto>>> getAuthors(
            @Valid @ModelAttribute BaseSearchDto searchDto) {
        log.debug(">>> [AuthorApiController] getAuthors requested");

        // 목록과 총건수를 한 질의에서 얻는다. 종전에는 총건수가 검색을 무시한 전체 count() 였다.
        Page<AuthorManageDto> page = authorManageService.selectAuthorList(searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                page
        )));
    }

    @Operation(summary = "권한 그룹 상세 조회", description = "특정 권한 그룹의 상세 정보를 조회합니다.")
    @GetMapping("/{authrtCd}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorApiController#getAuthor')")
    public ResponseEntity<ApiResponse<AuthorManageDto>> getAuthor(@PathVariable String authrtCd) {
        return ResponseEntity.ok(ApiResponse.success(authorManageService.selectAuthor(authrtCd)));
    }

    @Operation(summary = "권한별 메뉴 목록 조회", description = "특정 권한 그룹의 접근 가능한 메뉴 목록을 조회합니다.")
    @GetMapping("/{authrtCd}/menus")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorApiController#getAuthorMenus')")
    public ResponseEntity<ApiResponse<List<MenuCreateDto>>> getAuthorMenus(
            @PathVariable String authrtCd) {
        log.debug(">>> [AuthorApiController] getAuthorMenus requested");

        MenuCreateDto vo = new MenuCreateDto();
        vo.setAuthrtCd(authrtCd);

        List<MenuCreateDto> list = menuService.selectMenuCreatList(vo);

        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
