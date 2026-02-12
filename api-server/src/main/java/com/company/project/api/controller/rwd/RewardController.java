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

    @Operation(summary = "포상 목록 조회", description = "포상 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<RewardDto>>> getRewards(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.getRewardList(searchWrd, pageable)));
    }

    @Operation(summary = "포상 상세 조회", description = "특정 포상의 상세 정보를 조회합니다.")
    @GetMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<RewardDto>> getReward(
            @Parameter(description = "포상 ID") @PathVariable String rwardId) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.getReward(rwardId)));
    }

    @Operation(summary = "포상 등록", description = "새로운 포상을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createReward(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody RewardDto rewardDto) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.createReward(userDetails.getUsername(), rewardDto)));
    }

    @Operation(summary = "포상 수정", description = "기존 포상 정보를 수정합니다.")
    @PutMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> updateReward(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "포상 ID") @PathVariable String rwardId,
            @RequestBody RewardDto rewardDto) {
        rewardService.updateReward(rwardId, userDetails.getUsername(), rewardDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "포상 삭제", description = "특정 포상을 삭제 처리합니다.")
    @DeleteMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> deleteReward(
            @Parameter(description = "포상 ID") @PathVariable String rwardId) {
        rewardService.deleteReward(rwardId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "포상 승인/반려", description = "포상 신청을 승인하거나 반려합니다.")
    @PutMapping("/{rwardId}/approval")
    public ResponseEntity<ApiResponse<Void>> approveReward(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "포상 ID") @PathVariable String rwardId,
            @RequestParam String confmAt,
            @RequestParam(required = false) String returnResn) {
        rewardService.confirmReward(rwardId, userDetails.getUsername(), confmAt, returnResn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
