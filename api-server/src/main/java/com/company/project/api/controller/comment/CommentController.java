package com.company.project.api.controller.comment;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.comment.CommentService;
import com.company.project.service.comment.dto.CommentDto;
import com.company.project.service.comment.dto.CommentSaveRequest;
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

@Tag(name = "Comment", description = "?��? 관�?API")
@RestController
@RequestMapping("/api/v1/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @Operation(summary = "?��? 목록 조회", description = "?�정 게시물의 ?��? 목록??조회?�니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CommentDto>>> getComments(
            @RequestParam Long nttId,
            @RequestParam String bbsId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(commentService.getComments(nttId, bbsId, pageable)));
    }

    @Operation(summary = "?��? ?�록", description = "?�로???��????�록?�니??")
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> createComment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CommentSaveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.createComment(userDetails.getUsername(), userDetails.getUsername(), request)));
    }

    @Operation(summary = "?��? ?�정", description = "?�록???��????�용???�정?�니??")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateComment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?��? ID") @PathVariable Long id,
            @Valid @RequestBody CommentSaveRequest request) {
        commentService.updateComment(id, userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?��? ??��", description = "?�록???��?????�� 처리?�니??")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "?��? ID") @PathVariable Long id) {
        commentService.deleteComment(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
