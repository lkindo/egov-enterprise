package com.company.project.api.controller.ans;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.ans.AnniversaryService;
import com.company.project.service.ans.dto.AnniversaryDto;
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

import java.util.List;

@Tag(name = "Anniversary", description = "Anniversary Management APIs")
@RestController
@RequestMapping("/api/v1/anniversaries")
@RequiredArgsConstructor
public class AnniversaryController {

    private final AnniversaryService anniversaryService;

    @Operation(summary = "기념일 목록 조회", description = "등록된 기념일 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<AnniversaryDto>>> getAnniversaries(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversaryList(searchWrd, pageable)));
    }

    @Operation(summary = "내 기념일 목록 조회", description = "현재 로그인한 사용자의 기념일 목록을 조회합니다.")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<AnniversaryDto>>> getMyAnniversaries(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getUserAnniversaries(userDetails.getUsername())));
    }

    @Operation(summary = "기념일 상세 조회", description = "특정 기념일의 상세 정보를 조회합니다.")
    @GetMapping("/{annId}")
    public ResponseEntity<ApiResponse<AnniversaryDto>> getAnniversary(
            @Parameter(description = "기념일 ID") @PathVariable String annId) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversary(annId)));
    }

    @Operation(summary = "기념일 등록", description = "새로운 기념일을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createAnniversary(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AnniversaryDto anniversaryDto) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.createAnniversary(userDetails.getUsername(), anniversaryDto)));
    }

    @Operation(summary = "기념일 수정", description = "기존 기념일 정보를 수정합니다.")
    @PutMapping("/{annId}")
    public ResponseEntity<ApiResponse<Void>> updateAnniversary(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "기념일 ID") @PathVariable String annId,
            @RequestBody AnniversaryDto anniversaryDto) {
        anniversaryService.updateAnniversary(annId, userDetails.getUsername(), anniversaryDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "기념일 삭제", description = "특정 기념일을 삭제 처리합니다.")
    @DeleteMapping("/{annId}")
    public ResponseEntity<ApiResponse<Void>> deleteAnniversary(
            @Parameter(description = "기념일 ID") @PathVariable String annId) {
        anniversaryService.deleteAnniversary(annId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
