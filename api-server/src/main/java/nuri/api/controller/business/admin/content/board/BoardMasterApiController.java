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
            @Valid @ModelAttribute BaseSearchDto searchDto) {
        Pageable pageable = searchDto.toPageable();
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
        String userId = currentLoginId();
        String bbsId = boardMasterService.createBoardMaster(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(bbsId));
    }

    @Operation(summary = "게시판 마스터 수정")
    @PutMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<Void>> updateBoardMaster(@PathVariable String bbsId, @Valid @RequestBody BoardMasterDto dto) {
        String userId = currentLoginId();
        dto.setBbsId(bbsId);
        boardMasterService.updateBoardMaster(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시판 마스터 삭제", description = "논리 삭제(비활성화)입니다. 행을 말소하려면 /{bbsId}/physical 을 사용합니다.")
    @DeleteMapping("/{bbsId}")
    public ResponseEntity<ApiResponse<Void>> deleteBoardMaster(@PathVariable String bbsId) {
        String userId = currentLoginId();
        boardMasterService.deleteBoardMaster(userId, bbsId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시판 마스터 영구 삭제 가능 여부",
            description = "비활성(useYn='N') 이고 소속 게시글이 0건일 때만 true 입니다. 화면이 영구 삭제 전 사전 안내에 사용합니다.")
    @GetMapping("/{bbsId}/deletable")
    public ResponseEntity<ApiResponse<Boolean>> isBoardMasterDeletable(@PathVariable String bbsId) {
        return ResponseEntity.ok(ApiResponse.success(boardMasterService.isDeletable(bbsId)));
    }

    @Operation(summary = "게시판 마스터 영구 삭제",
            description = "행을 물리 삭제합니다. 활성 게시판이거나 게시글이 남아 있으면 거부됩니다(서비스 레이어 재검증).")
    @DeleteMapping("/{bbsId}/physical")
    public ResponseEntity<ApiResponse<Void>> deleteBoardMasterPhysically(@PathVariable String bbsId) {
        String userId = currentLoginId();
        boardMasterService.deleteBoardMasterPhysically(userId, bbsId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시판 마스터 사용여부 일괄 변경")
    @PostMapping("/batch/status")
    public ResponseEntity<ApiResponse<Void>> updateBoardMasterStatusInBatch(
            @Valid @RequestBody BoardMasterBatchStatusRequest request) {
        String userId = currentLoginId();
        boardMasterService.updateBoardMasterStatusInBatch(userId, request.bbsIds(), request.useYn());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시판 마스터 일괄 영구 삭제",
            description = "대상마다 비활성·게시글 0건을 재검증하며, 하나라도 어긋나면 전체가 롤백됩니다.")
    @PostMapping("/batch/delete")
    public ResponseEntity<ApiResponse<Void>> deleteBoardMastersInBatch(
            @Valid @RequestBody BoardMasterBatchDeleteRequest request) {
        String userId = currentLoginId();
        boardMasterService.deleteBoardMastersInBatch(userId, request.bbsIds());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /** 현재 인증 주체의 loginId(감사 컬럼 lastMdfrId=@LastModifiedBy 저장 축과 동일). 미인증 폴백 "anonymous"(프로덕션은 Security 가 미인증을 선차단). */
    private String currentLoginId() {
        return SecurityUtil.getCurrentLoginId().orElse("anonymous");
    }
}
