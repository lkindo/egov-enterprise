package com.company.project.api.controller.pwm;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.pwm.PopupService;

import com.company.project.service.pwm.dto.PopupDto;

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

@Tag(name = "Popup", description = "Popup Management APIs")

@RestController

@RequestMapping("/api/v1/popups")

@RequiredArgsConstructor

public class PopupController {

    private final PopupService popupService;

@Operation(summary = "??                   ?         ??", description = "??                   ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<PopupDto>>> getPopups(

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(popupService.getPopupList(searchWrd, pageable)));

    }

@Operation(summary = "??       ??                   ?         ??", description = "?          ??      ??         ???                ??            ???       ??       ??       ??                   ??         ???      ??")

    @GetMapping("/active")

    public ResponseEntity<ApiResponse<List<PopupDto>>> getActivePopups() {

        return ResponseEntity.ok(ApiResponse.success(popupService.getActivePopups()));

    }

@Operation(summary = "??       ?                   ??", description = "?     ????      ???          ?         ??         ???      ??")

    @GetMapping("/{popupId}")

    public ResponseEntity<ApiResponse<PopupDto>> getPopup(

            @Parameter(description = "??       ID") @PathVariable String popupId) {

        return ResponseEntity.ok(ApiResponse.success(popupService.getPopup(popupId)));

    }

@Operation(summary = "??       ?         ", description = "??      ????      ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createPopup(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody PopupDto popupDto) {

        return ResponseEntity.ok(ApiResponse.success(popupService.createPopup(userDetails.getUsername(), popupDto)));

    }

@Operation(summary = "??       ??      ", description = "         ????       ?         ????      ??      ??")

    @PutMapping("/{popupId}")

    public ResponseEntity<ApiResponse<Void>> updatePopup(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "??       ID") @PathVariable String popupId,

            @RequestBody PopupDto popupDto) {

        popupService.updatePopup(popupId, userDetails.getUsername(), popupDto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??       ????", description = "?     ????      ??????         ???      ??")

    @DeleteMapping("/{popupId}")

    public ResponseEntity<ApiResponse<Void>> deletePopup(

            @Parameter(description = "??       ID") @PathVariable String popupId) {

        popupService.deletePopup(popupId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

