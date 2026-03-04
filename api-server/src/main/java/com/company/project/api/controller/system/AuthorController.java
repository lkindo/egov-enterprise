package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.auth.AuthorManageService;
import com.company.project.service.auth.dto.AuthorManageDto;
import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import egovframework.com.cmm.ComDefaultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController("systemAuthorController")
@RequestMapping("/api/v1/admin/system/authorities")
@RequiredArgsConstructor
@Tag(name = "Authority (Admin)", description = "?스??권한 그룹 관?API (관리자??")
public class AuthorController {

    private final AuthorManageService authorManageService;
    private final MenuService menuService;

    @Operation(summary = "권한 그룹 목록 조회", description = "?스?에 ?의??권한 그룹(Author) 목록??조회?니??")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AuthorManageDto>>> getAuthors(
            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex,
            @RequestParam(value = "searchKeyword", defaultValue = "") String searchKeyword) {

        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(pageIndex);
        searchVO.setSearchKeyword(searchKeyword);
        searchVO.setPageUnit(10);

        List<AuthorManageDto> list = authorManageService.selectAuthorList(searchVO);
        int total = authorManageService.selectAuthorListTotCnt(searchVO);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, pageIndex, 10, total)));
    }

    @Operation(summary = "권한 그룹 ?세 조회", description = "?정 권한 그룹???세 ?보?조회?니??")
    @GetMapping("/{authorCode}")
    public ResponseEntity<ApiResponse<AuthorManageDto>> getAuthor(@PathVariable String authorCode) {
        return ResponseEntity.ok(ApiResponse.success(authorManageService.selectAuthor(authorCode)));
    }

    @Operation(summary = "권한 그룹 ?록", description = "?로???스??권한 그룹???록?니??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createAuthor(@RequestBody AuthorManageDto dto) {
        authorManageService.insertAuthor(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "권한 그룹 ?정", description = "기존 ?스??권한 그룹 ?보??정?니??")
    @PutMapping("/{authorCode}")
    public ResponseEntity<ApiResponse<Void>> updateAuthor(
            @PathVariable String authorCode,
            @RequestBody AuthorManageDto dto) {
        dto.setAuthorCode(authorCode);
        authorManageService.updateAuthor(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "권한?메뉴 목록 조회", description = "?정 권한 그룹???근 가?한 메뉴 목록??조회?니??")
    @GetMapping("/{authorCode}/menus")
    public ResponseEntity<ApiResponse<PageResponse<MenuDto>>> getAuthorMenus(
            @PathVariable String authorCode) {

        com.company.project.service.menu.dto.MenuCreateDto vo = new com.company.project.service.menu.dto.MenuCreateDto();
        vo.setAuthorCode(authorCode);

        List<MenuDto> list = menuService.selectMenuCreatList(vo);

        // Front-end expects PageResponse
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, 1, list.size(), list.size())));
    }

    @Operation(summary = "권한 그룹 ??", description = "?스??권한 그룹 ?보????니??")
    @DeleteMapping("/{authorCode}")
    public ResponseEntity<ApiResponse<Void>> deleteAuthor(@PathVariable String authorCode) {
        authorManageService.deleteAuthor(authorCode);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}