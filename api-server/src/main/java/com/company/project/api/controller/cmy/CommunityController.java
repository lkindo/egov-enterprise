package com.company.project.api.controller.cmy;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.cmy.CommunityService;

import com.company.project.service.cmy.dto.CommunityDto;

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

import java.util.List;

@Tag(name = "Community", description = "Community Management APIs")

@RestController

@RequestMapping("/api/v1/communities")

@RequiredArgsConstructor

public class CommunityController {

    private final CommunityService communityService;

@Operation(summary = "?      ???                   ?         ??", description = "?      ???                   ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<CommunityDto>>> getCommunities(

            @RequestParam(required = false) String searchCnd,

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(communityService.getCommunityList(searchCnd, searchWrd, pageable)));

    }

@Operation(summary = "?      ???       ?                   ??", description = "?     ???      ???      ???          ?         ??         ???      ??")

    @GetMapping("/{cmmntyId}")

    public ResponseEntity<ApiResponse<CommunityDto>> getCommunity(

            @Parameter(description = "?      ???       ID") @PathVariable String cmmntyId) {

        return ResponseEntity.ok(ApiResponse.success(communityService.getCommunity(cmmntyId)));

    }

@Operation(summary = "?      ???       ?         ", description = "??      ???      ???      ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<CommunityDto>> createCommunity(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody CommunityDto communityDto) {

        return ResponseEntity.ok(ApiResponse.success(communityService.createCommunity(userDetails.getUsername(), communityDto)));

    }

@Operation(summary = "?      ???       ??      ", description = "?      ???       ?         ????      ??      ??")

    @PutMapping("/{cmmntyId}")

    public ResponseEntity<ApiResponse<Void>> updateCommunity(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "?      ???       ID") @PathVariable String cmmntyId,

            @RequestBody CommunityDto communityDto) {

        communityDto.setCmmntyId(cmmntyId);

        communityService.updateCommunity(userDetails.getUsername(), communityDto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "?      ???       ????", description = "?      ???      ????????   ??         )          ???      ??")

    @DeleteMapping("/{cmmntyId}")

    public ResponseEntity<ApiResponse<Void>> deleteCommunity(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "?      ???       ID") @PathVariable String cmmntyId) {

        communityService.deleteCommunity(cmmntyId, userDetails.getUsername());

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "????      ???      ???                   ?", description = "????         ???      ????       ?      ???                   ??         ???      ??")

    @GetMapping("/portlet")

    public ResponseEntity<ApiResponse<List<CommunityDto>>> getCommunityPortlet() {

        return ResponseEntity.ok(ApiResponse.success(communityService.getCommunityListPortlet()));

    }

}

