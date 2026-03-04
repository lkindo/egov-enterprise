package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.anniversary.EgovAnniversaryService;
import com.company.project.service.anniversary.dto.AnniversaryDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Anniversary (Admin)", description = "?스??기념??관?API (관리자??")
@RestController("systemAnniversaryController")
@RequestMapping("/api/v1/admin/system/anniversaries")
@RequiredArgsConstructor
public class AnniversaryController {

    private final EgovAnniversaryService anniversaryService;

    @Operation(summary = "?체 기념??목록 조회", description = "관리자가 ?스?에 ?록??모든 기념?을 조회?니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<AnniversaryDto>>> getAnniversaryList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversaryList(searchWrd, pageable)));
    }

    @Operation(summary = "기념???세 조회", description = "?정 기념?의 ?세 ?보?조회?니??")
    @GetMapping("/{annId}")
    public ResponseEntity<ApiResponse<AnniversaryDto>> getAnniversary(@PathVariable String annId) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversary(annId)));
    }

    @Operation(summary = "공통 기념???록", description = "?스??공통 기념???는 ?정 ?원???한 기념?을 ?록?니??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createAnniversary(@RequestBody AnniversaryDto dto) {
        anniversaryService.insertAnniversary("SYSTEM", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "기념???보 ?정", description = "기존 기념???보??정?니??")
    @PutMapping("/{annId}")
    public ResponseEntity<ApiResponse<Void>> updateAnniversary(
            @PathVariable String annId,
            @RequestBody AnniversaryDto dto) {
        anniversaryService.updateAnniversary(annId, "SYSTEM", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "기념????", description = "기념???보??스?에?????니??")
    @DeleteMapping("/{annId}")
    public ResponseEntity<ApiResponse<Void>> deleteAnniversary(@PathVariable String annId) {
        anniversaryService.deleteAnniversary(annId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}