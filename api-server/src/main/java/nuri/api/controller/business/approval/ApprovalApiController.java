package nuri.api.controller.business.approval;

import nuri.business.service.informalsanction.ApprovalListFilter;
import nuri.api.controller.business.approval.dto.ApprovalConfirmRequest;
import nuri.api.controller.business.approval.dto.ApprovalDraftRequest;
import nuri.api.controller.business.approval.dto.ApprovalResubmissionRequest;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.security.annotation.LoginUser;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.business.service.informalsanction.InformalSanctionService;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Approval", description = "Unified Electronic Approval APIs")
@RestController
@RequestMapping("/api/v1/approvals")
@RequiredArgsConstructor
public class ApprovalApiController {

    private final InformalSanctionService approvalService;
    private final nuri.business.service.informalsanction.ApprovalLineAssistService lineAssistService;
    private final nuri.business.service.informalsanction.ApprovalTemporaryDraftService temporaryDraftService;

    @Operation(summary = "Get Approval Detail", description = "참여한 결재의 내용·단계·처리 이력을 조회합니다. 참여하지 않은 차수는 공개하지 않습니다.")
    @GetMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#getApprovalDetail')")
    public ResponseEntity<ApiResponse<InformalSanctionDto>> getApprovalDetail(
            @PathVariable Long id, @LoginUser CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(approvalService.getInformalSanction(id, userDetails.getEsntlId())));
    }

    /**
     * 결재 대기함.
     *
     * <p>[2026-09-02] 종전에는 상태 조건이 없는 {@code getReceivedInformalSanctionList} 를 불러
     * <b>이미 승인·반려한 건까지 대기함에 남았다.</b> 결재자는 처리한 문서를 다시 열어 보고서야
     * 끝난 건임을 알게 됐다. 이름이 약속하는 것(pending)과 실제 질의가 어긋난 자리다.
     */
    @Operation(summary = "Get Pending Approvals (Inbox)",
            description = "결재자 본인에게 온 결재 중 **대기(신청) 상태**만 조회합니다. 처리 완료 건은 제외됩니다. "
                    + "제목 검색어(keyword)와 요청일 기간(fromYmd·toYmd, yyyyMMdd 또는 yyyy-MM-dd)으로 좁힐 수 있고, 형식이 틀리거나 역순이면 400 입니다.")
    @GetMapping("/pending")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#getPending')")
    public ResponseEntity<ApiResponse<PageResponse<InformalSanctionDto>>> getPending(
            @LoginUser CustomUserDetails userDetails,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String keyword,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String fromYmd,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String toYmd,
            @org.springframework.data.web.PageableDefault(sort = "ifmlAtrzSn", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        Page<InformalSanctionDto> result = approvalService.getPendingApprovalList(userDetails.getEsntlId(),
                ApprovalListFilter.of(keyword, fromYmd, toYmd, null), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    /**
     * 내가 <b>올린</b> 결재(신청자 기준). 이름이 'history' 인 것은 종전 계약의 잔재이며,
     * 결재자로서 처리한 이력이 아니다 — 그 목록은 {@link #getProcessed} 다.
     */
    @Operation(summary = "Get My Submitted Approvals",
            description = "내가 신청자인 결재 목록입니다(대기·승인·반려 전부). 결재자로서 처리한 이력은 /processed 입니다. "
                    + "제목 검색어·요청일 기간·문서 상태(status: A 대기·C 승인·R 반려·W 회수)로 좁힐 수 있습니다.")
    @GetMapping("/my")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#getMyHistory')")
    public ResponseEntity<ApiResponse<PageResponse<InformalSanctionDto>>> getMyHistory(
            @LoginUser CustomUserDetails userDetails,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String keyword,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String fromYmd,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String toYmd,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String status,
            @org.springframework.data.web.PageableDefault(sort = "ifmlAtrzSn", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        Page<InformalSanctionDto> result = approvalService.getInformalSanctionList(userDetails.getEsntlId(),
                ApprovalListFilter.of(keyword, fromYmd, toYmd, status), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "Get Approvals I Processed",
            description = "결재자 본인이 이미 **승인·반려한** 결재만 조회합니다. 대기 건은 /pending 입니다. "
                    + "제목 검색어·요청일 기간·문서의 지금 상태(status)로 좁힐 수 있습니다.")
    @GetMapping("/processed")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#getProcessed')")
    public ResponseEntity<ApiResponse<PageResponse<InformalSanctionDto>>> getProcessed(
            @LoginUser CustomUserDetails userDetails,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String keyword,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String fromYmd,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String toYmd,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String status,
            @org.springframework.data.web.PageableDefault(sort = "ifmlAtrzSn", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        Page<InformalSanctionDto> result = approvalService.getProcessedApprovalList(userDetails.getEsntlId(),
                ApprovalListFilter.of(keyword, fromYmd, toYmd, status), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "Get Approval Task Types",
            description = "기안 시 고르는 업무 구분(공통코드 COM075 의 사용 중 상세코드)입니다. 등록된 코드가 없으면 빈 목록입니다.")
    @GetMapping("/task-types")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#getTaskTypes')")
    public ResponseEntity<ApiResponse<java.util.List<nuri.business.service.code.dto.CommonCodeDto>>> getTaskTypes() {
        return ResponseEntity.ok(ApiResponse.success(approvalService.getTaskTypes()));
    }

    /**
     * 결재 기안(상신). 신청자는 요청 본문이 아니라 인증 주체다.
     *
     * <p>[2026-09-05] 종전에는 결재를 <b>올릴</b> 화면이 없었다 — 등록 API 와 프런트 서비스 메서드는
     * 있었지만 호출부가 0건이었고, 기안 화면은 목업이었다. 결재함의 '새 결재 기안' 이 이 경로를 부른다.
     */
    @Operation(summary = "Create Approval Draft",
            description = "현재 사용자를 신청자로 결재를 상신합니다. 업무 구분은 /task-types 의 코드여야 하고 결재자는 사용자 검색의 esntlId 입니다. "
                    + "임시저장을 이어 써서 올리면 temporaryDraftSn·temporaryDraftVersion 을 함께 보냅니다 — 상신과 같은 트랜잭션에서 "
                    + "그 임시저장을 지우며, 이미 상신했거나 버전이 다르면 409, 둘 중 하나만 보내면 400 입니다. 상신이 실패하면 임시저장은 남습니다.")
    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#createApproval')")
    public ResponseEntity<ApiResponse<Long>> createApproval(
            @LoginUser CustomUserDetails userDetails,
            @Valid @RequestBody nuri.api.controller.business.approval.dto.ApprovalDraftRequest request,
            @RequestParam(required = false) Long temporaryDraftSn,
            @RequestParam(required = false) Integer temporaryDraftVersion) {
        InformalSanctionDto draft = draftDto(request, userDetails.getEsntlId());
        // [2026-10-03 D3] 임시저장 참조는 상신 요청 본문에 두지 않는다 — 본문을 상속하는 재상신 요청에 새지 않게 쿼리로 받는다.
        //   둘 중 하나라도 오면 임시저장 서비스가 둘 다 있는지·값이 맞는지 보고, 같은 트랜잭션에서 소비한 뒤 상신한다.
        //   ⚠ 이 두 파라미터에 제약 어노테이션(@Positive 등)을 달지 않는다 — 하나라도 달리면 Spring 7 이 메서드 검증을 켜고
        //   본문의 @Valid 검증까지 HandlerMethodValidationException 으로 옮겨, 상신 폼이 받던 필드별 오류(errors[].field)가
        //   사라진다(2026-10-04 실측). 값 검사는 서비스가 한다.
        Long id = temporaryDraftSn == null && temporaryDraftVersion == null
                ? approvalService.registerInformalSanction(draft, request.getStages())
                : temporaryDraftService.submitWithTemporaryDraft(draft, request.getStages(),
                        temporaryDraftSn, temporaryDraftVersion);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "Resubmit Approval", description = "기안자 본인이 반려·회수된 문서를 수정하여 다시 상신합니다. 이전 차수의 내용과 처리는 보존됩니다.")
    @PostMapping("/{id}/resubmissions")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#resubmitApproval')")
    public ResponseEntity<ApiResponse<Long>> resubmitApproval(
            @PathVariable Long id, @LoginUser CustomUserDetails userDetails,
            @Valid @RequestBody ApprovalResubmissionRequest request) {
        approvalService.resubmitInformalSanction(id, draftDto(request, userDetails.getEsntlId()),
                request.getVersion(), request.getStages());
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "Confirm Approval (Approve/Reject)")
    @PutMapping("/{id}/confirm")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#confirm')")
    public ResponseEntity<ApiResponse<Void>> confirm(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalConfirmRequest request) {
        approvalService.confirmInformalSanction(id, request.getStatus(), request.getReason(), request.getVersion());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /** The service checks ownership and retains the document and completed decisions on withdrawal. */
    @Operation(summary = "Cancel My Approval Draft",
            description = "신청자 본인이 상신한 결재 중 대기(신청) 상태인 건을 취소(철회)합니다. "
                    + "내용과 처리 이력은 보존됩니다. 신청자 본인만 가능하며 관리자도 대리 회수할 수 없습니다.")
    @DeleteMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#cancelApproval')")
    public ResponseEntity<ApiResponse<Void>> cancelApproval(@PathVariable Long id,
            @RequestParam(required = false) @jakarta.validation.constraints.Min(0) Integer version) {
        approvalService.deleteInformalSanction(id, version);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /** [2026-10-03 결재 동선 개선 B안] 내가 올린 결재에서 다시 쓴 결재선과 최근 결재자를 제안한다. */
    @Operation(summary = "Get Approval Line Suggestions",
            description = "내가 올린 결재에서 업무 구분(taskSeCd)별로 다시 쓴 결재선(많이 쓴 순 최대 3개), 다른 업무 구분의 결재선, "
                    + "최근 결재자(최대 8명)를 돌려줍니다. 사람마다 결재자로 고를 수 있는지(본인·사용 중·결재 권한)와 부재 여부를 싣습니다.")
    @GetMapping("/line-suggestions")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#getLineSuggestions')")
    public ResponseEntity<ApiResponse<nuri.business.service.informalsanction.dto.ApprovalSuggestionsDto>> getLineSuggestions(
            @LoginUser CustomUserDetails userDetails,
            @RequestParam(required = false) @jakarta.validation.constraints.Size(max = 12) String taskSeCd) {
        return ResponseEntity.ok(ApiResponse.success(lineAssistService.getSuggestions(userDetails.getEsntlId(), taskSeCd)));
    }

    /** 고르려는 사람이 결재자가 될 수 있는지 상신 전에 알려 준다. 판정은 상신 때 서버 검사와 같다. */
    @Operation(summary = "Check Approver Eligibility",
            description = "사람마다 결재자로 고를 수 있는지 돌려줍니다(SELF·INACTIVE·NO_PERMISSION·NOT_FOUND). "
                    + "사용 중이 아니거나 없는 계정은 이름을 싣지 않습니다. 최대 50명입니다.")
    @PostMapping("/approver-checks")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#checkApprovers')")
    public ResponseEntity<ApiResponse<java.util.List<nuri.business.service.informalsanction.dto.ApproverProfileDto>>> checkApprovers(
            @LoginUser CustomUserDetails userDetails,
            @Valid @RequestBody nuri.api.controller.business.approval.dto.ApproverCheckRequest request) {
        return ResponseEntity.ok(ApiResponse.success(lineAssistService.checkApprovers(userDetails.getEsntlId(),
                request.getApproverIds())));
    }

    /**
     * [2026-10-03 결재 동선 개선 D3] 상신하지 않은 기안의 서버 임시저장. 기안자 본인만 읽고 고치며(관리자 열람 없음),
     * 남의 번호는 없는 번호와 같이 404 다. 결재 표에 들어가지 않으므로 대기함·알림·통계·결재선 제안에 섞이지 않는다.
     */
    @Operation(summary = "List Approval Temporary Drafts",
            description = "내가 임시저장한 기안 목록입니다(최근에 고친 순, 최대 20건). 본문과 결재선은 싣지 않으며 결재선에 든 사람 수만 돌려줍니다.")
    @GetMapping("/temporary-drafts")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#getApprovalTemporaryDrafts')")
    public ResponseEntity<ApiResponse<java.util.List<nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftSummaryDto>>> getApprovalTemporaryDrafts(
            @LoginUser CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(temporaryDraftService.getTemporaryDrafts(userDetails.getEsntlId())));
    }

    @Operation(summary = "Get Approval Temporary Draft",
            description = "임시저장한 기안 하나를 이어 쓰려고 엽니다. 결재선의 사람마다 지금 결재자로 고를 수 있는지(SELF·INACTIVE·NO_PERMISSION·NOT_FOUND)를 "
                    + "싣고, 사용 중이 아니거나 없는 계정은 이름을 싣지 않습니다. 내 임시저장이 아니면 404 입니다.")
    @GetMapping("/temporary-drafts/{temporaryDraftSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#getApprovalTemporaryDraft')")
    public ResponseEntity<ApiResponse<nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftDto>> getApprovalTemporaryDraft(
            @PathVariable Long temporaryDraftSn, @LoginUser CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                temporaryDraftService.getTemporaryDraft(userDetails.getEsntlId(), temporaryDraftSn)));
    }

    @Operation(summary = "Create Approval Temporary Draft",
            description = "작성 중인 기안을 임시저장합니다. 업무 구분·제목·본문·결재선 중 하나는 있어야 하고, 결재자가 없는 단계는 받지 않습니다. "
                    + "결재자 자격은 저장할 때 보지 않습니다. 한 사람이 20건까지 둘 수 있으며 넘으면 409(C014) 입니다. 알림은 나가지 않습니다.")
    @PostMapping("/temporary-drafts")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#createApprovalTemporaryDraft')")
    public ResponseEntity<ApiResponse<nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftSummaryDto>> createApprovalTemporaryDraft(
            @LoginUser CustomUserDetails userDetails,
            @Valid @RequestBody nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                temporaryDraftService.createTemporaryDraft(userDetails.getEsntlId(), request)));
    }

    @Operation(summary = "Update Approval Temporary Draft",
            description = "임시저장한 기안의 내용과 결재선을 통째로 바꿉니다. 읽은 버전(version)이 필수이며 다르면 409(C013) 입니다. "
                    + "저장할 때마다 버전이 오르고, 응답의 버전으로 다음 저장·상신을 합니다.")
    @PutMapping("/temporary-drafts/{temporaryDraftSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#updateApprovalTemporaryDraft')")
    public ResponseEntity<ApiResponse<nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftSummaryDto>> updateApprovalTemporaryDraft(
            @PathVariable Long temporaryDraftSn, @LoginUser CustomUserDetails userDetails,
            @Valid @RequestBody nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                temporaryDraftService.updateTemporaryDraft(userDetails.getEsntlId(), temporaryDraftSn, request)));
    }

    @Operation(summary = "Delete Approval Temporary Draft",
            description = "임시저장한 기안을 지웁니다. 되살릴 수 없습니다. 내 임시저장이 아니면 404 입니다.")
    @DeleteMapping("/temporary-drafts/{temporaryDraftSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#deleteApprovalTemporaryDraft')")
    public ResponseEntity<ApiResponse<Void>> deleteApprovalTemporaryDraft(
            @PathVariable Long temporaryDraftSn, @LoginUser CustomUserDetails userDetails) {
        temporaryDraftService.deleteTemporaryDraft(userDetails.getEsntlId(), temporaryDraftSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Remind Current Approvers",
            description = "기안자가 지금 차례인 결재자에게 재알림을 보냅니다. 같은 차수에서 하루에 한 번이며, 오늘 이미 보냈으면 409 입니다. "
                    + "알림을 받은 사람 수를 돌려줍니다.")
    @PostMapping("/{id}/reminders")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#remindApprovers')")
    public ResponseEntity<ApiResponse<Integer>> remindApprovers(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(approvalService.remindApprovers(id)));
    }

    @Operation(summary = "Replace Approver",
            description = "기안자가 아직 처리하지 않은 결재자를 다른 사람으로 바꿉니다. 앞 단계 승인은 그대로이고, 새 결재자는 상신 때와 같은 "
                    + "검사(본인·사용 중·결재 권한·중복)를 지나야 합니다. 이미 처리한 결재자이거나 버전이 다르면 409 입니다.")
    @PutMapping("/{id}/approvers")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#replaceApprover')")
    public ResponseEntity<ApiResponse<Void>> replaceApprover(@PathVariable Long id,
            @Valid @RequestBody nuri.api.controller.business.approval.dto.ApproverReplaceRequest request) {
        approvalService.replaceApprover(id, request.getFromUserId(), request.getToUserId(), request.getVersion());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Request Supplement",
            description = "결재자가 반려하지 않고 기안자에게 보완을 요청합니다. 문서는 진행 중으로 남고 요청한 결재자의 차례도 그대로입니다. "
                    + "이미 열린 보완 요청이 있으면 409 입니다.")
    @PostMapping("/{id}/supplement-requests")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#requestSupplement')")
    public ResponseEntity<ApiResponse<Void>> requestSupplement(@PathVariable Long id,
            @Valid @RequestBody nuri.api.controller.business.approval.dto.ApprovalSupplementRequest request) {
        approvalService.requestSupplement(id, request.getQuestion(), request.getVersion());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Answer Supplement",
            description = "기안자가 열린 보완 요청에 답합니다. 본문을 보내면 함께 고치며, 고치기 전 본문은 처리 이력에 남고 앞서 승인한 "
                    + "사람에게 알림이 갑니다(승인은 유지). 제목은 고칠 수 없습니다(바꾸려면 회수 후 재상신). "
                    + "답한 뒤 요청한 결재자 차례로 돌아갑니다.")
    @PostMapping("/{id}/supplement-answers")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.approval.ApprovalApiController#answerSupplement')")
    public ResponseEntity<ApiResponse<Void>> answerSupplement(@PathVariable Long id,
            @Valid @RequestBody nuri.api.controller.business.approval.dto.ApprovalSupplementAnswerRequest request) {
        approvalService.answerSupplement(id, request.getAnswer(), request.getDocCn(), request.getVersion());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    private static InformalSanctionDto draftDto(ApprovalDraftRequest request, String applicantId) {
        String reqYmd = request.getReqYmd() == null || request.getReqYmd().isBlank()
                ? java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))
                        .format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE)
                : request.getReqYmd();
        return InformalSanctionDto.builder()
                .taskSeCd(request.getTaskSeCd()).aprvrId(request.getAprvrId())
                .reqYmd(reqYmd).aplcntId(applicantId)
                .docTtl(request.getDocTtl()).docCn(request.getDocCn()).build();
    }
}
