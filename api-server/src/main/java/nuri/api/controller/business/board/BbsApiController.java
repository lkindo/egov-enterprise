package nuri.api.controller.business.board;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.board.BoardService;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Slf4j
@Tag(name = "Board Legacy", description = "Legacy Board API Support")
@RestController
@RequestMapping("/api/v1/bbs")
@RequiredArgsConstructor
public class BbsApiController {

    private final BoardService boardService;

    @Operation(summary = "게시글 목록 조회", description = "게시판의 게시글 목록을 조회합니다.")
    @GetMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<PageResponse<BoardDto>>> getBbsList(
            @PathVariable("bbsId") String bbsId,
            @RequestParam(value = "searchCnd", defaultValue = "0") String searchCnd,
            @RequestParam(value = "searchWrd", defaultValue = "") String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<BoardDto> result = boardService.getBoardPosts(bbsId, searchCnd, searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "게시글 상세 조회")
    @GetMapping("/{bbsId}/posts/{pstId}")
    public ResponseEntity<ApiResponse<BoardDto>> getBbsDetail(
            @PathVariable("bbsId") String bbsId,
            @PathVariable("pstId") String pstId) {
        BoardDto boardDto = boardService.getPostDetail(bbsId, pstId);
        return ResponseEntity.ok(ApiResponse.success(boardDto));
    }

    @Operation(summary = "게시글 등록")
    @PostMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<String>> createBbsPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("bbsId") String bbsId,
            @RequestPart("board") BoardSaveRequest request,
            @RequestPart(value = "file", required = false) List<MultipartFile> files) throws IOException {
        
        String userId = userDetails.getUsername();
        String pstId;
        if (files != null && !files.isEmpty()) {
            pstId = boardService.createPostWithFiles(userId, request, files);
        } else {
            pstId = boardService.createPost(userId, request);
        }
        return ResponseEntity.ok(ApiResponse.success(pstId));
    }

    @Operation(summary = "게시글 수정")
    @PutMapping("/{bbsId}/posts/{pstId}")
    public ResponseEntity<ApiResponse<Void>> updateBbsPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("bbsId") String bbsId,
            @PathVariable("pstId") String pstId,
            @RequestPart("board") BoardSaveRequest request,
            @RequestPart(value = "file", required = false) List<MultipartFile> files) throws IOException {
        
        if (files != null && !files.isEmpty()) {
            boardService.updatePostWithFiles(bbsId, pstId, request, files);
        } else {
            boardService.updatePost(bbsId, pstId, request);
        }
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시글 삭제")
    @DeleteMapping("/{bbsId}/posts/{pstId}")
    public ResponseEntity<ApiResponse<Void>> deleteBbsPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("bbsId") String bbsId,
            @PathVariable("pstId") String pstId) {
        String userId = userDetails.getUsername();
        boardService.deletePost(bbsId, pstId, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
