package com.company.project.api.controller.umt;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.user.EgovEntrprsManageService;

import com.company.project.service.user.dto.EnterpriseUserDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "EnterpriseMember", description = "Enterprise Member Management APIs")

@RestController

@RequestMapping("/api/v1/enterprises")

@RequiredArgsConstructor

public class EntrprsManageController {

    private final EgovEntrprsManageService entrprsManageService;

@Operation(summary = "            ????                ?         ??", description = "?         ??            ????                ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<EnterpriseUserDto>>> getEnterprises(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(entrprsManageService.getEntrprsList(keyword, pageable)));

    }

@Operation(summary = "            ????    ?                   ??", description = "?     ??            ????   ???          ?         ??         ???      ??")

    @GetMapping("/{esntlId}")

    public ResponseEntity<ApiResponse<EnterpriseUserDto>> getEnterprise(

            @Parameter(description = "?      ?   ID") @PathVariable String esntlId) {

        return ResponseEntity.ok(ApiResponse.success(entrprsManageService.getEntrprs(esntlId)));

    }

@Operation(summary = "            ????    ?         ", description = "??      ??            ????   ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertEnterprise(

            @RequestBody EnterpriseUserDto dto) {

        entrprsManageService.insertEntrprs(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "            ????    ??      ", description = "         ??            ????    ?         ????      ??      ??")

    @PutMapping("/{esntlId}")

    public ResponseEntity<ApiResponse<Void>> updateEnterprise(

            @PathVariable String esntlId,

            @RequestBody EnterpriseUserDto dto) {

        dto.setEsntlId(esntlId);

        entrprsManageService.updateEntrprs(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "            ????    ????", description = "?     ??            ????   ???????      ??")

    @DeleteMapping("/{esntlId}")

    public ResponseEntity<ApiResponse<Void>> deleteEnterprise(

            @PathVariable String esntlId) {

        entrprsManageService.deleteEntrprs(esntlId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "            ????    ??   ?         ??           ?", description = "            ????   ????   ?         ?      ?              ?     ??      .")

    @PatchMapping("/{esntlId}/password")

    public ResponseEntity<ApiResponse<Void>> updatePassword(

            @PathVariable String esntlId,

            @RequestParam String password) {

        entrprsManageService.updatePassword(esntlId, password);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

