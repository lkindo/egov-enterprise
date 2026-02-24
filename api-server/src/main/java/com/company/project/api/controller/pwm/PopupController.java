package com.company.project.api.controller.pwm;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.pwm.dto.PopupDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@Tag(name = "Popup", description = "Popup Management APIs")
@RestController
@RequestMapping("/api/v1/popups")
@RequiredArgsConstructor
public class PopupController {

    // Missing service commented out to avoid build error
    // private final PopupService popupService;

    @Operation(summary = "현황 및 팝업 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<PopupDto>>> getPopups(
            @RequestParam(required = false) String searchWrd,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(new PageImpl<>(new ArrayList<>(), pageable, 0)));
    }

    @Operation(summary = "활성 팝업 목록 조회")
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<PopupDto>>> getActivePopups() {
        return ResponseEntity.ok(ApiResponse.success(new ArrayList<>()));
    }

    @Operation(summary = "팝업 상세 조회")
    @GetMapping("/{popupId}")
    public ResponseEntity<ApiResponse<PopupDto>> getPopup(@PathVariable String popupId) {
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
