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

@Tag(name = "Congratulation (User)", description = "?�의 경조??관�?API (?�용?�용)")
@RestController("userCongratulationController")
@RequestMapping("/api/v1/congratulations")
@RequiredArgsConstructor
public class CongratulationController {

    private final CongratulationService congratulationService;

    @Operation(summary = "?�의 경조??목록 조회", description = "?��? ?�청?�거???�록??경조??목록??조회?�니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CongratulationDto>>> getCongratulationList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(congratulationService.getCongratulationList(searchWrd, pageable)));
    }

    @Operation(summary = "경조???�세 조회", description = "?�정 경조?�의 ?�세 ?�용??조회?�니??")
    @GetMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<CongratulationDto>> getCongratulation(
            @Parameter(description = "경조??ID") @PathVariable String congratulationId) {
        return ResponseEntity.ok(ApiResponse.success(congratulationService.getCongratulation(congratulationId)));
    }

    @Operation(summary = "경조???�록/?�청", description = "?�로??경조???�용???�록?�거???�청?�니??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createCongratulation(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CongratulationDto dto) {
        return ResponseEntity
                .ok(ApiResponse.success(congratulationService.createCongratulation(userDetails.getUsername(), dto)));
    }

    @Operation(summary = "경조???�보 ?�정", description = "?�청??경조???�보�??�정?�니??")
    @PutMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<Void>> updateCongratulation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "경조??ID") @PathVariable String congratulationId,
            @RequestBody CongratulationDto dto) {
        congratulationService.updateCongratulation(congratulationId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "경조???�청 취소/??��", description = "?�록??경조???�청??취소?�거????��?�니??")
    @DeleteMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<Void>> deleteCongratulation(
            @Parameter(description = "경조??ID") @PathVariable String congratulationId) {
        congratulationService.deleteCongratulation(congratulationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
