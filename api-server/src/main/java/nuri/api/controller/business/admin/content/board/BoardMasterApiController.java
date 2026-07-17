package nuri.api.controller.business.admin.content.board;

import jakarta.validation.Valid;
import nuri.business.service.board.BoardMasterService;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.security.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "BoardMaster", description = "게시판 마스터 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/board-masters")
@RequiredArgsConstructor
public class BoardMasterApiController {

    private final BoardMasterService boardMasterService;

    @Operation(summary = "게시판 마스터 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<BoardMasterDto>>> getBoardMasterList(
            @ModelAttribute BaseSearchDto searchDto) {
        Pageable pageable = PageRequest.of(searchDto.getPageIndex() - 1, searchDto.getPageUnit());
        Page<BoardMasterDto> page = boardMasterService.getBoardMasterList(
                searchDto.getSearchCondition(), searchDto.getSearchKeyword(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "게시판 마스터 상세 조회")
    @GetMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<BoardMasterDto>> getBoardMaster(@PathVariable String bbsId) {
        BoardMasterDto result = boardMasterService.getBoardMaster(bbsId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "게시판 마스터 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createBoardMaster(@Valid @RequestBody BoardMasterDto dto) {
        String userId = currentEsntlId();
        String bbsId = boardMasterService.createBoardMaster(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(bbsId));
    }

    @Operation(summary = "게시판 마스터 수정")
    @PutMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<Void>> updateBoardMaster(@PathVariable String bbsId, @Valid @RequestBody BoardMasterDto dto) {
        String userId = currentEsntlId();
        dto.setBbsId(bbsId);
        boardMasterService.updateBoardMaster(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시판 마스터 삭제")
    @DeleteMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<Void>> deleteBoardMaster(@PathVariable String bbsId) {
        String userId = currentEsntlId();
        boardMasterService.deleteBoardMaster(userId, bbsId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /** 현재 인증 주체의 esntlId(게시판 마스터 감사 컬럼 저장 축). 미인증 폴백 "anonymous"(기존 동작 보존; 프로덕션은 Security 가 미인증을 선차단). */
    private String currentEsntlId() {
        return SecurityUtil.getCurrentEsntlId().orElse("anonymous");
    }
}
