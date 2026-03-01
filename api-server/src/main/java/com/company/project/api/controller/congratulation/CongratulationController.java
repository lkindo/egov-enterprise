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

@Tag(name = "Congratulation (User)", description = "?òÏùò Í≤ΩÏ°∞??Í¥ÄÎ¶?API (?¨Ïö©?êÏö©)")
@RestController("userCongratulationController")
@RequestMapping("/api/v1/congratulations")
@RequiredArgsConstructor
public class CongratulationController {

    private final CongratulationService congratulationService;

    @Operation(summary = "?òÏùò Í≤ΩÏ°∞??Î™©Î°ù Ï°∞Ìöå", description = "?¥Í? ?†Ï≤≠?òÍ±∞???±Î°ù??Í≤ΩÏ°∞??Î™©Î°ù??Ï°∞Ìöå?©Îãà??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CongratulationDto>>> getCongratulationList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(congratulationService.getCongratulationList(searchWrd, pageable)));
    }

    @Operation(summary = "Í≤ΩÏ°∞???ÅÏÑ∏ Ï°∞Ìöå", description = "?πÏ†ï Í≤ΩÏ°∞?¨Ïùò ?ÅÏÑ∏ ?¥Ïö©??Ï°∞Ìöå?©Îãà??")
    @GetMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<CongratulationDto>> getCongratulation(
            @Parameter(description = "Í≤ΩÏ°∞??ID") @PathVariable String congratulationId) {
        return ResponseEntity.ok(ApiResponse.success(congratulationService.getCongratulation(congratulationId)));
    }

    @Operation(summary = "Í≤ΩÏ°∞???±Î°ù/?†Ï≤≠", description = "?àÎ°ú??Í≤ΩÏ°∞???¥Ïö©???±Î°ù?òÍ±∞???†Ï≤≠?©Îãà??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createCongratulation(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CongratulationDto dto) {
        return ResponseEntity
                .ok(ApiResponse.success(congratulationService.createCongratulation(userDetails.getUsername(), dto)));
    }

    @Operation(summary = "Í≤ΩÏ°∞???ïÎ≥¥ ?òÏ†ï", description = "?†Ï≤≠??Í≤ΩÏ°∞???ïÎ≥¥Î•??òÏ†ï?©Îãà??")
    @PutMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<Void>> updateCongratulation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "Í≤ΩÏ°∞??ID") @PathVariable String congratulationId,
            @RequestBody CongratulationDto dto) {
        congratulationService.updateCongratulation(congratulationId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Í≤ΩÏ°∞???†Ï≤≠ Ï∑®ÏÜå/??†ú", description = "?±Î°ù??Í≤ΩÏ°∞???†Ï≤≠??Ï∑®ÏÜå?òÍ±∞????†ú?©Îãà??")
    @DeleteMapping("/{congratulationId}")
    public ResponseEntity<ApiResponse<Void>> deleteCongratulation(
            @Parameter(description = "Í≤ΩÏ°∞??ID") @PathVariable String congratulationId) {
        congratulationService.deleteCongratulation(congratulationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
