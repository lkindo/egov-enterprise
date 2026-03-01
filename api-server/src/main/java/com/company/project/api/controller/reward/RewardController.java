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

@Tag(name = "Reward (User)", description = "?˜ì˜ ?¬ìƒ ê´€ë¦?API (?¬ìš©?ìš©)")
@RestController("userRewardController")
@RequestMapping("/api/v1/rewards")
@RequiredArgsConstructor
public class RewardController {

    private final RewardService rewardService;

    @Operation(summary = "?˜ì˜ ?¬ìƒ ëª©ë¡ ì¡°íšŒ", description = "?´ê? ? ì²­?˜ê±°??ë°›ì? ?¬ìƒ ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<RewardDto>>> getRewards(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.getRewardList(searchWrd, pageable)));
    }

    @Operation(summary = "?¬ìƒ ?ì„¸ ì¡°íšŒ", description = "?¹ì • ?¬ìƒ???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<RewardDto>> getReward(
            @Parameter(description = "?¬ìƒ ID") @PathVariable String rwardId) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.getReward(rwardId)));
    }

    @Operation(summary = "?¬ìƒ ? ì²­", description = "?ˆë¡œ???¬ìƒ ?´ìš©???±ë¡?˜ê±°??? ì²­?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createReward(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody RewardDto rewardDto) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.createReward(userDetails.getUsername(), rewardDto)));
    }

    @Operation(summary = "?¬ìƒ ?•ë³´ ?˜ì •", description = "? ì²­???¬ìƒ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> updateReward(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?¬ìƒ ID") @PathVariable String rwardId,
            @RequestBody RewardDto rewardDto) {
        rewardService.updateReward(rwardId, userDetails.getUsername(), rewardDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?¬ìƒ ? ì²­ ì·¨ì†Œ/?? œ", description = "?±ë¡???¬ìƒ ? ì²­??ì·¨ì†Œ?˜ê±°???? œ?©ë‹ˆ??")
    @DeleteMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> deleteReward(
            @Parameter(description = "?¬ìƒ ID") @PathVariable String rwardId) {
        rewardService.deleteReward(rwardId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
