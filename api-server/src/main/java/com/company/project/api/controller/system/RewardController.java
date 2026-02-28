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

@Tag(name = "Reward (Admin)", description = "시스템 포상 관리 API (관리자용)")
@RestController("systemRewardController")
@RequestMapping("/api/v1/admin/system/rewards")
@RequiredArgsConstructor
public class RewardController {

    private final RewardService rewardService;

    @Operation(summary = "전체 포상 목록 조회", description = "관리자가 시스템에 등록된 모든 사용자 포상 내역을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<RewardDto>>> getRewardList(
            @RequestParam(required = false) String rwardManId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.getRewardList(rwardManId, pageable)));
    }

    @Operation(summary = "포상 상세 조회", description = "특정 포상의 상세 정보를 조회합니다.")
    @GetMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<RewardDto>> getReward(@PathVariable String rwardId) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.getReward(rwardId)));
    }

    @Operation(summary = "포상 직접 등록", description = "관리자가 사용자의 포상 내역을 직접 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createReward(@RequestBody RewardDto dto) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.createReward("ADMIN", dto)));
    }

    @Operation(summary = "포상 정보 수정", description = "기존 포상 정보를 수정합니다.")
    @PutMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> updateReward(@PathVariable String rwardId, @RequestBody RewardDto dto) {
        rewardService.updateReward(rwardId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "포상 정보 삭제", description = "포상 정보를 시스템에서 삭제합니다.")
    @DeleteMapping("/{rwardId}")
    public ResponseEntity<ApiResponse<Void>> deleteReward(@PathVariable String rwardId) {
        rewardService.deleteReward(rwardId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "포상 승인 처리", description = "사용자가 신청한 포상을 승인 또는 반려 처리합니다.")
    @PutMapping("/{rwardId}/approval")
    public ResponseEntity<ApiResponse<Void>> approveReward(
            @Parameter(description = "포상 ID") @PathVariable String rwardId,
            @RequestParam String confmAt,
            @RequestParam(required = false) String returnResn) {
        rewardService.confirmReward(rwardId, "ADMIN", confmAt, returnResn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
