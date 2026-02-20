package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.system.CtsnnManageService;

import com.company.project.service.system.dto.CtsnnManageDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Congratulation/Condolence Management", description = "Employee Events Management APIs")

@RestController("systemCtsnnManageController")

@RequestMapping("/api/v1/admin/system/ctsnn")

@RequiredArgsConstructor

public class CtsnnManageController {

    private final CtsnnManageService ctsnnManageService;

    private final EgovIdGnrService egovCtsnnIdGnrService;

@Operation(summary = "Get Ctsnn List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<CtsnnManageDto>>> getCtsnnList(

            @RequestParam(required = false) String usid,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(ctsnnManageService.getCtsnnList(usid, pageable)));

    }

@Operation(summary = "Get Ctsnn Detail")

    @GetMapping("/{ctsnnId}")

    public ResponseEntity<ApiResponse<CtsnnManageDto>> getCtsnn(@PathVariable String ctsnnId) {

        return ResponseEntity.ok(ApiResponse.success(ctsnnManageService.getCtsnn(ctsnnId)));

    }

@Operation(summary = "Create Ctsnn")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createCtsnn(@RequestBody CtsnnManageDto dto) throws Exception {

        String id = egovCtsnnIdGnrService.getNextStringId();

        dto.setCtsnnId(id);

        ctsnnManageService.createCtsnn(dto);

        return ResponseEntity.ok(ApiResponse.success(id));

    }

@Operation(summary = "Update Ctsnn")

    @PutMapping("/{ctsnnId}")

    public ResponseEntity<ApiResponse<Void>> updateCtsnn(@PathVariable String ctsnnId,

            @RequestBody CtsnnManageDto dto) {

        dto.setCtsnnId(ctsnnId);

        ctsnnManageService.updateCtsnn(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Ctsnn")

    @DeleteMapping("/{ctsnnId}")

    public ResponseEntity<ApiResponse<Void>> deleteCtsnn(@PathVariable String ctsnnId) {

        ctsnnManageService.deleteCtsnn(ctsnnId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Approve Ctsnn")

    @PostMapping("/{ctsnnId}/approve")

    public ResponseEntity<ApiResponse<Void>> approveCtsnn(@PathVariable String ctsnnId) {

        ctsnnManageService.approveCtsnn(ctsnnId, "ADMIN");

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

