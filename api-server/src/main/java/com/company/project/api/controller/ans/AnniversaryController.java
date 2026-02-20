package com.company.project.api.controller.ans;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.anniversary.EgovAnniversaryService;

import com.company.project.service.anniversary.dto.AnniversaryDto;

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

@Tag(name = "Anniversary", description = "Anniversary Management APIs")

@RestController("ansAnniversaryController")

@RequestMapping("/api/v1/anniversaries")

@RequiredArgsConstructor

public class AnniversaryController {

    private final EgovAnniversaryService anniversaryService;

@Operation(summary = "         ???            ?         ??", description = "?         ??            ?         ???            ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<AnniversaryDto>>> getAnniversaries(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversaryList(keyword, pageable)));

    }

@Operation(summary = "??         ???            ?         ??", description = "??? ?         ??         ???            ??         ???      ??")

    @GetMapping("/my")

    public ResponseEntity<ApiResponse<Page<AnniversaryDto>>> getMyAnniversaries(

            @AuthenticationPrincipal UserDetails userDetails,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity

                .ok(ApiResponse.success(anniversaryService.getMyAnniversaryList(userDetails.getUsername(), pageable)));

    }

@Operation(summary = "         ????                   ??", description = "?     ??         ???       ?          ?         ??         ???      ??")

    @GetMapping("/{annId}")

    public ResponseEntity<ApiResponse<AnniversaryDto>> getAnniversary(

            @Parameter(description = "         ???ID") @PathVariable String annId) {

        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversary(annId)));

    }

@Operation(summary = "         ????         ", description = "??      ??         ???       ?         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertAnniversary(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody AnniversaryDto dto) {

        anniversaryService.insertAnniversary(userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ?????      ", description = "         ??         ????         ????      ??      ??")

    @PutMapping("/{annId}")

    public ResponseEntity<ApiResponse<Void>> updateAnniversary(

            @AuthenticationPrincipal UserDetails userDetails,

            @PathVariable String annId,

            @RequestBody AnniversaryDto dto) {

        anniversaryService.updateAnniversary(annId, userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ???????", description = "?     ??         ???       ?????      ??")

    @DeleteMapping("/{annId}")

    public ResponseEntity<ApiResponse<Void>> deleteAnniversary(

            @PathVariable String annId) {

        anniversaryService.deleteAnniversary(annId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

