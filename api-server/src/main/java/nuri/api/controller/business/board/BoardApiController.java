package nuri.api.controller.business.board;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.board.BoardService;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.board.dto.BoardStatsResponse;
import nuri.api.controller.business.board.dto.BoardSearchItemResponse;
import nuri.api.controller.business.board.dto.PublicFaqDetailResponse;
import nuri.api.controller.business.board.dto.PublicFaqListItemResponse;
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
@nuri.foundation.security.annotation.Authenticated
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
        Page<BoardDto> result = boardService.getBoardPosts(
                bbsId, searchCnd, searchWrd, orderBy, startDate, endDate,
                qnaStatus, qnaCategory, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    /**
     * 통합 검색({@code /search} 화면)의 게시글 창구.
     *
     * <p>종전에는 이 엔드포인트가 없어 화면의 게시글 탭이 <b>항상 빈 결과</b>였다(라벨에 '미지원'
     * 이라고 적혀 있었다). 새 노출 경로를 만들지 않고 기존 게시판 목록과 같은 가시성 술어를
     * 재사용하므로, 여기서 보이는 글은 모두 해당 게시판 목록에서 이미 보이는 글이다.
     *
     * <p>페이지 번호를 받지 않는다 — 넘겨 가며 전량 수집하는 경로를 만들지 않기 위해서다
     * (담당자 검색 API 가 같은 이유로 {@code PageResponse} 를 쓰지 않는다). 상한은
     * {@code BoardService.GLOBAL_SEARCH_MAX_RESULTS} 다.
     */
    @Operation(summary = "게시글 통합 검색",
            description = """
                    활성 게시판 전체에서 게시글 **제목**을 검색합니다. 본문은 검색하지 않습니다 \
                    (본문은 에디터 HTML 원문이라 태그·속성이 그대로 매칭됩니다).
                    검색어는 2자 이상이어야 하며(미달 시 빈 목록), 최대 20건까지 반환합니다.
                    비밀글은 작성자 본인과 관리자에게만 보입니다.""")
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<java.util.List<BoardSearchItemResponse>>> searchPosts(
            @Parameter(description = "제목 검색어(2자 이상)") @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20) Pageable pageable) {
        java.util.List<BoardSearchItemResponse> result = boardService.searchAcrossBoards(keyword, pageable)
                .map(BoardSearchItemResponse::from)
                .getContent();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "공개 FAQ 목록 조회", description = "활성 FAQ 게시판의 공개 글 제목만 검색하여 조회합니다.")
    @GetMapping("/public-faqs")
    public ResponseEntity<ApiResponse<PageResponse<PublicFaqListItemResponse>>> getPublicFaqs(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<PublicFaqListItemResponse> result = boardService.getPublicFaqPosts(keyword, pageable)
                .map(PublicFaqListItemResponse::from);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "공개 FAQ 상세 조회", description = "활성 FAQ 게시판의 공개 글 상세만 조회합니다.")
    @GetMapping("/public-faqs/{pstSn}")
    public ResponseEntity<ApiResponse<PublicFaqDetailResponse>> getPublicFaqDetail(
            @Parameter(description = "FAQ 게시글 ID", example = "1") @PathVariable Long pstSn) {
        return ResponseEntity.ok(ApiResponse.success(
                PublicFaqDetailResponse.from(boardService.getPublicFaqDetail(pstSn))));
    }

    @Operation(summary = "게시판 통계 조회", description = "특정 게시판의 전체 게시글 수, 조회수 총합 등의 통계 정보를 조회합니다.")
    @GetMapping("/{bbsId}/stats")
    public ResponseEntity<ApiResponse<BoardStatsResponse>> getStats(
            @Parameter(description = "게시판 ID", example = "BBSMSTR_AAAAAAAAAAAA") @PathVariable String bbsId) {
        return ResponseEntity.ok(ApiResponse.success(boardService.getBoardStats(bbsId)));
    }

    @Operation(summary = "게시글 상세 조회", description = "특정 게시판의 게시글 상세 정보를 조회합니다.")
    @GetMapping("/{bbsId}/posts/{pstSn}")
    public ResponseEntity<ApiResponse<BoardDto>> getPost(
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable Long pstSn) {
        return ResponseEntity.ok(ApiResponse.success(boardService.getPostDetail(bbsId, pstSn)));
    }

    @Operation(summary = "게시글 등록", description = "새로운 게시글을 등록합니다.")
    @PostMapping("/posts")
    public ResponseEntity<ApiResponse<Long>> createPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BoardSaveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(boardService.createPost(userDetails.getUsername(), request)));
    }

    @Operation(summary = "게시글 수정", description = "기존 게시글 정보를 수정합니다.")
    @PutMapping("/{bbsId}/posts/{pstSn}")
    public ResponseEntity<ApiResponse<Void>> updatePost(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable Long pstSn,
            @Valid @RequestBody BoardSaveRequest request) {
        boardService.updatePost(bbsId, pstSn, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시글 삭제", description = "게시글을 삭제합니다.")
    @DeleteMapping("/{bbsId}/posts/{pstSn}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable Long pstSn) {
        boardService.deletePost(bbsId, pstSn, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시글 좋아요(추천)", description = "게시글의 추천수를 1 증가시킵니다. (낙관적 업데이트 테스트용)")
    @PatchMapping("/{bbsId}/posts/{pstSn}/like")
    public ResponseEntity<ApiResponse<Integer>> likePost(
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable Long pstSn) {
        // 실제 운영 환경에서는 중복 추천 방지 로직이 필요하나, 여기서는 낙관적 업데이트 시연을 위해 단순 증가 처리
        return ResponseEntity.ok(ApiResponse.success(boardService.incrementLike(bbsId, pstSn)));
    }
}
