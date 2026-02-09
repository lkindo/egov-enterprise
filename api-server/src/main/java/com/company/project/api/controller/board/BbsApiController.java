package com.company.project.api.controller.board;

import com.company.project.service.board.EgovBoardService;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardSaveRequest;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Board (BBS)", description = "게시판 기능 API")
@RestController
@RequestMapping("/api/v1/bbs")
@RequiredArgsConstructor
public class BbsApiController {

    private final EgovBoardService boardService;

    @Operation(summary = "게시물 목록 조회")
    @GetMapping("/{bbsId}")
    public ResponseEntity<?> getBoardList(
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

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("list", resultPage.getContent());
        result.put("totalElements", resultPage.getTotalElements());
        result.put("totalPages", resultPage.getTotalPages());
        result.put("number", resultPage.getNumber());

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "게시물 상세 조회")
    @GetMapping("/{bbsId}/{nttId}")
    public ResponseEntity<?> getBoardDetail(
            @PathVariable("bbsId") String bbsId,
            @PathVariable("nttId") Long nttId) {

        BoardDto boardDto = boardService.getPostDetail(bbsId, nttId);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("data", boardDto);

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "게시물 등록")
    @PostMapping("/{bbsId}")
    public ResponseEntity<?> createBoard(
            @PathVariable("bbsId") String bbsId,
            @RequestPart("board") BoardSaveRequest request,
            @RequestPart(value = "file", required = false) List<MultipartFile> files) throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        String userId = (user == null) ? "GUEST" : user.getUniqId();

        Long nttId;
        if (files != null && !files.isEmpty()) {
            nttId = boardService.createPostWithFiles(userId, request, files);
        } else {
            nttId = boardService.createPost(userId, request);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("nttId", nttId);

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "게시물 수정")
    @PutMapping("/{bbsId}/{nttId}")
    public ResponseEntity<?> updateBoard(
            @PathVariable("bbsId") String bbsId,
            @PathVariable("nttId") Long nttId,
            @RequestPart("board") BoardSaveRequest request,
            @RequestPart(value = "file", required = false) List<MultipartFile> files) throws Exception {

        if (files != null && !files.isEmpty()) {
            boardService.updatePostWithFiles(bbsId, nttId, request, files);
        } else {
            boardService.updatePost(bbsId, nttId, request);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "게시물 삭제")
    @DeleteMapping("/{bbsId}/{nttId}")
    public ResponseEntity<?> deleteBoard(
            @PathVariable("bbsId") String bbsId,
            @PathVariable("nttId") Long nttId) {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        String userId = (user == null) ? "GUEST" : user.getUniqId();

        boardService.deletePost(bbsId, nttId, userId);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);

        return ResponseEntity.ok(result);
    }
}
