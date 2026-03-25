package com.company.project.business.api.controller.comment;

import com.company.project.foundation.core.response.ApiResponse;
import com.company.project.foundation.core.response.PageResponse;
import com.company.project.business.service.comment.CommentService;
import com.company.project.business.service.comment.dto.CommentDto;
import com.company.project.business.service.comment.dto.CommentSaveRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Comment", description = "댓글 관리 API")
@RestController
@RequestMapping("/api/v1/comments")
@RequiredArgsConstructor
public class CommentApiController {

    private final CommentService commentService;

    @Operation(summary = "댓글 목록 조회", description = "특정 게시물의 댓글 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CommentDto>>> getComments(
            @RequestParam Long nttId,
            @RequestParam String bbsId,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<CommentDto> result = commentService.getComments(nttId, bbsId, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "댓글 등록", description = "새로운 댓글을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> createComment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CommentSaveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.createComment(userDetails.getUsername(), userDetails.getUsername(), request)));
    }

    @Operation(summary = "댓글 수정", description = "기본 댓글 내용을 수정합니다.")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateComment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "댓글 ID") @PathVariable Long id,
            @Valid @RequestBody CommentSaveRequest request) {
        commentService.updateComment(id, userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "댓글 삭제", description = "댓글을 삭제 처리합니다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "댓글 ID") @PathVariable Long id) {
        commentService.deleteComment(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
