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
    private final EntityManager entityManager;

    static final String TASK_TYPE_CODE_GROUP = "COM075";
    private static final String APPROVE_PERMISSION = "APPROVAL_APPROVE";
    private static final String WITHDRAW_PERMISSION = "APPROVAL_CANCEL";
    private static final String DRAFT_PERMISSION = "APPROVAL_CREATE";
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

    public List<CommonCodeDto> getTaskTypes() {
        return commonCodeService.getCodesByGroup(TASK_TYPE_CODE_GROUP);
    }

    public InformalSanctionDto getInformalSanction(Long id, String participantId) {
        assertCurrentParticipant(participantId);
        InformalSanction sanction = informalSanctionRepository.findByIdAndParticipant(
                Objects.requireNonNull(id), participantId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        List<InformalSanctionDetail> lines = detailRepository.findForDocuments(List.of(id));
        List<InformalSanctionHistory> history = historyRepository.findForDocuments(List.of(id));
        return toParticipantDto(sanction, participantId, lines, history,
                userNames(List.of(sanction), lines), taskTypeNames(), true);
    }

    /** 기존 단일 aprvrId 요청은 한 단계의 승인으로 유지한다. */
    @Transactional
    public Long registerInformalSanction(InformalSanctionDto dto) {
        return registerInformalSanction(dto, legacyStages(dto));
    }

    @Transactional
    public Long registerInformalSanction(InformalSanctionDto dto, List<ApprovalStageRequest> requests) {
        validateDocument(dto);
        assertCurrentParticipant(dto.getAplcntId());
        List<ApprovalStageRequest> stages = validateStages(dto.getAplcntId(),
                requests == null ? legacyStages(dto) : requests);
        InformalSanction sanction = InformalSanction.builder()
                .taskSeCd(dto.getTaskSeCd()).aplcntId(dto.getAplcntId())
                .reqYmd(requestDate(dto.getReqYmd())).docTtl(dto.getDocTtl()).docCn(dto.getDocCn())
                .aprvrId(stages.getFirst().approverIds().getFirst()).aprvYn("A")
                .atrzCycl(BigDecimal.ONE).build();
        InformalSanction saved = informalSanctionRepository.save(sanction);
        createRevision(saved, stages);
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
        currentHistory(sanction).updateResult(sanction);
        sanction.resubmit(dto.getTaskSeCd(), requestDate(dto.getReqYmd()), dto.getDocTtl(), dto.getDocCn(),
                stages.getFirst().approverIds().getFirst());
        createRevision(sanction, stages);
    }

    @Transactional
    public void confirmInformalSanction(Long id, String aprvYn, String opinion, Integer expectedVersion) {
        InformalSanction sanction = lock(id);
        String actor = SecurityUtil.getCurrentEsntlId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
        List<InformalSanctionDetail> lines = detailRepository.findRevision(id, sanction.getAtrzCycl());
        InformalSanctionDetail ownLine = lines.stream().filter(d -> actor.equals(d.getId().getUserId()))
                .findFirst().orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
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
            publishFinalStatus(sanction, actor, opinion);
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
                publishFinalStatus(sanction, actor, opinion);
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
                        documentLabel(sanction) + "를 확인해 주세요.", "/approvals")));
    }

    private void publishFinalStatus(InformalSanction sanction, String actor, String opinion) {
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(sanction.getIfmlAtrzSn(),
                sanction.getAplcntId(), actor, SanctionStatus.fromCode(sanction.getAprvYn()), opinion, sanction.getDocTtl());
        eventPublisher.publishEvent(event);
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
        Map<String, String> users = userNames(page.getContent(), lines);
        Map<String, String> tasks = taskTypeNames();
        Map<Long, List<InformalSanctionDetail>> byDocument = lines.stream().collect(Collectors.groupingBy(d -> d.getId().getIfmlAtrzSn()));
        Map<Long, List<InformalSanctionHistory>> revisions = history.stream().collect(Collectors.groupingBy(h -> h.getId().getIfmlAtrzSn()));
        return page.map(s -> toParticipantDto(s, actor, byDocument.getOrDefault(s.getIfmlAtrzSn(), List.of()),
                revisions.getOrDefault(s.getIfmlAtrzSn(), List.of()), users, tasks, false));
    }

    private Map<String, String> userNames(List<InformalSanction> sanctions, List<InformalSanctionDetail> lines) {
        Set<String> ids = new HashSet<>();
        sanctions.forEach(s -> { if (s.getAplcntId() != null) ids.add(s.getAplcntId()); });
        lines.forEach(d -> ids.add(d.getId().getUserId()));
        return userRepository.findAllById(ids).stream().collect(Collectors.toMap(User::getEsntlId,
                u -> u.getUserNm() == null ? "" : u.getUserNm(), (first, second) -> first));
    }

    private Map<String, String> taskTypeNames() {
        return getTaskTypes().stream().filter(c -> c.dtlCd() != null)
                .collect(Collectors.toMap(CommonCodeDto::dtlCd, c -> c.dtlCdNm() == null ? "" : c.dtlCdNm(),
                        (first, second) -> first));
    }

    private InformalSanctionDto toParticipantDto(InformalSanction sanction, String actor,
            List<InformalSanctionDetail> lines, List<InformalSanctionHistory> revisions,
            Map<String, String> users, Map<String, String> tasks, boolean includeHistory) {
        boolean owner = actor.equals(sanction.getAplcntId());
        Set<BigDecimal> allowed = lines.stream().filter(d -> actor.equals(d.getId().getUserId()))
                .map(d -> d.getId().getAtrzCycl()).collect(Collectors.toSet());
        if (owner) revisions.forEach(h -> allowed.add(h.getId().getAtrzCycl()));
        boolean current = owner || allowed.contains(sanction.getAtrzCycl());
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
        dto.setStages(stageDtos(visibleLines, users));
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
                                .filter(d -> d.getId().getAtrzCycl().compareTo(h.getId().getAtrzCycl()) == 0).toList(), users)))
                .toList() : List.of());
        return dto;
    }

    private static List<ApprovalStageDto> stageDtos(List<InformalSanctionDetail> lines, Map<String, String> users) {
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
                            users.getOrDefault(d.getId().getUserId(), ""), d.status(), d.getAtrzOpnnCn(), d.getAtrzDt())).toList());
        }).toList();
    }
}
