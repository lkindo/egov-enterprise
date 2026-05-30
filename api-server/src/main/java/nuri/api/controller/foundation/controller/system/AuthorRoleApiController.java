package nuri.api.controller.foundation.controller.system;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import nuri.business.domain.auth.AuthorRoleProjection;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.auth.AuthorRoleManageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 권한-롤 매핑 관리 API 컨트롤러
 */
@Tag(name = "Authority-Role Mapping", description = "시스템 권한별 롤 할당 관리 API (Admin)")
@Slf4j
@RestController("systemAuthorRoleApiController")
@RequestMapping("/api/v1/admin/system/authorities/{authrtCd}/roles")
@RequiredArgsConstructor
public class AuthorRoleApiController {

    private final AuthorRoleManageService authorRoleManageService;

    @Operation(summary = "권한별 롤 목록 조회", description = "특정 권한에 할당된 롤 목록 및 전체 롤 상태를 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AuthorRoleProjection>>> getAuthorRoles(
            @PathVariable String authrtCd,
            @ModelAttribute BaseSearchDto searchDto) {

        Page<AuthorRoleProjection> result = authorRoleManageService.selectAuthorRoleList(authrtCd, searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                result.getContent(),
                result.getNumber() + 1,
                result.getSize(),
                (int) result.getTotalElements()
        )));
    }

    @Operation(summary = "권한별 롤 할당 저장", description = "특정 권한에 대해 선택된 롤들을 할당합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> saveAuthorRoles(
            @PathVariable String authrtCd,
            @RequestBody List<String> roleCds) {

        authorRoleManageService.insertAuthorRole(authrtCd, roleCds);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
