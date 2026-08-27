package nuri.api.controller.business.comment;

import jakarta.validation.Valid;
import nuri.business.service.comment.CommentService;
import nuri.business.service.comment.dto.CommentDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@nuri.foundation.security.annotation.Authenticated
@RestController
@RequestMapping("/api/v1/comments")
@RequiredArgsConstructor
public class CommentApiController {

    private final CommentService commentService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CommentDto>>> getComments(
            @RequestParam Long pstSn,
            @RequestParam String bbsId,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<CommentDto> result = commentService.getComments(pstSn, bbsId, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    /**
     * 댓글 등록. 작성자는 <b>요청 본문이 아니라 인증 주체</b>에서 온다.
     *
     * <p>{@code getUsername()} 이 아니라 {@code getEsntlId()} 를 쓴다 — 두 값이 같더라도
     * {@code wrter_id} 는 esntlId 축이며, {@link CustomUserDetails} 가 그 혼동을 경고한다.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> createComment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CommentDto commentDto) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.createComment(userDetails.getEsntlId(), userDetails.getUserNm(), commentDto)));
    }

    @PutMapping("/{commentNo}")
    public ResponseEntity<ApiResponse<Void>> updateComment(
            @PathVariable Long commentNo,
            @Valid @RequestBody CommentDto commentDto) {
        commentService.updateComment(commentNo, commentDto.getAnsCn());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/{commentNo}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Long commentNo) {
        commentService.deleteComment(commentNo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
