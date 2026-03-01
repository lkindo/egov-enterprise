package com.company.project.api.controller.popup;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.popup.PopupService;
import com.company.project.service.popup.dto.PopupDto;
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

import java.util.List;

@Tag(name = "Popup", description = "?ì—… ê´€ë¦?API")
@RestController
@RequestMapping("/api/v1/popups")
@RequiredArgsConstructor
public class PopupController {

    private final PopupService popupService;

    @Operation(summary = "?ì—… ëª©ë¡ ì¡°íšŒ", description = "?±ë¡???ì—… ëª©ë¡???˜ì´ì§•í•˜??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<PopupDto>>> getPopups(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(popupService.getPopupList(searchWrd, pageable)));
    }

    @Operation(summary = "?œì„± ?ì—… ëª©ë¡ ì¡°íšŒ", description = "?„ì¬ ê²Œì‹œ ê¸°ê°„ ?´ì— ?ˆëŠ” ?œì„± ?ì—… ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<PopupDto>>> getActivePopups() {
        return ResponseEntity.ok(ApiResponse.success(popupService.getActivePopups()));
    }

    @Operation(summary = "?ì—… ?ì„¸ ì¡°íšŒ", description = "?ì—…???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{popupId}")
    public ResponseEntity<ApiResponse<PopupDto>> getPopup(
            @Parameter(description = "?ì—… ID") @PathVariable String popupId) {
        return ResponseEntity.ok(ApiResponse.success(popupService.getPopup(popupId)));
    }

    @Operation(summary = "?ì—… ?±ë¡", description = "?ˆë¡œ???ì—…???±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createPopup(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody PopupDto popupDto) {
        return ResponseEntity.ok(ApiResponse.success(popupService.createPopup(userDetails.getUsername(), popupDto)));
    }

    @Operation(summary = "?ì—… ?•ë³´ ?˜ì •", description = "?±ë¡???ì—…???•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{popupId}")
    public ResponseEntity<ApiResponse<Void>> updatePopup(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?ì—… ID") @PathVariable String popupId,
            @RequestBody PopupDto popupDto) {
        popupService.updatePopup(popupId, userDetails.getUsername(), popupDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?ì—… ?? œ", description = "?±ë¡???ì—…???œìŠ¤?œì—???? œ?©ë‹ˆ??")
    @DeleteMapping("/{popupId}")
    public ResponseEntity<ApiResponse<Void>> deletePopup(
            @Parameter(description = "?ì—… ID") @PathVariable String popupId) {
        popupService.deletePopup(popupId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
