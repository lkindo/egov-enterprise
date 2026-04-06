package nuri.business.api.controller.knowledge;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.knowledge.KnowledgeService;
import nuri.business.service.knowledge.dto.KnowledgeDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Knowledge", description = "지식정보(DAM) 관리 API")
@RestController
@RequestMapping("/api/v1/admin/digital-assets")
@RequiredArgsConstructor
public class KnowledgeApiController {

    private final KnowledgeService knowledgeService;

    @Operation(summary = "지식정보 목록 조회", description = "지식정보(디지털 자산) 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<KnowledgeDto>>> getKnowledgeList(
            @Parameter(description = "검색어") @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<KnowledgeDto> result = knowledgeService.getKnowledgeList(searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "지식정보 상세 조회", description = "지식정보 상세 정보를 조회합니다.")
    @GetMapping("/{knoId}")
    public ResponseEntity<ApiResponse<KnowledgeDto>> getKnowledge(
            @Parameter(description = "지식 ID", example = "KNO_12345678") @PathVariable String knoId) {
        return ResponseEntity.ok(ApiResponse.success(knowledgeService.getKnowledge(knoId)));
    }

    @Operation(summary = "지식정보 등록", description = "새로운 지식정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createKnowledge(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody KnowledgeDto request) {
        return ResponseEntity.ok(ApiResponse.success(knowledgeService.createKnowledge(userDetails.getUsername(), request)));
    }

    @Operation(summary = "지식정보 수정", description = "지식정보를 수정합니다.")
    @PutMapping("/{knoId}")
    public ResponseEntity<ApiResponse<Void>> updateKnowledge(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String knoId,
            @RequestBody KnowledgeDto request) {
        knowledgeService.updateKnowledge(knoId, userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "지식정보 삭제", description = "지식정보를 삭제합니다.")
    @DeleteMapping("/{knoId}")
    public ResponseEntity<ApiResponse<Void>> deleteKnowledge(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String knoId) {
        knowledgeService.deleteKnowledge(knoId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
