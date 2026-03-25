package com.company.project.business.api.controller.admin;

import com.company.project.foundation.core.response.ApiResponse;
import com.company.project.foundation.core.response.PageResponse;
import com.company.project.business.service.comment.CommentService;
import com.company.project.business.service.comment.dto.CommentDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 愿由ъ옄???볤? 愿由?API 而⑦듃濡ㅻ윭
 */
@Tag(name = "Comment", description = "?볤? 愿由?API (Admin)")
@RestController("systemCommentApiController")
@RequestMapping("/api/v1/admin/system/comments")
@RequiredArgsConstructor
public class CommentApiController {

    private final CommentService commentService;

    @Operation(summary = "?꾩껜 ?볤? 紐⑸줉 議고쉶", description = "?쒖뒪???댁쓽 紐⑤뱺 ?볤? 紐⑸줉??議고쉶?⑸땲??")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CommentDto>>> getComments(
            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex,
            @RequestParam(value = "searchKeyword", defaultValue = "") String searchKeyword) {

        Pageable pageable = PageRequest.of(pageIndex - 1, 10);
        Page<CommentDto> page;

        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            page = commentService.searchComments(searchKeyword, pageable);
        } else {
            page = commentService.getAllComments(pageable);
        }

        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(page.getContent(), pageIndex, 10, (int) page.getTotalElements())));
    }

    @Operation(summary = "?볤? ??젣", description = "?뱀젙 ?볤?????젣(鍮꾪솢?깊솕) 泥섎━?⑸땲??")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable("id") Long id) {
        // 愿由ъ옄 沅뚰븳?쇰줈 ??젣?섎?濡?userId瑜?蹂꾨룄濡?寃利앺븯吏 ?딆쓬 (?쒖뒪??怨꾩젙 ?깆쑝濡??吏 媛??
        commentService.deleteComment(id, "SYSTEM");
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
