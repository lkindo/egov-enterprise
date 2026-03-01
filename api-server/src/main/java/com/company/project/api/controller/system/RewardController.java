package com.company.project.api.controller.system;

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
import org.springframework.web.bind.annotation.*;

@Tag(name = "Reward (Admin)", description = "?œìŠ¤???¬ìƒ ê´€ë¦?API (ê´€ë¦¬ì??")
@RestController("systemRewardController")
@RequestMapping("/api/v1/admin/system/rewards")
@RequiredArgsConstructor
public class RewardController {

    private final RewardService rewardService;

    @Operation(summary = "?„ì²´ ?¬ìƒ ëª©ë¡ ì¡°íšŒ", description = "ê´€ë¦¬ìê°€ ?œìŠ¤?œì— ?±ë¡??ëª¨ë“  ?¬ìš©???¬ìƒ ?´ì—­??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<RewardDto>>> getRewardList(
            @RequestParam(required = false) String rwardManId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.getRewardList(rwardManId, pageable)));
    }

    @Operation(summary = "?¬ìƒ ?ì„¸ ì¡°íšŒ", description = "?¹ì • ?¬ìƒ???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<RewardDto>> getReward(@PathVariable String rwardId) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.getReward(rwardId)));
    }

    @Operation(summary = "?¬ìƒ ì§ì ‘ ?±ë¡", description = "ê´€ë¦¬ìê°€ ?¬ìš©?ì˜ ?¬ìƒ ?´ì—­??ì§ì ‘ ?±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createReward(@RequestBody RewardDto dto) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.createReward("ADMIN", dto)));
    }

    @Operation(summary = "?¬ìƒ ?•ë³´ ?˜ì •", description = "ê¸°ì¡´ ?¬ìƒ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> updateReward(@PathVariable String rwardId, @RequestBody RewardDto dto) {
        rewardService.updateReward(rwardId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?¬ìƒ ?•ë³´ ?? œ", description = "?¬ìƒ ?•ë³´ë¥??œìŠ¤?œì—???? œ?©ë‹ˆ??")
    @DeleteMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> deleteReward(@PathVariable String rwardId) {
        rewardService.deleteReward(rwardId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?¬ìƒ ?¹ì¸ ì²˜ë¦¬", description = "?¬ìš©?ê? ? ì²­???¬ìƒ???¹ì¸ ?ëŠ” ë°˜ë ¤ ì²˜ë¦¬?©ë‹ˆ??")
    @PutMapping("/{rwardId}/approval")
    public ResponseEntity<ApiResponse<Void>> approveReward(
            @Parameter(description = "?¬ìƒ ID") @PathVariable String rwardId,
            @RequestParam String confmAt,
            @RequestParam(required = false) String returnResn) {
        rewardService.confirmReward(rwardId, "ADMIN", confmAt, returnResn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
