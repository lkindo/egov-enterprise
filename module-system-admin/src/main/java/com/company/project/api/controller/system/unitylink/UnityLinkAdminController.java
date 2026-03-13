package com.company.project.api.controller.system.unitylink;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.unitylink.EgovUnityLinkService;
import com.company.project.service.unitylink.dto.UnityLinkDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "UnityLinkAdmin", description = "통합 링크 관리 API (Admin)")
@RestController
@RequestMapping("/api/v1/admin/system/unitylinks")
@RequiredArgsConstructor
public class UnityLinkAdminController {

    private final EgovUnityLinkService unityLinkService;

    @Operation(summary = "통합 링크 목록 조회", description = "통합 링크 목록을 페이지네이션하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<UnityLinkDto>>> getUnityLinkList(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<UnityLinkDto> page = unityLinkService.getUnityLinkList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "통합 링크 상세 조회", description = "특정 통합 링크의 상세 정보를 조회합니다.")
    @GetMapping("/{unityLinkId}")
    public ResponseEntity<ApiResponse<UnityLinkDto>> getUnityLink(
            @Parameter(description = "통합 링크 ID") @PathVariable String unityLinkId) {
        return ResponseEntity.ok(ApiResponse.success(unityLinkService.getUnityLink(unityLinkId)));
    }

    @Operation(summary = "통합 링크 등록", description = "새로운 통합 링크를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertUnityLink(
            @RequestBody UnityLinkDto dto) {
        unityLinkService.insertUnityLink(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "통합 링크 수정", description = "기존 통합 링크 정보를 수정합니다.")
    @PutMapping("/{unityLinkId}")
    public ResponseEntity<ApiResponse<Void>> updateUnityLink(
            @Parameter(description = "통합 링크 ID") @PathVariable String unityLinkId,
            @RequestBody UnityLinkDto dto) {
        dto.setUnityLinkId(unityLinkId);
        unityLinkService.updateUnityLink(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "통합 링크 삭제", description = "등록된 통합 링크를 삭제합니다.")
    @DeleteMapping("/{unityLinkId}")
    public ResponseEntity<ApiResponse<Void>> deleteUnityLink(
            @Parameter(description = "통합 링크 ID") @PathVariable String unityLinkId) {
        unityLinkService.deleteUnityLink(unityLinkId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
