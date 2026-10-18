package nuri.business.service.informalsanction;

import nuri.business.domain.informalsanction.ApprovalProcessType;
import nuri.business.domain.informalsanction.ApprovalReferenceDesignator;
import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.domain.informalsanction.ApprovalStatus;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionDetail;
import nuri.business.domain.informalsanction.InformalSanctionHistory;
import nuri.business.domain.informalsanction.InformalSanctionProcess;
import nuri.business.domain.informalsanction.InformalSanctionReference;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.informalsanction.dto.ApprovalApproverDto;
import nuri.business.service.informalsanction.dto.ApprovalProcessDto;
import nuri.business.service.informalsanction.dto.ApprovalReferenceDto;
import nuri.business.service.informalsanction.dto.ApprovalRevisionDto;
import nuri.business.service.informalsanction.dto.ApprovalStageDto;
import nuri.business.service.informalsanction.dto.ApprovalStageRequest;
import nuri.business.service.informalsanction.dto.ApprovalSupplementDto;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import nuri.business.service.informalsanction.dto.InformalSanctionMapper;
import nuri.business.service.user.dto.UserSearchDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.validation.Ymd;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

/** 서비스가 조회한 자료와 열람 가능 차수로 응답을 조립한다. 조회·인가·상태 변경은 하지 않는다. */
final class InformalSanctionReadAssembler {
    static final int MAX_REFERENCES = 20;
    private static final String APPROVE_PERMISSION = "APPROVAL_APPROVE";
    private static final String WITHDRAW_PERMISSION = "APPROVAL_CANCEL";
    private static final String DRAFT_PERMISSION = "APPROVAL_CREATE";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private InformalSanctionReadAssembler() { }

    record ReferencePlan(List<String> users, List<String> firstTime) {
        static final ReferencePlan NONE = new ReferencePlan(List.of(), List.of());
    }

    static InformalSanctionDto toParticipantDto(InformalSanctionMapper informalSanctionMapper,
            InformalSanction sanction, String actor,
            List<InformalSanctionDetail> lines, List<InformalSanctionHistory> revisions,
            List<InformalSanctionProcess> processes, List<InformalSanctionReference> references,
            Map<String, String> users, Set<String> absent, Map<String, String> tasks,
            Map<String, UserSearchDto> referenceProfiles, boolean includeHistory) {
        boolean owner = actor.equals(sanction.getAplcntId());
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
        dto.setStages(stages(visibleLines, users, absent));
        dto.setCanApprove(current && "A".equals(sanction.getAprvYn()) && SecurityUtil.hasPermission(APPROVE_PERMISSION)
                && visibleLines.stream()
                .anyMatch(d -> actor.equals(d.getId().getUserId()) && d.status() == ApprovalStatus.ACTIVE));
        dto.setCanWithdraw(current && owner && "A".equals(sanction.getAprvYn())
                && SecurityUtil.hasPermission(WITHDRAW_PERMISSION));
        dto.setCanResubmit(current && owner && List.of("R", "W").contains(sanction.getAprvYn())
                && SecurityUtil.hasPermission(DRAFT_PERMISSION));
        dto.setHistory(includeHistory ? revisions(revisions, allowed, lines, users, absent) : List.of());
        boolean inProgress = current && "A".equals(sanction.getAprvYn());
        List<InformalSanctionProcess> cycleProcesses = processes.stream()
                .filter(p -> p.getAtrzCycl().compareTo(sanction.getAtrzCycl()) == 0).toList();
        InformalSanctionProcess openAsk = inProgress ? openSupplement(visibleLines, cycleProcesses) : null;
        dto.setOpenSupplement(openAsk == null ? null : new ApprovalSupplementDto(openAsk.getChgUserIdntfr(),
                users.getOrDefault(openAsk.getChgUserIdntfr(), ""), openAsk.getPrcsCn(), openAsk.getCrtDt()));
        dto.setCurrentStageSince(inProgress ? stageSince(visibleLines, revisions, sanction) : null);
        boolean drafter = inProgress && owner && SecurityUtil.hasPermission(DRAFT_PERMISSION);
        boolean remindedToday = cycleProcesses.stream().anyMatch(InformalSanctionReadAssembler::remindedToday);
        dto.setRemindedToday(inProgress && owner && remindedToday);
        dto.setCanRemind(drafter && !remindedToday);
        dto.setCanReplaceApprover(drafter && visibleLines.stream()
                .anyMatch(d -> d.status() == ApprovalStatus.WAITING || d.status() == ApprovalStatus.ACTIVE));
        dto.setCanAnswerSupplement(drafter && openAsk != null);
        dto.setCanRequestSupplement(dto.isCanApprove() && openAsk == null);
        dto.setReferenceViewer(referenceViewer);
        dto.setReferences(includeHistory ? references(references, allowed, sanction, referenceProfiles) : List.of());
        dto.setCanAddReference(dto.isCanApprove() && !drafterDesignated(sanction, references)
                && referenceRoomLeft(sanction, references, visibleLines));
        dto.setProcessHistory(includeHistory ? processes(processes, allowed, users) : List.of());
        return dto;
    }

    static List<ApprovalRevisionDto> revisions(List<InformalSanctionHistory> revisions,
            Set<BigDecimal> allowed, List<InformalSanctionDetail> lines, Map<String, String> users,
            Set<String> absent) {
        return revisions.stream().filter(h -> allowed.contains(h.getId().getAtrzCycl()))
                .sorted(Comparator.comparing((InformalSanctionHistory h) -> h.getId().getAtrzCycl()).reversed())
                .map(h -> new ApprovalRevisionDto(h.getId().getAtrzCycl().intValueExact(), h.getDocTtl(), h.getDocCn(),
                        h.getAprvYn(), h.getReqYmd(), h.getAtrzDt(), stages(lines.stream()
                                .filter(d -> d.getId().getAtrzCycl().compareTo(h.getId().getAtrzCycl()) == 0).toList(), users, absent)))
                .toList();
    }

    static List<ApprovalProcessDto> processes(List<InformalSanctionProcess> processes,
            Set<BigDecimal> allowed, Map<String, String> users) {
        return processes.stream().filter(p -> allowed.contains(p.getAtrzCycl()))
                .map(p -> new ApprovalProcessDto(p.getPrcsTypeCd(), p.getAtrzCycl().intValueExact(),
                        users.getOrDefault(p.getChgUserIdntfr(), ""),
                        p.getTrgtUserId() == null ? null : users.getOrDefault(p.getTrgtUserId(), ""),
                        p.getBfrUserId() == null ? null : users.getOrDefault(p.getBfrUserId(), ""),
                        p.getPrcsCn(), p.getCrtDt()))
                .toList();
    }

    /**
     * [2026-10-04 D4 개정 1] 보는 사람에게 보이는 참조자 — 지정 차수가 그 사람이 볼 수 있는 가장 높은 차수 이하인 행이다(신청자·
     * 참조자는 지금 차수까지 모두 본다). 지정은 차수 단위라 한 사람이 여러 행일 수 있어, 사람마다 한 줄로 묶고 그 사람에게 보이는
     * 가장 최근 지정(가장 높은 차수)을 싣는다. 순서는 그 사람이 처음 지정된 순서다(다시 지정돼도 자리가 바뀌지 않는다).
     */
    static List<ApprovalReferenceDto> references(List<InformalSanctionReference> references,
            Set<BigDecimal> allowed, InformalSanction sanction, Map<String, UserSearchDto> profiles) {
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
            Map<String, UserSearchDto> profiles) {
        UserSearchDto profile = profiles.get(reference.getId().getUserId());
        return new ApprovalReferenceDto(reference.getId().getUserId(),
                profile == null || profile.userNm() == null ? "" : profile.userNm(),
                profile == null ? null : profile.deptNm(), reference.getAtrzCycl().intValueExact(),
                ApprovalReferenceDesignator.of(reference, sanction.getAplcntId()), reference.getCrtDt());
    }

    static List<ApprovalStageDto> stages(List<InformalSanctionDetail> lines, Map<String, String> users,
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

    /**
     * 보완 요청이 열려 있는가 — 같은 차수의 마지막 ASK 뒤에 ANSWER 가 없고, 요청한 결재자가 아직 차례일 때다.
     */
    static InformalSanctionProcess openSupplement(List<InformalSanctionDetail> currentLines,
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
    static LocalDateTime stageSince(List<InformalSanctionDetail> lines, List<InformalSanctionHistory> revisions,
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

    static boolean remindedToday(InformalSanctionProcess process) {
        return process.getPrcsTypeCd() == ApprovalProcessType.REMIND
                && process.getCrtDt().atZone(ZoneId.systemDefault()).withZoneSameInstant(BUSINESS_ZONE).toLocalDate()
                        .equals(LocalDate.now(BUSINESS_ZONE));
    }

    static boolean drafterDesignated(InformalSanction sanction, List<InformalSanctionReference> references) {
        return references.stream().anyMatch(r -> r.designatedIn(sanction.getAtrzCycl())
                && r.designatedBy(sanction.getAplcntId()));
    }

    static boolean referenceRoomLeft(InformalSanction sanction, List<InformalSanctionReference> references,
                                     List<InformalSanctionDetail> currentLines) {
        if (references.stream().map(r -> r.getId().getUserId()).distinct().count() < MAX_REFERENCES) return true;
        Set<String> inCycle = references.stream().filter(r -> r.designatedIn(sanction.getAtrzCycl()))
                .map(r -> r.getId().getUserId()).collect(Collectors.toSet());
        Set<String> lineUsers = currentLines.stream().map(d -> d.getId().getUserId()).collect(Collectors.toSet());
        return references.stream().map(r -> r.getId().getUserId())
                .anyMatch(user -> !inCycle.contains(user) && !lineUsers.contains(user) && !user.equals(sanction.getAplcntId()));
    }

    static String requiredText(String value, String message) {
        String text = value == null ? "" : value.trim();
        if (text.isEmpty() || text.length() > 4000) throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, message);
        return text;
    }

    static void assertInProgress(InformalSanction sanction, String action) {
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

    static void assertVersion(InformalSanction sanction, Integer expectedVersion) {
        if (expectedVersion != null && (expectedVersion < 0 || !expectedVersion.equals(sanction.getVersion()))) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "다른 사용자가 문서를 변경했습니다. 최신 상태를 확인해 주세요.");
        }
    }

    static String pendingLink(Long id) { return "/approvals?tab=PENDING&doc=" + id; }

    static String submittedLink(Long id) { return "/approvals?tab=SUBMITTED&doc=" + id; }

    static String processedLink(Long id) { return "/approvals?tab=PROCESSED&doc=" + id; }

    static String referencedLink(Long id) { return "/approvals?tab=REFERENCED&doc=" + id; }

    static String documentLabel(InformalSanction sanction) {
        String title = sanction.getDocTtl();
        String number = "결재(번호 " + sanction.getIfmlAtrzSn() + ")";
        return title == null || title.isBlank() ? number : "「" + title.trim() + "」 " + number;
    }

    static Set<String> lineUsers(List<ApprovalStageRequest> stages) {
        return stages.stream().flatMap(stage -> stage.approverIds().stream()).collect(Collectors.toSet());
    }

    static List<ApprovalStageRequest> legacyStages(InformalSanctionDto dto) {
        String approver = dto.getAprvrId();
        if (approver == null || approver.isBlank()) throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                "결재자를 지정해 주세요.");
        return List.of(new ApprovalStageRequest(ApprovalStageKind.APPROVAL, List.of(approver)));
    }

    static String requestDate(String requestDate) {
        if (requestDate == null || requestDate.isBlank()) return LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        try {
            return Ymd.compact(requestDate);
        } catch (BusinessException e) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "유효한 신청 일자를 지정해 주세요.");
        }
    }

    static ReferencePlan parseReferenceStructure(String applicant, BigDecimal cycle, Set<String> lineUsers,
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
        return new ReferencePlan(fresh, firstTime);
    }

    static List<ApprovalStageRequest> parseStageStructure(String applicant, List<ApprovalStageRequest> requests,
                                                          Set<String> participants) {
        if (requests == null || requests.isEmpty() || requests.size() > 10) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "결재 단계는 1개 이상 10개 이하로 지정해 주세요.");
        }
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
        return List.copyOf(stages);
    }
}
