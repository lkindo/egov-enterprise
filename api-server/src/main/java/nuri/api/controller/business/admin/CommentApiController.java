package nuri.api.controller.business.admin;

import nuri.business.service.comment.CommentService;
import nuri.business.service.comment.dto.CommentDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자용 댓글 관리 API
 */
@Tag(name = "Admin - Comment", description = "관리자용 댓글 관리 API")
@RestController("adminCommentApiController")
@RequestMapping("/api/v1/admin/comments")
@RequiredArgsConstructor
public class CommentApiController {

    private final CommentService commentService;

    @Operation(summary = "댓글 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CommentDto>>> getComments(
            @RequestParam(required = false) String searchKeyword,
            @RequestParam(required = false) String bbsId,
            @RequestParam(required = false) Long pstSn,
            @PageableDefault(size = 10) Pageable pageable) {
        // 현재 CommentService 는 (pstSn, bbsId) 기반 조회만 지원한다.
        // searchKeyword 는 아직 서비스에 배선되지 않은 예약 파라미터다(키워드 검색 미지원).
        Page<CommentDto> page = commentService.getComments(pstSn, bbsId, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "댓글 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Long id) {
        commentService.deleteComment(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
