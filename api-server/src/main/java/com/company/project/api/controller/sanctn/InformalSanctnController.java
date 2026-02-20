package com.company.project.api.controller.sanctn;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.sanctn.EgovInformalSanctnService;

import com.company.project.service.sanctn.dto.InformalSanctnDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.security.core.userdetails.UserDetails;

import org.springframework.web.bind.annotation.*;

@Tag(name = "InformalSanction", description = "Informal Sanction Management APIs")

@RestController

@RequestMapping("/api/v1/sanctions")

@RequiredArgsConstructor

public class InformalSanctnController {

    private final EgovInformalSanctnService informalSanctnService;

@Operation(summary = "??? ?         ??         ??            ?         ??", description = "??? ?         ????                ??            ????                  ??         ???      ??")

    @GetMapping("/my")

    public ResponseEntity<ApiResponse<Page<InformalSanctnDto>>> getMySanctions(

            @AuthenticationPrincipal UserDetails userDetails,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(informalSanctnService.getInfrmlSanctnList(userDetails.getUsername(), pageable)));

    }

@Operation(summary = "???          ?          ??            ?         ??", description = "??         ??         ????                ??            ????                  ??         ???      ??")

    @GetMapping("/received")

    public ResponseEntity<ApiResponse<Page<InformalSanctnDto>>> getReceivedSanctions(

            @AuthenticationPrincipal UserDetails userDetails,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(informalSanctnService.getReceivedInfrmlSanctnList(userDetails.getUsername(), pageable)));

    }

@Operation(summary = "??               ???                   ??", description = "??                ????          ?         ??         ???      ??")

    @GetMapping("/{infrmlSanctnId}")

    public ResponseEntity<ApiResponse<InformalSanctnDto>> getSanction(

            @Parameter(description = "??               ??ID") @PathVariable String infrmlSanctnId) {

        return ResponseEntity.ok(ApiResponse.success(informalSanctnService.getInfrmlSanctn(infrmlSanctnId)));

    }

@Operation(summary = "??               ???         ", description = "??      ????                ?      ??         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> registerSanction(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody InformalSanctnDto dto) {

        dto.setApplcntId(userDetails.getUsername());

        informalSanctnService.registerInfrmlSanctn(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??               ????      ", description = "         ????                ???         ????      ??      ??")

    @PutMapping("/{infrmlSanctnId}")

    public ResponseEntity<ApiResponse<Void>> updateSanction(

            @PathVariable String infrmlSanctnId,

            @RequestBody InformalSanctnDto dto) {

        dto.setInfrmlSanctnId(infrmlSanctnId);

        informalSanctnService.updateInfrmlSanctn(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??               ??????", description = "??                ???         ???????      ??")

    @DeleteMapping("/{infrmlSanctnId}")

    public ResponseEntity<ApiResponse<Void>> deleteSanction(

            @PathVariable String infrmlSanctnId) {

        informalSanctnService.deleteInfrmlSanctn(infrmlSanctnId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??               ???     ??         ??", description = "??                ???         ???     ???      ??         ???      ??")

    @PatchMapping("/{infrmlSanctnId}/confirm")

    public ResponseEntity<ApiResponse<Void>> confirmSanction(

            @PathVariable String infrmlSanctnId,

            @RequestParam String confmAt,

            @RequestParam(required = false) String returnResn) {

        informalSanctnService.confirmInfrmlSanctn(infrmlSanctnId, confmAt, returnResn);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

