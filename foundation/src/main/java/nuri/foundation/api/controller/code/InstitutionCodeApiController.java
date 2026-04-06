package nuri.foundation.api.controller.code;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.foundation.service.code.InstitutionCodeService;
import nuri.foundation.service.code.dto.InstitutionCodeDto;
import nuri.foundation.service.code.dto.InstitutionCodeRecptnDto;
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
 * 기관코드 관리 API 컨트롤러
 */
@Tag(name = "Institution Code", description = "기관코드 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/codes/institution")
@RequiredArgsConstructor
public class InstitutionCodeApiController {

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

    @Operation(summary = "기관코드 수신 내역 조회")
    @GetMapping("/receptions")
    public ResponseEntity<ApiResponse<PageResponse<InstitutionCodeRecptnDto>>> getInstitutionCodeRecptnList(
            @RequestParam(defaultValue = "") String searchWrd,
            @RequestParam(required = false) String processSe,
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<InstitutionCodeRecptnDto> pageResult = institutionCodeService.getInstitutionCodeRecptnList(searchWrd, processSe, pageable);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "기관코드 수신 처리")
    @PostMapping("/receptions/process")
    public ResponseEntity<ApiResponse<Void>> processInstitutionCodeRecptn(
            @RequestParam String occrrncDe,
            @RequestParam String insttCode,
            @RequestParam Long opertSn) throws Exception {
        
        String userId = getCurrentUserId();
        institutionCodeService.processInstitutionCodeRecptn(occrrncDe, insttCode, opertSn, userId);
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
