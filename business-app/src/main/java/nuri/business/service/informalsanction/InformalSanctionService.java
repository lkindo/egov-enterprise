package nuri.business.service.informalsanction;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import nuri.business.domain.informalsanction.*;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.dto.*;
import nuri.business.service.informalsanction.event.SanctionStatusChangedEvent;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InformalSanctionService {
    private final InformalSanctionRepository informalSanctionRepository;
    private final CommonCodeService commonCodeService;
    private final ApplicationEventPublisher eventPublisher;
    private final InformalSanctionMapper informalSanctionMapper;
    private final UserRepository userRepository;
    private final InformalSanctionDetailRepository detailRepository;
    private final InformalSanctionHistoryRepository historyRepository;
    private final InformalSanctionProcessRepository processRepository;
    private final InformalSanctionReferenceRepository referenceRepository;
    private final EntityManager entityManager;

    static final String TASK_TYPE_CODE_GROUP = "COM075";
    private static final String APPROVE_PERMISSION = "APPROVAL_APPROVE";
    private static final String WITHDRAW_PERMISSION = "APPROVAL_CANCEL";
    private static final String DRAFT_PERMISSION = "APPROVAL_CREATE";
    /** 참조자가 문서를 읽는 권한(2026-10-04 D4) — 지정할 때 이 권한이 없으면 지정해도 읽을 수 없으므로 거부한다. */
    private static final String READ_PERMISSION = "APPROVAL_READ";
    /**
     * 한 문서의 참조자 상한 — 문서에 누적된 서로 다른 사람 수다(참조는 추가만 하므로 빠진 사람도 자리를 차지한다). 지정은 차수
     * 단위 행이지만 같은 사람을 다른 차수에 다시 지정해도 자리를 더 차지하지 않는다.
     */
    static final int MAX_REFERENCES = 20;
    private static final List<String> PROCESSED_STATUS_CODES = List.of("C", "R");

    public Page<InformalSanctionDto> getInformalSanctionList(String aplcntId, Pageable pageable) {
        return getInformalSanctionList(aplcntId, ApprovalListFilter.NONE, pageable);
    }

    /** 내가 올린 결재. 조건은 제목·요청일 기간·문서 상태(2026-09-26 DIP B5 F4). */
    public Page<InformalSanctionDto> getInformalSanctionList(String aplcntId, ApprovalListFilter filter, Pageable pageable) {
        assertCurrentParticipant(aplcntId);
        ApprovalListFilter f = Objects.requireNonNull(filter);
        return toDtoPage(informalSanctionRepository.findSubmitted(aplcntId, f.keywordPattern(), f.fromYmd(), f.toYmd(),
                f.status(), Objects.requireNonNull(pageable)), aplcntId);
    }

    /** 현재 또는 이전 차수의 결재선에 참여한 문서. */
    public Page<InformalSanctionDto> getReceivedInformalSanctionList(String aprvrId, Pageable pageable) {
        assertCurrentParticipant(aprvrId);
        return toDtoPage(informalSanctionRepository.findByAprvrId(aprvrId,
                Objects.requireNonNull(pageable)), aprvrId);
    }

    /** 현재 차수에서 활성화된 본인의 미처리 라인만 대기함에 포함한다. */
    public Page<InformalSanctionDto> getPendingApprovalList(String aprvrId, Pageable pageable) {
        return getPendingApprovalList(aprvrId, ApprovalListFilter.NONE, pageable);
    }

    /** 대기함은 늘 대기 문서라 상태 조건은 쓰지 않는다. */
    public Page<InformalSanctionDto> getPendingApprovalList(String aprvrId, ApprovalListFilter filter, Pageable pageable) {
        assertCurrentParticipant(aprvrId);
        ApprovalListFilter f = Objects.requireNonNull(filter).withoutStatus();
        return toDtoPage(informalSanctionRepository.findPending(aprvrId, f.keywordPattern(), f.fromYmd(), f.toYmd(),
                null, Objects.requireNonNull(pageable)), aprvrId);
    }

    public long getPendingApprovalCount(String aprvrId) {
        assertCurrentParticipant(aprvrId);
        return informalSanctionRepository.countPending(aprvrId);
    }

    /** 문서가 계속 결재 중이거나 재상신됐어도 본인이 결정한 라인은 이력에 남는다. */
    public Page<InformalSanctionDto> getProcessedApprovalList(String aprvrId, Pageable pageable) {
        return getProcessedApprovalList(aprvrId, ApprovalListFilter.NONE, pageable);
    }

    /** 상태 조건은 문서의 지금 상태다(내가 결정한 라인의 결과가 아니다). */
    public Page<InformalSanctionDto> getProcessedApprovalList(String aprvrId, ApprovalListFilter filter, Pageable pageable) {
        assertCurrentParticipant(aprvrId);
        ApprovalListFilter f = Objects.requireNonNull(filter);
        return toDtoPage(informalSanctionRepository.findProcessed(aprvrId, PROCESSED_STATUS_CODES, f.keywordPattern(),
                f.fromYmd(), f.toYmd(), f.status(), Objects.requireNonNull(pageable)), aprvrId);
    }

    /**
     * '참조된 결재'(2026-10-04 D4) — 내가 참조자로 지정된 문서. 조건은 다른 탭과 같고 상태 조건은 문서의 지금 상태다.
     * 참조자는 결재선에 들지 않으므로 대기 건수·처리함에 섞이지 않는다(그 질의는 결재선 표만 읽는다).
     */
    public Page<InformalSanctionDto> getReferencedApprovalList(String userId, ApprovalListFilter filter, Pageable pageable) {
        assertCurrentParticipant(userId);
        ApprovalListFilter f = Objects.requireNonNull(filter);
        return toDtoPage(informalSanctionRepository.findReferenced(userId, f.keywordPattern(), f.fromYmd(), f.toYmd(),
                f.status(), Objects.requireNonNull(pageable)), userId);
    }

    public List<CommonCodeDto> getTaskTypes() {
        return commonCodeService.getCodesByGroup(TASK_TYPE_CODE_GROUP);
    }

    /**
     * 상세. 신청자·결재선에 든 사람·참조자만 연다(그 밖의 사람에게는 404). 결재자는 참여한 차수만, 신청자와 참조자는 모든
     * 차수를 본다. 레거시 경로(/informal-sanctions/{id}·/admin/system/ism/{id})도 이 관문을 지나므로 참조자가 같은 문서를 읽는다
     * — 같은 서비스 판정이라 권한이 넓어지지 않는다.
     */
    public InformalSanctionDto getInformalSanction(Long id, String participantId) {
        assertCurrentParticipant(participantId);
        InformalSanction sanction = informalSanctionRepository.findByIdAndParticipant(
                Objects.requireNonNull(id), participantId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        List<InformalSanctionDetail> lines = detailRepository.findForDocuments(List.of(id));
        List<InformalSanctionHistory> history = historyRepository.findForDocuments(List.of(id));
        List<InformalSanctionProcess> processes = processRepository.findForDocuments(List.of(id));
        List<InformalSanctionReference> references = referenceRepository.findForDocuments(List.of(id));
        return toParticipantDto(sanction, participantId, lines, history, processes, references,
                userNames(List.of(sanction), lines, processes), absentUsers(lines), taskTypeNames(),
                referenceProfiles(references), true);
    }

    /** 기존 단일 aprvrId 요청은 한 단계의 승인으로 유지한다. */
    @Transactional
    public Long registerInformalSanction(InformalSanctionDto dto) {
        return registerInformalSanction(dto, legacyStages(dto));
    }

    @Transactional
    public Long registerInformalSanction(InformalSanctionDto dto, List<ApprovalStageRequest> requests) {
        return registerInformalSanction(dto, requests, null);
    }

    /** [2026-10-04 D4] 참조자를 함께 지정해 상신한다. 참조자는 차수 1 에 지정한 것으로 남고 지정 알림을 받는다. */
    @Transactional
    public Long registerInformalSanction(InformalSanctionDto dto, List<ApprovalStageRequest> requests,
                                         List<String> references) {
        validateDocument(dto);
        assertCurrentParticipant(dto.getAplcntId());
        List<ApprovalStageRequest> stages = validateStages(dto.getAplcntId(),
                requests == null ? legacyStages(dto) : requests);
        ReferencePlan designated = validateReferences(dto.getAplcntId(), BigDecimal.ONE, lineUsers(stages), references,
                List.of());
        InformalSanction sanction = InformalSanction.builder()
                .taskSeCd(dto.getTaskSeCd()).aplcntId(dto.getAplcntId())
                .reqYmd(requestDate(dto.getReqYmd())).docTtl(dto.getDocTtl()).docCn(dto.getDocCn())
                .aprvrId(stages.getFirst().approverIds().getFirst()).aprvYn("A")
                .atrzCycl(BigDecimal.ONE).build();
        InformalSanction saved = informalSanctionRepository.save(sanction);
        createRevision(saved, stages);
        designateReferences(saved, designated, dto.getAplcntId());
        return saved.getIfmlAtrzSn();
    }

    /** 진행 중인 결재 내용/결재선을 직접 변경하지 않는다. 회수 후 새 차수로 상신한다. */
    @Transactional
    public void updateInformalSanction(InformalSanctionDto dto) {
        InformalSanction sanction = lock(dto.getIfmlAtrzSn());
        SecurityUtil.assertOwnerByEsntlId(sanction.getAplcntId());
        throw new BusinessException(CommonErrorCode.INVALID_STATE, "결재 문서를 변경하려면 회수 후 재상신해 주세요.");
    }

    @Transactional
    public void deleteInformalSanction(Long id) {
        deleteInformalSanction(id, null);
    }

    /** legacy null version은 유지하며 새 UI는 읽은 version을 전달한다. */
    @Transactional
    public void deleteInformalSanction(Long id, Integer expectedVersion) {
        InformalSanction sanction = lock(id);
        SecurityUtil.assertOwnerByEsntlId(sanction.getAplcntId());
        assertInProgress(sanction, "회수");
        assertVersion(sanction, expectedVersion);
        InformalSanctionHistory history = currentHistory(sanction);
        List<InformalSanctionDetail> lines = detailRepository.findRevision(id, sanction.getAtrzCycl());
        // [2026-09-26 DIP B5 F1] 차례가 와 있던 결재자에게 회수를 알린다 — 대기함에서 사라진 이유를 모르게 두지 않는다.
        List<String> activeApprovers = lines.stream().filter(d -> d.status() == ApprovalStatus.ACTIVE)
                .map(d -> d.getId().getUserId()).toList();
        sanction.withdraw();
        lines.forEach(InformalSanctionDetail::cancel);
        history.updateResult(sanction);
        java.util.UUID eventId = java.util.UUID.randomUUID();
        activeApprovers.stream().sorted().forEach(receiver -> eventPublisher.publishEvent(
                new NotificationRequestedEvent(eventId, receiver, "결재가 회수되었습니다",
                        documentLabel(sanction) + "를 신청자가 회수했습니다. 처리할 필요가 없습니다.", "/approvals")));
    }

    @Transactional
    public void resubmitInformalSanction(Long id, InformalSanctionDto dto, Integer expectedVersion) {
        resubmitInformalSanction(id, dto, expectedVersion, legacyStages(dto));
    }

    @Transactional
    public void resubmitInformalSanction(Long id, InformalSanctionDto dto, Integer expectedVersion,
                                         List<ApprovalStageRequest> requests) {
        resubmitInformalSanction(id, dto, expectedVersion, requests, null);
    }

    /**
     * [2026-10-04 D4 개정 1] 재상신에서도 참조자를 지정한다. 보낸 사람은 모두 새 차수에 지정한 것으로 남는다 — 이전 차수의
     * 참조자를 다시 보내면 새 차수의 행이 생겨 그 차수의 참조자가 된다(최종 결과 알림을 받고, 이 차수 결재선에 둘 수 없다).
     * 지정 알림은 이 문서에 처음 참조되는 사람에게만 간다. 참조는 추가만 하므로 빼도 그 사람은 이전 차수의 행으로 계속 읽는다.
     */
    @Transactional
    public void resubmitInformalSanction(Long id, InformalSanctionDto dto, Integer expectedVersion,
                                         List<ApprovalStageRequest> requests, List<String> references) {
        InformalSanction sanction = lock(id);
        SecurityUtil.assertOwnerByEsntlId(sanction.getAplcntId());
        assertVersion(sanction, expectedVersion);
        if (!List.of("R", "W").contains(sanction.getAprvYn())) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "반려되었거나 회수한 결재만 다시 올릴 수 있습니다. 최신 상태를 확인해 주세요.");
        }
        validateDocument(dto);
        List<ApprovalStageRequest> stages = validateStages(sanction.getAplcntId(),
                requests == null ? legacyStages(dto) : requests);
        // 새 차수는 아래 resubmit 이 하나 올린 차수다. 그 차수에는 아직 행이 없으므로 보낸 사람이 모두 이 차수의 지정이 된다.
        ReferencePlan designated = validateReferences(sanction.getAplcntId(), sanction.getAtrzCycl().add(BigDecimal.ONE),
                lineUsers(stages), references, referenceRepository.findForDocuments(List.of(id)));
        currentHistory(sanction).updateResult(sanction);
        sanction.resubmit(dto.getTaskSeCd(), requestDate(dto.getReqYmd()), dto.getDocTtl(), dto.getDocCn(),
                stages.getFirst().approverIds().getFirst());
        createRevision(sanction, stages);
        designateReferences(sanction, designated, sanction.getAplcntId());
    }

    @Transactional
    public void confirmInformalSanction(Long id, String aprvYn, String opinion, Integer expectedVersion) {
        InformalSanction sanction = lock(id);
        String actor = SecurityUtil.getCurrentEsntlId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
        List<InformalSanctionDetail> lines = detailRepository.findRevision(id, sanction.getAtrzCycl());
        Optional<InformalSanctionDetail> found = lines.stream().filter(d -> actor.equals(d.getId().getUserId())).findFirst();
        if (found.isEmpty()) assertNotReplacedOut(sanction, actor);
        InformalSanctionDetail ownLine = found.orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
        SecurityUtil.assertOwnerByEsntlId(ownLine.getId().getUserId());
        /*
         * [2026-10-01] 이미 끝난 문서·이미 처리한 라인은 입력 오류가 아니라 **먼저 일어난 다른 처리와의 충돌**이다.
         * 종전에는 사유 없는 400(잘못된 상태 전이)이라, 병렬 결재에서 다른 사람이 먼저 반려했거나 신청자가 회수한 문서를
         * 누른 사람이 무슨 일이 있었는지 알 수 없었고 화면도 '최신 문서 확인' 흐름으로 가지 못했다(화면은 409 만 충돌로 본다).
         * 결재선에 있는 사람에게만 도달하는 분기라(위에서 비참여자는 403) 문서 상태를 새로 노출하지 않는다.
         */
        assertInProgress(sanction, "처리");
        if (ownLine.status() == ApprovalStatus.WAITING) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED, "아직 결재 차례가 아닙니다. 앞 단계의 결재가 끝나면 알림이 옵니다.");
        }
        if (ownLine.status() != ApprovalStatus.ACTIVE) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "이미 처리한 결재입니다. 최신 상태를 확인해 주세요.");
        }
        assertVersion(sanction, expectedVersion);
        if (!"C".equals(aprvYn) && !"R".equals(aprvYn)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "잘못된 결재 상태 코드입니다.");
        }
        InformalSanctionHistory history = currentHistory(sanction);
        ownLine.decide("C".equals(aprvYn), opinion, LocalDateTime.now());
        if ("R".equals(aprvYn)) {
            // 병렬 단계에서 한 사람이 반려하면 같은 차례였던 다른 결재자의 라인도 취소된다. 회수와 같이 알린다 —
            // 알리지 않으면 대기함에서 문서가 이유 없이 사라진다.
            List<String> otherActiveApprovers = lines.stream()
                    .filter(d -> d.status() == ApprovalStatus.ACTIVE && !actor.equals(d.getId().getUserId()))
                    .map(d -> d.getId().getUserId()).sorted().toList();
            sanction.reject(opinion);
            lines.forEach(InformalSanctionDetail::cancel);
            history.updateResult(sanction);
            publishFinalStatus(sanction, actor, opinion, lines);
            java.util.UUID eventId = java.util.UUID.randomUUID();
            otherActiveApprovers.forEach(receiver -> eventPublisher.publishEvent(
                    new NotificationRequestedEvent(eventId, receiver, "결재가 반려되었습니다",
                            documentLabel(sanction) + "를 다른 결재자가 반려했습니다. 처리할 필요가 없습니다.", "/approvals")));
            return;
        }
        BigDecimal stage = ownLine.getId().getAtrzSeq();
        boolean stageFinished = lines.stream().filter(d -> d.getId().getAtrzSeq().compareTo(stage) == 0)
                .allMatch(d -> d.status() == ApprovalStatus.APPROVED);
        if (stageFinished) {
            Optional<BigDecimal> next = lines.stream().filter(d -> d.status() == ApprovalStatus.WAITING)
                    .map(d -> d.getId().getAtrzSeq()).min(BigDecimal::compareTo);
            if (next.isEmpty()) {
                sanction.approve();
                history.updateResult(sanction);
                publishFinalStatus(sanction, actor, opinion, lines);
                return;
            }
            lines.stream().filter(d -> d.getId().getAtrzSeq().compareTo(next.get()) == 0)
                    .forEach(InformalSanctionDetail::activate);
            publishStageAvailable(sanction, lines);
        }
        String representative = lines.stream().filter(d -> d.status() == ApprovalStatus.ACTIVE)
                .map(d -> d.getId().getUserId()).sorted().findFirst()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.INVALID_STATE));
        if (representative.equals(sanction.getAprvrId())) {
            // 일부 병렬 결재는 header의 업무 필드를 바꾸지 않아도 version을 증가시켜야 한다.
            entityManager.lock(sanction, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
        } else {
            sanction.selectRepresentativeApprover(representative);
        }
    }

    /** Legacy callers share the same participant and stage checks as versioned decisions. */
    @Transactional
    public void confirmInformalSanction(Long id, String aprvYn, String opinion) {
        confirmInformalSanction(id, aprvYn, opinion, null);
    }

    /**
     * [2026-10-03 결재 동선 개선] 기안자가 지금 차례인 결재자에게 재알림을 보낸다. 같은 차수에서 하루 한 번이다 —
     * 기록이 처리 이력에 남아 다음 날까지 다시 보내지 않는다. 문서 상태와 버전은 바꾸지 않는다.
     */
    @Transactional
    public int remindApprovers(Long id) {
        InformalSanction sanction = lock(id);
        SecurityUtil.assertOwnerByEsntlId(sanction.getAplcntId());
        assertInProgress(sanction, "재알림");
        if (cycleProcesses(sanction).stream().anyMatch(InformalSanctionService::remindedToday)) {
            throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE,
                    "오늘은 이미 재알림을 보냈습니다. 내일 다시 보낼 수 있습니다.");
        }
        List<String> receivers = detailRepository.findRevision(id, sanction.getAtrzCycl()).stream()
                .filter(d -> d.status() == ApprovalStatus.ACTIVE).map(d -> d.getId().getUserId()).sorted().toList();
        if (receivers.isEmpty()) throw new BusinessException(CommonErrorCode.INVALID_STATE, "재알림을 받을 결재자가 없습니다.");
        recordProcess(sanction, ApprovalProcessType.REMIND, sanction.getAplcntId(), null, null, null, LocalDateTime.now());
        java.util.UUID eventId = java.util.UUID.randomUUID();
        receivers.forEach(receiver -> eventPublisher.publishEvent(new NotificationRequestedEvent(eventId, receiver,
                "결재 재알림", documentLabel(sanction) + "를 기다리고 있습니다. 확인해 주세요.", pendingLink(id))));
        return receivers.size();
    }

    /**
     * [2026-10-03 D6] 기안자가 아직 처리하지 않은 결재자를 다른 사람으로 바꾼다. 앞 단계 승인과 같은 단계 다른 사람의
     * 결정은 그대로다. 대결·위임이 아니다 — 새 결재자가 자기 이름으로 결재하며, 바꾼 기록은 처리 이력에 남는다.
     * 새 결재자는 상신 때와 같은 검사(본인·사용 중·결재 권한·중복)를 지나야 한다.
     */
    @Transactional
    public void replaceApprover(Long id, String fromUserId, String toUserId, Integer expectedVersion) {
        InformalSanction sanction = lock(id);
        SecurityUtil.assertOwnerByEsntlId(sanction.getAplcntId());
        assertInProgress(sanction, "결재자 변경");
        assertVersion(sanction, expectedVersion);
        List<InformalSanctionDetail> lines = detailRepository.findRevision(id, sanction.getAtrzCycl());
        InformalSanctionDetail previous = lines.stream().filter(d -> d.getId().getUserId().equals(fromUserId)).findFirst()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND,
                        "결재선에 없는 사람입니다. 최신 상태를 확인해 주세요."));
        if (previous.status() != ApprovalStatus.WAITING && previous.status() != ApprovalStatus.ACTIVE) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "이미 처리한 결재자는 바꿀 수 없습니다. 최신 상태를 확인해 주세요.");
        }
        if (lines.stream().anyMatch(d -> d.getId().getUserId().equals(toUserId))) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "이미 결재선에 있는 사람입니다.");
        }
        // [2026-10-04 D4] 이 차수의 참조자는 결재선에 넣지 않는다 — 참조는 지울 수 없어, 넣으면 같은 차수에 참조자와 결재자를
        //   겸한다('그 차수 결재선에 있는 사람은 참조자가 아니다' 가 깨진다). 결재선을 바꾸려면 회수 후 재상신한다.
        if (referenceRepository.findForDocuments(List.of(id)).stream().anyMatch(r ->
                r.designatedIn(sanction.getAtrzCycl()) && r.getId().getUserId().equals(toUserId))) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "이 차수의 참조자는 결재자로 바꿀 수 없습니다. 결재선을 바꾸려면 회수한 뒤 다시 올려 주세요.");
        }
        validateStages(sanction.getAplcntId(), List.of(new ApprovalStageRequest(previous.kind(), List.of(toUserId))));
        boolean wasActive = previous.status() == ApprovalStatus.ACTIVE;
        InformalSanctionDetail replacement = previous.reassignTo(toUserId);
        detailRepository.delete(previous);
        detailRepository.flush();
        detailRepository.save(replacement);
        String representative = lines.stream().map(d -> d == previous ? replacement : d)
                .filter(d -> d.status() == ApprovalStatus.ACTIVE).map(d -> d.getId().getUserId()).sorted().findFirst()
                .orElse(sanction.getAprvrId());
        if (representative.equals(sanction.getAprvrId())) {
            entityManager.lock(sanction, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
        } else {
            sanction.selectRepresentativeApprover(representative);
        }
        recordProcess(sanction, ApprovalProcessType.REPLACE, sanction.getAplcntId(), toUserId, fromUserId, null,
                LocalDateTime.now());
        java.util.UUID eventId = java.util.UUID.randomUUID();
        eventPublisher.publishEvent(new NotificationRequestedEvent(eventId, fromUserId, "결재선에서 빠졌습니다",
                documentLabel(sanction) + "의 결재자를 기안자가 다른 사람으로 바꿨습니다. 처리할 필요가 없습니다.", "/approvals"));
        if (wasActive) {
            eventPublisher.publishEvent(new NotificationRequestedEvent(eventId, toUserId, "결재 순서 도래",
                    documentLabel(sanction) + "를 확인해 주세요.", pendingLink(id)));
        }
    }

    /**
     * [2026-10-03 D7] 결재자가 반려하지 않고 기안자에게 보완을 요청한다. 문서는 진행 중으로 남고 요청한 결재자의
     * 차례도 그대로다. 기안자가 답하면 같은 결재자 차례로 돌아오며 앞 단계 승인은 유지된다. 한 번에 하나만 열린다.
     */
    @Transactional
    public void requestSupplement(Long id, String question, Integer expectedVersion) {
        InformalSanction sanction = lock(id);
        String actor = SecurityUtil.getCurrentEsntlId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
        List<InformalSanctionDetail> lines = detailRepository.findRevision(id, sanction.getAtrzCycl());
        Optional<InformalSanctionDetail> found = lines.stream().filter(d -> actor.equals(d.getId().getUserId())).findFirst();
        if (found.isEmpty()) assertNotReplacedOut(sanction, actor);
        InformalSanctionDetail ownLine = found.orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
        SecurityUtil.assertOwnerByEsntlId(ownLine.getId().getUserId());
        assertInProgress(sanction, "보완 요청");
        if (ownLine.status() == ApprovalStatus.WAITING) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED, "아직 결재 차례가 아닙니다. 앞 단계의 결재가 끝나면 알림이 옵니다.");
        }
        if (ownLine.status() != ApprovalStatus.ACTIVE) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "이미 처리한 결재입니다. 최신 상태를 확인해 주세요.");
        }
        assertVersion(sanction, expectedVersion);
        String text = requiredText(question, "보완 요청 내용을 적어 주세요.");
        if (openSupplement(lines, cycleProcesses(sanction)) != null) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "이미 보완 요청 중인 문서입니다. 기안자의 답을 기다려 주세요.");
        }
        recordProcess(sanction, ApprovalProcessType.ASK, actor, sanction.getAplcntId(), null, text, LocalDateTime.now());
        entityManager.lock(sanction, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
        eventPublisher.publishEvent(new NotificationRequestedEvent(java.util.UUID.randomUUID(), sanction.getAplcntId(),
                "보완 요청이 왔습니다", documentLabel(sanction)
                        + "에 결재자가 보완을 요청했습니다. 결재함에서 요청 내용을 확인하고 답해 주세요.", submittedLink(id)));
    }

    /**
     * [2026-10-03 D7] 기안자가 열린 보완 요청에 답한다. 본문을 함께 고칠 수 있으며, 고치면 고치기 전 본문을 처리
     * 이력(REVISE)에 남기고 앞서 승인한 사람에게 알린다 — 승인은 그대로 유지된다(D7 규칙).
     *
     * <p>제목은 고치지 않는다. 앞서 승인한 사람이 본 제목을 남길 자리가 처리 이력에 없어, 제목을 바꾸면 승인한 내용의
     * 증거가 사라진다. 저장된 제목은 검사하지도 않는다 — 제목 없이 올라온 문서(V2_101 이전 문서·제목을 비운 기안)도
     * 보완 답변을 할 수 있어야 한다. 제목을 바꾸려면 회수 후 재상신한다.
     */
    @Transactional
    public void answerSupplement(Long id, String answer, String docCn, Integer expectedVersion) {
        InformalSanction sanction = lock(id);
        SecurityUtil.assertOwnerByEsntlId(sanction.getAplcntId());
        assertInProgress(sanction, "보완 답변");
        assertVersion(sanction, expectedVersion);
        List<InformalSanctionDetail> lines = detailRepository.findRevision(id, sanction.getAtrzCycl());
        InformalSanctionProcess ask = openSupplement(lines, cycleProcesses(sanction));
        if (ask == null) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION, "답할 보완 요청이 없습니다. 최신 상태를 확인해 주세요.");
        }
        String text = requiredText(answer, "보완 요청에 대한 답을 적어 주세요.");
        String content = docCn == null ? sanction.getDocCn() : docCn;
        if (content != null && content.length() > 4000) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "본문은 4000자 이내로 적어 주세요.");
        }
        boolean revised = !Objects.equals(content, sanction.getDocCn());
        LocalDateTime now = LocalDateTime.now();
        String before = sanction.getDocCn();
        recordProcess(sanction, ApprovalProcessType.ANSWER, sanction.getAplcntId(), ask.getChgUserIdntfr(), null, text, now);
        if (revised) {
            recordProcess(sanction, ApprovalProcessType.REVISE, sanction.getAplcntId(), null, null,
                    before == null || before.isBlank() ? "(본문 없음)" : before, now);
            sanction.reviseBody(content);
            currentHistory(sanction).reviseBody(sanction);
        } else {
            entityManager.lock(sanction, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
        }
        java.util.UUID eventId = java.util.UUID.randomUUID();
        eventPublisher.publishEvent(new NotificationRequestedEvent(eventId, ask.getChgUserIdntfr(), "보완 답변이 왔습니다",
                documentLabel(sanction) + "에 기안자가 답했습니다. 내용을 확인하고 결재해 주세요.", pendingLink(id)));
        if (revised) {
            lines.stream().filter(d -> d.status() == ApprovalStatus.APPROVED).map(d -> d.getId().getUserId())
                    .distinct().sorted().forEach(receiver -> eventPublisher.publishEvent(new NotificationRequestedEvent(
                            eventId, receiver, "결재한 문서의 내용이 바뀌었습니다", documentLabel(sanction)
                                    + "의 내용을 기안자가 보완했습니다. 앞서 한 승인은 그대로입니다.", processedLink(id))));
        }
    }

    /**
     * [2026-10-04 D4] 지금 차례인 결재자가 참조자를 더한다 — 기안자가 이 차수에 참조자를 한 명도 지정하지 않았을 때만이다.
     * 차례 판정은 승인·보완 요청과 같다: 아직 차례가 아니면(WAITING) 권한 거부 403, 이미 처리했으면 결재 처리와 같은 충돌
     * 409 다(DEC-OPS-187 — 다른 탭에서 승인한 뒤 누른 사람이 권한 오류가 아니라 '최신 상태 확인' 으로 간다). 나머지 검사(기안자·
     * 결재선·사용 중·결재 조회 권한·문서 누적 20명)는 기안자 지정과 같다. 더한 사람은 지금 차수에 지정한 것으로 남는다(개정 1) —
     * 지금 차수에 이미 있는 사람은 무시하고, 이전 차수에만 있던 사람은 지금 차수의 행이 새로 생긴다(이 문서에 처음 참조되는
     * 사람에게만 지정 알림이 간다). 처리 이력에 남기지 않는다 — 참조 행이 지정한 사람을 기록한다. 되돌릴 수 없으므로 읽은 버전이
     * 필수다.
     *
     * @return 지금 차수에 새로 지정한 사람 수(모두 이 차수에 이미 있었으면 0 이며 문서는 바뀌지 않는다)
     */
    @Transactional
    public int addReferences(Long id, List<String> references, Integer expectedVersion) {
        InformalSanction sanction = lock(id);
        String actor = SecurityUtil.getCurrentEsntlId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
        List<InformalSanctionDetail> lines = detailRepository.findRevision(id, sanction.getAtrzCycl());
        Optional<InformalSanctionDetail> found = lines.stream().filter(d -> actor.equals(d.getId().getUserId())).findFirst();
        if (found.isEmpty()) assertNotReplacedOut(sanction, actor);
        InformalSanctionDetail ownLine = found.orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED,
                "지금 차례인 결재자만 참조자를 더할 수 있습니다."));
        SecurityUtil.assertOwnerByEsntlId(ownLine.getId().getUserId());
        assertInProgress(sanction, "참조자 추가");
        if (ownLine.status() == ApprovalStatus.WAITING) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED, "지금 차례인 결재자만 참조자를 더할 수 있습니다.");
        }
        if (ownLine.status() != ApprovalStatus.ACTIVE) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "이미 처리한 결재입니다. 최신 상태를 확인해 주세요.");
        }
        if (expectedVersion == null) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "상세에서 받은 문서 버전을 함께 보내 주세요.");
        }
        assertVersion(sanction, expectedVersion);
        List<InformalSanctionReference> existing = referenceRepository.findForDocuments(List.of(id));
        if (drafterDesignated(sanction, existing)) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "기안자가 참조자를 지정한 결재는 결재자가 참조자를 더할 수 없습니다.");
        }
        Set<String> lineUsers = lines.stream().map(d -> d.getId().getUserId()).collect(Collectors.toSet());
        ReferencePlan designated = validateReferences(sanction.getAplcntId(), sanction.getAtrzCycl(), lineUsers,
                references, existing);
        if (designated.users().isEmpty()) return 0;
        designateReferences(sanction, designated, actor);
        entityManager.lock(sanction, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
        return designated.users().size();
    }

    /** 기안자가 지금 차수에 참조자를 지정했는가 — 지정했으면 결재자는 더할 수 없다. */
    /**
     * 이 차수에 참조자를 더 지정할 자리가 있는가 — 쓰기 검사(validateReferences)와 같은 판정이다. 20명은 서로 다른 사람 수라,
     * 다 찼어도 이전 차수에만 지정된 사람은 이 차수에 다시 지정할 수 있다(자리를 더 차지하지 않는다). 다만 이 차수 결재선에 든
     * 사람과 기안자는 참조자가 될 수 없다.
     */
    private static boolean referenceRoomLeft(InformalSanction sanction, List<InformalSanctionReference> references,
                                             List<InformalSanctionDetail> currentLines) {
        if (references.stream().map(r -> r.getId().getUserId()).distinct().count() < MAX_REFERENCES) return true;
        Set<String> inCycle = references.stream().filter(r -> r.designatedIn(sanction.getAtrzCycl()))
                .map(r -> r.getId().getUserId()).collect(Collectors.toSet());
        Set<String> lineUsers = currentLines.stream().map(d -> d.getId().getUserId()).collect(Collectors.toSet());
        return references.stream().map(r -> r.getId().getUserId())
                .anyMatch(user -> !inCycle.contains(user) && !lineUsers.contains(user) && !user.equals(sanction.getAplcntId()));
    }

    private static boolean drafterDesignated(InformalSanction sanction, List<InformalSanctionReference> references) {
        return references.stream().anyMatch(r -> r.designatedIn(sanction.getAtrzCycl())
                && r.designatedBy(sanction.getAplcntId()));
    }

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    /**
     * 재알림의 '하루' 는 한국 날짜다. 기록 시각은 다른 이력과 같이 JVM 시계로 남으므로 그 순간을 한국 날짜로 옮겨 비교한다 —
     * 서버가 UTC 면 JVM 날짜는 한국 오전 9시에 바뀌어, 같은 날 두 번 보내거나 다음 날 보내지 못한다.
     */
    private static boolean remindedToday(InformalSanctionProcess process) {
        return process.getPrcsTypeCd() == ApprovalProcessType.REMIND
                && process.getCrtDt().atZone(ZoneId.systemDefault()).withZoneSameInstant(BUSINESS_ZONE).toLocalDate()
                        .equals(LocalDate.now(BUSINESS_ZONE));
    }

    private List<InformalSanctionProcess> cycleProcesses(InformalSanction sanction) {
        return processRepository.findForDocuments(List.of(sanction.getIfmlAtrzSn())).stream()
                .filter(p -> p.getAtrzCycl().compareTo(sanction.getAtrzCycl()) == 0).toList();
    }

    /**
     * 처리 이력 한 건을 남긴다. 행위자는 esntlId 로 대조하고, 감사 컬럼(frst_rgtr_id)에는 공통 계약대로 지금 요청한 사람의
     * 로그인 ID 를 싣는다(백엔드 헌법 제8조 3항) — 처리 이력은 늘 그 행위자 본인의 요청 안에서 남는다.
     */
    private void recordProcess(InformalSanction sanction, ApprovalProcessType type, String actor, String targetUserId,
                               String beforeUserId, String content, LocalDateTime at) {
        processRepository.save(InformalSanctionProcess.record(sanction, type, actor, currentLoginId(), targetUserId,
                beforeUserId, content, at));
    }

    /** 로그인 ID 를 알 수 없으면 'SYSTEM' 으로 채우지 않고 거부한다 — 누가 했는지 모르는 처리 이력을 남기지 않는다. */
    private static String currentLoginId() {
        return SecurityUtil.getCurrentLoginId().filter(loginId -> !loginId.isBlank())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED,
                        "로그인 정보를 확인할 수 없어 처리하지 못했습니다. 다시 로그인해 주세요."));
    }

    /**
     * [2026-10-03 D6] 기안자가 결재자를 바꾸면 빠진 사람의 라인은 지워진다. 그 사람이 열어 둔 화면이나 되돌리기 대기열에서
     * 처리하면 자기 라인이 없어 403 이 되는데, 화면은 409 만 충돌로 보고 목록을 다시 읽는다 — 권한 오류로 보이고 문서가
     * 대기함에 남는다. 이 차수에서 그 사람을 바꾼 기록(REPLACE 의 변경 전 사람)이 있을 때만 409 로 사유를 말한다.
     * 결재선에 있던 적이 없는 사람은 호출한 쪽이 그대로 403 으로 거부한다(문서 상태를 알리지 않는다, H3).
     */
    private void assertNotReplacedOut(InformalSanction sanction, String actor) {
        boolean replacedOut = cycleProcesses(sanction).stream().anyMatch(p ->
                p.getPrcsTypeCd() == ApprovalProcessType.REPLACE && actor.equals(p.getBfrUserId()));
        if (replacedOut) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "기안자가 결재자를 바꿔 이 결재선에서 빠졌습니다. 최신 상태를 확인해 주세요.");
        }
    }

    private static String requiredText(String value, String message) {
        String text = value == null ? "" : value.trim();
        if (text.isEmpty() || text.length() > 4000) throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, message);
        return text;
    }

    private InformalSanction lock(Long id) {
        return informalSanctionRepository.findByIdForUpdate(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    /** 진행 중(A)이 아닌 문서를 처리·회수하려는 것은 먼저 일어난 처리와의 충돌이다 — 무슨 일이 있었는지 말한다. */
    private static void assertInProgress(InformalSanction sanction, String action) {
        String status = sanction.getAprvYn();
        if ("A".equals(status)) return;
        String reason = switch (status == null ? "" : status) {
            case "C" -> "이미 승인이 끝난 결재입니다.";
            case "R" -> "이미 반려된 결재입니다.";
            case "W" -> "신청자가 회수한 결재입니다.";
            default -> "진행 중인 결재가 아닙니다.";
        };
        throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                reason + " " + action + "할 수 없습니다. 최신 상태를 확인해 주세요.");
    }

    /**
     * [2026-10-03 D1] 결재 알림은 문서로 바로 간다 — 결재함이 탭과 문서 번호만 읽는다(구조 키, 자유 입력 아님).
     * 처리할 필요가 없는 알림(회수·병렬 반려·결재선에서 빠짐)은 종전대로 결재함으로만 간다.
     */
    static String pendingLink(Long id) { return "/approvals?tab=PENDING&doc=" + id; }

    static String submittedLink(Long id) { return "/approvals?tab=SUBMITTED&doc=" + id; }

    static String processedLink(Long id) { return "/approvals?tab=PROCESSED&doc=" + id; }

    /** [2026-10-04 D4] 참조자에게 가는 알림(지정·최종 결과)은 '참조된 결재' 의 그 문서로 간다. */
    static String referencedLink(Long id) { return "/approvals?tab=REFERENCED&doc=" + id; }

    /** 알림 본문에서 문서를 가리키는 말. 제목이 있으면 제목으로, 번호는 결재함 목록에서 찾는 열쇠로 함께 싣는다. */
    static String documentLabel(InformalSanction sanction) {
        String title = sanction.getDocTtl();
        String number = "결재(번호 " + sanction.getIfmlAtrzSn() + ")";
        return title == null || title.isBlank() ? number : "「" + title.trim() + "」 " + number;
    }

    private static void assertVersion(InformalSanction sanction, Integer expectedVersion) {
        if (expectedVersion != null && (expectedVersion < 0 || !expectedVersion.equals(sanction.getVersion()))) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "다른 사용자가 문서를 변경했습니다. 최신 상태를 확인해 주세요.");
        }
    }

    private InformalSanctionHistory currentHistory(InformalSanction sanction) {
        return historyRepository.findById(new InformalSanctionHistoryId(
                        sanction.getIfmlAtrzSn(), sanction.getAtrzCycl()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.INVALID_STATE, "결재 차수 이력을 확인할 수 없습니다."));
    }

    private void createRevision(InformalSanction sanction, List<ApprovalStageRequest> stages) {
        historyRepository.saveAndFlush(InformalSanctionHistory.create(sanction));
        List<InformalSanctionDetail> lines = new ArrayList<>();
        for (int i = 0; i < stages.size(); i++) {
            ApprovalStageRequest stage = stages.get(i);
            for (String userId : stage.approverIds()) {
                lines.add(InformalSanctionDetail.create(new InformalSanctionDetailId(
                        sanction.getIfmlAtrzSn(), sanction.getAtrzCycl(), BigDecimal.valueOf(i + 1), userId),
                        stage.kind(), i == 0));
            }
        }
        detailRepository.saveAll(lines);
        publishStageAvailable(sanction, lines);
    }

    private void publishStageAvailable(InformalSanction sanction, List<InformalSanctionDetail> lines) {
        List<String> receivers = lines.stream().filter(d -> d.status() == ApprovalStatus.ACTIVE)
                .map(d -> d.getId().getUserId()).toList();
        java.util.UUID eventId = java.util.UUID.randomUUID();
        receivers.stream().sorted().forEach(receiver -> eventPublisher.publishEvent(
                new NotificationRequestedEvent(eventId, receiver, "결재 순서 도래",
                        documentLabel(sanction) + "를 확인해 주세요.", pendingLink(sanction.getIfmlAtrzSn()))));
    }

    private void publishFinalStatus(InformalSanction sanction, String actor, String opinion,
                                    List<InformalSanctionDetail> lines) {
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(sanction.getIfmlAtrzSn(),
                sanction.getAplcntId(), actor, SanctionStatus.fromCode(sanction.getAprvYn()), opinion, sanction.getDocTtl());
        eventPublisher.publishEvent(event);
        publishReferenceResult(sanction, lines);
    }

    /**
     * [2026-10-04 D4] 최종 결과(승인 C·반려 R)를 지금 차수의 참조자에게 알린다 — 이 차수의 행이 있는 사람만이다(재상신 때 다시
     * 지정한 이전 차수 참조자도 이 차수의 행이 있으므로 받는다). 이 차수에 지정되지 않은 이전 차수 참조자는 계속 읽지만 이 알림은
     * 받지 않는다. 회수(W)는 이 경로를 타지 않는다. 기안자와 이 차수의 결재선 사람은 각자의 알림을 받으므로 뺀다. 결과
     * 알림(신청자)과 같은 eventId 를 쓰지 않는다 — 멱등 키가 (eventId, 받는 사람)이라 내용이 다른 같은 키는 업무 트랜잭션을
     * 되돌린다. 반려 사유는 싣지 않는다(본문 상한).
     *
     * <p>[개정 1] 실제로 있는 사용자에게만 보낸다. 참조 행은 사용자 삭제 뒤에도 남지만(사용자 FK 없음, V2_123) 알림 행
     * (tb_user_noti)은 사용자 FK 가 있고 이 업무 트랜잭션 안에서 저장된다 — 지워진 참조자에게 보내면 FK 위반으로 승인·반려
     * 전체가 되돌아가고, 참조는 지울 수 없어 회수 말고는 빠져나갈 길이 없다.
     */
    private void publishReferenceResult(InformalSanction sanction, List<InformalSanctionDetail> lines) {
        Set<String> excluded = lines.stream().map(d -> d.getId().getUserId()).collect(Collectors.toCollection(HashSet::new));
        excluded.add(sanction.getAplcntId());
        List<String> candidates = referenceRepository.findForDocuments(List.of(sanction.getIfmlAtrzSn())).stream()
                .filter(r -> r.designatedIn(sanction.getAtrzCycl()))
                .map(r -> r.getId().getUserId()).filter(userId -> !excluded.contains(userId))
                .distinct().sorted().toList();
        if (candidates.isEmpty()) return;
        Set<String> existing = userRepository.findAllById(candidates).stream().map(User::getEsntlId)
                .collect(Collectors.toSet());
        List<String> receivers = candidates.stream().filter(existing::contains).toList();
        if (receivers.isEmpty()) return;
        boolean approved = "C".equals(sanction.getAprvYn());
        String title = approved ? "결재가 완료되었습니다" : "결재가 반려되었습니다";
        String content = documentLabel(sanction) + (approved ? "가 최종 승인되었습니다." : "가 반려되었습니다.")
                + " 참조로 받은 문서입니다.";
        java.util.UUID eventId = java.util.UUID.randomUUID();
        receivers.forEach(receiver -> eventPublisher.publishEvent(new NotificationRequestedEvent(eventId, receiver,
                title, content, referencedLink(sanction.getIfmlAtrzSn()))));
    }

    /**
     * 참조자 지정 계획 — {@code cycle} 차수에 새로 넣을 사람(요청 순서)과 그중 이 문서에 처음 참조되는 사람(지정 알림을 받는다).
     * 이전 차수 참조자를 다시 지정하면 그 차수의 행은 생기지만 알림은 다시 보내지 않는다(개정 1).
     */
    private record ReferencePlan(List<String> users, List<String> firstTime) {
        static final ReferencePlan NONE = new ReferencePlan(List.of(), List.of());
    }

    /**
     * [2026-10-04 D4 개정 1] 참조자 검사. 지정은 차수 단위다 — 돌려주는 것은 {@code cycle} 차수에 <b>새로</b> 지정할 사람이며,
     * 그 차수에 이미 있는 사람은 무시한다(참조는 추가만 한다). 이전 차수에만 있던 사람은 이 차수의 지정이 된다. 기안자 지정과
     * 결재자 추가가 같은 검사를 쓴다: 형식·중복, 기안자 본인 금지, 이 차수 결재선과 겹침 금지(겸직 금지는 이 차수 기준이다 —
     * 이전 차수 참조자는 다음 차수 결재자가 될 수 있다), 문서 누적 서로 다른 20명, 사용 중(P)인 계정, 결재 조회 권한
     * (APPROVAL_READ — 없으면 지정해도 읽을 수 없다). 사용·권한 검사는 이 차수에 새로 지정할 사람 모두가 받는다 — 이전 차수
     * 참조자라도 다시 지정하면 지금 자격을 본다. 사용 중이 아니거나 권한이 없는 사람은 이름을 밝히고, 없는 식별자는 식별자를
     * 되돌려 주지 않는 일반 문구로 거부한다(결재자 검사와 같은 공개 수준). 오류는 모두 입력 오류(400)다 — 거부 사유가
     * 권한(403)이 아니라 고른 사람이다.
     *
     * @param cycle     지정할 차수(상신은 1, 재상신은 새 차수, 결재자 추가는 지금 차수)
     * @param lineUsers 같은 차수의 결재선 사람(상신·재상신은 요청의 결재선, 결재자 추가는 지금 차수의 결재선)
     * @param existing  이 문서의 참조 행 전부(모든 차수, 새 문서는 빈 목록)
     */
    private ReferencePlan validateReferences(String applicant, BigDecimal cycle, Set<String> lineUsers,
                                             List<String> requested, List<InformalSanctionReference> existing) {
        if (requested == null || requested.isEmpty()) return ReferencePlan.NONE;
        if (requested.size() > MAX_REFERENCES) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "참조자는 한 번에 " + MAX_REFERENCES + "명까지 지정할 수 있습니다.");
        }
        Set<String> unique = new LinkedHashSet<>();
        for (String user : requested) {
            if (user == null || user.isBlank() || user.length() > 20 || !user.equals(user.trim())) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "참조자를 지정해 주세요.");
            }
            if (!unique.add(user)) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "같은 참조자를 중복 지정할 수 없습니다.");
            }
        }
        if (unique.contains(applicant)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "기안자 본인은 참조자로 지정할 수 없습니다.");
        }
        if (unique.stream().anyMatch(lineUsers::contains)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "결재선에 있는 사람은 참조자로 지정할 수 없습니다.");
        }
        Set<String> inCycle = existing.stream().filter(r -> r.designatedIn(cycle)).map(r -> r.getId().getUserId())
                .collect(Collectors.toSet());
        List<String> fresh = unique.stream().filter(user -> !inCycle.contains(user)).toList();
        if (fresh.isEmpty()) return ReferencePlan.NONE;
        Set<String> already = existing.stream().map(r -> r.getId().getUserId()).collect(Collectors.toSet());
        List<String> firstTime = fresh.stream().filter(user -> !already.contains(user)).sorted().toList();
        if (already.size() + firstTime.size() > MAX_REFERENCES) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "참조자는 한 문서에 " + MAX_REFERENCES
                    + "명까지 지정할 수 있습니다. 지금 " + already.size() + "명이 지정돼 있습니다.");
        }
        List<User> found = userRepository.findAllById(fresh);
        List<String> inactiveNames = found.stream()
                .filter(u -> !"P".equals(u.getUserSttsCd()))
                .map(User::getUserNm)
                .filter(name -> name != null && !name.isBlank())
                .sorted()
                .toList();
        if (!inactiveNames.isEmpty()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "사용 중이 아닌 계정은 참조자로 지정할 수 없습니다: " + String.join(", ", inactiveNames));
        }
        Set<String> active = found.stream()
                .filter(u -> "P".equals(u.getUserSttsCd())).map(User::getEsntlId).collect(Collectors.toSet());
        if (!active.containsAll(fresh)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "참조자로 지정할 수 없는 사용자입니다.");
        }
        Set<String> readers = new HashSet<>(userRepository.findActiveEsntlIdsHoldingPermission(READ_PERMISSION));
        List<String> unreadableNames = found.stream()
                .filter(u -> !readers.contains(u.getEsntlId()))
                .map(u -> u.getUserNm() == null || u.getUserNm().isBlank() ? "이름 없는 사용자" : u.getUserNm())
                .sorted()
                .toList();
        if (!unreadableNames.isEmpty()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "결재 조회 권한이 없는 사용자는 참조자로 지정할 수 없습니다: " + String.join(", ", unreadableNames));
        }
        return new ReferencePlan(fresh, firstTime);
    }

    /**
     * 참조 행을 지금 차수로 넣고, 이 문서에 처음 참조되는 사람에게만 알린다(이전 차수 참조자를 다시 지정하면 행만 생긴다).
     * 행은 결재 차수 이력 뒤에 넣는다(지정 차수가 그 이력에 FK 로 묶인다). 지정 알림의 받는 사람은 {@link #validateReferences}
     * 가 같은 트랜잭션에서 실제로 있고 사용 중인 계정임을 확인한 사람뿐이다 — 없는 사용자에게 보내 알림 FK 로 업무가 되돌아가는
     * 경로가 없다. 지정 알림은 결재 순서 알림과 다른 eventId 를 쓴다 — 이전 차수의 참조자가 새 결재선에 들 수 있어 같은 사람이
     * 두 알림을 받을 수 있고, 멱등 키가 (eventId, 받는 사람)이라 같은 eventId 면 업무 트랜잭션이 되돌아간다.
     */
    private void designateReferences(InformalSanction sanction, ReferencePlan plan, String designatorId) {
        if (plan.users().isEmpty()) return;
        String loginId = currentLoginId();
        LocalDateTime now = LocalDateTime.now();
        referenceRepository.saveAll(plan.users().stream()
                .map(userId -> InformalSanctionReference.designate(sanction, userId, designatorId, loginId, now))
                .toList());
        java.util.UUID eventId = java.util.UUID.randomUUID();
        plan.firstTime().forEach(receiver -> eventPublisher.publishEvent(new NotificationRequestedEvent(eventId,
                receiver, "참조로 지정되었습니다", documentLabel(sanction)
                        + "를 참조로 받았습니다. 결재함의 '참조된 결재' 에서 읽을 수 있습니다.",
                referencedLink(sanction.getIfmlAtrzSn()))));
    }

    private static Set<String> lineUsers(List<ApprovalStageRequest> stages) {
        return stages.stream().flatMap(stage -> stage.approverIds().stream()).collect(Collectors.toSet());
    }

    private List<ApprovalStageRequest> validateStages(String applicant, List<ApprovalStageRequest> requests) {
        if (requests == null || requests.isEmpty() || requests.size() > 10) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "결재 단계는 1개 이상 10개 이하로 지정해 주세요.");
        }
        Set<String> participants = new LinkedHashSet<>();
        List<ApprovalStageRequest> stages = new ArrayList<>();
        for (ApprovalStageRequest request : requests) {
            if (request == null || request.kind() == null || request.approverIds() == null
                    || request.approverIds().isEmpty() || request.approverIds().size() > 10) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "각 단계의 결재자는 1명 이상 10명 이하로 지정해 주세요.");
            }
            List<String> users = new ArrayList<>();
            for (String user : request.approverIds()) {
                if (user == null || user.isBlank() || user.length() > 20 || !user.equals(user.trim())) {
                    throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "결재자를 지정해 주세요.");
                }
                if (user.equals(applicant)) {
                    throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "본인에게 결재를 요청할 수 없습니다.");
                }
                if (!participants.add(user)) {
                    throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "같은 결재자를 한 문서에 중복 지정할 수 없습니다.");
                }
                users.add(user);
            }
            users.sort(String::compareTo);
            stages.add(new ApprovalStageRequest(request.kind(), List.copyOf(users)));
        }
        if (participants.size() > 50) throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                "전체 결재자는 50명 이하로 지정해 주세요.");
        List<User> found = userRepository.findAllById(participants);
        // [2026-09-26 DIP B4 P4] 거부 사유에 대상자 이름을 싣는다 — 여러 결재자 중 누가 문제인지 화면이 말할 수 있어야 한다.
        //   존재하지 않는 식별자는 이름이 없으므로 종전 문구를 쓴다(식별자를 되돌려 주지 않는다).
        List<String> inactiveNames = found.stream()
                .filter(u -> !"P".equals(u.getUserSttsCd()))
                .map(User::getUserNm)
                .filter(name -> name != null && !name.isBlank())
                .sorted()
                .toList();
        if (!inactiveNames.isEmpty()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "사용 중이 아닌 계정은 결재자로 지정할 수 없습니다: " + String.join(", ", inactiveNames));
        }
        Set<String> active = found.stream()
                .filter(u -> "P".equals(u.getUserSttsCd())).map(User::getEsntlId).collect(Collectors.toSet());
        if (!active.containsAll(participants)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "결재자로 지정할 수 없는 사용자입니다.");
        }
        // [2026-10-01] 결재 권한(APPROVAL_APPROVE)이 없는 사람에게 올리면 그 단계에서 문서가 멈춘다 — 서버가 그 사람의
        //   승인을 403 으로 거부하고, 대신 처리할 경로도 없다. 상신 시점에 이름을 밝혀 거부한다(사용 중지 계정과 같은 형태).
        Set<String> approvers = new HashSet<>(userRepository.findActiveEsntlIdsHoldingPermission(APPROVE_PERMISSION));
        List<String> unauthorizedNames = found.stream()
                .filter(u -> !approvers.contains(u.getEsntlId()))
                .map(u -> u.getUserNm() == null || u.getUserNm().isBlank() ? "이름 없는 사용자" : u.getUserNm())
                .sorted()
                .toList();
        if (!unauthorizedNames.isEmpty()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "결재 권한이 없는 사용자는 결재자로 지정할 수 없습니다: " + String.join(", ", unauthorizedNames));
        }
        return List.copyOf(stages);
    }

    private static List<ApprovalStageRequest> legacyStages(InformalSanctionDto dto) {
        String approver = dto.getAprvrId();
        if (approver == null || approver.isBlank()) throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                "결재자를 지정해 주세요.");
        return List.of(new ApprovalStageRequest(ApprovalStageKind.APPROVAL, List.of(approver)));
    }

    private void validateDocument(InformalSanctionDto dto) {
        Objects.requireNonNull(dto);
        if (dto.getTaskSeCd() == null || dto.getTaskSeCd().length() > 12
                || dto.getDocTtl() != null && dto.getDocTtl().length() > 256
                || dto.getDocCn() != null && dto.getDocCn().length() > 4000) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        boolean known = getTaskTypes().stream().anyMatch(c -> Objects.equals(c.dtlCd(), dto.getTaskSeCd()));
        if (!known) throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "등록되지 않은 업무 구분 코드입니다.");
    }

    private static String requestDate(String requestDate) {
        if (requestDate == null || requestDate.isBlank()) return LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        try {
            return LocalDate.parse(requestDate.replace("-", ""), DateTimeFormatter.BASIC_ISO_DATE)
                    .format(DateTimeFormatter.BASIC_ISO_DATE);
        } catch (DateTimeParseException e) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "유효한 신청 일자를 지정해 주세요.");
        }
    }

    private static void assertCurrentParticipant(String participant) {
        if (participant == null || participant.isBlank() || participant.length() > 20) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        SecurityUtil.assertOwnerByEsntlId(participant);
    }

    private Page<InformalSanctionDto> toDtoPage(Page<InformalSanction> page, String actor) {
        if (page.isEmpty()) return page.map(informalSanctionMapper::toDto);
        List<Long> ids = page.stream().map(InformalSanction::getIfmlAtrzSn).toList();
        List<InformalSanctionDetail> lines = detailRepository.findVisibleForDocuments(ids, actor);
        List<InformalSanctionHistory> history = historyRepository.findVisibleForDocuments(ids, actor);
        List<InformalSanctionProcess> processes = processRepository.findForDocuments(ids);
        // [D4] 참조자 여부·결재자 추가 힌트에 쓴다. 참조자 목록(이름)은 상세에만 싣는다.
        List<InformalSanctionReference> references = referenceRepository.findForDocuments(ids);
        Map<String, String> users = userNames(page.getContent(), lines, processes);
        Set<String> absent = absentUsers(lines);
        Map<String, String> tasks = taskTypeNames();
        Map<Long, List<InformalSanctionDetail>> byDocument = lines.stream().collect(Collectors.groupingBy(d -> d.getId().getIfmlAtrzSn()));
        Map<Long, List<InformalSanctionHistory>> revisions = history.stream().collect(Collectors.groupingBy(h -> h.getId().getIfmlAtrzSn()));
        Map<Long, List<InformalSanctionProcess>> processByDocument = processes.stream().collect(Collectors.groupingBy(InformalSanctionProcess::getIfmlAtrzSn));
        Map<Long, List<InformalSanctionReference>> referencesByDocument = references.stream()
                .collect(Collectors.groupingBy(r -> r.getId().getIfmlAtrzSn()));
        return page.map(s -> toParticipantDto(s, actor, byDocument.getOrDefault(s.getIfmlAtrzSn(), List.of()),
                revisions.getOrDefault(s.getIfmlAtrzSn(), List.of()), processByDocument.getOrDefault(s.getIfmlAtrzSn(), List.of()),
                referencesByDocument.getOrDefault(s.getIfmlAtrzSn(), List.of()), users, absent, tasks, Map.of(), false));
    }

    /** 상세의 참조자 이름·부서(사용자 검색과 같은 최소 필드). 참조자가 없으면 조회하지 않는다. */
    private Map<String, nuri.business.service.user.dto.UserSearchDto> referenceProfiles(
            List<InformalSanctionReference> references) {
        if (references.isEmpty()) return Map.of();
        return userRepository.findProfilesByEsntlIds(references.stream().map(r -> r.getId().getUserId()).distinct().toList())
                .stream().collect(Collectors.toMap(nuri.business.service.user.dto.UserSearchDto::esntlId,
                        java.util.function.Function.identity(), (first, second) -> first));
    }

    private Map<String, String> userNames(List<InformalSanction> sanctions, List<InformalSanctionDetail> lines,
                                          List<InformalSanctionProcess> processes) {
        Set<String> ids = new HashSet<>();
        sanctions.forEach(s -> { if (s.getAplcntId() != null) ids.add(s.getAplcntId()); });
        lines.forEach(d -> ids.add(d.getId().getUserId()));
        // 결재선에서 빠진 사람도 처리 이력에는 이름으로 남아야 한다.
        processes.forEach(p -> {
            ids.add(p.getChgUserIdntfr());
            if (p.getTrgtUserId() != null) ids.add(p.getTrgtUserId());
            if (p.getBfrUserId() != null) ids.add(p.getBfrUserId());
        });
        return userRepository.findAllById(ids).stream().collect(Collectors.toMap(User::getEsntlId,
                u -> u.getUserNm() == null ? "" : u.getUserNm(), (first, second) -> first));
    }

    /** [2026-10-03] 결재선에 있는 사람 중 부재 중인 사람. 결재선을 보는 사람이 늦어질 차례를 미리 안다. */
    private Set<String> absentUsers(List<InformalSanctionDetail> lines) {
        Set<String> ids = lines.stream().map(d -> d.getId().getUserId()).collect(Collectors.toSet());
        if (ids.isEmpty()) return Set.of();
        return userRepository.findProfilesByEsntlIds(ids).stream()
                .filter(profile -> Boolean.TRUE.equals(profile.absent()))
                .map(nuri.business.service.user.dto.UserSearchDto::esntlId).collect(Collectors.toSet());
    }

    private Map<String, String> taskTypeNames() {
        return getTaskTypes().stream().filter(c -> c.dtlCd() != null)
                .collect(Collectors.toMap(CommonCodeDto::dtlCd, c -> c.dtlCdNm() == null ? "" : c.dtlCdNm(),
                        (first, second) -> first));
    }

    private InformalSanctionDto toParticipantDto(InformalSanction sanction, String actor,
            List<InformalSanctionDetail> lines, List<InformalSanctionHistory> revisions,
            List<InformalSanctionProcess> processes, List<InformalSanctionReference> references,
            Map<String, String> users, Set<String> absent, Map<String, String> tasks,
            Map<String, nuri.business.service.user.dto.UserSearchDto> referenceProfiles, boolean includeHistory) {
        boolean owner = actor.equals(sanction.getAplcntId());
        // [2026-10-04 D4] 참조자는 기안자처럼 모든 차수를 읽는다 — 이 문서에 지금 사용자의 참조 행이 있는가로만 가린다
        //   (참조자 목록이 비었는지로 가리지 않는다). 쓰기 힌트 계산은 바꾸지 않는다 — 결재선 라인이나 신청자를 요구하므로
        //   참조자에게는 하나도 켜지지 않는다.
        boolean referenceViewer = references.stream().anyMatch(r -> actor.equals(r.getId().getUserId()));
        Set<BigDecimal> allowed = lines.stream().filter(d -> actor.equals(d.getId().getUserId()))
                .map(d -> d.getId().getAtrzCycl()).collect(Collectors.toSet());
        if (owner || referenceViewer) revisions.forEach(h -> allowed.add(h.getId().getAtrzCycl()));
        boolean current = owner || referenceViewer || allowed.contains(sanction.getAtrzCycl());
        BigDecimal visibleCycle = current ? sanction.getAtrzCycl() : allowed.stream().max(BigDecimal::compareTo)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        InformalSanctionDto dto = informalSanctionMapper.toDto(sanction);
        if (!current) {
            InformalSanctionHistory visible = revisions.stream()
                    .filter(h -> h.getId().getAtrzCycl().compareTo(visibleCycle) == 0).findFirst()
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
            dto.setDocTtl(visible.getDocTtl()); dto.setDocCn(visible.getDocCn());
            dto.setTaskSeCd(visible.getTaskSeCd()); dto.setReqYmd(visible.getReqYmd());
            dto.setAprvYn(visible.getAprvYn()); dto.setAtrzDt(visible.getAtrzDt());
            dto.setRjctRsnCn(visible.getRjctRsnCn()); dto.setVersion(null);
            dto.setAprvrId(lines.stream().filter(d -> d.getId().getAtrzCycl().compareTo(visibleCycle) == 0)
                    .sorted(Comparator.comparing((InformalSanctionDetail d) -> d.getId().getAtrzSeq())
                            .thenComparing(d -> d.getId().getUserId())).map(d -> d.getId().getUserId()).findFirst().orElse(null));
        }
        dto.setAtrzCycl(visibleCycle.intValueExact());
        dto.setTaskSeNm(tasks.getOrDefault(dto.getTaskSeCd(), ""));
        dto.setAplcntNm(users.getOrDefault(sanction.getAplcntId(), ""));
        dto.setAprvrNm(users.getOrDefault(dto.getAprvrId(), ""));
        List<InformalSanctionDetail> visibleLines = lines.stream()
                .filter(d -> d.getId().getAtrzCycl().compareTo(visibleCycle) == 0).toList();
        dto.setStages(stageDtos(visibleLines, users, absent));
        // 힌트는 서버가 그 요청을 실제로 받아 줄 때만 참이다 — 참여 조건뿐 아니라 그 동작의 기능 권한도 본다.
        // 권한을 회수한 그룹에게 버튼이 남으면 누른 뒤에야 403 을 만난다.
        dto.setCanApprove(current && "A".equals(sanction.getAprvYn()) && SecurityUtil.hasPermission(APPROVE_PERMISSION)
                && visibleLines.stream()
                .anyMatch(d -> actor.equals(d.getId().getUserId()) && d.status() == ApprovalStatus.ACTIVE));
        dto.setCanWithdraw(current && owner && "A".equals(sanction.getAprvYn())
                && SecurityUtil.hasPermission(WITHDRAW_PERMISSION));
        dto.setCanResubmit(current && owner && List.of("R", "W").contains(sanction.getAprvYn())
                && SecurityUtil.hasPermission(DRAFT_PERMISSION));
        dto.setHistory(includeHistory ? revisions.stream().filter(h -> allowed.contains(h.getId().getAtrzCycl()))
                .sorted(Comparator.comparing((InformalSanctionHistory h) -> h.getId().getAtrzCycl()).reversed())
                .map(h -> new ApprovalRevisionDto(h.getId().getAtrzCycl().intValueExact(), h.getDocTtl(), h.getDocCn(),
                        h.getAprvYn(), h.getReqYmd(), h.getAtrzDt(), stageDtos(lines.stream()
                                .filter(d -> d.getId().getAtrzCycl().compareTo(h.getId().getAtrzCycl()) == 0).toList(), users, absent)))
                .toList() : List.of());
        // [2026-10-03 결재 동선 개선] 진행 중인 현재 차수에만 붙는 힌트 — 지금 단계 시작 시각, 열린 보완 요청, 기안자의
        //   재알림·결재자 바꾸기·보완 답변, 결재자의 보완 요청. 서버가 받아 줄 때만 참이다(아래 쓰기 메서드와 같은 판정).
        boolean inProgress = current && "A".equals(sanction.getAprvYn());
        List<InformalSanctionProcess> cycleProcesses = processes.stream()
                .filter(p -> p.getAtrzCycl().compareTo(sanction.getAtrzCycl()) == 0).toList();
        InformalSanctionProcess openAsk = inProgress ? openSupplement(visibleLines, cycleProcesses) : null;
        dto.setOpenSupplement(openAsk == null ? null : new ApprovalSupplementDto(openAsk.getChgUserIdntfr(),
                users.getOrDefault(openAsk.getChgUserIdntfr(), ""), openAsk.getPrcsCn(), openAsk.getCrtDt()));
        dto.setCurrentStageSince(inProgress ? stageSince(visibleLines, revisions, sanction) : null);
        boolean drafter = inProgress && owner && SecurityUtil.hasPermission(DRAFT_PERMISSION);
        boolean remindedToday = cycleProcesses.stream().anyMatch(InformalSanctionService::remindedToday);
        dto.setRemindedToday(inProgress && owner && remindedToday);
        dto.setCanRemind(drafter && !remindedToday);
        dto.setCanReplaceApprover(drafter && visibleLines.stream()
                .anyMatch(d -> d.status() == ApprovalStatus.WAITING || d.status() == ApprovalStatus.ACTIVE));
        dto.setCanAnswerSupplement(drafter && openAsk != null);
        dto.setCanRequestSupplement(dto.isCanApprove() && openAsk == null);
        // [2026-10-04 D4 개정 1] 참조자. 숨은 참조가 아니다 — 보는 사람이 볼 수 있는 가장 높은 차수까지 지정된 사람을 사람마다
        //   한 줄로 싣는다. 이전 차수에만 참여한 결재자는 그 뒤에 처음 지정된 참조자를 보지 않는다(차수 공개 원칙). 결재자 추가
        //   힌트는 쓰기 메서드와 같은 판정이다(20명은 서로 다른 사람 수다).
        dto.setReferenceViewer(referenceViewer);
        dto.setReferences(includeHistory ? visibleReferences(references, allowed, sanction, referenceProfiles) : List.of());
        dto.setCanAddReference(dto.isCanApprove() && !drafterDesignated(sanction, references)
                && referenceRoomLeft(sanction, references, visibleLines));
        dto.setProcessHistory(includeHistory ? processes.stream().filter(p -> allowed.contains(p.getAtrzCycl()))
                .map(p -> new ApprovalProcessDto(p.getPrcsTypeCd(), p.getAtrzCycl().intValueExact(),
                        users.getOrDefault(p.getChgUserIdntfr(), ""),
                        p.getTrgtUserId() == null ? null : users.getOrDefault(p.getTrgtUserId(), ""),
                        p.getBfrUserId() == null ? null : users.getOrDefault(p.getBfrUserId(), ""),
                        p.getPrcsCn(), p.getCrtDt()))
                .toList() : List.of());
        return dto;
    }

    /**
     * 보완 요청이 열려 있는가 — 같은 차수의 마지막 ASK 뒤에 ANSWER 가 없고, 요청한 결재자가 아직 차례일 때다.
     * 요청한 사람이 승인·반려했거나 결재선에서 빠지면 요청은 닫힌다. 결재선에서 빠지면(REPLACE 의 변경 전 사람) 그
     * 요청은 영영 닫힌다 — 기안자가 같은 사람을 다시 넣어도 앞 자리의 요청이 되살아나지 않는다.
     */
    private static InformalSanctionProcess openSupplement(List<InformalSanctionDetail> currentLines,
                                                          List<InformalSanctionProcess> cycleProcesses) {
        InformalSanctionProcess lastAsk = null;
        for (InformalSanctionProcess process : cycleProcesses) {
            if (process.getPrcsTypeCd() == ApprovalProcessType.ASK) lastAsk = process;
            else if (process.getPrcsTypeCd() == ApprovalProcessType.ANSWER) lastAsk = null;
            else if (process.getPrcsTypeCd() == ApprovalProcessType.REPLACE && lastAsk != null
                    && lastAsk.getChgUserIdntfr().equals(process.getBfrUserId())) lastAsk = null;
        }
        if (lastAsk == null) return null;
        String asker = lastAsk.getChgUserIdntfr();
        return currentLines.stream().anyMatch(d -> asker.equals(d.getId().getUserId()) && d.status() == ApprovalStatus.ACTIVE)
                ? lastAsk : null;
    }

    /** 지금 단계가 시작된 시각 — 앞 단계의 마지막 결정 시각, 첫 단계면 이 차수를 올린 시각. */
    private static LocalDateTime stageSince(List<InformalSanctionDetail> lines, List<InformalSanctionHistory> revisions,
                                            InformalSanction sanction) {
        Optional<BigDecimal> activeStage = lines.stream().filter(d -> d.status() == ApprovalStatus.ACTIVE)
                .map(d -> d.getId().getAtrzSeq()).min(BigDecimal::compareTo);
        if (activeStage.isEmpty()) return null;
        Optional<LocalDateTime> previous = lines.stream()
                .filter(d -> d.getId().getAtrzSeq().compareTo(activeStage.get()) < 0)
                .map(InformalSanctionDetail::getAtrzDt).filter(Objects::nonNull).max(Comparator.naturalOrder());
        if (previous.isPresent()) return previous.get();
        return revisions.stream().filter(h -> h.getId().getAtrzCycl().compareTo(sanction.getAtrzCycl()) == 0)
                .map(InformalSanctionHistory::getCrtDt).filter(Objects::nonNull).findFirst().orElse(null);
    }

    /**
     * [2026-10-04 D4 개정 1] 보는 사람에게 보이는 참조자 — 지정 차수가 그 사람이 볼 수 있는 가장 높은 차수 이하인 행이다(신청자·
     * 참조자는 지금 차수까지 모두 본다). 지정은 차수 단위라 한 사람이 여러 행일 수 있어, 사람마다 한 줄로 묶고 그 사람에게 보이는
     * 가장 최근 지정(가장 높은 차수)을 싣는다. 순서는 그 사람이 처음 지정된 순서다(다시 지정돼도 자리가 바뀌지 않는다).
     */
    private static List<ApprovalReferenceDto> visibleReferences(List<InformalSanctionReference> references,
            Set<BigDecimal> allowed, InformalSanction sanction,
            Map<String, nuri.business.service.user.dto.UserSearchDto> profiles) {
        // 볼 수 있는 차수가 없으면 0 — 차수는 1 부터라 아무 행도 보이지 않는다.
        BigDecimal horizon = allowed.stream().max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        Map<String, InformalSanctionReference> latest = new LinkedHashMap<>();
        references.stream().filter(r -> r.getAtrzCycl().compareTo(horizon) <= 0)
                .forEach(r -> latest.merge(r.getId().getUserId(), r,
                        (kept, next) -> next.getAtrzCycl().compareTo(kept.getAtrzCycl()) > 0 ? next : kept));
        return latest.values().stream().map(r -> toReferenceDto(r, sanction, profiles)).toList();
    }

    /** 참조자 한 사람 — 이름·부서만 싣고 연락처는 싣지 않는다. 지정한 사람이 기안자면 기안자 지정이다. */
    private static ApprovalReferenceDto toReferenceDto(InformalSanctionReference reference, InformalSanction sanction,
            Map<String, nuri.business.service.user.dto.UserSearchDto> profiles) {
        nuri.business.service.user.dto.UserSearchDto profile = profiles.get(reference.getId().getUserId());
        return new ApprovalReferenceDto(reference.getId().getUserId(),
                profile == null || profile.userNm() == null ? "" : profile.userNm(),
                profile == null ? null : profile.deptNm(), reference.getAtrzCycl().intValueExact(),
                ApprovalReferenceDesignator.of(reference, sanction.getAplcntId()), reference.getCrtDt());
    }

    private static List<ApprovalStageDto> stageDtos(List<InformalSanctionDetail> lines, Map<String, String> users,
                                                    Set<String> absent) {
        Map<BigDecimal, List<InformalSanctionDetail>> stages = lines.stream().collect(Collectors.groupingBy(
                d -> d.getId().getAtrzSeq(), TreeMap::new, Collectors.toList()));
        return stages.entrySet().stream().map(entry -> {
            List<InformalSanctionDetail> group = entry.getValue().stream()
                    .sorted(Comparator.comparing(d -> d.getId().getUserId())).toList();
            ApprovalStatus status;
            if (group.stream().anyMatch(d -> d.status() == ApprovalStatus.REJECTED)) status = ApprovalStatus.REJECTED;
            else if (group.stream().anyMatch(d -> d.status() == ApprovalStatus.ACTIVE)) status = ApprovalStatus.ACTIVE;
            else if (group.stream().allMatch(d -> d.status() == ApprovalStatus.APPROVED)) status = ApprovalStatus.APPROVED;
            else if (group.stream().anyMatch(d -> d.status() == ApprovalStatus.CANCELLED)) status = ApprovalStatus.CANCELLED;
            else status = ApprovalStatus.WAITING;
            return new ApprovalStageDto(entry.getKey().intValueExact(), group.getFirst().kind(), status,
                    group.stream().map(d -> new ApprovalApproverDto(d.getId().getUserId(),
                            users.getOrDefault(d.getId().getUserId(), ""), d.status(), d.getAtrzOpnnCn(), d.getAtrzDt(),
                            absent.contains(d.getId().getUserId()))).toList());
        }).toList();
    }
}
