package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.system.monitoring.TrsmrcvMntrngService;

import com.company.project.service.system.monitoring.dto.TrsmrcvMntrngDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Transmission Monitoring", description = "Transmission/Reception Service Monitoring APIs")

@RestController

@RequestMapping("/api/v1/admin/system/trsmrcv-monitoring")

@RequiredArgsConstructor

public class TrsmrcvMntrngController {

    private final TrsmrcvMntrngService trsmrcvMntrngService;

@Operation(summary = "Get Transmission Monitor List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<TrsmrcvMntrngDto>>> getTrsmrcvMntrngList(

            @RequestParam(required = false) String mngrNm,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(trsmrcvMntrngService.getTrsmrcvMntrngList(mngrNm, pageable)));

    }

@Operation(summary = "Create Transmission Monitor")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> createTrsmrcvMntrng(@RequestBody TrsmrcvMntrngDto dto) {

        dto.setFrstRegisterId("ADMIN");

        dto.setLastUpdusrId("ADMIN");

        trsmrcvMntrngService.createTrsmrcvMntrng(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Check and Record Transmission Status")

    @PostMapping("/{cntcId}/check")

    public ResponseEntity<ApiResponse<Void>> checkTrsmrcvStatus(@PathVariable String cntcId) throws Exception {

        trsmrcvMntrngService.checkAndRecordTrsmrcvStatus(cntcId, "ADMIN");

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Transmission Monitor")

    @DeleteMapping("/{cntcId}")

    public ResponseEntity<ApiResponse<Void>> deleteTrsmrcvMntrng(@PathVariable String cntcId) {

        trsmrcvMntrngService.deleteTrsmrcvMntrng(cntcId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}
