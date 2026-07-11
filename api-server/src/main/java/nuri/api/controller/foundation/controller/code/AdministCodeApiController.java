package nuri.api.controller.foundation.controller.code;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.business.service.code.AdministCodeService;
import nuri.business.service.code.dto.AdministCodeDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * 행정코드 관리 API 컨트롤러
 */
@Tag(name = "Administrative Code", description = "행정코드 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/codes/administ")
@RequiredArgsConstructor
public class AdministCodeApiController {

    private final AdministCodeService administCodeService;

    @Operation(summary = "행정코드 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdministCodeDto>>> getAdministCodeList(
            @ModelAttribute BaseSearchDto searchDto) {

        PageRequest pageable = PageRequest.of(searchDto.getPageIndex() - 1, searchDto.getPageUnit());
        Page<AdministCodeDto> pageResult = administCodeService.getAdministCodeList(searchDto.getSearchKeyword(), pageable);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "행정코드 상세 조회")
    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<AdministCodeDto>> getAdministCodeDetail(@PathVariable String code) {
        AdministCodeDto dto = administCodeService.getAdministCodeDetail(code);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @Operation(summary = "행정코드 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createAdministCode(@Valid @RequestBody AdministCodeDto dto) {
        administCodeService.createAdministCode(dto, getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "행정코드 수정")
    @PutMapping("/{code}")
    public ResponseEntity<ApiResponse<Void>> updateAdministCode(@PathVariable String code, @Valid @RequestBody AdministCodeDto dto) {
        administCodeService.updateAdministCode(code, dto, getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "행정코드 삭제")
    @DeleteMapping("/{code}")
    public ResponseEntity<ApiResponse<Void>> deleteAdministCode(@PathVariable String code) {
        administCodeService.deleteAdministCode(code);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getEsntlId();
        }
        return "anonymous";
    }
}
