package com.company.project.api.controller.unitylink;

import com.company.project.core.response.ApiResponse;
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

@Tag(name = "UnityLink", description = "?µí•© ë§í¬ ê´€ë¦?API")
@RestController
@RequestMapping("/api/v1/unity-links")
@RequiredArgsConstructor
public class UnityLinkController {

    private final EgovUnityLinkService unityLinkService;

    @Operation(summary = "?µí•© ë§í¬ ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤?œì— ?±ë¡???µí•© ë§í¬ ëª©ë¡???˜ì´ì§•í•˜??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<UnityLinkDto>>> getUnityLinks(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(unityLinkService.getUnityLinkList(keyword, pageable)));
    }

    @Operation(summary = "?µí•© ë§í¬ ?ì„¸ ì¡°íšŒ", description = "?¹ì • ?µí•© ë§í¬???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{unityLinkId}")
    public ResponseEntity<ApiResponse<UnityLinkDto>> getUnityLink(
            @Parameter(description = "?µí•© ë§í¬ ID") @PathVariable String unityLinkId) {
        return ResponseEntity.ok(ApiResponse.success(unityLinkService.getUnityLink(unityLinkId)));
    }

    @Operation(summary = "?µí•© ë§í¬ ?±ë¡", description = "?ˆë¡œ???µí•© ë§í¬ë¥??±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertUnityLink(
            @RequestBody UnityLinkDto dto) {
        unityLinkService.insertUnityLink(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?µí•© ë§í¬ ?˜ì •", description = "ê¸°ì¡´ ?µí•© ë§í¬ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{unityLinkId}")
    public ResponseEntity<ApiResponse<Void>> updateUnityLink(
            @PathVariable String unityLinkId,
            @RequestBody UnityLinkDto dto) {
        dto.setUnityLinkId(unityLinkId);
        unityLinkService.updateUnityLink(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?µí•© ë§í¬ ?? œ", description = "?œìŠ¤?œì—???µí•© ë§í¬ë¥??? œ?©ë‹ˆ??")
    @DeleteMapping("/{unityLinkId}")
    public ResponseEntity<ApiResponse<Void>> deleteUnityLink(
            @PathVariable String unityLinkId) {
        unityLinkService.deleteUnityLink(unityLinkId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
