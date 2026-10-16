package nuri.business.service.informalsanction;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.informalsanction.ApprovalSavedLine;
import nuri.business.domain.informalsanction.ApprovalSavedLineApprover;
import nuri.business.domain.informalsanction.ApprovalSavedLineApproverId;
import nuri.business.domain.informalsanction.ApprovalSavedLineApproverRepository;
import nuri.business.domain.informalsanction.ApprovalSavedLineRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.informalsanction.dto.ApprovalLineStageDto;
import nuri.business.service.informalsanction.dto.ApprovalSavedLineDto;
import nuri.business.service.informalsanction.dto.ApprovalSavedLineRequest;
import nuri.business.service.informalsanction.dto.ApprovalSavedLineSummaryDto;
import nuri.business.service.informalsanction.dto.ApprovalStageRequest;
import nuri.business.service.informalsanction.dto.ApproverProfileDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 나의 결재선(2026-10-16 결재 동선 개선 D2, DEC-OPS-328).
 *
 * <p>기안자가 자주 쓰는 결재선에 이름을 붙여 저장해 두고 기안 화면에서 불러온다. 개인 결재선만 둔다(공용 결재선은 범위 밖).
 * 주인 본인만 자기 결재선을 읽고 고친다 — 관리자 열람 경로는 없다. 남의 결재선 번호는 없는 번호와 같이 404 다(존재를 드러내지
 * 않는다). 한 사람이 20개까지 두며, 같은 사람의 결재선 이름은 겹치지 않는다. 만료는 없고 사용자 행이 지워지면 함께 지워진다
 * (V2_129 의 ON DELETE CASCADE). 임시저장({@link ApprovalTemporaryDraftService})과 같은 소유·상한 규칙이다.
 *
 * <p>결재자 자격(본인 아님·사용 중·결재 권한)은 <b>저장할 때와 불러올 때 모두</b> 지금 기준으로 판정한다 — 판정은 상신 전 사전
 * 확인({@link ApprovalLineAssistService#checkApprovers})과 같다. 저장은 자격 없는 사람이 하나라도 있으면 거부하고, 불러오기는
 * 그사이 자격을 잃은 사람을 빼고 그 수만 알린다. 뺀 사람의 이름은 싣지 않는다 — 임시저장과 같은 공개 수준이다.
 * 결재선은 결재 표에 들어가지 않으므로 대기함·알림·통계·결재선 제안에 섞이지 않는다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApprovalSavedLineService {

    /** 한 사람이 둘 수 있는 결재선 수 — 기안 화면이 한 번에 읽는 목록이라 상한을 둔다. */
    static final int MAX_LINES = 20;
    private static final int MAX_NAME = 200;
    private static final int MAX_STAGES = 10;
    private static final int MAX_STAGE_APPROVERS = 10;
    private static final int MAX_APPROVERS = 50;

    private final ApprovalSavedLineRepository lineRepository;
    private final ApprovalSavedLineApproverRepository approverRepository;
    private final UserRepository userRepository;
    private final ApprovalLineAssistService lineAssistService;

    /** 형식을 확인하고 이름의 앞뒤 공백을 걷은 저장 내용. */
    private record Content(String name, List<ApprovalStageRequest> stages) {
        int approverCount() {
            return stages.stream().mapToInt(stage -> stage.approverIds().size()).sum();
        }
    }

    /** 내 결재선 목록 — 이름 순, 최대 20개. 결재자는 싣지 않고 단계·사람 수만 싣는다. */
    public List<ApprovalSavedLineSummaryDto> getSavedLines(String owner) {
        assertOwner(owner);
        List<ApprovalSavedLine> lines = lineRepository.findTop20ByUserIdOrderByAplnNmAscIfmlAtrzIndvAplnSnAsc(owner);
        if (lines.isEmpty()) return List.of();
        Map<Long, List<ApprovalSavedLineApprover>> approvers = approverRepository.findForLines(
                lines.stream().map(ApprovalSavedLine::getIfmlAtrzIndvAplnSn).toList()).stream()
                .collect(Collectors.groupingBy(approver -> approver.getId().getIfmlAtrzIndvAplnSn()));
        return lines.stream().map(line -> {
            List<ApprovalSavedLineApprover> rows = approvers.getOrDefault(line.getIfmlAtrzIndvAplnSn(), List.of());
            int stages = (int) rows.stream().map(row -> row.getId().getAtrzSeq()).distinct().count();
            return summary(line, stages, rows.size());
        }).toList();
    }

    /**
     * 결재선을 불러온다. 결재자마다 지금 자격을 사전 확인과 같은 판정으로 보고, 자격을 잃은 사람은 이름 없이 빼서 그 수를 싣는다.
     * 사람이 모두 빠진 단계도 뺀다.
     */
    public ApprovalSavedLineDto getSavedLine(String owner, Long savedLineSn) {
        assertOwner(owner);
        ApprovalSavedLine line = lineRepository
                .findByIfmlAtrzIndvAplnSnAndUserId(Objects.requireNonNull(savedLineSn), owner)
                .orElseThrow(ApprovalSavedLineService::notFound);
        List<ApprovalSavedLineApprover> rows = approverRepository.findForLines(List.of(line.getIfmlAtrzIndvAplnSn()));
        List<String> ids = rows.stream().map(row -> row.getId().getUserId()).distinct().toList();
        Map<String, ApproverProfileDto> profiles = ids.isEmpty() ? Map.of()
                : lineAssistService.checkApprovers(owner, ids).stream()
                .collect(Collectors.toMap(ApproverProfileDto::esntlId, Function.identity(), (first, second) -> first));
        Map<BigDecimal, List<ApprovalSavedLineApprover>> byStage = rows.stream().collect(Collectors.groupingBy(
                row -> row.getId().getAtrzSeq(), TreeMap::new, Collectors.toList()));
        List<ApprovalLineStageDto> stages = new ArrayList<>();
        int droppedApprovers = 0;
        int droppedStages = 0;
        for (List<ApprovalSavedLineApprover> group : byStage.values()) {
            List<ApproverProfileDto> eligible = new ArrayList<>();
            for (ApprovalSavedLineApprover row : group) {
                ApproverProfileDto profile = profiles.get(row.getId().getUserId());
                if (profile != null && profile.eligible()) eligible.add(profile);
                else droppedApprovers++;
            }
            if (eligible.isEmpty()) droppedStages++;
            else stages.add(new ApprovalLineStageDto(group.getFirst().kind(), List.copyOf(eligible)));
        }
        return new ApprovalSavedLineDto(line.getIfmlAtrzIndvAplnSn(), line.getAplnNm(), List.copyOf(stages),
                droppedApprovers, droppedStages, line.getMdfcnDt());
    }

    @Transactional
    public ApprovalSavedLineSummaryDto createSavedLine(String owner, ApprovalSavedLineRequest request) {
        lockLineOwner(owner);
        Content content = content(request);
        assertEligible(owner, content.stages());
        if (lineRepository.countByUserId(owner) >= MAX_LINES) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE,
                    "나의 결재선은 " + MAX_LINES + "개까지 저장할 수 있습니다. 쓰지 않는 결재선을 지워 주세요.");
        }
        if (lineRepository.existsByUserIdAndAplnNm(owner, content.name())) throw duplicateName();
        ApprovalSavedLine line = lineRepository.save(ApprovalSavedLine.create(owner, content.name()));
        approverRepository.saveAll(approvers(line.getIfmlAtrzIndvAplnSn(), content.stages()));
        return summary(line, content.stages().size(), content.approverCount());
    }

    /**
     * 이름과 결재선을 통째로 바꾼다(같은 이름으로 다시 저장하는 '덮어쓰기'). 결재선은 지운 뒤 다시 넣는다 — 같은 단계·사람이어도
     * 기본 키가 부딪히지 않게 삭제를 먼저 실행한다.
     */
    @Transactional
    public ApprovalSavedLineSummaryDto updateSavedLine(String owner, Long savedLineSn, ApprovalSavedLineRequest request) {
        Content content = content(request);
        ApprovalSavedLine line = lockOwnedLine(owner, savedLineSn);
        assertEligible(owner, content.stages());
        if (lineRepository.existsByUserIdAndAplnNmAndIfmlAtrzIndvAplnSnNot(owner, content.name(),
                line.getIfmlAtrzIndvAplnSn())) {
            throw duplicateName();
        }
        line.revise(content.name());
        approverRepository.deleteForLine(line.getIfmlAtrzIndvAplnSn());
        approverRepository.saveAll(approvers(line.getIfmlAtrzIndvAplnSn(), content.stages()));
        lineRepository.flush();
        return summary(line, content.stages().size(), content.approverCount());
    }

    /** 결재선 행은 FK(ON DELETE CASCADE)가 함께 지운다. */
    @Transactional
    public void deleteSavedLine(String owner, Long savedLineSn) {
        lineRepository.delete(lockOwnedLine(owner, savedLineSn));
    }

    private void lockLineOwner(String owner) {
        assertOwner(owner);
        // 사용자 행을 잠가 개수 확인과 저장을 한 줄로 세운다 — 두 화면이 동시에 저장해도 상한을 넘지 않는다
        // (임시저장·메뉴 즐겨찾기와 같은 방식, 결재선이 한 개도 없을 때도 잠글 행이 있다).
        userRepository.findByEsntlIdForUpdate(owner)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    private ApprovalSavedLine lockOwnedLine(String owner, Long savedLineSn) {
        assertOwner(owner);
        return lineRepository.findOwnedForUpdate(Objects.requireNonNull(savedLineSn), owner)
                .orElseThrow(ApprovalSavedLineService::notFound);
    }

    /** 요청한 사람 본인만 — 관리자도 남의 결재선을 대신 다루지 못한다. */
    private static void assertOwner(String owner) {
        if (owner == null || owner.isBlank() || owner.length() > 20) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        SecurityUtil.assertOwnerByEsntlId(owner);
    }

    /**
     * 저장할 결재선의 사람이 모두 지금 결재자가 될 수 있는가(본인 아님·사용 중·결재 권한). 사전 확인과 같은 판정이다. 거부 문구에는
     * 이름을 싣지 않고 단계 번호만 싣는다 — 저장 요청은 임의 식별자를 받으므로 이름을 알아내는 경로가 되지 않게 한다.
     */
    private void assertEligible(String owner, List<ApprovalStageRequest> stages) {
        List<String> ids = stages.stream().flatMap(stage -> stage.approverIds().stream()).distinct().toList();
        Set<String> eligible = lineAssistService.checkApprovers(owner, ids).stream()
                .filter(ApproverProfileDto::eligible).map(ApproverProfileDto::esntlId).collect(Collectors.toSet());
        List<Integer> blocked = new ArrayList<>();
        for (int i = 0; i < stages.size(); i++) {
            if (!eligible.containsAll(stages.get(i).approverIds())) blocked.add(i + 1);
        }
        if (!blocked.isEmpty()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    blocked.stream().map(String::valueOf).collect(Collectors.joining("·"))
                            + "단계에 결재자로 지정할 수 없는 사람이 있어 저장하지 않았습니다. 본인, 사용 중이 아닌 계정, "
                            + "결재 권한이 없는 사람은 결재선에 넣을 수 없습니다.");
        }
    }

    private static BusinessException notFound() {
        return new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "저장한 결재선을 찾을 수 없습니다.");
    }

    private static BusinessException duplicateName() {
        return new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE,
                "같은 이름의 결재선이 있습니다. 다른 이름을 쓰거나 그 결재선을 지금 결재선으로 바꿔 주세요.");
    }

    private static Content content(ApprovalSavedLineRequest request) {
        Objects.requireNonNull(request);
        String name = request.getAplnNm() == null ? "" : request.getAplnNm().strip();
        if (name.isEmpty() || name.length() > MAX_NAME) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "결재선 이름을 " + MAX_NAME + "자 이내로 입력해 주세요.");
        }
        return new Content(name, stages(request.getStages()));
    }

    /** 결재선의 형식 — 1~10단계, 단계마다 1~10명, 전체 50명, 빈 값·중복 없음(임시저장·상신과 같은 한계). */
    private static List<ApprovalStageRequest> stages(List<ApprovalStageRequest> requests) {
        if (requests == null || requests.isEmpty() || requests.size() > MAX_STAGES) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "결재 단계를 1개 이상 10개 이하로 지정해 주세요.");
        }
        Set<String> participants = new HashSet<>();
        List<ApprovalStageRequest> stages = new ArrayList<>();
        for (ApprovalStageRequest request : requests) {
            if (request == null || request.kind() == null || request.approverIds() == null
                    || request.approverIds().isEmpty() || request.approverIds().size() > MAX_STAGE_APPROVERS) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                        "결재자가 없는 단계는 저장하지 않습니다. 단계마다 결재자를 1명 이상 10명 이하로 지정해 주세요.");
            }
            for (String user : request.approverIds()) {
                if (user == null || user.isBlank() || user.length() > 20 || !user.equals(user.trim())) {
                    throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "결재자를 지정해 주세요.");
                }
                if (!participants.add(user)) {
                    throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                            "같은 결재자를 한 결재선에 중복 지정할 수 없습니다.");
                }
            }
            stages.add(new ApprovalStageRequest(request.kind(), List.copyOf(request.approverIds())));
        }
        if (participants.size() > MAX_APPROVERS) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "전체 결재자는 50명 이하로 지정해 주세요.");
        }
        return List.copyOf(stages);
    }

    private static List<ApprovalSavedLineApprover> approvers(Long savedLineSn, List<ApprovalStageRequest> stages) {
        List<ApprovalSavedLineApprover> rows = new ArrayList<>();
        for (int i = 0; i < stages.size(); i++) {
            ApprovalStageRequest stage = stages.get(i);
            for (String userId : stage.approverIds()) {
                rows.add(ApprovalSavedLineApprover.create(new ApprovalSavedLineApproverId(
                        savedLineSn, BigDecimal.valueOf(i + 1L), userId), stage.kind()));
            }
        }
        return rows;
    }

    private static ApprovalSavedLineSummaryDto summary(ApprovalSavedLine line, int stageCount, int approverCount) {
        return new ApprovalSavedLineSummaryDto(line.getIfmlAtrzIndvAplnSn(), line.getAplnNm(), stageCount, approverCount,
                line.getMdfcnDt());
    }
}
