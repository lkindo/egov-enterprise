package nuri.api.controller.foundation.controller.system.service.survey;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.system.service.consult.EgovCnsltService;
import nuri.business.service.system.service.consult.dto.CnsltManageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Cnslt", description = "상담 관리 API (Admin)")
@RestController("systemCnsltApiController")
@RequestMapping("/api/v1/admin/system/cnslt")
@RequiredArgsConstructor
public class CnsltApiController {

    private final EgovCnsltService cnsltService;

    @Operation(summary = "상담 목록 페이징 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CnsltManageDto>>> getConsultations(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<CnsltManageDto> page = cnsltService.getCnsltList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "상담 상세 조회")
    @GetMapping("/{cnsltId}")
    public ResponseEntity<ApiResponse<CnsltManageDto>> getConsultation(@PathVariable String cnsltId) {
        return ResponseEntity.ok(ApiResponse.success(cnsltService.getCnslt(cnsltId)));
    }

    @Operation(summary = "상담 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertConsultation(@Valid @RequestBody CnsltManageDto dto) {
        cnsltService.insertCnslt(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "상담 답변 처리")
    @PatchMapping("/{cnsltId}/answer")
    public ResponseEntity<ApiResponse<Void>> answerConsultation(
            @PathVariable String cnsltId,
            @RequestBody String answerCn) {
        cnsltService.answerCnslt(cnsltId, answerCn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
