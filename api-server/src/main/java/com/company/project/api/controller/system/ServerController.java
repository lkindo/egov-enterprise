package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.system.ServerService;

import com.company.project.service.system.dto.ServerDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Server", description = "Server Management APIs")

@RestController

@RequestMapping("/api/v1/admin/system/servers")

@RequiredArgsConstructor

public class ServerController {

    private final ServerService serverService;

    private final EgovIdGnrService egovServerIdGnrService;

@Operation(summary = "Get Server List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<ServerDto>>> getServerList(

            @RequestParam(required = false) String serverNm,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(serverService.getServerList(serverNm, pageable)));

    }

@Operation(summary = "Get Server Detail")

    @GetMapping("/{serverId}")

    public ResponseEntity<ApiResponse<ServerDto>> getServer(@PathVariable String serverId) {

        return ResponseEntity.ok(ApiResponse.success(serverService.getServer(serverId)));

    }

@Operation(summary = "Create Server")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createServer(@RequestBody ServerDto dto) throws Exception {

        String id = egovServerIdGnrService.getNextStringId();

        dto.setServerId(id);

        serverService.createServer(dto);

        return ResponseEntity.ok(ApiResponse.success(id));

    }

@Operation(summary = "Update Server")

    @PutMapping("/{serverId}")

    public ResponseEntity<ApiResponse<Void>> updateServer(@PathVariable String serverId, @RequestBody ServerDto dto) {

        dto.setServerId(serverId);

        serverService.updateServer(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Server")

    @DeleteMapping("/{serverId}")

    public ResponseEntity<ApiResponse<Void>> deleteServer(@PathVariable String serverId) {

        serverService.deleteServer(serverId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}