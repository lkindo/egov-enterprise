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

@Tag(name = "Reward (Admin)", description = "?스???상 관?API (관리자??")
@RestController("systemRewardController")
@RequestMapping("/api/v1/admin/system/rewards")
@RequiredArgsConstructor
public class RewardController {

    private final RewardService rewardService;

    @Operation(summary = "?체 ?상 목록 조회", description = "관리자가 ?스?에 ?록??모든 ?용???상 ?역??조회?니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<RewardDto>>> getRewardList(
            @RequestParam(required = false) String rwardManId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.getRewardList(rwardManId, pageable)));
    }

    @Operation(summary = "?상 ?세 조회", description = "?정 ?상???세 ?보?조회?니??")
    @GetMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<RewardDto>> getReward(@PathVariable String rwardId) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.getReward(rwardId)));
    }

    @Operation(summary = "?상 직접 ?록", description = "관리자가 ?용?의 ?상 ?역??직접 ?록?니??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createReward(@RequestBody RewardDto dto) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.createReward("ADMIN", dto)));
    }

    @Operation(summary = "?상 ?보 ?정", description = "기존 ?상 ?보??정?니??")
    @PutMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> updateReward(@PathVariable String rwardId, @RequestBody RewardDto dto) {
        rewardService.updateReward(rwardId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?상 ?보 ??", description = "?상 ?보??스?에?????니??")
    @DeleteMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> deleteReward(@PathVariable String rwardId) {
        rewardService.deleteReward(rwardId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?상 ?인 처리", description = "?용?? ?청???상???인 ?는 반려 처리?니??")
    @PutMapping("/{rwardId}/approval")
    public ResponseEntity<ApiResponse<Void>> approveReward(
            @Parameter(description = "?상 ID") @PathVariable String rwardId,
            @RequestParam String confmAt,
            @RequestParam(required = false) String returnResn) {
        rewardService.confirmReward(rwardId, "ADMIN", confmAt, returnResn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
