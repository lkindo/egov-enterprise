package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.system.ServerEqpmnService;

import com.company.project.service.system.dto.ServerEqpmnDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Server Equipment", description = "Server Equipment Management APIs")

@RestController

@RequestMapping("/api/v1/admin/system/server-equips")

@RequiredArgsConstructor

public class ServerEqpmnController {

    private final ServerEqpmnService serverEqpmnService;

    private final EgovIdGnrService egovServerEqpmnIdGnrService;

@Operation(summary = "Get Server Equipment List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<ServerEqpmnDto>>> getServerEqpmnList(

            @RequestParam(required = false) String serverEqpmnNm,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(serverEqpmnService.getServerEqpmnList(serverEqpmnNm, pageable)));

    }

@Operation(summary = "Get Server Equipment Detail")

    @GetMapping("/{serverEqpmnId}")

    public ResponseEntity<ApiResponse<ServerEqpmnDto>> getServerEqpmn(@PathVariable String serverEqpmnId) {

        return ResponseEntity.ok(ApiResponse.success(serverEqpmnService.getServerEqpmn(serverEqpmnId)));

    }

@Operation(summary = "Create Server Equipment")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createServerEqpmn(@RequestBody ServerEqpmnDto dto) throws Exception {

        String id = egovServerEqpmnIdGnrService.getNextStringId();

        dto.setServerEqpmnId(id);

        serverEqpmnService.createServerEqpmn(dto);

        return ResponseEntity.ok(ApiResponse.success(id));

    }

@Operation(summary = "Update Server Equipment")

    @PutMapping("/{serverEqpmnId}")

    public ResponseEntity<ApiResponse<Void>> updateServerEqpmn(@PathVariable String serverEqpmnId, @RequestBody ServerEqpmnDto dto) {

        dto.setServerEqpmnId(serverEqpmnId);

        serverEqpmnService.updateServerEqpmn(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Server Equipment")

    @DeleteMapping("/{serverEqpmnId}")

    public ResponseEntity<ApiResponse<Void>> deleteServerEqpmn(@PathVariable String serverEqpmnId) {

        serverEqpmnService.deleteServerEqpmn(serverEqpmnId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

