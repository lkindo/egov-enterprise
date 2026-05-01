package nuri.foundation.api.controller.system;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.service.auth.AuthorManageService;
import nuri.foundation.service.auth.dto.AuthorManageDto;
import nuri.foundation.service.menu.MenuService;
import nuri.foundation.service.menu.dto.MenuCreateDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

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
    public ResponseEntity<ApiResponse<PageResponse<AuthorManageDto>>> getAuthors(
            @ModelAttribute BaseSearchDto searchDto) {
        log.info(">>> [AuthorApiController] getAuthors called with params: {}", searchDto);

        List<AuthorManageDto> list = authorManageService.selectAuthorList(searchDto);
        int total = authorManageService.selectAuthorListTotCnt(searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                list,
                searchDto.getPageIndex(),
                searchDto.getPageUnit(),
                total
        )));
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

    @Operation(summary = "권한별 메뉴 목록 조회", description = "특정 권한 그룹의 접근 가능한 메뉴 목록을 조회합니다.")
    @GetMapping("/{authorCode}/menus")
    public ResponseEntity<ApiResponse<List<MenuCreateDto>>> getAuthorMenus(
            @PathVariable String authorCode) {
        log.info(">>> [AuthorApiController] getAuthorMenus called for code: {}", authorCode);

        MenuCreateDto vo = new MenuCreateDto();
        vo.setAuthorCode(authorCode);

        List<MenuCreateDto> list = menuService.selectMenuCreatList(vo);

        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @Operation(summary = "권한 그룹 삭제", description = "시스템 권한 그룹 정보를 삭제합니다.")
    @DeleteMapping("/{authorCode}")
    public ResponseEntity<ApiResponse<Void>> deleteAuthor(@PathVariable String authorCode) {
        authorManageService.deleteAuthor(authorCode);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "권한 그룹 다중 삭제", description = "여러 권한 그룹 정보를 한꺼번에 삭제합니다.")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteAuthors(@RequestBody List<String> authorCodes) {
        authorManageService.deleteAuthors(authorCodes.toArray(new String[0]));
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
