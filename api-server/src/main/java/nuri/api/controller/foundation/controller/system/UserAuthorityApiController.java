package nuri.api.controller.foundation.controller.system;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.auth.AuthorGroupProjection;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.auth.UserAuthorityManageService;
import nuri.business.service.auth.dto.UserAuthorityDto;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 사용자-권한 매핑 관리 API 컨트롤러
 */
@Tag(name = "User-Authority Mapping", description = "시스템 사용자별 권한 할당 관리 API (Admin)")
@Slf4j
@RestController("systemUserAuthorityApiController")
@RequestMapping("/api/v1/admin/system/user-authorities")
@RequiredArgsConstructor
public class UserAuthorityApiController {

    private final UserAuthorityManageService userAuthorityManageService;

    @Operation(summary = "사용자별 권한 목록 조회", description = "시스템 사용자 목록과 각 사용자의 권한 할당 상태를 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AuthorGroupProjection>>> getUserAuthorities(
            @Valid @ModelAttribute BaseSearchDto searchDto) {

        Page<AuthorGroupProjection> result = userAuthorityManageService.selectUserAuthorityList(searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                result.getContent(),
                result.getNumber() + 1,
                result.getSize(),
                (int) result.getTotalElements()
        )));
    }

    @Operation(summary = "사용자 권한 할당 저장", description = "여러 사용자에 대해 권한을 일괄 할당하거나 업데이트합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> saveUserAuthorities(
            @Valid @RequestBody List<UserAuthorityDto> userAuthorities) {

        userAuthorityManageService.saveUserAuthorities(userAuthorities);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 권한 할당 삭제", description = "해당 사용자들의 권한 할당 정보를 삭제합니다.")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteUserAuthorities(
            @RequestBody List<String> uniqIds) {

        userAuthorityManageService.deleteUserAuthorities(uniqIds);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
