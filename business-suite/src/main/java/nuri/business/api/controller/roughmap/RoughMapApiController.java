package nuri.business.api.controller.roughmap;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.roughmap.EgovRoughMapService;
import nuri.business.service.roughmap.dto.RoughMapDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "RoughMap", description = "약도 관리 API")
@RestController
@RequestMapping("/api/v1/rough-maps")
@RequiredArgsConstructor
public class RoughMapApiController {

    private final EgovRoughMapService roughMapService;

    @Operation(summary = "약도 목록 조회", description = "약도 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<RoughMapDto>>> getRoughMaps(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<RoughMapDto> result = roughMapService.getRoughMapList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "약도 상세 조회", description = "특정 약도의 상세 정보를 조회합니다.")
    @GetMapping("/{roughMapId}")
    public ResponseEntity<ApiResponse<RoughMapDto>> getRoughMap(
            @Parameter(description = "약도 ID") @PathVariable String roughMapId) {
        return ResponseEntity.ok(ApiResponse.success(roughMapService.getRoughMap(roughMapId)));
    }

    @Operation(summary = "약도 등록", description = "새로운 약도 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertRoughMap(@RequestBody RoughMapDto dto) {
        roughMapService.insertRoughMap(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "약도 정보 수정", description = "기존 약도 정보를 수정합니다.")
    @PutMapping("/{roughMapId}")
    public ResponseEntity<ApiResponse<Void>> updateRoughMap(
            @PathVariable String roughMapId,
            @RequestBody RoughMapDto dto) {
        dto.setRoughMapId(roughMapId);
        roughMapService.updateRoughMap(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "약도 삭제", description = "약도 정보를 삭제합니다.")
    @DeleteMapping("/{roughMapId}")
    public ResponseEntity<ApiResponse<Void>> deleteRoughMap(@PathVariable String roughMapId) {
        roughMapService.deleteRoughMap(roughMapId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
