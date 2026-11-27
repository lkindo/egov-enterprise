package nuri.business.service.informalsanction;

import static nuri.business.service.informalsanction.InformalSanctionReadAssembler.toParticipantDto;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import nuri.business.domain.informalsanction.*;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import nuri.business.service.informalsanction.dto.InformalSanctionMapper;
import org.springframework.data.domain.Page;

/**
 * [2026-11-27] 결재 목록 쪽 조립과 화면 이름 조회 — 보이는 결재선·이력·처리·참조를 한 번에 읽어 DTO 쪽으로 만들고, 이름·부재자·
 * 참조자 프로필·업무 유형 이름을 고른다. 종전에는 {@link InformalSanctionService}(983줄) 한 파일에 결재 흐름·권한 검사와 섞여
 * 있었다(품질 평가 A안 6번). 본문은 그대로 옮겼다.
 *
 * <p>권한 검사는 없다 — 누가 무엇을 보는지는 서비스가 정한 {@code actor}·{@code delegators} 와 저장소의 보이는 범위 질의가
 * 정한다(그 질의는 바꾸지 않았다). 서비스가 같은 협력 객체로 만든다(스프링 빈이 아니다).
 */
final class InformalSanctionPageAssembler {
    private final InformalSanctionMapper informalSanctionMapper;
    private final InformalSanctionDetailRepository detailRepository;
    private final InformalSanctionHistoryRepository historyRepository;
    private final InformalSanctionProcessRepository processRepository;
    private final InformalSanctionReferenceRepository referenceRepository;
    private final UserRepository userRepository;
    private final CommonCodeService commonCodeService;

    InformalSanctionPageAssembler(InformalSanctionMapper informalSanctionMapper,
                                  InformalSanctionDetailRepository detailRepository,
                                  InformalSanctionHistoryRepository historyRepository,
                                  InformalSanctionProcessRepository processRepository,
                                  InformalSanctionReferenceRepository referenceRepository,
                                  UserRepository userRepository, CommonCodeService commonCodeService) {
        this.informalSanctionMapper = informalSanctionMapper;
        this.detailRepository = detailRepository;
        this.historyRepository = historyRepository;
        this.processRepository = processRepository;
        this.referenceRepository = referenceRepository;
        this.userRepository = userRepository;
        this.commonCodeService = commonCodeService;
    }

    /**
     * [V2_151] 보이는 결재선 질의는 신청자·참조자에게 지금 차수를, 결재자에게 자기가 든 마지막 차수를 돌려준다. 대리결재자로 보는
     * 문서(대신 결정했거나 지금 대신 결정할 차례다)는 그 질의가 지금 차수를 돌려주지 않으므로, 지금 차수가 보이지 않는 문서는 모든
     * 줄·차수를 읽어 조립한다 — 볼 차수는 조립이 같은 규칙(내가 든 차수·대신 결정한 차수·지금 대신 결정할 차수)으로 고른다.
     */
    Page<InformalSanctionDto> toDtoPage(Page<InformalSanction> page, String actor, Set<String> delegators) {
        if (page.isEmpty()) return page.map(informalSanctionMapper::toDto);
        List<Long> ids = page.stream().map(InformalSanction::getIfmlAtrzSn).toList();
        Map<Long, BigDecimal> currentCycles = new java.util.HashMap<>();
        page.forEach(sanction -> currentCycles.put(sanction.getIfmlAtrzSn(), sanction.getAtrzCycl()));
        List<InformalSanctionDetail> visibleLines = detailRepository.findVisibleForDocuments(ids, actor);
        Set<Long> seesAny = visibleLines.stream().map(d -> d.getId().getIfmlAtrzSn()).collect(Collectors.toSet());
        Set<Long> seesCurrent = delegators.isEmpty() ? Set.of() : visibleLines.stream()
                .filter(d -> {
                    BigDecimal current = currentCycles.get(d.getId().getIfmlAtrzSn());
                    return current != null && d.getId().getAtrzCycl() != null && d.getId().getAtrzCycl().compareTo(current) == 0;
                })
                .map(d -> d.getId().getIfmlAtrzSn()).collect(Collectors.toSet());
        // 보이는 줄이 없으면(대신 결정만 한 문서) 넓히고, 오늘 맡긴 사람이 있으면 지금 차수가 보이지 않는 문서도 넓힌다.
        Set<Long> widenedIds = ids.stream().filter(id -> !seesAny.contains(id)
                || (!delegators.isEmpty() && !seesCurrent.contains(id))).collect(Collectors.toSet());
        List<Long> widened = ids.stream().filter(widenedIds::contains).toList();
        List<InformalSanctionDetail> lines = new ArrayList<>(visibleLines.stream()
                .filter(d -> !widenedIds.contains(d.getId().getIfmlAtrzSn())).toList());
        List<InformalSanctionHistory> history = new ArrayList<>(historyRepository.findVisibleForDocuments(ids, actor)
                .stream().filter(h -> !widenedIds.contains(h.getId().getIfmlAtrzSn())).toList());
        if (!widened.isEmpty()) {
            lines.addAll(detailRepository.findForDocuments(widened));
            history.addAll(historyRepository.findForDocuments(widened));
        }
        List<InformalSanctionProcess> processes = processRepository.findForCurrentCycles(ids);
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
        return page.map(s -> toParticipantDto(informalSanctionMapper, s, actor,
                byDocument.getOrDefault(s.getIfmlAtrzSn(), List.of()),
                revisions.getOrDefault(s.getIfmlAtrzSn(), List.of()), processByDocument.getOrDefault(s.getIfmlAtrzSn(), List.of()),
                referencesByDocument.getOrDefault(s.getIfmlAtrzSn(), List.of()), users, absent, tasks, Map.of(), false,
                delegators));
    }

    /** 상세의 참조자 이름·부서(사용자 검색과 같은 최소 필드). 참조자가 없으면 조회하지 않는다. */
    Map<String, nuri.business.service.user.dto.UserSearchDto> referenceProfiles(
            List<InformalSanctionReference> references) {
        if (references.isEmpty()) return Map.of();
        return userRepository.findProfilesByEsntlIds(references.stream().map(r -> r.getId().getUserId()).distinct().toList())
                .stream().collect(Collectors.toMap(nuri.business.service.user.dto.UserSearchDto::esntlId,
                        java.util.function.Function.identity(), (first, second) -> first));
    }

    Map<String, String> userNames(List<InformalSanction> sanctions, List<InformalSanctionDetail> lines,
                                  List<InformalSanctionProcess> processes) {
        Set<String> ids = new HashSet<>();
        sanctions.forEach(s -> { if (s.getAplcntId() != null) ids.add(s.getAplcntId()); });
        lines.forEach(d -> {
            ids.add(d.getId().getUserId());
            // [V2_151] 대신 결정한 대리결재자도 결재선에 이름으로 남는다.
            if (d.getSbtAprvrId() != null) ids.add(d.getSbtAprvrId());
        });
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
    Set<String> absentUsers(List<InformalSanctionDetail> lines) {
        Set<String> ids = lines.stream().map(d -> d.getId().getUserId()).collect(Collectors.toSet());
        if (ids.isEmpty()) return Set.of();
        return userRepository.findProfilesByEsntlIds(ids).stream()
                .filter(profile -> Boolean.TRUE.equals(profile.absent()))
                .map(nuri.business.service.user.dto.UserSearchDto::esntlId).collect(Collectors.toSet());
    }

    /** 업무 유형 코드 → 이름. 서비스의 {@code getTaskTypes()} 와 같은 공통코드 그룹을 읽는다. */
    Map<String, String> taskTypeNames() {
        return commonCodeService.getCodesByGroup(InformalSanctionService.TASK_TYPE_CODE_GROUP).stream().filter(c -> c.dtlCd() != null)
                .collect(Collectors.toMap(CommonCodeDto::dtlCd, c -> c.dtlCdNm() == null ? "" : c.dtlCdNm(),
                        (first, second) -> first));
    }
}
