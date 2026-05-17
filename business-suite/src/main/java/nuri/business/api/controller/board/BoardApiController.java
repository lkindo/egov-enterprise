package nuri.business.api.controller.board;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.board.BoardService;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.board.dto.BoardStatsResponse;
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

@Tag(name = "Board", description = "게시판 관리 API")
@RestController
@RequestMapping("/api/v1/boards")
@RequiredArgsConstructor
public class BoardApiController {

    private final BoardService boardService;

    @Operation(summary = "게시글 목록 조회", description = "특정 게시판의 게시글 목록을 페이징하여 조회합니다.")
    @GetMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<PageResponse<BoardDto>>> getPosts(
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @RequestParam(required = false, defaultValue = "0") String searchCnd,
            @RequestParam(required = false, defaultValue = "") String searchWrd,
            @RequestParam(required = false) String orderBy,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String qnaStatus,
            @RequestParam(required = false) String qnaCategory,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<BoardDto> result = boardService.getBoardPosts(bbsId, searchCnd, searchWrd, orderBy, startDate, endDate, qnaStatus, qnaCategory, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "게시판 통계 조회", description = "특정 게시판의 전체 게시글 수, 조회수 총합 등의 통계 정보를 조회합니다.")
    @GetMapping("/{bbsId}/stats")
    public ResponseEntity<ApiResponse<BoardStatsResponse>> getStats(
            @Parameter(description = "게시판 ID", example = "BBSMSTR_AAAAAAAAAAAA") @PathVariable String bbsId) {
        return ResponseEntity.ok(ApiResponse.success(boardService.getBoardStats(bbsId)));
    }

    @Operation(summary = "게시글 상세 조회", description = "특정 게시판의 게시글 상세 정보를 조회합니다.")
    @GetMapping("/{bbsId}/posts/{pstId}")
    public ResponseEntity<ApiResponse<BoardDto>> getPost(
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable String pstId) {
        return ResponseEntity.ok(ApiResponse.success(boardService.getPostDetail(bbsId, pstId)));
    }

    @Operation(summary = "게시글 등록", description = "새로운 게시글을 등록합니다.")
    @PostMapping("/posts")
    public ResponseEntity<ApiResponse<String>> createPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BoardSaveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(boardService.createPost(userDetails.getUsername(), request)));
    }

    @Operation(summary = "게시글 수정", description = "기존 게시글 정보를 수정합니다.")
    @PutMapping("/{bbsId}/posts/{pstId}")
    public ResponseEntity<ApiResponse<Void>> updatePost(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String bbsId,
            @PathVariable String pstId,
            @Valid @RequestBody BoardSaveRequest request) {
        boardService.updatePost(bbsId, pstId, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시글 삭제", description = "게시글을 삭제합니다.")
    @DeleteMapping("/{bbsId}/posts/{pstId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable String pstId) {
        boardService.deletePost(bbsId, pstId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시글 좋아요(추천)", description = "게시글의 추천수를 1 증가시킵니다. (낙관적 업데이트 테스트용)")
    @PatchMapping("/{bbsId}/posts/{pstId}/like")
    public ResponseEntity<ApiResponse<Integer>> likePost(
            @PathVariable String bbsId,
            @PathVariable String pstId) {
        // 실제 운영 환경에서는 중복 추천 방지 로직이 필요하나, 여기서는 낙관적 업데이트 시연을 위해 단순 증가 처리
        return ResponseEntity.ok(ApiResponse.success(boardService.incrementLike(bbsId, pstId)));
    }
}
