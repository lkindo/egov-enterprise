package nuri.foundation.api.controller.system;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.service.menu.MenuService;
import nuri.foundation.service.menu.dto.MenuCreateDto;
import nuri.foundation.service.menu.dto.MenuDto;
import egovframework.com.cmm.ComDefaultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 메뉴 및 권한별 메뉴 관리를 위한 REST 컨트롤러 (Admin)
 */
@Tag(name = "MenuAdmin", description = "시스템 메뉴 관리 API (Admin)")
@RestController("systemMenuApiController")
@RequestMapping("/api/v1/admin/system/menus")
@RequiredArgsConstructor
public class MenuApiController {

    private final MenuService menuService;

    @Operation(summary = "메뉴 목록 조회", description = "시스템 전체 메뉴 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<MenuDto>>> getMenuList(
            @RequestParam(required = false) String searchWrd,
            Pageable pageable) throws Exception {

        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchKeyword(searchWrd);
        searchVO.setFirstIndex((int) pageable.getOffset());
        searchVO.setRecordCountPerPage(pageable.getPageSize());

        List<MenuDto> list = menuService.selectMenuManageList(searchVO);
        int total = menuService.selectMenuManageListTotCnt(searchVO);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, pageable.getPageNumber() + 1, pageable.getPageSize(), total)));
    }

    @Operation(summary = "메뉴 전체 트리 조회", description = "시스템 메뉴를 트리 구조 구성을 위한 전체 목록으로 조회합니다.")
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<MenuDto>>> getAllMenus() throws Exception {
        return ResponseEntity.ok(ApiResponse.success(menuService.getAllMenus()));
    }

    @Operation(summary = "메뉴 상세 조회", description = "특정 메뉴의 상세 정보를 조회합니다.")
    @GetMapping("/{menuNo}")
    public ResponseEntity<ApiResponse<MenuDto>> getMenu(@PathVariable Long menuNo) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(menuService.selectMenuManage(menuNo)));
    }

    @Operation(summary = "메뉴 등록", description = "새로운 시스템 메뉴를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createMenu(@RequestBody MenuDto dto) throws Exception {
        menuService.insertMenuManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메뉴 정보 수정", description = "기존 시스템 메뉴 정보를 수정합니다.")
    @PutMapping("/{menuNo}")
    public ResponseEntity<ApiResponse<Void>> updateMenu(@PathVariable Long menuNo, @RequestBody MenuDto dto)
            throws Exception {
        dto.setMenuNo(menuNo);
        menuService.updateMenuManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메뉴 순서 일괄 변경", description = "여러 메뉴의 순서를 일괄적으로 업데이트합니다.")
    @PutMapping("/batch-order")
    public ResponseEntity<ApiResponse<Void>> updateMenuOrder(@RequestBody List<MenuDto> menuList) throws Exception {
        for (MenuDto dto : menuList) {
            menuService.updateMenuManage(dto);
        }
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메뉴 삭제", description = "시스템 메뉴를 삭제합니다.")
    @DeleteMapping("/{menuNo}")
    public ResponseEntity<ApiResponse<Void>> deleteMenu(@PathVariable Long menuNo) throws Exception {
        MenuDto dto = MenuDto.builder().menuNo(menuNo).build();
        menuService.deleteMenuManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메뉴 생성 관리 목록 조회", description = "권한별 메뉴 생성 관리 목록을 조회합니다.")
    @GetMapping("/creation-manage")
    public ResponseEntity<ApiResponse<PageResponse<MenuCreateDto>>> getMenuCreationManageList(
            @RequestParam(required = false) String searchWrd,
            Pageable pageable) throws Exception {
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchKeyword(searchWrd);
        searchVO.setFirstIndex((int) pageable.getOffset());
        searchVO.setRecordCountPerPage(pageable.getPageSize());
        
        List<MenuCreateDto> list = menuService.selectMenuCreatManagList(searchVO);
        int total = menuService.selectMenuCreatManagTotCnt(searchVO);
        
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, pageable.getPageNumber() + 1, pageable.getPageSize(), total)));
    }

    @Operation(summary = "권한별 메뉴 목록 조회", description = "특정 권한에 할당된 메뉴 목록 및 상태를 조회합니다.")
    @GetMapping("/creation/{authorCode}")
    public ResponseEntity<ApiResponse<List<MenuCreateDto>>> getMenuCreationList(@PathVariable String authorCode) throws Exception {
        MenuCreateDto vo = MenuCreateDto.builder().authorCode(authorCode).build();
        List<MenuCreateDto> result = menuService.selectMenuCreatList(vo);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "권한별 메뉴 할당 저장", description = "특정 권한에 메뉴들을 할당하거나 해제합니다.")
    @PostMapping("/creation/{authorCode}")
    public ResponseEntity<ApiResponse<Void>> createMenuCreation(
            @PathVariable String authorCode,
            @RequestBody List<Long> menuNos) throws Exception {
        String checkedMenuNoForInsert = menuNos.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(","));
        menuService.insertMenuCreatList(authorCode, checkedMenuNoForInsert);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
