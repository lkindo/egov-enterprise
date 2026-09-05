package nuri.api.controller.foundation.controller.system.template;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.service.template.dto.TemplateDto;
import nuri.business.service.template.TmplatInfoService;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 커뮤니티 템플릿 정보 관리 API 컨트롤러
 */
@Tag(name = "Template", description = "템플릿 관리 API (Admin)")
@RestController("systemTemplateApiController")
@RequestMapping("/api/v1/admin/system/templates")
@RequiredArgsConstructor
public class TemplateApiController {

    private final TmplatInfoService tmplatInfoService;

    @Operation(summary = "템플릿 목록 조회", description = "시스템에 등록된 모든 게시판 템플릿 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<TemplateDto>>> selectTmplatInfoList() {
        List<TemplateDto> list = tmplatInfoService.selectTmplatInfoList();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @Operation(summary = "템플릿 상세 조회", description = "특정 템플릿의 상세 정보를 조회합니다.")
    @GetMapping("/{tmpltId}")
    public ResponseEntity<ApiResponse<TemplateDto>> selectTmplatInfoDetail(@PathVariable("tmpltId") String tmpltId) {
        TemplateDto detail = tmplatInfoService.selectTmplatInfoDetail(tmpltId);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    @Operation(summary = "템플릿 등록", description = "새로운 게시판 템플릿 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertTmplatInfo(@Valid @RequestBody TemplateDto tmplatInfo) {
        tmplatInfoService.insertTmplatInfo(tmplatInfo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /* [2026-09-05 DEC-OPS-036] 수정·삭제 신설 — 종전에는 등록·조회만 가능했다(감사 D11-02). */
    @Operation(summary = "템플릿 수정", description = "템플릿 정보를 수정합니다. 템플릿 ID 는 바꾸지 않습니다.")
    @PutMapping("/{tmpltId}")
    public ResponseEntity<ApiResponse<TemplateDto>> updateTmplatInfo(
            @PathVariable("tmpltId") String tmpltId,
            @Valid @RequestBody TemplateDto tmplatInfo) {
        return ResponseEntity.ok(ApiResponse.success(tmplatInfoService.updateTmplatInfo(tmpltId, tmplatInfo)));
    }

    @Operation(summary = "템플릿 삭제", description = "템플릿을 삭제합니다.")
    @DeleteMapping("/{tmpltId}")
    public ResponseEntity<ApiResponse<Void>> deleteTmplatInfo(@PathVariable("tmpltId") String tmpltId) {
        tmplatInfoService.deleteTmplatInfo(tmpltId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
