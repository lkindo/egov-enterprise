package com.company.project.api.controller.anniversary;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.anniversary.EgovAnniversaryService;
import com.company.project.service.anniversary.dto.AnniversaryDto;
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

@Tag(name = "Anniversary (User)", description = "개인 기념??관�?API (?�용?�용)")
@RestController("userAnniversaryController")
@RequestMapping("/api/v1/anniversaries")
@RequiredArgsConstructor
public class AnniversaryController {

    private final EgovAnniversaryService anniversaryService;

    @Operation(summary = "기념??검??, description = "?�스?�에 ?�록??기념?�을 검??조건???�라 ?�이�?조회?�니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<AnniversaryDto>>> getAnniversaries(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversaryList(keyword, pageable)));
    }

    @Operation(summary = "?�의 기념??목록 조회", description = "로그?�한 ?�용?��? ?�록??개인 기념??목록??조회?�니??")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<AnniversaryDto>>> getMyAnniversaries(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity
                .ok(ApiResponse.success(anniversaryService.getMyAnniversaryList(userDetails.getUsername(), pageable)));
    }

    @Operation(summary = "기념???�세 조회", description = "?�정 기념?�의 ?�세 ?�보�?조회?�니??")
    @GetMapping("/{annId}")
    public ResponseEntity<ApiResponse<AnniversaryDto>> getAnniversary(
            @Parameter(description = "기념??ID") @PathVariable String annId) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversary(annId)));
    }

    @Operation(summary = "기념???�록", description = "?�로??개인 기념?�을 ?�록?�니??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertAnniversary(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AnniversaryDto dto) {
        anniversaryService.insertAnniversary(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "기념???�정", description = "기존???�록??기념???�보�??�정?�니??")
    @PutMapping("/{annId}")
    public ResponseEntity<ApiResponse<Void>> updateAnniversary(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String annId,
            @RequestBody AnniversaryDto dto) {
        anniversaryService.updateAnniversary(annId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "기념????��", description = "?�록??기념?�을 ??��?�니??")
    @DeleteMapping("/{annId}")
    public ResponseEntity<ApiResponse<Void>> deleteAnniversary(@PathVariable String annId) {
        anniversaryService.deleteAnniversary(annId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
