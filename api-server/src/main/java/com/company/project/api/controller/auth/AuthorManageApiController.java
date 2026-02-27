package com.company.project.api.controller.auth;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.auth.AuthorManageService;
import com.company.project.service.auth.dto.AuthorManageDto;
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
@RestController
@RequestMapping("/api/v1/admin/security/authorities")
@RequiredArgsConstructor
@Tag(name = "AuthorManage", description = "권한 관리 API")
public class AuthorManageApiController {

    private final AuthorManageService authorManageService;
    private final com.company.project.service.menu.MenuService menuService;

    @Operation(summary = "권한 목록 조회")
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

    @Operation(summary = "권한 상세 조회")
    @GetMapping("/{authorCode}")
    public ResponseEntity<ApiResponse<AuthorManageDto>> getAuthor(@PathVariable String authorCode) {
        return ResponseEntity.ok(ApiResponse.success(authorManageService.selectAuthor(authorCode)));
    }

    @Operation(summary = "권한 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createAuthor(@RequestBody AuthorManageDto dto) {
        authorManageService.insertAuthor(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "권한 수정")
    @PutMapping("/{authorCode}")
    public ResponseEntity<ApiResponse<Void>> updateAuthor(
            @PathVariable String authorCode,
            @RequestBody AuthorManageDto dto) {
        dto.setAuthorCode(authorCode);
        authorManageService.updateAuthor(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "권한별 메뉴 목록 조회")
    @GetMapping("/{authorCode}/menus")
    public ResponseEntity<ApiResponse<PageResponse<MenuDto>>> getAuthorMenus(
            @PathVariable String authorCode) {
        
        com.company.project.service.menu.dto.MenuCreateDto vo = new com.company.project.service.menu.dto.MenuCreateDto();
        vo.setAuthorCode(authorCode);

        List<MenuDto> list = menuService.selectMenuCreatList(vo);
        
        // Wrap in PageResponse for frontend compatibility
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, 1, list.size(), list.size())));
    }

    @Operation(summary = "권한 삭제")
    @DeleteMapping("/{authorCode}")
    public ResponseEntity<ApiResponse<Void>> deleteAuthor(@PathVariable String authorCode) {
        authorManageService.deleteAuthor(authorCode);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
