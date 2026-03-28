package com.company.project.business.api.controller.board;

import com.company.project.foundation.core.response.ApiResponse;
import com.company.project.foundation.core.response.PageResponse;
import com.company.project.business.service.board.EgovBoardService;
import com.company.project.business.service.board.dto.BoardDto;
import com.company.project.business.service.board.dto.BoardSaveRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@Slf4j
@Tag(name = "Board (BBS)", description = "게시판 기능 관련 REST API")
@RestController
@RequestMapping("/api/v1/bbs")
@RequiredArgsConstructor
public class BbsApiController {

    private final EgovBoardService boardService;

    @Operation(summary = "게시물 목록 조회", description = "게시판의 게시물 목록을 페이징하여 조회합니다.")
    @GetMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<PageResponse<BoardDto>>> getBoardList(
            @PathVariable("bbsId") String bbsId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "searchCnd", required = false) String searchCnd,
            @RequestParam(value = "searchWrd", required = false) String searchWrd) {
        
        Page<BoardDto> resultPage;
        if (searchWrd != null && !searchWrd.isEmpty()) {
            resultPage = boardService.getBoardPosts(bbsId, searchCnd, searchWrd, PageRequest.of(page, size));
        } else {
            resultPage = boardService.getBoardPosts(bbsId, PageRequest.of(page, size));
        }
        
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(resultPage)));
    }

    @Operation(summary = "게시물 상세 조회", description = "특정 게시물의 상세 정보를 조회합니다.")
    @GetMapping("/{bbsId}/{nttId}")
    public ResponseEntity<ApiResponse<BoardDto>> getBoardDetail(
            @PathVariable("bbsId") String bbsId,
            @PathVariable("nttId") Long nttId) {
        BoardDto boardDto = boardService.getPostDetail(bbsId, nttId);
        return ResponseEntity.ok(ApiResponse.success(boardDto));
    }

    @Operation(summary = "게시물 등록", description = "새로운 게시물을 등록합니다.")
    @PostMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<Long>> createBoard(
            @PathVariable("bbsId") String bbsId,
            @Valid @RequestPart("board") BoardSaveRequest request,
            @RequestPart(value = "file", required = false) List<MultipartFile> files) throws Exception {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = (auth == null || !auth.isAuthenticated()) ? "GUEST" : auth.getName();
        
        Long nttId;
        if (files != null && !files.isEmpty()) {
            nttId = boardService.createPostWithFiles(userId, request, files);
        } else {
            nttId = boardService.createPost(userId, request);
        }
        
        return ResponseEntity.ok(ApiResponse.success(nttId));
    }

    @Operation(summary = "게시물 수정", description = "기존 게시물을 수정합니다.")
    @PutMapping("/{bbsId}/{nttId}")
    public ResponseEntity<ApiResponse<Void>> updateBoard(
            @PathVariable("bbsId") String bbsId,
            @PathVariable("nttId") Long nttId,
            @Valid @RequestPart("board") BoardSaveRequest request,
            @RequestPart(value = "file", required = false) List<MultipartFile> files) throws Exception {
        
        if (files != null && !files.isEmpty()) {
            boardService.updatePostWithFiles(bbsId, nttId, request, files);
        } else {
            boardService.updatePost(bbsId, nttId, request);
        }
        
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시물 삭제", description = "게시물을 삭제합니다.")
    @DeleteMapping("/{bbsId}/{nttId}")
    public ResponseEntity<ApiResponse<Void>> deleteBoard(
            @PathVariable("bbsId") String bbsId,
            @PathVariable("nttId") Long nttId) {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = (auth == null || !auth.isAuthenticated()) ? "GUEST" : auth.getName();
        
        boardService.deletePost(bbsId, nttId, userId);
        
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
