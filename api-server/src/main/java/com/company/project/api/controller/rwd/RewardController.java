package com.company.project.api.controller.rwd;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.rwd.RewardService;

import com.company.project.service.rwd.dto.RewardDto;

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

@Tag(name = "Reward", description = "Reward Management APIs")

@RestController

@RequestMapping("/api/v1/rewards")

@RequiredArgsConstructor

public class RewardController {

    private final RewardService rewardService;

@Operation(summary = "??   ?            ?         ??", description = "??   ?            ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<RewardDto>>> getRewards(

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(rewardService.getRewardList(searchWrd, pageable)));

    }

@Operation(summary = "??   ??                   ??", description = "?     ????   ???          ?         ??         ???      ??")

    @GetMapping("/{rwardId}")

    public ResponseEntity<ApiResponse<RewardDto>> getReward(

            @Parameter(description = "??   ?ID") @PathVariable String rwardId) {

        return ResponseEntity.ok(ApiResponse.success(rewardService.getReward(rwardId)));

    }

@Operation(summary = "??   ??         ", description = "??      ????   ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createReward(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody RewardDto rewardDto) {

        return ResponseEntity.ok(ApiResponse.success(rewardService.createReward(userDetails.getUsername(), rewardDto)));

    }

@Operation(summary = "??   ???      ", description = "         ????   ??         ????      ??      ??")

    @PutMapping("/{rwardId}")

    public ResponseEntity<ApiResponse<Void>> updateReward(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "??   ?ID") @PathVariable String rwardId,

            @RequestBody RewardDto rewardDto) {

        rewardService.updateReward(rwardId, userDetails.getUsername(), rewardDto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??   ?????", description = "?     ????   ??????         ???      ??")

    @DeleteMapping("/{rwardId}")

    public ResponseEntity<ApiResponse<Void>> deleteReward(

            @Parameter(description = "??   ?ID") @PathVariable String rwardId) {

        rewardService.deleteReward(rwardId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??   ??     ??         ??", description = "??   ??         ???     ???      ??         ???      ??")

    @PutMapping("/{rwardId}/approval")

    public ResponseEntity<ApiResponse<Void>> approveReward(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "??   ?ID") @PathVariable String rwardId,

            @RequestParam String confmAt,

            @RequestParam(required = false) String returnResn) {

        rewardService.confirmReward(rwardId, userDetails.getUsername(), confmAt, returnResn);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

