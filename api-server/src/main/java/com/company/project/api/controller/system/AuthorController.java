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
@Tag(name = "Authority (Admin)", description = "시스템 권한 그룹 관리 API (관리자용)")
public class AuthorController {

    private final AuthorManageService authorManageService;
    private final MenuService menuService;

    @Operation(summary = "권한 그룹 목록 조회", description = "시스템에 정의된 권한 그룹(Author) 목록을 조회합니다.")
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

    @Operation(summary = "권한 그룹 상세 조회", description = "특정 권한 그룹의 상세 정보를 조회합니다.")
    @GetMapping("/{authorCode}")
    public ResponseEntity<ApiResponse<AuthorManageDto>> getAuthor(@PathVariable String authorCode) {
        return ResponseEntity.ok(ApiResponse.success(authorManageService.selectAuthor(authorCode)));
    }

    @Operation(summary = "권한 그룹 등록", description = "새로운 시스템 권한 그룹을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createAuthor(@RequestBody AuthorManageDto dto) {
        authorManageService.insertAuthor(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "권한 그룹 수정", description = "기존 시스템 권한 그룹 정보를 수정합니다.")
    @PutMapping("/{authorCode}")
    public ResponseEntity<ApiResponse<Void>> updateAuthor(
            @PathVariable String authorCode,
            @RequestBody AuthorManageDto dto) {
        dto.setAuthorCode(authorCode);
        authorManageService.updateAuthor(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "권한별 메뉴 목록 조회", description = "특정 권한 그룹이 접근 가능한 메뉴 목록을 조회합니다.")
    @GetMapping("/{authorCode}/menus")
    public ResponseEntity<ApiResponse<PageResponse<MenuDto>>> getAuthorMenus(
            @PathVariable String authorCode) {

        com.company.project.service.menu.dto.MenuCreateDto vo = new com.company.project.service.menu.dto.MenuCreateDto();
        vo.setAuthorCode(authorCode);

        List<MenuDto> list = menuService.selectMenuCreatList(vo);

        // Front-end expects PageResponse
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, 1, list.size(), list.size())));
    }

    @Operation(summary = "권한 그룹 삭제", description = "시스템 권한 그룹 정보를 삭제합니다.")
    @DeleteMapping("/{authorCode}")
    public ResponseEntity<ApiResponse<Void>> deleteAuthor(@PathVariable String authorCode) {
        authorManageService.deleteAuthor(authorCode);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
