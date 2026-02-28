package com.company.project.api.controller.congratulation;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.congratulation.CongratulationService;
import com.company.project.service.congratulation.dto.CongratulationDto;
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

@Tag(name = "Congratulation (User)", description = "나의 경조사 관리 API (사용자용)")
@RestController("userCongratulationController")
@RequestMapping("/api/v1/congratulations")
@RequiredArgsConstructor
public class CongratulationController {

    private final CongratulationService congratulationService;

    @Operation(summary = "나의 경조사 목록 조회", description = "내가 신청하거나 등록된 경조사 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CongratulationDto>>> getCongratulationList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(congratulationService.getCongratulationList(searchWrd, pageable)));
    }

    @Operation(summary = "경조사 상세 조회", description = "특정 경조사의 상세 내용을 조회합니다.")
    @GetMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<CongratulationDto>> getCongratulation(
            @Parameter(description = "경조사 ID") @PathVariable String congratulationId) {
        return ResponseEntity.ok(ApiResponse.success(congratulationService.getCongratulation(congratulationId)));
    }

    @Operation(summary = "경조사 등록/신청", description = "새로운 경조사 내용을 등록하거나 신청합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createCongratulation(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CongratulationDto dto) {
        return ResponseEntity
                .ok(ApiResponse.success(congratulationService.createCongratulation(userDetails.getUsername(), dto)));
    }

    @Operation(summary = "경조사 정보 수정", description = "신청한 경조사 정보를 수정합니다.")
    @PutMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<Void>> updateCongratulation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "경조사 ID") @PathVariable String congratulationId,
            @RequestBody CongratulationDto dto) {
        congratulationService.updateCongratulation(congratulationId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "경조사 신청 취소/삭제", description = "등록한 경조사 신청을 취소하거나 삭제합니다.")
    @DeleteMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<Void>> deleteCongratulation(
            @Parameter(description = "경조사 ID") @PathVariable String congratulationId) {
        congratulationService.deleteCongratulation(congratulationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
