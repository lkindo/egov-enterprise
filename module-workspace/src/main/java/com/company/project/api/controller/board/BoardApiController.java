package com.company.project.api.controller.board;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.board.BoardService;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardSaveRequest;
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
            @PageableDefault(size = 10) Pageable pageable) {
        Page<BoardDto> result = boardService.getBoardPosts(bbsId, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "게시글 상세 조회", description = "특정 게시판의 게시글 상세 정보를 조회합니다.")
    @GetMapping("/{bbsId}/posts/{id}")
    public ResponseEntity<ApiResponse<BoardDto>> getPost(
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(boardService.getPostDetail(bbsId, id)));
    }

    @Operation(summary = "게시글 등록", description = "새로운 게시글을 등록합니다.")
    @PostMapping("/posts")
    public ResponseEntity<ApiResponse<Long>> createPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BoardSaveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(boardService.createPost(userDetails.getUsername(), request)));
    }

    @Operation(summary = "게시글 삭제", description = "게시글을 삭제합니다.")
    @DeleteMapping("/{bbsId}/posts/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "게시판 ID", example = "BBS_000000000001") @PathVariable String bbsId,
            @Parameter(description = "게시글 ID", example = "1") @PathVariable Long id) {
        boardService.deletePost(bbsId, id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
