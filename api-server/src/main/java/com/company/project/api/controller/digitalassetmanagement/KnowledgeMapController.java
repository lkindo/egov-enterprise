package com.company.project.api.controller.digitalassetmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.dam.MapKnoSearchResult;
import com.company.project.service.digitalassetmanagement.KnowledgeMapService;
import com.company.project.service.digitalassetmanagement.dto.MapKnoDto;
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

@Tag(name = "DigitalAssetMap", description = "지식 유형 관리 API")
@RestController
@RequestMapping("/api/v1/admin/digital-assets/maps")
@RequiredArgsConstructor
public class KnowledgeMapController {

    private final KnowledgeMapService mapService;

    @Operation(summary = "지식 유형 목록 조회", description = "시스템에 등록된 지식 유형(맵) 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<MapKnoSearchResult>>> getMapList(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                mapService.selectKnowledgeMapList(searchCondition, searchKeyword, pageable)));
    }

    @Operation(summary = "지식 유형 상세 조회", description = "특정 지식 유형의 상세 정보를 조회합니다.")
    @GetMapping("/{knoTypeCd}")
    public ResponseEntity<ApiResponse<MapKnoDto>> getMapDetail(
            @Parameter(description = "지식 유형 코드") @PathVariable String knoTypeCd) {
        return ResponseEntity.ok(ApiResponse.success(mapService.selectKnowledgeMapDetail(knoTypeCd)));
    }

    @Operation(summary = "지식 유형 등록", description = "새로운 지식 유형 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createMap(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MapKnoDto mapKnoDto) {
        mapKnoDto.setFrstRegisterId(userDetails.getUsername());
        mapService.insertKnowledgeMap(mapKnoDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "지식 유형 정보 수정", description = "지식 유형 정보를 수정합니다.")
    @PutMapping("/{knoTypeCd}")
    public ResponseEntity<ApiResponse<Void>> updateMap(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String knoTypeCd,
            @RequestBody MapKnoDto mapKnoDto) {
        mapKnoDto.setKnoTypeCd(knoTypeCd);
        mapKnoDto.setFrstRegisterId(userDetails.getUsername());
        mapService.updateKnowledgeMap(mapKnoDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "지식 유형 정보 삭제", description = "지식 유형 정보를 삭제합니다.")
    @DeleteMapping("/{knoTypeCd}")
    public ResponseEntity<ApiResponse<Void>> deleteMap(@PathVariable String knoTypeCd) {
        mapService.deleteKnowledgeMap(knoTypeCd);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
