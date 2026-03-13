package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.comment.CommentService;
import com.company.project.service.comment.dto.CommentDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자용 댓글 관리 API 컨트롤러
 */
@Tag(name = "Comment (Admin)", description = "시스템 댓글 관리 API (관리자용)")
@RestController
@RequestMapping("/api/v1/admin/system/comments")
@RequiredArgsConstructor
public class CommentAdminController {

    private final CommentService commentService;

    @Operation(summary = "전체 댓글 목록 조회", description = "시스템 내의 모든 댓글 목록을 조회합니다.")
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

    @Operation(summary = "댓글 삭제", description = "특정 댓글을 삭제(비활성화) 처리합니다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable("id") Long id) {
        // 관리자 권한으로 삭제하므로 userId를 별도로 검증하지 않음 (시스템 계정 등으로 대지 가능)
        commentService.deleteComment(id, "SYSTEM");
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
