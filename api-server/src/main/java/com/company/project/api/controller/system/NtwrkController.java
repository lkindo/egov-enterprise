package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.system.NtwrkService;

import com.company.project.service.system.dto.NtwrkDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Network", description = "Network Management APIs")

@RestController

@RequestMapping("/api/v1/admin/system/networks")

@RequiredArgsConstructor

public class NtwrkController {

    private final NtwrkService ntwrkService;

    private final EgovIdGnrService egovNtwrkIdGnrService;

@Operation(summary = "Get Network List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<NtwrkDto>>> getNtwrkList(

            @RequestParam(required = false) String manageIem,

            @RequestParam(required = false) String userNm,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(ntwrkService.getNtwrkList(manageIem, userNm, pageable)));

    }

@Operation(summary = "Get Network Detail")

    @GetMapping("/{ntwrkId}")

    public ResponseEntity<ApiResponse<NtwrkDto>> getNtwrk(@PathVariable String ntwrkId) {

        return ResponseEntity.ok(ApiResponse.success(ntwrkService.getNtwrk(ntwrkId)));

    }

@Operation(summary = "Create Network")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createNtwrk(@RequestBody NtwrkDto dto) throws Exception {

        String id = egovNtwrkIdGnrService.getNextStringId();

        dto.setNtwrkId(id);

        ntwrkService.createNtwrk(dto);

        return ResponseEntity.ok(ApiResponse.success(id));

    }

@Operation(summary = "Update Network")

    @PutMapping("/{ntwrkId}")

    public ResponseEntity<ApiResponse<Void>> updateNtwrk(@PathVariable String ntwrkId, @RequestBody NtwrkDto dto) {

        dto.setNtwrkId(ntwrkId);

        ntwrkService.updateNtwrk(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Network")

    @DeleteMapping("/{ntwrkId}")

    public ResponseEntity<ApiResponse<Void>> deleteNtwrk(@PathVariable String ntwrkId) {

        ntwrkService.deleteNtwrk(ntwrkId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}