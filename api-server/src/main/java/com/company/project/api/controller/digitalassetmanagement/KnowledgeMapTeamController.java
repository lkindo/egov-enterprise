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

@Tag(name = "DigitalAssetMapTeam", description = "지식 맵 팀 관리 API")
@RestController
@RequestMapping("/api/v1/admin/digital-assets/map-teams")
@RequiredArgsConstructor
public class KnowledgeMapTeamController {

    private final KnowledgeMapTeamService mapTeamService;

    @Operation(summary = "지식 맵 팀 목록 조회", description = "시스템에 등록된 지식 맵 팀(조직) 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<MapTeamDto>>> getMapTeamList(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                mapTeamService.selectKnowledgeMapTeamList(searchCondition, searchKeyword, pageable)));
    }

    @Operation(summary = "지식 맵 팀 상세 조회", description = "특정 지식 맵 팀의 상세 정보를 조회합니다.")
    @GetMapping("/{organizationId}")
    public ResponseEntity<ApiResponse<MapTeamDto>> getMapTeamDetail(
            @Parameter(description = "조직 ID") @PathVariable String organizationId) {
        return ResponseEntity.ok(ApiResponse.success(mapTeamService.selectKnowledgeMapTeamDetail(organizationId)));
    }

    @Operation(summary = "지식 맵 팀 등록", description = "새로운 지식 맵 팀 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createMapTeam(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MapTeamDto mapTeamDto) {
        mapTeamDto.setLastModifiedBy(userDetails.getUsername());
        mapTeamService.insertKnowledgeMapTeam(mapTeamDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "지식 맵 팀 정보 수정", description = "지식 맵 팀 정보를 수정합니다.")
    @PutMapping("/{organizationId}")
    public ResponseEntity<ApiResponse<Void>> updateMapTeam(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String organizationId,
            @RequestBody MapTeamDto mapTeamDto) {
        mapTeamDto.setOrganizationId(organizationId);
        mapTeamDto.setLastModifiedBy(userDetails.getUsername());
        mapTeamService.updateKnowledgeMapTeam(mapTeamDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "지식 맵 팀 정보 삭제", description = "지식 맵 팀 정보를 삭제합니다.")
    @DeleteMapping("/{organizationId}")
    public ResponseEntity<ApiResponse<Void>> deleteMapTeam(@PathVariable String organizationId) {
        mapTeamService.deleteKnowledgeMapTeam(organizationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}