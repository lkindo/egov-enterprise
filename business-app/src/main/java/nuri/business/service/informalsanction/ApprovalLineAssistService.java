package nuri.business.service.informalsanction;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionDetail;
import nuri.business.domain.informalsanction.InformalSanctionDetailRepository;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.dto.ApprovalLineStageDto;
import nuri.business.service.informalsanction.dto.ApprovalLineSuggestionDto;
import nuri.business.service.informalsanction.dto.ApprovalSuggestionsDto;
import nuri.business.service.informalsanction.dto.ApproverProfileDto;
import nuri.business.service.user.dto.UserSearchDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 기안 화면의 결재선 도우미(2026-10-03 결재 동선 개선 B안).
 *
 * <p>두 가지를 한다. 하나는 <b>내가 올린 결재</b>에서 업무 구분별로 다시 쓴 결재선과 최근 결재자를 찾아 제안하는 것이고,
 * 다른 하나는 고르려는 사람이 결재자가 될 수 있는지(본인·사용 중·결재 권한)를 상신 전에 알려 주는 것이다.
 * 판정은 상신 때 서버가 하는 검사({@link InformalSanctionService})와 같다 — 상신 뒤에야 거부되는 일을 앞당긴다.
 *
 * <p>남의 결재를 읽지 않는다. 제안은 요청한 사람이 신청자인 문서의 현재 차수 결재선만 쓴다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApprovalLineAssistService {

    static final String APPROVE_PERMISSION = "APPROVAL_APPROVE";
    static final String READ_PERMISSION = "APPROVAL_READ";
    static final String SELF = "SELF";
    static final String INACTIVE = "INACTIVE";
    static final String NO_PERMISSION = "NO_PERMISSION";
    /** 참조자로 고를 수 없는 사유 — 결재 조회 권한(APPROVAL_READ)이 없다(2026-10-04 D4). */
    static final String NO_READ_PERMISSION = "NO_READ_PERMISSION";
    static final String NOT_FOUND = "NOT_FOUND";
    private static final int MAX_LINES = 3;
    private static final int MAX_OTHER_LINES = 3;
    private static final int MAX_RECENT = 8;
    private static final int MAX_CHECK = 50;

    private final InformalSanctionRepository sanctionRepository;
    private final InformalSanctionDetailRepository detailRepository;
    private final UserRepository userRepository;
    private final CommonCodeService commonCodeService;

    /** 한 단계의 모양 — 유형과 사람(식별자 순). 같은 모양이면 같은 결재선으로 센다. */
    private record StageShape(ApprovalStageKind kind, List<String> userIds) {
    }

    private static final class Usage {
        private final String taskSeCd;
        private final List<StageShape> stages;
        private final String lastReqYmd;
        private final int recency;
        private int count;

        private Usage(String taskSeCd, List<StageShape> stages, String lastReqYmd, int recency) {
            this.taskSeCd = taskSeCd;
            this.stages = stages;
            this.lastReqYmd = lastReqYmd;
            this.recency = recency;
        }
    }

    public ApprovalSuggestionsDto getSuggestions(String applicant, String taskSeCd) {
        requireApplicant(applicant);
        SecurityUtil.assertOwnerByEsntlId(applicant);
        if (taskSeCd != null && (taskSeCd.isBlank() || taskSeCd.length() > 12)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "업무 구분 코드를 확인해 주세요.");
        }
        List<InformalSanction> documents = sanctionRepository.findTop40ByAplcntIdOrderByIfmlAtrzSnDesc(applicant);
        if (documents.isEmpty()) return new ApprovalSuggestionsDto(List.of(), List.of(), List.of());
        Map<Long, InformalSanction> byId = documents.stream()
                .collect(Collectors.toMap(InformalSanction::getIfmlAtrzSn, Function.identity()));
        Map<Long, List<InformalSanctionDetail>> currentLines = detailRepository.findForDocuments(byId.keySet()).stream()
                .filter(d -> d.getId().getAtrzCycl().compareTo(byId.get(d.getId().getIfmlAtrzSn()).getAtrzCycl()) == 0)
                .collect(Collectors.groupingBy(d -> d.getId().getIfmlAtrzSn()));

        Map<String, Usage> usages = new LinkedHashMap<>();
        Set<String> recent = new LinkedHashSet<>();
        int recency = 0;
        for (InformalSanction document : documents) {
            List<InformalSanctionDetail> lines = currentLines.get(document.getIfmlAtrzSn());
            if (lines == null || lines.isEmpty()) continue;
            List<StageShape> stages = shape(lines);
            String key = document.getTaskSeCd() + '|' + stages;
            int order = recency++;
            usages.computeIfAbsent(key, k -> new Usage(document.getTaskSeCd(), stages, document.getReqYmd(), order)).count++;
            stages.forEach(stage -> stage.userIds().forEach(id -> { if (recent.size() < MAX_RECENT) recent.add(id); }));
        }

        Comparator<Usage> mostUsed = Comparator.comparingInt((Usage u) -> u.count).reversed()
                .thenComparingInt(u -> u.recency);
        List<Usage> lines = taskSeCd == null ? List.of() : usages.values().stream()
                .filter(u -> taskSeCd.equals(u.taskSeCd)).sorted(mostUsed).limit(MAX_LINES).toList();
        Map<String, Usage> bestPerOtherTask = new LinkedHashMap<>();
        usages.values().stream().filter(u -> !Objects.equals(taskSeCd, u.taskSeCd)).sorted(mostUsed)
                .forEach(u -> bestPerOtherTask.putIfAbsent(u.taskSeCd, u));
        List<Usage> otherLines = bestPerOtherTask.values().stream()
                .sorted(Comparator.comparingInt(u -> u.recency)).limit(MAX_OTHER_LINES).toList();

        Set<String> ids = new HashSet<>(recent);
        lines.forEach(u -> u.stages.forEach(s -> ids.addAll(s.userIds())));
        otherLines.forEach(u -> u.stages.forEach(s -> ids.addAll(s.userIds())));
        Map<String, ApproverProfileDto> profiles = profiles(applicant, ids, true);
        Map<String, String> taskNames = taskTypeNames();
        return new ApprovalSuggestionsDto(
                lines.stream().map(u -> toSuggestion(u, profiles, taskNames)).toList(),
                otherLines.stream().map(u -> toSuggestion(u, profiles, taskNames)).toList(),
                recent.stream().map(profiles::get).filter(Objects::nonNull).toList());
    }

    /**
     * 고르려는 사람이 결재자가 될 수 있는지, 참조자가 될 수 있는지(2026-10-04 D4) 알려 준다. 사용 중이 아니거나 없는 계정은
     * 이름을 돌려주지 않는다 — 식별자만으로 비활성 계정의 이름을 알아내는 경로가 되지 않게 한다.
     */
    public List<ApproverProfileDto> checkApprovers(String applicant, List<String> approverIds) {
        requireApplicant(applicant);
        SecurityUtil.assertOwnerByEsntlId(applicant);
        if (approverIds == null || approverIds.isEmpty()) return List.of();
        if (approverIds.size() > MAX_CHECK) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "한 번에 50명까지 확인할 수 있습니다.");
        }
        List<String> ids = new ArrayList<>(new LinkedHashSet<>(approverIds));
        for (String id : ids) {
            if (id == null || id.isBlank() || id.length() > 20 || !id.equals(id.trim())) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "확인할 사용자를 지정해 주세요.");
            }
        }
        Map<String, ApproverProfileDto> profiles = profiles(applicant, ids, false);
        return ids.stream().map(profiles::get).toList();
    }

    private Map<String, ApproverProfileDto> profiles(String applicant, Set<String> ids, boolean revealInactiveNames) {
        return profiles(applicant, new ArrayList<>(ids), revealInactiveNames);
    }

    private Map<String, ApproverProfileDto> profiles(String applicant, List<String> ids, boolean revealInactiveNames) {
        if (ids.isEmpty()) return Map.of();
        Map<String, UserSearchDto> found = userRepository.findProfilesByEsntlIds(ids).stream()
                .collect(Collectors.toMap(UserSearchDto::esntlId, Function.identity(), (first, second) -> first));
        Map<String, String> statuses = userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getEsntlId, u -> u.getUserSttsCd() == null ? "" : u.getUserSttsCd(),
                        (first, second) -> first));
        Set<String> approvers = new HashSet<>(userRepository.findActiveEsntlIdsHoldingPermission(APPROVE_PERMISSION));
        // [2026-10-04 D4] 참조자는 결재 권한이 아니라 결재 조회 권한으로 판정한다(지정해도 읽을 수 없는 사람을 막는다).
        Set<String> readers = new HashSet<>(userRepository.findActiveEsntlIdsHoldingPermission(READ_PERMISSION));
        Map<String, ApproverProfileDto> result = new LinkedHashMap<>();
        for (String id : ids) {
            UserSearchDto profile = found.get(id);
            String status = statuses.get(id);
            if (profile == null || status == null) {
                result.put(id, new ApproverProfileDto(id, null, null, false, false, NOT_FOUND, false, NOT_FOUND));
                continue;
            }
            boolean absent = Boolean.TRUE.equals(profile.absent());
            if (!"P".equals(status)) {
                result.put(id, revealInactiveNames
                        ? new ApproverProfileDto(id, profile.userNm(), profile.deptNm(), absent, false, INACTIVE,
                                false, INACTIVE)
                        : new ApproverProfileDto(id, null, null, false, false, INACTIVE, false, INACTIVE));
                continue;
            }
            String reason = id.equals(applicant) ? SELF : approvers.contains(id) ? null : NO_PERMISSION;
            String referenceReason = id.equals(applicant) ? SELF : readers.contains(id) ? null : NO_READ_PERMISSION;
            result.put(id, new ApproverProfileDto(id, profile.userNm(), profile.deptNm(), absent, reason == null, reason,
                    referenceReason == null, referenceReason));
        }
        return result;
    }

    private static List<StageShape> shape(List<InformalSanctionDetail> lines) {
        Map<BigDecimal, List<InformalSanctionDetail>> bySeq = lines.stream().collect(Collectors.groupingBy(
                d -> d.getId().getAtrzSeq(), TreeMap::new, Collectors.toList()));
        return bySeq.values().stream().map(group -> new StageShape(group.getFirst().kind(),
                group.stream().map(d -> d.getId().getUserId()).sorted().toList())).toList();
    }

    private static ApprovalLineSuggestionDto toSuggestion(Usage usage, Map<String, ApproverProfileDto> profiles,
                                                          Map<String, String> taskNames) {
        return new ApprovalLineSuggestionDto(usage.taskSeCd, taskNames.getOrDefault(usage.taskSeCd, ""), usage.count,
                usage.lastReqYmd, usage.stages.stream().map(stage -> new ApprovalLineStageDto(stage.kind(),
                        stage.userIds().stream().map(profiles::get).filter(Objects::nonNull).toList())).toList());
    }

    private Map<String, String> taskTypeNames() {
        return commonCodeService.getCodesByGroup(InformalSanctionService.TASK_TYPE_CODE_GROUP).stream()
                .filter(c -> c.dtlCd() != null)
                .collect(Collectors.toMap(CommonCodeDto::dtlCd, c -> c.dtlCdNm() == null ? "" : c.dtlCdNm(),
                        (first, second) -> first));
    }

    private static void requireApplicant(String applicant) {
        if (applicant == null || applicant.isBlank() || applicant.length() > 20) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }
}
