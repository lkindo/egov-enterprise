package com.company.project.api.controller.umt;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.user.EgovMberManageService;

import com.company.project.service.user.dto.GeneralUserDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "GeneralMember", description = "General Member Management APIs")

@RestController

@RequestMapping("/api/v1/members")

@RequiredArgsConstructor

public class MberManageController {

    private final EgovMberManageService mberManageService;

@Operation(summary = "??       ???                ?         ??", description = "?         ????       ???                ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<GeneralUserDto>>> getMembers(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(mberManageService.getMberList(keyword, pageable)));

    }

@Operation(summary = "??       ???    ?                   ??", description = "?     ????       ???   ???          ?         ??         ???      ??")

    @GetMapping("/{esntlId}")

    public ResponseEntity<ApiResponse<GeneralUserDto>> getMember(

            @Parameter(description = "?      ?   ID") @PathVariable String esntlId) {

        return ResponseEntity.ok(ApiResponse.success(mberManageService.getMber(esntlId)));

    }

@Operation(summary = "??       ???    ?         ", description = "??      ????       ???   ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertMember(

            @RequestBody GeneralUserDto dto) {

        mberManageService.insertMber(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??       ???    ??      ", description = "         ????       ???    ?         ????      ??      ??")

    @PutMapping("/{esntlId}")

    public ResponseEntity<ApiResponse<Void>> updateMember(

            @PathVariable String esntlId,

            @RequestBody GeneralUserDto dto) {

        dto.setEsntlId(esntlId);

        mberManageService.updateMber(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??       ???    ????", description = "?     ????       ???   ???????      ??")

    @DeleteMapping("/{esntlId}")

    public ResponseEntity<ApiResponse<Void>> deleteMember(

            @PathVariable String esntlId) {

        mberManageService.deleteMber(esntlId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??       ???    ??   ?         ??           ?", description = "??       ???   ????   ?         ?      ?              ?     ??      .")

    @PatchMapping("/{esntlId}/password")

    public ResponseEntity<ApiResponse<Void>> updatePassword(

            @PathVariable String esntlId,

            @RequestParam String password) {

        mberManageService.updatePassword(esntlId, password);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

