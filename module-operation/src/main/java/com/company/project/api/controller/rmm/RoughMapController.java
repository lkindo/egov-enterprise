package com.company.project.api.controller.rmm;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.roughmap.EgovRoughMapService;

import com.company.project.service.roughmap.dto.RoughMapDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "RoughMap", description = "Rough Map Management APIs")

@RestController

@RequestMapping("/api/v1/rough-maps")

@RequiredArgsConstructor

public class RoughMapController {

    private final EgovRoughMapService roughMapService;

@Operation(summary = "??                   ?         ??", description = "?         ????                   ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<RoughMapDto>>> getRoughMaps(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(roughMapService.getRoughMapList(keyword, pageable)));

    }

@Operation(summary = "??       ?                   ??", description = "?     ????      ???          ?         ??         ???      ??")

    @GetMapping("/{roughMapId}")

    public ResponseEntity<ApiResponse<RoughMapDto>> getRoughMap(

            @Parameter(description = "??       ID") @PathVariable String roughMapId) {

        return ResponseEntity.ok(ApiResponse.success(roughMapService.getRoughMap(roughMapId)));

    }

@Operation(summary = "??       ?         ", description = "??      ????      ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertRoughMap(

            @RequestBody RoughMapDto dto) {

        roughMapService.insertRoughMap(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??       ??      ", description = "         ????       ?         ????      ??      ??")

    @PutMapping("/{roughMapId}")

    public ResponseEntity<ApiResponse<Void>> updateRoughMap(

            @PathVariable String roughMapId,

            @RequestBody RoughMapDto dto) {

        dto.setRoughMapId(roughMapId);

        roughMapService.updateRoughMap(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??       ????", description = "?     ????      ???????      ??")

    @DeleteMapping("/{roughMapId}")

    public ResponseEntity<ApiResponse<Void>> deleteRoughMap(

            @PathVariable String roughMapId) {

        roughMapService.deleteRoughMap(roughMapId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}
