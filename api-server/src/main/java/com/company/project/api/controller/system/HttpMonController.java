package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.system.monitoring.HttpMonService;

import com.company.project.service.system.monitoring.dto.HttpMonDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "HTTP Monitoring", description = "Web Service/URL Monitoring APIs")

@RestController

@RequestMapping("/api/v1/admin/system/http-monitoring")

@RequiredArgsConstructor

public class HttpMonController {

    private final HttpMonService httpMonService;

@Operation(summary = "Get HTTP Monitor List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<HttpMonDto>>> getHttpMonList(

            @RequestParam(required = false) String mngrNm,

            @RequestParam(required = false) String httpSttusCd,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(httpMonService.getHttpMonList(mngrNm, httpSttusCd, pageable)));

    }

@Operation(summary = "Create HTTP Monitor")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> createHttpMon(@RequestBody HttpMonDto dto) {

        dto.setFrstRegisterId("ADMIN");

        dto.setLastUpdusrId("ADMIN");

        httpMonService.createHttpMon(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Check and Record HTTP Status")

    @PostMapping("/{sysId}/check")

    public ResponseEntity<ApiResponse<Void>> checkHttpStatus(@PathVariable String sysId) throws Exception {

        httpMonService.checkAndRecordHttpStatus(sysId, "ADMIN");

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete HTTP Monitor")

    @DeleteMapping("/{sysId}")

    public ResponseEntity<ApiResponse<Void>> deleteHttpMon(@PathVariable String sysId) {

        httpMonService.deleteHttpMon(sysId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

