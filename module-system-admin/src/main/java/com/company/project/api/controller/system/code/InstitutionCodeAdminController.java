package com.company.project.api.controller.system.code;

import com.company.project.service.code.InstitutionCodeService;
import com.company.project.service.code.dto.InstitutionCodeDto;
import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 기관코드 관리 API 컨트롤러 (Admin)
 */
@Tag(name = "InstitutionCodeAdmin", description = "기관코드 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/codes/institution")
@RequiredArgsConstructor
public class InstitutionCodeAdminController {

    private final InstitutionCodeService institutionCodeService;

    @Operation(summary = "기관코드 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<InstitutionCodeDto>>> getInstitutionCodeList(
            @RequestParam(defaultValue = "") String searchWrd,
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<InstitutionCodeDto> pageResult = institutionCodeService.getInstitutionCodeList(searchWrd, pageable);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "기관코드 상세 조회")
    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<InstitutionCodeDto>> getInstitutionCodeDetail(@PathVariable String code) {
        InstitutionCodeDto dto = institutionCodeService.getInstitutionCodeDetail(code);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}
