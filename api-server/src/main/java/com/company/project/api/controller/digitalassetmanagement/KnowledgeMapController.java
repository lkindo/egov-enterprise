package com.company.project.api.controller.digitalassetmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.digitalassetmanagement.MapKnoSearchResult;
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

@Tag(name = "DigitalAssetMap", description = "ì§€??? í˜• ê´€ë¦?API")
@RestController
@RequestMapping("/api/v1/admin/digital-assets/maps")
@RequiredArgsConstructor
public class KnowledgeMapController {

    private final KnowledgeMapService mapService;

    @Operation(summary = "ì§€??? í˜• ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤?œì— ?±ë¡??ì§€??? í˜•(ë§? ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<MapKnoSearchResult>>> getMapList(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                mapService.selectKnowledgeMapList(searchCondition, searchKeyword, pageable)));
    }

    @Operation(summary = "ì§€??? í˜• ?ì„¸ ì¡°íšŒ", description = "?¹ì • ì§€??? í˜•???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{knoTypeCd}")
    public ResponseEntity<ApiResponse<MapKnoDto>> getMapDetail(
            @Parameter(description = "ì§€??? í˜• ì½”ë“œ") @PathVariable String knoTypeCd) {
        return ResponseEntity.ok(ApiResponse.success(mapService.selectKnowledgeMapDetail(knoTypeCd)));
    }

    @Operation(summary = "ì§€??? í˜• ?±ë¡", description = "?ˆë¡œ??ì§€??? í˜• ?•ë³´ë¥??±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createMap(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MapKnoDto mapKnoDto) {
        mapKnoDto.setFrstRegisterId(userDetails.getUsername());
        mapService.insertKnowledgeMap(mapKnoDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ì§€??? í˜• ?•ë³´ ?˜ì •", description = "ì§€??? í˜• ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
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

    @Operation(summary = "ì§€??? í˜• ?•ë³´ ?? œ", description = "ì§€??? í˜• ?•ë³´ë¥??? œ?©ë‹ˆ??")
    @DeleteMapping("/{knoTypeCd}")
    public ResponseEntity<ApiResponse<Void>> deleteMap(@PathVariable String knoTypeCd) {
        mapService.deleteKnowledgeMap(knoTypeCd);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
