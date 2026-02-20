package com.company.project.api.controller.ncm;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.namecard.EgovNameCardService;

import com.company.project.service.namecard.dto.NameCardDto;

import com.company.project.service.namecard.dto.NameCardUserDto;

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

@Tag(name = "NameCard", description = "Name Card Management APIs")

@RestController

@RequestMapping("/api/v1/name-cards")

@RequiredArgsConstructor

public class NameCardController {

    private final EgovNameCardService nameCardService;

@Operation(summary = "?         ?            ?            ?         ??", description = "?         ??            ?            ??        ??   ???      .")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<NameCardDto>>> getNameCardList(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(nameCardService.getNameCardList(keyword, pageable)));

    }

@Operation(summary = "            ??                   ??", description = "            ???          ?         ??         ???      ??")

    @GetMapping("/{ncrdId}")

    public ResponseEntity<ApiResponse<NameCardDto>> getNameCard(

            @Parameter(description = "            ?ID") @PathVariable String ncrdId) {

        return ResponseEntity.ok(ApiResponse.success(nameCardService.getNameCard(ncrdId)));

    }

@Operation(summary = "            ??         ", description = "??      ??            ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createNameCard(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody NameCardDto nameCardDto) {

        String ncrdId = nameCardService.createNameCard(userDetails.getUsername(), nameCardDto);

        return ResponseEntity.ok(ApiResponse.success(ncrdId));

    }

@Operation(summary = "            ???      ", description = "            ??         ????      ??      ??")

    @PutMapping("/{ncrdId}")

    public ResponseEntity<ApiResponse<Void>> updateNameCard(

            @AuthenticationPrincipal UserDetails userDetails,

            @PathVariable String ncrdId,

            @RequestBody NameCardDto nameCardDto) {

        nameCardService.updateNameCard(ncrdId, userDetails.getUsername(), nameCardDto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "            ?????", description = "            ???????      ??")

    @DeleteMapping("/{ncrdId}")

    public ResponseEntity<ApiResponse<Void>> deleteNameCard(

            @PathVariable String ncrdId) {

        nameCardService.deleteNameCard(ncrdId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??                  ?            ?         ??", description = "??                  ???  ???????      ?            ?            ??         ???      ??")

    @GetMapping("/my")

    public ResponseEntity<ApiResponse<Page<NameCardUserDto>>> getMyNameCardFolder(

            @AuthenticationPrincipal UserDetails userDetails,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(nameCardService.getMyNameCardFolder(userDetails.getUsername(), pageable)));

    }

@Operation(summary = "??                  ?                   ??      ?", description = "?     ??            ????                  ?       ???        ??      .")

    @PostMapping("/my/{ncrdId}")

    public ResponseEntity<ApiResponse<Void>> addMyNameCard(

            @AuthenticationPrincipal UserDetails userDetails,

            @PathVariable String ncrdId) {

        nameCardService.addMyNameCard(userDetails.getUsername(), ncrdId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??                  ?      ??            ?????", description = "??                  ?      ???     ??            ????????   ??         )??      ??")

    @DeleteMapping("/my/{ncrdId}")

    public ResponseEntity<ApiResponse<Void>> removeMyNameCard(

            @AuthenticationPrincipal UserDetails userDetails,

            @PathVariable String ncrdId) {

        nameCardService.removeMyNameCard(userDetails.getUsername(), ncrdId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

