package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.trouble.TroblService;

import com.company.project.service.trouble.dto.TroblDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Trouble", description = "Trouble Management APIs")

@RestController

@RequestMapping("/api/v1/admin/system/troubles")

@RequiredArgsConstructor

public class TroblController {

    private final TroblService troblService;

    private final EgovIdGnrService egovTroblIdGnrService;

@Operation(summary = "Get Trouble List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<TroblDto>>> getTroblList(

            @RequestParam(required = false) String strTroblNm,

            @RequestParam(required = false, defaultValue = "00") String strTroblKnd,

            @RequestParam(required = false, defaultValue = "00") String strProcessSttus,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(troblService.getTroblList(strTroblNm, strTroblKnd, strProcessSttus, pageable)));

    }

@Operation(summary = "Get Trouble Process List")

    @GetMapping("/processes")

    public ResponseEntity<ApiResponse<Page<TroblDto>>> getTroblProcessList(

            @RequestParam(required = false) String strTroblNm,

            @RequestParam(required = false, defaultValue = "00") String strTroblKnd,

            @RequestParam(required = false, defaultValue = "00") String strProcessSttus,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(troblService.getTroblProcessList(strTroblNm, strTroblKnd, strProcessSttus, pageable)));

    }

@Operation(summary = "Get Trouble Detail")

    @GetMapping("/{troblId}")

    public ResponseEntity<ApiResponse<TroblDto>> getTrobl(@PathVariable String troblId) {

        return ResponseEntity.ok(ApiResponse.success(troblService.getTrobl(troblId)));

    }

@Operation(summary = "Create Trouble")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createTrobl(@RequestBody TroblDto dto) throws Exception {

        String id = egovTroblIdGnrService.getNextStringId();

        dto.setTroblId(id);

        // Placeholder for user ID. In production, resolve from SecurityContext.

        dto.setFrstRegisterId("ADMIN");

        dto.setLastUpdusrId("ADMIN");

        troblService.createTrobl(dto);

        return ResponseEntity.ok(ApiResponse.success(id));

    }

@Operation(summary = "Update Trouble")

    @PutMapping("/{troblId}")

    public ResponseEntity<ApiResponse<Void>> updateTrobl(@PathVariable String troblId, @RequestBody TroblDto dto) {

        dto.setTroblId(troblId);

        dto.setLastUpdusrId("ADMIN");

        troblService.updateTrobl(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Request Trouble Processing")

    @PatchMapping("/{troblId}/request")

    public ResponseEntity<ApiResponse<Void>> requestTrobl(@PathVariable String troblId) {

        troblService.requestTrobl(troblId, "ADMIN");

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Process Trouble")

    @PatchMapping("/{troblId}/process")

    public ResponseEntity<ApiResponse<Void>> processTrobl(@PathVariable String troblId, @RequestBody TroblDto dto) {

        dto.setTroblId(troblId);

        dto.setLastUpdusrId("ADMIN");

        troblService.processTrobl(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Trouble")

    @DeleteMapping("/{troblId}")

    public ResponseEntity<ApiResponse<Void>> deleteTrobl(@PathVariable String troblId) {

        troblService.deleteTrobl(troblId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

