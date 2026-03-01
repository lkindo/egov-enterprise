package com.company.project.api.controller.digitalassetmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.digitalassetmanagement.KnowledgeMapTeamService;
import com.company.project.service.digitalassetmanagement.dto.MapTeamDto;
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

@Tag(name = "DigitalAssetMapTeam", description = "ì§€???€ ê´€ë¦?API")
@RestController
@RequestMapping("/api/v1/admin/digital-assets/map-teams")
@RequiredArgsConstructor
public class KnowledgeMapTeamController {

    private final KnowledgeMapTeamService mapTeamService;

    @Operation(summary = "ì§€???€ ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤?œì— ?±ë¡??ì§€???€(ì¡°ì§) ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<MapTeamDto>>> getMapTeamList(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                mapTeamService.selectKnowledgeMapTeamList(searchCondition, searchKeyword, pageable)));
    }

    @Operation(summary = "ì§€???€ ?ì„¸ ì¡°íšŒ", description = "?¹ì • ì§€???€???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{orgnztId}")
    public ResponseEntity<ApiResponse<MapTeamDto>> getMapTeamDetail(
            @Parameter(description = "ì¡°ì§ ID") @PathVariable String orgnztId) {
        return ResponseEntity.ok(ApiResponse.success(mapTeamService.selectKnowledgeMapTeamDetail(orgnztId)));
    }

    @Operation(summary = "ì§€???€ ?±ë¡", description = "?ˆë¡œ??ì§€???€ ?•ë³´ë¥??±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createMapTeam(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MapTeamDto mapTeamDto) {
        mapTeamDto.setLastUpdusrId(userDetails.getUsername());
        mapTeamService.insertKnowledgeMapTeam(mapTeamDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ì§€???€ ?•ë³´ ?˜ì •", description = "ì§€???€ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{orgnztId}")
    public ResponseEntity<ApiResponse<Void>> updateMapTeam(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String orgnztId,
            @RequestBody MapTeamDto mapTeamDto) {
        mapTeamDto.setOrgnztId(orgnztId);
        mapTeamDto.setLastUpdusrId(userDetails.getUsername());
        mapTeamService.updateKnowledgeMapTeam(mapTeamDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ì§€???€ ?•ë³´ ?? œ", description = "ì§€???€ ?•ë³´ë¥??? œ?©ë‹ˆ??")
    @DeleteMapping("/{orgnztId}")
    public ResponseEntity<ApiResponse<Void>> deleteMapTeam(@PathVariable String orgnztId) {
        mapTeamService.deleteKnowledgeMapTeam(orgnztId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
