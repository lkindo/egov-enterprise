package nuri.business.service.informalsanction;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.business.domain.informalsanction.SanctionStatus;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import nuri.business.service.informalsanction.dto.InformalSanctionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InformalSanctionService {

    private final InformalSanctionRepository informalSanctionRepository;
    private final CommonCodeService commonCodeService;
    private final ApplicationEventPublisher eventPublisher;
    private final InformalSanctionMapper informalSanctionMapper;

    public Page<InformalSanctionDto> getInformalSanctionList(String aplcntId, Pageable pageable) {
        requireParticipantId(aplcntId);
        return informalSanctionRepository.findByAplcntId(aplcntId, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    /**
     * 결재자 기준 <b>전체</b> 수신 목록(처리 완료 건 포함).
     *
     * <p>대기함·대기 건수에는 쓰지 말 것 — 그 용도는 {@link #getPendingApprovalList}다.
     * 이 메서드의 소비자는 "결재자 기준 목록"을 약속하는 {@code /api/v1/informal-sanctions?type=received}
     * 하나이며, 그 계약은 전체를 뜻한다.
     */
    public Page<InformalSanctionDto> getReceivedInformalSanctionList(String aprvrId, Pageable pageable) {
        return informalSanctionRepository
                .findByAprvrId(Objects.requireNonNull(aprvrId), Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    /**
     * 결재자의 <b>대기 중</b> 결재만 조회한다(상태 {@code A} = 신청).
     *
     * <p><b>왜 신설했나 — 2026-09-02 실측.</b> 대기함({@code GET /api/v1/approvals/pending})과
     * 대시보드 위젯의 {@code pendingApprovalCount} 가 둘 다 상태 조건이 없는
     * {@link #getReceivedInformalSanctionList} 를 불렀다. 그래서 <b>이미 승인·반려한 건까지
     * 대기함에 남고 대기 건수에 계속 잡혔다</b> — 결재자는 처리한 문서를 다시 열어 보고서야
     * 끝난 건임을 알게 된다. 정작 필터 메서드
     * ({@code findByAprvrIdAndAprvYn})는 저장소에 <b>이미 선언돼 있었고 아무도 쓰지 않았다.</b>
     *
     * <p>기존 메서드를 그대로 좁히지 않은 것은 의도다. 세 번째 소비자
     * ({@code /informal-sanctions?type=received})는 계약상 "결재자 기준 목록" 전체를 뜻하므로,
     * 그것까지 대기 전용으로 바꾸면 처리 이력을 볼 창구가 사라진다(H3 — 도메인 의미 보존).
     */
    public Page<InformalSanctionDto> getPendingApprovalList(String aprvrId, Pageable pageable) {
        return informalSanctionRepository
                .findByAprvrIdAndAprvYn(
                        Objects.requireNonNull(aprvrId),
                        SanctionStatus.REQUESTED.getCode(),
                        Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    /**
     * 결재자가 <b>이미 처리한</b> 결재(승인 {@code C}·반려 {@code R})만 조회한다.
     *
     * <p><b>왜 신설했나 — 2026-09-05 실측.</b> 결재함의 '결재 처리 이력' 탭은 {@code /approvals/my}
     * 를 불렀는데 그것은 {@link #getInformalSanctionList}(<b>신청자</b> 기준)였다. 즉 결재자가
     * 승인·반려한 문서를 다시 볼 탭이 어디에도 없었고, 신청자는 자기 신청서를 '처리 이력'
     * 이라는 이름 아래서 찾아야 했다. 결재자 기준 전체({@link #getReceivedInformalSanctionList})는
     * 대기 건까지 섞여 있어 '처리한 것' 을 약속하는 화면에는 쓸 수 없다.
     */
    public Page<InformalSanctionDto> getProcessedApprovalList(String aprvrId, Pageable pageable) {
        return informalSanctionRepository
                .findByAprvrIdAndAprvYnIn(
                        Objects.requireNonNull(aprvrId),
                        PROCESSED_STATUS_CODES,
                        Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    /**
     * 기안 화면이 고를 업무 구분 — 공통코드 {@value #TASK_TYPE_CODE_GROUP} 의 사용 중 상세코드.
     *
     * <p>공통코드 API 는 관리자 전용({@code /api/v1/admin/system/codes/**})이라 일반 사용자의
     * 기안 화면이 직접 읽을 수 없다. 결재 도메인이 자기 어휘를 인증 사용자에게 노출한다.
     * 상세코드가 하나도 없으면 빈 목록을 그대로 돌려준다 — 임의 값을 지어내지 않는다(PD-DB-003).
     */
    public List<CommonCodeDto> getTaskTypes() {
        return commonCodeService.getCodesByGroup(TASK_TYPE_CODE_GROUP);
    }

    /** 업무 구분 코드 그룹. 상세 조회의 코드명 해석과 기안 화면의 선택지가 같은 그룹을 본다. */
    static final String TASK_TYPE_CODE_GROUP = "COM075";

    private static final List<String> PROCESSED_STATUS_CODES =
            List.of(SanctionStatus.APPROVED.getCode(), SanctionStatus.REJECTED.getCode());

    public InformalSanctionDto getInformalSanction(Long ifmlAtrzSn, String participantId) {
        requireParticipantId(participantId);
        InformalSanction entity = informalSanctionRepository.findByIdAndParticipant(
                        Objects.requireNonNull(ifmlAtrzSn), participantId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        InformalSanctionDto dto = convertToDto(entity);

        // 코드명 설정
        List<CommonCodeDto> jobCodes = commonCodeService.getCodesByGroup(TASK_TYPE_CODE_GROUP);
        dto.setTaskSeNm(jobCodes.stream()
                .filter(c -> c.dtlCd().equals(dto.getTaskSeCd()))
                .findFirst().map(c -> c.dtlCdNm()).orElse(""));

        return dto;
    }

    @Transactional
    public Long registerInformalSanction(InformalSanctionDto dto) {
        assertKnownTaskType(dto.getTaskSeCd());
        InformalSanction entity = InformalSanction.builder()
                .taskSeCd(dto.getTaskSeCd())
                .aplcntId(dto.getAplcntId())
                .reqYmd(dto.getReqYmd())
                .aprvrId(dto.getAprvrId())
                .aprvYn(SanctionStatus.REQUESTED.getCode()) // 초기상태: 신청
                .build();
        InformalSanction saved = informalSanctionRepository.save(Objects.requireNonNull(entity));
        return Objects.requireNonNull(saved).getIfmlAtrzSn();
    }

    @Transactional
    public void updateInformalSanction(InformalSanctionDto dto) {
        InformalSanction entity = informalSanctionRepository
                .findById(Objects.requireNonNull(dto.getIfmlAtrzSn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // [보안] 권한 확인 (신청자 본인) — 신청서 정정·철회는 대리 불가이므로 관리자도 우회하지 않는다.
        nuri.business.security.util.SecurityUtil.assertOwnerByEsntlId(entity.getAplcntId());

        // [안정성] 상태 전이 가드 (신청 상태에서만 수정 가능)
        if (!"A".equals(entity.getAprvYn())) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "신청 상태인 경우에만 수정할 수 있습니다.");
        }

        entity.update(dto.getTaskSeCd(), dto.getReqYmd(), dto.getAprvrId());
    }

    @Transactional
    public void deleteInformalSanction(Long ifmlAtrzSn) {
        InformalSanction entity = informalSanctionRepository
                .findById(Objects.requireNonNull(ifmlAtrzSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // [보안] 권한 확인 (신청자 본인) — 신청서 정정·철회는 대리 불가이므로 관리자도 우회하지 않는다.
        nuri.business.security.util.SecurityUtil.assertOwnerByEsntlId(entity.getAplcntId());

        // [안정성] 상태 전이 가드 (신청 상태에서만 삭제 가능)
        if (!"A".equals(entity.getAprvYn())) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "신청 상태인 경우에만 삭제할 수 있습니다.");
        }

        informalSanctionRepository.delete(entity);
    }

    @Transactional
    public void confirmInformalSanction(Long ifmlAtrzSn, String aprvYn, String rjctRsnCn) {
        InformalSanction entity = informalSanctionRepository.findById(Objects.requireNonNull(ifmlAtrzSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // [보안] 권한 확인 (결재자 본인) — 결재는 대리 불가이므로 관리자도 우회하지 않는다.
        nuri.business.security.util.SecurityUtil.assertOwnerByEsntlId(entity.getAprvrId());

        // [안정성] 상태 전이 가드 및 비즈니스 행위 위임
        if (SanctionStatus.APPROVED.getCode().equals(aprvYn)) {
            entity.approve();
        } else if (SanctionStatus.REJECTED.getCode().equals(aprvYn)) {
            entity.reject(rjctRsnCn);
        } else {
            throw new BusinessException("잘못된 결재 상태 코드입니다: " + aprvYn, CommonErrorCode.INVALID_INPUT_VALUE);
        }

        // 이벤트 발행 — 커밋 후 발행하여 알림 리스너(@Async)가 롤백 시 허위 알림을 보내지 않도록 한다.
        final nuri.business.service.informalsanction.event.SanctionStatusChangedEvent statusChangedEvent =
                new nuri.business.service.informalsanction.event.SanctionStatusChangedEvent(
                        ifmlAtrzSn, entity.getAplcntId(), entity.getAprvrId(),
                        SanctionStatus.fromCode(aprvYn), rjctRsnCn);
        nuri.foundation.core.util.TransactionUtils.runAfterCommit(() -> eventPublisher.publishEvent(statusChangedEvent));
    }

    private InformalSanctionDto convertToDto(InformalSanction entity) {
        return informalSanctionMapper.toDto(entity);
    }

    /**
     * 업무 구분은 {@value #TASK_TYPE_CODE_GROUP} 에 등록된 사용 중 코드여야 한다.
     *
     * <p>상세 조회가 코드명을 이 그룹에서 해석하므로, 등록되지 않은 코드로 저장하면 목록·상세·알림에
     * 원시 코드가 그대로 노출된다. 그룹에 코드가 하나도 없으면 어떤 값도 통과하지 못한다 — 화면도
     * 같은 이유로 상신을 막고 코드 등록을 안내한다(PD-DB-003: 임의 시드 금지).
     */
    private void assertKnownTaskType(String taskSeCd) {
        boolean known = getTaskTypes().stream().anyMatch(code -> code.dtlCd().equals(taskSeCd));
        if (!known) {
            throw new BusinessException("등록되지 않은 업무 구분 코드입니다: " + taskSeCd,
                    CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private static void requireParticipantId(String participantId) {
        if (participantId == null || participantId.isBlank()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }
}
