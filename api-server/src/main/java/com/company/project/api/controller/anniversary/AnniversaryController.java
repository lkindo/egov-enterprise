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

@Tag(name = "Anniversary (User)", description = "개인 기념일 관리 API (사용자용)")
@RestController("userAnniversaryController")
@RequestMapping("/api/v1/anniversaries")
@RequiredArgsConstructor
public class AnniversaryController {

    private final EgovAnniversaryService anniversaryService;

    @Operation(summary = "기념일 검색", description = "시스템에 등록된 기념일을 검색 조건에 따라 페이징 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<AnniversaryDto>>> getAnniversaries(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversaryList(keyword, pageable)));
    }

    @Operation(summary = "나의 기념일 목록 조회", description = "로그인한 사용자가 등록한 개인 기념일 목록을 조회합니다.")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<AnniversaryDto>>> getMyAnniversaries(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity
                .ok(ApiResponse.success(anniversaryService.getMyAnniversaryList(userDetails.getUsername(), pageable)));
    }

    @Operation(summary = "기념일 상세 조회", description = "특정 기념일의 상세 정보를 조회합니다.")
    @GetMapping("/{annId}")
    public ResponseEntity<ApiResponse<AnniversaryDto>> getAnniversary(
            @Parameter(description = "기념일 ID") @PathVariable String annId) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversary(annId)));
    }

    @Operation(summary = "기념일 등록", description = "새로운 개인 기념일을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertAnniversary(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AnniversaryDto dto) {
        anniversaryService.insertAnniversary(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "기념일 수정", description = "기존에 등록한 기념일 정보를 수정합니다.")
    @PutMapping("/{annId}")
    public ResponseEntity<ApiResponse<Void>> updateAnniversary(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String annId,
            @RequestBody AnniversaryDto dto) {
        anniversaryService.updateAnniversary(annId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "기념일 삭제", description = "등록된 기념일을 삭제합니다.")
    @DeleteMapping("/{annId}")
    public ResponseEntity<ApiResponse<Void>> deleteAnniversary(@PathVariable String annId) {
        anniversaryService.deleteAnniversary(annId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}