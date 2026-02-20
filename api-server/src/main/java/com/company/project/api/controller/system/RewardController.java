package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.system.RewardService;

import com.company.project.service.system.dto.RewardDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Reward Management", description = "Employee Reward Management APIs")

@RestController("systemRewardController")

@RequestMapping("/api/v1/admin/system/rewards")

@RequiredArgsConstructor

public class RewardController {

    private final RewardService rewardService;

    private final EgovIdGnrService egovRwardIdGnrService;

@Operation(summary = "Get Reward List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<RewardDto>>> getRewardList(

            @RequestParam(required = false) String rwardManId,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(rewardService.getRewardList(rwardManId, pageable)));

    }

@Operation(summary = "Get Reward Detail")

    @GetMapping("/{rwardId}")

    public ResponseEntity<ApiResponse<RewardDto>> getReward(@PathVariable String rwardId) {

        return ResponseEntity.ok(ApiResponse.success(rewardService.getReward(rwardId)));

    }

@Operation(summary = "Create Reward")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createReward(@RequestBody RewardDto dto) throws Exception {

        String id = egovRwardIdGnrService.getNextStringId();

        dto.setRwardId(id);

        rewardService.createReward(dto);

        return ResponseEntity.ok(ApiResponse.success(id));

    }

@Operation(summary = "Update Reward")

    @PutMapping("/{rwardId}")

    public ResponseEntity<ApiResponse<Void>> updateReward(@PathVariable String rwardId, @RequestBody RewardDto dto) {

        dto.setRwardId(rwardId);

        rewardService.updateReward(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Reward")

    @DeleteMapping("/{rwardId}")

    public ResponseEntity<ApiResponse<Void>> deleteReward(@PathVariable String rwardId) {

        rewardService.deleteReward(rwardId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Approve Reward")

    @PostMapping("/{rwardId}/approve")

    public ResponseEntity<ApiResponse<Void>> approveReward(@PathVariable String rwardId) {

        rewardService.approveReward(rwardId, "ADMIN");

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

