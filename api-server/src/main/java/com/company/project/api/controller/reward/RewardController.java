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

@Tag(name = "Reward (User)", description = "?�의 ?�상 관�?API (?�용?�용)")
@RestController("userRewardController")
@RequestMapping("/api/v1/rewards")
@RequiredArgsConstructor
public class RewardController {

    private final RewardService rewardService;

    @Operation(summary = "?�의 ?�상 목록 조회", description = "?��? ?�청?�거??받�? ?�상 목록??조회?�니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<RewardDto>>> getRewards(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.getRewardList(searchWrd, pageable)));
    }

    @Operation(summary = "?�상 ?�세 조회", description = "?�정 ?�상???�세 ?�보�?조회?�니??")
    @GetMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<RewardDto>> getReward(
            @Parameter(description = "?�상 ID") @PathVariable String rwardId) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.getReward(rwardId)));
    }

    @Operation(summary = "?�상 ?�청", description = "?�로???�상 ?�용???�록?�거???�청?�니??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createReward(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody RewardDto rewardDto) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.createReward(userDetails.getUsername(), rewardDto)));
    }

    @Operation(summary = "?�상 ?�보 ?�정", description = "?�청???�상 ?�보�??�정?�니??")
    @PutMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> updateReward(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?�상 ID") @PathVariable String rwardId,
            @RequestBody RewardDto rewardDto) {
        rewardService.updateReward(rwardId, userDetails.getUsername(), rewardDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?�상 ?�청 취소/??��", description = "?�록???�상 ?�청??취소?�거????��?�니??")
    @DeleteMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> deleteReward(
            @Parameter(description = "?�상 ID") @PathVariable String rwardId) {
        rewardService.deleteReward(rwardId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
