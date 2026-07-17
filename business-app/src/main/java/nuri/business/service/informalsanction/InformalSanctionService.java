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
        Page<InformalSanction> result;
        if (aplcntId != null && !aplcntId.isEmpty()) {
            result = informalSanctionRepository.findByAplcntId(aplcntId, pageable);
        } else {
            result = informalSanctionRepository.findAll(pageable);
        }
        return result.map(this::convertToDto);
    }

    public Page<InformalSanctionDto> getReceivedInformalSanctionList(String aprvrId, Pageable pageable) {
        return informalSanctionRepository
                .findByAprvrId(Objects.requireNonNull(aprvrId), Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    public InformalSanctionDto getInformalSanction(String ifmlAtrzId) {
        InformalSanction entity = informalSanctionRepository.findById(Objects.requireNonNull(ifmlAtrzId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        InformalSanctionDto dto = convertToDto(entity);

        // 코드명 설정
        List<CommonCodeDto> jobCodes = commonCodeService.getCodesByGroup("COM075");
        dto.setTaskSeNm(jobCodes.stream()
                .filter(c -> c.dtlCd().equals(dto.getTaskSeCd()))
                .findFirst().map(c -> c.dtlCdNm()).orElse(""));

        return dto;
    }

    @Transactional
    public String registerInformalSanction(InformalSanctionDto dto) {
        // [정체성] 결재 PK 는 서비스가 INFRML_ 접두로 생성한다(단일 소유). 과거 컨트롤러가 egov IdGnr 를
        // by-type 주입하다 @Primary egovFileIdGnrService 에 오해소되어 "FILE_" 접두를 발급하던 잠복 결함 제거.
        String ifmlAtrzId = dto.getIfmlAtrzId();
        if (ifmlAtrzId == null || ifmlAtrzId.isEmpty()) {
            ifmlAtrzId = nuri.foundation.core.util.IdGenerationUtil.generateId("INFRML_", 13);
        }

        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzId(ifmlAtrzId)
                .taskSeCd(dto.getTaskSeCd())
                .aplcntId(dto.getAplcntId())
                .reqYmd(dto.getReqYmd())
                .aprvrId(dto.getAprvrId())
                .aprvYn(SanctionStatus.REQUESTED.getCode()) // 초기상태: 신청
                .build();
        informalSanctionRepository.save(Objects.requireNonNull(entity));
        return ifmlAtrzId;
    }

    @Transactional
    public void updateInformalSanction(InformalSanctionDto dto) {
        InformalSanction entity = informalSanctionRepository
                .findById(Objects.requireNonNull(dto.getIfmlAtrzId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // [보안] 권한 확인 (신청자 본인)
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentEsntlId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
        if (!currentUserId.equals(entity.getAplcntId())) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }

        // [안정성] 상태 전이 가드 (신청 상태에서만 수정 가능)
        if (!"A".equals(entity.getAprvYn())) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "신청 상태인 경우에만 수정할 수 있습니다.");
        }

        entity.update(dto.getTaskSeCd(), dto.getReqYmd(), dto.getAprvrId());
    }

    @Transactional
    public void deleteInformalSanction(String ifmlAtrzId) {
        InformalSanction entity = informalSanctionRepository
                .findById(Objects.requireNonNull(ifmlAtrzId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // [보안] 권한 확인 (신청자 본인)
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentEsntlId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
        if (!currentUserId.equals(entity.getAplcntId())) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }

        // [안정성] 상태 전이 가드 (신청 상태에서만 삭제 가능)
        if (!"A".equals(entity.getAprvYn())) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "신청 상태인 경우에만 삭제할 수 있습니다.");
        }

        informalSanctionRepository.delete(entity);
    }

    @Transactional
    public void confirmInformalSanction(String ifmlAtrzId, String aprvYn, String rjctRsnCn) {
        InformalSanction entity = informalSanctionRepository.findById(Objects.requireNonNull(ifmlAtrzId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // [보안] 권한 확인 (결재자 본인)
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentEsntlId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
        if (!currentUserId.equals(entity.getAprvrId())) {
            throw new BusinessException("접근 권한이 없습니다.", CommonErrorCode.ACCESS_DENIED);
        }

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
                        ifmlAtrzId, entity.getAplcntId(), entity.getAprvrId(),
                        SanctionStatus.fromCode(aprvYn), rjctRsnCn);
        nuri.foundation.core.util.TransactionUtils.runAfterCommit(() -> eventPublisher.publishEvent(statusChangedEvent));
    }

    private InformalSanctionDto convertToDto(InformalSanction entity) {
        return informalSanctionMapper.toDto(entity);
    }
}
