package com.company.project.api.controller.system.popup;

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

@Tag(name = "Popup Management (Admin)", description = "팝업 관리 API (관리자용)")
@RestController
@RequestMapping("/api/v1/admin/system/popups")
@RequiredArgsConstructor
public class PopupManageController {

    private final PopupService popupService;

    @Operation(summary = "팝업 목록 조회", description = "관리자가 팝업 목록을 페이지네이션하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<PopupDto>>> getPopups(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(popupService.getPopupList(searchWrd, pageable)));
    }

    @Operation(summary = "팝업 상세 조회", description = "특정 팝업의 상세 정보를 조회합니다.")
    @GetMapping("/{popupId}")
    public ResponseEntity<ApiResponse<PopupDto>> getPopup(
            @Parameter(description = "팝업 ID") @PathVariable String popupId) {
        return ResponseEntity.ok(ApiResponse.success(popupService.getPopup(popupId)));
    }

    @Operation(summary = "팝업 등록", description = "새로운 팝업을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createPopup(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody PopupDto popupDto) {
        return ResponseEntity.ok(ApiResponse.success(popupService.createPopup(userDetails.getUsername(), popupDto)));
    }

    @Operation(summary = "팝업 정보 수정", description = "기존 팝업의 정보를 수정합니다.")
    @PutMapping("/{popupId}")
    public ResponseEntity<ApiResponse<Void>> updatePopup(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "팝업 ID") @PathVariable String popupId,
            @RequestBody PopupDto popupDto) {
        popupService.updatePopup(popupId, userDetails.getUsername(), popupDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "팝업 삭제", description = "등록된 팝업을 삭제합니다.")
    @DeleteMapping("/{popupId}")
    public ResponseEntity<ApiResponse<Void>> deletePopup(
            @Parameter(description = "팝업 ID") @PathVariable String popupId) {
        popupService.deletePopup(popupId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}