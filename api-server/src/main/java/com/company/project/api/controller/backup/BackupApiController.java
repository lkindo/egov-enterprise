package com.company.project.api.controller.backup;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.backup.EgovBackupOpertService;

import com.company.project.service.backup.EgovBackupResultService;

import com.company.project.service.backup.dto.BackupOpertDto;

import com.company.project.service.backup.dto.BackupResultDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Backup", description = "Backup Management APIs")

@RestController

@RequestMapping("/api/v1/admin/system/backups")

@RequiredArgsConstructor

public class BackupApiController {

    private final EgovBackupOpertService backupOpertService;

    private final EgovBackupResultService backupResultService;

    private final EgovIdGnrService egovBackupOpertIdGnrService;

    // --- Operations ---

@Operation(summary = "Get Backup Operation List")

    @GetMapping("/operations")

    public ResponseEntity<ApiResponse<Page<BackupOpertDto>>> getBackupOpertList(

            @RequestParam(required = false) String condition,

            @RequestParam(required = false) String keyword,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(backupOpertService.getBackupOpertList(condition, keyword, pageable)));

    }

@Operation(summary = "Get Backup Operation Detail")

    @GetMapping("/operations/{backupOpertId}")

    public ResponseEntity<ApiResponse<BackupOpertDto>> getBackupOpert(@PathVariable String backupOpertId) {

        return ResponseEntity.ok(ApiResponse.success(backupOpertService.getBackupOpert(backupOpertId)));

    }

@Operation(summary = "Create Backup Operation")

    @PostMapping("/operations")

    public ResponseEntity<ApiResponse<String>> createBackupOpert(@RequestBody BackupOpertDto dto) throws Exception {

        String id = egovBackupOpertIdGnrService.getNextStringId();

        dto.setBackupOpertId(id);

        // Using "ADMIN" as placeholder user ID. In production, resolve from SecurityContext.

        backupOpertService.createBackupOpert("ADMIN", dto);

        return ResponseEntity.ok(ApiResponse.success(id));

    }

@Operation(summary = "Update Backup Operation")

    @PutMapping("/operations/{backupOpertId}")

    public ResponseEntity<ApiResponse<Void>> updateBackupOpert(@PathVariable String backupOpertId, @RequestBody BackupOpertDto dto) {

        dto.setBackupOpertId(backupOpertId);

        // Using "ADMIN" as placeholder user ID. In production, resolve from SecurityContext.

        backupOpertService.updateBackupOpert(backupOpertId, "ADMIN", dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Backup Operation")

    @DeleteMapping("/operations/{backupOpertId}")

    public ResponseEntity<ApiResponse<Void>> deleteBackupOpert(@PathVariable String backupOpertId) {

        backupOpertService.deleteBackupOpert(backupOpertId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

    // --- Results ---

@Operation(summary = "Get Backup Result List")

    @GetMapping("/results")

    public ResponseEntity<ApiResponse<Page<BackupResultDto>>> getBackupResultList(

            @RequestParam(required = false) String sttus,

            @RequestParam(required = false) String searchFrom,

            @RequestParam(required = false) String searchTo,

            @RequestParam(required = false) String condition,

            @RequestParam(required = false) String keyword,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(backupResultService.getBackupResultList(sttus, searchFrom, searchTo, condition, keyword, pageable)));

    }

}
