package nuri.business.service.informalsanction;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraft;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraftLine;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraftLineId;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraftLineRepository;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraftRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.informalsanction.dto.ApprovalLineStageDto;
import nuri.business.service.informalsanction.dto.ApprovalStageRequest;
import nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftDto;
import nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftRequest;
import nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftSummaryDto;
import nuri.business.service.informalsanction.dto.ApproverProfileDto;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 결재 기안 서버 임시저장(2026-10-03 결재 동선 개선 D3, DEC-OPS-219).
 *
 * <p>기안자 본인만 자기 임시저장을 읽고 고친다 — 관리자 열람 경로는 없다(DEC-OPS-134 와 같은 방향). 남의 임시저장 번호는
 * 없는 번호와 같이 404 다(존재를 드러내지 않는다). 한 사람이 20건까지 두며, 만료는 없고 사용자 행이 지워지면 함께 지워진다
 * (V2_122 의 ON DELETE CASCADE).
 *
 * <p>저장은 형식만 본다(단계 10개·단계마다 1~10명·전체 50명·중복·길이). 결재자 자격(본인·사용 중·결재 권한)은 보지 않는다 —
 * 미완성 기안을 받아야 하고, 자격은 다시 열 때 지금 기준으로 판정한다. 그때 이름은 사전 확인과 같이 사용 중인 계정에만
 * 싣는다 — 저장은 임의 식별자를 받으므로, 저장했다가 다시 여는 것으로 비활성 계정의 이름을 알아내지 못하게 한다.
 * 임시저장은 결재 표에 들어가지 않으므로 대기함·알림·통계·결재선 제안에 섞이지 않고, 저장해도 알림이 나가지 않는다.
 *
 * <p>상신은 임시저장을 같은 트랜잭션에서 소비한다 — 상신 <b>앞에</b> 번호·기안자·버전이 모두 맞는 행만 지우고, 지운 행이
 * 없으면 409 로 거부한다. 상신이 실패하면 트랜잭션이 되돌아가 임시저장도 되살아난다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApprovalTemporaryDraftService {

    /** 한 사람이 둘 수 있는 임시저장 수 — 기안 화면이 한 번에 읽는 목록이라 상한을 둔다. */
    static final int MAX_DRAFTS = 20;
    private static final int MAX_STAGES = 10;
    private static final int MAX_STAGE_APPROVERS = 10;
    private static final int MAX_APPROVERS = 50;

    private final ApprovalTemporaryDraftRepository draftRepository;
    private final ApprovalTemporaryDraftLineRepository lineRepository;
    private final UserRepository userRepository;
    private final ApprovalLineAssistService lineAssistService;
    private final InformalSanctionService informalSanctionService;

    /** 형식을 확인하고 빈 문자열을 비운 저장 내용. */
    private record Content(String taskSeCd, String docTtl, String docCn, List<ApprovalStageRequest> stages) {
        int approverCount() {
            return stages.stream().mapToInt(stage -> stage.approverIds().size()).sum();
        }
    }

    /** 내 임시저장 목록 — 최근에 고친 순서, 최대 20건. 본문·결재선은 싣지 않는다. */
    public List<ApprovalTemporaryDraftSummaryDto> getTemporaryDrafts(String applicant) {
        assertApplicant(applicant);
        List<ApprovalTemporaryDraft> drafts =
                draftRepository.findTop20ByAplcntIdOrderByMdfcnDtDescIfmlAtrzTmprStrgSnDesc(applicant);
        if (drafts.isEmpty()) return List.of();
        Map<Long, Long> approverCounts = lineRepository.findForDrafts(
                        drafts.stream().map(ApprovalTemporaryDraft::getIfmlAtrzTmprStrgSn).toList()).stream()
                .collect(Collectors.groupingBy(line -> line.getId().getIfmlAtrzTmprStrgSn(), Collectors.counting()));
        Map<String, String> tasks = taskTypeNames();
        return drafts.stream().map(draft -> summary(draft,
                approverCounts.getOrDefault(draft.getIfmlAtrzTmprStrgSn(), 0L).intValue(), tasks)).toList();
    }

    /** '이어 쓰기' — 본문과 결재선을 지금 자격과 함께 돌려준다. */
    public ApprovalTemporaryDraftDto getTemporaryDraft(String applicant, Long temporaryDraftSn) {
        assertApplicant(applicant);
        ApprovalTemporaryDraft draft = draftRepository
                .findByIfmlAtrzTmprStrgSnAndAplcntId(Objects.requireNonNull(temporaryDraftSn), applicant)
                .orElseThrow(ApprovalTemporaryDraftService::notFound);
        List<ApprovalTemporaryDraftLine> lines = lineRepository.findForDrafts(List.of(draft.getIfmlAtrzTmprStrgSn()));
        // 사전 확인과 같은 판정·같은 공개 수준이다 — 저장한 결재선이라도 비활성 계정의 이름은 싣지 않는다.
        List<String> approverIds = lines.stream().map(line -> line.getId().getUserId()).distinct().toList();
        Map<String, ApproverProfileDto> profiles = lineAssistService.checkApprovers(applicant, approverIds).stream()
                .collect(Collectors.toMap(ApproverProfileDto::esntlId, Function.identity()));
        Map<BigDecimal, List<ApprovalTemporaryDraftLine>> stages = lines.stream().collect(Collectors.groupingBy(
                line -> line.getId().getAtrzSeq(), TreeMap::new, Collectors.toList()));
        List<ApprovalLineStageDto> stageDtos = stages.values().stream().map(group -> new ApprovalLineStageDto(
                group.getFirst().kind(), group.stream().map(line -> profiles.get(line.getId().getUserId())).toList()))
                .toList();
        return new ApprovalTemporaryDraftDto(draft.getIfmlAtrzTmprStrgSn(), draft.getTaskSeCd(),
                taskTypeNames().getOrDefault(draft.getTaskSeCd(), ""), draft.getDocTtl(), draft.getDocCn(), stageDtos,
                draft.getVersion(), draft.getMdfcnDt());
    }

    @Transactional
    public ApprovalTemporaryDraftSummaryDto createTemporaryDraft(String applicant, ApprovalTemporaryDraftRequest request) {
        lockDraftOwner(applicant);
        Content content = content(request);
        if (draftRepository.countByAplcntId(applicant) >= MAX_DRAFTS) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE,
                    "임시저장은 " + MAX_DRAFTS + "건까지 둘 수 있습니다. 쓰지 않는 임시저장을 지워 주세요.");
        }
        ApprovalTemporaryDraft draft = draftRepository.save(
                ApprovalTemporaryDraft.create(applicant, content.taskSeCd(), content.docTtl(), content.docCn()));
        lineRepository.saveAll(lines(draft.getIfmlAtrzTmprStrgSn(), content.stages()));
        return summary(draft, content.approverCount(), taskTypeNames());
    }

    /**
     * 내용과 결재선을 통째로 바꾼다. 읽은 버전이 필수이며 다르면 409 다 — 다른 화면에서 고친 내용을 옛 내용으로 덮지 않는다.
     * 결재선은 지운 뒤 다시 넣는다(같은 단계·사람이어도 기본 키가 부딪히지 않게 삭제를 먼저 실행한다).
     */
    @Transactional
    public ApprovalTemporaryDraftSummaryDto updateTemporaryDraft(String applicant, Long temporaryDraftSn,
                                                                 ApprovalTemporaryDraftRequest request) {
        Content content = content(request);
        Integer expectedVersion = request.getVersion();
        if (expectedVersion == null) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "고치려는 임시저장의 버전을 함께 보내 주세요.");
        }
        ApprovalTemporaryDraft draft = lockOwnedDraft(applicant, temporaryDraftSn);
        if (!expectedVersion.equals(draft.getVersion())) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "다른 곳에서 임시저장을 고쳤습니다. 최신 내용을 다시 불러와 주세요.");
        }
        draft.revise(content.taskSeCd(), content.docTtl(), content.docCn());
        lineRepository.deleteForDraft(draft.getIfmlAtrzTmprStrgSn());
        lineRepository.saveAll(lines(draft.getIfmlAtrzTmprStrgSn(), content.stages()));
        // 올라간 버전과 수정 시각을 응답에 싣는다 — 화면은 이 버전으로 다음 저장·상신을 한다.
        draftRepository.flush();
        return summary(draft, content.approverCount(), taskTypeNames());
    }

    /** 결재선 행은 FK(ON DELETE CASCADE)가 함께 지운다. */
    @Transactional
    public void deleteTemporaryDraft(String applicant, Long temporaryDraftSn) {
        draftRepository.delete(lockOwnedDraft(applicant, temporaryDraftSn));
    }

    /**
     * 임시저장을 소비하며 상신한다. 기안자는 상신 문서의 신청자(컨트롤러가 인증 주체로 채운다)이며, 소비가 상신보다 먼저다 —
     * 상신 검사가 실패하면 트랜잭션이 되돌아가 임시저장이 남는다.
     */
    @Transactional
    public Long submitWithTemporaryDraft(InformalSanctionDto dto, List<ApprovalStageRequest> stages,
                                         Long temporaryDraftSn, Integer temporaryDraftVersion) {
        consumeForSubmit(Objects.requireNonNull(dto).getAplcntId(), temporaryDraftSn, temporaryDraftVersion);
        return informalSanctionService.registerInformalSanction(dto, stages);
    }

    private void consumeForSubmit(String applicant, Long temporaryDraftSn, Integer temporaryDraftVersion) {
        assertApplicant(applicant);
        if (temporaryDraftSn == null || temporaryDraftVersion == null) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "상신할 임시저장의 번호와 버전을 함께 보내 주세요.");
        }
        if (temporaryDraftSn <= 0 || temporaryDraftVersion < 0) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "임시저장 번호와 버전이 올바르지 않습니다.");
        }
        if (draftRepository.deleteOwnedVersion(temporaryDraftSn, applicant, temporaryDraftVersion) == 0) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "임시저장이 이미 상신되었거나 다른 곳에서 바뀌었습니다. 최신 내용을 다시 불러와 주세요.");
        }
    }

    private void lockDraftOwner(String applicant) {
        assertApplicant(applicant);
        // 사용자 행을 잠가 개수 확인과 저장을 한 줄로 세운다 — 두 화면이 동시에 저장해도 상한을 넘지 않는다
        // (MenuBookmarkService 와 같은 방식, 임시저장이 한 건도 없을 때도 잠글 행이 있다).
        userRepository.findByEsntlIdForUpdate(applicant)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    private ApprovalTemporaryDraft lockOwnedDraft(String applicant, Long temporaryDraftSn) {
        assertApplicant(applicant);
        return draftRepository.findOwnedForUpdate(Objects.requireNonNull(temporaryDraftSn), applicant)
                .orElseThrow(ApprovalTemporaryDraftService::notFound);
    }

    /** 요청한 사람 본인만 — 관리자도 남의 임시저장을 대신 다루지 못한다. */
    private static void assertApplicant(String applicant) {
        if (applicant == null || applicant.isBlank() || applicant.length() > 20) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        SecurityUtil.assertOwnerByEsntlId(applicant);
    }

    private static BusinessException notFound() {
        return new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "임시저장한 기안을 찾을 수 없습니다.");
    }

    private static Content content(ApprovalTemporaryDraftRequest request) {
        Objects.requireNonNull(request);
        String taskSeCd = blankToNull(request.getTaskSeCd());
        String docTtl = blankToNull(request.getDocTtl());
        String docCn = blankToNull(request.getDocCn());
        if (taskSeCd != null && taskSeCd.length() > 12 || docTtl != null && docTtl.length() > 256
                || docCn != null && docCn.length() > 4000) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        List<ApprovalStageRequest> stages = stages(request.getStages());
        if (taskSeCd == null && docTtl == null && docCn == null && stages.isEmpty()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "저장할 내용이 없습니다. 업무 구분·제목·본문·결재선 중 하나는 채워 주세요.");
        }
        return new Content(taskSeCd, docTtl, docCn, stages);
    }

    /**
     * 결재선의 형식만 본다. 결재자가 없는 단계는 받지 않는다 — 화면이 저장 전에 그 단계를 빼고 알린다. 사람의 자격(본인·
     * 사용 중·결재 권한)은 상신 때 서버가 보고, 다시 열 때 사전 확인이 보여 준다.
     */
    private static List<ApprovalStageRequest> stages(List<ApprovalStageRequest> requests) {
        if (requests == null || requests.isEmpty()) return List.of();
        if (requests.size() > MAX_STAGES) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "결재 단계는 10개까지 저장할 수 있습니다.");
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
                            "같은 결재자를 한 문서에 중복 지정할 수 없습니다.");
                }
            }
            stages.add(new ApprovalStageRequest(request.kind(), List.copyOf(request.approverIds())));
        }
        if (participants.size() > MAX_APPROVERS) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "전체 결재자는 50명 이하로 지정해 주세요.");
        }
        return List.copyOf(stages);
    }

    private static List<ApprovalTemporaryDraftLine> lines(Long temporaryDraftSn, List<ApprovalStageRequest> stages) {
        List<ApprovalTemporaryDraftLine> lines = new ArrayList<>();
        for (int i = 0; i < stages.size(); i++) {
            ApprovalStageRequest stage = stages.get(i);
            for (String userId : stage.approverIds()) {
                lines.add(ApprovalTemporaryDraftLine.create(new ApprovalTemporaryDraftLineId(
                        temporaryDraftSn, BigDecimal.valueOf(i + 1L), userId), stage.kind()));
            }
        }
        return lines;
    }

    private static ApprovalTemporaryDraftSummaryDto summary(ApprovalTemporaryDraft draft, int approverCount,
                                                            Map<String, String> tasks) {
        return new ApprovalTemporaryDraftSummaryDto(draft.getIfmlAtrzTmprStrgSn(), draft.getTaskSeCd(),
                tasks.getOrDefault(draft.getTaskSeCd(), ""), draft.getDocTtl(), approverCount, draft.getVersion(),
                draft.getMdfcnDt());
    }

    /** 업무 구분 이름. 상신 화면과 같은 공통코드(COM075)를 같은 도메인 서비스로 읽는다. 지금 쓰지 않는 코드는 이름이 없다. */
    private Map<String, String> taskTypeNames() {
        Map<String, String> names = new HashMap<>();
        informalSanctionService.getTaskTypes().forEach(code -> {
            if (code.dtlCd() != null) names.putIfAbsent(code.dtlCd(), code.dtlCdNm() == null ? "" : code.dtlCdNm());
        });
        return names;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
