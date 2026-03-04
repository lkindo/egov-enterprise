package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.system.monitoring.NtwrkSvcMntrngService;

import com.company.project.service.system.monitoring.dto.NtwrkSvcMntrngDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Network Service Monitoring", description = "Network Service Availability Monitoring APIs")

@RestController

@RequestMapping("/api/v1/admin/system/ntwrksvc-monitoring")

@RequiredArgsConstructor

public class NtwrkSvcMntrngController {

    private final NtwrkSvcMntrngService ntwrkSvcMntrngService;

@Operation(summary = "Get Network Service Monitor List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<NtwrkSvcMntrngDto>>> getNtwrkSvcMntrngList(

            @RequestParam(required = false) String sysNm,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(ntwrkSvcMntrngService.getNtwrkSvcMntrngList(sysNm, pageable)));

    }

@Operation(summary = "Create Network Service Monitor")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> createNtwrkSvcMntrng(@RequestBody NtwrkSvcMntrngDto dto) {

        dto.setFrstRegisterId("ADMIN");

        dto.setLastUpdusrId("ADMIN");

        ntwrkSvcMntrngService.createNtwrkSvcMntrng(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Check and Record Network Service Status")

    @PostMapping("/check")

    public ResponseEntity<ApiResponse<Void>> checkNtwrkSvcStatus(

            @RequestParam String sysIp,

            @RequestParam Integer sysPort) throws Exception {

        ntwrkSvcMntrngService.checkAndRecordNtwrkSvcStatus(sysIp, sysPort, "ADMIN");

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Network Service Monitor")

    @DeleteMapping

    public ResponseEntity<ApiResponse<Void>> deleteNtwrkSvcMntrng(

            @RequestParam String sysIp,

            @RequestParam Integer sysPort) {

        ntwrkSvcMntrngService.deleteNtwrkSvcMntrng(sysIp, sysPort);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}