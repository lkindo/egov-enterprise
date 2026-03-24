package com.company.project.api.controller.system.content.board;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.board.EgovBoardMasterService;
import com.company.project.service.board.dto.BoardMasterDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 게시판 마스터 관리를 위한 관리자용 컨트롤러 (Admin)
 */
@Tag(name = "BoardMaster", description = "게시판 마스터 관리 API (Admin)")
@RestController("systemBoardMasterApiController")
@RequestMapping("/api/v1/admin/system/board-masters")
@RequiredArgsConstructor
public class BoardMasterApiController {

    private final EgovBoardMasterService boardMasterService;

    @Operation(summary = "게시판 목록 조회", description = "시스템에 등록된 전체 게시판 마스터 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<BoardMasterDto>>> getBoardMasters(
            @RequestParam(required = false) String searchCnd,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<BoardMasterDto> pageResult = boardMasterService.getBoardMasterList(searchCnd, searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "게시판 상세 조회", description = "특정 게시판의 상세 설정을 조회합니다.")
    @GetMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<BoardMasterDto>> getBoardMaster(@PathVariable String bbsId) {
        return ResponseEntity.ok(ApiResponse.success(boardMasterService.getBoardMaster(bbsId)));
    }

    @Operation(summary = "게시판 생성", description = "새로운 게시판 마스터를 생성합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createBoardMaster(@RequestBody BoardMasterDto dto) {
        String bbsId = boardMasterService.createBoardMaster(dto);
        return ResponseEntity.ok(ApiResponse.success(bbsId));
    }

    @Operation(summary = "게시판 설정 수정", description = "기존 게시판 마스터 설정을 수정합니다.")
    @PutMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<Void>> updateBoardMaster(
            @PathVariable String bbsId,
            @RequestBody BoardMasterDto dto) {
        dto.setBbsId(bbsId);
        boardMasterService.updateBoardMaster(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시판 삭제", description = "게시판 마스터를 삭제 처리합니다.")
    @DeleteMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<Void>> deleteBoardMaster(
            @PathVariable String bbsId,
            @RequestParam String userId) {
        boardMasterService.deleteBoardMaster(bbsId, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
