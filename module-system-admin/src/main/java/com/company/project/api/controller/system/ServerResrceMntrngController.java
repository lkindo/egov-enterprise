package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.system.monitoring.ServerResrceMntrngService;

import com.company.project.service.system.monitoring.dto.ServerResrceLogDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.format.annotation.DateTimeFormat;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@Tag(name = "Server Monitoring", description = "Server Resource Monitoring APIs")

@RestController

@RequestMapping("/api/v1/admin/system/monitoring")

@RequiredArgsConstructor

public class ServerResrceMntrngController {

    private final ServerResrceMntrngService serverResrceMntrngService;

@Operation(summary = "Get Server Resource Log List")

    @GetMapping("/logs")

    public ResponseEntity<ApiResponse<Page<ServerResrceLogDto>>> getServerResrceLogList(

            @RequestParam(required = false) String strServerNm,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDt,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDt,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(serverResrceMntrngService.getServerResrceLogList(strServerNm, startDt, endDt, pageable)));

    }

@Operation(summary = "Record Current System Resource")

    @PostMapping("/logs/record")

    public ResponseEntity<ApiResponse<Void>> recordCurrentResource(

            @RequestParam String serverId,

            @RequestParam String serverEqpmnId) throws Exception {

        serverResrceMntrngService.recordCurrentResource(serverId, serverEqpmnId, "ADMIN");

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}
