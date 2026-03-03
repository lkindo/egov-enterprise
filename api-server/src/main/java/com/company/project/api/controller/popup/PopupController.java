package com.company.project.api.controller.popup;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.popup.PopupService;
import com.company.project.service.popup.dto.PopupDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Popup", description = "팝업 사용자 API")
@RestController("com.company.project.api.controller.popup.PopupController")
@RequestMapping("/api/v1/popups")
@RequiredArgsConstructor
public class PopupController {

    private final PopupService popupService;

    @Operation(summary = "활성 팝업 목록 조회", description = "현재 게시 기간 내에 있는 활성 팝업 목록을 조회합니다.")
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<PopupDto>>> getActivePopups() {
        return ResponseEntity.ok(ApiResponse.success(popupService.getActivePopups()));
    }

    @Operation(summary = "팝업 상세 조회", description = "특정 팝업의 상세 정보를 조회합니다.")
    @GetMapping("/{popupId}")
    public ResponseEntity<ApiResponse<PopupDto>> getPopup(
            @Parameter(description = "팝업 ID") @PathVariable String popupId) {
        return ResponseEntity.ok(ApiResponse.success(popupService.getPopup(popupId)));
    }
}
