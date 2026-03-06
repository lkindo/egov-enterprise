package com.company.project.api.controller.recentsearchword;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.recentsearchword.RecentSearchwordService;
import com.company.project.service.recentsearchword.dto.RecentSearchwordDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "RecentSearchword", description = "최근 검색어 관리 API")
@RestController
@RequestMapping("/api/v1/recent-search-words")
@RequiredArgsConstructor
public class RecentSearchwordController {

    private final RecentSearchwordService recentSearchwordService;

    @Operation(summary = "최근 검색어 관리 목록 페이징 조회", description = "최근 검색어 관리 목록을 페이징하여 조회합니다.")
    @GetMapping("/manages")
    public ResponseEntity<ApiResponse<Page<RecentSearchwordDto>>> getRecentSearchwordManages(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity
                .ok(ApiResponse.success(recentSearchwordService.getRecentSearchwordManageList(keyword, pageable)));
    }

    @Operation(summary = "최근 검색어 관리 상세 조회", description = "최근 검색어 관리 상세 정보를 조회합니다.")
    @GetMapping("/manages/{manageId}")
    public ResponseEntity<ApiResponse<RecentSearchwordDto>> getRecentSearchwordManage(
            @Parameter(description = "관리 ID") @PathVariable String manageId) {
        return ResponseEntity.ok(ApiResponse.success(recentSearchwordService.getRecentSearchwordManage(manageId)));
    }

    @Operation(summary = "최근 검색어 관리 등록", description = "새로운 최근 검색어 관리 정보를 등록합니다.")
    @PostMapping("/manages")
    public ResponseEntity<ApiResponse<Void>> insertRecentSearchwordManage(
            @RequestBody RecentSearchwordDto dto) {
        recentSearchwordService.insertRecentSearchwordManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "최근 검색어 관리 수정", description = "기존 최근 검색어 관리 정보를 수정합니다.")
    @PutMapping("/manages/{manageId}")
    public ResponseEntity<ApiResponse<Void>> updateRecentSearchwordManage(
            @PathVariable String manageId,
            @RequestBody RecentSearchwordDto dto) {
        dto.setSearchwordManageId(manageId);
        recentSearchwordService.updateRecentSearchwordManage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "최근 검색어 관리 삭제", description = "최근 검색어 관리 정보를 삭제합니다.")
    @DeleteMapping("/manages/{manageId}")
    public ResponseEntity<ApiResponse<Void>> deleteRecentSearchwordManage(
            @PathVariable String manageId) {
        recentSearchwordService.deleteRecentSearchwordManage(manageId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "최근 검색어 목록 페이징 조회", description = "특정 관리 ID에 해당되는 최근 검색어 목록을 페이징하여 조회합니다.")
    @GetMapping("/manages/{manageId}/words")
    public ResponseEntity<ApiResponse<Page<RecentSearchwordDto>>> getRecentSearchwordList(
            @PathVariable String manageId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity
                .ok(ApiResponse.success(recentSearchwordService.getRecentSearchwordList(manageId, pageable)));
    }

    @Operation(summary = "최근 검색어 등록", description = "새로운 최근 검색어를 등록합니다.")
    @PostMapping("/manages/{manageId}/words")
    public ResponseEntity<ApiResponse<Void>> insertRecentSearchword(
            @PathVariable String manageId,
            @RequestParam String searchwordNm) {
        recentSearchwordService.insertRecentSearchword(manageId, searchwordNm);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "최근 검색어 삭제", description = "최근 검색어를 삭제합니다.")
    @DeleteMapping("/words/{searchwordId}")
    public ResponseEntity<ApiResponse<Void>> deleteRecentSearchword(
            @PathVariable String searchwordId) {
        recentSearchwordService.deleteRecentSearchword(searchwordId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
