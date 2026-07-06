package nuri.api.controller.business.admin;

import nuri.business.service.comment.CommentService;
import nuri.business.service.comment.dto.CommentDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
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
            @RequestParam(required = false) String pstId,
            @PageableDefault(size = 10) Pageable pageable) {
        
        Page<CommentDto> page;
        if (StringUtils.hasText(pstId)) {
            page = commentService.getComments(pstId, bbsId, pageable);
        } else {
            // 전체 조회 또는 검색 기능이 CommentService에 필요할 수 있음
            // 현재는 pstId 기반 조회만 지원하므로 빈 페이지 반환하거나 pstId 필수 처리
            page = commentService.getComments(pstId, bbsId, pageable);
        }
        
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "댓글 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Long id) {
        commentService.deleteComment(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
