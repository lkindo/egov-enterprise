package com.company.project.api.controller.system.code;

import com.company.project.service.code.AdministCodeService;
import com.company.project.service.code.dto.AdministCodeDto;
import com.company.project.security.service.CustomUserDetails;
import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
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
 * 행정코드 관리 API 컨트롤러 (Admin)
 */
@Tag(name = "AdministCodeAdmin", description = "행정코드 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/codes/administ")
@RequiredArgsConstructor
public class AdministCodeAdminController {

    private final AdministCodeService administCodeService;

    @Operation(summary = "행정코드 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdministCodeDto>>> getAdministCodeList(
            @RequestParam(defaultValue = "") String searchWrd,
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<AdministCodeDto> pageResult = administCodeService.getAdministCodeList(searchWrd, pageable);

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
    public ResponseEntity<ApiResponse<String>> createAdministCode(@RequestBody AdministCodeDto dto) throws Exception {
        String userId = getCurrentUserId();
        String newCode = administCodeService.createAdministCode(dto, userId);
        return ResponseEntity.ok(ApiResponse.success(newCode));
    }

    @Operation(summary = "행정코드 수정")
    @PutMapping("/{code}")
    public ResponseEntity<ApiResponse<Void>> updateAdministCode(@PathVariable String code, @RequestBody AdministCodeDto dto) throws Exception {
        String userId = getCurrentUserId();
        administCodeService.updateAdministCode(code, dto, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "행정코드 삭제")
    @DeleteMapping("/{code}")
    public ResponseEntity<ApiResponse<Void>> deleteAdministCode(@PathVariable String code) throws Exception {
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
