package nuri.api.controller.business.operation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.operation.RewardManageService;
import nuri.business.service.operation.dto.RewardManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "RewardManage", description = "포상관리 API")
@RestController
@RequestMapping("/api/v1/admin/operation/rewards")
@RequiredArgsConstructor
public class RewardManageApiController {

    private final RewardManageService rewardManageService;

    @Operation(summary = "포상 목록 조회", description = "포상 정보를 페이징하여 조회한다. name 지정 시 포상명 부분일치 검색.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<RewardManageDto>>> getAllRewards(
            @RequestParam(required = false) String name,
            @PageableDefault(size = 10, sort = "crtDt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<RewardManageDto> result = rewardManageService.getRewardList(name, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "포상 등록", description = "포상 정보를 등록한다.")
    @PostMapping
    public ResponseEntity<ApiResponse<RewardManageDto>> createReward(@Valid @RequestBody RewardManageDto dto) {
        return ResponseEntity.ok(ApiResponse.success(rewardManageService.createReward(dto)));
    }

    /* [2026-09-05 DEC-OPS-036] 수정·삭제 신설 — 종전에는 GET·POST 뿐이었다(감사 D11-01). */
    @Operation(summary = "포상 수정", description = "포상 정보(수상자·코드·일자·명칭·공적 내용)를 수정한다.")
    @PutMapping("/{rwrdSn}")
    public ResponseEntity<ApiResponse<RewardManageDto>> updateReward(
            @PathVariable Long rwrdSn,
            @Valid @RequestBody RewardManageDto dto) {
        return ResponseEntity.ok(ApiResponse.success(rewardManageService.updateReward(rwrdSn, dto)));
    }

    @Operation(summary = "포상 삭제", description = "포상 정보를 삭제한다.")
    @DeleteMapping("/{rwrdSn}")
    public ResponseEntity<ApiResponse<Void>> deleteReward(@PathVariable Long rwrdSn) {
        rewardManageService.deleteReward(rwrdSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
