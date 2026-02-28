package com.company.project.api.controller.reward;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.reward.RewardService;
import com.company.project.service.reward.dto.RewardDto;
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

@Tag(name = "Reward (User)", description = "나의 포상 관리 API (사용자용)")
@RestController("userRewardController")
@RequestMapping("/api/v1/rewards")
@RequiredArgsConstructor
public class RewardController {

    private final RewardService rewardService;

    @Operation(summary = "나의 포상 목록 조회", description = "내가 신청하거나 받은 포상 목록을 조회합니다.")
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

    @Operation(summary = "포상 신청", description = "새로운 포상 내용을 등록하거나 신청합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createReward(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody RewardDto rewardDto) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.createReward(userDetails.getUsername(), rewardDto)));
    }

    @Operation(summary = "포상 정보 수정", description = "신청한 포상 정보를 수정합니다.")
    @PutMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> updateReward(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "포상 ID") @PathVariable String rwardId,
            @RequestBody RewardDto rewardDto) {
        rewardService.updateReward(rwardId, userDetails.getUsername(), rewardDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "포상 신청 취소/삭제", description = "등록한 포상 신청을 취소하거나 삭제합니다.")
    @DeleteMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> deleteReward(
            @Parameter(description = "포상 ID") @PathVariable String rwardId) {
        rewardService.deleteReward(rwardId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
