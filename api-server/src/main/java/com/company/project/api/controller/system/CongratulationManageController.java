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

@Tag(name = "Congratulation (Admin)", description = "?�스??경조??관�?API (관리자??")
@RestController("systemCongratulationManageController")
@RequestMapping("/api/v1/admin/system/congratulations")
@RequiredArgsConstructor
public class CongratulationManageController {

    private final CongratulationService congratulationService;

    @Operation(summary = "?�체 경조??목록 조회", description = "관리자가 ?�스?�에 ?�록??모든 경조???�역??조회?�니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CongratulationDto>>> getCongratulationList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(congratulationService.getCongratulationList(searchWrd, pageable)));
    }

    @Operation(summary = "경조???�세 조회", description = "?�정 경조?�의 ?�세 ?�용??조회?�니??")
    @GetMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<CongratulationDto>> getCongratulation(@PathVariable String congratulationId) {
        return ResponseEntity.ok(ApiResponse.success(congratulationService.getCongratulation(congratulationId)));
    }

    @Operation(summary = "경조??직접 ?�록", description = "관리자가 경조???�역??직접 ?�록?�니??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createCongratulation(@RequestBody CongratulationDto dto) {
        return ResponseEntity.ok(ApiResponse.success(congratulationService.createCongratulation("ADMIN", dto)));
    }

    @Operation(summary = "경조???�보 ?�정", description = "기존 경조???�보�??�정?�니??")
    @PutMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<Void>> updateCongratulation(
            @PathVariable String congratulationId,
            @RequestBody CongratulationDto dto) {
        congratulationService.updateCongratulation(congratulationId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "경조???�역 ??��", description = "경조???�역???�스?�에????��?�니??")
    @DeleteMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<Void>> deleteCongratulation(@PathVariable String congratulationId) {
        congratulationService.deleteCongratulation(congratulationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "경조???�인 처리", description = "?�청??경조?��? ?�인 ?�는 반려 처리?�니??")
    @PutMapping("/{congratulationId}/approval")
    public ResponseEntity<ApiResponse<Void>> approveCongratulation(
            @Parameter(description = "경조??ID") @PathVariable String congratulationId,
            @RequestParam String confmAt,
            @RequestParam(required = false) String returnResn) {
        congratulationService.approveCongratulation(congratulationId, "ADMIN", confmAt, returnResn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
