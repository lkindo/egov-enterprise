package com.company.project.api.controller.system;

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
import org.springframework.web.bind.annotation.*;

@Tag(name = "Congratulation (Admin)", description = "시스템 경조사 관리 API (관리자용)")
@RestController("systemCongratulationManageController")
@RequestMapping("/api/v1/admin/system/congratulations")
@RequiredArgsConstructor
public class CongratulationManageController {

    private final CongratulationService congratulationService;

    @Operation(summary = "전체 경조사 목록 조회", description = "관리자가 시스템에 등록된 모든 경조사 내역을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CongratulationDto>>> getCongratulationList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(congratulationService.getCongratulationList(searchWrd, pageable)));
    }

    @Operation(summary = "경조사 상세 조회", description = "특정 경조사의 상세 내용을 조회합니다.")
    @GetMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<CongratulationDto>> getCongratulation(@PathVariable String congratulationId) {
        return ResponseEntity.ok(ApiResponse.success(congratulationService.getCongratulation(congratulationId)));
    }

    @Operation(summary = "경조사 직접 등록", description = "관리자가 경조사 내역을 직접 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createCongratulation(@RequestBody CongratulationDto dto) {
        return ResponseEntity.ok(ApiResponse.success(congratulationService.createCongratulation("ADMIN", dto)));
    }

    @Operation(summary = "경조사 정보 수정", description = "기존 경조사 정보를 수정합니다.")
    @PutMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<Void>> updateCongratulation(
            @PathVariable String congratulationId,
            @RequestBody CongratulationDto dto) {
        congratulationService.updateCongratulation(congratulationId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "경조사 내역 삭제", description = "경조사 내역을 시스템에서 삭제합니다.")
    @DeleteMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<Void>> deleteCongratulation(@PathVariable String congratulationId) {
        congratulationService.deleteCongratulation(congratulationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "경조사 승인 처리", description = "신청된 경조사를 승인 또는 반려 처리합니다.")
    @PutMapping("/{congratulationId}/approval")
    public ResponseEntity<ApiResponse<Void>> approveCongratulation(
            @Parameter(description = "경조사 ID") @PathVariable String congratulationId,
            @RequestParam String confmAt,
            @RequestParam(required = false) String returnResn) {
        congratulationService.approveCongratulation(congratulationId, "ADMIN", confmAt, returnResn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
