package nuri.business.service.informalsanction;

import nuri.business.domain.informalsanction.ApprovalStatus;
import nuri.business.domain.informalsanction.ApprovalReferenceDesignator;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionDetail;
import nuri.business.domain.informalsanction.InformalSanctionHistory;
import nuri.business.domain.informalsanction.InformalSanctionProcess;
import nuri.business.domain.informalsanction.InformalSanctionReference;
import nuri.business.service.informalsanction.dto.ApprovalApproverDto;
import nuri.business.service.informalsanction.dto.ApprovalProcessDto;
import nuri.business.service.informalsanction.dto.ApprovalReferenceDto;
import nuri.business.service.informalsanction.dto.ApprovalRevisionDto;
import nuri.business.service.informalsanction.dto.ApprovalStageDto;
import nuri.business.service.user.dto.UserSearchDto;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

/** 서비스가 조회한 자료와 열람 가능 차수로 응답을 조립한다. 조회·인가·상태 변경은 하지 않는다. */
final class InformalSanctionReadAssembler {
    private InformalSanctionReadAssembler() { }

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
}
