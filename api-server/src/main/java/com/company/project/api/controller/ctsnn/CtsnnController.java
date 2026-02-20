package com.company.project.api.controller.ctsnn;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.ctsnn.EgovCtsnnManageService;

import com.company.project.service.ctsnn.dto.CtsnnDto;

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

@Tag(name = "Ctsnn", description = "Congratulation and Condolence Management APIs")

@RestController

@RequestMapping("/api/v1/ctsnn")

@RequiredArgsConstructor

public class CtsnnController {

    private final EgovCtsnnManageService ctsnnManageService;

@Operation(summary = "         ????                      ?         ??", description = "?         ??            ?         ????                      ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<CtsnnDto>>> getCtsnnList(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(ctsnnManageService.getCtsnnList(keyword, pageable)));

    }

@Operation(summary = "??         ????                      ?         ??", description = "??? ?         ??         ???            ??         ???      ??")

    @GetMapping("/my")

    public ResponseEntity<ApiResponse<Page<CtsnnDto>>> getMyCtsnnList(

            @AuthenticationPrincipal UserDetails userDetails,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(ctsnnManageService.getMyCtsnnList(userDetails.getUsername(), pageable)));

    }

@Operation(summary = "         ????                   ??", description = "?     ??         ????         ???          ?         ??         ???      ??")

    @GetMapping("/{ctsnnId}")

    public ResponseEntity<ApiResponse<CtsnnDto>> getCtsnn(

            @Parameter(description = "         ???ID") @PathVariable String ctsnnId) {

        return ResponseEntity.ok(ApiResponse.success(ctsnnManageService.getCtsnn(ctsnnId)));

    }

@Operation(summary = "         ????         ", description = "??      ??         ???? ?         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertCtsnn(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody CtsnnDto dto) {

        ctsnnManageService.insertCtsnn(userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ?????      ", description = "         ??         ????          ?         ????      ??      ??")

    @PutMapping("/{ctsnnId}")

    public ResponseEntity<ApiResponse<Void>> updateCtsnn(

            @AuthenticationPrincipal UserDetails userDetails,

            @PathVariable String ctsnnId,

            @RequestBody CtsnnDto dto) {

        ctsnnManageService.updateCtsnn(ctsnnId, userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ???????", description = "?     ??         ????         ???????      ??")

    @DeleteMapping("/{ctsnnId}")

    public ResponseEntity<ApiResponse<Void>> deleteCtsnn(

            @PathVariable String ctsnnId) {

        ctsnnManageService.deleteCtsnn(ctsnnId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ????     ??         ??", description = "         ????         ???     ???      ??         ???      ??")

    @PatchMapping("/{ctsnnId}/confirm")

    public ResponseEntity<ApiResponse<Void>> confirmCtsnn(

            @PathVariable String ctsnnId,

            @RequestParam String confmAt,

            @RequestParam(required = false) String returnResn) {

        ctsnnManageService.confirmCtsnn(ctsnnId, confmAt, returnResn);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

