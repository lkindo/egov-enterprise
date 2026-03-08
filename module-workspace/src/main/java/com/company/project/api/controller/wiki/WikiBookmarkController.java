package com.company.project.api.controller.wiki;

import com.company.project.core.response.ApiResponse;
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

@Tag(name = "WikiBookmark", description = "Wiki Bookmark Management APIs")

@RestController

@RequestMapping("/api/v1/wiki-bookmarks")

@RequiredArgsConstructor

public class WikiBookmarkController {

    private final EgovWikiBookmarkService wikiBookmarkService;

@Operation(summary = "???          ?         ??            ?         ??", description = "??? ?         ???          ?         ??            ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<WikiBookmarkDto>>> getWikiBookmarks(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse

                .success(wikiBookmarkService.getWikiBookmarkList(userDetails.getUsername(), keyword, pageable)));

    }

@Operation(summary = "?          ?         ???         ", description = "??      ???          ?         ??? ?         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertWikiBookmark(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestParam String wikiBkmkNm) {

        wikiBookmarkService.insertWikiBookmark(userDetails.getUsername(), wikiBkmkNm);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "?          ?         ??????", description = "?     ???          ?         ??? ?????      ??")

    @DeleteMapping("/{wikiBkmkId}")

    public ResponseEntity<ApiResponse<Void>> deleteWikiBookmark(

            @PathVariable String wikiBkmkId) {

        wikiBookmarkService.deleteWikiBookmark(wikiBkmkId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "?          ?         ??        ??            ?", description = "??      ???         ??         ????  ?          ???               ?         ??      ??")

    @GetMapping("/check-duplication")

    public ResponseEntity<ApiResponse<Boolean>> checkDuplication(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestParam String wikiBkmkNm) {

        return ResponseEntity

                .ok(ApiResponse.success(wikiBookmarkService.checkDuplication(userDetails.getUsername(), wikiBkmkNm)));

    }

}
