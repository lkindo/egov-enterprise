package com.company.project.api.controller.operation;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.operation.RewardManageService;
import com.company.project.service.operation.dto.RewardManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/operation/rewards")
@RequiredArgsConstructor
public class RewardManageApiController {

    private final RewardManageService rewardManageService;

    @GetMapping
    public ResponseEntity<?> getAllRewards(@RequestParam(required = false) String name) {
        if (name != null && !name.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(rewardManageService.searchByName(name)));
        }
        return ResponseEntity.ok(ApiResponse.success(rewardManageService.getAllRewards()));
    }

    @PostMapping
    public ResponseEntity<?> createReward(@RequestBody RewardManageDto dto) {
        return ResponseEntity.ok(ApiResponse.success(rewardManageService.createReward(dto)));
    }
}
