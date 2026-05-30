package nuri.api.controller.business.comment;

import nuri.business.service.comment.CommentService;
import nuri.business.service.comment.dto.CommentDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/comments")
@RequiredArgsConstructor
public class CommentApiController {

    private final CommentService commentService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CommentDto>>> getComments(
            @RequestParam String pstId,
            @RequestParam String bbsId,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<CommentDto> result = commentService.getComments(pstId, bbsId, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Long>> createComment(@RequestBody CommentDto commentDto) {
        return ResponseEntity.ok(ApiResponse.success(commentService.createComment(commentDto)));
    }

    @PutMapping("/{commentNo}")
    public ResponseEntity<ApiResponse<Void>> updateComment(
            @PathVariable Long commentNo,
            @RequestBody CommentDto commentDto) {
        commentService.updateComment(commentNo, commentDto.getCommentCn());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/{commentNo}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Long commentNo) {
        commentService.deleteComment(commentNo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
