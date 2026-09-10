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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Tag(name = "Board", description = "게시판 관리 API")
@RestController
@RequestMapping("/api/v1/boards")
@RequiredArgsConstructor
public class BoardApiController {

    private final BoardService boardService;

    @Operation(summary = "게시글 목록 조회", description = "특정 게시판의 게시글 목록을 페이징하여 조회합니다.")
    @GetMapping("/{bbsId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.board.BoardApiController#getPosts')")
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
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.board.BoardApiController#searchPosts')")
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
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.board.BoardApiController#getPublicFaqs')")
    public ResponseEntity<ApiResponse<PageResponse<PublicFaqListItemResponse>>> getPublicFaqs(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<PublicFaqListItemResponse> result = boardService.getPublicFaqPosts(keyword, pageable)
                .map(PublicFaqListItemResponse::from);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "공개 FAQ 상세 조회", description = "활성 FAQ 게시판의 공개 글 상세만 조회합니다.")
    @GetMapping("/public-faqs/{pstSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.board.BoardApiController#getPublicFaqDetail')")
    public ResponseEntity<ApiResponse<PublicFaqDetailResponse>> getPublicFaqDetail(
            @Parameter(description = "FAQ 게시글 ID", example = "1") @PathVariable Long pstSn) {
        return ResponseEntity.ok(ApiResponse.success(
                PublicFaqDetailResponse.from(boardService.getPublicFaqDetail(pstSn))));
    }

    @Operation(summary = "게시판 통계 조회", description = "특정 게시판의 전체 게시글 수, 조회수 총합 등의 통계 정보를 조회합니다.")
    @GetMapping("/{bbsId}/stats")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.board.BoardApiController#getStats')")
    public ResponseEntity<ApiResponse<BoardStatsResponse>> getStats(
            @Parameter(description = "게시판 ID", example = "BBSMSTR_AAAAAAAAAAAA") @PathVariable String bbsId) {
        return ResponseEntity.ok(ApiResponse.success(boardService.getBoardStats(bbsId)));
    }

    @Operation(summary = "게시글 상세 조회", description = "특정 게시판의 게시글 상세 정보를 조회합니다.")
    @GetMapping("/{bbsId}/posts/{pstSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.board.BoardApiController#getPost')")
    public ResponseEntity<ApiResponse<BoardDto>> getPost(
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable Long pstSn) {
        return ResponseEntity.ok(ApiResponse.success(boardService.getPostDetail(bbsId, pstSn)));
    }

    @Operation(summary = "게시글 등록", description = "새로운 게시글을 등록합니다. 첨부를 함께 올리려면 /{bbsId}/posts/with-files 를 사용합니다.")
    @PostMapping("/posts")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.board.BoardApiController#createPost')")
    public ResponseEntity<ApiResponse<Long>> createPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BoardSaveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(boardService.createPost(userDetails.getUsername(), request)));
    }

    /**
     * 첨부를 함께 올리는 게시글 등록.
     *
     * <p>[2026-09-06 DEC-OPS-044] 종전에는 {@code /api/v1/bbs/{bbsId}} 였고 태그가 "Board Legacy" 였다.
     * 그러나 이 경로는 레거시가 아니라 <b>첨부를 붙일 수 있는 유일한 등록 경로</b>이고 정본 작성 화면이
     * 실제로 이것을 부른다. 이름이 사실과 달랐으므로 같은 {@code /api/v1/boards} 네임스페이스로 옮겼다.
     * 첨부를 함께 보내는 쓰기는 등록·수정 모두 경로 끝이 {@code /with-files} 다. JSON 등록만 {@code bbsId} 를
     * 본문으로 받는 비대칭이 남지만, 소비자 이행 비용 때문에 이번 범위에서 정리하지 않는다.
     */
    @Operation(summary = "게시글 등록(첨부 포함)", description = "게시글과 첨부 파일을 함께 등록합니다.")
    @PostMapping(value = "/{bbsId}/posts/with-files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.board.BoardApiController#createPostWithFiles')")
    public ResponseEntity<ApiResponse<Long>> createPostWithFiles(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @RequestPart("board") BoardSaveRequest request,
            @RequestPart(value = "file", required = false) List<MultipartFile> files) throws IOException {
        String userId = userDetails.getUsername();
        Long pstSn = (files != null && !files.isEmpty())
                ? boardService.createPostWithFiles(userId, request, files)
                : boardService.createPost(userId, request);
        return ResponseEntity.ok(ApiResponse.success(pstSn));
    }

    @Operation(summary = "게시글 수정", description = "기존 게시글 정보를 수정합니다. 첨부를 함께 올리려면 같은 경로에 /with-files 를 붙입니다.")
    @PutMapping("/{bbsId}/posts/{pstSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.board.BoardApiController#updatePost')")
    public ResponseEntity<ApiResponse<Void>> updatePost(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable Long pstSn,
            @Valid @RequestBody BoardSaveRequest request) {
        boardService.updatePost(bbsId, pstSn, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 첨부를 함께 올리는 게시글 수정 — {@code /api/v1/bbs/{bbsId}/posts/{pstSn}} 에서 옮겨 왔다.
     *
     * <p>[2026-09-06 DEC-OPS-044] JSON 수정과 같은 URL 에 {@code consumes} 만 다르게 두는 안은 실측으로 폐기했다 —
     * springdoc 이 두 핸들러를 <b>하나의 operation 으로 병합</b>해 requestBody 에 두 미디어 타입을 싣고,
     * 생성기(codegen-zod)가 "must declare exactly one requestBody content type" 로 fail-closed 한다.
     * 그래서 첨부 동반 쓰기는 경로 끝의 {@code /with-files} 로 구분한다(등록·수정 대칭).
     */
    @Operation(summary = "게시글 수정(첨부 포함)", description = "게시글 정보와 새 첨부 파일을 함께 수정합니다.")
    @PutMapping(value = "/{bbsId}/posts/{pstSn}/with-files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.board.BoardApiController#updatePostWithFiles')")
    public ResponseEntity<ApiResponse<Void>> updatePostWithFiles(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable Long pstSn,
            @RequestPart("board") BoardSaveRequest request,
            @RequestPart(value = "file", required = false) List<MultipartFile> files) throws IOException {
        if (files != null && !files.isEmpty()) {
            boardService.updatePostWithFiles(bbsId, pstSn, request, files);
        } else {
            boardService.updatePost(bbsId, pstSn, request);
        }
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시글 삭제", description = "게시글을 삭제합니다.")
    @DeleteMapping("/{bbsId}/posts/{pstSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.board.BoardApiController#deletePost')")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable Long pstSn) {
        boardService.deletePost(bbsId, pstSn, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시글 좋아요(추천)", description = "게시글의 추천수를 1 증가시킵니다. (낙관적 업데이트 테스트용)")
    @PatchMapping("/{bbsId}/posts/{pstSn}/like")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.board.BoardApiController#likePost')")
    public ResponseEntity<ApiResponse<Integer>> likePost(
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable Long pstSn) {
        // 실제 운영 환경에서는 중복 추천 방지 로직이 필요하나, 여기서는 낙관적 업데이트 시연을 위해 단순 증가 처리
        return ResponseEntity.ok(ApiResponse.success(boardService.incrementLike(bbsId, pstSn)));
    }
}
