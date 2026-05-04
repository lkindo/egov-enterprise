package nuri.business.api.controller.admin;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.comment.CommentService;
import nuri.business.service.comment.dto.CommentDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 愿由ъ옄??댓글 愿由API 而⑦듃濡ㅻ윭
 */
@Tag(name = "Comment", description = "댓글 愿由API (Admin)")
@RestController("systemCommentApiController")
@RequestMapping("/api/v1/admin/system/comments")
@RequiredArgsConstructor
public class CommentApiController {

    private final CommentService commentService;

    @Operation(summary = "전체 댓글 목록 조회", description = "?시스템??댁쓽 모든 댓글 목록조회⑸땲??")
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

    @Operation(summary = "댓글 삭제", description = "특정 댓글??삭제(비활성화) 처리합니다")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable("id") Long id) {
        // 愿由ъ옄 권한?쇰줈 삭제?섎濡userId瑜蹂꾨룄濡寃利앺븯吏 ?딆쓬 (?쒖뒪怨꾩젙 ?깆쑝濡吏 媛
        commentService.deleteComment(id, "SYSTEM");
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
