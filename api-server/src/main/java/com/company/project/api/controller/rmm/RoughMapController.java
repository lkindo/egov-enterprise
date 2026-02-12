package com.company.project.api.controller.rmm;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.roughmap.EgovRoughMapService;
import com.company.project.service.roughmap.dto.RoughMapDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "RoughMap", description = "Rough Map Management APIs")
@RestController
@RequestMapping("/api/v1/rough-maps")
@RequiredArgsConstructor
public class RoughMapController {

    private final EgovRoughMapService roughMapService;

    @Operation(summary = "약도 목록 조회", description = "등록된 약도 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<RoughMapDto>>> getRoughMaps(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(roughMapService.getRoughMapList(keyword, pageable)));
    }

    @Operation(summary = "약도 상세 조회", description = "특정 약도의 상세 정보를 조회합니다.")
    @GetMapping("/{roughMapId}")
    public ResponseEntity<ApiResponse<RoughMapDto>> getRoughMap(
            @Parameter(description = "약도 ID") @PathVariable String roughMapId) {
        return ResponseEntity.ok(ApiResponse.success(roughMapService.getRoughMap(roughMapId)));
    }

    @Operation(summary = "약도 등록", description = "새로운 약도를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertRoughMap(
            @RequestBody RoughMapDto dto) {
        roughMapService.insertRoughMap(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "약도 수정", description = "기존 약도 정보를 수정합니다.")
    @PutMapping("/{roughMapId}")
    public ResponseEntity<ApiResponse<Void>> updateRoughMap(
            @PathVariable String roughMapId,
            @RequestBody RoughMapDto dto) {
        dto.setRoughMapId(roughMapId);
        roughMapService.updateRoughMap(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "약도 삭제", description = "특정 약도를 삭제합니다.")
    @DeleteMapping("/{roughMapId}")
    public ResponseEntity<ApiResponse<Void>> deleteRoughMap(
            @PathVariable String roughMapId) {
        roughMapService.deleteRoughMap(roughMapId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
