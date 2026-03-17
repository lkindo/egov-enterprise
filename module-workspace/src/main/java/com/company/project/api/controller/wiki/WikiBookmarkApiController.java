package com.company.project.api.controller.wiki;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.wiki.EgovWikiBookmarkService;
import com.company.project.service.wiki.dto.WikiBookmarkDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "WikiBookmark", description = "위키 즐겨찾기 관리 API")
@RestController
@RequestMapping("/api/v1/wiki-bookmarks")
@RequiredArgsConstructor
public class WikiBookmarkApiController {

    private final EgovWikiBookmarkService wikiBookmarkService;

    @Operation(summary = "위키 즐겨찾기 목록 조회", description = "사용자의 위키 즐겨찾기 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<WikiBookmarkDto>>> getWikiBookmarks(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<WikiBookmarkDto> result = wikiBookmarkService.getWikiBookmarkList(userDetails.getUsername(), keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "위키 즐겨찾기 등록", description = "새로운 위키 즐겨찾기를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertWikiBookmark(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String wikiBkmkNm) {
        wikiBookmarkService.insertWikiBookmark(userDetails.getUsername(), wikiBkmkNm);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "위키 즐겨찾기 삭제", description = "위키 즐겨찾기를 삭제합니다.")
    @DeleteMapping("/{wikiBkmkId}")
    public ResponseEntity<ApiResponse<Void>> deleteWikiBookmark(@PathVariable String wikiBkmkId) {
        wikiBookmarkService.deleteWikiBookmark(wikiBkmkId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "즐겨찾기 중복 체크", description = "해당 명칭의 즐겨찾기가 이미 존재하는지 확인합니다.")
    @GetMapping("/check-duplication")
    public ResponseEntity<ApiResponse<Boolean>> checkDuplication(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String wikiBkmkNm) {
        return ResponseEntity.ok(ApiResponse.success(wikiBookmarkService.checkDuplication(userDetails.getUsername(), wikiBkmkNm)));
    }
}
