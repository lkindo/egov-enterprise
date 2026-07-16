package nuri.api.controller.foundation.controller.code;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.code.InstitutionCodeService;
import nuri.business.service.code.dto.InstitutionCodeDto;
import nuri.business.service.code.dto.InstitutionCodeRecptnDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

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
            @ModelAttribute BaseSearchDto searchDto) {

        List<InstitutionCodeDto> list = institutionCodeService.selectInstitutionCodeList(searchDto);
        int totCnt = institutionCodeService.selectInstitutionCodeListTotCnt(searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchDto.getPageIndex(), searchDto.getPageUnit(), totCnt)));
    }

    @Operation(summary = "기관코드 상세 조회")
    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<InstitutionCodeDto>> getInstitutionCodeDetail(@PathVariable String code) {
        InstitutionCodeDto dto = institutionCodeService.selectInstitutionCodeDetail(InstitutionCodeDto.builder().instCd(code).build());
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @Operation(summary = "기관코드 수신 내역 조회")
    @GetMapping("/receptions")
    public ResponseEntity<ApiResponse<PageResponse<InstitutionCodeRecptnDto>>> getInstitutionCodeRecptnList(
            @ModelAttribute BaseSearchDto searchDto) {

        List<InstitutionCodeRecptnDto> list = institutionCodeService.selectInstitutionCodeRecptnList(searchDto);
        int totCnt = list.size(); // Simplified

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchDto.getPageIndex(), searchDto.getPageUnit(), totCnt)));
    }

    @Operation(summary = "기관코드 수신 처리")
    @PostMapping("/receptions/process")
    public ResponseEntity<ApiResponse<Void>> processInstitutionCodeRecptn(
            @Valid @RequestBody InstitutionCodeRecptnDto dto) throws Exception {
        
        institutionCodeService.updateInstitutionCodeRecptn(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

}
