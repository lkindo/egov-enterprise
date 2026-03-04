package com.company.project.api.controller.image;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.image.EgovMainImageService;

import com.company.project.service.image.dto.MainImageDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "MainImage", description = "Main Image Management APIs")

@RestController

@RequestMapping("/api/v1/main-images")

@RequiredArgsConstructor

public class MainImageController {

    private final EgovMainImageService mainImageService;

@Operation(summary = "         ????  ?                     ?         ??", description = "         ????  ?                     ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<MainImageDto>>> getMainImageList(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(mainImageService.getMainImageList(keyword, pageable)));

    }

@Operation(summary = "         ????  ?         ?                   ??", description = "?     ??         ????  ?        ???          ?         ??         ???      ??")

    @GetMapping("/{imageId}")

    public ResponseEntity<ApiResponse<MainImageDto>> getMainImage(

            @Parameter(description = "??  ?         ID") @PathVariable String imageId) {

        return ResponseEntity.ok(ApiResponse.success(mainImageService.getMainImage(imageId)));

    }

@Operation(summary = "         ????  ?         ?         ", description = "??      ??         ????  ?        ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertMainImage(

            @RequestBody MainImageDto dto) {

        mainImageService.insertMainImage(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ????  ?         ??      ", description = "         ??         ????  ?         ?         ????      ??      ??")

    @PutMapping("/{imageId}")

    public ResponseEntity<ApiResponse<Void>> updateMainImage(

            @PathVariable String imageId,

            @RequestBody MainImageDto dto) {

        dto.setImageId(imageId);

        mainImageService.updateMainImage(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ????  ?         ????", description = "?     ??         ????  ?        ???????      ??")

    @DeleteMapping("/{imageId}")

    public ResponseEntity<ApiResponse<Void>> deleteMainImage(

            @PathVariable String imageId) {

        mainImageService.deleteMainImage(imageId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ???         ????  ?                     ?         ??", description = "??       ?         ??         ??reflctAt='Y')????  ?                     ??         ???      ??")

    @GetMapping("/reflected")

    public ResponseEntity<ApiResponse<List<MainImageDto>>> getReflectedMainImages() {

        return ResponseEntity.ok(ApiResponse.success(mainImageService.getReflectedMainImages()));

    }

}