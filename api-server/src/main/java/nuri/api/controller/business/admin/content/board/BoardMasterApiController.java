package nuri.api.controller.business.admin.content.board;

import jakarta.validation.Valid;
import nuri.api.support.PageRequests;
import nuri.api.support.UnsortedPageable;
import nuri.business.service.board.BoardChangeService;
import nuri.business.service.board.BoardMasterService;
import nuri.business.service.board.BoardService;
import nuri.business.service.board.dto.BoardChangeDto;
import nuri.business.service.board.dto.BoardMasterBatchStatusRequest;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.business.service.board.dto.BoardMasterUpdateRequest;
import nuri.business.service.board.dto.BoardPostPeriodBatchRequest;
import nuri.business.service.board.dto.BoardPostPeriodRequest;
import nuri.business.service.board.dto.BoardPostPinBatchRequest;
import nuri.business.service.board.dto.BoardPostPinRequest;
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
    /** 운영 화면의 게시글 단위 처리(게시 기간·상단 고정의 빠른 편집·일괄 처리, ADR-0040 결정 3·5·10). */
    private final BoardService boardService;

    @Operation(summary = "게시판 마스터 목록 조회",
            description = "searchUseYn 을 비우면 전체, Y·N 이면 그 사용 상태만입니다(그 밖의 값은 400). "
                    + "designations 는 설정이 지정한 용도(NOTICE·FAQ·TASK·QNA·WIKI)이며 지정이 없으면 빈 배열입니다. "
                    + "community 는 귀속 커뮤니티의 번호·이름·이용 가능 여부이고, 귀속이 없으면 싣지 않습니다(이름·이용 가능 여부를 알 수 없으면 null).")
    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#getBoardMasterList')")
    public ResponseEntity<ApiResponse<PageResponse<BoardMasterSummaryResponse>>> getBoardMasterList(
            @Valid @ModelAttribute BaseSearchDto searchDto) {
        Pageable pageable = searchDto.toPageable();
        // 검색 축은 게시판명 하나라 searchCondition 은 읽지 않는다(DEC-OPS-332).
        Page<BoardMasterDto> page = boardMasterService.getBoardMasterList(
                searchDto.getSearchKeyword(), searchDto.getSearchUseYn(), pageable);
        // [2026-10-26 ADR-0043 결정 3] 한 쪽의 귀속 커뮤니티 요약을 커뮤니티마다 한 번만 묻는다.
        java.util.Map<Long, nuri.business.service.board.dto.BoardMasterCommunity> communities = boardMasterService.communitiesOf(
                page.getContent().stream().map(BoardMasterDto::getCmntySn).toList());
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page.map(dto ->
                BoardMasterSummaryResponse.from(dto, boardMasterService.designationsOf(dto.getBbsId()),
                        dto.getCmntySn() == null ? null : communities.get(dto.getCmntySn()))))));
    }

    @Operation(summary = "게시판 마스터 상세 조회",
            description = "version 은 설정 수정 요청에 그대로 돌려보낼 값입니다. designations·community 는 목록과 같습니다.")
    @GetMapping("/{bbsId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#getBoardMaster')")
    public ResponseEntity<ApiResponse<BoardMasterDetailResponse>> getBoardMaster(@PathVariable String bbsId) {
        BoardMasterDto result = boardMasterService.getBoardMaster(bbsId);
        return ResponseEntity.ok(ApiResponse.success(
                BoardMasterDetailResponse.from(result, boardMasterService.designationsOf(result.getBbsId()),
                        boardMasterService.communityOf(result.getCmntySn()))));
    }

    @Operation(summary = "게시판 변경 이력 조회",
            description = "최신순입니다. 바뀐 항목마다 한 건씩 돌려줍니다 — 지금 남는 것은 설정·사용 여부 변경과 운영 화면에서 바꾼 "
                    + "게시 기간·상단 고정(빠른 편집·일괄 처리)입니다. 작성 화면의 수정은 남지 않습니다. "
                    + "게시글 대상 행(PST)은 게시물 조회 대행 권한(BOARD_READ_ALL)이 있을 때만 싣습니다. 없는 게시판이면 404 입니다.")
    @GetMapping("/{bbsId}/change-history")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#getBoardChangeHistory')")
    public ResponseEntity<ApiResponse<PageResponse<BoardChangeDto>>> getBoardChangeHistory(
            @PathVariable String bbsId,
            @PageableDefault(size = 20) @UnsortedPageable Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                boardChangeService.getChanges(bbsId, PageRequests.unsorted(pageable)))));
    }

    @Operation(summary = "게시판 마스터 등록",
            description = "tmpltId 는 내장 레이아웃 일곱 개(TMPLT_HUB·TMPLT_LIST·TMPLT_GALLERY·TMPLT_QNA·TMPLT_CALENDAR·TMPLT_FAQ·"
                    + "TMPLT_WIKI)만 받습니다. bbsId 는 비우면 서버가 채번하고, 보낼 때는 BBSMSTR_ 뒤에 영문 대문자·숫자 12자입니다. "
                    + "첨부 파일 수는 0~20, 파일당 크기는 0~10485760 바이트입니다(0 은 게시판 상한 없음·서버 전역 상한). 어긋나면 400 입니다.")
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
            description = "행을 물리 삭제합니다. 설정이 지정한 용도(designations)가 있는 게시판은 409(B007)이고 사유에 용도를 싣습니다. "
                    + "활성 게시판이거나 게시글이 남아 있으면 400 입니다(서비스 레이어 재검증).")
    @DeleteMapping("/{bbsId}/physical")
    // [2026-10-23 ADR-0040 결정 9] 되돌릴 수 없는 삭제라 민감 작업 원장에 남긴다 — 게시판 변경 이력은 지운 게시판을 남기지 않는다.
    @nuri.foundation.core.annotation.SensitiveOperation("게시판 영구 삭제")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#deleteBoardMasterPhysically')")
    public ResponseEntity<ApiResponse<Void>> deleteBoardMasterPhysically(@PathVariable String bbsId) {
        String userId = currentLoginId();
        boardMasterService.deleteBoardMasterPhysically(userId, bbsId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시판 마스터 사용여부 일괄 변경",
            description = "useYn 은 필수이고 Y·N 만 받습니다(없거나 그 밖의 값은 400). 지정 게시판도 사용 안 함으로 바꿀 수 있습니다.")
    @PostMapping("/batch/status")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#updateBoardMasterStatusInBatch')")
    public ResponseEntity<ApiResponse<Void>> updateBoardMasterStatusInBatch(
            @Valid @RequestBody BoardMasterBatchStatusRequest request) {
        String userId = currentLoginId();
        boardMasterService.updateBoardMasterStatusInBatch(userId, request.bbsIds(), request.useYn());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시판 마스터 일괄 영구 삭제",
            description = "대상마다 지정 용도 없음·비활성·게시글 0건을 재검증하며, 하나라도 어긋나면 전체가 롤백됩니다. 없는 대상이 "
                    + "있으면 404 이고 다른 검사보다 먼저입니다. 지정 게시판이 섞이면 요청 순서와 상관없이 409(B007), 사용 중·글 있음은 400 입니다.")
    @PostMapping("/batch/delete")
    @nuri.foundation.core.annotation.SensitiveOperation("게시판 일괄 영구 삭제")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#deleteBoardMastersInBatch')")
    public ResponseEntity<ApiResponse<Void>> deleteBoardMastersInBatch(
            @Valid @RequestBody BoardMasterBatchDeleteRequest request) {
        String userId = currentLoginId();
        boardMasterService.deleteBoardMastersInBatch(userId, request.bbsIds());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시글 게시 기간 변경(운영 화면)",
            description = "운영 화면의 빠른 편집입니다. 게시글 전체 수정 권한(BOARD_UPDATE_ALL)이 필요하고, 공지·FAQ 로 지정된 "
                    + "게시판이면 그 편집 권한(NOTICE_EDIT·FAQ_EDIT)도 필요합니다(403). 목록에서 읽은 version 을 함께 보냅니다"
                    + "(없으면 400, 다르면 409). 보내지 않거나 비운 날짜는 지금 값을 유지하고, 종료일 해제는 일괄 처리(CLEAR_END)로 합니다. "
                    + "예약 게시를 받지 않는 게시판의 미래 시작일, 오늘보다 이른 종료일, 시작일보다 이른 종료일은 400 입니다. "
                    + "경로의 게시판에 없는 글은 404, 사용 안 함 게시판은 조회 대행 권한(BOARD_READ_ALL)이 없으면 404 입니다. "
                    + "바뀐 항목은 게시판 변경 이력에 남습니다.")
    @PatchMapping("/{bbsId}/posts/{pstSn}/period")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#updatePostPeriod')")
    public ResponseEntity<ApiResponse<Void>> updatePostPeriod(@PathVariable String bbsId, @PathVariable Long pstSn,
            @Valid @RequestBody BoardPostPeriodRequest request) {
        boardService.updatePostPeriod(bbsId, pstSn, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시글 게시 종료일 일괄 처리(운영 화면)",
            description = "END_DATE 는 고른 글의 종료일을 바꾸고(pstEndYmd 필요, 오늘이나 그 뒤), CLEAR_END 는 종료일을 비웁니다"
                    + "(pstEndYmd 없음). 권한은 빠른 편집과 같습니다(BOARD_UPDATE_ALL, 지정 게시판이면 그 편집 권한도). "
                    + "모든 대상을 다시 판정해 하나라도 경로의 게시판에 없으면 404, 새 종료일이 시작일보다 앞이 되는 글이 있으면 "
                    + "그 글 번호와 함께 400 이며, 이때는 아무것도 바꾸지 않습니다. 그 사이 다른 사람이 같은 글을 고쳤으면 409 이고 전체가 "
                    + "되돌아갑니다. 대상은 한 번에 1~100건입니다.")
    @PostMapping("/{bbsId}/posts/batch/period")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#updatePostPeriodsInBatch')")
    public ResponseEntity<ApiResponse<Void>> updatePostPeriodsInBatch(@PathVariable String bbsId,
            @Valid @RequestBody BoardPostPeriodBatchRequest request) {
        boardService.updatePostPeriodsInBatch(bbsId, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시글 상단 고정·해제(운영 화면)",
            description = "upendFixYn 이 Y 면 고정, N 이면 해제합니다. 게시글 상단 고정 권한(BOARD_PIN)이 필요하고, 공지·FAQ 로 지정된 "
                    + "게시판이면 그 편집 권한(NOTICE_EDIT·FAQ_EDIT)도 필요합니다(403). 고정은 게시판이 상단 고정을 받을 때만 되고(아니면 "
                    + "400), 고정 중인 글이 게시판의 상한에 이르렀으면 400 입니다. 고정 종료일은 오늘이나 그 뒤여야 하고, 비우면 오늘부터 "
                    + "게시판의 고정 기본 일수 뒤까지입니다. 해제에는 종료일을 보내지 않으며(보내면 400), 게시판 설정과 상관없이 언제나 됩니다. "
                    + "답글은 고정할 수 없습니다(400). 경로의 게시판에 없는 글은 404, 사용 안 함 게시판은 조회 대행 권한(BOARD_READ_ALL)이 "
                    + "없으면 404 입니다. 고정은 게시글 버전을 올리지 않습니다. 바뀐 항목은 게시판 변경 이력에 남습니다.")
    @PatchMapping("/{bbsId}/posts/{pstSn}/pin")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#updatePostPin')")
    public ResponseEntity<ApiResponse<Void>> updatePostPin(@PathVariable String bbsId, @PathVariable Long pstSn,
            @Valid @RequestBody BoardPostPinRequest request) {
        boardService.updatePostPin(bbsId, pstSn, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "게시글 상단 고정·해제 일괄 처리(운영 화면)",
            description = "고른 글 모두에 같은 고정 여부와 종료일을 씁니다 — 이미 고정 중인 글의 종료일도 바뀌고, 그 글은 상한 집계에서 "
                    + "새 고정으로 세지 않습니다. 권한·규칙은 단건과 같습니다(BOARD_PIN, 지정 게시판이면 그 편집 권한도). 모든 대상을 다시 "
                    + "판정해 하나라도 경로의 게시판에 없으면 404, 답글이 있거나 고정을 받지 않는 게시판이거나 상한을 넘으면 400 이며, 이때는 "
                    + "아무것도 바꾸지 않습니다. 대상은 한 번에 1~100건입니다. 게시 기간 일괄 처리(/posts/batch/period)와 권한이 달라 경로를 "
                    + "나눕니다.")
    @PostMapping("/{bbsId}/posts/batch/pin")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.admin.content.board.BoardMasterApiController#updatePostPinsInBatch')")
    public ResponseEntity<ApiResponse<Void>> updatePostPinsInBatch(@PathVariable String bbsId,
            @Valid @RequestBody BoardPostPinBatchRequest request) {
        boardService.updatePostPinsInBatch(bbsId, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /** 현재 인증 주체의 loginId(감사 컬럼 lastMdfrId=@LastModifiedBy 저장 축과 동일). 미인증 폴백 "anonymous"(프로덕션은 Security 가 미인증을 선차단). */
    private String currentLoginId() {
        return SecurityUtil.getCurrentLoginId().orElse("anonymous");
    }
}
