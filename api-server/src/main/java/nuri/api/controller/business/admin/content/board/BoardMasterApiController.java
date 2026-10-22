package nuri.api.controller.business.admin.content.board;

import jakarta.validation.Valid;
import nuri.api.support.PageRequests;
import nuri.api.support.UnsortedPageable;
import nuri.business.service.board.BoardChangeService;
import nuri.business.service.board.BoardMasterService;
import nuri.business.service.board.dto.BoardChangeDto;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.business.service.board.dto.BoardMasterUpdateRequest;
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
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "BoardMaster", description = "게시판 마스터 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/board-masters")
@RequiredArgsConstructor
public class BoardMasterApiController {

    private final BoardMasterService boardMasterService;
    private final BoardChangeService boardChangeService;

    @Operation(summary = "게시판 마스터 목록 조회",
            description = "searchUseYn 을 비우면 전체, Y·N 이면 그 사용 상태만입니다(그 밖의 값은 400). "
                    + "designations 는 설정이 지정한 용도(NOTICE·FAQ·TASK)이며 지정이 없으면 빈 배열입니다.")
    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#getBoardMasterList')")
    public ResponseEntity<ApiResponse<PageResponse<BoardMasterSummaryResponse>>> getBoardMasterList(
            @Valid @ModelAttribute BaseSearchDto searchDto) {
        Pageable pageable = searchDto.toPageable();
        // 검색 축은 게시판명 하나라 searchCondition 은 읽지 않는다(DEC-OPS-332).
        Page<BoardMasterDto> page = boardMasterService.getBoardMasterList(
                searchDto.getSearchKeyword(), searchDto.getSearchUseYn(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page.map(dto ->
                BoardMasterSummaryResponse.from(dto, boardMasterService.designationsOf(dto.getBbsId()))))));
    }

    @Operation(summary = "게시판 마스터 상세 조회",
            description = "version 은 설정 수정 요청에 그대로 돌려보낼 값입니다. designations 는 목록과 같습니다.")
    @GetMapping("/{bbsId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#getBoardMaster')")
    public ResponseEntity<ApiResponse<BoardMasterDetailResponse>> getBoardMaster(@PathVariable String bbsId) {
        BoardMasterDto result = boardMasterService.getBoardMaster(bbsId);
        return ResponseEntity.ok(ApiResponse.success(
                BoardMasterDetailResponse.from(result, boardMasterService.designationsOf(result.getBbsId()))));
    }

    @Operation(summary = "게시판 변경 이력 조회",
            description = "최신순입니다. 바뀐 항목마다 한 건씩 돌려줍니다 — 지금 남는 것은 설정·사용 여부 변경입니다. "
                    + "게시글 대상 행(PST)은 게시물 조회 대행 권한(BOARD_READ_ALL)이 있을 때만 싣습니다. 없는 게시판이면 404 입니다.")
    @GetMapping("/{bbsId}/change-history")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#getBoardChangeHistory')")
    public ResponseEntity<ApiResponse<PageResponse<BoardChangeDto>>> getBoardChangeHistory(
            @PathVariable String bbsId,
            @PageableDefault(size = 20) @UnsortedPageable Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                boardChangeService.getChanges(bbsId, PageRequests.unsorted(pageable)))));
    }

    @Operation(summary = "게시판 마스터 등록")
    @PostMapping
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#createBoardMaster')")
    public ResponseEntity<ApiResponse<String>> createBoardMaster(@Valid @RequestBody BoardMasterDto dto) {
        String userId = currentLoginId();
        String bbsId = boardMasterService.createBoardMaster(userId, dto);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(ApiResponse.created(bbsId));
    }

    @Operation(summary = "게시판 마스터 수정",
            description = "상세 조회에서 받은 version 을 함께 보냅니다(없으면 400, 다르면 409). 템플릿·유형·속성·커뮤니티 귀속은 "
                    + "만든 뒤 바꾸지 않으므로 받지 않습니다(보내면 400).")
    @PutMapping("/{bbsId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#updateBoardMaster')")
    public ResponseEntity<ApiResponse<Void>> updateBoardMaster(@PathVariable String bbsId,
            @Valid @RequestBody BoardMasterUpdateRequest request) {
        String userId = currentLoginId();
        boardMasterService.updateBoardMaster(userId, bbsId, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시판 마스터 삭제", description = "논리 삭제(비활성화)입니다. 행을 말소하려면 /{bbsId}/physical 을 사용합니다.")
    @DeleteMapping("/{bbsId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#deleteBoardMaster')")
    public ResponseEntity<ApiResponse<Void>> deleteBoardMaster(@PathVariable String bbsId) {
        String userId = currentLoginId();
        boardMasterService.deleteBoardMaster(userId, bbsId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시판 마스터 영구 삭제 가능 여부",
            description = "비활성(useYn='N') 이고 소속 게시글이 0건일 때만 true 입니다. 화면이 영구 삭제 전 사전 안내에 사용합니다.")
    @GetMapping("/{bbsId}/deletable")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#isBoardMasterDeletable')")
    public ResponseEntity<ApiResponse<Boolean>> isBoardMasterDeletable(@PathVariable String bbsId) {
        return ResponseEntity.ok(ApiResponse.success(boardMasterService.isDeletable(bbsId)));
    }

    @Operation(summary = "게시판 마스터 영구 삭제",
            description = "행을 물리 삭제합니다. 활성 게시판이거나 게시글이 남아 있으면 거부됩니다(서비스 레이어 재검증).")
    @DeleteMapping("/{bbsId}/physical")
    // [2026-10-23 ADR-0040 결정 9] 되돌릴 수 없는 삭제라 민감 작업 원장에 남긴다 — 게시판 변경 이력은 지운 게시판을 남기지 않는다.
    @nuri.foundation.core.annotation.SensitiveOperation("게시판 영구 삭제")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#deleteBoardMasterPhysically')")
    public ResponseEntity<ApiResponse<Void>> deleteBoardMasterPhysically(@PathVariable String bbsId) {
        String userId = currentLoginId();
        boardMasterService.deleteBoardMasterPhysically(userId, bbsId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시판 마스터 사용여부 일괄 변경")
    @PostMapping("/batch/status")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#updateBoardMasterStatusInBatch')")
    public ResponseEntity<ApiResponse<Void>> updateBoardMasterStatusInBatch(
            @Valid @RequestBody BoardMasterBatchStatusRequest request) {
        String userId = currentLoginId();
        boardMasterService.updateBoardMasterStatusInBatch(userId, request.bbsIds(), request.useYn());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시판 마스터 일괄 영구 삭제",
            description = "대상마다 비활성·게시글 0건을 재검증하며, 하나라도 어긋나면 전체가 롤백됩니다.")
    @PostMapping("/batch/delete")
    @nuri.foundation.core.annotation.SensitiveOperation("게시판 일괄 영구 삭제")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#deleteBoardMastersInBatch')")
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
