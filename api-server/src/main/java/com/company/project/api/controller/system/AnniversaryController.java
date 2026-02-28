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

@Tag(name = "Anniversary (Admin)", description = "시스템 기념일 관리 API (관리자용)")
@RestController("systemAnniversaryController")
@RequestMapping("/api/v1/admin/system/anniversaries")
@RequiredArgsConstructor
public class AnniversaryController {

    private final EgovAnniversaryService anniversaryService;

    @Operation(summary = "전체 기념일 목록 조회", description = "관리자가 시스템에 등록된 모든 기념일을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<AnniversaryDto>>> getAnniversaryList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversaryList(searchWrd, pageable)));
    }

    @Operation(summary = "기념일 상세 조회", description = "특정 기념일의 상세 정보를 조회합니다.")
    @GetMapping("/{annId}")
    public ResponseEntity<ApiResponse<AnniversaryDto>> getAnniversary(@PathVariable String annId) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversary(annId)));
    }

    @Operation(summary = "공통 기념일 등록", description = "시스템 공통 기념일 또는 특정 회원을 위한 기념일을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createAnniversary(@RequestBody AnniversaryDto dto) {
        anniversaryService.insertAnniversary("SYSTEM", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "기념일 정보 수정", description = "기존 기념일 정보를 수정합니다.")
    @PutMapping("/{annId}")
    public ResponseEntity<ApiResponse<Void>> updateAnniversary(
            @PathVariable String annId,
            @RequestBody AnniversaryDto dto) {
        anniversaryService.updateAnniversary(annId, "SYSTEM", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "기념일 삭제", description = "기념일 정보를 시스템에서 삭제합니다.")
    @DeleteMapping("/{annId}")
    public ResponseEntity<ApiResponse<Void>> deleteAnniversary(@PathVariable String annId) {
        anniversaryService.deleteAnniversary(annId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
